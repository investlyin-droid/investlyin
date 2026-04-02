import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Trade,
  TradeDocument,
  TradeDirection,
  TradeStatus,
} from './schemas/trade.schema';
import {
  LiquidityRule,
  LiquidityRuleDocument,
} from '../admin/schemas/liquidity-rule.schema';
import { TradeGateway } from './trade.gateway';
import { MarketDataService } from '../market-data/market-data.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class TradeService {
  constructor(
    @InjectModel(Trade.name) private tradeModel: Model<TradeDocument>,
    @InjectModel(LiquidityRule.name)
    private liquidityRuleModel: Model<LiquidityRuleDocument>,
    private tradeGateway: TradeGateway,
    private configService: ConfigService,
    @Inject(forwardRef(() => MarketDataService))
    private marketDataService: MarketDataService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
  ) {}

  private static readonly MIN_LOT = 0.01;
  private static readonly MAX_LOT = 100;

  /**
   * Get contract size based on asset type
   * This is critical for accurate margin and P/L calculations
   */
  private getContractSize(symbol: string): number {
    const sym = symbol.toUpperCase();
    
    // Metals
    if (sym.startsWith('XAU')) {
      return 100; // 100 oz per lot for gold
    } else if (sym.startsWith('XAG')) {
      return 5000; // 5000 oz per lot for silver
    } else if (sym.startsWith('XPT') || sym.startsWith('XPD')) {
      return 100; // Default for other metals
    }
    
    // Cryptocurrencies
    if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE', 'MATIC', 'LINK', 'AVAX', 'UNI'].some(c => sym.includes(c))) {
      return 1; // 1 unit per lot for crypto
    }
    
    // Energies
    if (sym.includes('OIL') || sym.includes('GAS') || sym.includes('CRUDE') || sym.includes('BRENT') || sym.includes('WTI') || sym.includes('NATGAS')) {
      return 1000; // 1000 barrels/units per lot
    }
    
    // Indices
    if (sym.includes('SPX') || sym.includes('NAS') || sym.includes('DJI') || sym.includes('DOW') || 
        sym.includes('FTSE') || sym.includes('UK100') || sym.includes('DAX') || sym.includes('GER30') || 
        sym.includes('NIKKEI') || sym.includes('JPN225') || sym.includes('AUS200') || sym.includes('ASX') ||
        sym.includes('US30') || sym.includes('SWI20') || sym.includes('SMI') || sym.includes('ESP35') || 
        sym.includes('IBEX') || sym.includes('FRA40') || sym.includes('CAC')) {
      return 1; // 1 point per lot for indices
    }
    
    // Stocks (short symbols, typically 1-5 chars, not forex pairs)
    if (sym.length <= 5 && !sym.includes('USD') && !sym.includes('EUR') && !sym.includes('GBP') && 
        !sym.includes('JPY') && !sym.includes('CHF') && !sym.includes('AUD') && !sym.includes('CAD') && 
        !sym.includes('NZD') && !sym.includes('XAU') && !sym.includes('XAG')) {
      return 1; // 1 share per lot for stocks
    }
    
    // Default to forex
    return 100000; // Standard forex contract size
  }

  async openTrade(
    userId: string,
    symbol: string,
    direction: TradeDirection,
    lotSize: number,
    marketPrice: number,
    sl?: number,
    tp?: number,
    /** Set `notifyUser: false` when admin creates a trade for a user (no user socket updates). */
    socketOpts?: { notifyUser?: boolean },
  ) {
    const notifyUser = socketOpts?.notifyUser !== false;
    // Check if symbol exists in market data
    const symbolUpper = symbol.toUpperCase();
    const marketPriceData = this.marketDataService.getPrice(symbolUpper);
    if (!marketPriceData) {
      const allPrices = await this.marketDataService.getAllPrices();
      const availableSymbols = allPrices.map(p => p.symbol).join(', ');
      throw new BadRequestException(`Invalid symbol. Available symbols: ${availableSymbols}`);
    }
    const lot = Number(lotSize);
    if (typeof lot !== 'number' || !Number.isFinite(lot) || lot < TradeService.MIN_LOT || lot > TradeService.MAX_LOT) {
      throw new BadRequestException(`Lot size must be between ${TradeService.MIN_LOT} and ${TradeService.MAX_LOT}`);
    }
    const price = Number(marketPrice);
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Invalid market price');
    }

    const rules = await this.liquidityRuleModel.findOne({ symbol: symbol.toUpperCase() });

    if (rules?.isFrozen) {
      throw new ForbiddenException('Trading is frozen for this symbol');
    }

    // Calculate entry price with admin rules
    let openPrice = marketPrice;

    if (direction === TradeDirection.BUY) {
      openPrice += rules?.askSpread || 0;
    } else {
      openPrice -= rules?.bidSpread || 0;
    }

    openPrice += rules?.priceOffset || 0;

    // Apply slippage
    openPrice = Number(openPrice);
    const slippage = this.calculateSlippage(
      rules?.slippageMin || 0,
      rules?.slippageMax || 0,
    );
    openPrice += slippage;

    // Simulate execution delay
    if (rules?.executionDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, rules.executionDelayMs),
      );
    }

    const trade = new this.tradeModel({
      userId,
      symbol: symbol.toUpperCase(),
      direction,
      lotSize: lot,
      openPrice,
      sl,
      tp,
      status: TradeStatus.OPEN,
      pnl: 0,
      swap: 0,
      commission: 0,
      isActive: true,
    });

    const savedTrade = await trade.save();

    // Exchange-style trading fee on open: deduct from balance and add to trade commission
    const openFeePercent = this.configService.get<number>('PLATFORM_TRADE_FEE_PERCENT') ?? 0;
    if (openFeePercent > 0) {
      const contractSize = this.getContractSize(symbolUpper);
      const notionalOpen = lot * contractSize * openPrice;
      const openFee = (notionalOpen * openFeePercent) / 100;
      if (openFee > 0) {
        try {
          const wallet = await this.walletService.deductCommission(
            userId,
            openFee,
            `Trading fee (open): ${savedTrade.symbol} ${direction} ${lot} lot(s)`,
            savedTrade._id.toString(),
          );
          savedTrade.commission = openFee;
          await savedTrade.save();
          this.tradeGateway.emitBalanceUpdated(
            userId,
            { balance: wallet.balance, currency: wallet.currency },
            { notifyUser },
          );
        } catch (e) {
          await this.tradeModel.findByIdAndDelete(savedTrade._id);
          throw e;
        }
      }
    }

    const tradeToEmit = await this.tradeModel.findById(savedTrade._id).lean();
    const adminCopy = tradeToEmit ? { ...tradeToEmit } : tradeToEmit;
    this.tradeGateway.emitTradeOpened(userId, this.sanitizeForUser(tradeToEmit), adminCopy, { notifyUser });
    return this.sanitizeForUser(tradeToEmit);
  }

  async closeTrade(tradeId: string, marketPrice: number, callerUserId?: string) {
    const trade = await this.tradeModel.findById(tradeId);
    if (!trade || trade.status !== TradeStatus.OPEN) {
      throw new BadRequestException('Trade not found or already closed');
    }
    if (callerUserId && trade.userId?.toString() !== callerUserId) {
      throw new ForbiddenException('You can only close your own trades');
    }
    const price = Number(marketPrice);
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Invalid market price');
    }

    const rules = await this.liquidityRuleModel.findOne({
      symbol: trade.symbol,
    });

    // Calculate close price with admin rules
    let closePrice = price;

    if (trade.direction === TradeDirection.BUY) {
      closePrice -= rules?.bidSpread || 0;
    } else {
      closePrice += rules?.askSpread || 0;
    }

    closePrice += rules?.priceOffset || 0;

    // Calculate P/L
    const pnl = this.calculatePnL(
      trade.direction,
      trade.openPrice,
      closePrice,
      trade.lotSize,
      trade.symbol,
    );

    const tradeFeePercent = this.configService.get<number>('PLATFORM_TRADE_FEE_PERCENT') ?? 0.1;
    const contractSize = this.getContractSize(trade.symbol);
    const notional = trade.lotSize * contractSize * (trade.openPrice + closePrice) / 2;
    const commissionFee = (notional * tradeFeePercent) / 100;
    const totalCommission = (trade.commission || 0) + commissionFee;

    trade.closePrice = closePrice;
    trade.commission = totalCommission;
    trade.pnl = pnl - trade.swap - totalCommission;
    trade.status = TradeStatus.CLOSED;
    trade.closedAt = new Date();

    const closedTrade = await trade.save();

    /** User self-close passes callerUserId; admin force-close does not — do not push trade sockets to the user in the latter case. */
    const notifyUser = !!callerUserId;

    const userId = trade.userId.toString();
    const wallet = await this.walletService.applyTradeCloseCredit(
      userId,
      trade.pnl,
      trade._id.toString(),
      `Trade closed: ${trade.symbol} ${trade.direction} ${trade.lotSize} lot${trade.lotSize !== 1 ? 's' : ''}`,
      {
        symbol: trade.symbol,
        direction: trade.direction,
        lotSize: trade.lotSize,
        openPrice: trade.openPrice,
        closePrice: trade.closePrice,
        pnl: trade.pnl,
        commission: trade.commission,
        swap: trade.swap,
      },
    );

    this.tradeGateway.emitBalanceUpdated(
      userId,
      {
        balance: wallet.balance,
        currency: wallet.currency,
      },
      { notifyUser },
    );

    const closedObj = closedTrade.toObject?.() ?? closedTrade;
    const adminCopy = { ...closedObj };
    this.tradeGateway.emitTradeClosed(userId, this.sanitizeForUser(closedObj), adminCopy, { notifyUser });

    return closedTrade;
  }

  private calculateSlippage(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private calculatePnL(
    direction: TradeDirection,
    openPrice: number,
    closePrice: number,
    lotSize: number,
    symbol: string,
  ): number {
    const priceDiff =
      direction === TradeDirection.BUY
        ? closePrice - openPrice
        : openPrice - closePrice;
    const contractSize = this.getContractSize(symbol);
    return priceDiff * lotSize * contractSize;
  }

  /** Strip admin-only fields so users cannot see that an admin made changes */
  private sanitizeForUser(trade: any): any {
    const obj = trade && typeof trade.toObject === 'function' ? trade.toObject() : { ...trade };
    delete obj.adminModifiedBy;
    delete obj.adminModifiedAt;
    delete obj.adminNotes;
    return obj;
  }

  async getUserTrades(userId: string, status?: TradeStatus) {
    const filter: any = { userId, isActive: { $ne: false } };
    if (status) {
      filter.status = status;
    }
    const trades = await this.tradeModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    return trades.map((t) => this.sanitizeForUser(t));
  }

  async getAllTrades() {
    return this.tradeModel.find().sort({ createdAt: -1 }).exec();
  }

  async manualUpdateTrade(
    tradeId: string,
    updates: {
      openPrice?: number;
      closePrice?: number;
      status?: TradeStatus;
      isActive?: boolean;
      createdAt?: Date;
      closedAt?: Date;
      adminNotes?: Record<string, any>;
      direction?: TradeDirection;
      lotSize?: number;
      sl?: number;
      tp?: number;
      swap?: number;
      commission?: number;
      pnl?: number;
    },
    adminId?: string,
  ) {
    const trade = await this.tradeModel.findById(tradeId);
    if (!trade) throw new NotFoundException('Trade not found');

    if (updates.openPrice !== undefined) trade.openPrice = updates.openPrice;
    if (updates.closePrice !== undefined) trade.closePrice = updates.closePrice;
    if (updates.status !== undefined) trade.status = updates.status;
    if (updates.isActive !== undefined) trade.isActive = updates.isActive;
    if (updates.closedAt !== undefined) trade.closedAt = updates.closedAt;
    if (updates.adminNotes !== undefined) trade.adminNotes = updates.adminNotes;
    if (updates.direction !== undefined) trade.direction = updates.direction;
    if (updates.lotSize !== undefined) trade.lotSize = updates.lotSize;
    if (updates.sl !== undefined) trade.sl = updates.sl;
    if (updates.tp !== undefined) trade.tp = updates.tp;
    if (updates.swap !== undefined) trade.swap = updates.swap;
    if (updates.commission !== undefined) trade.commission = updates.commission;

    // Handle createdAt update using set method for timestamps
    if (updates.createdAt !== undefined) {
      trade.set('createdAt', updates.createdAt);
    }

    // Track admin modifications
    if (adminId) {
      trade.adminModifiedAt = new Date();
      trade.adminModifiedBy = adminId;
    }

    // P/L: use explicit override if provided, else recalculate when closed
    if (updates.pnl !== undefined && Number.isFinite(updates.pnl)) {
      trade.pnl = updates.pnl;
    } else if (trade.status === TradeStatus.CLOSED && trade.closePrice !== undefined) {
      trade.pnl =
        this.calculatePnL(
          trade.direction,
          trade.openPrice,
          trade.closePrice,
          trade.lotSize,
          trade.symbol,
        ) -
        trade.swap -
        trade.commission;
    }

    const updatedTrade = await trade.save();
    const obj = updatedTrade.toObject?.() ?? updatedTrade;
    // Admin-only path: never push trade updates to the end-user socket
    this.tradeGateway.emitTradeUpdated(trade.userId.toString(), this.sanitizeForUser(obj), { ...obj }, {
      notifyUser: false,
    });
    return updatedTrade;
  }

  async activateTrade(tradeId: string, adminId: string) {
    return this.manualUpdateTrade(tradeId, { isActive: true }, adminId);
  }

  async deactivateTrade(tradeId: string, adminId: string) {
    return this.manualUpdateTrade(tradeId, { isActive: false }, adminId);
  }
}
