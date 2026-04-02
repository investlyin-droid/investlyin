'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_URL } from '@/lib/api';
import Link from 'next/link';
import { LineSeries, type CandlestickData, type Time, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import { useTradeSocket } from '@/hooks/useTradeSocket';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token, logout, isLoading } = useAuth();
    const toast = useToast();
    const [wallet, setWallet] = useState<any>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [trades, setTrades] = useState<any[]>([]);
    const [allTrades, setAllTrades] = useState<any[]>([]);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [orderForm, setOrderForm] = useState({ symbol: 'EURUSD', direction: 'BUY' as 'BUY' | 'SELL', lotSize: 0.01, orderType: 'LIMIT' as 'LIMIT' | 'STOP', limitPrice: '', triggerPrice: '' });
    const [orderSubmitting, setOrderSubmitting] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
    const [lotSize, setLotSize] = useState(0.01);
    const [sl, setSl] = useState<string>('');
    const [tp, setTp] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'orders'>('positions');
    const TIMEFRAME_OPTIONS = [
        { value: 'M1' as const, label: '1m' },
        { value: 'M2' as const, label: '2m' },
        { value: 'M5' as const, label: '5m' },
        { value: 'M15' as const, label: '15m' },
        { value: 'M30' as const, label: '30m' },
        { value: 'D1' as const, label: '1D' },
        { value: 'W1' as const, label: '1W' },
        { value: 'MN1' as const, label: '1M' },
    ];
    type TimeframeValue = typeof TIMEFRAME_OPTIONS[number]['value'];
    const [timeframe, setTimeframe] = useState<TimeframeValue>('M5');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [symbolSelectorOpen, setSymbolSelectorOpen] = useState(false);
    const [tradingPanelOpen, setTradingPanelOpen] = useState(false);
    const [showTradeConfirm, setShowTradeConfirm] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [pendingTrade, setPendingTrade] = useState<{
        direction: 'BUY' | 'SELL';
        symbol: string;
        lotSize: number;
        entryPrice: number;
        requiredMargin: number;
        stopLoss?: string;
        takeProfit?: string;
    } | null>(null);
    const [pendingClose, setPendingClose] = useState<{
        tradeId: string;
        direction: 'BUY' | 'SELL';
        symbol: string;
        lotSize: number;
        openPrice: number;
        closePrice: number;
        estimatedPnL: number;
    } | null>(null);
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
    const [indicatorsOpen, setIndicatorsOpen] = useState(false);

    const { prices, isConnected: pricesConnected, refetchPrices } = useMarketSocket();
    
    // Initialize symbol from URL parameter
    useEffect(() => {
        const symbolParam = searchParams?.get('symbol');
        if (symbolParam && Array.isArray(prices) && prices.length > 0) {
            const priceExists = prices.some((p: any) => p.symbol === symbolParam.toUpperCase());
                if (priceExists) {
                setSelectedSymbol(symbolParam.toUpperCase());
            }
        }
    }, [searchParams, prices]);

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
        if (sym.includes('OIL') || sym.includes('NATGAS')) {
            return 'energies';
        }
        
        // Indices
        if (['SPX', 'NAS', 'UK', 'GER', 'FRA', 'JPN', 'AUS', 'US30', 'SWI', 'ESP'].some(c => sym.includes(c))) {
            return 'indices';
        }
        
        // Stocks (short symbols, typically 1-5 chars, not forex pairs)
        if (sym.length <= 5 && !sym.includes('USD') && !sym.includes('EUR') && !sym.includes('GBP') && !sym.includes('JPY') && !sym.includes('CHF') && !sym.includes('AUD') && !sym.includes('CAD') && !sym.includes('NZD')) {
            return 'stocks';
        }
        
        // Default to forex
        return 'forex';
    }, []);

    // Decimals and min tick for display (ensures bid/ask never show identical)
    const getPriceDecimals = useCallback((symbol: string): number => {
        const category = getSymbolCategory(symbol);
        if (category === 'forex' && !symbol.toUpperCase().includes('JPY')) return 5;
        if (category === 'forex' && symbol.toUpperCase().includes('JPY')) return 2;
        if (category === 'metals' && symbol.toUpperCase().includes('XAU')) return 2;
        if (category === 'metals' && symbol.toUpperCase().includes('XAG')) return 3;
        if (category === 'crypto' && (symbol.toUpperCase().includes('BTC') || symbol.toUpperCase().includes('ETH'))) return 2;
        if (category === 'crypto') return 4;
        if (category === 'energies' || category === 'stocks' || category === 'indices') return 2;
        return 5;
    }, [getSymbolCategory]);
    const getMinTick = useCallback((symbol: string): number => {
        const category = getSymbolCategory(symbol);
        if (category === 'forex' && symbol.toUpperCase().includes('JPY')) return 0.01;
        if (category === 'forex') return 0.00001;
        if (category === 'metals' || category === 'crypto' || category === 'energies' || category === 'stocks' || category === 'indices') return 0.01;
        return 0.00001;
    }, [getSymbolCategory]);
    const getDisplayBidAsk = useCallback((bid: number, ask: number, symbol: string): { bidStr: string; askStr: string } => {
        const decimals = getPriceDecimals(symbol);
        const minTick = getMinTick(symbol);
        const displayAsk = ask <= bid ? bid + minTick : ask;
        return { bidStr: bid.toFixed(decimals), askStr: displayAsk.toFixed(decimals) };
    }, [getPriceDecimals, getMinTick]);

    /** Contract size per symbol — must match backend trade.service getContractSize for correct P/L */
    const getContractSize = useCallback((symbol: string): number => {
        const sym = symbol.toUpperCase();
        if (sym.startsWith('XAU')) return 100;
        if (sym.startsWith('XAG')) return 5000;
        if (sym.startsWith('XPT') || sym.startsWith('XPD')) return 100;
        if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE', 'MATIC', 'LINK', 'AVAX', 'UNI'].some(c => sym.includes(c))) return 1;
        if (sym.includes('OIL') || sym.includes('GAS') || sym.includes('CRUDE') || sym.includes('BRENT') || sym.includes('WTI') || sym.includes('NATGAS')) return 1000;
        if (sym.includes('SPX') || sym.includes('NAS') || sym.includes('DJI') || sym.includes('DOW') || sym.includes('FTSE') || sym.includes('UK100') || sym.includes('DAX') || sym.includes('GER30') ||
            sym.includes('NIKKEI') || sym.includes('JPN225') || sym.includes('AUS200') || sym.includes('ASX') || sym.includes('US30') || sym.includes('SWI20') || sym.includes('SMI') || sym.includes('ESP35') ||
            sym.includes('IBEX') || sym.includes('FRA40') || sym.includes('CAC')) return 1;
        if (sym.length <= 5 && !sym.includes('USD') && !sym.includes('EUR') && !sym.includes('GBP') && !sym.includes('JPY') && !sym.includes('CHF') && !sym.includes('AUD') && !sym.includes('CAD') &&
            !sym.includes('NZD') && !sym.includes('XAU') && !sym.includes('XAG')) return 1;
        return 100000;
    }, []);

    /** Floating P/L: (closePrice - openPrice) * lotSize * contractSize (BUY), or (openPrice - closePrice) * ... (SELL). Safe for null/NaN. */
    const calculateFloatingPnL = useCallback((
        direction: 'BUY' | 'SELL',
        openPrice: number,
        currentPrice: number,
        lotSize: number,
        symbol: string
    ): number => {
        const o = Number(openPrice);
        const c = Number(currentPrice);
        const lot = Number(lotSize);
        if (!Number.isFinite(o) || !Number.isFinite(c) || !Number.isFinite(lot) || lot <= 0 || c <= 0) return 0;
        const priceDiff = direction === 'BUY' ? c - o : o - c;
        const contractSize = getContractSize(symbol);
        const raw = priceDiff * lot * contractSize;
        return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
    }, [getContractSize]);

    // Get all available symbols for selector (orders + symbol dropdowns)
    const availableSymbols = Array.isArray(prices) && prices.length > 0 
        ? [...new Set(prices.map((p: any) => p.symbol))].sort()
        : [];
    const defaultOrderSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'USOIL', 'UKOIL', 'NAS100', 'US30', 'SPX500'];
    const orderSymbols = availableSymbols.length > 0 ? availableSymbols : defaultOrderSymbols;

    const stripAdminTradeFields = useCallback((trade: any) => {
        if (!trade || typeof trade !== 'object') return trade;
        const { adminModifiedBy, adminModifiedAt, adminNotes, ...rest } = trade;
        return rest;
    }, []);

    const loadData = useCallback(async () => {
        if (!token) {
            console.warn('loadData called but no token available');
            return;
        }
        setWalletLoading(true);
        try {
            const [walletData, tradesData, allTradesData, ordersData] = await Promise.all([
                api.get('/wallet', token).catch((err) => {
                    const errorMessage = err?.message || err?.toString() || 'Unknown error';
                    const errorStatus = err?.status;
                    console.error('Failed to load wallet:', {
                        error: err,
                        message: errorMessage,
                        status: errorStatus,
                        statusText: err?.statusText,
                        endpoint: '/wallet',
                        fullError: err,
                    });
                    // Don't show toast for 401 - logout will handle it
                    if (errorStatus !== 401) {
                        toast.error(`Failed to load wallet balance: ${errorMessage}${errorStatus ? ` (Status: ${errorStatus})` : ''}`);
                    }
                    return null;
                }),
                api.get('/trades/my-trades/open', token).catch((err) => {
                    // Better error extraction
                    const errorMessage = err?.message || (typeof err === 'string' ? err : err?.toString?.() || 'Unknown error');
                    const errorStatus = err?.status;
                    const errorStatusText = err?.statusText;
                    
                    // Create a serializable error object
                    const errorInfo: any = {
                        endpoint: '/trades/my-trades/open',
                        message: errorMessage,
                        status: errorStatus,
                        statusText: errorStatusText,
                        errorType: err?.constructor?.name || typeof err,
                    };
                    
                    // Try to extract additional error properties safely
                    if (err && typeof err === 'object') {
                        try {
                            // Include common error properties
                            if ('name' in err) errorInfo.name = err.name;
                            if ('stack' in err) errorInfo.stack = err.stack;
                            if ('cause' in err) errorInfo.cause = err.cause;
                            
                            // Try to stringify the full error (with circular reference handling)
                            try {
                                errorInfo.fullError = JSON.stringify(err, (key, value) => {
                                    if (key === 'stack' && typeof value === 'string') return value;
                                    if (typeof value === 'function') return '[Function]';
                                    if (value instanceof Error) return { message: value.message, name: value.name };
                                    return value;
                                }, 2);
                            } catch (stringifyErr) {
                                errorInfo.fullError = String(err);
                            }
                        } catch (extractErr) {
                            errorInfo.fullError = String(err);
                        }
                    } else {
                        errorInfo.fullError = String(err);
                    }
                    
                    console.error('Failed to load open trades:', errorInfo);
                    return [];
                }),
                api.get('/trades/my-trades', token).catch((err) => {
                    // Better error extraction
                    const errorMessage = err?.message || (typeof err === 'string' ? err : err?.toString?.() || 'Unknown error');
                    const errorStatus = err?.status;
                    const errorStatusText = err?.statusText;
                    
                    // Create a serializable error object
                    const errorInfo: any = {
                        endpoint: '/trades/my-trades',
                        message: errorMessage,
                        status: errorStatus,
                        statusText: errorStatusText,
                        errorType: err?.constructor?.name || typeof err,
                    };
                    
                    // Try to extract additional error properties safely
                    if (err && typeof err === 'object') {
                        try {
                            // Include common error properties
                            if ('name' in err) errorInfo.name = err.name;
                            if ('stack' in err) errorInfo.stack = err.stack;
                            if ('cause' in err) errorInfo.cause = err.cause;
                            
                            // Try to stringify the full error (with circular reference handling)
                            try {
                                errorInfo.fullError = JSON.stringify(err, (key, value) => {
                                    if (key === 'stack' && typeof value === 'string') return value;
                                    if (typeof value === 'function') return '[Function]';
                                    if (value instanceof Error) return { message: value.message, name: value.name };
                                    return value;
                                }, 2);
                            } catch (stringifyErr) {
                                errorInfo.fullError = String(err);
                            }
                        } catch (extractErr) {
                            errorInfo.fullError = String(err);
                        }
                    } else {
                        errorInfo.fullError = String(err);
                    }
                    
                    console.error('Failed to load all trades:', errorInfo);
                    return [];
                }),
                api.get('/orders/pending', token).catch((err) => {
                    // Better error extraction
                    const errorMessage = err?.message || (typeof err === 'string' ? err : err?.toString?.() || 'Unknown error');
                    const errorStatus = err?.status;
                    const errorStatusText = err?.statusText;
                    
                    // Create a serializable error object
                    const errorInfo: any = {
                        endpoint: '/orders/pending',
                        message: errorMessage,
                        status: errorStatus,
                        statusText: errorStatusText,
                        errorType: err?.constructor?.name || typeof err,
                    };
                    
                    // Try to extract additional error properties safely
                    if (err && typeof err === 'object') {
                        try {
                            // Include common error properties
                            if ('name' in err) errorInfo.name = err.name;
                            if ('stack' in err) errorInfo.stack = err.stack;
                            if ('cause' in err) errorInfo.cause = err.cause;
                            
                            // Try to stringify the full error (with circular reference handling)
                            try {
                                errorInfo.fullError = JSON.stringify(err, (key, value) => {
                                    if (key === 'stack' && typeof value === 'string') return value;
                                    if (typeof value === 'function') return '[Function]';
                                    if (value instanceof Error) return { message: value.message, name: value.name };
                                    return value;
                                }, 2);
                            } catch (stringifyErr) {
                                errorInfo.fullError = String(err);
                            }
                        } catch (extractErr) {
                            errorInfo.fullError = String(err);
                        }
                    } else {
                        errorInfo.fullError = String(err);
                    }
                    
                    console.error('Failed to load pending orders:', errorInfo);
                    return [];
                }),
            ]);
            
            // Set wallet data
            if (walletData) {
                console.log('Wallet data loaded successfully:', walletData);
                setWallet(walletData);
            } else {
                console.warn('Wallet data is null or undefined');
                // Don't clear existing wallet if it exists, just log warning
            }
            
            setTrades(Array.isArray(tradesData) ? tradesData.map(stripAdminTradeFields) : []);
            setAllTrades(Array.isArray(allTradesData) ? allTradesData.map(stripAdminTradeFields) : []);
            setPendingOrders(Array.isArray(ordersData) ? ordersData : []);
        } catch (error: any) {
            console.error('Failed to load data:', {
                error,
                message: error?.message || String(error),
                stack: error?.stack,
            });
            toast.error(`Failed to load trading data: ${error?.message || 'Unknown error'}. Please refresh the page.`);
        } finally {
            setWalletLoading(false);
        }
    }, [token, stripAdminTradeFields, toast]);

    useTradeSocket({
        userId: user?.id,
        token: token ?? undefined,
        onTradeOpened: (trade) => {
            const sanitized = stripAdminTradeFields(trade);
            if (!sanitized?._id) return;
            setTrades((prev) => [...prev.filter((t) => t._id !== sanitized._id), sanitized]);
            setAllTrades((prev) => [...prev.filter((t) => t._id !== sanitized._id), sanitized]);
        },
        onTradeClosed: () => {
            loadData();
        },
        onTradeUpdated: (trade) => {
            const sanitized = stripAdminTradeFields(trade);
            if (!sanitized?._id) return;
            const isClosed = (sanitized.status || trade?.status) === 'CLOSED';
            if (isClosed) {
                setTrades((prev) => prev.filter((t) => t._id !== sanitized._id));
                setAllTrades((prev) => {
                    const next = prev.filter((t) => t._id !== sanitized._id);
                    next.unshift(sanitized);
                    return next;
                });
            } else {
                setTrades((prev) => prev.map((t) => (t._id === sanitized._id ? sanitized : t)));
                setAllTrades((prev) => prev.map((t) => (t._id === sanitized._id ? sanitized : t)));
            }
        },
        onTradeDeleted: (payload) => {
            const { tradeId } = payload || {};
            if (!tradeId) return;
            setTrades((prev) => prev.filter((t) => t._id !== tradeId));
            setAllTrades((prev) => prev.filter((t) => t._id !== tradeId));
        },
        onBalanceUpdated: (data) => {
            setWallet((w: any) => (w ? { ...w, balance: data.balance, currency: data.currency } : { balance: data.balance, currency: data.currency }));
        },
    });

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const indicatorSeriesRef = useRef<Record<string, ISeriesApi<'Line'> | null>>({});
    const priceDataRef = useRef<Map<number | string, CandlestickData>>(new Map());
    const chartActiveRef = useRef(false);
    const chartSyncingRef = useRef(false); // true while reloading OHLC so live updates don't mix timeframes
    const [chartDataStatus, setChartDataStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
    const [chartContainerReady, setChartContainerReady] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
        if (!isLoading && user && (user.role === 'admin' || user.role === 'super_admin') && user.adminAccessAllowed !== false) {
            router.push('/admin');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (token) loadData();
    }, [token, loadData]);

    const fetchHistoricalCandles = useCallback(async (symbol: string, interval: string): Promise<CandlestickData[]> => {
        const url = `${API_URL}/market-data/ohlc/${symbol}/${interval}`;
        
        let timeoutId: NodeJS.Timeout | null = null;
        try {
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for faster failure
            
            const response = await fetch(url, { 
                cache: 'no-store',
                signal: controller.signal,
            });
            
            if (timeoutId) clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`OHLC API error: ${response.status} ${response.statusText}`);
            }
            
            const raw = await response.json();
            const arr = Array.isArray(raw) ? raw : (raw?.candles ?? raw?.data ?? []);
            if (!Array.isArray(arr)) return [];

            const candles: CandlestickData[] = arr
                .map((d: any) => ({
                    time: Number(d.time) as Time,
                    open: Number(d.open),
                    high: Number(d.high),
                    low: Number(d.low),
                    close: Number(d.close),
                }))
                .filter((d: CandlestickData) =>
                    Number.isFinite(Number(d.time)) &&
                    Number.isFinite(d.open) &&
                    Number.isFinite(d.high) &&
                    Number.isFinite(d.low) &&
                    Number.isFinite(d.close)
                )
                .sort((a, b) => Number(a.time) - Number(b.time));

            return candles;
        } catch (error: any) {
            // Clear timeout if still active
            if (timeoutId) clearTimeout(timeoutId);
            
            // Handle network errors, timeouts, and other fetch errors
            const errorMessage = error?.message || 'Unknown error';
            const isNetworkError = error?.name === 'TypeError' || error?.name === 'AbortError' || errorMessage.includes('fetch');
            
            console.error(`Failed to fetch OHLC data for ${symbol}/${interval}:`, {
                error: errorMessage,
                url,
                isNetworkError,
            });
            
            // Return empty array instead of throwing to prevent chart from breaking
            // The chart will just show no data rather than crashing
            return [];
        }
    }, []);

    const computeSMA = useCallback((candles: CandlestickData[], length: number) => {
        const result: { time: Time; value: number }[] = [];
        if (!Array.isArray(candles) || candles.length < length) return result;
        let sum = 0;
        for (let i = 0; i < candles.length; i++) {
            const v = candles[i].close;
            if (!Number.isFinite(v)) continue;
            sum += v;
            if (i >= length) {
                sum -= candles[i - length].close;
            }
            if (i >= length - 1) {
                result.push({ time: candles[i].time, value: sum / length });
            }
        }
        return result;
    }, []);

    const computeEMA = useCallback((candles: CandlestickData[], length: number) => {
        const result: { time: Time; value: number }[] = [];
        if (!Array.isArray(candles) || candles.length < length) return result;
        const k = 2 / (length + 1);
        let ema = candles[0].close;
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i].close;
            if (!Number.isFinite(c)) continue;
            if (i === 0) {
                ema = c;
            } else {
                ema = c * k + ema * (1 - k);
            }
            if (i >= length - 1) {
                result.push({ time: candles[i].time, value: ema });
            }
        }
        return result;
    }, []);

    const computeBollinger = useCallback((candles: CandlestickData[], length: number, mult: number) => {
        const mid = computeSMA(candles, length);
        if (!mid.length) return { mid: [], upper: [], lower: [] as { time: Time; value: number }[] };
        const upper: { time: Time; value: number }[] = [];
        const lower: { time: Time; value: number }[] = [];
        for (let i = length - 1; i < candles.length; i++) {
            const slice = candles.slice(i - length + 1, i + 1);
            const closes = slice.map(c => c.close).filter(v => Number.isFinite(v));
            if (closes.length !== length) continue;
            const mean = closes.reduce((s, v) => s + v, 0) / length;
            const variance = closes.reduce((s, v) => s + (v - mean) * (v - mean), 0) / length;
            const sd = Math.sqrt(variance);
            const m = mid[upper.length]; // aligned by index
            upper.push({ time: m.time, value: m.value + mult * sd });
            lower.push({ time: m.time, value: m.value - mult * sd });
        }
        return { mid, upper, lower };
    }, [computeSMA]);

    const updateIndicators = useCallback((candles: CandlestickData[]) => {
        const chart = chartRef.current;
        if (!chart) return;

        // Clear removed indicators
        Object.keys(indicatorSeriesRef.current).forEach((key) => {
            if (!selectedIndicators.includes(key) && indicatorSeriesRef.current[key]) {
                chart.removeSeries(indicatorSeriesRef.current[key]!);
                indicatorSeriesRef.current[key] = null;
            }
        });

        if (!candles.length || selectedIndicators.length === 0) return;

        // Helper to ensure a line series exists
        const ensureLineSeries = (key: string, color: string) => {
            if (!indicatorSeriesRef.current[key]) {
                indicatorSeriesRef.current[key] = chart.addSeries(LineSeries, {
                    color,
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
            }
            return indicatorSeriesRef.current[key]!;
        };

        if (selectedIndicators.includes('SMA20')) {
            const data = computeSMA(candles, 20);
            const s = ensureLineSeries('SMA20', '#FACC15'); // gold
            s.setData(data);
        }
        if (selectedIndicators.includes('SMA50')) {
            const data = computeSMA(candles, 50);
            const s = ensureLineSeries('SMA50', '#38BDF8'); // blue
            s.setData(data);
        }
        if (selectedIndicators.includes('EMA20')) {
            const data = computeEMA(candles, 20);
            const s = ensureLineSeries('EMA20', '#22D3EE'); // cyan
            s.setData(data);
        }
        if (selectedIndicators.includes('EMA50')) {
            const data = computeEMA(candles, 50);
            const s = ensureLineSeries('EMA50', '#A855F7'); // purple
            s.setData(data);
        }
        if (selectedIndicators.includes('BB20_2')) {
            const { mid, upper, lower } = computeBollinger(candles, 20, 2);
            const midSeries = ensureLineSeries('BB20_MID', '#FBBF24'); // soft gold
            const upperSeries = ensureLineSeries('BB20_UP', 'rgba(248, 250, 252, 0.6)');
            const lowerSeries = ensureLineSeries('BB20_LOW', 'rgba(148, 163, 184, 0.6)');
            midSeries.setData(mid);
            upperSeries.setData(upper);
            lowerSeries.setData(lower);
        }
    }, [computeSMA, computeEMA, computeBollinger, selectedIndicators]);

    // Initialize Chart (live only, no synthetic candles)
    useEffect(() => {
        setChartDataStatus('loading');
        if (!chartContainerReady || !chartContainerRef.current || chartRef.current) return;
        const container = chartContainerRef.current;

        const initChart = async () => {
            if (!container) return;
            try {
                const w = container.clientWidth || container.offsetWidth || 400;
                const h = container.clientHeight || container.offsetHeight || 300;
                if (w < 50 || h < 50) return; // avoid invalid chart size

                const candlesPromise = fetchHistoricalCandles(selectedSymbol, timeframe);
                const lw = await import('lightweight-charts');
                const chart = lw.createChart(container, {
                    layout: {
                        background: { type: lw.ColorType.Solid, color: '#0A0E1A' },
                        textColor: '#B8BCC8',
                    },
                    grid: {
                        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    },
                    width: Math.max(w, 100),
                    height: Math.max(h, 100),
                    autoSize: true,
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: timeframe === 'M1',
                    },
                    rightPriceScale: {
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                });

                const candlestickSeries = chart.addSeries(lw.CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                });

                chartRef.current = chart;
                seriesRef.current = candlestickSeries;
                indicatorSeriesRef.current = {};
                chartActiveRef.current = true;

                const candles = await candlesPromise;
                if (chartActiveRef.current && seriesRef.current && candles.length > 0) {
                    seriesRef.current.setData(candles);
                    priceDataRef.current = new Map(candles.map((c) => [Number(c.time), c]));
                    updateIndicators(candles);
                    setChartDataStatus('ready');
                } else {
                    setChartDataStatus('empty');
                }
            } catch (error) {
                console.error('Error initializing live chart:', error);
                setChartDataStatus('empty');
            }
        };

        let rafId = requestAnimationFrame(() => {
            initChart();
        });

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', handleResize);
            chartActiveRef.current = false;
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                seriesRef.current = null;
            }
        };
    }, [fetchHistoricalCandles, selectedSymbol, timeframe, chartContainerReady, updateIndicators]);

    // Reload historical candles when symbol/timeframe changes (keeps chart in sync with selected timeframe)
    useEffect(() => {
        if (!seriesRef.current) return; // chart not built yet; init effect handles first load
        chartSyncingRef.current = true;
        setChartDataStatus('loading');
        const load = async () => {
            try {
                const candles = await fetchHistoricalCandles(selectedSymbol, timeframe);
                if (!chartActiveRef.current || !seriesRef.current) {
                    chartSyncingRef.current = false;
                    return;
                }
                seriesRef.current.setData(candles);
                priceDataRef.current = new Map(candles.map((c) => [Number(c.time), c]));
                updateIndicators(candles);
                // Sync time scale with timeframe (e.g. show seconds only for 1m)
                const chart = chartRef.current;
                if (chart) {
                    chart.applyOptions({
                        timeScale: { timeVisible: true, secondsVisible: timeframe === 'M1' },
                    });
                }
                setChartDataStatus(candles.length > 0 ? 'ready' : 'empty');
            } catch (error) {
                console.error('Failed to reload live candles:', error);
                setChartDataStatus('empty');
            } finally {
                chartSyncingRef.current = false;
            }
        };
        load();
    }, [fetchHistoricalCandles, selectedSymbol, timeframe, updateIndicators]);

    // Recompute indicators when selection changes, using latest candle data
    useEffect(() => {
        if (!chartActiveRef.current || !seriesRef.current) return;
        const candles = Array.from(priceDataRef.current.values());
        if (!candles.length) return;
        updateIndicators(candles);
    }, [selectedIndicators, updateIndicators]);

    // Real-time candle updates from live socket prices only (skipped while chart is syncing to new timeframe)
    useEffect(() => {
        if (!seriesRef.current || chartSyncingRef.current) return;
        const currentPrice = Array.isArray(prices) ? prices.find((p) => p.symbol === selectedSymbol) : null;
        if (!currentPrice) return;

        const timeframeSeconds: Record<string, number> = {
            M1: 60,
            M2: 120,
            M5: 300,
            M15: 900,
            M30: 1800,
            H1: 3600,
            H4: 14400,
            D1: 86400,
            W1: 604800,
            MN1: 2592000,
        };
        const seconds = timeframeSeconds[timeframe] ?? 300;
        const now = Math.floor(Date.now() / 1000);
        const candleTimeNum = Math.floor(now / seconds) * seconds;
        const price = Number(currentPrice.bid);
        if (!Number.isFinite(price) || !Number.isFinite(candleTimeNum)) return;

        // Wait for historical data to load
        const allCandles = Array.from(priceDataRef.current.values());
        if (allCandles.length === 0) return;

        const times = allCandles.map((c) => Number(c.time)).filter(Number.isFinite);
        if (times.length === 0) return;
        const newestTime = Math.max(...times);

        // Only update if this is the current candle period (newest or newer)
        // This prevents trying to update older candles which causes the error
        if (candleTimeNum < newestTime) {
            // Current time period is older than newest candle - skip to avoid error
            return;
        }

        const existing = priceDataRef.current.get(candleTimeNum);
        const next: CandlestickData = existing
            ? {
                ...existing,
                high: Math.max(existing.high, price),
                low: Math.min(existing.low, price),
                close: price,
            }
            : {
                time: candleTimeNum as Time,
                open: price,
                high: price,
                low: price,
                close: price,
            };

        // Ensure time is always a number (not an object)
        next.time = candleTimeNum as Time;

        priceDataRef.current.set(candleTimeNum, next);

        if (!chartActiveRef.current || !seriesRef.current) return;
        try {
            if (existing) {
                seriesRef.current.update(next);
            } else if (candleTimeNum === newestTime) {
                seriesRef.current.update(next);
            } else {
                const sortedCandles = [...allCandles, next].sort((a, b) => Number(a.time) - Number(b.time));
                seriesRef.current.setData(sortedCandles);
                priceDataRef.current = new Map(sortedCandles.map((c) => [Number(c.time), c]));
            }

            // Update indicators on each real-time candle update
            if (selectedIndicators.length > 0) {
                const candlesForIndicators = Array.from(priceDataRef.current.values()).sort(
                    (a, b) => Number(a.time) - Number(b.time),
                );
                updateIndicators(candlesForIndicators);
            }
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes('Object is disposed') || errorMsg.includes('disposed')) return;
            if (errorMsg.includes('oldest data') || errorMsg.includes('Cannot update')) {
                console.warn('Chart update skipped - time too old:', candleTimeNum, 'newest:', newestTime);
            } else {
                console.error('Chart update error:', error);
            }
        }
    }, [prices, selectedSymbol, timeframe]);

    const validateTradeInputs = (direction: 'BUY' | 'SELL', entryPrice: number): { valid: boolean; error?: string } => {
        // Validate lot size
        if (!lotSize || isNaN(lotSize) || lotSize < 0.01 || lotSize > 100) {
            return { valid: false, error: 'Lot size must be between 0.01 and 100' };
        }

        // Validate stop loss
        if (sl && !isNaN(parseFloat(sl))) {
            const slValue = parseFloat(sl);
            if (slValue <= 0) {
                return { valid: false, error: 'Stop Loss must be greater than 0' };
            }
            if (direction === 'BUY' && slValue >= entryPrice) {
                return { valid: false, error: 'Stop Loss for BUY must be below entry price' };
            }
            if (direction === 'SELL' && slValue <= entryPrice) {
                return { valid: false, error: 'Stop Loss for SELL must be above entry price' };
            }
        }

        // Validate take profit
        if (tp && !isNaN(parseFloat(tp))) {
            const tpValue = parseFloat(tp);
            if (tpValue <= 0) {
                return { valid: false, error: 'Take Profit must be greater than 0' };
            }
            if (direction === 'BUY' && tpValue <= entryPrice) {
                return { valid: false, error: 'Take Profit for BUY must be above entry price' };
            }
            if (direction === 'SELL' && tpValue >= entryPrice) {
                return { valid: false, error: 'Take Profit for SELL must be below entry price' };
            }
        }

        return { valid: true };
    };

    const calculateRequiredMargin = (lotSize: number, price: number, symbol?: string): number => {
        const sym = symbol || selectedSymbol;
        const contractSize = getContractSize(sym);
        const leverage = 100; // 1:100 leverage
        const margin = (lotSize * contractSize * price) / leverage;
        return Math.max(0, Number.isFinite(margin) ? margin : 0);
    };

    const handleTrade = async (direction: 'BUY' | 'SELL') => {
        if (isSubmitting) return;
        
        // Check connection
        if (!pricesConnected) {
            toast.error('Market data not connected. Please wait for connection.');
            return;
        }

        // Check wallet balance
        if (!wallet || wallet.balance <= 0) {
            toast.error('Insufficient balance. Please deposit funds first.');
            return;
        }

        const currentPrice = Array.isArray(prices) ? prices.find(p => p.symbol === selectedSymbol) : null;
        if (!currentPrice) {
            toast.error('Price not available for this symbol. Please try another symbol.');
            return;
        }

        const entryPrice = direction === 'BUY' ? currentPrice.ask : currentPrice.bid;
        
        // Validate inputs
        const validation = validateTradeInputs(direction, entryPrice);
        if (!validation.valid) {
            toast.error(validation.error || 'Invalid trade parameters');
            return;
        }

        // Calculate required margin using the entry price (bid for SELL, ask for BUY)
        const requiredMargin = calculateRequiredMargin(lotSize, entryPrice, selectedSymbol);
        const availableBalance = wallet.balance;
        const currentMarginUsed = (Array.isArray(trades) ? trades : []).reduce((sum, t) => {
            // Use the trade's open price and symbol for existing trades
            return sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol);
        }, 0);
        const freeMargin = availableBalance - currentMarginUsed;

        if (requiredMargin > freeMargin) {
            toast.error(`Insufficient margin. Required: $${requiredMargin.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`);
            return;
        }

        // Additional validation: ensure we have enough balance
        if (requiredMargin > availableBalance) {
            toast.error(`Insufficient balance. Required margin: $${requiredMargin.toFixed(2)}, Balance: $${availableBalance.toFixed(2)}`);
            return;
        }

        // Show confirmation modal
        setPendingTrade({
            direction,
            symbol: selectedSymbol,
            lotSize,
            entryPrice,
            requiredMargin,
            stopLoss: sl || undefined,
            takeProfit: tp || undefined,
        });
        setShowTradeConfirm(true);
    };

    const executeTrade = async () => {
        if (!pendingTrade) return;
        
        setIsSubmitting(true);
        setShowTradeConfirm(false);
        try {
            const payload: any = {
                symbol: pendingTrade.symbol,
                direction: pendingTrade.direction,
                lotSize: pendingTrade.lotSize,
                marketPrice: pendingTrade.entryPrice,
            };
            if (pendingTrade.stopLoss && !isNaN(parseFloat(pendingTrade.stopLoss))) payload.sl = parseFloat(pendingTrade.stopLoss);
            if (pendingTrade.takeProfit && !isNaN(parseFloat(pendingTrade.takeProfit))) payload.tp = parseFloat(pendingTrade.takeProfit);

            await api.post('/trades/open', payload, token!);

            // Clear form
            setSl('');
            setTp('');
            
            await loadData();
            toast.success(`Trade executed successfully! ${pendingTrade.direction} ${pendingTrade.symbol} @ ${pendingTrade.entryPrice.toFixed(5)}`);
            setPendingTrade(null);
        } catch (error: any) {
            console.error('Trade failed:', error);
            const errorMessage = error.message || 'Trade execution failed. Please try again.';
            toast.error(errorMessage);
            setPendingTrade(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeTrade = async (tradeId: string) => {
        const trade = Array.isArray(trades) ? trades.find(t => t._id === tradeId) : null;
        if (!trade) {
            toast.error('Trade not found');
            return;
        }

        // Check connection
        if (!pricesConnected) {
            toast.error('Market data not connected. Please wait for connection.');
            return;
        }

        const currentPrice = Array.isArray(prices) ? prices.find(p => p.symbol === trade.symbol) : null;
        if (!currentPrice) {
            toast.error('Current price not available for this symbol');
            return;
        }

        // Calculate estimated P/L (same formula as backend: priceDiff * lotSize * contractSize)
        const closePrice = trade.direction === 'BUY' ? currentPrice.bid : currentPrice.ask;
        const estimatedPnL = calculateFloatingPnL(trade.direction, trade.openPrice || 0, closePrice, trade.lotSize, trade.symbol);

        // Show confirmation modal
        setPendingClose({
            tradeId,
            direction: trade.direction,
            symbol: trade.symbol,
            lotSize: trade.lotSize,
            openPrice: trade.openPrice || 0,
            closePrice,
            estimatedPnL,
        });
        setShowCloseConfirm(true);
    };

    const executeCloseTrade = async () => {
        if (!pendingClose) return;

        try {
            await api.post(`/trades/${pendingClose.tradeId}/close`, {
                marketPrice: pendingClose.closePrice,
            }, token!);

            await loadData();
            toast.success(`Trade closed successfully! P/L: ${pendingClose.estimatedPnL >= 0 ? '+' : ''}$${pendingClose.estimatedPnL.toFixed(2)}`);
            setPendingClose(null);
            setShowCloseConfirm(false);
        } catch (error: any) {
            console.error('Close trade failed:', error);
            toast.error(error.message || 'Failed to close trade. Please try again.');
            setPendingClose(null);
            setShowCloseConfirm(false);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    const currentPriceInfo = Array.isArray(prices) ? prices.find((p: any) => p.symbol === selectedSymbol) : null;
    const totalPnL = (Array.isArray(trades) ? trades : []).reduce((sum, t) => {
        const cp = Array.isArray(prices) ? prices.find((p: any) => p.symbol === t.symbol) : null;
        const cmp: number | undefined = t.direction === 'BUY' ? cp?.bid : cp?.ask;
        const pnl = typeof cmp === 'number' ? calculateFloatingPnL(t.direction, t.openPrice || 0, cmp, t.lotSize, t.symbol) : 0;
        return sum + pnl;
    }, 0);

    // Calculate real-time equity (balance + floating P/L)
    const realTimeEquity = (wallet?.balance || 0) + totalPnL;

    const closedTrades = (Array.isArray(allTrades) ? allTrades : []).filter(t => t.status === 'CLOSED');
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return (
        <motion.div
            className="h-screen flex flex-col bg-brand-obsidian text-white overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            {/* Top Navigation Bar */}
            <header className="relative h-14 sm:h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-4 sm:px-5 md:px-6 lg:px-8 bg-brand-surface/80 backdrop-blur-md z-20">
                <div className="flex items-center space-x-3 sm:space-x-6 md:space-x-10 flex-1 min-w-0">
                    <Link href="/dashboard" className="text-xl sm:text-2xl font-black italic tracking-tighter text-brand-gold flex-shrink-0">
                        <span className="text-white">Invest</span><span className="font-black text-brand-gold">lyin</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-4 lg:space-x-8 text-xs sm:text-sm font-semibold text-brand-text-secondary">
                        <Link href="/dashboard" className="text-brand-gold border-b-2 border-brand-gold pb-1 px-1">Trading</Link>
                        <Link href="/market" className="hover:text-white transition-colors px-1">Markets</Link>
                        <Link href="/wallet" className="hover:text-white transition-colors px-1">Wallet</Link>
                        <Link href="/news" className="hover:text-white transition-colors px-1">News</Link>
                        <Link href="/profile" className="hover:text-white transition-colors px-1">Account</Link>
                    </nav>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8 flex-shrink-0">
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
                    {/* Desktop balance and user info */}
                    <div className="hidden md:flex items-center space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8">
                        <div className="hidden lg:flex flex-col items-end pr-4 md:pr-6 border-r border-white/10">
                            <span className="text-[10px] sm:text-xs text-brand-text-secondary uppercase mb-0.5 sm:mb-1 tracking-wider">Balance</span>
                            {walletLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin"></div>
                                    <span className="text-xs text-brand-text-secondary">Loading...</span>
                                </div>
                            ) : (
                                <span className={`text-base sm:text-lg md:text-xl font-bold transition-colors ${
                                    totalPnL !== 0 ? (totalPnL > 0 ? 'text-brand-green' : 'text-brand-red') : 'text-white'
                                }`}>
                                    {`$${realTimeEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs sm:text-sm font-semibold">{user.firstName} {user.lastName}</p>
                                <p className="text-[10px] sm:text-xs text-brand-text-secondary">{user.role.toUpperCase()}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] touch-manipulation"
                                title="Logout"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div 
                            className="md:hidden fixed inset-0 bg-black/50 z-30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        {/* Menu */}
                        <motion.div
                            className="md:hidden absolute top-full left-0 right-0 bg-brand-surface border-b border-white/10 z-40 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <nav className="flex flex-col py-2">
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-gold bg-brand-gold/10 border-brand-gold"
                                >
                                    Trading
                                </Link>
                                <Link
                                    href="/market"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation text-brand-text-secondary active:bg-white/10 border-transparent"
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
                                    {walletLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin"></div>
                                            <span className="text-xs text-brand-text-secondary">Loading...</span>
                                        </div>
                                    ) : (
                                        <p className={`text-lg font-bold transition-colors ${
                                            totalPnL !== 0 ? (totalPnL > 0 ? 'text-brand-green' : 'text-brand-red') : 'text-white'
                                        }`}>
                                            {`$${realTimeEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </p>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-white">{user.firstName} {user.lastName}</p>
                                    <p className="text-[10px] text-brand-text-secondary">{user.role.toUpperCase()}</p>
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
                        </motion.div>
                    </>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col md:flex-row overflow-hidden pb-20 md:pb-0">
                {/* Center - Chart & Positions */}
                <div className="flex-grow flex flex-col min-w-0">
                    {/* Chart Header */}
                    <div className="h-14 sm:h-16 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-5 md:px-6 lg:px-8 bg-brand-surface/40 gap-3 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6">
                            {/* Symbol Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setSymbolSelectorOpen(!symbolSelectorOpen)}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-surface/60 hover:bg-brand-surface/80 rounded-lg border border-white/10 transition-colors min-h-[36px] sm:min-h-[40px] touch-manipulation"
                                >
                                    <span className="text-base sm:text-lg md:text-xl font-bold text-white">{selectedSymbol}</span>
                                    <svg className={`w-4 h-4 text-brand-text-secondary transition-transform ${symbolSelectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {symbolSelectorOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40"
                                            onClick={() => setSymbolSelectorOpen(false)}
                                        ></div>
                                        <div className="absolute top-full left-0 mt-2 w-64 sm:w-80 bg-brand-surface border border-white/10 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search symbol..."
                                                    className="w-full input-field rounded-lg px-3 py-2 mb-2 text-sm bg-brand-surface/60 border border-white/10"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const query = e.target.value.toUpperCase();
                                                        const filtered = availableSymbols.filter(s => s.includes(query));
                                                        // Auto-select first match if only one
                                                        if (filtered.length === 1 && query.length > 0) {
                                                            setSelectedSymbol(filtered[0]);
                                                            setSymbolSelectorOpen(false);
                                                        }
                                                    }}
                                                />
                                                <div className="space-y-1">
                                                    {availableSymbols.map((symbol) => (
                                                        <button
                                                            key={symbol}
                                                            onClick={() => {
                                                                setSelectedSymbol(symbol);
                                                                setSymbolSelectorOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                                                                selectedSymbol === symbol
                                                                    ? 'bg-brand-gold/20 text-brand-gold'
                                                                    : 'hover:bg-white/5 text-white'
                                                            }`}
                                                        >
                                                            {symbol}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Link 
                                href="/market"
                                className="text-xs sm:text-sm text-brand-text-secondary hover:text-brand-gold transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                View All Markets
                            </Link>
                            <div className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border ${pricesConnected ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-text-secondary/10 border-brand-text-secondary/30'}`}>
                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${pricesConnected ? 'bg-brand-green animate-pulse-glow' : 'bg-brand-text-secondary'}`}></div>
                                <span className={`text-[10px] sm:text-xs font-semibold ${pricesConnected ? 'text-brand-green' : 'text-brand-text-secondary'}`}>{pricesConnected ? 'LIVE' : 'Connecting...'}</span>
                            </div>
                            {currentPriceInfo && (() => {
                                const { bidStr, askStr } = getDisplayBidAsk(currentPriceInfo.bid, currentPriceInfo.ask, selectedSymbol);
                                return (
                                    <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6 text-xs sm:text-sm text-brand-text-secondary">
                                        <div>
                                            <span className="text-[10px] sm:text-xs">Bid: </span>
                                            <span className="text-brand-green font-mono font-bold text-xs sm:text-sm">{bidStr}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] sm:text-xs">Ask: </span>
                                            <span className="text-brand-red font-mono font-bold text-xs sm:text-sm">{askStr}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                                {TIMEFRAME_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setTimeframe(value)}
                                        className={`shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
                                            timeframe === value
                                                ? 'bg-brand-gold/20 text-brand-gold'
                                                : 'text-brand-text-secondary hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-6 w-px bg-white/10 hidden sm:block" />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIndicatorsOpen((v) => !v)}
                                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/10 bg-brand-surface/40 hover:bg-white/5 text-[10px] sm:text-xs font-semibold text-brand-text-secondary hover:text-white transition-colors shrink-0"
                                >
                                    <span className="hidden sm:inline">Indicators</span>
                                    <span className="sm:hidden">Ind.</span>
                                    {selectedIndicators.length > 0 && (
                                        <span className="ml-1 rounded-full bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 text-[9px]">
                                            {selectedIndicators.length}
                                        </span>
                                    )}
                                    <svg
                                        className={`w-3 h-3 text-brand-text-secondary transition-transform ${indicatorsOpen ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {indicatorsOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIndicatorsOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-44 sm:w-52 bg-brand-surface border border-white/10 rounded-lg shadow-xl z-50 py-1">
                                            {[
                                                { id: 'SMA20', label: '20-period SMA', description: 'Short-term trend (simple)' },
                                                { id: 'SMA50', label: '50-period SMA', description: 'Medium-term trend (simple)' },
                                                { id: 'EMA20', label: '20-period EMA', description: 'Short-term trend (exponential)' },
                                                { id: 'EMA50', label: '50-period EMA', description: 'Medium-term trend (exponential)' },
                                                { id: 'BB20_2', label: 'Bollinger Bands (20, 2)', description: 'Volatility bands around SMA20' },
                                            ].map(({ id, label, description }) => {
                                                const active = selectedIndicators.includes(id);
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedIndicators((prev) =>
                                                                prev.includes(id)
                                                                    ? prev.filter((x) => x !== id)
                                                                    : [...prev, id]
                                                            );
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-[11px] sm:text-xs flex items-center justify-between gap-2 hover:bg-white/5 ${
                                                            active ? 'text-brand-gold' : 'text-brand-text-secondary'
                                                        }`}
                                                    >
                                                        <span>
                                                            <span className="block font-semibold">{label}</span>
                                                            <span className="block text-[10px] opacity-75">{description}</span>
                                                        </span>
                                                        <span
                                                            className={`w-2.5 h-2.5 rounded-full border ${
                                                                active
                                                                    ? 'bg-brand-gold border-brand-gold'
                                                                    : 'border-white/20'
                                                            }`}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chart - explicit min-height, overflow hidden to avoid scrollbar glitch */}
                    <motion.div
                        className="flex-grow relative p-4 sm:p-5 md:p-6 min-h-[320px] sm:min-h-[380px] md:min-h-[400px] flex flex-col overflow-hidden"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                    >
                        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[320px] md:min-h-[360px] overflow-hidden">
                            <div
                                ref={(el) => {
                                    (chartContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                    if (el && !chartContainerReady) setChartContainerReady(true);
                                }}
                                className="absolute inset-0 w-full h-full min-w-[200px] min-h-[200px] rounded-lg sm:rounded-xl bg-brand-obsidian border border-white/10 shadow-2xl overflow-hidden"
                            />
                            {(chartDataStatus === 'loading' || chartDataStatus === 'empty') && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg sm:rounded-xl bg-brand-obsidian/95 border border-white/10 pointer-events-none">
                                    <p className="text-brand-text-secondary text-sm sm:text-base">
                                        {chartDataStatus === 'loading' ? 'Loading chart…' : 'No chart data for this symbol.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Positions/History/Orders Tabs */}
                    <div className="h-64 sm:h-72 md:h-80 border-t border-white/10 flex flex-col bg-brand-surface/40">
                        <div className="px-4 sm:px-5 md:px-6 min-h-[3rem] sm:min-h-[3.5rem] py-2 border-b border-white/10 flex items-center justify-start space-x-3 sm:space-x-4 md:space-x-6 bg-brand-surface/60 overflow-x-auto overflow-y-visible">
                            <button
                                onClick={() => setActiveTab('positions')}
                                className={`text-xs sm:text-sm font-semibold uppercase leading-normal py-1.5 pb-2 sm:pb-3 border-b-2 transition-colors px-2 sm:px-3 whitespace-nowrap ${
                                    activeTab === 'positions' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            >
                                Positions ({trades.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`text-xs sm:text-sm font-semibold uppercase leading-normal py-1.5 pb-2 sm:pb-3 border-b-2 transition-colors px-2 sm:px-3 whitespace-nowrap ${
                                    activeTab === 'history' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            >
                                History ({closedTrades.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`text-xs sm:text-sm font-semibold uppercase leading-normal py-1.5 pb-2 sm:pb-3 border-b-2 transition-colors px-2 sm:px-3 whitespace-nowrap ${
                                    activeTab === 'orders' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            >
                                Orders ({pendingOrders.length})
                            </button>
                        </div>
                        <div className="flex-grow overflow-auto custom-scrollbar">
                            {activeTab === 'positions' && (
                                <div className="p-4 sm:p-5 md:p-6">
                                    {trades.length === 0 ? (
                                        <div className="text-center py-8 sm:py-12 md:py-16">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <p className="text-brand-text-secondary text-base sm:text-lg font-medium">No open positions</p>
                                            <p className="text-brand-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">Open your first trade to get started</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full trade-table text-xs sm:text-sm min-w-[600px]">
                                                <thead>
                                                    <tr className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase border-b border-white/10">
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left">Symbol</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">Type</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">Volume</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right hidden sm:table-cell">Open Price</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">
                                                            Current {pricesConnected && <span className="text-brand-green text-[9px] font-normal">(Live)</span>}
                                                        </th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">
                                                            P/L {pricesConnected && <span className="text-brand-green text-[9px] font-normal">(Live)</span>}
                                                        </th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                            <tbody>
                                                {(Array.isArray(trades) ? trades : []).map((trade) => {
                                                    const cp = Array.isArray(prices) ? prices.find(p => p.symbol === trade.symbol) : null;
                                                    const cmp: number | undefined = trade.direction === 'BUY' ? cp?.bid : cp?.ask;
                                                    const pnl = typeof cmp === 'number' ? calculateFloatingPnL(trade.direction, trade.openPrice || 0, cmp, trade.lotSize, trade.symbol) : 0;
                                                    const currentDecimals = getPriceDecimals(trade.symbol);
                                                    const currentDisplay = typeof cmp === 'number' && Number.isFinite(cmp)
                                                        ? cmp.toFixed(currentDecimals)
                                                        : (!pricesConnected ? 'Connecting…' : '—');
                                                    return (
                                                        <motion.tr
                                                            key={trade._id}
                                                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                                            transition={{ duration: 0.12 }}
                                                            className="border-b border-white/5"
                                                        >
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-bold text-white text-xs sm:text-sm">{trade.symbol}</td>
                                                            <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm ${trade.direction === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>
                                                                {trade.direction}
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm">{trade.lotSize.toFixed(2)}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm hidden sm:table-cell">{trade.openPrice != null ? trade.openPrice.toFixed(currentDecimals) : '—'}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono font-bold text-white text-xs sm:text-sm" title={pricesConnected ? 'Live price' : 'Waiting for market data'}>
                                                                {currentDisplay}
                                                            </td>
                                                            <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-bold text-xs sm:text-sm md:text-base ${pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`} title="Real-time P/L (before fees on close)">
                                                                {pnl >= 0 ? '+' : ''}${pnl?.toFixed(2)}
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">
                                                                    <button
                                                                    onClick={() => closeTrade(trade._id)}
                                                                        disabled={!pricesConnected}
                                                                        className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] sm:text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        title={!pricesConnected ? 'Waiting for market connection' : 'Close position'}
                                                                    >
                                                                        Close
                                                                    </button>
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'history' && (
                                <div className="p-4 sm:p-5 md:p-6">
                                    {closedTrades.length === 0 ? (
                                        <div className="text-center py-8 sm:py-12">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-brand-text-secondary text-base sm:text-lg font-medium">No trade history</p>
                                            <p className="text-brand-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">Your closed trades will appear here</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-brand-gold/10 rounded-lg border border-brand-gold/20">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs sm:text-sm text-brand-text-secondary">Total Profit/Loss:</span>
                                                    <span className={`text-lg sm:text-xl font-bold ${totalProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                        {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full trade-table text-xs sm:text-sm min-w-[700px]">
                                                    <thead>
                                                        <tr className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase border-b border-white/10">
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left">Symbol</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">Type</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">Volume</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right hidden md:table-cell">Open</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right hidden md:table-cell">Close</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">P/L</th>
                                                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">Date</th>
                                                        </tr>
                                                    </thead>
                                                <tbody>
                                                    {closedTrades.map((trade) => (
                                                        <tr key={trade._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-bold text-white text-xs sm:text-sm">{trade.symbol}</td>
                                                            <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm ${trade.direction === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>
                                                                {trade.direction}
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm">{trade.lotSize.toFixed(2)}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm hidden md:table-cell">{trade.openPrice?.toFixed(5)}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm hidden md:table-cell">{trade.closePrice?.toFixed(5)}</td>
                                                            <td className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-bold text-xs sm:text-sm md:text-base ${trade.pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-[10px] sm:text-xs text-brand-text-secondary hidden sm:table-cell">
                                                                {trade.closedAt ? new Date(trade.closedAt).toLocaleString() : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {activeTab === 'orders' && (
                                <div className="p-4 sm:p-5 md:p-6">
                                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 space-y-2 sm:space-y-3">
                                        <p className="text-xs sm:text-sm font-semibold text-white">Place pending order</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                            <select value={orderSymbols.includes(orderForm.symbol) ? orderForm.symbol : orderSymbols[0]} onChange={e => setOrderForm({ ...orderForm, symbol: e.target.value })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                                                {orderSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            <select value={orderForm.direction} onChange={e => setOrderForm({ ...orderForm, direction: e.target.value as 'BUY' | 'SELL' })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                                                <option value="BUY">BUY</option>
                                                <option value="SELL">SELL</option>
                                            </select>
                                            <input type="number" step="0.01" min="0.01" value={orderForm.lotSize} onChange={e => setOrderForm({ ...orderForm, lotSize: parseFloat(e.target.value) || 0.01 })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm" placeholder="Lots" />
                                            <select value={orderForm.orderType} onChange={e => setOrderForm({ ...orderForm, orderType: e.target.value as 'LIMIT' | 'STOP' })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                                                <option value="LIMIT">Limit</option>
                                                <option value="STOP">Stop</option>
                                            </select>
                                            {orderForm.orderType === 'LIMIT' ? (
                                                <input type="number" step="0.00001" value={orderForm.limitPrice} onChange={e => setOrderForm({ ...orderForm, limitPrice: e.target.value })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm" placeholder="Limit price" />
                                            ) : (
                                                <input type="number" step="0.00001" value={orderForm.triggerPrice} onChange={e => setOrderForm({ ...orderForm, triggerPrice: e.target.value })} className="input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm" placeholder="Trigger price" />
                                            )}
                                            <motion.button
                                                disabled={orderSubmitting || (orderForm.orderType === 'LIMIT' ? !orderForm.limitPrice : !orderForm.triggerPrice)}
                                                onClick={async () => {
                                                    setOrderSubmitting(true);
                                                    try {
                                                        await api.post('/orders', {
                                                            symbol: orderForm.symbol,
                                                            direction: orderForm.direction,
                                                            lotSize: orderForm.lotSize,
                                                            orderType: orderForm.orderType,
                                                            limitPrice: orderForm.orderType === 'LIMIT' ? parseFloat(orderForm.limitPrice) : undefined,
                                                            triggerPrice: orderForm.orderType === 'STOP' ? parseFloat(orderForm.triggerPrice) : undefined,
                                                        }, token!);
                                                        await loadData();
                                                        toast.success('Order placed');
                                                        setOrderForm({ ...orderForm, limitPrice: '', triggerPrice: '' });
                                                    } catch (err: any) {
                                                        toast.error(err.message || 'Failed to place order');
                                                    } finally {
                                                        setOrderSubmitting(false);
                                                    }
                                                }}
                                                whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(250, 204, 21, 0.25)' }}
                                                whileTap={{ scale: 0.97 }}
                                                className="py-2 sm:py-2.5 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg font-semibold text-xs sm:text-sm disabled:opacity-50 col-span-1 sm:col-span-2 lg:col-span-1"
                                            >
                                                {orderSubmitting ? 'Placing...' : 'Place order'}
                                            </motion.button>
                                        </div>
                                    </div>
                                    {pendingOrders.length === 0 ? (
                                        <div className="text-center py-8 sm:py-12 md:py-16">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <p className="text-brand-text-secondary text-base sm:text-lg font-medium">No pending orders</p>
                                            <p className="text-brand-text-secondary text-xs sm:text-sm mt-1 sm:mt-2">Use the form above to place limit or stop orders</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full trade-table text-xs sm:text-sm min-w-[500px]">
                                                <thead>
                                                    <tr className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase border-b border-white/10">
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left">Symbol</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">Type</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">Volume</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right">Trigger / Limit</th>
                                                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendingOrders.map((order: any) => (
                                                        <tr key={order._id} className="border-b border-white/5 hover:bg-white/5">
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-bold text-white text-xs sm:text-sm">{order.symbol}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">
                                                                <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-white/10">{order.orderType}</span>
                                                                <span className={`ml-1 font-semibold text-xs sm:text-sm ${order.direction === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>{order.direction}</span>
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-white text-xs sm:text-sm">{order.lotSize}</td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-mono text-brand-text-secondary text-xs sm:text-sm">
                                                                {order.orderType === 'LIMIT' ? order.limitPrice?.toFixed(5) : order.triggerPrice?.toFixed(5) || '—'}
                                                            </td>
                                                            <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await api.delete(`/orders/${order._id}`, token!);
                                                                            await loadData();
                                                                            toast.success('Order cancelled');
                                                                        } catch (err: any) {
                                                                            toast.error(err.message || 'Failed to cancel order');
                                                                        }
                                                                    }}
                                                                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] sm:text-xs font-semibold rounded-lg"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Trading Panel - Bottom Sheet on Mobile */}
                <aside className={`fixed md:relative inset-x-0 bottom-0 md:inset-auto md:flex w-full md:w-80 lg:w-96 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 flex flex-col bg-brand-surface/40 md:p-3 sm:p-4 md:p-6 md:max-h-none overflow-y-auto z-40 md:z-auto transition-transform duration-300 ease-out rounded-t-2xl md:rounded-none ${
                    tradingPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
                }`} style={{ maxHeight: '85vh', boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)' }}>
                    {/* Mobile Drag Handle and Close Button */}
                    <div className="md:hidden pt-3 pb-2 flex items-center justify-between px-4 border-b border-white/10">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                        <button
                            onClick={() => setTradingPanelOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
                            aria-label="Close Trading Panel"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="px-4 sm:px-5 md:px-0 pb-4 md:pb-0 overflow-y-auto custom-scrollbar flex-1">
                        <div className="mb-4 sm:mb-5 md:mb-6 mt-2 md:mt-0">
                            <h2 className="text-xs sm:text-sm font-bold text-white uppercase mb-1 sm:mb-1.5 tracking-wider">Quick Trade</h2>
                            <p className="text-[10px] sm:text-xs text-brand-text-secondary">Execute trades instantly</p>
                        </div>
                    
                    {/* Symbol Info */}
                    <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6 border border-white/10 bg-brand-surface">
                        <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-brand-text-secondary font-semibold">Symbol</span>
                                <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">{selectedSymbol}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => { refetchPrices(); toast.info('Refreshing prices…'); }}
                                className="text-[10px] sm:text-xs font-semibold text-brand-gold hover:text-brand-gold/90 transition-colors whitespace-nowrap"
                            >
                                Refresh prices
                            </button>
                        </div>
                        {currentPriceInfo && (() => {
                            const { bidStr, askStr } = getDisplayBidAsk(currentPriceInfo.bid, currentPriceInfo.ask, selectedSymbol);
                            return (
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-white/10">
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-1.5 font-semibold">Bid Price</p>
                                        <p className="text-sm sm:text-base font-mono font-bold text-brand-green">{bidStr}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-1.5 font-semibold">Ask Price</p>
                                        <p className="text-sm sm:text-base font-mono font-bold text-brand-red">{askStr}</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Volume */}
                    <div className="mb-4 sm:mb-5 md:mb-6">
                        <label className="block text-xs sm:text-sm font-semibold text-white mb-2.5 sm:mb-3">Volume (Lots)</label>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setLotSize(Math.max(0.01, lotSize - 0.01))}
                                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 bg-brand-surface hover:bg-brand-surface/80 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg transition-colors border border-white/10 text-white"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                value={lotSize}
                                onChange={(e) => setLotSize(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                                className="flex-grow input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 md:py-2.5 text-center font-mono font-bold text-sm sm:text-base bg-brand-surface"
                                step="0.01"
                                min="0.01"
                            />
                            <button
                                onClick={() => setLotSize(lotSize + 0.01)}
                                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 bg-brand-surface hover:bg-brand-surface/80 rounded-lg flex items-center justify-center font-bold text-base sm:text-lg transition-colors border border-white/10 text-white"
                            >
                                +
                            </button>
                        </div>
                        <div className="mt-2 sm:mt-2.5 flex items-center justify-between text-[10px] sm:text-xs text-brand-text-secondary">
                            <span>Min: 0.01</span>
                            <span>Max: 100</span>
                        </div>
                        {lotSize && !isNaN(lotSize) && currentPriceInfo && (
                            <div className="mt-3 sm:mt-3.5 p-3 sm:p-3.5 rounded-lg bg-brand-surface border border-white/10">
                                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                                    <span className="text-brand-text-secondary">Required Margin (BUY):</span>
                                    <span className="text-white font-semibold">
                                        {`$${calculateRequiredMargin(lotSize, currentPriceInfo.ask, selectedSymbol).toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                                    <span className="text-brand-text-secondary">Required Margin (SELL):</span>
                                    <span className="text-white font-semibold">
                                        {`$${calculateRequiredMargin(lotSize, currentPriceInfo.bid, selectedSymbol).toFixed(2)}`}
                                    </span>
                                </div>
                                {wallet && (() => {
                                    const currentMarginUsed = (Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0);
                                    const freeMargin = wallet.balance - currentMarginUsed;
                                    const requiredMarginBuy = calculateRequiredMargin(lotSize, currentPriceInfo.ask, selectedSymbol);
                                    const requiredMarginSell = calculateRequiredMargin(lotSize, currentPriceInfo.bid, selectedSymbol);
                                    const maxRequiredMargin = Math.max(requiredMarginBuy, requiredMarginSell);
                                    return (
                                        <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/10">
                                            <span className="text-brand-text-secondary">Available:</span>
                                            <span className={`font-semibold ${
                                                maxRequiredMargin > freeMargin ? 'text-brand-red' : 'text-brand-green'
                                            }`}>
                                                {`$${freeMargin.toFixed(2)}`}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Stop Loss / Take Profit (optional) */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-brand-text-secondary mb-1 sm:mb-1.5">Stop Loss (optional)</label>
                            <input
                                type="number"
                                step="0.00001"
                                placeholder="—"
                                value={sl}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) > 0)) {
                                        setSl(value);
                                    }
                                }}
                                className="w-full input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono bg-brand-surface"
                            />
                                {sl && !isNaN(parseFloat(sl)) && currentPriceInfo && (
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${parseFloat(sl) <= 0 ? 'text-brand-red' : 'text-brand-text-secondary'}`}>
                                        {parseFloat(sl) <= 0 ? '⚠️ Must be greater than 0' : 'Enter price for stop loss'}
                                    </p>
                                )}
                        </div>
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-brand-text-secondary mb-1 sm:mb-1.5">Take Profit (optional)</label>
                            <input
                                type="number"
                                step="0.00001"
                                placeholder="—"
                                value={tp}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) > 0)) {
                                        setTp(value);
                                    }
                                }}
                                className="w-full input-field rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono bg-brand-surface"
                            />
                                {tp && !isNaN(parseFloat(tp)) && currentPriceInfo && (
                                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${parseFloat(tp) <= 0 ? 'text-brand-red' : 'text-brand-text-secondary'}`}>
                                        {parseFloat(tp) <= 0 ? '⚠️ Must be greater than 0' : 'Enter price for take profit'}
                                    </p>
                                )}
                        </div>
                    </div>

                    {/* Trade Buttons */}
                    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5 md:mb-6">
                        <button
                            onClick={() => handleTrade('BUY')}
                            disabled={(() => {
                                if (isSubmitting || !pricesConnected || !currentPriceInfo || !wallet || wallet.balance <= 0) return true;
                                if (!currentPriceInfo || !wallet) return true;
                                const requiredMargin = calculateRequiredMargin(lotSize, currentPriceInfo.ask, selectedSymbol);
                                const currentMarginUsed = (Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0);
                                const freeMargin = wallet.balance - currentMarginUsed;
                                return requiredMargin > freeMargin;
                            })()}
                            className="w-full py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg relative bg-brand-green hover:bg-brand-green/90"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5 sm:mr-2"></div>
                                    Executing...
                                </span>
                            ) : (
                                <>
                                    <span className="block sm:inline">BUY </span>
                                    <span className="text-[10px] sm:text-xs md:text-sm">{currentPriceInfo ? getDisplayBidAsk(currentPriceInfo.bid, currentPriceInfo.ask, selectedSymbol).askStr : ''}</span>
                                    {!pricesConnected && <span className="block text-[10px] sm:text-xs font-normal mt-0.5 sm:mt-1 opacity-75">Waiting for connection...</span>}
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handleTrade('SELL')}
                            disabled={(() => {
                                if (isSubmitting || !pricesConnected || !currentPriceInfo || !wallet || wallet.balance <= 0) return true;
                                if (!currentPriceInfo || !wallet) return true;
                                const requiredMargin = calculateRequiredMargin(lotSize, currentPriceInfo.bid, selectedSymbol);
                                const currentMarginUsed = (Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0);
                                const freeMargin = wallet.balance - currentMarginUsed;
                                return requiredMargin > freeMargin;
                            })()}
                            className="w-full py-3 sm:py-3.5 md:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg relative bg-brand-red hover:bg-brand-red/90"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5 sm:mr-2"></div>
                                    Executing...
                                </span>
                            ) : (
                                <>
                                    <span className="block sm:inline">SELL </span>
                                    <span className="text-[10px] sm:text-xs md:text-sm">{currentPriceInfo ? getDisplayBidAsk(currentPriceInfo.bid, currentPriceInfo.ask, selectedSymbol).bidStr : ''}</span>
                                    {!pricesConnected && <span className="block text-[10px] sm:text-xs font-normal mt-0.5 sm:mt-1 opacity-75">Waiting for connection...</span>}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 border border-white/10 bg-brand-surface">
                        <h3 className="text-xs sm:text-sm font-bold text-white mb-3 sm:mb-4">Account Summary</h3>
                        <div className="space-y-3 sm:space-y-3.5">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-white/5">
                                <span className="text-xs sm:text-sm text-brand-text-secondary">Equity</span>
                                <span className="text-sm sm:text-base font-bold text-white">{`$${((wallet?.balance || 0) + totalPnL).toFixed(2)}`}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-white/5">
                                <span className="text-xs sm:text-sm text-brand-text-secondary">Margin Used</span>
                                <span className="text-sm sm:text-base font-semibold text-white">
                                    {`$${((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0)).toFixed(2)}`}
                                </span>

                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-white/5">
                                <span className="text-xs sm:text-sm text-brand-text-secondary">Free Margin</span>
                                <span className={`text-sm sm:text-base font-semibold ${
                                    (((wallet?.balance || 0) + totalPnL) - ((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0))) < 0
                                        ? 'text-brand-red' : 'text-brand-green'
                                }`}>
                                    {`$${(((wallet?.balance || 0) + totalPnL) - ((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0))).toFixed(2)}`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-white/5">
                                <span className="text-xs sm:text-sm text-brand-text-secondary">Margin Level</span>
                                <span className={`text-sm sm:text-base font-semibold ${
                                    ((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0)) > 0
                                        ? (((wallet?.balance || 0) + totalPnL) / ((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0)) * 100) < 100
                                            ? 'text-brand-red' : 'text-brand-green'
                                        : 'text-white'
                                }`}>
                                    {((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0)) > 0
                                        ? (((wallet?.balance || 0) + totalPnL) / ((Array.isArray(trades) ? trades : []).reduce((sum, t) => sum + calculateRequiredMargin(t.lotSize, t.openPrice || 0, t.symbol), 0)) * 100).toFixed(1)
                                        : '—'
                                    }%
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-white/10">
                                <span className="text-sm sm:text-base font-semibold text-brand-text-secondary">Floating P/L</span>
                                <span className={`text-base sm:text-lg font-bold ${totalPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    </div>
                </aside>
                
                {/* Backdrop for Mobile Trading Panel */}
                {tradingPanelOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 z-30 md:hidden"
                        onClick={() => setTradingPanelOpen(false)}
                    ></div>
                )}
                
                {/* Fixed Quick Trade Button for Mobile */}
                <div className="fixed bottom-4 right-4 md:hidden z-30">
                    <button
                        onClick={() => setTradingPanelOpen(true)}
                        className="px-6 py-3 rounded-full bg-gradient-to-br from-brand-gold to-yellow-600 hover:from-brand-gold/90 hover:to-yellow-600/90 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 touch-manipulation min-h-[48px]"
                        aria-label="Open Trading Panel"
                    >
                        <span className="text-white font-bold text-sm sm:text-base">TRADE</span>
                    </button>
                </div>
            </main>

            {/* Trade Confirmation Modal */}
            {showTradeConfirm && pendingTrade && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-brand-surface via-brand-surface/95 to-brand-surface border border-white/20 shadow-2xl">
                        {/* Header */}
                        <div className={`p-4 sm:p-6 bg-gradient-to-r ${
                            pendingTrade.direction === 'BUY' 
                                ? 'from-brand-green/20 via-brand-green/10 to-transparent border-b border-brand-green/30' 
                                : 'from-brand-red/20 via-brand-red/10 to-transparent border-b border-red/30'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        pendingTrade.direction === 'BUY' 
                                            ? 'bg-brand-green/20' 
                                            : 'bg-brand-red/20'
                                    }`}>
                                        {pendingTrade.direction === 'BUY' ? (
                                            <svg className="w-6 h-6 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        ) : (
                                            <svg className="w-6 h-6 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                                            Open {pendingTrade.direction} Position?
                                        </h2>
                                        <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">
                                            Please confirm your trade details
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trade Details */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Symbol</p>
                                    <p className="text-base sm:text-lg font-bold text-white">{pendingTrade.symbol}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Lot Size</p>
                                    <p className="text-base sm:text-lg font-bold text-white">{pendingTrade.lotSize}</p>
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Entry Price</p>
                                <p className="text-lg sm:text-xl font-mono font-bold text-white">{pendingTrade.entryPrice.toFixed(5)}</p>
                            </div>

                            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 border border-brand-gold/20">
                                <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Required Margin</p>
                                <p className="text-xl sm:text-2xl font-bold text-brand-gold">${pendingTrade.requiredMargin.toFixed(2)}</p>
                            </div>

                            {(pendingTrade.stopLoss || pendingTrade.takeProfit) && (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-white/10">
                                    {pendingTrade.stopLoss && (
                                        <div className="p-3 rounded-xl bg-brand-red/5 border border-brand-red/20">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1">Stop Loss</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-brand-red">{pendingTrade.stopLoss}</p>
                                        </div>
                                    )}
                                    {pendingTrade.takeProfit && (
                                        <div className="p-3 rounded-xl bg-brand-green/5 border border-brand-green/20">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1">Take Profit</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-brand-green">{pendingTrade.takeProfit}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 sm:p-6 pt-0 border-t border-white/10 flex gap-3 sm:gap-4">
                            <button
                                onClick={() => {
                                    setShowTradeConfirm(false);
                                    setPendingTrade(null);
                                }}
                                disabled={isSubmitting}
                                className="flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeTrade}
                                disabled={isSubmitting}
                                className={`flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                    pendingTrade.direction === 'BUY'
                                        ? 'bg-brand-green hover:bg-brand-green/90'
                                        : 'bg-brand-red hover:bg-brand-red/90'
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Executing...
                                    </span>
                                ) : (
                                    `Confirm ${pendingTrade.direction}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Trade Confirmation Modal */}
            {showCloseConfirm && pendingClose && (
                <motion.div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <motion.div
                        className="w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-brand-surface via-brand-surface/95 to-brand-surface border border-white/20 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.9, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-6 bg-gradient-to-r from-brand-red/20 via-brand-red/10 to-transparent border-b border-brand-red/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-red/20">
                                        <svg className="w-6 h-6 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                                            Close {pendingClose.direction} Position?
                                        </h2>
                                        <p className="text-xs sm:text-sm text-brand-text-secondary mt-0.5">
                                            Please confirm trade closure
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trade Details */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Symbol</p>
                                    <p className="text-base sm:text-lg font-bold text-white">{pendingClose.symbol}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Lot Size</p>
                                    <p className="text-base sm:text-lg font-bold text-white">{pendingClose.lotSize}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Open Price</p>
                                    <p className="text-sm sm:text-base font-mono font-bold text-white">{pendingClose.openPrice.toFixed(5)}</p>
                                </div>
                                <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Close Price</p>
                                    <p className="text-sm sm:text-base font-mono font-bold text-white">{pendingClose.closePrice.toFixed(5)}</p>
                                </div>
                            </div>

                            <div className={`p-3 sm:p-4 rounded-xl border ${
                                pendingClose.estimatedPnL >= 0
                                    ? 'bg-gradient-to-br from-brand-green/10 to-brand-green/5 border-brand-green/20'
                                    : 'bg-gradient-to-br from-brand-red/10 to-brand-red/5 border-brand-red/20'
                            }`}>
                                <p className="text-[10px] sm:text-xs text-brand-text-secondary uppercase tracking-wider mb-1.5 sm:mb-2">Estimated P/L</p>
                                <p className={`text-xl sm:text-2xl font-bold ${
                                    pendingClose.estimatedPnL >= 0 ? 'text-brand-green' : 'text-brand-red'
                                }`}>
                                    {pendingClose.estimatedPnL >= 0 ? '+' : ''}${pendingClose.estimatedPnL.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 sm:p-6 pt-0 border-t border-white/10 flex gap-3 sm:gap-4">
                            <button
                                onClick={() => {
                                    setShowCloseConfirm(false);
                                    setPendingClose(null);
                                }}
                                className="flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeCloseTrade}
                                className="flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base bg-brand-red hover:bg-brand-red/90 text-white transition-all shadow-lg"
                            >
                                Confirm Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="spinner w-8 h-8"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
