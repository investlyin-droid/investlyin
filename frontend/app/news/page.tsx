'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import TradingViewEconomicCalendar from '@/components/TradingViewEconomicCalendar';
import TradingViewEconomicMap from '@/components/TradingViewEconomicMap';
import TradingViewTimeline from '@/components/TradingViewTimeline';
import { api } from '@/lib/api';

export interface NewsItem {
    id: string;
    title: string;
    category: string;
    time: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    description: string;
    source?: string;
    url?: string;
}

const NEWS_CATEGORIES = ['ALL', 'ECONOMY', 'FOREX', 'CRYPTO', 'EQUITIES', 'COMMODITIES'] as const;

export default function NewsPage() {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [newsCategory, setNewsCategory] = useState<string>('ALL');

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user) return;
        setNewsLoading(true);
        setNewsError(null);
        api.get<NewsItem[]>('/news', token ?? undefined)
            .then((data) => setNewsItems(Array.isArray(data) ? data : []))
            .catch((err) => setNewsError(err?.message || 'Failed to load news'))
            .finally(() => setNewsLoading(false));
    }, [user, token]);


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
                        <Link href="/news" className="text-brand-gold border-b-2 border-brand-gold pb-1 px-1">News</Link>
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
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-gold bg-brand-gold/10 border-brand-gold"
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
                        </div>
                    </>
                )}
            </header>

            <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
                <div className="mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Market Intelligence</h1>
                    <p className="text-brand-text-secondary text-sm sm:text-base md:text-lg">Real-time global insights and economic performance data</p>
                </div>

                {/* Platform News Section - from backend (MarketAux, etc.) */}
                <div className="mb-6 sm:mb-8">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Latest Market News</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary">Curated financial news from our feeds (MarketAux and more)</p>
                    </div>
                    <div className="bg-brand-surface/40 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl p-3 sm:p-4 md:p-6">
                        {/* Category filter */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {NEWS_CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setNewsCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                                        newsCategory === cat
                                            ? 'bg-brand-gold text-brand-obsidian'
                                            : 'bg-white/10 text-brand-text-secondary hover:bg-white/15 hover:text-white'
                                    }`}
                                >
                                    {cat === 'ALL' ? 'All' : cat}
                                </button>
                            ))}
                        </div>
                        {newsLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="spinner w-10 h-10" />
                            </div>
                        )}
                        {!newsLoading && newsError && (
                            <p className="text-brand-red text-sm py-4">{newsError}</p>
                        )}
                        {!newsLoading && !newsError && newsItems.length === 0 && (
                            <p className="text-brand-text-secondary text-sm py-4">No news available. Check back later or ensure MARKETAUX_API_KEY is set in the backend.</p>
                        )}
                        {!newsLoading && !newsError && newsItems.length > 0 && (
                            <ul className="space-y-3 sm:space-y-4">
                                {(newsCategory === 'ALL'
                                    ? newsItems
                                    : newsItems.filter((n) => n.category === newsCategory)
                                ).map((item) => (
                                    <li key={item.id}>
                                        <article className="block p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded bg-white/10 text-brand-text-secondary">
                                                    {item.category}
                                                </span>
                                                <span className="text-[10px] sm:text-xs text-brand-text-secondary">{item.time}</span>
                                                {item.source && (
                                                    <span className="text-[10px] sm:text-xs text-brand-text-secondary">· {item.source}</span>
                                                )}
                                                <span
                                                    className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded ${
                                                        item.sentiment === 'BULLISH'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : item.sentiment === 'BEARISH'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-white/10 text-brand-text-secondary'
                                                    }`}
                                                >
                                                    {item.sentiment}
                                                </span>
                                            </div>
                                            <h3 className="text-base sm:text-lg font-bold text-white mb-1 line-clamp-2">
                                                {item.url ? (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-gold transition-colors">
                                                        {item.title}
                                                    </a>
                                                ) : (
                                                    item.title
                                                )}
                                            </h3>
                                            {item.description && (
                                                <p className="text-xs sm:text-sm text-brand-text-secondary line-clamp-2">{item.description}</p>
                                            )}
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Economic Calendar Section */}
                <div className="mb-6 sm:mb-8">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Economic Calendar</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary">Track important economic events, announcements, and indicators that impact markets</p>
                    </div>
                    <div className="bg-brand-surface/40 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="p-3 sm:p-4 md:p-6" style={{ minHeight: '550px', height: '550px' }}>
                            <TradingViewEconomicCalendar height={550} />
                        </div>
                    </div>
                </div>

                {/* Economic Map Section */}
                <div className="mb-6 sm:mb-8">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Global Economic Map</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary">Interactive visualization of key economic indicators across countries</p>
                    </div>
                    <div className="bg-brand-surface/40 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="p-3 sm:p-4 md:p-6">
                            <TradingViewEconomicMap theme="dark" height={500} />
                        </div>
                    </div>
                </div>

                {/* TradingView Timeline Section */}
                <div className="mb-6 sm:mb-8">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Market News & Stories</h2>
                        <p className="text-xs sm:text-sm text-brand-text-secondary">Real-time financial news and market stories from TradingView</p>
                    </div>
                    <div className="bg-brand-surface/40 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="p-3 sm:p-4 md:p-6" style={{ minHeight: '600px', height: '600px' }}>
                            <TradingViewTimeline height={600} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                    {/* Empty left column - Timeline is above */}
                    <div className="lg:col-span-2"></div>

                    {/* Sidebar */}
                    <aside className="space-y-4 sm:space-y-5">
                        {/* Market Summary */}
                        <div className="card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-white/10">
                            <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-5 md:mb-6 border-b border-white/10 pb-3 sm:pb-4">Quick Links</h3>
                            <div className="space-y-2 sm:space-y-3">
                                <Link href="/dashboard" className="block p-2.5 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    <p className="text-xs sm:text-sm font-semibold text-white">Trading Dashboard</p>
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary">View live prices and charts</p>
                                </Link>
                                <Link href="/wallet" className="block p-2.5 sm:p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    <p className="text-xs sm:text-sm font-semibold text-white">Wallet</p>
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary">Manage your funds</p>
                                </Link>
                            </div>
                        </div>

                        {/* Support */}
                        <div className="card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-brand-gold/20 bg-brand-gold/5">
                            <div className="text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-brand-gold/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2">Need Assistance?</h3>
                                <p className="text-xs sm:text-sm text-brand-text-secondary mb-4 sm:mb-6">Our institutional desk is available 24/7 for support</p>
                                <a 
                                    href="mailto:support@tradingplatform.com"
                                    className="block w-full py-2.5 sm:py-3 bg-brand-gold text-brand-obsidian font-bold rounded-lg sm:rounded-xl hover:opacity-90 transition-opacity text-center text-xs sm:text-sm"
                                >
                                    Contact Support
                                </a>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}


function MarketSummaryItem({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-brand-text-secondary">{label}</span>
            <div className="text-right">
                <p className="text-sm font-bold text-white">{value}</p>
                <p className={`text-xs font-semibold ${positive ? 'text-brand-green' : 'text-brand-red'}`}>
                    {change}
                </p>
            </div>
        </div>
    );
}
