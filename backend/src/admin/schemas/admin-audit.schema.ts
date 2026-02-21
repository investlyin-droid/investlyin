import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminAuditDocument = AdminAudit & Document;

@Schema({ timestamps: true })
export class AdminAudit {
  @Prop({ required: true })
  adminId: string;

  @Prop()
  adminEmail?: string;

  @Prop({ required: true })
  action: string;

  @Prop()
  targetType?: string;

  @Prop()
  targetId?: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop()
  ip?: string;
}

export const AdminAuditSchema = SchemaFactory.createForClass(AdminAudit);
AdminAuditSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditSchema.index({ action: 1, createdAt: -1 });
