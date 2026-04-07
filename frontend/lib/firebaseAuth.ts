import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
  UserCredential,
  onAuthStateChanged,
  AuthError,
  GoogleAuthProvider,
  OAuthProvider,
  ConfirmationResult,
  type ActionCodeSettings,
} from 'firebase/auth';
import { auth, isFirebaseConfigMissing } from './firebase';

export interface FirebaseAuthError {
  code: string;
  message: string;
}

/**
 * Firebase Authentication Service
 * Handles all Firebase auth operations
 */
export class FirebaseAuthService {
  /**
   * Sign up a new user with email and password
   */
  static async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update user profile with display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }

      // Send email verification
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
      }

      return userCredential;
    } catch (error: any) {
      const authError = error as AuthError;
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Sign in an existing user with email and password
   */
  static async signIn(
    email: string,
    password: string
  ): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential;
    } catch (error: any) {
      const authError = error as AuthError;
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Sign out the current user
   */
  static async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      const authError = error as AuthError;
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Send password reset email (Firebase). Uses continue URL back to /login after reset when in browser.
   */
  static async resetPassword(email: string): Promise<void> {
    if (isFirebaseConfigMissing()) {
      this.throwAsAuthError({
        code: 'auth/configuration-error',
        message: 'Sign-in is not configured.',
      } as AuthError);
    }
    const trimmed = email.trim();
    if (!trimmed) {
      this.throwAsAuthError({
        code: 'auth/invalid-email',
        message: 'Enter a valid email address.',
      } as AuthError);
    }
    try {
      if (typeof window !== 'undefined') {
        try {
          const settings: ActionCodeSettings = {
            url: `${window.location.origin}/login`,
            handleCodeInApp: false,
          };
          await sendPasswordResetEmail(auth, trimmed, settings);
          return;
        } catch (e: any) {
          const c = e?.code || '';
          if (
            c !== 'auth/unauthorized-continue-uri' &&
            c !== 'auth/invalid-continue-uri'
          ) {
            throw e;
          }
          // Continue URL not allowed — still send reset using Firebase default handler.
        }
      }
      await sendPasswordResetEmail(auth, trimmed);
    } catch (error: any) {
      this.throwAsAuthError(error as AuthError);
    }
  }

  /**
   * Get the current authenticated user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Sign in with Google using popup
   */
  static async signInWithGoogle(): Promise<UserCredential> {
    if (isFirebaseConfigMissing()) {
      this.throwAsAuthError({
        code: 'auth/configuration-error',
        message: 'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.example).',
      } as AuthError);
    }
    try {
      if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') console.log('[auth] Initiating Google sign-in popup...');
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      // Set custom parameters if needed
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Use popup for better reliability across modern browsers with strict ITP
      return await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google sign-in popup error:', error);
      this.throwAsAuthError(error as AuthError);
    }
  }

  /**
   * Sign in with Apple using popup
   */
  static async signInWithApple(): Promise<UserCredential> {
    if (isFirebaseConfigMissing()) {
      this.throwAsAuthError({
        code: 'auth/configuration-error',
        message: 'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.example).',
      } as AuthError);
    }
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      // Use popup for better reliability
      return await signInWithPopup(auth, provider);
    } catch (error: any) {
      const authError = error as AuthError;
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Get the result of a redirect-based sign-in
   * Call this after the page redirects back from OAuth provider
   */
  static async getRedirectResult(): Promise<UserCredential | null> {
    try {
      const result = await getRedirectResult(auth);
      return result;
    } catch (error: any) {
      console.error('Error getting redirect result:', error);

      // Handle specific sessionStorage error
      if (error?.code === 'auth/argument-error' ||
        error?.message?.includes('missing initial state') ||
        error?.message?.includes('sessionStorage')) {
        if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') console.warn('[auth] SessionStorage error - checking auth state instead');
        // Don't throw - return null and let the caller check auth state
        // This handles cases where sessionStorage is blocked but auth succeeded
        return null;
      }

      const authError = error as AuthError;
      console.error('Formatted redirect error:', authError);
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Sign in with Phone Number
   * Returns a ConfirmationResult that needs to be confirmed with the SMS code
   */
  static async signInWithPhone(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    } catch (error: any) {
      const authError = error as AuthError;
      this.throwAsAuthError(authError);
    }
  }

  /**
   * Create Recaptcha Verifier for phone authentication
   */
  static createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber to be called
      },
    });
  }

  /**
   * Subscribe to auth state changes
   */
  static onAuthStateChange(
    callback: (user: User | null) => void
  ): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Throw an Error with .code so catch blocks and console show a proper message (plain objects often log as {}).
   */
  private static throwAsAuthError(error: AuthError): never {
    const f = this.formatError(error);
    const err = new Error(f.message) as Error & { code: string };
    err.code = f.code;
    throw err;
  }

  /**
   * Format Firebase auth errors to user-friendly messages
   */
  private static formatError(error: AuthError): FirebaseAuthError {
    const rawCode = (error as AuthError)?.code || '';
    let message = 'An error occurred during authentication.';

    switch (rawCode) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address. Please check and try again.';
        break;
      case 'auth/operation-not-allowed':
        message = 'This sign-in method (Google or Apple) is not enabled. Enable it in Firebase Console under Authentication > Sign-in method.';
        break;
      case 'auth/configuration-not-found':
        message =
          'Sign-in provider is not configured in Firebase. Open Firebase Console → Authentication → Sign-in method, click Get started if needed, then enable Google (and Apple if you use it). Save, wait a minute, and try again.';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak. Please use at least 6 characters.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email. Please sign up first.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection and try again.';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid email or password. Please try again.';
        break;
      case 'auth/unauthorized-domain':
        message = 'This domain is not authorized for OAuth. Please contact support or use localhost.';
        break;
      case 'auth/unauthorized-continue-uri':
        message =
          'Password reset link domain is not authorized. In Firebase Console → Authentication → Settings, add this site to Authorized domains.';
        break;
      case 'auth/operation-not-supported-in-this-environment':
        message = 'Google sign-in is not supported in this environment. Please use a different browser or device.';
        break;
      case 'auth/popup-blocked':
        message = 'Popup was blocked. Please allow popups for this site and try again.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in popup was closed. Please try again.';
        break;
      case 'auth/cancelled-popup-request':
        message = 'Only one popup request is allowed at a time. Please wait and try again.';
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'An account already exists with this email using a different sign-in method. Please use that method instead.';
        break;
      case 'auth/credential-already-in-use':
        message = 'This credential is already associated with a different account.';
        break;
      case 'auth/invalid-action-code':
        message = 'The action code is invalid or has expired.';
        break;
      case 'auth/invalid-verification-code':
        message = 'The verification code is invalid.';
        break;
      case 'auth/invalid-verification-id':
        message = 'The verification ID is invalid.';
        break;
      case 'auth/missing-verification-code':
        message = 'The verification code is missing.';
        break;
      case 'auth/missing-verification-id':
        message = 'The verification ID is missing.';
        break;
      case 'auth/quota-exceeded':
        message = 'The quota for this operation has been exceeded. Please try again later.';
        break;
      case 'auth/requires-recent-login':
        message = 'This operation requires recent authentication. Please sign out and sign in again.';
        break;
      case 'auth/argument-error':
        if (error.message?.includes('missing initial state') || error.message?.includes('sessionStorage')) {
          message = 'Browser storage issue detected. Please try again or check your browser privacy settings.';
        } else {
          message = error.message || message;
        }
        break;
      case 'auth/configuration-error':
        message = error.message || 'Firebase is not configured.';
        break;
      default:
        message = error.message || message;
        // Log unknown error codes for debugging
        if (rawCode && !rawCode.startsWith('auth/')) {
          console.warn('Unknown Firebase error code:', rawCode);
        }
    }

    return {
      code: rawCode || 'auth/unknown',
      message,
    };
  }
}
