import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionType } from '../ledger/schemas/ledger.schema';
import { RedisService } from '../redis/redis.service';

const WALLET_CACHE_TTL = 10;

/**
 * Balance changes use atomic findOneAndUpdate ($inc) so they are safe on standalone MongoDB
 * (no replica-set transactions). Ledger rows are written immediately after; if that fails,
 * balance already moved — log/monitor in production.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private ledgerService: LedgerService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async createWallet(userId: string) {
    const wallet = new this.walletModel({
      userId,
      balance: 0,
      currency: 'USD',
    });
    return wallet.save();
  }

  /** Get wallet for read-only use; may return cached plain object. Do not call .save() on the result. */
  async getWallet(userId: string): Promise<WalletDocument> {
    const cacheKey = `wallet:${userId}`;
    if (this.redis.isEnabled()) {
      const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
      if (cached != null) {
        return cached as unknown as WalletDocument;
      }
    }
    let wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    if (this.redis.isEnabled()) {
      await this.redis.set(cacheKey, wallet.toObject?.() ?? wallet, WALLET_CACHE_TTL);
    }
    return wallet;
  }

  private invalidateWalletCache(userId: string): void {
    if (this.redis.isEnabled()) {
      this.redis.del(`wallet:${userId}`).catch(() => {});
    }
  }

  async deposit(
    userId: string,
    amount: number,
    description?: string,
    metadata?: Record<string, unknown>,
    referenceId?: string,
  ) {
    const updated = await this.walletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount }, $setOnInsert: { currency: 'USD' } },
      { new: true, upsert: true },
    );
    if (!updated) {
      throw new BadRequestException('Could not update wallet');
    }
    const balanceAfter = updated.balance;
    const balanceBefore = balanceAfter - amount;
    await this.ledgerService.createEntry(
      userId,
      TransactionType.DEPOSIT,
      amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description || 'Deposit',
      metadata,
    );
    this.invalidateWalletCache(userId);
    return updated;
  }

  async withdraw(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string,
  ) {
    const updated = await this.walletModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!updated) {
      const w = await this.walletModel.findOne({ userId });
      if (!w) {
        throw new BadRequestException('Insufficient balance');
      }
      throw new BadRequestException('Insufficient balance');
    }
    const balanceAfter = updated.balance;
    const balanceBefore = balanceAfter + amount;
    await this.ledgerService.createEntry(
      userId,
      TransactionType.WITHDRAWAL,
      -amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description || 'Withdrawal',
    );
    this.invalidateWalletCache(userId);
    return updated;
  }

  async adjustBalance(userId: string, amount: number, description: string) {
    let updated: WalletDocument | null;
    if (amount >= 0) {
      updated = await this.walletModel.findOneAndUpdate(
        { userId },
        { $inc: { balance: amount }, $setOnInsert: { currency: 'USD' } },
        { new: true, upsert: true },
      );
    } else {
      const abs = -amount;
      updated = await this.walletModel.findOneAndUpdate(
        { userId, balance: { $gte: abs } },
        { $inc: { balance: amount } },
        { new: true },
      );
      if (!updated) {
        throw new BadRequestException('Insufficient balance for adjustment');
      }
    }
    if (!updated) {
      throw new BadRequestException('Could not adjust wallet');
    }
    const balanceAfter = updated.balance;
    const balanceBefore = balanceAfter - amount;
    await this.ledgerService.createEntry(
      userId,
      TransactionType.ADMIN_ADJUSTMENT,
      amount,
      balanceBefore,
      balanceAfter,
      undefined,
      description,
    );
    this.invalidateWalletCache(userId);
    return updated;
  }

  async deductCommission(userId: string, amount: number, description: string, referenceId?: string): Promise<WalletDocument> {
    const updated = await this.walletModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!updated) {
      throw new BadRequestException(`Insufficient balance for fee ($${amount.toFixed(2)} required)`);
    }
    const balanceAfter = updated.balance;
    const balanceBefore = balanceAfter + amount;
    await this.ledgerService.createEntry(
      userId,
      TransactionType.COMMISSION,
      -amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description,
    );
    this.invalidateWalletCache(userId);
    return updated;
  }

  /** P/L credit when a trade closes — atomic $inc on balance */
  async applyTradeCloseCredit(
    userId: string,
    pnl: number,
    tradeId: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<WalletDocument> {
    const updated = await this.walletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: pnl }, $setOnInsert: { currency: 'USD' } },
      { new: true, upsert: true },
    );
    if (!updated) {
      throw new BadRequestException('Could not apply trade settlement');
    }
    const balanceAfter = updated.balance;
    const balanceBefore = balanceAfter - pnl;
    await this.ledgerService.createEntry(
      userId,
      TransactionType.TRADE_CLOSE,
      pnl,
      balanceBefore,
      balanceAfter,
      tradeId,
      description,
      metadata,
    );
    this.invalidateWalletCache(userId);
    return updated;
  }

  async getTotalBalance(): Promise<number> {
    const result = await this.walletModel
      .aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }])
      .exec();
    return result[0]?.total ?? 0;
  }

  getFeeConfig() {
    return {
      depositFeePercent: this.configService.get<number>('PLATFORM_DEPOSIT_FEE_PERCENT') ?? 0,
      withdrawalFeePercent: this.configService.get<number>('PLATFORM_WITHDRAWAL_FEE_PERCENT') ?? 0,
      tradeFeePercent: this.configService.get<number>('PLATFORM_TRADE_FEE_PERCENT') ?? 0,
      depositFee: this.configService.get<number>('PLATFORM_DEPOSIT_FEE_PERCENT') ?? 0,
      withdrawalFee: this.configService.get<number>('PLATFORM_WITHDRAWAL_FEE_PERCENT') ?? 0,
      tradingFee: this.configService.get<number>('PLATFORM_TRADE_FEE_PERCENT') ?? 0,
    };
  }
}
