import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WithdrawalRequestDocument = WithdrawalRequest & Document;

export enum WithdrawalRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ required: true, index: true })
  userId: string;

  /** Gross amount requested (USD) — total deducted from balance */
  @Prop({ required: true })
  amount: number;

  /** Withdrawal fee (USD) — platform fee */
  @Prop({ required: true, default: 0 })
  fee: number;

  /** Net amount user receives (amount - fee) */
  @Prop({ required: true })
  netAmount: number;

  /** Destination wallet address (crypto) */
  @Prop({ required: true })
  walletAddress: string;

  /** Chain/network id (e.g. POLYGON, ETH, BNB) */
  @Prop({ required: true })
  chain: string;

  @Prop({ required: true, enum: WithdrawalRequestStatus, default: WithdrawalRequestStatus.PENDING })
  status: WithdrawalRequestStatus;

  /** Unique reference for this request */
  @Prop({ required: true, unique: true })
  reference: string;

  /** Admin: transaction hash after payout (when completed) */
  @Prop()
  txHash?: string;

  /** Admin: who processed (userId) */
  @Prop()
  processedBy?: string;

  @Prop()
  processedAt?: Date;

  /** Rejection reason (when status = REJECTED) */
  @Prop()
  rejectionReason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);

WithdrawalRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ reference: 1 });
