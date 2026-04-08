import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LiquidityRule,
  LiquidityRuleDocument,
} from './schemas/liquidity-rule.schema';
import {
  PaymentConfig,
  PaymentConfigDocument,
} from './schemas/payment-config.schema';
import { Trade, TradeDocument } from '../trade/schemas/trade.schema';
import { TradeService } from '../trade/trade.service';
import { TradeGateway } from '../trade/trade.gateway';
import { WalletService } from '../wallet/wallet.service';
import { FirestoreUsersService } from '../users/firestore-users.service';
import { DepositService } from '../wallet/deposit.service';
import { WithdrawalService } from '../wallet/withdrawal.service';
import { AdminAuditService } from './admin-audit.service';
import { DepositIntentStatus } from '../wallet/schemas/deposit-intent.schema';
import { WithdrawalRequestStatus } from '../wallet/schemas/withdrawal-request.schema';
import { LedgerService } from '../ledger/ledger.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(LiquidityRule.name)
    private liquidityRuleModel: Model<LiquidityRuleDocument>,
    @InjectModel(PaymentConfig.name)
    private paymentConfigModel: Model<PaymentConfigDocument>,
    @InjectModel(Trade.name)
    private tradeModel: Model<TradeDocument>,
    private tradeService: TradeService,
    private tradeGateway: TradeGateway,
    private walletService: WalletService,
    private usersService: FirestoreUsersService,
    private depositService: DepositService,
    private withdrawalService: WithdrawalService,
    private auditService: AdminAuditService,
    private ledgerService: LedgerService,
    private ordersService: OrdersService,
  ) { }

  async createOrUpdateLiquidityRule(
    symbol: string,
    rules: Partial<LiquidityRule>,
    adminId?: string,
    adminEmail?: string,
  ) {
    const updated = await this.liquidityRuleModel.findOneAndUpdate(
      { symbol },
      { $set: { ...rules, symbol } },
      { upsert: true, new: true },
    );
    if (adminId) {
      await this.auditService.log(adminId, 'LIQUIDITY_RULE_UPDATE', {
        adminEmail,
        targetType: 'liquidity_rule',
        targetId: symbol,
        details: rules,
      });
    }
    return updated;
  }

  async getLiquidityRule(symbol: string) {
    return this.liquidityRuleModel.findOne({ symbol });
  }

  async getAllLiquidityRules() {
    return this.liquidityRuleModel.find();
  }

  async getOverview() {
    try {
      // Use count and wallet aggregation so we don't load all users (production-safe)
      const [totalUsers, totalBalance, trades, pendingDeposits] = await Promise.all([
        this.usersService.getCount(),
        this.walletService.getTotalBalance(),
        this.tradeService.getAllTrades(),
        this.depositService.listAllIntents(DepositIntentStatus.PENDING, 500),
      ]);

      const tradesArray = Array.isArray(trades) ? trades : [];
      const openTrades = tradesArray.filter((t) => t.status === 'OPEN');
      const closedTrades = tradesArray.filter((t) => t.status === 'CLOSED');
      const totalPnL = tradesArray.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const closedPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const pendingDepositSum = Array.isArray(pendingDeposits)
        ? pendingDeposits.reduce((sum, d: any) => sum + (d.amount || 0), 0)
        : 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tradesToday = tradesArray.filter((t) => new Date((t as any).createdAt) >= todayStart);
      const volumeToday = tradesToday.reduce((sum, t) => sum + (t.lotSize || 0) * (t.openPrice || 0) * 100000, 0);

      return {
        totalUsers: totalUsers,
        totalBalance: Math.round(totalBalance * 100) / 100,
        openPositions: openTrades.length,
        totalTrades: tradesArray.length,
        totalPnL: Math.round(totalPnL * 100) / 100,
        closedPnL: Math.round(closedPnL * 100) / 100,
        pendingDepositsCount: Array.isArray(pendingDeposits) ? pendingDeposits.length : 0,
        pendingDepositsSum: Math.round(pendingDepositSum * 100) / 100,
        tradesToday: tradesToday.length,
        volumeToday: Math.round(volumeToday * 100) / 100,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get overview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listDepositIntents(status?: DepositIntentStatus, limit = 100) {
    const intents = await this.depositService.listAllIntents(status, limit);
    const userIds = [...new Set((intents as any[]).map((i) => i.userId?.toString()).filter(Boolean))];
    const userMap = new Map<string, { email?: string; name?: string }>();
    await Promise.all(
      userIds.map(async (id) => {
        const user = await this.usersService.findById(id);
        if (user) {
          const u = user as any;
          const name = u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email);
          userMap.set(id, { email: u.email, name });
        }
      }),
    );
    return (intents as any[]).map((i) => ({
      ...i,
      userEmail: userMap.get(i.userId?.toString())?.email,
      userName: userMap.get(i.userId?.toString())?.name,
    }));
  }

  async setUserStatus(userId: string, isActive: boolean, adminId: string, adminEmail?: string) {
    const user = await this.usersService.updateStatus(userId, isActive);
    await this.auditService.log(adminId, 'USER_STATUS', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
      details: { isActive },
    });
    return user;
  }

  async setUserKycStatus(userId: string, kycStatus: string, reason: string | undefined, adminId: string, adminEmail?: string) {
    const statusUpper = kycStatus.toUpperCase();
    const user = await this.usersService.updateKycStatus(userId, statusUpper, reason);
    await this.auditService.log(adminId, 'USER_KYC_STATUS', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
      details: { kycStatus: statusUpper, reason },
    });
    return user;
  }

  async getAllTrades(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = (page - 1) * limit;
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [trades, total] = await Promise.all([
        this.tradeModel
          .find()
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        this.tradeModel.countDocuments(),
      ]);

      return {
        data: trades,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get trades',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async forceCloseTrade(tradeId: string, closePrice: number, adminId?: string, adminEmail?: string) {
    // We pass undefined as callerUserId to ensure notifyUser=false in tradeService
    const trade = await this.tradeService.closeTrade(
      tradeId,
      closePrice,
      undefined,
      'Admin',
      adminId || 'admin',
    );
    if (adminId) {
      await this.auditService.log(adminId, 'TRADE_FORCE_CLOSE', {
        adminEmail,
        targetType: 'trade',
        targetId: tradeId,
        details: { closePrice },
      });
    }
    return trade;
  }

  async adjustUserBalance(userId: string, amount: number, description: string, adminId?: string, adminEmail?: string) {
    const wallet = await this.walletService.adjustBalance(userId, amount, description);
    this.tradeGateway.emitBalanceUpdated(userId, { balance: wallet.balance, currency: wallet.currency });
    if (adminId) {
      await this.auditService.log(adminId, 'BALANCE_ADJUST', {
        adminEmail,
        targetType: 'user',
        targetId: userId,
        details: { amount, description },
      });
    }
    return wallet;
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<any> {
    try {
      // Use the usersService.findAll which already handles pagination
      const usersResult = await this.usersService.findAll(page, limit, sortBy, sortOrder);

      // Ensure we have the correct structure
      if (!usersResult) {
        // Return empty result if usersResult is null/undefined
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Handle case where usersResult might be an array directly
      let usersArray: any[] = [];
      let total = 0;
      let resultPage = page;
      let resultLimit = limit;
      let totalPages = 0;

      if (Array.isArray(usersResult)) {
        // If usersResult is an array, use it directly
        usersArray = usersResult;
        total = usersResult.length;
        totalPages = Math.ceil(total / limit);
      } else if (typeof usersResult === 'object') {
        // If usersResult is an object, extract data
        if (Array.isArray(usersResult.data)) {
          usersArray = usersResult.data;
        }
        total = usersResult.total || 0;
        resultPage = usersResult.page || page;
        resultLimit = usersResult.limit || limit;
        totalPages = usersResult.totalPages || Math.ceil(total / limit);
      }

      // Ensure usersArray is always an array
      if (!Array.isArray(usersArray)) {
        usersArray = [];
      }

      // Populate wallet information for each user
      const usersWithWallets = await Promise.all(
        usersArray.map(async (user: any) => {
          try {
            const userId = user?._id?.toString() || user?.id?.toString();
            if (!userId) {
              // If user doesn't have an ID, return as-is
              const userObj = user?.toObject ? user.toObject() : user;
              return userObj || {};
            }

            const wallet = await this.walletService.getWallet(userId);
            const userObj = user?.toObject ? user.toObject() : user;
            return {
              ...(userObj || {}),
              wallet: {
                balance: wallet?.balance || 0,
                currency: wallet?.currency || 'USD',
              },
            };
          } catch (error) {
            // If wallet doesn't exist or error, return user with default wallet
            const userObj = user?.toObject ? user.toObject() : user;
            return {
              ...(userObj || {}),
              wallet: {
                balance: 0,
                currency: 'USD',
              },
            };
          }
        }),
      );

      return {
        data: usersWithWallets,
        total,
        page: resultPage,
        limit: resultLimit,
        totalPages,
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to get users';
      throw new HttpException(
        errorMessage,
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async freezeSymbol(
    symbol: string,
    isFrozen: boolean,
    adminId?: string,
    adminEmail?: string,
  ) {
    const updated = await this.liquidityRuleModel.findOneAndUpdate(
      { symbol },
      { $set: { isFrozen, symbol } },
      { upsert: true, new: true },
    );
    if (adminId) {
      await this.auditService.log(adminId, 'SYMBOL_FREEZE', {
        adminEmail,
        targetType: 'symbol',
        targetId: symbol,
        details: { isFrozen },
      });
    }
    return updated;
  }

  async overrideTrade(tradeId: string, updates: any, adminId: string, adminEmail?: string) {
    const trade = await this.tradeService.manualUpdateTrade(tradeId, updates, adminId);
    await this.auditService.log(adminId, 'TRADE_OVERRIDE', {
      adminEmail,
      targetType: 'trade',
      targetId: tradeId,
      details: Object.keys(updates),
    });
    return trade;
  }

  async activateTrade(tradeId: string, adminId: string, adminEmail?: string) {
    const trade = await this.tradeService.activateTrade(tradeId, adminId);
    await this.auditService.log(adminId, 'TRADE_ACTIVATE', {
      adminEmail,
      targetType: 'trade',
      targetId: tradeId,
    });
    return trade;
  }

  async deactivateTrade(tradeId: string, adminId: string, adminEmail?: string) {
    const trade = await this.tradeService.deactivateTrade(tradeId, adminId);
    await this.auditService.log(adminId, 'TRADE_DEACTIVATE', {
      adminEmail,
      targetType: 'trade',
      targetId: tradeId,
    });
    return trade;
  }

  async confirmDepositByReference(reference: string, adminId: string, adminEmail?: string) {
    const result = await this.depositService.confirmDepositByReference(reference, adminId);
    await this.auditService.log(adminId, 'DEPOSIT_CONFIRM', {
      adminEmail,
      targetType: 'deposit',
      details: { reference },
    });
    return result;
  }

  async getAuditLog(limit?: number, action?: string) {
    return this.auditService.getRecent(limit ?? 100, action);
  }

  /** Admin: view any user's transaction history */
  async getUserTransactions(userId: string) {
    return this.ledgerService.getUserLedger(userId);
  }

  /** Admin: reject/cancel a pending deposit intent (no credit) */
  async rejectDepositByReference(reference: string, adminId: string, adminEmail?: string) {
    const result = await this.depositService.rejectDepositByReference(reference);
    await this.auditService.log(adminId, 'DEPOSIT_REJECT', {
      adminEmail,
      targetType: 'deposit',
      details: { reference },
    });
    return result;
  }

  /** Admin: list withdrawal requests with user info */
  async listWithdrawalRequests(
    page: number = 1,
    limit: number = 50,
    status?: WithdrawalRequestStatus,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const result = await this.withdrawalService.listAll(page, limit, status, sortBy, sortOrder);
    const userIds = [...new Set((result.data as any[]).map((r) => r.userId?.toString()).filter(Boolean))];
    const userMap = new Map<string, { email?: string; name?: string }>();
    await Promise.all(
      userIds.map(async (id) => {
        const user = await this.usersService.findById(id);
        if (user) {
          const u = user as any;
          const name = u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email);
          userMap.set(id, { email: u.email, name });
        }
      }),
    );
    const data = (result.data as any[]).map((r) => ({
      ...r,
      userEmail: userMap.get(r.userId?.toString())?.email,
      userName: userMap.get(r.userId?.toString())?.name,
    }));
    return { ...result, data };
  }

  /** Admin: approve withdrawal (mark completed, optional txHash) */
  async approveWithdrawalRequest(
    id: string,
    adminId: string,
    adminEmail?: string,
    txHash?: string,
  ) {
    const request = await this.withdrawalService.approve(id, adminId, txHash);
    await this.auditService.log(adminId, 'WITHDRAWAL_APPROVE', {
      adminEmail,
      targetType: 'withdrawal_request',
      targetId: id,
      details: { reference: (request as any).reference, txHash },
    });
    return request;
  }

  /** Admin: reject withdrawal (refund user, optional reason) */
  async rejectWithdrawalRequest(
    id: string,
    adminId: string,
    adminEmail?: string,
    reason?: string,
  ) {
    const request = await this.withdrawalService.reject(id, adminId, reason);
    await this.auditService.log(adminId, 'WITHDRAWAL_REJECT', {
      adminEmail,
      targetType: 'withdrawal_request',
      targetId: id,
      details: { reference: (request as any).reference, reason },
    });
    return request;
  }

  /** Get payment configuration */
  async getPaymentConfig() {
    let config = await this.paymentConfigModel.findOne({ configKey: 'default' });
    if (!config) {
      // Create default config if it doesn't exist
      config = await this.paymentConfigModel.create({
        configKey: 'default',
        cryptoAddresses: {},
      });
    }
    return config;
  }

  /** Update payment configuration */
  async updatePaymentConfig(
    updates: Partial<PaymentConfig>,
    adminId: string,
    adminEmail?: string,
  ) {
    const config = await this.paymentConfigModel.findOneAndUpdate(
      { configKey: 'default' },
      { $set: updates },
      { upsert: true, new: true },
    );
    await this.auditService.log(adminId, 'PAYMENT_CONFIG_UPDATE', {
      adminEmail,
      targetType: 'config',
      details: { updatedFields: Object.keys(updates) },
    });
    return config;
  }

  /** Admin: Create trade for any user with optional custom open price */
  async createTradeForUser(
    userId: string,
    symbol: string,
    direction: any,
    lotSize: number,
    marketPrice: number,
    adminId: string,
    sl?: number,
    tp?: number,
    adminEmail?: string,
    customOpenPrice?: number,
  ) {
    try {
      // Validate user exists
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Validate lot size
      if (lotSize <= 0 || lotSize > 1000) {
        throw new HttpException('Lot size must be between 0.01 and 1000', HttpStatus.BAD_REQUEST);
      }

      // Validate market price
      if (marketPrice <= 0) {
        throw new HttpException('Market price must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      // If custom open price is provided, create trade then override it
      let trade;
      if (customOpenPrice !== undefined && customOpenPrice > 0) {
        // Validate custom open price
        if (customOpenPrice <= 0) {
          throw new HttpException('Custom open price must be greater than 0', HttpStatus.BAD_REQUEST);
        }
        // Create trade with market price first
        trade = await this.tradeService.openTrade(
          userId,
          symbol,
          direction,
          lotSize,
          marketPrice,
          sl,
          tp,
          { notifyUser: false, bypassMargin: true },
        );
        // Then override with custom open price
        trade = await this.tradeService.manualUpdateTrade(
          trade._id.toString(),
          { openPrice: customOpenPrice },
          adminId,
        );
      } else {
        // Normal creation with calculated open price
        trade = await this.tradeService.openTrade(
          userId,
          symbol,
          direction,
          lotSize,
          marketPrice,
          sl,
          tp,
          { notifyUser: false, bypassMargin: true },
        );
      }

      await this.auditService.log(adminId, 'TRADE_CREATE_FOR_USER', {
        adminEmail,
        targetType: 'trade',
        targetId: trade._id.toString(),
        details: {
          userId,
          symbol,
          direction,
          lotSize,
          marketPrice,
          openPrice: trade.openPrice,
          customOpenPrice: customOpenPrice || null,
          sl,
          tp,
        },
      });

      return trade;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to create trade',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Delete user account */
  async deleteUser(userId: string, adminId: string, adminEmail?: string) {
    try {
      const user = await this.usersService.findById(userId);

      // Even if not in Firestore, try to delete from Firebase Auth to clean up "ghost" users
      try {
        await admin.auth().deleteUser(userId);
      } catch (authError: any) {
        console.warn(`Firebase Auth delete failed or user not found: ${authError.message}`);
        // If it's NOT in Auth AND NOT in Firestore, then it's a real 404
        if (!user) {
          throw new HttpException('User not found in Auth or Firestore', HttpStatus.NOT_FOUND);
        }
      }

      if (user) {
        await this.usersService.delete(userId);
      }

      await this.auditService.log(adminId, 'USER_DELETE', {
        adminEmail,
        targetType: 'user',
        targetId: userId,
      });
      return { success: true, message: 'User deleted from system' };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to delete user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Delete trade */
  async deleteTrade(tradeId: string, adminId: string, adminEmail?: string) {
    try {
      const trade = await this.tradeModel.findById(tradeId);
      if (!trade) {
        throw new HttpException('Trade not found', HttpStatus.NOT_FOUND);
      }
      const userId = trade.userId?.toString();
      await this.tradeModel.findByIdAndDelete(tradeId);
      if (userId) {
        this.tradeGateway.emitTradeDeleted(userId, tradeId, { notifyUser: false });
      }
      await this.auditService.log(adminId, 'TRADE_DELETE', {
        adminEmail,
        targetType: 'trade',
        targetId: tradeId,
      });
      return { success: true, message: 'Trade deleted' };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to delete trade',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Update user profile */
  async updateUserProfile(
    userId: string,
    updates: { firstName?: string; lastName?: string; email?: string; phone?: string },
    adminId: string,
    adminEmail?: string,
  ) {
    const user = await this.usersService.updateProfile(userId, updates);
    await this.auditService.log(adminId, 'USER_PROFILE_UPDATE', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
      details: Object.keys(updates),
    });
    return user;
  }

  /** Admin: Reset user password */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    adminId: string,
    adminEmail?: string,
  ) {
    await this.usersService.resetPassword(userId, newPassword);
    await this.auditService.log(adminId, 'USER_PASSWORD_RESET', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
    });
    return { success: true, message: 'Password reset' };
  }

  /** Admin: Get all orders with pagination */
  async getAllOrders(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    status?: string,
    symbol?: string,
    orderType?: string,
  ) {
    try {
      return await this.ordersService.findAll(page, limit, sortBy, sortOrder, status, symbol, orderType);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get orders',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Get user orders */
  async getUserOrders(userId: string) {
    try {
      return await this.ordersService.findByUserId(userId);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get user orders',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Delete order */
  async deleteOrder(orderId: string, adminId: string, adminEmail?: string) {
    try {
      const order = await this.ordersService.findById(orderId);
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }
      await this.ordersService.delete(orderId);
      await this.auditService.log(adminId, 'ORDER_DELETE', {
        adminEmail,
        targetType: 'order',
        targetId: orderId,
      });
      return { success: true, message: 'Order deleted' };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to delete order',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Admin: Disable user 2FA */
  async disableUser2FA(userId: string, adminId: string, adminEmail?: string) {
    await this.usersService.disable2FAForUser(userId);
    await this.auditService.log(adminId, 'USER_2FA_DISABLE', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
    });
    return { success: true, message: '2FA disabled' };
  }

  /** Admin: Reset user 2FA */
  async resetUser2FA(userId: string, adminId: string, adminEmail?: string) {
    await this.usersService.reset2FAForUser(userId);
    await this.auditService.log(adminId, 'USER_2FA_RESET', {
      adminEmail,
      targetType: 'user',
      targetId: userId,
    });
    return { success: true, message: '2FA reset' };
  }
}
