import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  /** Firebase UID or external user id (string), not MongoDB ObjectId */
  @Prop({ type: String, required: true, unique: true })
  userId: string;

  @Prop({ required: true, default: 0 })
  balance: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ default: 0 })
  lockedBalance: number; // For active trades or pending withdrawals
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
