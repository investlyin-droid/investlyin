import { Injectable, UnauthorizedException, ServiceUnavailableException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { existsSync } from 'fs';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length === 0) {
      try {
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || 'exchange-f2346';

        // 1) Explicit path to service account JSON file
        const serviceAccountPath =
          this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
          this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
        if (serviceAccountPath) {
          const cwd = process.cwd();
          const candidates = [
            path.resolve(serviceAccountPath),
            path.resolve(cwd, serviceAccountPath),
            path.resolve(cwd, 'backend', serviceAccountPath),
          ].filter((p, i, arr) => arr.indexOf(p) === i);
          for (const resolved of candidates) {
            if (existsSync(resolved)) {
              const serviceAccount = require(resolved);
              this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || projectId,
              });
              console.log('Firebase Admin initialized with service account file');
              return;
            }
          }
        }

        // 2) Service account JSON as string (env var): raw JSON or Base64 (avoids .env quote issues)
        const serviceAccountJson =
          this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON') ||
          this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
        if (serviceAccountJson?.trim()) {
          try {
            let jsonStr = serviceAccountJson.trim();
            if (jsonStr.startsWith('eyJ')) {
              jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
            }
            const serviceAccount = JSON.parse(jsonStr);
            if (serviceAccount?.client_email && serviceAccount?.private_key) {
              this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || projectId,
              });
              console.log('Firebase Admin initialized with service account JSON');
              return;
            }
            console.warn('Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON missing client_email or private_key');
          } catch (e) {
            console.warn('Firebase Admin: FIREBASE_SERVICE_ACCOUNT_JSON invalid (parse error). Check backend .env.');
          }
        }

        // 3) Application Default Credentials only in production (GCP: Cloud Run, GCE)
        // Skip locally to avoid "Could not load the default credentials" when not on GCP
        if (this.configService.get<string>('NODE_ENV') === 'production') {
          try {
            this.firebaseApp = admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId,
            });
            console.log('Firebase Admin initialized with Application Default Credentials');
            return;
          } catch {
            // ADC not available, fall through
          }
        }

        // 4) No valid credentials: do not initialize (avoids 500 on first request)
        console.warn(
          'Firebase Admin: No service account found. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in backend .env. Login will return 503 until configured.',
        );
        this.firebaseApp = null;
      } catch (error: any) {
        console.error('Firebase Admin initialization error:', error.message);
      }
    } else {
      this.firebaseApp = admin.apps[0];
    }
  }

  isInitialized(): boolean {
    return this.firebaseApp != null;
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new ServiceUnavailableException(
        'Firebase is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to backend .env (see .env.example).',
      );
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error: any) {
      // Do not log idToken or decoded payload – security
      if (error?.message?.includes('default credentials') || error?.message?.includes('Could not load')) {
        throw new ServiceUnavailableException(
          'Firebase is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to backend .env.',
        );
      }
      const msg =
        error.code === 'auth/id-token-expired'
          ? 'Session expired. Please sign in again.'
          : error.code === 'auth/argument-error'
            ? 'Invalid token.'
            : 'Invalid or expired Firebase token.';
      throw new UnauthorizedException(msg);
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
    if (!this.firebaseApp) {
      return null;
    }

    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  /** Get Firebase Auth user by email (e.g. to bootstrap Firestore from Auth). */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    if (!this.firebaseApp) {
      return null;
    }
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }
}
