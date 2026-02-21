import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderType {
  LIMIT = 'LIMIT',
  STOP = 'STOP',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true, enum: ['BUY', 'SELL'] })
  direction: string;

  @Prop({ required: true })
  lotSize: number;

  @Prop({ required: true, enum: OrderType })
  orderType: OrderType;

  @Prop()
  triggerPrice?: number;

  @Prop()
  limitPrice?: number;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop()
  filledAt?: Date;

  @Prop()
  tradeId?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Performance: Add indexes for frequently queried fields
OrderSchema.index({ userId: 1 }); // For user-specific queries
OrderSchema.index({ status: 1 }); // For filtering by status
OrderSchema.index({ symbol: 1 }); // For filtering by symbol
OrderSchema.index({ createdAt: -1 }); // For sorting by date (newest first)
OrderSchema.index({ userId: 1, status: 1 }); // Compound index for user's pending orders
OrderSchema.index({ symbol: 1, status: 1 }); // Compound index for symbol + status