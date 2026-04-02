'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseAuthService } from '@/lib/firebaseAuth';
import { isFirebaseConfigMissing } from '@/lib/firebase';
import { authDebugLog } from '@/lib/authDebug';
import { setAuthCookie } from '@/lib/authCookie';
import { api } from '@/lib/api';
import Link from 'next/link';

function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tempToken, setTempToken] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const searchParams = useSearchParams();
    const returnTo = searchParams?.get('from') || '';
    const { login, loginWithProvider, handleRedirectResult, verify2FA } = useAuth();

    useEffect(() => {
        const openReset = searchParams?.get('reset') === '1' || searchParams?.get('forgot') === '1';
        if (openReset && typeof window !== 'undefined' && !isFirebaseConfigMissing()) {
            setShowPasswordReset(true);
            setError('');
            setResetMessage('');
        }
    }, [searchParams]);

    // Check for OAuth redirect result when page loads
    useEffect(() => {
        let isMounted = true;
        
        const checkRedirectResult = async () => {
            try {
                authDebugLog('Checking for OAuth redirect result...');
                const result = await handleRedirectResult();
                
                if (!isMounted) return;
                
                if (result?.user) {
                    setError('');
                    const path = returnTo && returnTo.startsWith('/') ? returnTo : ((result.user.role === 'admin' || result.user.role === 'super_admin') && result.user.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                    setTimeout(() => { window.location.replace(path); }, 300);
                } else {
                    authDebugLog('No OAuth redirect result found');
                    
                    // Check URL for OAuth parameters (indicates OAuth callback even if redirect result failed)
                    const urlParams = new URLSearchParams(window.location.search);
                    const hasOAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('authuser');
                    
                    if (hasOAuthParams) {
                        authDebugLog('OAuth parameters detected in URL - waiting for auth state to settle...');
                    }
                    
                    // Check if user is already authenticated (redirect result might have been consumed)
                    // Wait longer if OAuth params are present (sessionStorage might be blocked)
                    const waitTime = hasOAuthParams ? 1000 : 500;
                    setTimeout(async () => {
                        if (!isMounted) return;
                        
                        const currentUser = FirebaseAuthService.getCurrentUser();
                        const storedToken = localStorage.getItem('token');
                        const storedUser = localStorage.getItem('user');
                        
                        if (currentUser) {
                            authDebugLog('User is authenticated via Firebase, processing...');
                            
                            // If we have OAuth params but no stored token, sync with backend
                            if (hasOAuthParams && !storedToken) {
                                try {
                                    const idToken = await currentUser.getIdToken();
                                    const tokenResult = await currentUser.getIdTokenResult();
                                    const role = (tokenResult.claims?.role as string) || 'user';
                                    
                                    const displayName = currentUser.displayName || (currentUser.providerData?.[0] as { displayName?: string })?.displayName || '';
                                    const response = await api.post<any>('/auth/firebase-login', {
                                        firebaseToken: idToken,
                                        email: currentUser.email ?? undefined,
                                        displayName: displayName || undefined,
                                    });
                                    
                                    if (response.access_token && response.user) {
                                        const userData = {
                                            id: response.user.id || response.user._id || currentUser.uid,
                                            email: response.user.email || currentUser.email || '',
                                            role: response.user.role || role,
                                            firstName: response.user.firstName || (currentUser.displayName?.split(' ')[0] ?? ''),
                                            lastName: response.user.lastName || (currentUser.displayName?.split(' ').slice(1).join(' ') ?? ''),
                                            adminAccessAllowed: response.user.adminAccessAllowed,
                                        };
                                        localStorage.setItem('token', response.access_token);
                                        localStorage.setItem('user', JSON.stringify(userData));
                                        setAuthCookie(response.access_token);
                                        const path = returnTo && returnTo.startsWith('/') ? returnTo : ((userData.role === 'admin' || userData.role === 'super_admin') && userData.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                                        window.location.href = path;
                                        return;
                                    }
                                } catch (syncError) {
                                    console.error('Backend sync failed:', syncError);
                                }
                            }
                            
                            // If we have stored token/user, use that
                            if (storedToken && storedUser) {
                                try {
                                    const userData = JSON.parse(storedUser);
const path = returnTo && returnTo.startsWith('/') ? returnTo : ((userData.role === 'admin' || userData.role === 'super_admin') && userData.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                                        window.location.href = path;
                                    } catch (e) {
                                        console.error('Error parsing stored user:', e);
                                }
                            }
                        }
                    }, waitTime);
                }
            } catch (err: any) {
                if (!isMounted) return;
                
                console.error('OAuth redirect result error:', err);
                // Only show error if there was actually a redirect attempt
                if (err.message && !err.message.includes('null') && !err.message.includes('no-auth-event')) {
                    setError(err.message || 'Failed to complete sign in. Please try again.');
                }
            }
        };
        
        // Check immediately on mount
        checkRedirectResult();
        
        return () => {
            isMounted = false;
        };
    }, [handleRedirectResult, returnTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const result = await login(email, password);
            if (result.requiresTwoFactor && result.tempToken) {
                setTempToken(result.tempToken);
                setShow2FA(true);
            } else if (result.user) {
                const path = returnTo && returnTo.startsWith('/') ? returnTo : ((result.user.role === 'admin' || result.user.role === 'super_admin') && result.user.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                setTimeout(() => window.location.replace(path), 150);
            } else {
                const path = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard';
                setTimeout(() => window.location.replace(path), 150);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!twoFactorCode || twoFactorCode.length !== 6) {
            setError('Please enter your 6-digit code');
            return;
        }
        setIsSubmitting(true);
        try {
            await verify2FA(tempToken, twoFactorCode);
            const u = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
            const path = returnTo && returnTo.startsWith('/') ? returnTo : ((u?.role === 'admin' || u?.role === 'super_admin') && u?.adminAccessAllowed !== false ? '/admin' : '/dashboard');
            setTimeout(() => window.location.replace(path), 150);
        } catch (err: any) {
            setError(err.message || 'Invalid 2FA code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetMessage('');

        if (typeof window !== 'undefined' && isFirebaseConfigMissing()) {
            setError('Sign-in is not configured.');
            return;
        }

        const addr = resetEmail.trim();
        if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        try {
            await FirebaseAuthService.resetPassword(addr);
            setResetMessage('If an account exists for that email, you will receive reset instructions shortly.');
            setResetEmail('');
        } catch (err: any) {
            setError(err.message || 'Could not send reset email. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        setError('');
        setIsSubmitting(true);
        try {
            authDebugLog(`Starting ${provider} sign-in...`);
            // This will redirect the page, so we won't reach the code below
            await loginWithProvider(provider);
        } catch (err: any) {
            console.error(`${provider} sign-in error:`, err);
            let errorMessage = err.message || `Failed to sign in with ${provider}. Please try again.`;
            
            // Provide more helpful error messages
            if (err.message?.includes('unauthorized-domain')) {
                errorMessage = 'This domain is not authorized. Please use localhost for local development, or ensure your domain is added to Firebase authorized domains.';
            } else if (err.message?.includes('operation-not-allowed')) {
                errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not enabled. Please contact support.`;
            }
            
            setError(errorMessage);
            setIsSubmitting(false);
        }
        // Note: If redirect succeeds, the page will reload and useEffect will handle the result
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-obsidian relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-gold blur-[140px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[120px]"></div>
            </div>

            <div className="w-full max-w-lg p-1 relative z-10 animate-fade-in">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-brand-gold/5 rounded-[40px] blur-sm"></div>

                <div className="relative glass-panel rounded-[40px] p-12 border border-white/10 shadow-2xl">
                    <div className="flex flex-col items-center mb-12">
                        <div className="text-3xl font-black italic tracking-tighter text-brand-gold mb-2 text-center">
                            {show2FA ? (
                                '2FA VERIFICATION'
                            ) : showPasswordReset ? (
                                'RESET PASSWORD'
                            ) : (
                                <>
                                    <span className="text-white">Invest</span>
                                    <span className="font-black text-brand-gold">lyin</span>
                                </>
                            )}
                        </div>
                        <p className="text-brand-text-secondary text-sm font-medium">
                            {show2FA ? 'Enter the code from your authenticator app' : showPasswordReset ? 'Enter your email to receive a password reset link' : 'Investlyin — Professional CFD Trading Platform'}
                        </p>
                    </div>

                    {typeof window !== 'undefined' && isFirebaseConfigMissing() && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl mb-6 text-xs font-medium text-center">
                            {process.env.NODE_ENV === 'development'
                                ? 'Firebase client is not configured. Social sign-in is disabled until env vars are set.'
                                : 'Sign-in is temporarily unavailable.'}
                        </div>
                    )}
                    {error && (
                        <div data-testid="login-error" className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3 rounded-xl mb-8 text-xs font-semibold text-center">
                            {error}
                        </div>
                    )}

                    {resetMessage && (
                        <div className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold px-4 py-3 rounded-xl mb-8 text-xs font-semibold text-center">
                            {resetMessage}
                        </div>
                    )}

                    {showPasswordReset ? (
                        <form onSubmit={handlePasswordReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                    placeholder="operator@network.com"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowPasswordReset(false); setResetEmail(''); setResetMessage(''); setError(''); }}
                                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    ) : !show2FA ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Terminal ID (Email)</label>
                                <input
                                    type="email"
                                    data-testid="login-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                    placeholder="operator@network.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Security Key</label>
                                <input
                                    type="password"
                                    data-testid="login-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    data-testid="login-submit"
                                    className="w-full py-5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-[0.3em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Verifying...' : 'Initialize Session'}
                                </button>
                            </div>
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordReset(true);
                                        setError('');
                                        setResetMessage('');
                                    }}
                                    disabled={typeof window !== 'undefined' && isFirebaseConfigMissing()}
                                    className="text-brand-text-secondary text-xs hover:text-brand-gold transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {/* Social Login Providers */}
                            <div className="pt-6">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-brand-border"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="px-2 bg-brand-obsidian text-brand-text-secondary">Or continue with</span>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSocialLogin('google')}
                                        disabled={isSubmitting || (typeof window !== 'undefined' && isFirebaseConfigMissing())}
                                        data-testid="login-google"
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        <span className="text-xs font-semibold text-white">Google</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSocialLogin('apple')}
                                        disabled={isSubmitting || (typeof window !== 'undefined' && isFirebaseConfigMissing())}
                                        data-testid="login-apple"
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                        </svg>
                                        <span className="text-xs font-semibold text-white">Apple</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handle2FASubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Authentication Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-lg tracking-[0.5em] text-center rounded-xl focus:border-brand-gold outline-none p-4 transition-all font-mono"
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShow2FA(false); setTempToken(''); setTwoFactorCode(''); setError(''); }}
                                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || twoFactorCode.length !== 6}
                                    className="flex-1 py-5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                        </form>
                    )}

                    {!show2FA && !showPasswordReset && (
                        <div className="mt-12 text-center">
                            <p className="text-brand-text-secondary text-xs font-medium">
                                Not registered? <Link href="/register" className="text-brand-gold font-bold hover:underline transition-all">Establish New Account</Link>
                            </p>
                            <div className="mt-10 pt-8 border-t border-brand-border flex justify-between items-center px-2">
                                <Link href="/admin/login" className="text-[9px] text-brand-text-secondary/60 hover:text-white uppercase tracking-[0.2em] font-medium transition-colors">Admin Gateway</Link>
                                <span className="text-[9px] text-brand-text-secondary/40 font-mono tracking-tighter uppercase">v4.0 Protocol</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
