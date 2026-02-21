import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TradeDocument = Trade & Document;

export enum TradeDirection {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum TradeStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING',
}

@Schema({ timestamps: true })
export class Trade {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true, enum: TradeDirection })
  direction: TradeDirection;

  @Prop({ required: true })
  lotSize: number;

  @Prop({ required: true })
  openPrice: number;

  @Prop()
  closePrice: number;

  @Prop()
  sl: number; // Stop Loss

  @Prop()
  tp: number; // Take Profit

  @Prop({ enum: TradeStatus, default: TradeStatus.OPEN })
  status: TradeStatus;

  @Prop()
  pnl: number; // Profit/Loss

  @Prop({ default: 0 })
  swap: number; // Accumulated Swap fees

  @Prop({ default: 0 })
  commission: number;

  @Prop()
  closedAt: Date;

  @Prop({ default: true })
  isActive: boolean; // Admin can activate/deactivate trades

  @Prop()
  adminModifiedAt: Date; // Track when admin last modified this trade

  @Prop()
  adminModifiedBy: string; // Track which admin modified this trade

  @Prop({ type: Object })
  adminNotes: Record<string, any>; // Admin notes/metadata
}

export const TradeSchema = SchemaFactory.createForClass(Trade);

// Performance: Add indexes for frequently queried fields
TradeSchema.index({ userId: 1 }); // For user-specific queries
TradeSchema.index({ status: 1 }); // For filtering by status
TradeSchema.index({ symbol: 1 }); // For filtering by symbol
TradeSchema.index({ createdAt: -1 }); // For sorting by date (newest first)
TradeSchema.index({ userId: 1, status: 1 }); // Compound index for common queries
TradeSchema.index({ symbol: 1, status: 1 }); // Compound index for symbol + status
TradeSchema.index({ createdAt: -1, status: 1 }); // Compound index for date + status sorting