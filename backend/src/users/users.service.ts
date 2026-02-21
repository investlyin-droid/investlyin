import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: any): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+passwordHash +twoFactorSecret').exec();
  }

  async findOneByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUid }).select('+passwordHash +twoFactorSecret').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  async findByIdWith2FA(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+twoFactorSecret').exec();
  }

  async removeApiKey(userId: string, keyId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;
    const keyIndex = user.apiKeys?.findIndex((k: any) => k._id?.toString() === keyId);
    if (keyIndex == null || keyIndex < 0) return;
    user.apiKeys.splice(keyIndex, 1);
    await user.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ data: UserDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const [data, total] = await Promise.all([
      this.userModel.find().sort(sort).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments().exec(),
    ]);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(userId: string, isActive: boolean): Promise<UserDocument | null> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true },
    );
    return user;
  }

  async updateKycStatus(userId: string, kycStatus: string): Promise<UserDocument | null> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { kycStatus: kycStatus as any } },
      { new: true },
    );
    return user;
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select('+twoFactorSecret').exec();
    if (!user) return null;
    const obj = user.toObject() as any;
    // Use the actual twoFactorEnabled field, not just checking if secret exists
    obj.twoFactorEnabled = obj.twoFactorEnabled === true;
    delete obj.passwordHash;
    delete obj.twoFactorSecret;
    if (obj.apiKeys) {
      obj.apiKeys = obj.apiKeys.map((k: any) => ({
        id: k._id?.toString?.(),
        name: k.name,
        permissions: k.permissions,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
      }));
    }
    return obj;
  }

  async delete(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
  ): Promise<UserDocument | null> {
    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;

    return this.userModel.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).exec();
  }

  async resetPassword(userId: string, newPassword: string): Promise<UserDocument | null> {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { passwordHash } },
      { new: true },
    ).exec();
  }

  /** Admin: Disable 2FA for a user */
  async disable2FAForUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { twoFactorSecret: undefined, twoFactorEnabled: false } },
      { new: true },
    ).exec();
  }

  /** Admin: Reset 2FA for a user (clears secret and disables) */
  async reset2FAForUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { twoFactorSecret: undefined, twoFactorEnabled: false } },
      { new: true },
    ).exec();
  }
}
