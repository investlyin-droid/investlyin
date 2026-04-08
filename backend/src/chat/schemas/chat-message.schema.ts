import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    receiverId: string; // 'ADMIN' or standard user ID

    @Prop({ required: true })
    content: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    isAdmin: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
