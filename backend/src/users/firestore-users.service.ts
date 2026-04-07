import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

const FIREBASE_NOT_CONFIGURED =
  'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env to use admin and Firestore features.';

const USERS_COLLECTION = 'users';

export interface FirestoreUser {
  id: string; // Firebase UID (document id)
  _id?: string; // same as id for compatibility
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  kycStatus?: string;
  kycReason?: string;
  kycDocumentType?: string;
  kycDocumentNumber?: string;
  kycDocumentUrl?: string;
  kycSubmittedAt?: Date;
  isEmailVerified?: boolean;
  isActive?: boolean;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  apiKeys?: Array<{
    id?: string;
    name: string;
    keyHash: string;
    permissions: string[];
    createdAt: Date;
    lastUsed: Date | null;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class FirestoreUsersService {
  constructor(private configService: ConfigService) { }

  /** Lazy access so Firebase can be initialized after UsersModule (e.g. in reset-admin script). */
  private getFirestore(): Firestore {
    if (!admin.apps.length) {
      throw new ServiceUnavailableException(FIREBASE_NOT_CONFIGURED);
    }
    return admin.firestore();
  }

  private col() {
    return this.getFirestore().collection(USERS_COLLECTION);
  }

  private docToUser(id: string, data: FirebaseFirestore.DocumentData): FirestoreUser {
    const d = data || {};
    return {
      id,
      _id: id as any, // compatibility for admin (userId = user._id || user.id)
      email: d.email || '',
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      role: d.role || 'user',
      kycStatus: d.kycStatus,
      kycReason: d.kycReason,
      kycDocumentType: d.kycDocumentType,
      kycDocumentNumber: d.kycDocumentNumber,
      kycDocumentUrl: d.kycDocumentUrl,
      kycSubmittedAt: d.kycSubmittedAt?.toDate?.() || d.kycSubmittedAt,
      isEmailVerified: d.isEmailVerified !== false,
      isActive: d.isActive !== false,
      twoFactorSecret: d.twoFactorSecret,
      twoFactorEnabled: d.twoFactorEnabled === true,
      apiKeys: (d.apiKeys || []).map((k: any, i: number) => ({
        id: k.id || String(i),
        name: k.name,
        keyHash: k.keyHash,
        permissions: k.permissions || [],
        createdAt: k.createdAt?.toDate?.() || k.createdAt,
        lastUsed: k.lastUsed?.toDate?.() ?? k.lastUsed ?? null,
      })),
      createdAt: d.createdAt?.toDate?.() || d.createdAt,
      updatedAt: d.updatedAt?.toDate?.() || d.updatedAt,
    };
  }

  private toFirestore(data: Partial<FirestoreUser>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (data.email !== undefined) {
      out.email = data.email;
      out.emailLower = (data.email || '').toLowerCase();
    }
    if (data.firstName !== undefined) out.firstName = data.firstName;
    if (data.lastName !== undefined) out.lastName = data.lastName;
    if (data.role !== undefined) out.role = data.role;
    if (data.kycStatus !== undefined) out.kycStatus = data.kycStatus;
    if (data.kycReason !== undefined) out.kycReason = data.kycReason;
    if (data.kycDocumentType !== undefined) out.kycDocumentType = data.kycDocumentType;
    if (data.kycDocumentNumber !== undefined) out.kycDocumentNumber = data.kycDocumentNumber;
    if (data.kycDocumentUrl !== undefined) out.kycDocumentUrl = data.kycDocumentUrl;
    if (data.kycSubmittedAt !== undefined) out.kycSubmittedAt = data.kycSubmittedAt;
    if (data.isEmailVerified !== undefined) out.isEmailVerified = data.isEmailVerified;
    if (data.isActive !== undefined) out.isActive = data.isActive;
    if ('twoFactorSecret' in data) {
      out.twoFactorSecret = data.twoFactorSecret == null
        ? admin.firestore.FieldValue.delete()
        : data.twoFactorSecret;
    }
    if (data.twoFactorEnabled !== undefined) out.twoFactorEnabled = data.twoFactorEnabled;
    if (data.apiKeys !== undefined) out.apiKeys = data.apiKeys;
    out.updatedAt = new Date();
    return out;
  }

  async create(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified?: boolean;
    isActive?: boolean;
    id?: string; // Firebase UID
  }): Promise<FirestoreUser> {
    const uid = data.id;
    if (!uid) throw new Error('User id (Firebase UID) is required');
    const now = new Date();
    const doc: Record<string, unknown> = {
      email: data.email,
      emailLower: (data.email || '').toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isEmailVerified: data.isEmailVerified !== false,
      isActive: data.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    await this.col().doc(uid).set(doc);
    return this.docToUser(uid, doc);
  }

  async findOneByFirebaseUid(uid: string): Promise<FirestoreUser | null> {
    const snap = await this.col().doc(uid).get();
    if (!snap.exists) return null;
    return this.docToUser(uid, snap.data()!);
  }

  async findOneByEmail(email: string): Promise<FirestoreUser | null> {
    const emailLower = (email || '').toLowerCase();
    // Prefer case-insensitive lookup (emailLower) for reset-admin and allowlist
    let snap = await this.col().where('emailLower', '==', emailLower).limit(1).get();
    if (snap.empty) {
      snap = await this.col().where('email', '==', email).limit(1).get();
    }
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return this.docToUser(doc.id, doc.data());
  }

  async findById(id: string): Promise<FirestoreUser | null> {
    return this.findOneByFirebaseUid(id);
  }

  /** Total user count for admin overview (avoids loading all users). Uses count() when available, else fallback. */
  async getCount(): Promise<number> {
    const coll = this.col();
    try {
      if (typeof (coll as any).count === 'function') {
        const countSnap = await (coll as any).count().get();
        return (countSnap as any).data?.()?.count ?? 0;
      }
    } catch {
      // count() not available or failed (e.g. older SDK)
    }
    try {
      const snap = await coll.limit(10000).get();
      return snap.size;
    } catch {
      return 0;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ data: FirestoreUser[]; total: number; page: number; limit: number; totalPages: number }> {
    let total = 0;
    const coll = this.col();
    let countUsed = false;
    try {
      if (typeof (coll as any).count === 'function') {
        const countSnap = await (coll as any).count().get();
        total = (countSnap as any).data?.()?.count ?? 0;
        countUsed = true;
      }
    } catch {
      // count() not available or failed
    }
    if (!countUsed) {
      try {
        const snap = await coll.limit(10000).get();
        total = snap.size;
      } catch {
        total = 0;
      }
    }
    const query = this.col().orderBy(sortBy, sortOrder).limit(limit).offset((page - 1) * limit);
    const snap = await query.get();
    const data = snap.docs.map((d) => this.docToUser(d.id, d.data()));
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateStatus(userId: string, isActive: boolean): Promise<FirestoreUser | null> {
    const ref = this.col().doc(userId);
    await ref.update(this.toFirestore({ isActive }));
    const snap = await ref.get();
    if (!snap.exists) return null;
    return this.docToUser(userId, snap.data()!);
  }

  async updateKycStatus(userId: string, kycStatus: string, kycReason?: string): Promise<FirestoreUser | null> {
    const ref = this.col().doc(userId);
    await ref.update(this.toFirestore({ kycStatus, kycReason }));
    const snap = await ref.get();
    if (!snap.exists) return null;
    return this.docToUser(userId, snap.data()!);
  }

  async getProfile(userId: string): Promise<Record<string, unknown> | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    const { twoFactorSecret, ...rest } = user;
    return {
      ...rest,
      twoFactorEnabled: user.twoFactorEnabled,
      apiKeys: (user.apiKeys || []).map((k) => ({
        id: k.id,
        name: k.name,
        permissions: k.permissions,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
      })),
    };
  }

  async delete(userId: string): Promise<void> {
    await this.col().doc(userId).delete();
  }

  async updateProfile(
    userId: string,
    updates: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ): Promise<FirestoreUser | null> {
    const ref = this.col().doc(userId);
    const up = this.toFirestore(updates);
    await ref.update(up);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return this.docToUser(userId, snap.data()!);
  }

  async updateUserDoc(userId: string, updates: Partial<FirestoreUser>): Promise<FirestoreUser | null> {
    const ref = this.col().doc(userId);
    await ref.update(this.toFirestore(updates));
    const snap = await ref.get();
    if (!snap.exists) return null;
    return this.docToUser(userId, snap.data()!);
  }

  async setRoleByEmail(email: string, role: string): Promise<FirestoreUser | null> {
    const user = await this.findOneByEmail(email);
    if (!user) return null;
    await this.updateUserDoc(user.id, { role, email: user.email });
    return this.findById(user.id);
  }

  async removeApiKey(userId: string, keyId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user || !user.apiKeys) return;
    const keys = user.apiKeys.filter((k) => (k.id || '') !== keyId);
    await this.col().doc(userId).update(this.toFirestore({ apiKeys: keys }));
  }

  async resetPassword(userId: string, newPassword: string): Promise<FirestoreUser | null> {
    if (!admin.apps.length) {
      throw new ServiceUnavailableException(FIREBASE_NOT_CONFIGURED);
    }
    await admin.auth().updateUser(userId, { password: newPassword });
    return this.findById(userId);
  }

  async disable2FAForUser(userId: string): Promise<FirestoreUser | null> {
    return this.updateUserDoc(userId, { twoFactorSecret: undefined, twoFactorEnabled: false });
  }

  async reset2FAForUser(userId: string): Promise<FirestoreUser | null> {
    return this.disable2FAForUser(userId);
  }

  async findByIdWithPassword(id: string): Promise<FirestoreUser | null> {
    return this.findById(id);
  }

  async findByIdWith2FA(id: string): Promise<FirestoreUser | null> {
    return this.findById(id);
  }
}
