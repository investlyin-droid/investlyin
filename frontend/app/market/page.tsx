'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import { useRealTimeEquity } from '@/hooks/useRealTimeEquity';
import { useTradeSocket } from '@/hooks/useTradeSocket';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function MarketPage() {
    const router = useRouter();
    const { user, token, logout, isLoading } = useAuth();
    const toast = useToast();
    const [marketCategory, setMarketCategory] = useState<'all' | 'forex' | 'metals' | 'crypto' | 'energies' | 'stocks' | 'indices'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'spread'>('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [wallet, setWallet] = useState<any>(null);
    const [openTrades, setOpenTrades] = useState<any[]>([]);

    const { prices, isConnected: pricesConnected } = useMarketSocket();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) {
            // Load wallet and open trades for real-time equity calculation
            api.get('/wallet', token).then(setWallet).catch(() => { });
            api.get('/trades/my-trades/open', token).then((data) => setOpenTrades(Array.isArray(data) ? data : [])).catch(() => { });
        }
    }, [token]);

    // Listen for real-time balance updates
    useTradeSocket({
        userId: user?.id,
        token: token ?? undefined,
        onBalanceUpdated: (data) => {
            setWallet((w: any) => (w ? { ...w, balance: data.balance, currency: data.currency } : { balance: data.balance, currency: data.currency }));
            // Reload open trades when balance updates (trade might have closed)
            if (token) {
                api.get('/trades/my-trades/open', token).then((data) => setOpenTrades(Array.isArray(data) ? data : [])).catch(() => { });
            }
        },
        onTradeClosed: () => {
            // Reload wallet and trades when a trade is closed
            if (token) {
                api.get('/wallet', token).then(setWallet).catch(() => { });
                api.get('/trades/my-trades/open', token).then((data) => setOpenTrades(Array.isArray(data) ? data : [])).catch(() => { });
            }
        },
    });

    // Calculate real-time equity
    const realTimeEquity = useRealTimeEquity(wallet?.balance || 0, openTrades);

    // Helper function to categorize symbols
    const getSymbolCategory = useCallback((symbol: string): 'forex' | 'metals' | 'crypto' | 'energies' | 'stocks' | 'indices' => {
        const sym = symbol.toUpperCase();

        // Metals
        if (sym.startsWith('XAU') || sym.startsWith('XAG') || sym.startsWith('XPT') || sym.startsWith('XPD')) {
            return 'metals';
        }

        // Cryptocurrencies
        if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE', 'MATIC', 'LINK', 'AVAX', 'UNI'].some(c => sym.includes(c))) {
            return 'crypto';
        }

        // Energies
        if (sym.includes('OIL') || sym.includes('GAS') || sym.includes('CRUDE') || sym.includes('BRENT') || sym.includes('WTI')) {
            return 'energies';
        }

        // Stocks (common stock symbols)
        if (['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'].some(s => sym.includes(s))) {
            return 'stocks';
        }

        // Indices
        if (sym.includes('SPX') || sym.includes('NAS') || sym.includes('DJI') || sym.includes('FTSE') || sym.includes('DAX') || sym.includes('NIKKEI')) {
            return 'indices';
        }

        // Default to Forex
        return 'forex';
    }, []);

    // Filter and sort prices
    const filteredAndSortedPrices = useCallback(() => {
        if (!Array.isArray(prices) || prices.length === 0) return [];

        let filtered = prices.filter((price: any) => {
            // Category filter
            if (marketCategory !== 'all') {
                const category = getSymbolCategory(price.symbol);
                if (category !== marketCategory) return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toUpperCase();
                if (!price.symbol.toUpperCase().includes(query)) return false;
            }

            return true;
        });

        // Sort
        filtered.sort((a: any, b: any) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'symbol':
                    aValue = a.symbol;
                    bValue = b.symbol;
                    break;
                case 'change':
                    const aChange = ((a.ask - a.bid) / a.bid) * 100;
                    const bChange = ((b.ask - b.bid) / b.bid) * 100;
                    aValue = aChange;
                    bValue = bChange;
                    break;
                case 'spread':
                    aValue = a.ask - a.bid;
                    bValue = b.ask - b.bid;
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [prices, marketCategory, searchQuery, sortBy, sortOrder, getSymbolCategory]);

    const formatPrice = useCallback((price: number, symbol: string) => {
        const category = getSymbolCategory(symbol);
        if (category === 'forex' && !symbol.includes('JPY')) return price.toFixed(5);
        if (category === 'forex' && symbol.includes('JPY')) return price.toFixed(2);
        if (category === 'metals' && symbol.includes('XAU')) return price.toFixed(2);
        if (category === 'metals' && symbol.includes('XAG')) return price.toFixed(3);
        if (category === 'crypto' && (symbol.includes('BTC') || symbol.includes('ETH'))) return price.toFixed(2);
        if (category === 'crypto') return price.toFixed(4);
        if (category === 'energies') return price.toFixed(2);
        if (category === 'stocks') return price.toFixed(2);
        if (category === 'indices') return price.toFixed(2);
        return price.toFixed(5);
    }, [getSymbolCategory]);

    const getSymbolLogo = useCallback((symbol: string) => {
        const s = symbol.split('.')[0].toLowerCase();
        // TradingView logo API pattern
        return `https://s3-symbol-logo.tradingview.com/${s}--big.svg`;
    }, []);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const marketData = filteredAndSortedPrices();

    return (
        <div className="min-h-screen flex flex-col bg-brand-obsidian text-white">
            {/* Header */}
            <header className="relative h-14 sm:h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 bg-brand-surface/80 backdrop-blur-md z-20">
                <div className="flex items-center space-x-3 sm:space-x-6 md:space-x-10 min-w-0 flex-1 md:flex-initial">
                    <Link href="/dashboard" className="text-xl sm:text-2xl font-black italic tracking-tighter text-brand-gold flex-shrink-0">
                        <span className="text-white">Invest</span><span className="font-black text-brand-gold">lyin</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-4 lg:space-x-8 text-xs sm:text-sm font-semibold text-brand-text-secondary">
                        <Link href="/dashboard" className="hover:text-brand-gold transition-colors">Trading</Link>
                        <Link href="/market" className="text-brand-gold border-b-2 border-brand-gold pb-1">Markets</Link>
                        <Link href="/wallet" className="hover:text-brand-gold transition-colors">Wallet</Link>
                        <Link href="/news" className="hover:text-brand-gold transition-colors">News</Link>
                        <Link href="/profile" className="hover:text-brand-gold transition-colors">Account</Link>
                    </nav>
                </div>

                {/* Mobile menu button - right corner */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden ml-auto p-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                >
                    {mobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>

                <div className="hidden md:flex items-center space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8 flex-shrink-0">
                    <div className="hidden lg:flex flex-col items-end pr-4 md:pr-6 border-r border-white/10">
                        <span className="text-[10px] sm:text-xs text-brand-text-secondary uppercase mb-0.5 sm:mb-1 tracking-wider">Balance</span>
                        <span className="text-base sm:text-lg md:text-xl font-bold text-white">
                            ${realTimeEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs sm:text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[10px] sm:text-xs text-brand-text-secondary">{user?.role?.toUpperCase()}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] touch-manipulation"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <>
                        <div
                            className="md:hidden fixed inset-0 bg-black/50 z-30"
                            onClick={() => setMobileMenuOpen(false)}
                        ></div>
                        <div className="md:hidden absolute top-full left-0 right-0 bg-brand-surface border-b border-white/10 z-40 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto">
                            <nav className="flex flex-col">
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    Trading
                                </Link>
                                <Link
                                    href="/market"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-gold active:bg-white/10 border-brand-gold"
                                >
                                    Markets
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
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
                                >
                                    Account
                                </Link>
                            </nav>
                            <div className="px-4 py-3 border-t border-white/10">
                                <div className="mb-3">
                                    <p className="text-[10px] text-brand-text-secondary uppercase mb-1 tracking-wider">Balance</p>
                                    <p className="text-lg font-bold text-white">
                                        ${realTimeEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-[10px] text-brand-text-secondary">{user?.role?.toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold text-white transition-colors min-h-[44px] touch-manipulation"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-grow overflow-auto pb-20 md:pb-0">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
                    {/* Page Header */}
                    <div className="mb-4 sm:mb-6 md:mb-8">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Live Markets</h1>
                                <p className="text-sm sm:text-base text-brand-text-secondary">Real-time market data for all trading instruments</p>
                            </div>
                            <div className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border ${pricesConnected ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-text-secondary/10 border-brand-text-secondary/30'}`}>
                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${pricesConnected ? 'bg-brand-green animate-pulse' : 'bg-brand-text-secondary'}`}></div>
                                <span className={`text-[10px] sm:text-xs font-semibold ${pricesConnected ? 'text-brand-green' : 'text-brand-text-secondary'}`}>{pricesConnected ? 'LIVE' : 'Connecting...'}</span>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                            {/* Search */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search instruments (e.g., EURUSD, BTC, Gold)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full input-field rounded-lg sm:rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-brand-surface/60 border border-white/20 focus:border-brand-gold/50"
                                />
                            </div>

                            {/* Sort */}
                            <div className="flex gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="input-field rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-brand-surface/60 border border-white/20 focus:border-brand-gold/50"
                                >
                                    <option value="symbol">Symbol</option>
                                    <option value="change">Change %</option>
                                    <option value="spread">Spread</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-brand-surface/60 border border-white/20 hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] touch-manipulation"
                                    aria-label="Toggle sort order"
                                >
                                    <svg className={`w-5 h-5 transition-transform ${sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Category Tabs - Horizontal Scroll on Mobile */}
                        <div className="overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="flex gap-2 min-w-max">
                                {[
                                    { id: 'all', label: 'All Markets', count: marketData.length },
                                    { id: 'forex', label: 'Forex', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'forex').length },
                                    { id: 'metals', label: 'Metals', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'metals').length },
                                    { id: 'crypto', label: 'Crypto', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'crypto').length },
                                    { id: 'energies', label: 'Energies', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'energies').length },
                                    { id: 'stocks', label: 'Stocks', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'stocks').length },
                                    { id: 'indices', label: 'Indices', count: marketData.filter((p: any) => getSymbolCategory(p.symbol) === 'indices').length },
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setMarketCategory(cat.id as any)}
                                        className={`px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${marketCategory === cat.id
                                            ? 'bg-brand-gold/20 text-brand-gold border-2 border-brand-gold/50 shadow-lg'
                                            : 'text-brand-text-secondary hover:text-white hover:bg-white/5 border-2 border-transparent'
                                            }`}
                                    >
                                        {cat.label} ({cat.count})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Market Data Table */}
                    <div className="bg-brand-surface/40 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                        {/* Table Header */}
                        <div className="hidden md:grid md:grid-cols-6 gap-4 px-4 md:px-6 py-3 md:py-4 bg-brand-surface/60 border-b border-white/10 sticky top-0 z-10">
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider">Symbol</div>
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider text-right">Bid</div>
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider text-right">Ask</div>
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider text-right">Spread</div>
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider text-right">Change %</div>
                            <div className="font-bold text-xs sm:text-sm text-brand-text-secondary uppercase tracking-wider text-center">Action</div>
                        </div>

                        {/* Market Data - Mobile Cards / Desktop Table */}
                        {marketData.length === 0 ? (
                            <div className="text-center py-12 sm:py-16 md:py-20">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <p className="text-brand-text-secondary text-base sm:text-lg font-medium">No market data available</p>
                                <p className="text-brand-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">{!pricesConnected ? 'Connecting to market data...' : 'Try adjusting your filters'}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {marketData.map((price: any) => {
                                    const change = ((price.ask - price.bid) / price.bid) * 100;
                                    const spread = price.ask - price.bid;
                                    const category = getSymbolCategory(price.symbol);

                                    return (
                                        <div
                                            key={price.symbol}
                                            className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-white/5 transition-colors"
                                        >
                                            {/* Mobile Card Layout */}
                                            <div className="md:hidden space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                                                            <img
                                                                src={getSymbolLogo(price.symbol)}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-base font-bold text-white">{price.symbol}</span>
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${category === 'forex' ? 'bg-blue-500/20 text-blue-400' :
                                                            category === 'metals' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                category === 'crypto' ? 'bg-purple-500/20 text-purple-400' :
                                                                    category === 'energies' ? 'bg-orange-500/20 text-orange-400' :
                                                                        category === 'stocks' ? 'bg-green-500/20 text-green-400' :
                                                                            'bg-pink-500/20 text-pink-400'
                                                            }`}>
                                                            {category.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm font-bold ${change >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-[10px] text-brand-text-secondary mb-1">Bid</p>
                                                        <p className="text-sm font-mono font-bold text-brand-green">{formatPrice(price.bid, price.symbol)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-brand-text-secondary mb-1">Ask</p>
                                                        <p className="text-sm font-mono font-bold text-brand-red">{formatPrice(price.ask, price.symbol)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                    <div>
                                                        <p className="text-[10px] text-brand-text-secondary mb-1">Spread</p>
                                                        <p className="text-xs font-mono font-semibold text-white">{formatPrice(spread, price.symbol)}</p>
                                                    </div>
                                                    <Link
                                                        href={`/dashboard?symbol=${price.symbol}`}
                                                        className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs transition-colors min-h-[36px] touch-manipulation"
                                                    >
                                                        Trade
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Desktop Table Layout */}
                                            <div className="hidden md:contents">
                                                <div className="flex items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                                                            <img
                                                                src={getSymbolLogo(price.symbol)}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-white">{price.symbol}</span>
                                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${category === 'forex' ? 'bg-blue-500/20 text-blue-400' :
                                                            category === 'metals' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                category === 'crypto' ? 'bg-purple-500/20 text-purple-400' :
                                                                    category === 'energies' ? 'bg-orange-500/20 text-orange-400' :
                                                                        category === 'stocks' ? 'bg-green-500/20 text-green-400' :
                                                                            'bg-pink-500/20 text-pink-400'
                                                            }`}>
                                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right font-mono font-bold text-brand-green text-sm">{formatPrice(price.bid, price.symbol)}</div>
                                                <div className="text-right font-mono font-bold text-brand-red text-sm">{formatPrice(price.ask, price.symbol)}</div>
                                                <div className="text-right font-mono font-semibold text-white text-sm">{formatPrice(spread, price.symbol)}</div>
                                                <div className={`text-right font-bold text-sm ${change >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                                </div>
                                                <div className="text-center">
                                                    <Link
                                                        href={`/dashboard?symbol=${price.symbol}`}
                                                        className="inline-block px-3 py-1.5 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs transition-colors"
                                                    >
                                                        Trade
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="mt-6 sm:mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="card rounded-xl p-4 sm:p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-brand-gold/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-white">100+ Instruments</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary">Trade Forex, Crypto, Metals, Energies, Stocks & Indices</p>
                        </div>
                        <div className="card rounded-xl p-4 sm:p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-white">Tight Spreads</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary">From 0.0 pips on major pairs and competitive spreads on all instruments</p>
                        </div>
                        <div className="card rounded-xl p-4 sm:p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-white">24/7 Trading</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-brand-text-secondary">Trade cryptocurrencies and major markets around the clock</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
