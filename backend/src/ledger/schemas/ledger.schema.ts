import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LedgerDocument = Ledger & Document;

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRADE_OPEN = 'TRADE_OPEN',
  TRADE_CLOSE = 'TRADE_CLOSE',
  SWAP_FEE = 'SWAP_FEE',
  COMMISSION = 'COMMISSION',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Schema({ timestamps: true })
export class Ledger {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  balanceBefore: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop()
  referenceId: string; // Trade ID, Withdrawal ID, etc.

  @Prop()
  description: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const LedgerSchema = SchemaFactory.createForClass(Ledger);

// Performance: Add indexes for frequently queried fields
LedgerSchema.index({ userId: 1 }); // For user-specific queries
LedgerSchema.index({ type: 1 }); // For filtering by transaction type
LedgerSchema.index({ createdAt: -1 }); // For sorting by date (newest first)
LedgerSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's transaction history
LedgerSchema.index({ userId: 1, type: 1 }); // Compound index for user's transactions by type