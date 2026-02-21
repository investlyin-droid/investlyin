'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigMissing } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const result = await login(email, password);
            
            // Handle 2FA requirement
            if (result.requiresTwoFactor && result.tempToken) {
                setError('2FA is enabled. Please use the main login page to complete 2FA verification, then access /admin.');
                setIsSubmitting(false);
                return;
            }
            
            // Get user from result (login function now ensures user is returned)
            const user = result.user;
            
            if (!user) {
                // Fallback: check localStorage after a short delay
                await new Promise(resolve => setTimeout(resolve, 200));
                const storedUserStr = localStorage.getItem('user');
                if (storedUserStr) {
                    try {
                        const storedUser = JSON.parse(storedUserStr);
                        if (storedUser.role === 'admin' || storedUser.role === 'super_admin') {
                            window.location.href = '/admin';
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse stored user:', e);
                    }
                }
                setError('Authentication failed. User data not found. Please check your credentials and try again.');
                setIsSubmitting(false);
                return;
            }
            
            // Check if user has admin role
            if (user.role === 'admin' || user.role === 'super_admin') {
                // Use window.location for a full page reload to ensure auth state is fresh
                window.location.href = '/admin';
            } else {
                setError(`Access denied. This portal is for administrative personnel only. Your role: ${user.role || 'user'}`);
                setIsSubmitting(false);
            }
        } catch (err: any) {
            console.error('Admin login error:', err);
            const errorMessage = err?.message || err?.toString() || 'Authentication failed. Please check your credentials.';
            setError(errorMessage);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-obsidian relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-gold blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10 glass-panel animate-fade-in rounded-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mb-4 border border-brand-gold/20">
                        <svg className="w-8 h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight"><span className="text-brand-gold">bitXtrade</span> Admin Portal</h1>
                    <p className="text-brand-text-secondary mt-1 text-sm">Administrative Control Center</p>
                    <p className="text-brand-text-secondary/80 mt-0.5 text-xs">Sign in with your Firebase account (same as main login)</p>
                </div>

                {typeof window !== 'undefined' && isFirebaseConfigMissing() && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-lg mb-4 text-xs font-medium text-center">
                        Production: set NEXT_PUBLIC_FIREBASE_* in your environment.
                    </div>
                )}
                {error && (
                    <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red px-4 py-3 rounded-lg mb-6 text-sm flex items-center space-x-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2 ml-1">
                            Administrator Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#1A1D23] border border-brand-border text-white text-sm rounded-lg focus:ring-1 focus:ring-brand-gold focus:border-brand-gold outline-none p-3 transition-all duration-200"
                            placeholder="admin@platform.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2 ml-1">
                            Access Key
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#1A1D23] border border-brand-border text-white text-sm rounded-lg focus:ring-1 focus:ring-brand-gold focus:border-brand-gold outline-none p-3 transition-all duration-200"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-brand-gold hover:bg-[#E6C200] text-brand-obsididan font-bold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-brand-gold/10 flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-brand-obsidian/30 border-t-brand-obsidian rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>Authenticate</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-between">
                    <Link href="/login" className="text-xs text-brand-text-secondary hover:text-brand-gold transition-colors">
                        User Login Portal
                    </Link>
                    <span className="text-[10px] text-brand-text-secondary uppercase tracking-widest font-medium">Secured Node v4.0</span>
                </div>
            </div>
        </div>
    );
}
