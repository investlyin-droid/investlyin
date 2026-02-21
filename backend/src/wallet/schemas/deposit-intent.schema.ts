import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepositIntentDocument = DepositIntent & Document;

export enum DepositMethod {
  CRYPTO = 'CRYPTO',
  BANK = 'BANK',
  CARD = 'CARD',
}

export enum DepositIntentStatus {
  /** User created intent; may upload screenshot */
  PENDING = 'PENDING',
  /** User has uploaded screenshot and submitted for admin verification */
  SUBMITTED = 'SUBMITTED',
  /** Admin credited the wallet */
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class DepositIntent {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: DepositMethod })
  method: DepositMethod;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ required: true, enum: DepositIntentStatus, default: DepositIntentStatus.PENDING })
  status: DepositIntentStatus;

  /** Unique reference for user (bank transfer ref, crypto memo, etc.) */
  @Prop({ required: true, unique: true })
  reference: string;

  /** Method-specific: network (USDT-ERC20), bank ref, or payment session id */
  @Prop()
  methodOption?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  completedAt?: Date;

  /** User-uploaded screenshot of payment for admin verification (crypto/bank/card) */
  @Prop()
  paymentScreenshotUrl?: string;
}

export const DepositIntentSchema = SchemaFactory.createForClass(DepositIntent);

// Performance: Add indexes for frequently queried fields
DepositIntentSchema.index({ userId: 1, status: 1, createdAt: -1 }); // Existing compound index
DepositIntentSchema.index({ status: 1 }); // For filtering by status (admin queries)
DepositIntentSchema.index({ createdAt: -1 }); // For sorting by date
DepositIntentSchema.index({ method: 1 }); // For filtering by deposit method
