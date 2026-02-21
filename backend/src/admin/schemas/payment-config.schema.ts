import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentConfigDocument = PaymentConfig & Document;

@Schema({ timestamps: true })
export class PaymentConfig {
  @Prop({ required: true, unique: true, default: 'default' })
  configKey: string; // 'default' for main config

  // SumUp Configuration
  @Prop()
  sumupApiKey?: string;

  @Prop()
  sumupCheckoutUrl?: string;

  // Crypto Wallet Addresses
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  cryptoAddresses?: Record<string, string>;

  // Bank Details (for future use)
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  bankDetails?: {
    name?: string;
    iban?: string;
    swift?: string;
    referenceLabel?: string;
  };
}

export const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);
