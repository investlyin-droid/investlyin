import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionType } from '../ledger/schemas/ledger.schema';
import { RedisService } from '../redis/redis.service';

const WALLET_CACHE_TTL = 10;

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

  /** Get a Mongoose document for updates (bypasses cache so .save() is valid). */
  private async getWalletForUpdate(userId: string): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return wallet;
  }

  private invalidateWalletCache(userId: string): void {
    if (this.redis.isEnabled()) {
      this.redis.del(`wallet:${userId}`).catch(() => {});
    }
  }

  async deposit(userId: string, amount: number, description?: string) {
    const wallet = await this.getWalletForUpdate(userId);
    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    await wallet.save();

    await this.ledgerService.createEntry(
      userId,
      TransactionType.DEPOSIT,
      amount,
      balanceBefore,
      wallet.balance,
      undefined,
      description || 'Deposit',
    );
    this.invalidateWalletCache(userId);
    return wallet;
  }

  /** Deduct amount from balance (e.g. for withdrawal request). Optionally link ledger to referenceId. */
  async withdraw(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string,
  ) {
    const wallet = await this.getWalletForUpdate(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();

    await this.ledgerService.createEntry(
      userId,
      TransactionType.WITHDRAWAL,
      -amount,
      balanceBefore,
      wallet.balance,
      referenceId,
      description || 'Withdrawal',
    );
    this.invalidateWalletCache(userId);
    return wallet;
  }

  async adjustBalance(userId: string, amount: number, description: string) {
    const wallet = await this.getWalletForUpdate(userId);
    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    await wallet.save();

    await this.ledgerService.createEntry(
      userId,
      TransactionType.ADMIN_ADJUSTMENT,
      amount,
      balanceBefore,
      wallet.balance,
      undefined,
      description,
    );
    this.invalidateWalletCache(userId);
    return wallet;
  }

  /** Deduct trading/commission fee (e.g. on trade open). Records as COMMISSION in ledger. */
  async deductCommission(userId: string, amount: number, description: string, referenceId?: string): Promise<WalletDocument> {
    const wallet = await this.getWalletForUpdate(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException(`Insufficient balance for fee ($${amount.toFixed(2)} required)`);
    }
    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();
    await this.ledgerService.createEntry(
      userId,
      TransactionType.COMMISSION,
      -amount,
      balanceBefore,
      wallet.balance,
      referenceId,
      description,
    );
    this.invalidateWalletCache(userId);
    return wallet;
  }

  /** Sum of all wallet balances (for admin overview). Uses MongoDB aggregation. */
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
