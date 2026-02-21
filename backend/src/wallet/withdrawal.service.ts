import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalRequestStatus,
} from './schemas/withdrawal-request.schema';
import { WalletService } from './wallet.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { TradeGateway } from '../trade/trade.gateway';

const MIN_WITHDRAWAL = 10;
const MAX_WITHDRAWAL = 500000;
const REFERENCE_LENGTH = 12;

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private withdrawalModel: Model<WithdrawalRequestDocument>,
    private walletService: WalletService,
    private configService: ConfigService,
    @Optional() @Inject(forwardRef(() => TradeGateway))
    private tradeGateway?: TradeGateway,
  ) {}

  private generateReference(): string {
    return randomBytes(REFERENCE_LENGTH)
      .toString('base64url')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 14) || randomBytes(7).toString('hex').toUpperCase();
  }

  /** Create withdrawal request: deduct gross amount from balance, store request (PENDING). */
  async createRequest(userId: string, dto: CreateWithdrawalRequestDto) {
    const amount = Number(dto.amount);
    if (amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
      throw new BadRequestException(
        `Amount must be between $${MIN_WITHDRAWAL} and $${MAX_WITHDRAWAL}`,
      );
    }

    const feePercent = this.configService.get<number>('PLATFORM_WITHDRAWAL_FEE_PERCENT') ?? 0;
    const fee = Math.round((amount * feePercent) / 100 * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    const wallet = await this.walletService.getWallet(userId);
    if ((wallet?.balance ?? 0) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    let reference: string;
    let existing: WithdrawalRequestDocument | null;
    do {
      reference = this.generateReference();
      existing = await this.withdrawalModel.findOne({ reference });
    } while (existing);

    const description = `Withdrawal to ${dto.chain} (ref: ${reference})${fee > 0 ? `, fee $${fee.toFixed(2)}` : ''}`;
    await this.walletService.withdraw(userId, amount, description, reference);

    const request = new this.withdrawalModel({
      userId,
      amount,
      fee,
      netAmount,
      walletAddress: dto.walletAddress.trim(),
      chain: dto.chain,
      status: WithdrawalRequestStatus.PENDING,
      reference,
    });
    const saved = await request.save();

    if (this.tradeGateway) {
      this.tradeGateway.emitBalanceUpdated(userId, {
        balance: (wallet?.balance ?? 0) - amount,
        currency: (wallet as any)?.currency ?? 'USD',
      });
    }

    return saved.toObject ? saved.toObject() : saved;
  }

  /** List requests for a user (any status). */
  async listByUser(userId: string, status?: WithdrawalRequestStatus, limit = 50) {
    const q: any = { userId };
    if (status) q.status = status;
    return this.withdrawalModel
      .find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /** List all requests for admin (paginated, filter by status). */
  async listAll(
    page = 1,
    limit = 50,
    status?: WithdrawalRequestStatus,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const q = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.withdrawalModel.find(q).sort(sort).skip(skip).limit(limit).lean(),
      this.withdrawalModel.countDocuments(q),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Get one request by id (admin or owner). */
  async getById(id: string, userId?: string) {
    const request = await this.withdrawalModel.findById(id).lean();
    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (userId && (request as any).userId !== userId) {
      throw new NotFoundException('Withdrawal request not found');
    }
    return request;
  }

  /** Admin: approve/complete withdrawal (optionally set txHash). No refund; balance already deducted. */
  async approve(
    id: string,
    adminId: string,
    txHash?: string,
  ) {
    const request = await this.withdrawalModel.findById(id);
    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(`Request is not pending (status: ${request.status})`);
    }
    request.status = WithdrawalRequestStatus.COMPLETED;
    request.processedBy = adminId;
    request.processedAt = new Date();
    if (txHash) request.txHash = txHash;
    await request.save();
    return request.toObject ? request.toObject() : request;
  }

  /** Admin: reject withdrawal; refund full amount to user. */
  async reject(id: string, adminId: string, reason?: string) {
    const request = await this.withdrawalModel.findById(id);
    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalRequestStatus.PENDING) {
      throw new BadRequestException(`Request is not pending (status: ${request.status})`);
    }
    request.status = WithdrawalRequestStatus.REJECTED;
    request.processedBy = adminId;
    request.processedAt = new Date();
    request.rejectionReason = reason || 'Rejected by admin';
    await request.save();

    await this.walletService.adjustBalance(
      request.userId,
      request.amount,
      `Refund: withdrawal request rejected (ref: ${request.reference}). ${request.rejectionReason}`,
    );

    if (this.tradeGateway) {
      this.tradeGateway.emitBalanceUpdated(request.userId, {
        balance: (await this.walletService.getWallet(request.userId))?.balance ?? 0,
        currency: 'USD',
      });
    }

    return request.toObject ? request.toObject() : request;
  }
}
