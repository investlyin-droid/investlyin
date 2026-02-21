import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

const ApiKeySchema = new MongooseSchema(
  {
    name: { type: String, required: true },
    keyHash: { type: String, required: true },
    permissions: { type: [String], default: ['read', 'trade'] },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: null },
  },
  { _id: true },
);

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_SUBMITTED = 'not_submitted',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  firebaseUid?: string;

  @Prop({ required: false, select: false })
  passwordHash?: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ enum: KycStatus, default: KycStatus.NOT_SUBMITTED })
  kycStatus: KycStatus;

  @Prop()
  kycDocumentType?: string;

  @Prop()
  kycDocumentNumber?: string;

  @Prop()
  kycDocumentUrl?: string;

  @Prop()
  kycSubmittedAt?: Date;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ type: [ApiKeySchema], default: [] })
  apiKeys: Array<{
    _id?: any;
    name: string;
    keyHash: string;
    permissions: string[];
    createdAt: Date;
    lastUsed: Date | null;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
