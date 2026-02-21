'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
    const { user, token, logout, isLoading } = useAuth();
    const toast = useToast();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<'general' | 'security' | 'kyc' | 'api'>('general');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [showKYCModal, setShowKYCModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [kycForm, setKycForm] = useState({ documentType: '', documentNumber: '', documentImage: null as File | null });
    const [kycPreview, setKycPreview] = useState<string | null>(null);
    const [isSubmittingKYC, setIsSubmittingKYC] = useState(false);
    const [apiKeyForm, setApiKeyForm] = useState({ name: '', permissions: ['read', 'trade'] as string[] });
    const [newApiKey, setNewApiKey] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<{ kycStatus?: string; twoFactorEnabled?: boolean } | null>(null);
    const [twoFAQRCode, setTwoFAQRCode] = useState<string | null>(null);
    const [twoFACode, setTwoFACode] = useState('');
    const [isVerifying2FA, setIsVerifying2FA] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
    const [copiedApiKey, setCopiedApiKey] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            api.get('/users/profile', token).then((data: any) => {
                setProfileData({ kycStatus: data.kycStatus, twoFactorEnabled: data.twoFactorEnabled });
            }).catch(() => setProfileData(null));
        }
    }, [token]);

    useEffect(() => {
        if (token && activeSection === 'api') {
            loadApiKeys();
        }
    }, [token, activeSection]);

    const loadApiKeys = async () => {
        try {
            const data = await api.get('/users/api-keys', token!);
            const apiKeysData = data?.apiKeys || data;
            setApiKeys(Array.isArray(apiKeysData) ? apiKeysData : []);
        } catch (error: any) {
            console.error('Failed to load API keys:', error);
            setApiKeys([]);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordForm.currentPassword) {
            toast.error('Please enter your current password');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
            toast.error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
            return;
        }
        try {
            setIsChangingPassword(true);
            await api.put('/users/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            }, token!);
            toast.success('Password changed successfully');
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handle2FASetup = async () => {
        try {
            setIsSubmitting(true);
            const data = await api.post<{ qrCode?: string; secret?: string; message?: string }>('/users/2fa/setup', {}, token!);
            if (data.qrCode) setTwoFAQRCode(data.qrCode);
            toast.success(data.message || 'Scan the QR code with your authenticator app.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to setup 2FA');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handle2FAVerify = async () => {
        if (!twoFACode || twoFACode.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }
        try {
            setIsVerifying2FA(true);
            await api.post('/users/2fa/verify', { code: twoFACode }, token!);
            toast.success('2FA verified and enabled successfully!');
            setShow2FAModal(false);
            setTwoFAQRCode(null);
            setTwoFACode('');
            if (profileData) setProfileData({ ...profileData, twoFactorEnabled: true });
            // Reload profile data
            if (token) {
                const data = await api.get('/users/profile', token);
                setProfileData({ kycStatus: data.kycStatus, twoFactorEnabled: data.twoFactorEnabled });
            }
        } catch (error: any) {
            toast.error(error.message || 'Invalid 2FA code. Please try again.');
        } finally {
            setIsVerifying2FA(false);
        }
    };

    const revokeApiKey = async (keyId: string) => {
        const key = apiKeys.find((k: any) => k.id === keyId);
        const keyName = key?.name || 'this API key';
        if (!window.confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone and the key will stop working immediately.`)) return;
        try {
            await api.delete(`/users/api-keys/${keyId}`, token!);
            await loadApiKeys();
            toast.success('API key revoked successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to revoke API key');
        }
    };

    const handleKYCFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('File size must be less than 5MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }
            setKycForm({ ...kycForm, documentImage: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setKycPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleKYCSubmit = async () => {
        if (!kycForm.documentType || !kycForm.documentNumber) {
            toast.error('Please fill all required fields');
            return;
        }
        if (!kycForm.documentImage) {
            toast.error('Please upload a document image');
            return;
        }
        try {
            setIsSubmittingKYC(true);
            // Convert image to base64 for submission
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64Image = reader.result as string;
                    await api.post('/users/kyc/submit', {
                        documentType: kycForm.documentType,
                        documentNumber: kycForm.documentNumber,
                        documentImage: base64Image,
                    }, token!);
                    toast.success('KYC documents submitted successfully. Your verification is pending review.');
                    setShowKYCModal(false);
                    setKycForm({ documentType: '', documentNumber: '', documentImage: null });
                    setKycPreview(null);
                    // Reload profile to update KYC status
                    if (token) {
                        const data = await api.get('/users/profile', token);
                        setProfileData({ kycStatus: data.kycStatus, twoFactorEnabled: data.twoFactorEnabled });
                    }
                } catch (error: any) {
                    toast.error(error.message || 'Failed to submit KYC');
                } finally {
                    setIsSubmittingKYC(false);
                }
            };
            reader.readAsDataURL(kycForm.documentImage);
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit KYC');
            setIsSubmittingKYC(false);
        }
    };

    const handleGenerateApiKey = async () => {
        const trimmedName = apiKeyForm.name.trim();
        if (!trimmedName) {
            toast.error('Please enter a name for the API key');
            return;
        }
        if (trimmedName.length < 3) {
            toast.error('API key name must be at least 3 characters');
            return;
        }
        if (trimmedName.length > 50) {
            toast.error('API key name must be less than 50 characters');
            return;
        }
        try {
            setIsGeneratingApiKey(true);
            const data = await api.post('/users/api-keys/generate', { 
                name: trimmedName,
                permissions: apiKeyForm.permissions 
            }, token!);
            setNewApiKey(data.apiKey);
            setApiKeyForm({ name: '', permissions: ['read', 'trade'] });
            await loadApiKeys();
            toast.success('API key generated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate API key');
        } finally {
            setIsGeneratingApiKey(false);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-obsidian text-white">
            {/* Navigation Header */}
            <header className="relative h-14 sm:h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 bg-brand-surface/80 backdrop-blur-md z-20">
                <div className="flex items-center space-x-3 sm:space-x-6 md:space-x-10 flex-1 min-w-0">
                    <Link href="/dashboard" className="text-xl sm:text-2xl font-black italic tracking-tighter text-brand-gold flex-shrink-0">
                        bit<span className="text-white">X</span><span className="font-black text-brand-gold">trade</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-4 lg:space-x-8 text-xs sm:text-sm font-semibold text-brand-text-secondary">
                        <Link href="/dashboard" className="hover:text-white transition-colors px-1">Trading</Link>
                        <Link href="/wallet" className="hover:text-white transition-colors px-1">Wallet</Link>
                        <Link href="/news" className="hover:text-white transition-colors px-1">News</Link>
                        <Link href="/profile" className="text-brand-gold border-b-2 border-brand-gold pb-1 px-1">Account</Link>
                    </nav>
                </div>

                {/* Mobile menu button - moved to right side */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {mobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <>
                        <div 
                            className="md:hidden fixed inset-0 bg-black/50 z-30"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="md:hidden absolute top-full left-0 right-0 bg-brand-surface border-b border-white/10 z-40 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto">
                            <nav className="flex flex-col py-2">
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    Trading
                                </Link>
                                <Link
                                    href="/wallet"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    Wallet
                                </Link>
                                <Link
                                    href="/news"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    News
                                </Link>
                                <Link
                                    href="/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-gold bg-brand-gold/10 border-brand-gold"
                                >
                                    Account
                                </Link>
                            </nav>
                        </div>
                    </>
                )}
            </header>

            <main className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Account Settings</h1>
                    <p className="text-brand-text-secondary text-sm sm:text-base md:text-lg">Manage your account information and preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                    {/* Sidebar */}
                    <aside className="lg:col-span-1 space-y-1 sm:space-y-2">
                        <SidebarItem 
                            label="General Settings" 
                            active={activeSection === 'general'}
                            onClick={() => setActiveSection('general')}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        />
                        <SidebarItem 
                            label="Security & 2FA" 
                            active={activeSection === 'security'}
                            onClick={() => setActiveSection('security')}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                        />
                        <SidebarItem 
                            label="Verification (KYC)" 
                            active={activeSection === 'kyc'}
                            onClick={() => setActiveSection('kyc')}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <SidebarItem 
                            label="API Connections" 
                            active={activeSection === 'api'}
                            onClick={() => setActiveSection('api')}
                            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                    </aside>

                    {/* Content Card */}
                    <div className="lg:col-span-3 card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-xl">
                        {activeSection === 'general' && (
                            <section className="space-y-4 sm:space-y-6">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 border-b border-white/10 pb-2 sm:pb-3">Personal Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mt-3 sm:mt-4 md:mt-5">
                                        <InfoBlock label="First Name" value={user.firstName} />
                                        <InfoBlock label="Last Name" value={user.lastName} />
                                        <InfoBlock label="Email Address" value={user.email} />
                                        <InfoBlock label="Account Type" value={user.role.toUpperCase()} />
                                    </div>
                                </div>

                                <div className="pt-4 sm:pt-6 border-t border-white/10">
                                    <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Account Status</h3>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 gap-3 sm:gap-0">
                                        <div className="flex items-center space-x-3 sm:space-x-4">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm sm:text-base font-semibold text-white">Account Verified</p>
                                                <p className="text-xs sm:text-sm text-brand-text-secondary">
                                                KYC: {profileData?.kycStatus 
                                                    ? profileData.kycStatus === 'approved' ? '✓ Approved' 
                                                    : profileData.kycStatus === 'pending' ? '⏳ Pending Review'
                                                    : profileData.kycStatus === 'rejected' ? '✗ Rejected'
                                                    : String(profileData.kycStatus).toUpperCase()
                                                    : 'Not submitted'}
                                            </p>
                                            </div>
                                        </div>
                                        <span className="badge badge-success text-xs sm:text-sm">Active</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'security' && (
                            <section className="space-y-6 sm:space-y-8">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 border-b border-white/10 pb-3 sm:pb-4">Security Settings</h3>
                                    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 gap-3 sm:gap-0">
                                            <div className="flex items-center space-x-3 sm:space-x-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm sm:text-base font-semibold text-white">Two-Factor Authentication</p>
                                                    <p className="text-xs sm:text-sm text-brand-text-secondary">
                                                        {profileData?.twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}
                                                    </p>
                                                </div>
                                            </div>
                                            {profileData?.twoFactorEnabled ? (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={async () => {
                                                            if (!window.confirm('Are you sure you want to disable 2FA? This will remove the extra security layer from your account.')) return;
                                                            try {
                                                                await api.post('/users/2fa/disable', {}, token!);
                                                                toast.success('2FA disabled successfully');
                                                                if (token) {
                                                                    const data = await api.get('/users/profile', token);
                                                                    setProfileData({ kycStatus: data.kycStatus, twoFactorEnabled: data.twoFactorEnabled });
                                                                }
                                                            } catch (error: any) {
                                                                toast.error(error.message || 'Failed to disable 2FA');
                                                            }
                                                        }}
                                                        className="px-4 sm:px-6 py-2 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                                                    >
                                                        Disable
                                                    </button>
                                                    <button 
                                                        onClick={() => { setShow2FAModal(true); setTwoFAQRCode(null); }}
                                                        className="px-4 sm:px-6 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                                                    >
                                                        Reconfigure
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => { setShow2FAModal(true); setTwoFAQRCode(null); }}
                                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                                                >
                                                    Configure
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 gap-3 sm:gap-0">
                                            <div className="flex items-center space-x-3 sm:space-x-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm sm:text-base font-semibold text-white">Change Password</p>
                                                    <p className="text-xs sm:text-sm text-brand-text-secondary">Update your account password</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowPasswordModal(true)}
                                                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-xs sm:text-sm transition-colors"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'kyc' && (
                            <section className="space-y-6 sm:space-y-8">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 border-b border-white/10 pb-3 sm:pb-4">KYC Verification</h3>
                                    <div className="mt-4 sm:mt-6">
                                        {profileData?.kycStatus === 'approved' ? (
                                            <div className="p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl bg-brand-green/10 border border-brand-green/20">
                                                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm sm:text-base font-semibold text-white">Verification Approved</p>
                                                        <p className="text-xs sm:text-sm text-brand-text-secondary">Your account is fully verified</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : profileData?.kycStatus === 'pending' ? (
                                            <div className="p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl bg-brand-gold/10 border border-brand-gold/20">
                                                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm sm:text-base font-semibold text-white">Verification Pending</p>
                                                        <p className="text-xs sm:text-sm text-brand-text-secondary">Your documents are under review</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs sm:text-sm text-brand-text-secondary">
                                                    We're reviewing your submitted documents. This usually takes 1-3 business days.
                                                </p>
                                            </div>
                                        ) : profileData?.kycStatus === 'rejected' ? (
                                            <div className="p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl bg-brand-red/10 border border-brand-red/20">
                                                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-red/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm sm:text-base font-semibold text-white">Verification Rejected</p>
                                                        <p className="text-xs sm:text-sm text-brand-text-secondary">Please resubmit your documents</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">
                                                    Your verification was rejected. Please ensure your documents are clear and valid, then resubmit.
                                                </p>
                                                <button 
                                                    onClick={() => setShowKYCModal(true)}
                                                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-gold text-brand-obsidian rounded-lg font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                                                >
                                                    Resubmit Documents
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl bg-brand-gold/10 border border-brand-gold/20">
                                                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm sm:text-base font-semibold text-white">Verification Status</p>
                                                        <p className="text-xs sm:text-sm text-brand-text-secondary">Your account verification status</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">
                                                    KYC verification helps us ensure the security of your account and comply with regulatory requirements.
                                                </p>
                                                <button 
                                                    onClick={() => setShowKYCModal(true)}
                                                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-gold text-brand-obsidian rounded-lg font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
                                                >
                                                    Start Verification
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === 'api' && (
                            <section className="space-y-6 sm:space-y-8">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 border-b border-white/10 pb-3 sm:pb-4">API Connections</h3>
                                    <div className="mt-4 sm:mt-6">
                                        <div className="p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm sm:text-base font-semibold text-white">API Access</p>
                                                    <p className="text-xs sm:text-sm text-brand-text-secondary">Manage your API keys and connections</p>
                                                </div>
                                            </div>
                                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">
                                                Generate API keys to connect your trading applications and automate your trading strategies.
                                            </p>
                                            <button 
                                                onClick={() => setShowApiKeyModal(true)}
                                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs sm:text-sm transition-colors mb-3 sm:mb-4"
                                            >
                                                Generate API Key
                                            </button>
                                            {(Array.isArray(apiKeys) ? apiKeys : []).length > 0 && (
                                                <div className="mt-3 sm:mt-4 space-y-2">
                                                    <p className="text-[10px] sm:text-xs font-semibold text-brand-text-secondary mb-2">Your API Keys:</p>
                                                    {(Array.isArray(apiKeys) ? apiKeys : []).map((key: any) => (
                                                        <div key={key.id} className="p-2.5 sm:p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs sm:text-sm font-semibold text-white truncate">{key.name}</p>
                                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => revokeApiKey(key.id)}
                                                                className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] sm:text-xs font-semibold rounded-lg w-full sm:w-auto"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="card w-full max-w-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold">Change Password</h2>
                            <button onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Current Password</label>
                                <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">New Password</label>
                                <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Confirm New Password</label>
                                <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm" />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-4 pt-3 sm:pt-4">
                                <button 
                                    onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} 
                                    className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm transition-colors"
                                    disabled={isChangingPassword}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handlePasswordChange}
                                    disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                    className="flex-1 btn-primary py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {show2FAModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="card w-full max-w-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Setup Two-Factor Authentication</h2>
                            <button onClick={() => { setShow2FAModal(false); setTwoFAQRCode(null); }} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            {twoFAQRCode ? (
                                <>
                                    <p className="text-xs sm:text-sm text-brand-text-secondary">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
                                    <div className="flex justify-center p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl">
                                        <img src={twoFAQRCode} alt="2FA QR Code" className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56" width={200} height={200} />
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-3 sm:mb-4">Enter the 6-digit code from your authenticator app to complete setup:</p>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Verification Code</label>
                                        <input 
                                            type="text" 
                                            value={twoFACode}
                                            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center text-xl sm:text-2xl tracking-widest font-mono"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-4 pt-2">
                                        <button 
                                            onClick={() => { setShow2FAModal(false); setTwoFAQRCode(null); setTwoFACode(''); }} 
                                            className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handle2FAVerify}
                                            disabled={isVerifying2FA || twoFACode.length !== 6}
                                            className="flex-1 btn-primary py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isVerifying2FA ? 'Verifying...' : 'Verify & Enable'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs sm:text-sm text-brand-text-secondary">Two-factor authentication adds an extra layer of security to your account.</p>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-4 pt-3 sm:pt-4">
                                        <button onClick={() => { setShow2FAModal(false); setTwoFAQRCode(null); setTwoFACode(''); }} className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm transition-colors">Cancel</button>
                                        <button 
                                            onClick={handle2FASetup}
                                            disabled={isSubmitting}
                                            className="flex-1 btn-primary py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Setting up...' : 'Setup 2FA'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KYC Modal */}
            {showKYCModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="card w-full max-w-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 my-4">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Submit KYC Documents</h2>
                            <button onClick={() => { setShowKYCModal(false); setKycForm({ documentType: '', documentNumber: '', documentImage: null }); setKycPreview(null); }} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Document Type <span className="text-brand-red">*</span></label>
                                <select 
                                    value={kycForm.documentType} 
                                    onChange={e => setKycForm({ ...kycForm, documentType: e.target.value })} 
                                    className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm"
                                    required
                                >
                                    <option value="">Select document type</option>
                                    <option value="passport">Passport</option>
                                    <option value="drivers_license">Driver's License</option>
                                    <option value="national_id">National ID</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Document Number <span className="text-brand-red">*</span></label>
                                <input 
                                    type="text" 
                                    value={kycForm.documentNumber} 
                                    onChange={e => setKycForm({ ...kycForm, documentNumber: e.target.value })} 
                                    className="w-full input-field rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm" 
                                    placeholder="Enter document number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5 sm:mb-2">Document Image <span className="text-brand-red">*</span></label>
                                <div className="space-y-2 sm:space-y-3">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleKYCFileChange}
                                        className="w-full input-field rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-brand-gold/20 file:text-brand-gold hover:file:bg-brand-gold/30"
                                    />
                                    {kycPreview && (
                                        <div className="mt-2">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1.5 sm:mb-2">Preview:</p>
                                            <img src={kycPreview} alt="Document preview" className="max-w-full h-32 sm:h-40 md:h-48 object-contain rounded-lg border border-white/10" />
                                        </div>
                                    )}
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-4 pt-3 sm:pt-4">
                                <button 
                                    onClick={() => { setShowKYCModal(false); setKycForm({ documentType: '', documentNumber: '', documentImage: null }); setKycPreview(null); }} 
                                    className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleKYCSubmit}
                                    disabled={isSubmittingKYC || !kycForm.documentType || !kycForm.documentNumber || !kycForm.documentImage}
                                    className="flex-1 btn-primary py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingKYC ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Key Modal */}
            {showApiKeyModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Generate API Key</h2>
                            <button onClick={() => { setShowApiKeyModal(false); setApiKeyForm({ name: '', permissions: ['read', 'trade'] }); setNewApiKey(null); }} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            {newApiKey ? (
                                <>
                                    <div className="p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/20">
                                        <p className="text-xs text-brand-text-secondary mb-2">Your API Key (save this securely):</p>
                                        <div className="relative">
                                            <p className="font-mono text-sm break-all bg-brand-obsidian p-3 rounded border border-white/10 pr-12">{newApiKey}</p>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(newApiKey);
                                                        setCopiedApiKey(true);
                                                        toast.success('API key copied to clipboard!');
                                                        setTimeout(() => setCopiedApiKey(false), 2000);
                                                    } catch (err) {
                                                        toast.error('Failed to copy to clipboard');
                                                    }
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded transition-colors"
                                                title="Copy to clipboard"
                                            >
                                                {copiedApiKey ? (
                                                    <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-brand-red mt-2">⚠️ This key will not be shown again. Please save it now.</p>
                                    </div>
                                    <button 
                                        onClick={() => { 
                                            setShowApiKeyModal(false); 
                                            setApiKeyForm({ name: '', permissions: ['read', 'trade'] }); 
                                            setNewApiKey(null);
                                            setCopiedApiKey(false);
                                        }} 
                                        className="w-full btn-primary py-3 rounded-lg font-semibold"
                                    >
                                        I've Saved It
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">API Key Name</label>
                                        <input type="text" value={apiKeyForm.name} onChange={e => setApiKeyForm({ ...apiKeyForm, name: e.target.value })} placeholder="e.g., Trading Bot" className="w-full input-field rounded-lg px-4 py-3" />
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-semibold text-white mb-3">Permissions</label>
                                        <div className="space-y-2">
                                            {['read', 'trade', 'withdraw'].map((permission) => (
                                                <label key={permission} className="flex items-center space-x-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={apiKeyForm.permissions.includes(permission)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setApiKeyForm({ ...apiKeyForm, permissions: [...apiKeyForm.permissions, permission] });
                                                            } else {
                                                                setApiKeyForm({ ...apiKeyForm, permissions: apiKeyForm.permissions.filter(p => p !== permission) });
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-gold focus:ring-brand-gold"
                                                    />
                                                    <span className="text-sm text-white capitalize">{permission}</span>
                                                    <span className="text-xs text-brand-text-secondary">
                                                        {permission === 'read' && '(View account data)'}
                                                        {permission === 'trade' && '(Open/close trades)'}
                                                        {permission === 'withdraw' && '(Withdraw funds)'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        {apiKeyForm.permissions.length === 0 && (
                                            <p className="text-xs text-brand-red mt-2">At least one permission must be selected</p>
                                        )}
                                    </div>
                                    <div className="flex space-x-4 pt-4">
                                        <button 
                                            onClick={() => { setShowApiKeyModal(false); setApiKeyForm({ name: '', permissions: ['read', 'trade'] }); }} 
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                                            disabled={isGeneratingApiKey}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleGenerateApiKey}
                                            disabled={isGeneratingApiKey || !apiKeyForm.name.trim() || apiKeyForm.permissions.length === 0}
                                            className="flex-1 btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGeneratingApiKey ? 'Generating...' : 'Generate'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarItem({ label, active, onClick, icon }: { label: string; active?: boolean; onClick: () => void; icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center space-x-2 sm:space-x-3 ${
                active 
                    ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold' 
                    : 'bg-transparent border-transparent text-brand-text-secondary hover:bg-white/5 hover:text-white'
            }`}
        >
            <span className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] sm:text-xs font-semibold text-brand-text-secondary uppercase mb-1 sm:mb-2 tracking-wider">{label}</p>
            <p className="text-sm sm:text-base font-bold text-white break-words">{value}</p>
        </div>
    );
}
