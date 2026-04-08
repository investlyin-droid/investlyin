import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LiquidityRuleDocument = LiquidityRule & Document;

@Schema({ timestamps: true })
export class LiquidityRule {
  @Prop({ required: true, unique: true })
  symbol: string; // e.g., 'EURUSD', 'BTCUSD'

  @Prop({ required: true, default: 0 })
  bidSpread: number; // Added to market bid

  @Prop({ required: true, default: 0 })
  askSpread: number; // Added to market ask

  @Prop({ required: true, default: 0 })
  priceOffset: number; // Global offset for the symbol

  @Prop({ required: true, default: 0 })
  slippageMin: number;

  @Prop({ required: true, default: 0 })
  slippageMax: number;

  @Prop({ required: true, default: 0 })
  executionDelayMs: number; // Artificial delay before trade confirmation

  @Prop({ required: true, default: false })
  isFrozen: boolean;

  @Prop({ default: 0 })
  longSwapPerDay: number;

  @Prop({ default: 0 })
  shortSwapPerDay: number;

  @Prop({ required: true, default: 100 })
  leverage: number; // e.g., 100 for 1:100
}

export const LiquidityRuleSchema = SchemaFactory.createForClass(LiquidityRule);
