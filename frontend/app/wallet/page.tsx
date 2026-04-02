'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_URL } from '@/lib/api';
import { useRealTimeEquity } from '@/hooks/useRealTimeEquity';
import { useTradeSocket } from '@/hooks/useTradeSocket';
import Link from 'next/link';

const DEPOSIT_MIN = 100; // Standard Account minimum
const DEPOSIT_MAX = 500000;
const FALLBACK_CRYPTO_NETWORKS = [
  { id: 'POLYGON', label: 'Polygon', explorerName: 'Polygonscan' },
  { id: 'BASE', label: 'Base', explorerName: 'Basescan' },
  { id: 'BNB', label: 'BNB Chain', explorerName: 'Bscscan' },
  { id: 'ARBITRUM', label: 'Arbitrum', explorerName: 'Arbiscan' },
  { id: 'LINEA', label: 'Linea', explorerName: 'Lineascan' },
  { id: 'SOLANA', label: 'Solana', explorerName: 'Solscan' },
  { id: 'BTC', label: 'Bitcoin', explorerName: 'Mempool' },
  { id: 'TRON', label: 'Tron', explorerName: 'Tronscan' },
  { id: 'ETH', label: 'Ethereum', explorerName: 'Etherscan' },
  { id: 'USDT-ERC20', label: 'USDT (ERC-20)', explorerName: 'Etherscan' },
  { id: 'USDT-TRC20', label: 'USDT (TRC-20)', explorerName: 'Tronscan' },
];
const WITHDRAW_MIN = 10;
const WITHDRAW_MAX = 500000;

export default function WalletPage() {
    const { user, token, isLoading } = useAuth();
    const toast = useToast();
    const [wallet, setWallet] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [pendingIntents, setPendingIntents] = useState<any[]>([]);
    const [openTrades, setOpenTrades] = useState<any[]>([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawWalletAddress, setWithdrawWalletAddress] = useState('');
    const [withdrawChain, setWithdrawChain] = useState('POLYGON');
    const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
    const [depositMethod, setDepositMethod] = useState<'CRYPTO' | 'BANK' | 'CARD' | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [cryptoNetwork, setCryptoNetwork] = useState('POLYGON');
    const [intentResult, setIntentResult] = useState<any>(null);
    const [creating, setCreating] = useState(false);
    const [cryptoNetworks, setCryptoNetworks] = useState<{ id: string; label: string; explorerName?: string }[]>(FALLBACK_CRYPTO_NETWORKS);
    const [feeConfig, setFeeConfig] = useState<{ tradeFeePercent?: number; depositFeePercent?: number; withdrawalFeePercent?: number }>({});
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
    const [cryptoAddressData, setCryptoAddressData] = useState<{ address: string; network: string; explorerName?: string; explorerUrl?: string } | null>(null);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [showCompletedButton, setShowCompletedButton] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) loadWallet();
    }, [token]);

    // Listen for real-time balance updates
    useTradeSocket({
        userId: user?.id,
        token: token ?? undefined,
        onBalanceUpdated: (data) => {
            setWallet((w: any) => (w ? { ...w, balance: data.balance, currency: data.currency } : { balance: data.balance, currency: data.currency }));
            if (token) {
                api.get('/trades/my-trades/open', token).then((data) => setOpenTrades(Array.isArray(data) ? data : [])).catch(() => {});
            }
        },
        onTradeClosed: () => {
            if (token) loadWallet();
        },
        onTradeDeleted: () => {
            if (token) loadWallet();
        },
    });

    useEffect(() => {
        if (!token) return;
        api.get<{ id: string; label: string; explorerName?: string }[]>('/wallet/deposit/crypto-networks', token).then(setCryptoNetworks).catch(() => {});
        api.get<typeof feeConfig>('/wallet/fees', token).then(setFeeConfig).catch(() => {});
    }, [token]);

    const loadWallet = async () => {
        try {
            const [walletData, historyData, intentsData, tradesData, requestsData] = await Promise.all([
                api.get('/wallet', token!),
                api.get('/ledger/my-transactions', token!).catch(() => []),
                api.get('/wallet/deposit/intents', token!).catch(() => []),
                api.get('/trades/my-trades/open', token!).catch(() => []),
                api.get('/wallet/withdrawal-requests', token!).catch(() => []),
            ]);
            setWallet(walletData);
            setHistory(Array.isArray(historyData) ? historyData : []);
            setPendingIntents(Array.isArray(intentsData) ? intentsData : []);
            setOpenTrades(Array.isArray(tradesData) ? tradesData : []);
            setWithdrawalRequests(Array.isArray(requestsData) ? requestsData : []);
        } catch (error) {
            console.error('Failed to load wallet:', error);
        }
    };

    // Calculate real-time equity
    const realTimeEquity = useRealTimeEquity(wallet?.balance || 0, openTrades);

    const closeDepositModal = () => {
        setDepositMethod(null);
        setDepositAmount('');
        setIntentResult(null);
        setCryptoNetwork(cryptoNetworks[0]?.id || 'POLYGON');
        setScreenshotFile(null);
        setCryptoAddressData(null);
        setShowCompletedButton(false);
    };

    const fetchCryptoAddress = async () => {
        if (depositMethod !== 'CRYPTO') return;
        setLoadingAddress(true);
        try {
            const data = await api.get(`/wallet/deposit/crypto-address/${cryptoNetwork}`, token!);
            setCryptoAddressData(data);
        } catch (error: any) {
            console.error('Failed to fetch crypto address:', error);
        } finally {
            setLoadingAddress(false);
        }
    };

    const createDepositIntent = async () => {
        const amount = parseFloat(depositAmount);
        if (amount < DEPOSIT_MIN || amount > DEPOSIT_MAX || isNaN(amount)) {
            toast.error(`Amount must be between $${DEPOSIT_MIN} and $${DEPOSIT_MAX}`);
            return;
        }
        
        // For crypto, fetch address first if not already loaded
        if (depositMethod === 'CRYPTO' && !cryptoAddressData) {
            await fetchCryptoAddress();
        }
        
        setCreating(true);
        try {
            const body: any = { method: depositMethod, amount, currency: 'USD' };
            if (depositMethod === 'CRYPTO') body.methodOption = cryptoNetwork;
            const result = await api.post('/wallet/deposit/intent', body, token!);
            setIntentResult(result);
            
            // If screenshot was selected before creating intent, upload it now
            if (screenshotFile && result._id) {
                try {
                    const formData = new FormData();
                    formData.append('file', screenshotFile);
                    const { url } = await api.uploadFile<{ url: string }>('/wallet/deposit/upload-screenshot', formData, token!);
                    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
                    await api.patch(`/wallet/deposit/intents/${result._id}`, { paymentScreenshotUrl: fullUrl }, token!);
                    setIntentResult((prev: any) => ({ ...prev, paymentScreenshotUrl: fullUrl }));
                    setScreenshotFile(null);
                    setShowCompletedButton(true);
                    toast.success('Screenshot uploaded successfully!');
                } catch (uploadError: any) {
                    console.error('Failed to upload screenshot:', uploadError);
                    toast.error('Deposit created but screenshot upload failed. You can upload it manually.');
                }
            }
            
            toast.success('Deposit instructions ready');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create deposit');
        } finally {
            setCreating(false);
        }
    };

    const uploadScreenshot = async () => {
        if (!screenshotFile || !intentResult?._id) {
            toast.error('Please select a screenshot file');
            return;
        }
        setUploadingScreenshot(true);
        try {
            const formData = new FormData();
            formData.append('file', screenshotFile);
            const { url } = await api.uploadFile<{ url: string }>('/wallet/deposit/upload-screenshot', formData, token!);
            const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
            await api.patch(`/wallet/deposit/intents/${intentResult._id}`, { paymentScreenshotUrl: fullUrl }, token!);
            setIntentResult((prev: any) => ({ ...prev, paymentScreenshotUrl: fullUrl }));
            setScreenshotFile(null);
            setShowCompletedButton(true);
            toast.success('Screenshot uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploadingScreenshot(false);
        }
    };

    const markDepositCompleted = async () => {
        if (!intentResult?.paymentScreenshotUrl) {
            toast.error('Please upload a payment screenshot first. Screenshot upload is mandatory for all deposits.');
            return;
        }
        
        try {
            // Submit for admin review (backend sets status to SUBMITTED)
            await api.patch(`/wallet/deposit/intents/${intentResult._id}`, { status: 'SUBMITTED' }, token!);
            toast.success('Deposit submitted for review. Admin will verify and credit your account.');
            setShowCompletedButton(false);
            closeDepositModal();
            loadWallet();
        } catch (error: any) {
            toast.error(error.message || 'Failed to mark deposit as completed');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        const walletAddress = (withdrawWalletAddress || '').trim();
        if (amount < WITHDRAW_MIN || amount > WITHDRAW_MAX || isNaN(amount)) {
            toast.error(`Amount must be between $${WITHDRAW_MIN} and $${WITHDRAW_MAX}`);
            return;
        }
        if (amount > (wallet?.balance || 0)) {
            toast.error('Insufficient balance');
            return;
        }
        if (walletAddress.length < 8) {
            toast.error('Please enter a valid wallet address (min 8 characters)');
            return;
        }
        setWithdrawSubmitting(true);
        try {
            await api.post('/wallet/withdraw', {
                amount,
                walletAddress,
                chain: withdrawChain,
            }, token!);
            setWithdrawAmount('');
            setWithdrawWalletAddress('');
            setWithdrawChain('POLYGON');
            setShowWithdrawModal(false);
            await loadWallet();
            toast.success('Withdrawal request submitted. Admin will process it within 24–48 hours.');
        } catch (error: any) {
            toast.error(error.message || error.response?.data?.message || 'Withdrawal request failed.');
        } finally {
            setWithdrawSubmitting(false);
        }
    };

    const exportToCSV = () => {
        const historyArray = Array.isArray(history) ? history : [];
        if (historyArray.length === 0) {
            toast.warning('No transactions to export');
            return;
        }
        const headers = ['Date & Time', 'Type', 'Description', 'Amount', 'Balance After'];
        const rows = historyArray.map(h => [
            new Date(h.createdAt).toLocaleString(),
            h.type.replace('_', ' '),
            h.description || '-',
            h.amount >= 0 ? `+$${Math.abs(h.amount).toFixed(2)}` : `-$${Math.abs(h.amount).toFixed(2)}`,
            `$${h.balanceAfter?.toFixed(2) || '0.00'}`
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('Exported successfully');
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
            <header className="relative h-14 sm:h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-brand-surface/80 backdrop-blur-md z-20">
                <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-10 flex-1 min-w-0">
                    <Link href="/dashboard" className="text-xl sm:text-2xl font-black italic tracking-tighter text-brand-gold flex-shrink-0">
                        <span className="text-white">Invest</span><span className="font-black text-brand-gold">lyin</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-xs sm:text-sm font-semibold text-brand-text-secondary">
                        <Link href="/dashboard" className="hover:text-white transition-colors px-1">Trading</Link>
                        <Link href="/wallet" className="text-brand-gold border-b-2 border-brand-gold pb-1 px-1">Wallet</Link>
                        <Link href="/news" className="hover:text-white transition-colors px-1">News</Link>
                        <Link href="/profile" className="hover:text-white transition-colors px-1">Account</Link>
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
                <div className="hidden md:flex text-right pr-2 sm:pr-4 md:pr-6 border-r border-white/10">
                    <div>
                        <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase mb-0.5 sm:mb-1">Balance</p>
                        <p className="text-sm sm:text-base md:text-lg font-bold">${wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                    </div>
                </div>
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
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-gold bg-brand-gold/10 border-brand-gold"
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
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    Account
                                </Link>
                            </nav>
                            <div className="px-4 py-3 border-t border-white/10">
                                <p className="text-[10px] text-brand-text-secondary uppercase mb-1">Balance</p>
                                <p className="text-lg font-bold text-white">${wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                            </div>
                        </div>
                    </>
                )}
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Account Balance</h1>
                            <p className="text-brand-text-secondary text-sm sm:text-base md:text-lg">Deposit via Crypto, Bank Transfer, or Card</p>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="text-xs sm:text-sm text-brand-text-secondary uppercase mb-1 sm:mb-2 tracking-wider">Total Balance</p>
                            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-gold">
                                ${realTimeEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                        <div className="card rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10 hover:border-brand-gold/30 transition-colors cursor-pointer" onClick={() => { setDepositMethod('CRYPTO'); setIntentResult(null); setCryptoAddressData(null); }}>
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg font-bold">Crypto</h3>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <span className="text-lg sm:text-xl">₿</span>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">USDT, BTC, ETH. Min ${DEPOSIT_MIN}</p>
                            <span className="text-brand-gold text-xs sm:text-sm font-semibold">Deposit with Crypto →</span>
                        </div>
                        <div className="card rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10 hover:border-brand-gold/30 transition-colors cursor-pointer" onClick={() => { setDepositMethod('BANK'); setIntentResult(null); }}>
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg font-bold">Bank Transfer</h3>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">SEPA / Wire. Use your reference</p>
                            <span className="text-brand-gold text-xs sm:text-sm font-semibold">Deposit via Bank →</span>
                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mt-2 sm:mt-3 text-center">Coming Soon</p>
                        </div>
                        <div className="card rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10 hover:border-brand-gold/30 transition-colors cursor-pointer" onClick={() => { setDepositMethod('CARD'); setIntentResult(null); }}>
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg font-bold">Card</h3>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Visa, Mastercard. Instant</p>
                            <span className="text-brand-gold text-xs sm:text-sm font-semibold">Pay with Card →</span>
                        </div>
                        <div className="card rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <h3 className="text-base sm:text-lg font-bold">Withdraw</h3>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-red/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">To your bank account</p>
                            <button onClick={() => setShowWithdrawModal(true)} className="w-full btn-danger py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm">
                                Withdraw Now
                            </button>
                        </div>
                    </div>
                </div>

                {pendingIntents.length > 0 && (
                    <div className="card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Pending Deposits</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Upload a screenshot of your payment for each deposit. Admin will verify and credit your account.</p>
                        <div className="space-y-2">
                            {pendingIntents.map((intent: any) => (
                                <div key={intent._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10 gap-2">
                                    <div className="flex-1">
                                        <span className="font-semibold text-sm sm:text-base">${intent.amount?.toFixed(2)}</span>
                                        <span className="text-brand-text-secondary text-xs sm:text-sm ml-2">via {intent.method} · Ref: {intent.reference}</span>
                                        {intent.paymentScreenshotUrl && <span className="ml-2 text-xs text-brand-green block sm:inline">Screenshot uploaded</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {withdrawalRequests.length > 0 && (
                    <div className="card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Withdrawal Requests</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Status of your withdrawal requests. Pending requests are processed within 24–48 hours.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                                <thead>
                                    <tr className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase border-b border-white/10">
                                        <th className="px-3 py-2 text-left">Amount</th>
                                        <th className="px-3 py-2 text-left hidden sm:table-cell">Fee</th>
                                        <th className="px-3 py-2 text-left">Net</th>
                                        <th className="px-3 py-2 text-left">Chain</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-left">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawalRequests.map((req: any) => (
                                        <tr key={req._id} className="border-b border-white/5">
                                            <td className="px-3 py-2 font-mono">${(req.amount ?? 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 font-mono hidden sm:table-cell">${(req.fee ?? 0).toFixed(2)}</td>
                                            <td className="px-3 py-2 font-mono text-brand-gold">${(req.netAmount ?? 0).toFixed(2)}</td>
                                            <td className="px-3 py-2">{req.chain ?? '-'}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`badge text-[10px] ${req.status === 'PENDING' ? 'badge-warning' : req.status === 'COMPLETED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-info'}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[10px]">{req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="card rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-brand-surface/40 gap-3">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold mb-1">Transaction History</h2>
                            <p className="text-xs sm:text-sm text-brand-text-secondary">All account transactions</p>
                        </div>
                        <button onClick={exportToCSV} className="text-xs sm:text-sm text-brand-gold hover:underline font-semibold">Export CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full trade-table text-xs sm:text-sm">
                            <thead>
                                <tr className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase border-b border-white/10 bg-brand-surface/40">
                                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left">Date & Time</th>
                                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left">Type</th>
                                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left hidden sm:table-cell">Description</th>
                                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right">Amount</th>
                                    <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right hidden md:table-cell">Balance After</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Array.isArray(history) ? history : []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 sm:px-6 py-8 sm:py-12 text-center text-brand-text-secondary text-xs sm:text-sm">No transactions yet</td>
                                    </tr>
                                ) : (
                                    (Array.isArray(history) ? history : []).map((h) => (
                                        <tr key={h._id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-mono text-[10px] sm:text-xs text-white">{new Date(h.createdAt).toLocaleString()}</td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                                                <span className={`badge text-[10px] sm:text-xs ${h.type === 'DEPOSIT' || h.type === 'ADMIN_ADJUSTMENT' ? 'badge-success' : h.type === 'WITHDRAWAL' ? 'badge-danger' : 'badge-info'}`}>
                                                    {h.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-brand-text-secondary text-[10px] sm:text-xs hidden sm:table-cell">{h.description || '-'}</td>
                                            <td className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right font-bold font-mono text-xs sm:text-sm ${h.amount >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {h.amount >= 0 ? '+' : ''}${Math.abs(h.amount).toFixed(2)}
                                            </td>
                                            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-right font-mono font-semibold text-xs sm:text-sm hidden md:table-cell">${h.balanceAfter?.toFixed(2) || '0.00'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Deposit Modal (Crypto / Bank / Card) */}
            {depositMethod && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="card w-full max-w-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold">
                                {depositMethod === 'CRYPTO' && 'Deposit with Crypto'}
                                {depositMethod === 'BANK' && 'Bank Transfer'}
                                {depositMethod === 'CARD' && 'Pay with Card'}
                            </h2>
                            <button onClick={closeDepositModal} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {!intentResult ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">Amount (USD)</label>
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        placeholder={`Min $${DEPOSIT_MIN} - Max $${DEPOSIT_MAX}`}
                                        className="w-full input-field rounded-lg px-4 py-3 text-lg font-mono"
                                        min={DEPOSIT_MIN}
                                        max={DEPOSIT_MAX}
                                        step="0.01"
                                    />
                                </div>
                                {depositMethod === 'CRYPTO' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">Network</label>
                                        <select 
                                            value={cryptoNetwork} 
                                            onChange={e => {
                                                setCryptoNetwork(e.target.value);
                                                setCryptoAddressData(null);
                                            }} 
                                            className="w-full input-field rounded-lg px-4 py-3"
                                        >
                                            {cryptoNetworks.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                {/* Show wallet address immediately after clicking deposit for crypto */}
                                {depositMethod === 'CRYPTO' && depositAmount && parseFloat(depositAmount) >= DEPOSIT_MIN && (
                                    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                                        {loadingAddress ? (
                                            <div className="text-center py-3 sm:py-4">
                                                <div className="spinner w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2"></div>
                                                <p className="text-xs sm:text-sm text-brand-text-secondary">Loading wallet address...</p>
                                            </div>
                                        ) : cryptoAddressData ? (
                                            <>
                                                <p className="text-xs sm:text-sm font-semibold text-white mb-2">{cryptoAddressData.network} Wallet Address</p>
                                                <div className="flex justify-center mb-2 sm:mb-3">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(cryptoAddressData.address)}`}
                                                        alt="QR Code"
                                                        className="rounded-lg border border-white/10 w-24 h-24 sm:w-32 sm:h-32"
                                                        width={120}
                                                        height={120}
                                                    />
                                                </div>
                                                <p className="font-mono text-[10px] sm:text-xs break-all mb-2 text-center">{cryptoAddressData.address}</p>
                                                <div className="flex justify-center">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => copyToClipboard(cryptoAddressData.address, 'Address')} 
                                                        className="px-3 py-1.5 bg-brand-gold/20 text-brand-gold rounded-lg text-xs font-semibold hover:bg-brand-gold/30 transition-colors"
                                                    >
                                                        Copy Address
                                                    </button>
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary mt-2 sm:mt-3 text-center">
                                                    Send exactly ${depositAmount} worth of {cryptoNetwork} to this address
                                                </p>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={fetchCryptoAddress}
                                                className="w-full py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-xs sm:text-sm font-semibold hover:bg-brand-gold/30 transition-colors"
                                            >
                                                Show Wallet Address
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Screenshot upload section for crypto - shown in initial form */}
                                {depositMethod === 'CRYPTO' && depositAmount && parseFloat(depositAmount) >= DEPOSIT_MIN && cryptoAddressData && (
                                    <div className="border-t border-white/10 pt-3 sm:pt-4">
                                        <div className="p-3 sm:p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30 mb-3 sm:mb-4">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-xs sm:text-sm font-bold text-white mb-1">Payment Screenshot Required *</p>
                                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary">After sending your crypto payment, you must upload a screenshot of the transaction for verification. Your deposit will not be processed without it.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs sm:text-sm font-semibold text-white mb-2">
                                                Upload Payment Screenshot <span className="text-brand-red">*</span>
                                            </label>
                                            <input 
                                                type="file" 
                                                accept="image/*,.pdf" 
                                                onChange={e => setScreenshotFile(e.target.files?.[0] || null)} 
                                                required
                                                className="block w-full text-xs sm:text-sm text-brand-text-secondary file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:bg-brand-gold/20 file:text-brand-gold file:font-semibold file:text-xs file:cursor-pointer hover:file:bg-brand-gold/30 transition-colors" 
                                            />
                                            {screenshotFile && (
                                                <div className="mt-2 sm:mt-3">
                                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-2">Selected: {screenshotFile.name}</p>
                                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-2">You can upload the screenshot now or after creating the deposit. It will be saved when you create the deposit intent.</p>
                                                </div>
                                            )}
                                            {!screenshotFile && (
                                                <p className="mt-2 text-[10px] sm:text-xs text-brand-red">⚠️ Screenshot upload is mandatory. Please upload a screenshot of your crypto payment transaction.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                                    <button onClick={closeDepositModal} className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm">Cancel</button>
                                    <button onClick={createDepositIntent} disabled={creating || !depositAmount} className="flex-1 btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50">
                                        {creating ? 'Creating...' : 'Create Deposit'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-brand-green/10 border border-brand-green/20">
                                    <p className="text-xs sm:text-sm text-brand-text-secondary mb-1">Amount</p>
                                    <p className="text-xl sm:text-2xl font-bold text-brand-green">${intentResult.amount?.toFixed(2)} USD</p>
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary mt-1 sm:mt-2">Reference: <span className="font-mono text-white">{intentResult.reference}</span></p>
                                </div>

                                {depositMethod === 'CRYPTO' && intentResult.cryptoAddress && (
                                    <>
                                        <div className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-base sm:text-lg font-bold mb-1">{intentResult.networkLabel || intentResult.network} address</p>
                                            <p className="text-xs sm:text-sm text-brand-text-secondary mb-3 sm:mb-4">Use this to receive assets on {intentResult.networkLabel || intentResult.network}.</p>
                                            <div className="flex justify-center mb-3 sm:mb-4">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(intentResult.cryptoAddress)}`}
                                                    alt="QR Code"
                                                    className="rounded-lg border border-white/10 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48"
                                                    width={150}
                                                    height={150}
                                                />
                                            </div>
                                            <p className="font-mono text-[10px] sm:text-xs break-all mb-2 sm:mb-3">{intentResult.cryptoAddress}</p>
                                            <div className="flex justify-center">
                                                <button type="button" onClick={() => copyToClipboard(intentResult.cryptoAddress, 'Address')} className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-brand-gold/20 text-brand-gold rounded-lg text-xs sm:text-sm font-semibold hover:bg-brand-gold/30 transition-colors">
                                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m-3 0h3M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                                    Copy address
                                                </button>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mt-2 sm:mt-3">Reference (memo): <span className="font-mono text-white">{intentResult.reference}</span> — include in transfer if required.</p>
                                        </div>
                                        {feeConfig.depositFeePercent !== undefined && feeConfig.depositFeePercent > 0 && (
                                            <p className="text-xs text-brand-text-secondary">Deposit fee: {feeConfig.depositFeePercent}%. You will receive ${(intentResult.amount * (1 - feeConfig.depositFeePercent / 100)).toFixed(2)} after confirmation.</p>
                                        )}
                                        
                                        {/* Reminder about screenshot requirement */}
                                        <div className="p-2 sm:p-3 rounded-lg bg-brand-gold/5 border border-brand-gold/20">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary">
                                                <span className="font-semibold text-brand-gold">⚠️ Important:</span> After sending your crypto payment, you <span className="font-bold text-white">must</span> upload a screenshot of the transaction for verification. Your deposit will not be processed without it.
                                            </p>
                                        </div>
                                        
                                        <div className="border-t border-white/10 pt-3 sm:pt-4">
                                            <div className="p-3 sm:p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30 mb-3 sm:mb-4">
                                                <div className="flex items-start gap-2">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <div className="flex-1">
                                                        <p className="text-xs sm:text-sm font-bold text-white mb-1">Payment Screenshot Required *</p>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">You must upload a screenshot of your payment transaction for verification. Your deposit will not be processed without it.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-semibold text-white mb-2">
                                                    Upload Payment Screenshot <span className="text-brand-red">*</span>
                                                </label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf" 
                                                    onChange={e => setScreenshotFile(e.target.files?.[0] || null)} 
                                                    required
                                                    className="block w-full text-xs sm:text-sm text-brand-text-secondary file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:bg-brand-gold/20 file:text-brand-gold file:font-semibold file:text-xs file:cursor-pointer hover:file:bg-brand-gold/30 transition-colors" 
                                                />
                                                {screenshotFile && (
                                                    <div className="mt-2 sm:mt-3">
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-2">Selected: {screenshotFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={uploadScreenshot} 
                                                            disabled={uploadingScreenshot} 
                                                            className="w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
                                                        </button>
                                                    </div>
                                                )}
                                                {intentResult.paymentScreenshotUrl && (
                                                    <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-brand-green/10 border border-brand-green/30">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-xs sm:text-sm font-semibold text-brand-green">Screenshot uploaded successfully!</p>
                                                        </div>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">Your payment screenshot has been uploaded. Admin will verify and credit your account.</p>
                                                        {showCompletedButton && (
                                                            <button
                                                                type="button"
                                                                onClick={markDepositCompleted}
                                                                className="mt-3 w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm"
                                                            >
                                                                Mark as Completed
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {!intentResult.paymentScreenshotUrl && !screenshotFile && (
                                                    <p className="mt-2 text-[10px] sm:text-xs text-brand-red">⚠️ Screenshot upload is mandatory. Please upload a screenshot of your payment transaction.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {depositMethod === 'BANK' && intentResult.bankDetails && (
                                    <>
                                        <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-xs sm:text-sm font-semibold text-white">Bank details</p>
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">Beneficiary</p>
                                                <div className="flex justify-between items-center gap-2"><span className="font-mono text-xs sm:text-sm break-all">{intentResult.bankDetails.name}</span><button type="button" onClick={() => copyToClipboard(intentResult.bankDetails.name, 'Name')} className="text-brand-gold text-xs flex-shrink-0">Copy</button></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">IBAN</p>
                                                <div className="flex justify-between items-center gap-2"><span className="font-mono text-[10px] sm:text-xs break-all">{intentResult.bankDetails.iban}</span><button type="button" onClick={() => copyToClipboard(intentResult.bankDetails.iban, 'IBAN')} className="text-brand-gold text-xs flex-shrink-0">Copy</button></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">SWIFT/BIC</p>
                                                <div className="flex justify-between items-center gap-2"><span className="font-mono text-[10px] sm:text-xs break-all">{intentResult.bankDetails.swift}</span><button type="button" onClick={() => copyToClipboard(intentResult.bankDetails.swift, 'SWIFT')} className="text-brand-gold text-xs flex-shrink-0">Copy</button></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">{intentResult.bankDetails.referenceLabel}</p>
                                                <div className="flex justify-between items-center gap-2"><span className="font-mono font-bold text-brand-gold text-xs sm:text-sm break-all">{intentResult.bankDetails.reference}</span><button type="button" onClick={() => copyToClipboard(intentResult.bankDetails.reference, 'Reference')} className="text-brand-gold text-xs flex-shrink-0">Copy</button></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-white/10 pt-3 sm:pt-4">
                                            <div className="p-3 sm:p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30 mb-3 sm:mb-4">
                                                <div className="flex items-start gap-2">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <div className="flex-1">
                                                        <p className="text-xs sm:text-sm font-bold text-white mb-1">Payment Screenshot Required *</p>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">You must upload a screenshot of your bank transfer for verification. Your deposit will not be processed without it.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-semibold text-white mb-2">
                                                    Upload Payment Screenshot <span className="text-brand-red">*</span>
                                                </label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf" 
                                                    onChange={e => setScreenshotFile(e.target.files?.[0] || null)} 
                                                    required
                                                    className="block w-full text-xs sm:text-sm text-brand-text-secondary file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:bg-brand-gold/20 file:text-brand-gold file:font-semibold file:text-xs file:cursor-pointer hover:file:bg-brand-gold/30 transition-colors" 
                                                />
                                                {screenshotFile && (
                                                    <div className="mt-2 sm:mt-3">
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-2">Selected: {screenshotFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={uploadScreenshot} 
                                                            disabled={uploadingScreenshot} 
                                                            className="w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
                                                        </button>
                                                    </div>
                                                )}
                                                {intentResult.paymentScreenshotUrl && (
                                                    <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-brand-green/10 border border-brand-green/30">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-xs sm:text-sm font-semibold text-brand-green">Screenshot uploaded successfully!</p>
                                                        </div>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">Your payment screenshot has been uploaded. Admin will verify and credit your account.</p>
                                                        {showCompletedButton && (
                                                            <button
                                                                type="button"
                                                                onClick={markDepositCompleted}
                                                                className="mt-3 w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm"
                                                            >
                                                                Mark as Completed
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {!intentResult.paymentScreenshotUrl && !screenshotFile && (
                                                    <p className="mt-2 text-[10px] sm:text-xs text-brand-red">⚠️ Screenshot upload is mandatory. Please upload a screenshot of your bank transfer.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {depositMethod === 'CARD' && (
                                    <>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-sm text-brand-text-secondary mb-3">Pay with card via SumUp. Your card details are never stored.</p>
                                            {intentResult.cardPaymentUrl ? (
                                                <>
                                                    <a href={intentResult.cardPaymentUrl} target="_blank" rel="noopener noreferrer" className="block w-full btn-success py-3 rounded-lg font-semibold text-center mb-4">
                                                        Pay with SumUp
                                                    </a>
                                                    <p className="text-xs text-brand-text-secondary text-center">You will be redirected to SumUp's secure payment page</p>
                                                </>
                                            ) : (
                                                <div className="p-4 rounded-lg bg-brand-red/10 border border-brand-red/20">
                                                    <p className="text-sm text-brand-red font-semibold mb-2">Card payment not available</p>
                                                    <p className="text-xs text-brand-text-secondary">
                                                        Card payments are not currently configured. Please use Crypto or Bank Transfer for deposits.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="border-t border-white/10 pt-4">
                                            <div className="p-3 sm:p-4 rounded-lg bg-brand-gold/10 border border-brand-gold/30 mb-3 sm:mb-4">
                                                <div className="flex items-start gap-2">
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <div className="flex-1">
                                                        <p className="text-xs sm:text-sm font-bold text-white mb-1">Payment Screenshot Required *</p>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">You must upload a screenshot of your card payment for verification. Your deposit will not be processed without it.</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-semibold text-white mb-2">
                                                    Upload Payment Screenshot <span className="text-brand-red">*</span>
                                                </label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf" 
                                                    onChange={e => setScreenshotFile(e.target.files?.[0] || null)} 
                                                    required
                                                    className="block w-full text-xs sm:text-sm text-brand-text-secondary file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:bg-brand-gold/20 file:text-brand-gold file:font-semibold file:text-xs file:cursor-pointer hover:file:bg-brand-gold/30 transition-colors" 
                                                />
                                                {screenshotFile && (
                                                    <div className="mt-2 sm:mt-3">
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-2">Selected: {screenshotFile.name}</p>
                                                        <button 
                                                            type="button" 
                                                            onClick={uploadScreenshot} 
                                                            disabled={uploadingScreenshot} 
                                                            className="w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
                                                        </button>
                                                    </div>
                                                )}
                                                {intentResult.paymentScreenshotUrl && (
                                                    <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-brand-green/10 border border-brand-green/30">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-xs sm:text-sm font-semibold text-brand-green">Screenshot uploaded successfully!</p>
                                                        </div>
                                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary">Your payment screenshot has been uploaded. Admin will verify and credit your account.</p>
                                                        {showCompletedButton && (
                                                            <button
                                                                type="button"
                                                                onClick={markDepositCompleted}
                                                                className="mt-3 w-full btn-success py-2.5 sm:py-3 rounded-lg font-semibold text-sm"
                                                            >
                                                                Mark as Completed
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {!intentResult.paymentScreenshotUrl && !screenshotFile && (
                                                    <p className="mt-2 text-[10px] sm:text-xs text-brand-red">⚠️ Screenshot upload is mandatory. Please upload a screenshot of your card payment.</p>
                                                )}
                                            </div>
                                        </div>
                                        <button type="button" onClick={closeDepositModal} className="w-full py-3 bg-white/5 rounded-lg font-semibold">Close</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="card w-full max-w-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold">Withdraw Funds</h2>
                            <button onClick={() => setShowWithdrawModal(false)} className="text-brand-text-secondary hover:text-white">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Amount (USD)</label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    placeholder={`Min $${WITHDRAW_MIN} - Max $${WITHDRAW_MAX}`}
                                    className="w-full input-field rounded-lg px-4 py-3 text-lg font-mono"
                                    min={WITHDRAW_MIN}
                                    max={Math.min(WITHDRAW_MAX, wallet?.balance || 0)}
                                    step="0.01"
                                />
                                <p className="text-xs text-brand-text-secondary mt-2">Available: ${(wallet?.balance ?? 0).toFixed(2)}</p>
                                {feeConfig.withdrawalFeePercent !== undefined && feeConfig.withdrawalFeePercent > 0 && withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                                    (() => {
                                        const amt = parseFloat(withdrawAmount);
                                        const fee = (amt * feeConfig.withdrawalFeePercent) / 100;
                                        const net = amt - fee;
                                        return (
                                            <p className="text-xs text-amber-400 mt-1">
                                                Withdrawal fee: {feeConfig.withdrawalFeePercent}%. Fee: ${fee.toFixed(2)} — You will receive: ${net.toFixed(2)}
                                            </p>
                                        );
                                    })()
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Network / Chain</label>
                                <select
                                    value={withdrawChain}
                                    onChange={e => setWithdrawChain(e.target.value)}
                                    className="w-full input-field rounded-lg px-4 py-3"
                                >
                                    {cryptoNetworks.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Wallet Address</label>
                                <input
                                    type="text"
                                    value={withdrawWalletAddress}
                                    onChange={e => setWithdrawWalletAddress(e.target.value)}
                                    placeholder="Enter your crypto wallet address"
                                    className="w-full input-field rounded-lg px-4 py-3 font-mono text-sm"
                                    maxLength={256}
                                />
                                <p className="text-xs text-brand-text-secondary mt-1">Funds will be sent to this address on the selected network. Double-check before submitting.</p>
                            </div>
                            <div className="p-3 rounded-lg bg-brand-gold/10 border border-brand-gold/20">
                                <p className="text-xs sm:text-sm text-brand-gold font-semibold mb-1">Processing Time</p>
                                <p className="text-xs text-brand-text-secondary">Withdrawals are processed within 24–48 hours after admin verification.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                                <button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold text-sm">Cancel</button>
                                <button onClick={handleWithdraw} disabled={withdrawSubmitting || !withdrawWalletAddress.trim()} className="flex-1 btn-danger py-2.5 sm:py-3 rounded-lg font-semibold text-sm disabled:opacity-50">
                                    {withdrawSubmitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
