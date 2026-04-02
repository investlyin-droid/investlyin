'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { FirebaseAuthService } from '@/lib/firebaseAuth';
import { authDebugLog, authDebugWarn } from '@/lib/authDebug';
import { User as FirebaseUser } from 'firebase/auth';

import { AUTH_COOKIE_NAME, setAuthCookie as setAuthCookieLib, clearAuthCookie as clearAuthCookieLib } from '@/lib/authCookie';

const AUTH_COOKIE = AUTH_COOKIE_NAME;

/** Resolve redirect path: use ?from= if valid, else dashboard/admin by role (admin only if adminAccessAllowed) */
function getRedirectPath(userRole: string, adminAccessAllowed?: boolean): string {
  if (typeof window === 'undefined') return '/dashboard';
  const from = new URLSearchParams(window.location.search).get('from');
  if (from && from.startsWith('/') && !from.startsWith('//')) return from;
  if (userRole === 'admin' || userRole === 'super_admin') {
    if (adminAccessAllowed === false) return '/dashboard';
    return '/admin';
  }
  return '/dashboard';
}

/** Get display name from Firebase user; Apple often provides it only in providerData on first sign-in. */
function getOAuthDisplayName(user: { displayName?: string | null; providerData?: Array<{ displayName?: string | null }> }): string {
  if (user.displayName) return user.displayName;
  const p = user.providerData?.[0] as { displayName?: string } | undefined;
  return p?.displayName ?? '';
}

/** Wait for Firebase to restore user after OAuth redirect (getRedirectResult often returns null) */
function waitForFirebaseUser(timeoutMs: number = 5000): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsub = FirebaseAuthService.onAuthStateChange((user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
    setTimeout(() => {
      unsub();
      resolve(FirebaseAuthService.getCurrentUser());
    }, timeoutMs);
  });
}

/** Perform redirect after auth - ensure cookie is written then navigate */
function redirectAfterAuth(path: string) {
  if (typeof window === 'undefined') return;
  // Delay so cookie/localStorage are committed before navigation (middleware checks cookie)
  setTimeout(() => {
    window.location.replace(path);
  }, 200);
}

function setAuthCookie(token: string) {
  setAuthCookieLib(token);
}

function clearAuthCookie() {
  clearAuthCookieLib();
}

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  /** When true, user can access admin panel (only set when role is admin and email is in backend allowlist) */
  adminAccessAllowed?: boolean;
}

export interface LoginResult {
  requiresTwoFactor?: boolean;
  tempToken?: string;
  message?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  handleRedirectResult: () => Promise<{ user?: User } | null>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  register: (data: any) => Promise<{ user?: User }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(false);

  const persistAuth = (accessToken: string, userData: User) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setAuthCookie(accessToken);
  };

  useEffect(() => {
    // Check for stored backend auth first
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setAuthCookie(storedToken);
      setIsLoading(false);
      return;
    }

    // Listen to Firebase auth state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChange(
      async (firebaseUser: FirebaseUser | null) => {
        // Skip if we're handling a redirect (to avoid duplicate processing)
        // Use a ref or check localStorage to avoid stale closure
        const currentlyHandlingRedirect = localStorage.getItem('handling_redirect') === 'true';
        if (currentlyHandlingRedirect) {
          authDebugLog('Skipping onAuthStateChange - redirect is being handled');
          setIsLoading(false);
          return;
        }
        
        if (firebaseUser) {
          // User is signed in with Firebase
          // Check if we're on login/register page and should redirect
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const isOnAuthPage = currentPath === '/login' || currentPath === '/register';
          
          // Only sync if we don't already have a token (avoid duplicate calls)
          const existingToken = localStorage.getItem('token');
          if (existingToken && !isOnAuthPage) {
            authDebugLog('User already authenticated, skipping sync');
            setIsLoading(false);
            return;
          }
          
          // If on auth page and user is authenticated, we should redirect
          if (isOnAuthPage && existingToken) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const userData = JSON.parse(storedUser);
                redirectAfterAuth(getRedirectPath(userData.role, userData.adminAccessAllowed));
                setIsLoading(false);
                return;
              } catch (e) {
                console.error('Error parsing stored user:', e);
              }
            }
          }

          // Sync with backend to get/create user profile
          try {
            const idToken = await firebaseUser.getIdToken();
            
            // Try to get user from backend using Firebase token
            // If user doesn't exist, create them
            try {
              const oauthDisplayName = getOAuthDisplayName(firebaseUser);
              const response = await api.post<any>('/auth/firebase-login', {
                firebaseToken: idToken,
                email: firebaseUser.email ?? undefined,
                displayName: oauthDisplayName || undefined,
              });

              if (response.access_token && response.user) {
                const nameParts = (oauthDisplayName || '').split(' ');
                const userData: User = {
                  id: response.user.id || response.user._id || firebaseUser.uid,
                  email: response.user.email || firebaseUser.email || '',
                  role: response.user.role || 'user',
                  firstName: response.user.firstName || nameParts[0] || '',
                  lastName: response.user.lastName || nameParts.slice(1).join(' ') || '',
                  adminAccessAllowed: response.user.adminAccessAllowed,
                };
                persistAuth(response.access_token, userData);
                
                // If we're on login/register page and just authenticated, redirect
                // But only if we're not already handling an OAuth redirect
                if (typeof window !== 'undefined') {
                  const currentPath = window.location.pathname;
                  const isHandlingOAuth = localStorage.getItem('handling_redirect') === 'true';
                  
                  if ((currentPath === '/login' || currentPath === '/register') && !isHandlingOAuth) {
                    redirectAfterAuth(getRedirectPath(userData.role, userData.adminAccessAllowed));
                  }
                }
              }
            } catch (backendError: any) {
              // Backend sync required: API uses backend JWT, not Firebase token. Do not persist Firebase token.
              authDebugWarn('Backend sync failed in onAuthStateChange:', backendError?.message);
            }
          } catch (error) {
            authDebugWarn('Error syncing Firebase user with backend:', error);
          }
        } else {
          // User is signed out
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          clearAuthCookie();
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      // Use Firebase authentication for all users (including admins)
      const firebaseCredential = await FirebaseAuthService.signIn(email, password);
      const firebaseUser = firebaseCredential.user;
      const idToken = await firebaseUser.getIdToken();

      // Get user's custom claims or check backend for role
      // Firebase custom claims can be set by admin in Firebase Console
      const tokenResult = await firebaseUser.getIdTokenResult();
      const customClaims = tokenResult.claims;
      
      // Try to sync with backend to get user profile and role
      try {
        const response = await api.post<any>('/auth/firebase-login', {
          firebaseToken: idToken,
          email: firebaseUser.email ?? undefined,
          displayName: getOAuthDisplayName(firebaseUser) || undefined,
        });

        if (response.requiresTwoFactor && response.tempToken) {
          return {
            requiresTwoFactor: true,
            tempToken: response.tempToken,
            message: response.message,
          };
        }

        if (response.access_token && response.user) {
          const userData: User = {
            id: response.user.id || response.user._id || firebaseUser.uid,
            email: response.user.email || firebaseUser.email || '',
            // Use role from backend, or from Firebase custom claims, or default to 'user'
            role: response.user.role || (customClaims?.role as string) || 'user',
            firstName: response.user.firstName || (getOAuthDisplayName(firebaseUser).split(' ')[0]) || '',
            lastName: response.user.lastName || (getOAuthDisplayName(firebaseUser).split(' ').slice(1).join(' ')) || '',
            adminAccessAllowed: response.user.adminAccessAllowed,
          };
          persistAuth(response.access_token, userData);
          return { user: userData };
        }
      } catch (backendError: any) {
        // Backend must be available: API expects backend JWT, not Firebase token.
        const msg = backendError?.response?.data?.message || backendError?.message || 'Server unavailable';
        throw new Error(msg || 'Could not connect to server. Please ensure the backend is running and try again.');
      }

      throw new Error('Authentication completed but user data could not be retrieved');
    } catch (error: any) {
      let errorMessage = 'Authentication failed. Please check your credentials.';
      
      if (error?.code) {
        // Firebase error
        errorMessage = error.message || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      const formattedError = new Error(errorMessage);
      if (error?.status) {
        (formattedError as any).status = error.status;
      }
      throw formattedError;
    }
  };

  const verify2FA = async (tempToken: string, code: string) => {
    const response = await api.post<{ access_token: string; user: User }>(
      '/auth/verify-2fa',
      { tempToken, code },
    );
    if (response.access_token && response.user) {
      persistAuth(response.access_token, response.user);
    }
  };

  const register = async (data: any): Promise<{ user?: User }> => {
    try {
      // Prevent admin signup - admin accounts must be created manually in Firebase
      const emailLower = (data.email || '').toLowerCase();
      
      // Check if trying to register with admin-like email (optional additional check)
      // Note: This is just a frontend check. Real admin role is controlled by Firebase custom claims
      if (emailLower.includes('admin') && (emailLower.includes('@admin') || emailLower.includes('admin@'))) {
        throw new Error('Admin accounts cannot be created through registration. Please contact support.');
      }

      // Create user in Firebase (always as regular user)
      const displayName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      const firebaseCredential = await FirebaseAuthService.signUp(
        data.email,
        data.password,
        displayName || undefined
      );
      const firebaseUser = firebaseCredential.user;
      const idToken = await firebaseUser.getIdToken();

      // Sync with backend (backend should also enforce user role only)
      try {
        const response = await api.post<{ access_token: string; user: User }>(
          '/auth/firebase-register',
          {
            firebaseToken: idToken,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: displayName,
            role: 'user', // Explicitly set role to 'user' - never allow admin during registration
          },
        );
        
        if (response.access_token && response.user) {
          // Ensure role is 'user' even if backend returns something else
          const userData = {
            ...response.user,
            role: 'user', // Force user role - admin must be set manually in Firebase
          };
          persistAuth(response.access_token, userData);
          return { user: userData };
        }
      } catch (backendError: any) {
        // Backend must complete registration so we get a JWT; do not fall back to Firebase token.
        const msg = backendError?.response?.data?.message || backendError?.message || 'Server unavailable';
        throw new Error(msg || 'Could not complete registration. Please ensure the backend is running and try again.');
      }

      throw new Error('Registration completed but user data could not be retrieved');
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please check your details.';
      
      if (error?.code) {
        // Firebase error
        errorMessage = error.message || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(errorMessage);
    }
  };

  const loginWithProvider = async (provider: 'google' | 'apple'): Promise<void> => {
    try {
      authDebugLog(`Initiating ${provider} sign-in...`);
      // Use redirect-based OAuth to avoid Cross-Origin-Opener-Policy issues
      switch (provider) {
        case 'google':
          await FirebaseAuthService.signInWithGoogle();
          break;
        case 'apple':
          await FirebaseAuthService.signInWithApple();
          break;
        default:
          throw new Error('Unsupported provider');
      }
      // Note: This function will redirect the page, so it won't return normally
      // The redirect result should be handled via handleRedirectResult()
    } catch (error: any) {
      console.error(`${provider} sign-in error:`, error);
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error?.code) {
        errorMessage = error.message || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Provide more specific error messages
      if (error?.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for OAuth. Please ensure your domain is added to Firebase authorized domains, or use localhost for local development.';
      } else if (error?.code === 'auth/operation-not-allowed') {
        errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not enabled in Firebase. Please enable it in Firebase Console under Authentication > Sign-in method.`;
      } else if (error?.code === 'auth/configuration-not-found') {
        errorMessage =
          'Firebase Auth is not set up for this app: open Firebase Console → Authentication → Sign-in method, enable Google (and Apple if needed), then save. If you just created the project, click “Get started” on Authentication first.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleRedirectResult = useCallback(async (): Promise<{ user?: User } | null> => {
    try {
      setIsHandlingRedirect(true);
      // Set a flag in localStorage to prevent onAuthStateChange from interfering
      localStorage.setItem('handling_redirect', 'true');
      
      // Check if we're coming from an OAuth redirect by checking URL parameters
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const hasOAuthParams = urlParams && (urlParams.has('code') || urlParams.has('state') || urlParams.has('authuser'));
      
      authDebugLog('Checking for OAuth redirect result...', { hasOAuthParams });
      
      let result: any = null;
      try {
        result = await FirebaseAuthService.getRedirectResult();
      } catch (redirectError: any) {
        // If sessionStorage error, check auth state instead
        if (redirectError?.message?.includes('missing initial state') || 
            redirectError?.message?.includes('sessionStorage') ||
            redirectError?.code === 'auth/argument-error') {
          authDebugWarn('SessionStorage error - checking auth state instead');
          result = null; // Will fall through to auth state check
        } else {
          throw redirectError;
        }
      }
      
      if (!result) {
        authDebugLog('No redirect result - waiting for Firebase auth state...');
        const isAuthPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/register');
        const justCameFromOAuth = hasOAuthParams;
        // On auth pages, always poll for Firebase user (OAuth redirect often has no URL params)
        const waitTime = (justCameFromOAuth || isAuthPage) ? 5000 : 500;
        const currentFirebaseUser = (justCameFromOAuth || isAuthPage)
          ? await waitForFirebaseUser(waitTime)
          : (await new Promise((r) => setTimeout(r, 300)), FirebaseAuthService.getCurrentUser());

        if (currentFirebaseUser) {
          authDebugLog('User authenticated via Firebase, syncing and redirecting...');
          const idToken = await currentFirebaseUser.getIdToken();
          const tokenResult = await currentFirebaseUser.getIdTokenResult();
          const customClaims = tokenResult.claims;
          const role = (customClaims?.role as string) || 'user';
          const displayName = getOAuthDisplayName(currentFirebaseUser);
          const nameParts = displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          try {
            const response = await api.post<any>('/auth/firebase-login', {
              firebaseToken: idToken,
              email: currentFirebaseUser.email ?? undefined,
              displayName: displayName || undefined,
            });
            if (response.access_token && response.user) {
              const userData: User = {
                id: response.user.id || response.user._id || currentFirebaseUser.uid,
                email: response.user.email || currentFirebaseUser.email || '',
                role: response.user.role || role,
                firstName: response.user.firstName || firstName,
                lastName: response.user.lastName || lastName,
                adminAccessAllowed: response.user.adminAccessAllowed,
              };
              persistAuth(response.access_token, userData);
              setIsHandlingRedirect(false);
              localStorage.removeItem('handling_redirect');
              redirectAfterAuth(getRedirectPath(userData.role, userData.adminAccessAllowed));
              return { user: userData };
            }
          } catch (backendError: any) {
            authDebugWarn('Backend sync failed after OAuth:', backendError?.message);
            setIsHandlingRedirect(false);
            localStorage.removeItem('handling_redirect');
            throw new Error(backendError?.response?.data?.message || backendError?.message || 'Could not connect to server. Please try again.');
          }
        }

        authDebugLog('No redirect result and no authenticated user');
        setIsHandlingRedirect(false);
        localStorage.removeItem('handling_redirect');
        return null;
      }

      authDebugLog('OAuth redirect result detected:', {
        email: result.user?.email,
        displayName: result.user?.displayName,
        providerId: result.providerId,
        operationType: result.operationType
      });

      const firebaseUser = result.user;
      if (!firebaseUser) {
        throw new Error('Firebase user not found in redirect result');
      }

      const idToken = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      const customClaims = tokenResult.claims;
      const role = (customClaims?.role as string) || 'user';

      const displayName = getOAuthDisplayName(firebaseUser);
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      try {
        authDebugLog('Syncing with backend...');
        const response = await api.post<any>('/auth/firebase-login', {
          firebaseToken: idToken,
          email: firebaseUser.email ?? undefined,
          displayName: displayName || undefined,
        });

        if (response.access_token && response.user) {
          const userData: User = {
            id: response.user.id || response.user._id || firebaseUser.uid,
            email: response.user.email || firebaseUser.email || '',
            role: response.user.role || role,
            firstName: response.user.firstName || firstName,
            lastName: response.user.lastName || lastName,
            adminAccessAllowed: response.user.adminAccessAllowed,
          };
          persistAuth(response.access_token, userData);
          setIsHandlingRedirect(false);
          localStorage.removeItem('handling_redirect');
          redirectAfterAuth(getRedirectPath(userData.role, userData.adminAccessAllowed));
          return { user: userData };
        }
      } catch (backendError: any) {
        authDebugWarn('Backend sync failed after OAuth:', backendError?.message);
        setIsHandlingRedirect(false);
        localStorage.removeItem('handling_redirect');
        throw new Error(backendError?.response?.data?.message || backendError?.message || 'Could not connect to server. Please try again.');
      }

      setIsHandlingRedirect(false);
      localStorage.removeItem('handling_redirect');
      throw new Error('Authentication completed but user data could not be retrieved');
    } catch (error: any) {
      setIsHandlingRedirect(false);
      localStorage.removeItem('handling_redirect');
      
      // If it's a "no redirect result" case, return null silently
      if (error?.code === 'auth/no-auth-event' || 
          error?.message?.includes('no-auth-event') ||
          error?.code === 'auth/popup-closed-by-user' ||
          error?.message?.includes('null')) {
        authDebugLog('No auth event detected (normal if not coming from redirect)');
        return null;
      }
      
      let errorMessage = 'Authentication failed. Please try again.';
      if (error?.code) {
        errorMessage = error.message || errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      authDebugWarn('OAuth redirect result error:', error?.message || errorMessage);
      throw new Error(errorMessage);
    }
  }, [router]);

  // Handle OAuth redirect when user lands on ANY page (e.g. / after Google redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasOAuthParams = params.has('code') || params.has('state') || params.has('authuser');
    const isRootPath = window.location.pathname === '/';
    if (!hasOAuthParams && !isRootPath) return;
    let cancelled = false;
    handleRedirectResult()
      .then(() => { /* redirect already done inside handleRedirectResult */ })
      .catch(() => { /* already logged in handleRedirectResult */ });
    return () => { cancelled = true; };
  }, [handleRedirectResult]);

  const logout = useCallback(async () => {
    // Clear local state and cookie first so middleware sees unauthenticated on next load
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearAuthCookie();
    // Sign out from Firebase (may fail if not configured or already signed out)
    try {
      await FirebaseAuthService.signOutUser();
    } catch (error) {
      authDebugWarn('Firebase sign out error:', error);
    }
    // Full navigation so middleware and server see cleared cookie
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.push('/login');
    }
  }, [router]);

  // Register logout callback for 401 errors
  useEffect(() => {
    api.setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, login, loginWithProvider, handleRedirectResult, verify2FA, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
