import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminAudit, AdminAuditDocument } from './schemas/admin-audit.schema';

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectModel(AdminAudit.name)
    private auditModel: Model<AdminAuditDocument>,
  ) {}

  async log(
    adminId: string,
    action: string,
    options?: {
      adminEmail?: string;
      targetType?: string;
      targetId?: string;
      details?: Record<string, any>;
      ip?: string;
    },
  ) {
    const entry = new this.auditModel({
      adminId,
      action,
      adminEmail: options?.adminEmail,
      targetType: options?.targetType,
      targetId: options?.targetId,
      details: options?.details,
      ip: options?.ip,
    });
    await entry.save();
  }

  async getRecent(limit = 100, action?: string) {
    const filter: any = {};
    if (action) filter.action = action;
    return this.auditModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }
}
