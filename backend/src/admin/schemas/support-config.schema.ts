import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupportConfigDocument = SupportConfig & Document;

@Schema({ timestamps: true })
export class SupportConfig {
    @Prop({ default: '' })
    whatsappNumber: string;

    @Prop({ default: '' })
    telegramUsername: string;

    @Prop({ default: 'support@investlyin.com' })
    supportEmail: string;

    @Prop({ default: '' })
    liveChatScript: string;

    @Prop({ default: true })
    isEnabled: boolean;

    @Prop({ default: true })
    showWhatsApp: boolean;

    @Prop({ default: true })
    showTelegram: boolean;

    @Prop({ default: true })
    showEmail: boolean;
}

export const SupportConfigSchema = SchemaFactory.createForClass(SupportConfig);
