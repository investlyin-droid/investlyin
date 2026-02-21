'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigMissing } from '@/lib/firebase';
import { setAuthCookie } from '@/lib/authCookie';
import { FirebaseAuthService } from '@/lib/firebaseAuth';
import { api } from '@/lib/api';
import Link from 'next/link';

function RegisterContent() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams?.get('from') || '';
    const { register, loginWithProvider, handleRedirectResult } = useAuth();

    // Check for OAuth redirect result when page loads (Google/Apple sign-up returns here)
    useEffect(() => {
        let isMounted = true;
        const checkRedirectResult = async () => {
            try {
                const result = await handleRedirectResult();
                if (!isMounted) return;
                if (result?.user) {
                    setError('');
                    const path = returnTo && returnTo.startsWith('/') ? returnTo : ((result.user.role === 'admin' || result.user.role === 'super_admin') && result.user.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                    setTimeout(() => { window.location.replace(path); }, 300);
                    return;
                }
                const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                const hasOAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('authuser');
                if (hasOAuthParams) {
                    setTimeout(async () => {
                        if (!isMounted) return;
                        const currentUser = FirebaseAuthService.getCurrentUser();
                        const storedToken = localStorage.getItem('token');
                        if (currentUser && !storedToken) {
                            try {
                                const idToken = await currentUser.getIdToken();
                                const response = await api.post<any>('/auth/firebase-login', {
                                    firebaseToken: idToken,
                                    email: currentUser.email ?? undefined,
                                    displayName: currentUser.displayName ?? getDisplayNameFromProvider(currentUser),
                                });
                                if (response.access_token && response.user) {
                                    const userData = {
                                        id: response.user.id || response.user._id || currentUser.uid,
                                        email: response.user.email || currentUser.email || '',
                                        role: response.user.role || 'user',
                                        firstName: response.user.firstName || (currentUser.displayName?.split(' ')[0] ?? ''),
                                        lastName: response.user.lastName || (currentUser.displayName?.split(' ').slice(1).join(' ') ?? ''),
                                        adminAccessAllowed: response.user.adminAccessAllowed,
                                    };
                                    localStorage.setItem('token', response.access_token);
                                    localStorage.setItem('user', JSON.stringify(userData));
                                    setAuthCookie(response.access_token);
                                    const path = returnTo && returnTo.startsWith('/') ? returnTo : ((userData.role === 'admin' || userData.role === 'super_admin') && userData.adminAccessAllowed !== false ? '/admin' : '/dashboard');
                                    window.location.href = path;
                                }
                            } catch (syncErr) {
                                console.error('Backend sync failed after OAuth:', syncErr);
                                setError('Could not complete sign up. Please try again.');
                            }
                        }
                    }, 1200);
                }
            } catch (err: any) {
                if (!isMounted) return;
                if (err.message && !err.message.includes('null') && !err.message.includes('no-auth-event')) {
                    setError(err.message || 'Failed to complete sign up. Please try again.');
                }
            }
        };
        function getDisplayNameFromProvider(user: { displayName?: string | null; providerData?: Array<{ displayName?: string | null }> }): string {
            if (user.displayName) return user.displayName;
            const provider = user.providerData?.[0];
            return provider?.displayName ?? '';
        }
        checkRedirectResult();
        return () => { isMounted = false; };
    }, [handleRedirectResult, returnTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const result = await register(formData);
            if (result?.user) {
                const path = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard';
                router.push(path);
            } else {
                setError('Registration completed but user data could not be retrieved.');
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please verify your details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialSignup = async (provider: 'google' | 'apple') => {
        setError('');
        setIsSubmitting(true);
        try {
            // This will redirect the page, so we won't reach the code below
            await loginWithProvider(provider);
        } catch (err: any) {
            setError(err.message || `Failed to sign up with ${provider}. Please try again.`);
            setIsSubmitting(false);
        }
        // Note: If redirect succeeds, the page will reload and useEffect will handle the result
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-obsidian relative overflow-hidden p-6">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-gold blur-[140px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[120px]"></div>
            </div>

            <div className="w-full max-w-xl p-1 relative z-10 animate-fade-in">
                {/* Visual Frame */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 via-transparent to-brand-gold/5 rounded-[40px] blur-sm"></div>

                <div className="relative glass-panel rounded-[40px] p-12 border border-white/10 shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="text-3xl font-black italic tracking-tighter text-brand-gold mb-2">bit<span className="text-white">X</span><span className="font-black text-brand-gold">trade</span></div>
                        <p className="text-brand-text-secondary text-sm font-medium">Create your trading account</p>
                    </div>

                    {typeof window !== 'undefined' && isFirebaseConfigMissing() && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl mb-6 text-xs font-medium text-center mt-4">
                            Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.example). Google and Apple sign-up are disabled until then.
                        </div>
                    )}
                    {error && (
                        <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3 rounded-xl mb-8 text-xs font-semibold text-center mt-4 animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Primary Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                placeholder="name@domain.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] ml-1">Terminal Security Key</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-[#1A1D23]/50 border border-brand-border text-white text-sm rounded-xl focus:border-brand-gold outline-none p-4 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                data-testid="register-submit"
                                className="w-full py-5 bg-brand-gold text-brand-obsidian font-black uppercase tracking-[0.3em] text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'Establishing Connection...' : 'Complete Initialization'}
                            </button>
                        </div>

                        {/* Social Signup Providers */}
                        <div className="pt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-brand-border"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="px-2 bg-brand-obsidian text-brand-text-secondary">Or sign up with</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSocialSignup('google')}
                                    disabled={isSubmitting || (typeof window !== 'undefined' && isFirebaseConfigMissing())}
                                    data-testid="register-google"
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
                                    onClick={() => handleSocialSignup('apple')}
                                    disabled={isSubmitting || (typeof window !== 'undefined' && isFirebaseConfigMissing())}
                                    data-testid="register-apple"
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

                    <div className="mt-12 text-center">
                        <p className="text-brand-text-secondary text-xs font-medium">
                            Registered member? <Link href="/login" className="text-brand-gold font-bold hover:underline transition-all">Sign In to Dashboard</Link>
                        </p>
                        <div className="mt-10 pt-8 border-t border-brand-border flex justify-between items-center px-2">
                            <Link href="/admin/login" className="text-[9px] text-brand-text-secondary/60 hover:text-white uppercase tracking-[0.2em] font-medium transition-colors">Staff Ops Access</Link>
                            <span className="text-[9px] text-brand-text-secondary/40 font-mono tracking-tighter uppercase">v4.0 Protocol</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
