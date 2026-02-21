import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Ledger,
  LedgerDocument,
  TransactionType,
} from './schemas/ledger.schema';

@Injectable()
export class LedgerService {
  constructor(
    @InjectModel(Ledger.name) private ledgerModel: Model<LedgerDocument>,
  ) {}

  async createEntry(
    userId: string,
    type: TransactionType,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    referenceId?: string,
    description?: string,
    metadata?: Record<string, any>,
  ) {
    const entry = new this.ledgerModel({
      userId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      referenceId,
      description,
      metadata,
    });
    return entry.save();
  }

  async getUserLedger(userId: string) {
    return this.ledgerModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getAllLedger() {
    return this.ledgerModel.find().sort({ createdAt: -1 }).exec();
  }
}
