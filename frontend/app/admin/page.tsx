'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import { api, API_URL } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { getSocketIoUrl } from '@/lib/socket';

export default function AdminPage() {
    const router = useRouter();
    const { user, token, logout, isLoading } = useAuth();
    const toast = useToast();
    const [trades, setTrades] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [liquidityRules, setLiquidityRules] = useState<any[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
    const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'trades' | 'users' | 'deposits' | 'withdrawals' | 'audit' | 'rules' | 'payment' | 'orders'>('overview');
    const [dataLoading, setDataLoading] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    // Pagination states
    const [tradesPagination, setTradesPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

    // Sorting states
    const [tradesSort, setTradesSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' as 'asc' | 'desc' });
    const [usersSort, setUsersSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' as 'asc' | 'desc' });
    const [ordersSort, setOrdersSort] = useState({ sortBy: 'createdAt', sortOrder: 'desc' as 'asc' | 'desc' });
    const [editingTrade, setEditingTrade] = useState<any>(null);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showForceCloseModal, setShowForceCloseModal] = useState(false);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [forceClosePrice, setForceClosePrice] = useState('');
    const [balanceAdjustment, setBalanceAdjustment] = useState({ userId: '', amount: '', description: '' });
    const [overview, setOverview] = useState<any>(null);
    const [depositIntents, setDepositIntents] = useState<any[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
    const [withdrawalPagination, setWithdrawalPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>('PENDING');
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [depositStatusFilter, setDepositStatusFilter] = useState<string>('PENDING');
    const [approvingWithdrawalId, setApprovingWithdrawalId] = useState<string | null>(null);
    const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
    const [confirmingRef, setConfirmingRef] = useState<string | null>(null);
    const [rejectingRef, setRejectingRef] = useState<string | null>(null);
    const [userTransactions, setUserTransactions] = useState<any[]>([]);
    const [showTransactionsModal, setShowTransactionsModal] = useState(false);
    const [transactionsUserId, setTransactionsUserId] = useState<string | null>(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showCreateTradeModal, setShowCreateTradeModal] = useState(false);
    const [showDeleteTradeModal, setShowDeleteTradeModal] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [selectedTradeToDelete, setSelectedTradeToDelete] = useState<string | null>(null);
    const [selectedUserToDelete, setSelectedUserToDelete] = useState<string | null>(null);
    const [selectedUserToEdit, setSelectedUserToEdit] = useState<any>(null);
    const [selectedUserToResetPassword, setSelectedUserToResetPassword] = useState<string | null>(null);
    const [createTradeForm, setCreateTradeForm] = useState({
        userId: '',
        symbol: 'EURUSD',
        direction: 'BUY' as 'BUY' | 'SELL',
        lotSize: 0.01,
        marketPrice: 0,
        customOpenPrice: '', // Admin can set exact open price (optional)
        sl: '',
        tp: '',
    });
    const [editUserForm, setEditUserForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [resetPasswordForm, setResetPasswordForm] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [paymentConfig, setPaymentConfig] = useState<any>({
        sumupApiKey: '',
        sumupCheckoutUrl: '',
        cryptoAddresses: {},
        bankDetails: {
            name: '',
            iban: '',
            swift: '',
            referenceLabel: '',
        },
    });
    const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [userOrders, setUserOrders] = useState<any[]>([]);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [ordersUserId, setOrdersUserId] = useState<string | null>(null);
    const [selectedOrderToDelete, setSelectedOrderToDelete] = useState<string | null>(null);
    const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);
    const [selectedUserToDisable2FA, setSelectedUserToDisable2FA] = useState<string | null>(null);
    const [selectedUserToReset2FA, setSelectedUserToReset2FA] = useState<string | null>(null);
    const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
    const [showReset2FAModal, setShowReset2FAModal] = useState(false);
    // KYC update loading guard — holds the userId currently being updated
    const [kycUpdatingUserId, setKycUpdatingUserId] = useState<string | null>(null);
    const { prices } = useMarketSocket();
    const tradeSocketRef = useRef<Socket | null>(null);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const loadDataRef = useRef<(() => Promise<void>) | null>(null);
    const loadDepositIntentsRef = useRef<(() => Promise<void>) | null>(null);
    const loadWithdrawalRequestsRef = useRef<(() => Promise<void>) | null>(null);
    const loadAuditLogRef = useRef<(() => Promise<void>) | null>(null);
    const loadAllOrdersRef = useRef<(() => Promise<void>) | null>(null);

    /** Contract size per symbol — must match backend trade.service getContractSize for correct P/L */
    const getContractSize = useCallback((symbol: string): number => {
        const sym = (symbol || '').toUpperCase();
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

    // Helper function to calculate real-time equity for a user
    const calculateUserEquity = useMemo(() => {
        return (userBalance: number, userOpenTrades: any[]) => {
            if (!Array.isArray(prices) || prices.length === 0 || !Array.isArray(userOpenTrades) || userOpenTrades.length === 0) {
                return userBalance;
            }
            const floatingPnL = userOpenTrades.reduce((sum, t) => {
                const cp = prices.find((p: any) => p.symbol === t.symbol);
                if (!cp) return sum;
                const cmp: number | undefined = t.direction === 'BUY' ? cp.bid : cp.ask;
                if (typeof cmp !== 'number' || !t.openPrice) return sum;
                const contractSize = getContractSize(t.symbol);
                const pnl = t.direction === 'BUY'
                    ? (cmp - t.openPrice) * t.lotSize * contractSize
                    : (t.openPrice - cmp) * t.lotSize * contractSize;
                return sum + (pnl || 0);
            }, 0);
            return userBalance + floatingPnL;
        };
    }, [prices, getContractSize]);

    // Filter states
    const [tradeFilters, setTradeFilters] = useState({
        status: '',
        symbol: '',
        userId: '',
        search: '',
        dateFrom: '',
        dateTo: '',
    });

    const [userSearch, setUserSearch] = useState('');
    const [kycStatusFilter, setKycStatusFilter] = useState('all');
    const [orderFilters, setOrderFilters] = useState({
        status: '',
        symbol: '',
        userId: '',
        orderType: '',
        search: '',
    });

    const [ruleForm, setRuleForm] = useState({
        bidSpread: 0,
        askSpread: 0,
        priceOffset: 0,
        slippageMin: 0,
        slippageMax: 0,
        executionDelayMs: 0,
        longSwapPerDay: 0,
        shortSwapPerDay: 0,
        isFrozen: false,
    });

    const [tradeEditForm, setTradeEditForm] = useState({
        openPrice: 0,
        closePrice: 0,
        status: 'OPEN',
        isActive: true,
        createdAt: '',
        closedAt: '',
        adminNotes: '',
        direction: 'BUY',
        lotSize: 0,
        sl: 0,
        tp: 0,
        swap: 0,
        commission: 0,
        pnl: 0,
    });
    /** When true, live market updates will not overwrite the Close Price field (admin has edited it). */
    const [closePriceManuallyEdited, setClosePriceManuallyEdited] = useState(false);

    useEffect(() => {
        if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
            router.push('/admin/login');
            return;
        }
        // Only allowed emails can access admin (backend enforce; hide UI for others)
        if (!isLoading && user && (user.role === 'admin' || user.role === 'super_admin') && user.adminAccessAllowed === false) {
            router.replace('/dashboard?message=Admin+access+restricted+to+authorized+email+only');
        }
    }, [user, isLoading, router]);

    const loadData = useCallback(async () => {
        if (!token) {
            setDataError('No authentication token available');
            return;
        }
        setDataLoading(true);
        setDataError(null);
        try {
            const tradesQuery = `?page=${tradesPagination.page}&limit=${tradesPagination.limit}&sortBy=${tradesSort.sortBy}&sortOrder=${tradesSort.sortOrder}`;
            const usersQuery = `?page=${usersPagination.page}&limit=${usersPagination.limit}&sortBy=${usersSort.sortBy}&sortOrder=${usersSort.sortOrder}`;

            const [tradesData, usersData, rulesData, overviewData] = await Promise.all([
                api.get(`/admin/trades${tradesQuery}`, token).catch(err => {
                    throw err;
                }),
                api.get(`/admin/users${usersQuery}`, token).catch(() => {
                    return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
                }),
                api.get('/admin/liquidity-rules', token).catch(() => []),
                api.get('/admin/overview', token).catch(() => null),
            ]);

            // Handle paginated responses
            if (tradesData && typeof tradesData === 'object' && 'data' in tradesData) {
                setTrades(Array.isArray(tradesData.data) ? tradesData.data : []);
                setTradesPagination({
                    page: tradesData.page || 1,
                    limit: tradesData.limit || 50,
                    total: tradesData.total || 0,
                    totalPages: tradesData.totalPages || 0,
                });
            } else {
                setTrades(Array.isArray(tradesData) ? tradesData : []);
            }

            if (usersData && typeof usersData === 'object' && 'data' in usersData) {
                setUsers(Array.isArray(usersData.data) ? usersData.data : []);
                setUsersPagination({
                    page: usersData.page || 1,
                    limit: usersData.limit || 50,
                    total: usersData.total || 0,
                    totalPages: usersData.totalPages || 0,
                });
            } else {
                setUsers(Array.isArray(usersData) ? usersData : []);
            }

            setOverview(overviewData && typeof overviewData === 'object' ? overviewData : null);
            const rulesArray = Array.isArray(rulesData) ? rulesData : [];
            setLiquidityRules(rulesArray);

            // Update ruleForm when selectedSymbol changes
            const currentRule = rulesArray.find((r: any) => r.symbol === selectedSymbol);
            if (currentRule) {
                setRuleForm({
                    bidSpread: currentRule.bidSpread ?? 0,
                    askSpread: currentRule.askSpread ?? 0,
                    priceOffset: currentRule.priceOffset ?? 0,
                    slippageMin: currentRule.slippageMin ?? 0,
                    slippageMax: currentRule.slippageMax ?? 0,
                    executionDelayMs: currentRule.executionDelayMs ?? 0,
                    longSwapPerDay: currentRule.longSwapPerDay ?? 0,
                    shortSwapPerDay: currentRule.shortSwapPerDay ?? 0,
                    isFrozen: currentRule.isFrozen ?? false,
                });
            } else {
                // Reset to defaults if no rule exists for selected symbol
                setRuleForm({
                    bidSpread: 0,
                    askSpread: 0,
                    priceOffset: 0,
                    slippageMin: 0,
                    slippageMax: 0,
                    executionDelayMs: 0,
                    longSwapPerDay: 0,
                    shortSwapPerDay: 0,
                    isFrozen: false,
                });
            }
            setDataError(null);
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to load admin data. Please check your connection and try again.';
            setDataError(errorMessage);
            toast.error(errorMessage);
            // Set empty arrays to prevent UI from showing stale data
            setTrades([]);
            setUsers([]);
            setOverview(null);
            setLiquidityRules([]);
        } finally {
            setDataLoading(false);
        }
    }, [token, selectedSymbol, tradesPagination.page, tradesPagination.limit, tradesSort.sortBy, tradesSort.sortOrder, usersPagination.page, usersPagination.limit, usersSort.sortBy, usersSort.sortOrder, toast]);

    // Update refs when functions change
    useEffect(() => {
        loadDataRef.current = loadData;
    }, [loadData]);

    useEffect(() => {
        if (token && user && (user.role === 'admin' || user.role === 'super_admin')) {
            loadData();

            // Set up auto-refresh every 5 seconds for real-time updates
            refreshIntervalRef.current = setInterval(() => {
                // Use refs to avoid stale closures
                if (loadDataRef.current) loadDataRef.current();
                if (activeTab === 'deposits' && loadDepositIntentsRef.current) loadDepositIntentsRef.current();
                if (activeTab === 'withdrawals' && loadWithdrawalRequestsRef.current) loadWithdrawalRequestsRef.current();
                if (activeTab === 'audit' && loadAuditLogRef.current) loadAuditLogRef.current();
                if (activeTab === 'orders' && loadAllOrdersRef.current) loadAllOrdersRef.current();
            }, 5000);
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
                refreshIntervalRef.current = null;
            }
        };
    }, [token, user, activeTab]);

    const loadDepositIntents = useCallback(async () => {
        if (!token) return;
        try {
            const status = depositStatusFilter || undefined;
            const url = status ? `/admin/deposit-intents?status=${status}` : '/admin/deposit-intents';
            const data = await api.get(url, token);
            setDepositIntents(Array.isArray(data) ? data : []);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load deposit intents:', error);
            }
            setDepositIntents([]);
        }
    }, [token, depositStatusFilter]);

    const loadWithdrawalRequests = useCallback(async () => {
        if (!token) return;
        try {
            const params = new URLSearchParams({
                page: withdrawalPagination.page.toString(),
                limit: withdrawalPagination.limit.toString(),
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });
            if (withdrawalStatusFilter) params.append('status', withdrawalStatusFilter);
            const result = await api.get(`/admin/withdrawal-requests?${params}`, token);
            setWithdrawalRequests(Array.isArray(result?.data) ? result.data : []);
            setWithdrawalPagination(prev => ({
                ...prev,
                total: result?.total ?? 0,
                totalPages: result?.totalPages ?? 0,
            }));
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load withdrawal requests:', error);
            }
            setWithdrawalRequests([]);
        }
    }, [token, withdrawalStatusFilter, withdrawalPagination.page, withdrawalPagination.limit]);

    const loadAuditLog = useCallback(async () => {
        if (!token) return;
        try {
            const data = await api.get('/admin/audit-log?limit=100', token);
            setAuditLog(Array.isArray(data) ? data : []);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load audit log:', error);
            }
            setAuditLog([]);
        }
    }, [token]);

    // Update refs when functions change
    useEffect(() => {
        loadDepositIntentsRef.current = loadDepositIntents;
    }, [loadDepositIntents]);

    useEffect(() => {
        loadWithdrawalRequestsRef.current = loadWithdrawalRequests;
    }, [loadWithdrawalRequests]);

    useEffect(() => {
        loadAuditLogRef.current = loadAuditLog;
    }, [loadAuditLog]);

    const loadAllOrders = useCallback(async () => {
        if (!token) return;
        try {
            const queryParams = new URLSearchParams({
                page: ordersPagination.page.toString(),
                limit: ordersPagination.limit.toString(),
                sortBy: ordersSort.sortBy,
                sortOrder: ordersSort.sortOrder,
            });
            if (orderFilters.status) queryParams.append('status', orderFilters.status);
            if (orderFilters.symbol) queryParams.append('symbol', orderFilters.symbol);
            if (orderFilters.orderType) queryParams.append('orderType', orderFilters.orderType);

            const data = await api.get(`/admin/orders?${queryParams.toString()}`, token);
            if (data && typeof data === 'object' && 'data' in data) {
                setAllOrders(Array.isArray(data.data) ? data.data : []);
                setOrdersPagination({
                    page: data.page || 1,
                    limit: data.limit || 50,
                    total: data.total || 0,
                    totalPages: data.totalPages || 0,
                });
            } else {
                setAllOrders(Array.isArray(data) ? data : []);
            }
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load orders:', error);
            }
            setAllOrders([]);
        }
    }, [token, ordersPagination.page, ordersPagination.limit, ordersSort.sortBy, ordersSort.sortOrder, orderFilters.status, orderFilters.symbol, orderFilters.orderType]);

    // Update ref when function changes
    useEffect(() => {
        loadAllOrdersRef.current = loadAllOrders;
    }, [loadAllOrders]);

    const loadPaymentConfig = useCallback(async () => {
        if (!token) return;
        try {
            const config = await api.get('/admin/payment-config', token);
            setPaymentConfig({
                sumupApiKey: config.sumupApiKey || '',
                sumupCheckoutUrl: config.sumupCheckoutUrl || '',
                cryptoAddresses: config.cryptoAddresses || {},
                bankDetails: config.bankDetails || {
                    name: '',
                    iban: '',
                    swift: '',
                    referenceLabel: '',
                },
            });
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to load payment config:', error);
            }
        }
    }, [token]);

    // Set up WebSocket for real-time trade updates
    useEffect(() => {
        if (!token || !user || (user.role !== 'admin' && user.role !== 'super_admin')) return;

        const baseUrl = getSocketIoUrl();
        const socket = io(`${baseUrl}/trades`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        tradeSocketRef.current = socket;

        socket.on('connect', () => {
            // Subscribe to all trades for admin
            socket.emit('subscribe:all-trades');
        });

        socket.on('trade:opened', (trade: any) => {
            setTrades((prev) => {
                const exists = prev.find((t) => t._id === trade._id);
                if (exists) {
                    return prev.map((t) => (t._id === trade._id ? trade : t));
                }
                return [...prev, trade];
            });
            // Refresh overview and users to update stats
            if (loadDataRef.current) loadDataRef.current();
        });

        socket.on('trade:closed', (trade: any) => {
            setTrades((prev) => prev.map((t) => (t._id === trade._id ? trade : t)));
            // Refresh overview and users to update stats
            if (loadDataRef.current) loadDataRef.current();
        });

        socket.on('trade:updated', (trade: any) => {
            setTrades((prev) => prev.map((t) => (t._id === trade._id ? trade : t)));
        });

        socket.on('trade:deleted', (payload: { tradeId?: string }) => {
            const id = payload?.tradeId;
            if (!id) return;
            setTrades((prev) => prev.filter((t) => t._id !== id));
            if (loadDataRef.current) loadDataRef.current();
        });

        return () => {
            socket.emit('unsubscribe:all-trades');
            socket.disconnect();
            tradeSocketRef.current = null;
        };
    }, [token, user]);

    useEffect(() => {
        if (!token || !user) return;
        if (activeTab === 'deposits') loadDepositIntents();
        if (activeTab === 'withdrawals') loadWithdrawalRequests();
        if (activeTab === 'audit') loadAuditLog();
        if (activeTab === 'payment') loadPaymentConfig();
        if (activeTab === 'orders') loadAllOrders();
    }, [activeTab, token, user, depositStatusFilter, withdrawalStatusFilter, withdrawalPagination.page, withdrawalPagination.limit, ordersPagination.page, ordersPagination.limit, ordersSort.sortBy, ordersSort.sortOrder, orderFilters.status, orderFilters.symbol, orderFilters.orderType, loadDepositIntents, loadWithdrawalRequests, loadAuditLog, loadAllOrders, loadPaymentConfig]);

    const openUserOrders = async (userId: string) => {
        setOrdersUserId(userId);
        setShowOrdersModal(true);
        try {
            const data = await api.get(`/admin/users/${userId}/orders`, token!);
            setUserOrders(Array.isArray(data) ? data : []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load orders');
            setUserOrders([]);
        }
    };

    const deleteOrder = async () => {
        if (!selectedOrderToDelete) return;
        try {
            await api.delete(`/admin/orders/${selectedOrderToDelete}`, token!);
            await loadAllOrders();
            if (ordersUserId) {
                await openUserOrders(ordersUserId);
            }
            toast.success('Order deleted successfully');
            setShowDeleteOrderModal(false);
            setSelectedOrderToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete order');
        }
    };

    const savePaymentConfig = async () => {
        if (!token) return;
        setSavingPaymentConfig(true);
        try {
            await api.put('/admin/payment-config', paymentConfig, token);
            toast.success('Payment configuration saved successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save payment configuration');
        } finally {
            setSavingPaymentConfig(false);
        }
    };

    // Calculate trade statistics with real-time floating P/L
    const tradeStats = useMemo(() => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const closedTrades = trades.filter(t => t.status === 'CLOSED');

        // Calculate closed P/L
        const closedPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        // Calculate real-time floating P/L for open trades
        const floatingPnL = openTrades.reduce((sum, t) => {
            if (!Array.isArray(prices) || prices.length === 0) {
                return sum + (t.pnl || 0);
            }
            const cp = prices.find((p: any) => p.symbol === t.symbol);
            if (!cp || !t.openPrice) return sum + (t.pnl || 0);
            const cmp: number | undefined = t.direction === 'BUY' ? cp.bid : cp.ask;
            if (typeof cmp !== 'number') return sum + (t.pnl || 0);
            const contractSize = getContractSize(t.symbol);
            const pnl = t.direction === 'BUY'
                ? (cmp - t.openPrice) * t.lotSize * contractSize
                : (t.openPrice - cmp) * t.lotSize * contractSize;
            return sum + (pnl || 0);
        }, 0);

        // Total P/L = closed P/L + floating P/L
        const totalPnL = closedPnL + floatingPnL;

        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
        const activeTrades = trades.filter(t => t.isActive !== false).length;
        const inactiveTrades = trades.filter(t => t.isActive === false).length;

        return {
            total: trades.length,
            open: openTrades.length,
            closed: closedTrades.length,
            totalPnL,
            closedPnL,
            floatingPnL,
            winRate,
            winningTrades,
            losingTrades: closedTrades.length - winningTrades,
            activeTrades,
            inactiveTrades,
        };
    }, [trades, prices]);

    // Filter trades
    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            if (tradeFilters.status && trade.status !== tradeFilters.status) return false;
            if (tradeFilters.symbol && trade.symbol !== tradeFilters.symbol) return false;
            if (tradeFilters.userId && trade.userId !== tradeFilters.userId) return false;
            if (tradeFilters.search) {
                const searchLower = tradeFilters.search.toLowerCase();
                const userInfo = users.find(u => u._id === trade.userId);
                const userSearch = userInfo ? `${userInfo.firstName} ${userInfo.lastName} ${userInfo.email}`.toLowerCase() : '';
                if (!trade._id.toLowerCase().includes(searchLower) &&
                    !trade.symbol.toLowerCase().includes(searchLower) &&
                    !userSearch.includes(searchLower)) return false;
            }
            if (tradeFilters.dateFrom) {
                const tradeDate = new Date(trade.createdAt);
                const fromDate = new Date(tradeFilters.dateFrom);
                if (tradeDate < fromDate) return false;
            }
            if (tradeFilters.dateTo) {
                const tradeDate = new Date(trade.createdAt);
                const toDate = new Date(tradeFilters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (tradeDate > toDate) return false;
            }
            return true;
        });
    }, [trades, tradeFilters, users]);

    // Calculate P/L preview (uses contract size per symbol; matches backend formula)
    const calculatePnLPreview = useCallback((direction: string, openPrice: number, closePrice: number, lotSize: number, swap: number, commission: number, symbol: string) => {
        if (!Number.isFinite(openPrice) || !Number.isFinite(closePrice) || !lotSize || !symbol) return 0;
        const priceDiff = direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice;
        const contractSize = getContractSize(symbol);
        const raw = priceDiff * lotSize * contractSize;
        return (Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0) - (swap || 0) - (commission || 0);
    }, [getContractSize]);

    const pnlPreview = useMemo(() => {
        if (!editingTrade || !tradeEditForm.closePrice || !tradeEditForm.openPrice) return null;
        return calculatePnLPreview(
            tradeEditForm.direction,
            tradeEditForm.openPrice,
            tradeEditForm.closePrice,
            tradeEditForm.lotSize,
            tradeEditForm.swap,
            tradeEditForm.commission,
            editingTrade.symbol || ''
        );
    }, [editingTrade, tradeEditForm, calculatePnLPreview]);

    const updateLiquidityRule = async () => {
        try {
            // Validate inputs
            if (ruleForm.bidSpread < 0 || ruleForm.askSpread < 0) {
                toast.error('Spreads cannot be negative');
                return;
            }
            if (ruleForm.slippageMin < 0 || ruleForm.slippageMax < 0) {
                toast.error('Slippage values cannot be negative');
                return;
            }
            if (ruleForm.slippageMin > ruleForm.slippageMax) {
                toast.error('Min slippage cannot be greater than max slippage');
                return;
            }
            if (ruleForm.executionDelayMs < 0) {
                toast.error('Execution delay cannot be negative');
                return;
            }

            // Include symbol in payload to ensure it's saved
            const updateData = {
                ...ruleForm,
                symbol: selectedSymbol,
            };
            await api.post(`/admin/liquidity-rules/${selectedSymbol}`, updateData, token!);
            await loadData();
            toast.success(`Liquidity rules for ${selectedSymbol} deployed successfully.`);
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to update rules:', error);
            }
            toast.error(error.message || 'Failed to update liquidity rules.');
        }
    };

    const freezeSymbol = async (symbol: string, isFrozen: boolean) => {
        try {
            await api.put(`/admin/symbols/${symbol}/freeze`, { isFrozen }, token!);
            // Update local state immediately for better UX
            setRuleForm(prev => ({ ...prev, isFrozen }));
            setLiquidityRules(prev => prev.map(r => r.symbol === symbol ? { ...r, isFrozen } : r));
            await loadData();
            toast.success(`Symbol ${symbol} ${isFrozen ? 'frozen' : 'unfrozen'} successfully.`);
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to freeze symbol:', error);
            }
            toast.error(error.message || 'Failed to update symbol status.');
        }
    };

    const openTradeModal = (trade: any) => {
        setEditingTrade(trade);
        setClosePriceManuallyEdited(false);
        const isOpen = (trade.status || 'OPEN') === 'OPEN';
        const cp = Array.isArray(prices) ? prices.find((p: any) => p.symbol === trade.symbol) : null;
        const liveClosePrice = cp && (trade.direction === 'BUY' ? cp.bid : cp.ask);
        const initialClosePrice = isOpen && typeof liveClosePrice === 'number' && Number.isFinite(liveClosePrice)
            ? liveClosePrice
            : (trade.closePrice ?? trade.openPrice ?? 0);
        setTradeEditForm({
            openPrice: trade.openPrice || 0,
            closePrice: initialClosePrice,
            status: trade.status || 'OPEN',
            isActive: trade.isActive !== false,
            createdAt: trade.createdAt ? new Date(trade.createdAt).toISOString().slice(0, 16) : '',
            closedAt: trade.closedAt ? new Date(trade.closedAt).toISOString().slice(0, 16) : '',
            adminNotes: typeof trade.adminNotes === 'string' ? trade.adminNotes : (trade.adminNotes?.note || ''),
            direction: trade.direction || 'BUY',
            lotSize: trade.lotSize || 0,
            sl: trade.sl || 0,
            tp: trade.tp || 0,
            swap: trade.swap || 0,
            commission: trade.commission || 0,
            pnl: trade.pnl ?? 0,
        });
        setShowTradeModal(true);
    };

    // Keep Edit Trade modal Close Price in sync with live market when trade is OPEN, unless admin has edited it
    useEffect(() => {
        if (!showTradeModal || !editingTrade || (editingTrade.status || 'OPEN') !== 'OPEN' || !editingTrade.symbol || !Array.isArray(prices) || closePriceManuallyEdited) return;
        const cp = prices.find((p: any) => p.symbol === editingTrade.symbol);
        if (!cp) return;
        const liveClosePrice = editingTrade.direction === 'BUY' ? cp.bid : cp.ask;
        if (typeof liveClosePrice !== 'number' || !Number.isFinite(liveClosePrice)) return;
        setTradeEditForm(prev => (prev.closePrice === liveClosePrice ? prev : { ...prev, closePrice: liveClosePrice }));
    }, [showTradeModal, editingTrade?.symbol, editingTrade?.direction, editingTrade?.status, prices, closePriceManuallyEdited]);

    const saveTradeChanges = async () => {
        if (!editingTrade) return;
        try {
            const updates: any = {
                openPrice: parseFloat(tradeEditForm.openPrice.toString()),
                closePrice: parseFloat(tradeEditForm.closePrice.toString()),
                status: tradeEditForm.status,
                isActive: tradeEditForm.isActive,
                direction: tradeEditForm.direction,
                lotSize: parseFloat(tradeEditForm.lotSize.toString()),
                sl: tradeEditForm.sl ? parseFloat(tradeEditForm.sl.toString()) : undefined,
                tp: tradeEditForm.tp ? parseFloat(tradeEditForm.tp.toString()) : undefined,
                swap: parseFloat(tradeEditForm.swap.toString()),
                commission: parseFloat(tradeEditForm.commission.toString()),
                pnl: parseFloat(tradeEditForm.pnl.toString()),
            };

            if (tradeEditForm.createdAt) {
                updates.createdAt = new Date(tradeEditForm.createdAt);
            }

            if (tradeEditForm.closedAt) {
                updates.closedAt = new Date(tradeEditForm.closedAt);
            }

            if (tradeEditForm.adminNotes) {
                updates.adminNotes = { note: tradeEditForm.adminNotes, updatedAt: new Date().toISOString() };
            }

            await api.post(`/admin/trades/${editingTrade._id}/override`, updates, token!);
            setShowTradeModal(false);
            setEditingTrade(null);
            await loadData();
            toast.success('Trade updated successfully.');
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to update trade:', error);
            }
            toast.error(error.message || 'Failed to update trade.');
        }
    };

    const activateTrade = async (tradeId: string) => {
        try {
            await api.post(`/admin/trades/${tradeId}/activate`, {}, token!);
            await loadData();
            toast.success('Trade activated.');
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to activate trade:', error);
            }
            toast.error(error.message || 'Failed to activate trade.');
        }
    };

    const deactivateTrade = async (tradeId: string) => {
        try {
            await api.post(`/admin/trades/${tradeId}/deactivate`, {}, token!);
            await loadData();
            toast.success('Trade deactivated.');
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to deactivate trade:', error);
            }
            toast.error(error.message || 'Failed to deactivate trade.');
        }
    };

    const openForceCloseModal = (tradeId: string) => {
        const trade = trades.find(t => t._id === tradeId);
        setEditingTrade(trade);
        setForceClosePrice(trade?.openPrice != null ? String(trade.openPrice) : '');
        setShowForceCloseModal(true);
    };

    const handleForceClose = async () => {
        if (!editingTrade) return;
        const price = parseFloat(forceClosePrice);
        if (forceClosePrice.trim() === '' || isNaN(price) || price <= 0) {
            toast.error('Please enter a valid close price (e.g. current market price)');
            return;
        }
        const tradeId = editingTrade._id ?? editingTrade.id;
        if (!tradeId) {
            toast.error('Trade ID missing');
            return;
        }
        try {
            await api.post(`/admin/trades/${tradeId}/force-close`, { closePrice: price }, token!);
            setShowForceCloseModal(false);
            setEditingTrade(null);
            setForceClosePrice('');
            await loadData();
            toast.success('Trade force closed successfully.');
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to close trade:', error);
            }
            toast.error(error.message || 'Failed to close trade.');
        }
    };

    const openBalanceModal = (userId: string) => {
        setBalanceAdjustment({ userId, amount: '', description: 'Manual adjustment' });
        setShowBalanceModal(true);
    };

    const handleBalanceAdjustment = async () => {
        const amount = parseFloat(balanceAdjustment.amount);
        if (balanceAdjustment.amount.trim() === '' || isNaN(amount) || amount === 0) {
            toast.error('Please enter a valid amount (positive to add, negative to subtract)');
            return;
        }
        const desc = (balanceAdjustment.description ?? '').trim();
        if (!desc) {
            toast.error('Please enter a description');
            return;
        }
        if (!balanceAdjustment.userId) {
            toast.error('User not selected');
            return;
        }
        try {
            await api.post(`/admin/users/${balanceAdjustment.userId}/adjust-balance`, {
                amount: Number(amount),
                description: desc
            }, token!);
            setShowBalanceModal(false);
            setBalanceAdjustment({ userId: '', amount: '', description: '' });
            await loadData();
            toast.success(`Balance ${amount >= 0 ? 'increased' : 'decreased'} by $${Math.abs(amount).toFixed(2)}`);
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Adjustment failed:', error);
            }
            toast.error(error.message || 'Failed to adjust balance.');
        }
    };

    const setUserStatus = async (userId: string, isActive: boolean) => {
        try {
            await api.put(`/admin/users/${userId}/status`, { isActive }, token!);
            await loadData();
            toast.success(isActive ? 'User activated.' : 'User suspended.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user status.');
        }
    };

    const setUserKycStatus = async (userId: string, kycStatus: string) => {
        // 'not_submitted' is UI-only; the backend enum only accepts: pending | approved | rejected
        if (!kycStatus || kycStatus === 'not_submitted') {
            toast.error('Please choose a valid KYC status: Pending, Approved, or Rejected.');
            return;
        }
        // Prevent duplicate submissions while a request is in-flight for this user
        if (kycUpdatingUserId === userId) return;
        setKycUpdatingUserId(userId);
        try {
            await api.put(`/admin/users/${userId}/kyc-status`, { kycStatus }, token!);
            await loadData();
            toast.success(`KYC status set to "${kycStatus}" successfully.`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update KYC status.');
        } finally {
            setKycUpdatingUserId(null);
        }
    };

    const confirmDeposit = async (reference: string) => {
        setConfirmingRef(reference);
        try {
            await api.post('/admin/deposit/confirm', { reference }, token!);
            await loadDepositIntents();
            await loadData();
            toast.success('Deposit confirmed.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to confirm deposit.');
        } finally {
            setConfirmingRef(null);
        }
    };

    const rejectDeposit = async (reference: string) => {
        if (!confirm('Reject this deposit intent? The user will not be credited.')) return;
        setRejectingRef(reference);
        try {
            await api.post('/admin/deposit/reject', { reference }, token!);
            await loadDepositIntents();
            await loadData();
            toast.success('Deposit rejected.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject deposit.');
        } finally {
            setRejectingRef(null);
        }
    };

    const approveWithdrawal = async (id: string, txHash?: string) => {
        setApprovingWithdrawalId(id);
        try {
            await api.post(`/admin/withdrawal-requests/${id}/approve`, txHash ? { txHash } : {}, token!);
            await loadWithdrawalRequests();
            await loadData();
            toast.success('Withdrawal approved.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve withdrawal.');
        } finally {
            setApprovingWithdrawalId(null);
        }
    };

    const rejectWithdrawal = async (id: string) => {
        const reason = window.prompt('Rejection reason (optional). User will be refunded.');
        if (reason === null) return; // user cancelled
        setRejectingWithdrawalId(id);
        try {
            await api.post(`/admin/withdrawal-requests/${id}/reject`, { reason: reason || undefined }, token!);
            await loadWithdrawalRequests();
            await loadData();
            toast.success('Withdrawal rejected and user refunded.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject withdrawal.');
        } finally {
            setRejectingWithdrawalId(null);
        }
    };

    const openUserTransactions = async (userId: string) => {
        setTransactionsUserId(userId);
        setShowTransactionsModal(true);
        try {
            const data = await api.get(`/admin/users/${userId}/transactions`, token!);
            setUserTransactions(Array.isArray(data) ? data : []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load transactions.');
            setUserTransactions([]);
        }
    };

    const exportTradesToCSV = () => {
        if (filteredTrades.length === 0) {
            toast.warning('No trades to export');
            return;
        }

        const headers = ['Trade ID', 'User', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'P/L', 'Status', 'Open Time', 'Close Time'];
        const rows = filteredTrades.map(trade => {
            const userInfo = users.find(u => u._id === trade.userId);
            return [
                trade._id.slice(-8),
                userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Unknown',
                trade.symbol,
                trade.direction,
                trade.lotSize.toString(),
                trade.openPrice?.toFixed(5) || '-',
                trade.closePrice?.toFixed(5) || '-',
                trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`,
                trade.status,
                trade.createdAt ? new Date(trade.createdAt).toLocaleString() : '-',
                trade.closedAt ? new Date(trade.closedAt).toLocaleString() : '-'
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `trades_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Trades exported successfully!');
    };

    // New admin capabilities
    const createTradeForUser = async () => {
        try {
            if (!createTradeForm.userId || !createTradeForm.marketPrice || createTradeForm.lotSize <= 0) {
                toast.error('Please fill in all required fields');
                return;
            }
            const payload: any = {
                userId: createTradeForm.userId,
                symbol: createTradeForm.symbol,
                direction: createTradeForm.direction,
                lotSize: createTradeForm.lotSize,
                marketPrice: createTradeForm.marketPrice,
            };
            if (createTradeForm.customOpenPrice) {
                payload.customOpenPrice = parseFloat(createTradeForm.customOpenPrice);
            }
            if (createTradeForm.sl) payload.sl = parseFloat(createTradeForm.sl);
            if (createTradeForm.tp) payload.tp = parseFloat(createTradeForm.tp);
            await api.post('/admin/trades/create-for-user', payload, token!);
            await loadData();
            toast.success('Trade created successfully');
            setShowCreateTradeModal(false);
            setCreateTradeForm({ userId: '', symbol: 'EURUSD', direction: 'BUY', lotSize: 0.01, marketPrice: 0, customOpenPrice: '', sl: '', tp: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to create trade');
        }
    };

    const deleteTrade = async () => {
        if (!selectedTradeToDelete) return;
        try {
            await api.delete(`/admin/trades/${selectedTradeToDelete}`, token!);
            await loadData();
            toast.success('Trade deleted successfully');
            setShowDeleteTradeModal(false);
            setSelectedTradeToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete trade');
        }
    };

    const deleteUser = async () => {
        if (!selectedUserToDelete) return;
        try {
            await api.delete(`/admin/users/${selectedUserToDelete}`, token!);
            await loadData();
            toast.success('User deleted successfully');
            setShowDeleteUserModal(false);
            setSelectedUserToDelete(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete user');
        }
    };

    const updateUserProfile = async () => {
        if (!selectedUserToEdit) return;
        try {
            await api.put(`/admin/users/${selectedUserToEdit._id}/profile`, editUserForm, token!);
            await loadData();
            toast.success('User profile updated successfully');
            setShowEditUserModal(false);
            setSelectedUserToEdit(null);
            setEditUserForm({ firstName: '', lastName: '', email: '', phone: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user profile');
        }
    };

    const disableUser2FA = async () => {
        if (!selectedUserToDisable2FA) return;
        try {
            await api.post(`/admin/users/${selectedUserToDisable2FA}/disable-2fa`, {}, token!);
            toast.success('2FA disabled successfully for user');
            setShowDisable2FAModal(false);
            setSelectedUserToDisable2FA(null);
            await loadData();
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to disable 2FA:', error);
            }
            toast.error(error.message || 'Failed to disable 2FA');
        }
    };

    const resetUser2FA = async () => {
        if (!selectedUserToReset2FA) return;
        try {
            await api.post(`/admin/users/${selectedUserToReset2FA}/reset-2fa`, {}, token!);
            toast.success('2FA reset successfully for user');
            setShowReset2FAModal(false);
            setSelectedUserToReset2FA(null);
            await loadData();
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to reset 2FA:', error);
            }
            toast.error(error.message || 'Failed to reset 2FA');
        }
    };

    const resetUserPassword = async () => {
        if (!selectedUserToResetPassword) return;
        if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (resetPasswordForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            await api.post(`/admin/users/${selectedUserToResetPassword}/reset-password`, { newPassword: resetPasswordForm.newPassword }, token!);
            toast.success('Password reset successfully');
            setShowResetPasswordModal(false);
            setSelectedUserToResetPassword(null);
            setResetPasswordForm({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password');
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-obsidian">
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-brand-obsidian text-white overflow-hidden">
            {/* Header */}
            <header className="relative h-12 sm:h-14 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-3 sm:px-4 md:px-6 bg-brand-surface/50 backdrop-blur-sm z-20">
                <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-8 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-brand-gold rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-brand-obsidian" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-sm sm:text-base md:text-lg font-bold truncate"><span className="text-brand-gold">Investlyin</span> Admin Panel</span>
                    </div>
                    <nav className="hidden lg:flex items-center space-x-3 xl:space-x-6 text-[10px] xl:text-xs font-semibold flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={`pb-1 border-b-2 transition-colors ${activeTab === 'overview' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-overview"
                        >
                            Overview
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('stats')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stats' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-stats"
                        >
                            Statistics
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('trades')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'trades' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-trades"
                        >
                            Trade Management
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('users')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-users"
                        >
                            User Accounts
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('deposits')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'deposits' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-deposits"
                        >
                            Deposits
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('withdrawals')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'withdrawals' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-withdrawals"
                        >
                            Withdrawals
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('audit')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audit' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-audit"
                        >
                            Audit Log
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('rules')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rules' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-rules"
                        >
                            Liquidity Rules
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('payment')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'payment' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-payment"
                        >
                            Payment Config
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('orders')}
                            className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'text-brand-gold border-brand-gold' : 'text-brand-text-secondary border-transparent hover:text-white'
                                }`}
                            data-testid="admin-tab-orders"
                        >
                            Orders
                        </button>
                    </nav>
                </div>

                {/* Mobile menu button - moved to right side */}
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="lg:hidden p-2.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label="Toggle menu"
                    aria-expanded={showMobileMenu}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showMobileMenu ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
                {/* Mobile menu dropdown */}
                {showMobileMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="lg:hidden fixed inset-0 bg-black/50 z-20"
                            onClick={() => setShowMobileMenu(false)}
                        />
                        {/* Menu */}
                        <div className="lg:hidden absolute top-full left-0 right-0 bg-brand-surface border-b border-white/10 z-30 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto">
                            <nav className="flex flex-col py-2">
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'stats', label: 'Statistics' },
                                    { id: 'trades', label: 'Trade Management' },
                                    { id: 'users', label: 'User Accounts' },
                                    { id: 'deposits', label: 'Deposits' },
                                    { id: 'withdrawals', label: 'Withdrawals' },
                                    { id: 'audit', label: 'Audit Log' },
                                    { id: 'rules', label: 'Liquidity Rules' },
                                    { id: 'payment', label: 'Payment Config' },
                                    { id: 'orders', label: 'Orders' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        data-testid={`admin-tab-${tab.id}`}
                                        onClick={() => {
                                            setActiveTab(tab.id as any);
                                            setShowMobileMenu(false);
                                        }}
                                        className={`px-4 py-3.5 text-left text-sm font-semibold transition-colors border-l-4 min-h-[44px] touch-manipulation ${activeTab === tab.id
                                            ? 'text-brand-gold bg-brand-gold/10 border-brand-gold'
                                            : 'text-brand-text-secondary active:bg-white/10 border-transparent'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </>
                )}
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
                    <div className="hidden sm:flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-brand-green/10 border border-brand-green/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse-glow"></div>
                        <span className="text-[9px] sm:text-[10px] font-semibold text-brand-green">System Active</span>
                    </div>
                    <button onClick={logout} className="text-[10px] sm:text-xs text-brand-text-secondary hover:text-white transition-colors whitespace-nowrap">
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow overflow-auto custom-scrollbar bg-brand-obsidian">
                <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 overflow-x-auto">
                    {dataError && (
                        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200" data-testid="admin-data-error" role="alert">
                            {dataError}
                            <span className="ml-2 inline-flex gap-2">
                                <button type="button" onClick={() => { setDataError(null); loadData(); }} className="underline hover:no-underline font-medium">Retry</button>
                                <button type="button" onClick={() => setDataError(null)} className="underline hover:no-underline">Dismiss</button>
                            </span>
                        </div>
                    )}
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1" data-testid="admin-overview-heading">Platform Overview</h1>
                                <p className="text-xs sm:text-sm text-brand-text-secondary">Key metrics at a glance</p>
                            </div>
                            {overview ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Total Users</p>
                                            <p className="text-2xl sm:text-3xl font-bold">{overview.totalUsers ?? 0}</p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Total Balance</p>
                                            <p className="text-2xl sm:text-3xl font-bold text-brand-green">${(overview.totalBalance ?? 0).toFixed(2)}</p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Open Positions</p>
                                            <p className="text-2xl sm:text-3xl font-bold">{overview.openPositions ?? 0}</p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Total Trades</p>
                                            <p className="text-2xl sm:text-3xl font-bold">{overview.totalTrades ?? 0}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">
                                                Total P/L <span className="text-[9px] text-brand-gold">(Live)</span>
                                            </p>
                                            <p className={`text-xl sm:text-2xl font-bold ${tradeStats.totalPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {tradeStats.totalPnL >= 0 ? '+' : ''}{tradeStats.totalPnL.toFixed(2)}
                                            </p>
                                            <p className="text-[9px] text-brand-text-secondary mt-1">
                                                Closed: {tradeStats.closedPnL >= 0 ? '+' : ''}{tradeStats.closedPnL.toFixed(2)} |
                                                Floating: {tradeStats.floatingPnL >= 0 ? '+' : ''}{tradeStats.floatingPnL.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Pending Deposits</p>
                                            <p className="text-xl sm:text-2xl font-bold">{overview.pendingDepositsCount ?? 0}</p>
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mt-0.5 sm:mt-1">${(overview.pendingDepositsSum ?? 0).toFixed(2)}</p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Trades Today</p>
                                            <p className="text-xl sm:text-2xl font-bold">{overview.tradesToday ?? 0}</p>
                                        </div>
                                        <div className="card rounded-lg p-3 sm:p-4 md:p-5">
                                            <p className="text-[10px] sm:text-xs text-brand-text-secondary mb-1 sm:mb-2">Volume Today</p>
                                            <p className="text-xl sm:text-2xl font-bold">${(overview.volumeToday ?? 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="card rounded-lg p-6 sm:p-8 text-center text-brand-text-secondary text-sm sm:text-base">Loading overview…</div>
                            )}
                        </div>
                    )}

                    {/* Statistics Tab */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold mb-1">Trading Statistics</h1>
                                <p className="text-sm text-brand-text-secondary">Overview of all trading activity</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="card rounded-lg p-5">
                                    <p className="text-xs text-brand-text-secondary mb-2">Total Trades</p>
                                    <p className="text-3xl font-bold">{tradeStats.total}</p>
                                    <div className="mt-3 flex items-center space-x-4 text-xs">
                                        <span className="text-brand-green">Open: {tradeStats.open}</span>
                                        <span className="text-brand-text-secondary">Closed: {tradeStats.closed}</span>
                                    </div>
                                </div>

                                <div className="card rounded-lg p-5">
                                    <p className="text-xs text-brand-text-secondary mb-2">Total P/L <span className="text-[10px] text-brand-gold">(Live)</span></p>
                                    <p className={`text-3xl font-bold ${tradeStats.totalPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {tradeStats.totalPnL >= 0 ? '+' : ''}{tradeStats.totalPnL.toFixed(2)}
                                    </p>
                                    <div className="mt-3 text-xs text-brand-text-secondary space-y-1">
                                        <div>
                                            Closed P/L: <span className={tradeStats.closedPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}>
                                                {tradeStats.closedPnL >= 0 ? '+' : ''}{tradeStats.closedPnL.toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            Floating P/L: <span className={tradeStats.floatingPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}>
                                                {tradeStats.floatingPnL >= 0 ? '+' : ''}{tradeStats.floatingPnL.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card rounded-lg p-5">
                                    <p className="text-xs text-brand-text-secondary mb-2">Win Rate</p>
                                    <p className="text-3xl font-bold">{tradeStats.winRate.toFixed(1)}%</p>
                                    <div className="mt-3 flex items-center space-x-4 text-xs">
                                        <span className="text-brand-green">Wins: {tradeStats.winningTrades}</span>
                                        <span className="text-brand-red">Losses: {tradeStats.losingTrades}</span>
                                    </div>
                                </div>

                                <div className="card rounded-lg p-5">
                                    <p className="text-xs text-brand-text-secondary mb-2">Trade Status</p>
                                    <p className="text-3xl font-bold">{tradeStats.activeTrades}</p>
                                    <div className="mt-3 text-xs text-brand-text-secondary">
                                        Active: <span className="text-brand-green">{tradeStats.activeTrades}</span> |
                                        Inactive: <span className="text-brand-red">{tradeStats.inactiveTrades}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">Trade Distribution by Symbol <span className="text-sm text-brand-gold">(Live P/L)</span></h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD'].map(symbol => {
                                        const symbolTrades = trades.filter(t => t.symbol === symbol);
                                        const symbolClosedTrades = symbolTrades.filter(t => t.status === 'CLOSED');
                                        const symbolOpenTrades = symbolTrades.filter(t => t.status === 'OPEN');

                                        // Calculate closed P/L
                                        const symbolClosedPnL = symbolClosedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

                                        // Calculate real-time floating P/L for open trades
                                        const symbolFloatingPnL = symbolOpenTrades.reduce((sum, t) => {
                                            if (!Array.isArray(prices) || prices.length === 0) {
                                                return sum + (t.pnl || 0);
                                            }
                                            const cp = prices.find((p: any) => p.symbol === t.symbol);
                                            if (!cp || !t.openPrice) return sum + (t.pnl || 0);
                                            const cmp: number | undefined = t.direction === 'BUY' ? cp.bid : cp.ask;
                                            if (typeof cmp !== 'number') return sum + (t.pnl || 0);
                                            const contractSize = getContractSize(t.symbol);
                                            const pnl = t.direction === 'BUY'
                                                ? (cmp - t.openPrice) * t.lotSize * contractSize
                                                : (t.openPrice - cmp) * t.lotSize * contractSize;
                                            return sum + (pnl || 0);
                                        }, 0);

                                        const symbolPnL = symbolClosedPnL + symbolFloatingPnL;

                                        return (
                                            <div key={symbol} className="text-center">
                                                <p className="text-xs text-brand-text-secondary mb-1">{symbol}</p>
                                                <p className="text-xl font-bold">{symbolTrades.length}</p>
                                                <p className={`text-xs mt-1 ${symbolPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                    {symbolPnL >= 0 ? '+' : ''}{symbolPnL.toFixed(2)}
                                                </p>
                                                {symbolOpenTrades.length > 0 && (
                                                    <p className="text-[9px] text-brand-gold mt-0.5">({symbolOpenTrades.length} open)</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trade Management Tab */}
                    {activeTab === 'trades' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Trade Management</h1>
                                    <p className="text-sm text-brand-text-secondary">Complete control over all user trades</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => setShowCreateTradeModal(true)}
                                        className="px-4 py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        Create Trade
                                    </button>
                                    <button
                                        onClick={exportTradesToCSV}
                                        className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        Export CSV
                                    </button>
                                    <div className="text-right">
                                        <p className="text-xs text-brand-text-secondary">Total Trades</p>
                                        <p className="text-lg font-bold">{tradesPagination.total || trades.length}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-brand-text-secondary">Showing</p>
                                        <p className="text-lg font-bold">{trades.length} of {tradesPagination.total || trades.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="card rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Search</label>
                                        <input
                                            type="text"
                                            value={tradeFilters.search}
                                            onChange={e => setTradeFilters({ ...tradeFilters, search: e.target.value })}
                                            placeholder="Trade ID, Symbol, User..."
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Status</label>
                                        <select
                                            value={tradeFilters.status}
                                            onChange={e => setTradeFilters({ ...tradeFilters, status: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            <option value="OPEN">OPEN</option>
                                            <option value="CLOSED">CLOSED</option>
                                            <option value="PENDING">PENDING</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Symbol</label>
                                        <select
                                            value={tradeFilters.symbol}
                                            onChange={e => setTradeFilters({ ...tradeFilters, symbol: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            {['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">User</label>
                                        <select
                                            value={tradeFilters.userId}
                                            onChange={e => setTradeFilters({ ...tradeFilters, userId: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">From Date</label>
                                        <input
                                            type="date"
                                            value={tradeFilters.dateFrom}
                                            onChange={e => setTradeFilters({ ...tradeFilters, dateFrom: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">To Date</label>
                                        <input
                                            type="date"
                                            value={tradeFilters.dateTo}
                                            onChange={e => setTradeFilters({ ...tradeFilters, dateTo: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTradeFilters({ status: '', symbol: '', userId: '', search: '', dateFrom: '', dateTo: '' })}
                                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>

                            <div className="card rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full trade-table text-xs">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-brand-text-secondary uppercase">
                                                <th
                                                    className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => {
                                                        const newOrder = tradesSort.sortBy === 'createdAt' && tradesSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                        setTradesSort({ sortBy: 'createdAt', sortOrder: newOrder });
                                                        setTradesPagination({ ...tradesPagination, page: 1 });
                                                    }}
                                                >
                                                    Trade ID
                                                    {tradesSort.sortBy === 'createdAt' && (
                                                        <span className="ml-1">{tradesSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th className="px-4 py-3 text-left">User</th>
                                                <th
                                                    className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => {
                                                        const newOrder = tradesSort.sortBy === 'symbol' && tradesSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                        setTradesSort({ sortBy: 'symbol', sortOrder: newOrder });
                                                        setTradesPagination({ ...tradesPagination, page: 1 });
                                                    }}
                                                >
                                                    Symbol
                                                    {tradesSort.sortBy === 'symbol' && (
                                                        <span className="ml-1">{tradesSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th className="px-4 py-3 text-center">Type</th>
                                                <th className="px-4 py-3 text-right">Volume</th>
                                                <th className="px-4 py-3 text-right">Open Price</th>
                                                <th className="px-4 py-3 text-right">Close Price</th>
                                                <th
                                                    className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => {
                                                        const newOrder = tradesSort.sortBy === 'pnl' && tradesSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                        setTradesSort({ sortBy: 'pnl', sortOrder: newOrder });
                                                        setTradesPagination({ ...tradesPagination, page: 1 });
                                                    }}
                                                >
                                                    P/L
                                                    {tradesSort.sortBy === 'pnl' && (
                                                        <span className="ml-1">{tradesSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th className="px-4 py-3 text-left">Open Time</th>
                                                <th className="px-4 py-3 text-left">Close Time</th>
                                                <th
                                                    className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => {
                                                        const newOrder = tradesSort.sortBy === 'status' && tradesSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                        setTradesSort({ sortBy: 'status', sortOrder: newOrder });
                                                        setTradesPagination({ ...tradesPagination, page: 1 });
                                                    }}
                                                >
                                                    Status
                                                    {tradesSort.sortBy === 'status' && (
                                                        <span className="ml-1">{tradesSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th className="px-4 py-3 text-center">Active</th>
                                                <th className="px-4 py-3 text-left">Admin Notes</th>
                                                <th className="px-4 py-3 text-left">Modified By</th>
                                                <th className="px-4 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTrades.map((trade) => {
                                                const userInfo = users.find(u => u._id === trade.userId);
                                                const adminInfo = users.find(u => u._id === trade.adminModifiedBy);
                                                const adminNote = typeof trade.adminNotes === 'string' ? trade.adminNotes : (trade.adminNotes?.note || '');

                                                // Calculate real-time P/L for open trades (per-symbol contract size for accuracy)
                                                let currentPnL = trade.pnl || 0;
                                                let currentPrice = trade.closePrice;
                                                if (trade.status === 'OPEN' && Array.isArray(prices) && prices.length > 0) {
                                                    const cp = prices.find((p: any) => p.symbol === trade.symbol);
                                                    if (cp && trade.openPrice) {
                                                        const cmp: number | undefined = trade.direction === 'BUY' ? cp.bid : cp.ask;
                                                        if (typeof cmp === 'number') {
                                                            currentPrice = cmp;
                                                            const contractSize = getContractSize(trade.symbol);
                                                            currentPnL = trade.direction === 'BUY'
                                                                ? (cmp - trade.openPrice) * trade.lotSize * contractSize
                                                                : (trade.openPrice - cmp) * trade.lotSize * contractSize;
                                                        }
                                                    }
                                                }

                                                return (
                                                    <tr key={trade._id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="px-4 py-3 font-mono text-[10px]">{trade._id.slice(-8)}</td>
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-semibold text-sm">{userInfo?.firstName} {userInfo?.lastName}</p>
                                                                <p className="text-[10px] text-brand-text-secondary">{userInfo?.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-bold">{trade.symbol}</td>
                                                        <td className={`px-4 py-3 text-center font-semibold ${trade.direction === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>
                                                            {trade.direction}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">{trade.lotSize}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{trade.openPrice?.toFixed(5)}</td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {currentPrice ? currentPrice.toFixed(5) : '-'}
                                                            {trade.status === 'OPEN' && currentPrice && (
                                                                <span className="text-[9px] text-brand-gold ml-1">(Live)</span>
                                                            )}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-bold ${currentPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                            {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(2)}
                                                            {trade.status === 'OPEN' && (
                                                                <span className="text-[9px] text-brand-gold ml-1">(Live)</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px] font-mono">
                                                            {trade.createdAt ? new Date(trade.createdAt).toLocaleString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px] font-mono">
                                                            {trade.closedAt ? new Date(trade.closedAt).toLocaleString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`badge ${trade.status === 'OPEN' ? 'badge-success' : 'badge-info'}`}>
                                                                {trade.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`badge ${trade.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                                                                {trade.isActive !== false ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px] max-w-xs truncate" title={adminNote}>
                                                            {adminNote || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px]">
                                                            {adminInfo ? (
                                                                <div>
                                                                    <p className="font-semibold">{adminInfo.firstName} {adminInfo.lastName}</p>
                                                                    {trade.adminModifiedAt && (
                                                                        <p className="text-brand-text-secondary">{new Date(trade.adminModifiedAt).toLocaleString()}</p>
                                                                    )}
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center justify-center space-x-2">
                                                                <button
                                                                    onClick={() => openTradeModal(trade)}
                                                                    className="px-3 py-1.5 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-[10px] font-semibold rounded transition-colors"
                                                                    title="Edit Trade"
                                                                >
                                                                    Edit
                                                                </button>
                                                                {trade.status === 'OPEN' && (
                                                                    <button
                                                                        onClick={() => openForceCloseModal(trade._id)}
                                                                        className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded transition-colors"
                                                                    >
                                                                        Close
                                                                    </button>
                                                                )}
                                                                {trade.isActive !== false ? (
                                                                    <button
                                                                        onClick={() => deactivateTrade(trade._id)}
                                                                        className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded transition-colors"
                                                                        title="Deactivate Trade"
                                                                    >
                                                                        Deactivate
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => activateTrade(trade._id)}
                                                                        className="px-3 py-1.5 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green text-[10px] font-semibold rounded transition-colors"
                                                                        title="Activate Trade"
                                                                    >
                                                                        Activate
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedTradeToDelete(trade._id);
                                                                        setShowDeleteTradeModal(true);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {tradesPagination.totalPages > 1 && (
                                    <div className="card rounded-lg p-4 mt-4">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-brand-text-secondary">Items per page:</span>
                                                <select
                                                    value={tradesPagination.limit}
                                                    onChange={(e) => {
                                                        setTradesPagination({ ...tradesPagination, limit: parseInt(e.target.value), page: 1 });
                                                    }}
                                                    className="input-field rounded px-2 py-1 text-xs"
                                                >
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                    <option value={200}>200</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-brand-text-secondary">
                                                    Page {tradesPagination.page} of {tradesPagination.totalPages} ({tradesPagination.total} total)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setTradesPagination({ ...tradesPagination, page: Math.max(1, tradesPagination.page - 1) })}
                                                    disabled={tradesPagination.page === 1}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setTradesPagination({ ...tradesPagination, page: Math.min(tradesPagination.totalPages, tradesPagination.page + 1) })}
                                                    disabled={tradesPagination.page === tradesPagination.totalPages}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* User Management Tab */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold mb-1">User Accounts</h1>
                                <p className="text-sm text-brand-text-secondary">Manage user accounts and balances</p>
                            </div>

                            {/* Search Bar + KYC Filter */}
                            <div className="card rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Search Users</label>
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            placeholder="Search by name, email, role, or user ID..."
                                            className="w-full input-field rounded-lg px-4 py-2.5 text-sm"
                                        />
                                    </div>
                                    <div className="min-w-[160px]">
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">KYC Filter</label>
                                        <select
                                            value={kycStatusFilter}
                                            onChange={e => setKycStatusFilter(e.target.value)}
                                            className="w-full input-field rounded-lg px-3 py-2.5 text-sm"
                                        >
                                            <option value="all">All KYC Statuses</option>
                                            <option value="not_submitted">Not Submitted</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    {(userSearch || kycStatusFilter !== 'all') && (
                                        <div className="flex items-end">
                                            <button
                                                onClick={() => { setUserSearch(''); setKycStatusFilter('all'); }}
                                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Filtered Users */}
                            {(() => {
                                const filteredUsers = users.filter((u) => {
                                    let matchesSearch = true;
                                    if (userSearch) {
                                        const searchLower = userSearch.toLowerCase();
                                        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                                        const email = (u.email || '').toLowerCase();
                                        const role = (u.role || '').toLowerCase();
                                        const userId = (u._id || '').toLowerCase();

                                        matchesSearch = fullName.includes(searchLower) ||
                                            email.includes(searchLower) ||
                                            role.includes(searchLower) ||
                                            userId.includes(searchLower);
                                    }

                                    let matchesKYC = true;
                                    if (kycStatusFilter !== 'all') {
                                        matchesKYC = (u.kycStatus || 'not_submitted') === kycStatusFilter;
                                    }

                                    return matchesSearch && matchesKYC;
                                });

                                return (
                                    <div key="filtered-users-container">
                                        {filteredUsers.length > 0 && (
                                            <div className="text-sm text-brand-text-secondary mb-4">
                                                Showing {filteredUsers.length} of {users.length} users
                                                {userSearch && <span className="text-brand-gold"> matching "{userSearch}"</span>}
                                            </div>
                                        )}
                                        {filteredUsers.length === 0 && userSearch && (
                                            <div className="card rounded-lg p-8 text-center text-brand-text-secondary">
                                                No users found matching "{userSearch}"
                                            </div>
                                        )}
                                        {filteredUsers.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {filteredUsers.map((u) => {
                                                    const userTrades = trades.filter(t => t.userId === u._id);
                                                    const userOpenTrades = userTrades.filter(t => t.status === 'OPEN');

                                                    // Calculate closed trades P/L
                                                    const userClosedPnL = userTrades
                                                        .filter(t => t.status === 'CLOSED')
                                                        .reduce((sum, t) => sum + (t.pnl || 0), 0);

                                                    // Real-time equity = balance + floating P/L
                                                    const realTimeEquity = calculateUserEquity(u.wallet?.balance || 0, userOpenTrades);

                                                    // Calculate floating P/L for color coding
                                                    const userFloatingPnL = realTimeEquity - (u.wallet?.balance || 0);

                                                    // Total P/L = closed P/L + floating P/L
                                                    const userPnL = userClosedPnL + userFloatingPnL;

                                                    return (
                                                        <div key={u._id} className="card rounded-lg p-5">
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div>
                                                                    <h3 className="font-bold text-lg">{u.firstName} {u.lastName}</h3>
                                                                    <p className="text-xs text-brand-text-secondary">{u.email}</p>
                                                                </div>
                                                                <span className="badge badge-info">{u.role}</span>
                                                            </div>
                                                            <div className="space-y-3 mb-4">
                                                                <div>
                                                                    <p className="text-xs text-brand-text-secondary mb-1">Balance</p>
                                                                    <p className={`text-xl font-bold ${userFloatingPnL !== 0
                                                                        ? (userFloatingPnL > 0 ? 'text-brand-green' : 'text-brand-red')
                                                                        : 'text-brand-green'
                                                                        }`}>
                                                                        ${realTimeEquity.toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                                    <div>
                                                                        <p className="text-brand-text-secondary">Total Trades</p>
                                                                        <p className="font-bold">{userTrades.length}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-brand-text-secondary">Total P/L</p>
                                                                        <p className={`font-bold ${userPnL >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                                                            {userPnL >= 0 ? '+' : ''}{userPnL.toFixed(2)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                                    <div>
                                                                        <p className="text-brand-text-secondary">KYC Status</p>
                                                                        <span className={`badge ${u.kycStatus === 'approved' ? 'badge-success' : u.kycStatus === 'rejected' ? 'badge-danger' : 'badge-info'}`}>
                                                                            {u.kycStatus || 'not_submitted'}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-brand-text-secondary">Account Status</p>
                                                                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {u.kycDocumentUrl && (
                                                                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                                                        <p className="text-xs text-brand-text-secondary mb-2">KYC Document</p>
                                                                        <div className="flex items-center gap-2">
                                                                            {u.kycDocumentType && (
                                                                                <span className="text-xs text-brand-text-secondary">Type: {u.kycDocumentType.replace('_', ' ')}</span>
                                                                            )}
                                                                            {u.kycDocumentNumber && (
                                                                                <span className="text-xs text-brand-text-secondary">No: {u.kycDocumentNumber}</span>
                                                                            )}
                                                                        </div>
                                                                        <a
                                                                            href={u.kycDocumentUrl.startsWith('http') ? u.kycDocumentUrl : `${API_URL}${u.kycDocumentUrl}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="mt-2 inline-block text-xs text-brand-gold hover:underline font-semibold"
                                                                        >
                                                                            {u.kycDocumentUrl.toLowerCase().endsWith('.pdf') ? 'View PDF Document' : 'View Document Image'}
                                                                        </a>
                                                                    </div>
                                                                )}
                                                                {u.createdAt && (
                                                                    <div className="text-xs text-brand-text-secondary">
                                                                        Registered: {new Date(u.createdAt).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => setUserStatus(u._id, !u.isActive)}
                                                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${u.isActive ? 'bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 text-brand-red' : 'bg-brand-green/10 border border-brand-green/20 hover:bg-brand-green/20 text-brand-green'}`}
                                                                    >
                                                                        {u.isActive ? 'Suspend' : 'Activate'}
                                                                    </button>
                                                                    <div className="flex-1 relative">
                                                                        <select
                                                                            value={u.kycStatus || 'not_submitted'}
                                                                            disabled={kycUpdatingUserId === u._id}
                                                                            onChange={(e) => setUserKycStatus(u._id, e.target.value)}
                                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider focus:border-brand-gold outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {/* not_submitted is display-only — selecting it is a no-op (guarded in setUserKycStatus) */}
                                                                            <option value="not_submitted" className="bg-brand-obsidian">Not submitted</option>
                                                                            <option value="pending" className="bg-brand-obsidian">Pending</option>
                                                                            <option value="approved" className="bg-brand-obsidian">Approved</option>
                                                                            <option value="rejected" className="bg-brand-obsidian">Rejected</option>
                                                                        </select>
                                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                                                            {kycUpdatingUserId === u._id ? (
                                                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                                                            ) : (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {u.kycStatus === 'pending' && (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setUserKycStatus(u._id, 'approved')}
                                                                            disabled={kycUpdatingUserId === u._id}
                                                                            className="flex-1 py-1.5 bg-brand-green/10 border border-brand-green/30 hover:bg-brand-green/20 text-brand-green text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {kycUpdatingUserId === u._id ? '...' : 'Approve KYC'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setUserKycStatus(u._id, 'rejected')}
                                                                            disabled={kycUpdatingUserId === u._id}
                                                                            className="flex-1 py-1.5 bg-brand-red/10 border border-brand-red/30 hover:bg-brand-red/20 text-brand-red text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {kycUpdatingUserId === u._id ? '...' : 'Reject KYC'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openUserTransactions(u._id)}
                                                                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    View transactions
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openUserOrders(u._id)}
                                                                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    View Orders
                                                                </button>
                                                                <button
                                                                    onClick={() => openBalanceModal(u._id)}
                                                                    className="w-full py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    Adjust Balance
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUserToEdit(u);
                                                                        setEditUserForm({
                                                                            firstName: u.firstName || '',
                                                                            lastName: u.lastName || '',
                                                                            email: u.email || '',
                                                                            phone: u.phone || '',
                                                                        });
                                                                        setShowEditUserModal(true);
                                                                    }}
                                                                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    Edit Profile
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUserToResetPassword(u._id);
                                                                        setShowResetPasswordModal(true);
                                                                    }}
                                                                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    Reset Password
                                                                </button>
                                                                {u.twoFactorEnabled && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedUserToDisable2FA(u._id);
                                                                                setShowDisable2FAModal(true);
                                                                            }}
                                                                            className="w-full py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-semibold rounded transition-colors"
                                                                        >
                                                                            Disable 2FA
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedUserToReset2FA(u._id);
                                                                                setShowReset2FAModal(true);
                                                                            }}
                                                                            className="w-full py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-semibold rounded transition-colors"
                                                                        >
                                                                            Reset 2FA
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUserToDelete(u._id);
                                                                        setShowDeleteUserModal(true);
                                                                    }}
                                                                    className="w-full py-2 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-xs font-semibold rounded transition-colors"
                                                                >
                                                                    Delete User
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                        }
                                    </div>
                                );
                            })()}

                            {/* Pagination Controls for Users */}
                            {usersPagination.totalPages > 1 && (
                                <div className="card rounded-lg p-4 mt-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-brand-text-secondary">Items per page:</span>
                                            <select
                                                value={usersPagination.limit}
                                                onChange={(e) => {
                                                    setUsersPagination({ ...usersPagination, limit: parseInt(e.target.value), page: 1 });
                                                }}
                                                className="input-field rounded px-2 py-1 text-xs"
                                            >
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                                <option value={200}>200</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-brand-text-secondary">
                                                Page {usersPagination.page} of {usersPagination.totalPages} ({usersPagination.total} total)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setUsersPagination({ ...usersPagination, page: Math.max(1, usersPagination.page - 1) })}
                                                disabled={usersPagination.page === 1}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setUsersPagination({ ...usersPagination, page: Math.min(usersPagination.totalPages, usersPagination.page + 1) })}
                                                disabled={usersPagination.page === usersPagination.totalPages}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                    }

                    {/* Withdrawals Tab */}
                    {activeTab === 'withdrawals' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Withdrawal Requests</h1>
                                    <p className="text-sm text-brand-text-secondary">Review and approve or reject user withdrawal requests. Rejecting refunds the user.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <select
                                        value={withdrawalStatusFilter}
                                        onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
                                        className="input-field rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">All</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="PROCESSING">PROCESSING</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                        <option value="REJECTED">REJECTED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                    <button onClick={loadWithdrawalRequests} className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded-lg">
                                        Refresh
                                    </button>
                                </div>
                            </div>
                            <div className="card rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-brand-text-secondary uppercase">
                                                <th className="px-4 py-3 text-left">User</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                                <th className="px-4 py-3 text-right">Fee</th>
                                                <th className="px-4 py-3 text-right">Net</th>
                                                <th className="px-4 py-3 text-left">Chain</th>
                                                <th className="px-4 py-3 text-left">Wallet Address</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-4 py-3 text-left">Created</th>
                                                <th className="px-4 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {withdrawalRequests.map((r: any) => (
                                                <tr key={r._id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-semibold">{r.userName || r.userEmail || '-'}</p>
                                                            <p className="text-[10px] text-brand-text-secondary">{r.userEmail || r.userId}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">${(r.amount ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-mono">${(r.fee ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-brand-gold">${(r.netAmount ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3">{r.chain ?? '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-[10px] max-w-[140px] truncate" title={r.walletAddress}>{r.walletAddress ?? '-'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`badge ${r.status === 'PENDING' ? 'badge-warning' : r.status === 'COMPLETED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-danger' : 'badge-info'}`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[10px]">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {r.status === 'PENDING' && (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => approveWithdrawal(r._id)}
                                                                    disabled={approvingWithdrawalId === r._id}
                                                                    className="px-3 py-1.5 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green text-[10px] font-semibold rounded disabled:opacity-50"
                                                                >
                                                                    {approvingWithdrawalId === r._id ? '…' : 'Approve'}
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectWithdrawal(r._id)}
                                                                    disabled={rejectingWithdrawalId === r._id}
                                                                    className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded disabled:opacity-50"
                                                                >
                                                                    {rejectingWithdrawalId === r._id ? '…' : 'Reject'}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {r.status === 'COMPLETED' && r.txHash && (
                                                            <span className="text-[10px] font-mono text-brand-text-secondary" title={r.txHash}>Tx: {r.txHash.slice(0, 8)}…</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {withdrawalRequests.length === 0 && (
                                    <div className="p-8 text-center text-brand-text-secondary text-sm">No withdrawal requests found.</div>
                                )}
                                {withdrawalPagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                                        <span className="text-xs text-brand-text-secondary">
                                            Page {withdrawalPagination.page} of {withdrawalPagination.totalPages} ({withdrawalPagination.total} total)
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setWithdrawalPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                                disabled={withdrawalPagination.page <= 1}
                                                className="px-3 py-1.5 bg-white/5 rounded text-xs font-semibold disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setWithdrawalPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                                                disabled={withdrawalPagination.page >= withdrawalPagination.totalPages}
                                                className="px-3 py-1.5 bg-white/5 rounded text-xs font-semibold disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deposits Tab */}
                    {activeTab === 'deposits' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Deposit Intents</h1>
                                    <p className="text-sm text-brand-text-secondary">Review and confirm pending deposits</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={depositStatusFilter}
                                        onChange={(e) => setDepositStatusFilter(e.target.value)}
                                        className="input-field rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">All</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="SUBMITTED">SUBMITTED (awaiting review)</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                        <option value="FAILED">FAILED</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                    <button onClick={loadDepositIntents} className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded-lg">
                                        Refresh
                                    </button>
                                </div>
                            </div>
                            <div className="card rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-brand-text-secondary uppercase">
                                                <th className="px-4 py-3 text-left">User</th>
                                                <th className="px-4 py-3 text-left">Method</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                                <th className="px-4 py-3 text-left">Reference</th>
                                                <th className="px-4 py-3 text-center">Screenshot</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-4 py-3 text-left">Created</th>
                                                <th className="px-4 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {depositIntents.map((d: any) => {
                                                const screenshotUrl = d.paymentScreenshotUrl?.startsWith('http') ? d.paymentScreenshotUrl : d.paymentScreenshotUrl ? `${API_URL}${d.paymentScreenshotUrl}` : null;
                                                return (
                                                    <tr key={d._id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-semibold">{d.userName || d.userEmail || '-'}</p>
                                                                <p className="text-[10px] text-brand-text-secondary">{d.userEmail || d.userId}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">{d.method || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-mono">${(d.amount ?? 0).toFixed(2)} {d.currency || ''}</td>
                                                        <td className="px-4 py-3 font-mono text-[10px]">{d.reference || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {screenshotUrl ? (
                                                                <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                                                                    {screenshotUrl.toLowerCase().endsWith('.pdf') ? (
                                                                        <span className="text-brand-gold text-[10px] font-semibold">View PDF</span>
                                                                    ) : (
                                                                        <img src={screenshotUrl} alt="Payment" className="w-12 h-12 object-cover rounded border border-white/10" />
                                                                    )}
                                                                </a>
                                                            ) : (
                                                                <span className="text-brand-text-secondary text-[10px]">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`badge ${d.status === 'PENDING' ? 'badge-info' : d.status === 'SUBMITTED' ? 'badge-warning' : d.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                                                                {d.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-[10px]">{d.createdAt ? new Date(d.createdAt).toLocaleString() : '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {(d.status === 'PENDING' || d.status === 'SUBMITTED') && (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => confirmDeposit(d.reference)}
                                                                        disabled={confirmingRef === d.reference}
                                                                        className="px-3 py-1.5 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green text-[10px] font-semibold rounded disabled:opacity-50"
                                                                    >
                                                                        {confirmingRef === d.reference ? '…' : 'Confirm'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => rejectDeposit(d.reference)}
                                                                        disabled={rejectingRef === d.reference}
                                                                        className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded disabled:opacity-50"
                                                                    >
                                                                        {rejectingRef === d.reference ? '…' : 'Reject'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {depositIntents.length === 0 && (
                                    <div className="p-8 text-center text-brand-text-secondary text-sm">No deposit intents found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Audit Log Tab */}
                    {activeTab === 'audit' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Audit Log</h1>
                                    <p className="text-sm text-brand-text-secondary">Recent admin actions</p>
                                </div>
                                <button onClick={loadAuditLog} className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded-lg">
                                    Refresh
                                </button>
                            </div>
                            <div className="card rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-brand-text-secondary uppercase">
                                                <th className="px-4 py-3 text-left">Time</th>
                                                <th className="px-4 py-3 text-left">Action</th>
                                                <th className="px-4 py-3 text-left">Target</th>
                                                <th className="px-4 py-3 text-left">Details</th>
                                                <th className="px-4 py-3 text-left">Admin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLog.map((entry: any, idx: number) => (
                                                <tr key={entry._id || idx} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-[10px] font-mono">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
                                                    <td className="px-4 py-3 font-semibold">{entry.action || '-'}</td>
                                                    <td className="px-4 py-3">{entry.targetType && entry.targetId ? `${entry.targetType}: ${entry.targetId}` : '-'}</td>
                                                    <td className="px-4 py-3 text-[10px]">{entry.details ? JSON.stringify(entry.details) : '-'}</td>
                                                    <td className="px-4 py-3">{entry.adminEmail || entry.adminId || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {auditLog.length === 0 && (
                                    <div className="p-8 text-center text-brand-text-secondary text-sm">No audit entries yet.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Liquidity Rules Tab */}
                    {activeTab === 'rules' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Liquidity Rules</h1>
                                    <p className="text-sm text-brand-text-secondary">Configure market execution parameters</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={selectedSymbol}
                                        onChange={(e) => {
                                            setSelectedSymbol(e.target.value);
                                            loadData();
                                        }}
                                        className="input-field rounded-lg px-4 py-2 text-sm font-semibold"
                                    >
                                        {['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={loadData}
                                        className="px-4 py-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-semibold rounded-lg"
                                        title="Refresh data"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">Pricing Engine</h3>
                                    <div className="space-y-4">
                                        <InputField label="Bid Spread" value={ruleForm.bidSpread} onChange={v => setRuleForm({ ...ruleForm, bidSpread: v })} step={0.00001} />
                                        <InputField label="Ask Spread" value={ruleForm.askSpread} onChange={v => setRuleForm({ ...ruleForm, askSpread: v })} step={0.00001} />
                                        <InputField label="Price Offset" value={ruleForm.priceOffset} onChange={v => setRuleForm({ ...ruleForm, priceOffset: v })} step={0.00001} />
                                    </div>
                                </div>

                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">Execution & Risk</h3>
                                    <div className="space-y-4">
                                        <InputField label="Min Slippage" value={ruleForm.slippageMin} onChange={v => setRuleForm({ ...ruleForm, slippageMin: v })} step={0.00001} />
                                        <InputField label="Max Slippage" value={ruleForm.slippageMax} onChange={v => setRuleForm({ ...ruleForm, slippageMax: v })} step={0.00001} />
                                        <InputField label="Execution Delay (ms)" value={ruleForm.executionDelayMs} onChange={v => setRuleForm({ ...ruleForm, executionDelayMs: v })} isInt />
                                    </div>
                                </div>

                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">Swap Configuration</h3>
                                    <div className="space-y-4">
                                        <InputField label="Long Swap/Day" value={ruleForm.longSwapPerDay} onChange={v => setRuleForm({ ...ruleForm, longSwapPerDay: v })} />
                                        <InputField label="Short Swap/Day" value={ruleForm.shortSwapPerDay} onChange={v => setRuleForm({ ...ruleForm, shortSwapPerDay: v })} />
                                    </div>
                                </div>

                                <div className="card rounded-lg p-6 flex flex-col justify-center">
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-brand-text-secondary mb-4">Market Status</label>
                                        <button
                                            onClick={() => freezeSymbol(selectedSymbol, !ruleForm.isFrozen)}
                                            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${ruleForm.isFrozen ? 'bg-brand-red text-white' : 'bg-brand-green text-white'
                                                }`}
                                        >
                                            {ruleForm.isFrozen ? 'MARKET FROZEN' : 'MARKET ACTIVE'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={updateLiquidityRule}
                                        className="w-full btn-primary py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                                        disabled={!selectedSymbol}
                                    >
                                        Deploy Settings
                                    </button>
                                    <p className="text-xs text-brand-text-secondary text-center mt-2">
                                        Settings apply to {selectedSymbol} only
                                    </p>
                                </div>
                            </div>

                            {/* All Symbols Overview */}
                            <div className="card rounded-lg p-6">
                                <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">All Symbols Status</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD'].map(symbol => {
                                        const rule = liquidityRules.find(r => r.symbol === symbol);
                                        return (
                                            <div key={symbol} className="text-center">
                                                <p className="text-xs text-brand-text-secondary mb-2">{symbol}</p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSymbol(symbol);
                                                        loadData();
                                                    }}
                                                    className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${rule?.isFrozen
                                                        ? 'bg-brand-red/20 text-brand-red border border-brand-red/30'
                                                        : 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                                                        }`}
                                                >
                                                    {rule?.isFrozen ? 'FROZEN' : 'ACTIVE'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Configuration Tab */}
                    {activeTab === 'payment' && (
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold mb-2">Payment Configuration</h2>
                                <p className="text-sm text-brand-text-secondary">Configure payment gateway keys and settings</p>
                            </div>

                            <div className="space-y-6">
                                {/* SumUp Configuration */}
                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">SumUp Payment Gateway</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">SumUp API Key</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.sumupApiKey || ''}
                                                onChange={(e) => setPaymentConfig({ ...paymentConfig, sumupApiKey: e.target.value })}
                                                placeholder="Enter your SumUp API key"
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                            <p className="text-xs text-brand-text-secondary mt-1">Your SumUp public API key</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">SumUp Checkout URL (Optional)</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.sumupCheckoutUrl || ''}
                                                onChange={(e) => setPaymentConfig({ ...paymentConfig, sumupCheckoutUrl: e.target.value })}
                                                placeholder="https://checkout.sumup.com/pay?key=..."
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                            <p className="text-xs text-brand-text-secondary mt-1">Full checkout URL (if different from default)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Crypto Addresses */}
                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">Crypto Wallet Addresses</h3>
                                    <div className="space-y-4">
                                        {['ETH', 'BTC', 'TRON', 'SOLANA', 'POLYGON', 'BASE', 'BNB', 'ARBITRUM', 'LINEA', 'USDT_ERC20', 'USDT_TRC20'].map((network) => (
                                            <div key={network}>
                                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">{network} Address</label>
                                                <input
                                                    type="text"
                                                    value={paymentConfig.cryptoAddresses?.[network] || ''}
                                                    onChange={(e) => setPaymentConfig({
                                                        ...paymentConfig,
                                                        cryptoAddresses: {
                                                            ...paymentConfig.cryptoAddresses,
                                                            [network]: e.target.value,
                                                        },
                                                    })}
                                                    placeholder={`Enter ${network} wallet address`}
                                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div className="card rounded-lg p-6">
                                    <h3 className="text-sm font-bold text-brand-gold mb-4 uppercase">Bank Transfer Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Bank Name</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.bankDetails?.name || ''}
                                                onChange={(e) => setPaymentConfig({
                                                    ...paymentConfig,
                                                    bankDetails: {
                                                        ...paymentConfig.bankDetails,
                                                        name: e.target.value,
                                                    },
                                                })}
                                                placeholder="Investlyin Ltd"
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">IBAN</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.bankDetails?.iban || ''}
                                                onChange={(e) => setPaymentConfig({
                                                    ...paymentConfig,
                                                    bankDetails: {
                                                        ...paymentConfig.bankDetails,
                                                        iban: e.target.value,
                                                    },
                                                })}
                                                placeholder="GB00XXXX00000000000000"
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">SWIFT Code</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.bankDetails?.swift || ''}
                                                onChange={(e) => setPaymentConfig({
                                                    ...paymentConfig,
                                                    bankDetails: {
                                                        ...paymentConfig.bankDetails,
                                                        swift: e.target.value,
                                                    },
                                                })}
                                                placeholder="XXXXGB2L"
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Reference Label</label>
                                            <input
                                                type="text"
                                                value={paymentConfig.bankDetails?.referenceLabel || ''}
                                                onChange={(e) => setPaymentConfig({
                                                    ...paymentConfig,
                                                    bankDetails: {
                                                        ...paymentConfig.bankDetails,
                                                        referenceLabel: e.target.value,
                                                    },
                                                })}
                                                placeholder="Payment reference"
                                                className="w-full input-field rounded-lg px-4 py-2.5"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={savePaymentConfig}
                                        disabled={savingPaymentConfig}
                                        className="px-6 py-3 bg-brand-gold hover:bg-brand-gold/90 text-brand-obsidian font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingPaymentConfig ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orders Management Tab */}
                    {activeTab === 'orders' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Orders Management</h1>
                                    <p className="text-sm text-brand-text-secondary">View and manage all orders (pending, filled, cancelled)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-brand-text-secondary">Total Orders</p>
                                    <p className="text-lg font-bold">{ordersPagination.total || allOrders.length}</p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="card rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Search</label>
                                        <input
                                            type="text"
                                            value={orderFilters.search}
                                            onChange={e => setOrderFilters({ ...orderFilters, search: e.target.value })}
                                            placeholder="Order ID, Symbol, User..."
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Status</label>
                                        <select
                                            value={orderFilters.status}
                                            onChange={e => setOrderFilters({ ...orderFilters, status: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            <option value="PENDING">PENDING</option>
                                            <option value="FILLED">FILLED</option>
                                            <option value="CANCELLED">CANCELLED</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Symbol</label>
                                        <select
                                            value={orderFilters.symbol}
                                            onChange={e => setOrderFilters({ ...orderFilters, symbol: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            {['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'XAUUSD'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Order Type</label>
                                        <select
                                            value={orderFilters.orderType}
                                            onChange={e => setOrderFilters({ ...orderFilters, orderType: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            <option value="LIMIT">LIMIT</option>
                                            <option value="STOP">STOP</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-text-secondary mb-2">User</label>
                                        <select
                                            value={orderFilters.userId}
                                            onChange={e => setOrderFilters({ ...orderFilters, userId: e.target.value })}
                                            className="w-full input-field rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">All</option>
                                            {users.map(u => (
                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOrderFilters({ status: '', symbol: '', userId: '', orderType: '', search: '' })}
                                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>

                            {/* Statistics - Note: These are for current page only */}
                            {(() => {
                                const pendingOrders = allOrders.filter(o => o.status === 'PENDING').length;
                                const filledOrders = allOrders.filter(o => o.status === 'FILLED').length;
                                const cancelledOrders = allOrders.filter(o => o.status === 'CANCELLED').length;
                                const limitOrders = allOrders.filter(o => o.orderType === 'LIMIT').length;
                                const stopOrders = allOrders.filter(o => o.orderType === 'STOP').length;

                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="card rounded-lg p-4">
                                            <p className="text-xs text-brand-text-secondary mb-1">Pending</p>
                                            <p className="text-xl font-bold text-brand-gold">{pendingOrders}</p>
                                        </div>
                                        <div className="card rounded-lg p-4">
                                            <p className="text-xs text-brand-text-secondary mb-1">Filled</p>
                                            <p className="text-xl font-bold text-brand-green">{filledOrders}</p>
                                        </div>
                                        <div className="card rounded-lg p-4">
                                            <p className="text-xs text-brand-text-secondary mb-1">Cancelled</p>
                                            <p className="text-xl font-bold text-brand-red">{cancelledOrders}</p>
                                        </div>
                                        <div className="card rounded-lg p-4">
                                            <p className="text-xs text-brand-text-secondary mb-1">Limit Orders</p>
                                            <p className="text-xl font-bold">{limitOrders}</p>
                                        </div>
                                        <div className="card rounded-lg p-4">
                                            <p className="text-xs text-brand-text-secondary mb-1">Stop Orders</p>
                                            <p className="text-xl font-bold">{stopOrders}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Orders Table */}
                            <div className="card rounded-lg p-6">
                                <div className="overflow-x-auto">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th
                                                        className="pb-3 text-xs font-bold text-brand-text-secondary uppercase cursor-pointer hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const newOrder = ordersSort.sortBy === 'createdAt' && ordersSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                            setOrdersSort({ sortBy: 'createdAt', sortOrder: newOrder });
                                                            setOrdersPagination({ ...ordersPagination, page: 1 });
                                                        }}
                                                    >
                                                        Order ID
                                                        {ordersSort.sortBy === 'createdAt' && (
                                                            <span className="ml-1">{ordersSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                        )}
                                                    </th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">User</th>
                                                    <th
                                                        className="pb-3 text-xs font-bold text-brand-text-secondary uppercase cursor-pointer hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const newOrder = ordersSort.sortBy === 'symbol' && ordersSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                            setOrdersSort({ sortBy: 'symbol', sortOrder: newOrder });
                                                            setOrdersPagination({ ...ordersPagination, page: 1 });
                                                        }}
                                                    >
                                                        Symbol
                                                        {ordersSort.sortBy === 'symbol' && (
                                                            <span className="ml-1">{ordersSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                        )}
                                                    </th>
                                                    <th
                                                        className="pb-3 text-xs font-bold text-brand-text-secondary uppercase cursor-pointer hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const newOrder = ordersSort.sortBy === 'orderType' && ordersSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                            setOrdersSort({ sortBy: 'orderType', sortOrder: newOrder });
                                                            setOrdersPagination({ ...ordersPagination, page: 1 });
                                                        }}
                                                    >
                                                        Type
                                                        {ordersSort.sortBy === 'orderType' && (
                                                            <span className="ml-1">{ordersSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                        )}
                                                    </th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Direction</th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Lot Size</th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Price</th>
                                                    <th
                                                        className="pb-3 text-xs font-bold text-brand-text-secondary uppercase cursor-pointer hover:text-white transition-colors"
                                                        onClick={() => {
                                                            const newOrder = ordersSort.sortBy === 'status' && ordersSort.sortOrder === 'desc' ? 'asc' : 'desc';
                                                            setOrdersSort({ sortBy: 'status', sortOrder: newOrder });
                                                            setOrdersPagination({ ...ordersPagination, page: 1 });
                                                        }}
                                                    >
                                                        Status
                                                        {ordersSort.sortBy === 'status' && (
                                                            <span className="ml-1">{ordersSort.sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                        )}
                                                    </th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Created</th>
                                                    <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allOrders.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} className="py-8 text-center text-brand-text-secondary">
                                                            {orderFilters.status || orderFilters.symbol || orderFilters.orderType || orderFilters.search
                                                                ? 'No orders match the filters'
                                                                : 'No orders found'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        // Client-side filtering for search and user (not supported by backend yet)
                                                        const filteredOrders = allOrders.filter(order => {
                                                            if (orderFilters.userId && order.userId !== orderFilters.userId) return false;
                                                            if (orderFilters.search) {
                                                                const searchLower = orderFilters.search.toLowerCase();
                                                                const userInfo = users.find(u => u._id === order.userId);
                                                                const userSearch = userInfo ? `${userInfo.firstName} ${userInfo.lastName} ${userInfo.email}`.toLowerCase() : '';
                                                                if (!order._id.toLowerCase().includes(searchLower) &&
                                                                    !order.symbol.toLowerCase().includes(searchLower) &&
                                                                    !userSearch.includes(searchLower)) return false;
                                                            }
                                                            return true;
                                                        });

                                                        return filteredOrders.map((order: any) => {
                                                            const userInfo = users.find(u => u._id === order.userId);
                                                            return (
                                                                <tr key={order._id} className="border-b border-white/5">
                                                                    <td className="py-3 text-xs font-mono">{order._id.slice(-8)}</td>
                                                                    <td className="py-3 text-xs">
                                                                        {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Unknown'}
                                                                        <br />
                                                                        <span className="text-brand-text-secondary">{userInfo?.email || order.userId}</span>
                                                                    </td>
                                                                    <td className="py-3 text-xs font-semibold">{order.symbol}</td>
                                                                    <td className="py-3 text-xs">
                                                                        <span className={`badge ${order.orderType === 'LIMIT' ? 'badge-info' : 'badge-warning'}`}>
                                                                            {order.orderType}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 text-xs">
                                                                        <span className={`badge ${order.direction === 'BUY' ? 'badge-success' : 'badge-danger'}`}>
                                                                            {order.direction}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 text-xs">{order.lotSize}</td>
                                                                    <td className="py-3 text-xs">
                                                                        {order.orderType === 'LIMIT' ? order.limitPrice?.toFixed(5) : order.triggerPrice?.toFixed(5)}
                                                                    </td>
                                                                    <td className="py-3 text-xs">
                                                                        <span className={`badge ${order.status === 'PENDING' ? 'badge-warning' :
                                                                            order.status === 'FILLED' ? 'badge-success' :
                                                                                'badge-danger'
                                                                            }`}>
                                                                            {order.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 text-xs text-brand-text-secondary">
                                                                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                                                                    </td>
                                                                    <td className="py-3">
                                                                        <div className="flex gap-2">
                                                                            {order.status === 'PENDING' && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedOrderToDelete(order._id);
                                                                                        setShowDeleteOrderModal(true);
                                                                                    }}
                                                                                    className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded transition-colors"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                            {order.status === 'FILLED' && order.tradeId && (
                                                                                <span className="text-xs text-brand-text-secondary">Trade: {order.tradeId.slice(-8)}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination Controls for Orders */}
                                {ordersPagination.totalPages > 1 && (
                                    <div className="card rounded-lg p-4 mt-4">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-brand-text-secondary">Items per page:</span>
                                                <select
                                                    value={ordersPagination.limit}
                                                    onChange={(e) => {
                                                        setOrdersPagination({ ...ordersPagination, limit: parseInt(e.target.value), page: 1 });
                                                    }}
                                                    className="input-field rounded px-2 py-1 text-xs"
                                                >
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                    <option value={200}>200</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-brand-text-secondary">
                                                    Page {ordersPagination.page} of {ordersPagination.totalPages} ({ordersPagination.total} total)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setOrdersPagination({ ...ordersPagination, page: Math.max(1, ordersPagination.page - 1) })}
                                                    disabled={ordersPagination.page === 1}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() => setOrdersPagination({ ...ordersPagination, page: Math.min(ordersPagination.totalPages, ordersPagination.page + 1) })}
                                                    disabled={ordersPagination.page === ordersPagination.totalPages}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-semibold transition-colors"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Trade Edit Modal — Admin can edit any user's trade */}
            {showTradeModal && editingTrade && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-3xl rounded-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-xl font-bold">Edit Trade — {editingTrade.symbol}</h2>
                                <p className="text-sm text-brand-text-secondary mt-1">
                                    User: {users.find(u => u._id === editingTrade.userId) ? `${users.find(u => u._id === editingTrade.userId)?.firstName} ${users.find(u => u._id === editingTrade.userId)?.lastName} (${users.find(u => u._id === editingTrade.userId)?.email})` : editingTrade.userId}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowTradeModal(false)}
                                className="text-brand-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Direction</label>
                                    <select
                                        value={tradeEditForm.direction}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, direction: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Lot Size</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tradeEditForm.lotSize}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, lotSize: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Prices */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Open Price</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={tradeEditForm.openPrice}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, openPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2 flex items-center gap-2">
                                        Close Price
                                        {(editingTrade?.status || 'OPEN') === 'OPEN' && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-green/20 text-brand-green">Live</span>
                                        )}
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.00001"
                                            value={tradeEditForm.closePrice}
                                            onChange={e => {
                                                setClosePriceManuallyEdited(true);
                                                setTradeEditForm({ ...tradeEditForm, closePrice: parseFloat(e.target.value) || 0 });
                                            }}
                                            className="flex-1 input-field rounded-lg px-4 py-2.5 font-mono"
                                        />
                                        {(editingTrade?.status || 'OPEN') === 'OPEN' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!Array.isArray(prices) || !editingTrade?.symbol) return;
                                                    const cp = prices.find((p: any) => p.symbol === editingTrade.symbol);
                                                    if (!cp) return;
                                                    const live = editingTrade.direction === 'BUY' ? cp.bid : cp.ask;
                                                    if (typeof live === 'number' && Number.isFinite(live)) {
                                                        setClosePriceManuallyEdited(false);
                                                        setTradeEditForm(prev => ({ ...prev, closePrice: live }));
                                                    }
                                                }}
                                                className="px-3 py-2.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-brand-text border border-white/20 whitespace-nowrap"
                                            >
                                                Use live
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SL/TP */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Stop Loss</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={tradeEditForm.sl}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, sl: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Take Profit</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={tradeEditForm.tp}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, tp: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Fees */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Swap</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tradeEditForm.swap}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, swap: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Commission</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tradeEditForm.commission}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, commission: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">P/L (override)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tradeEditForm.pnl}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, pnl: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5 font-mono"
                                        placeholder="Leave 0 for auto"
                                    />
                                </div>
                            </div>

                            {/* P/L Preview */}
                            {pnlPreview !== null && (
                                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                    <p className="text-xs text-brand-text-secondary mb-1">Estimated P/L</p>
                                    <p className={`text-2xl font-bold ${pnlPreview >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {pnlPreview >= 0 ? '+' : ''}{pnlPreview.toFixed(2)}
                                    </p>
                                </div>
                            )}

                            {/* Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Status</label>
                                    <select
                                        value={tradeEditForm.status}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, status: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    >
                                        <option value="OPEN">OPEN</option>
                                        <option value="CLOSED">CLOSED</option>
                                        <option value="PENDING">PENDING</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Active Status</label>
                                    <select
                                        value={tradeEditForm.isActive.toString()}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, isActive: e.target.value === 'true' })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Open Time</label>
                                    <input
                                        type="datetime-local"
                                        value={tradeEditForm.createdAt}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, createdAt: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Close Time</label>
                                    <input
                                        type="datetime-local"
                                        value={tradeEditForm.closedAt}
                                        onChange={e => setTradeEditForm({ ...tradeEditForm, closedAt: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                            </div>

                            {/* Admin Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Admin Notes</label>
                                <textarea
                                    value={tradeEditForm.adminNotes}
                                    onChange={e => setTradeEditForm({ ...tradeEditForm, adminNotes: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5 h-24 resize-none"
                                    placeholder="Add admin notes..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-5">
                            <button
                                onClick={() => setShowTradeModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTradeChanges}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Force Close Modal */}
            {showForceCloseModal && editingTrade && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Force Close Trade</h2>
                            <button
                                onClick={() => {
                                    setShowForceCloseModal(false);
                                    setEditingTrade(null);
                                    setForceClosePrice('');
                                }}
                                className="text-brand-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-brand-text-secondary mb-2">Trade: {editingTrade.symbol} {editingTrade.direction}</p>
                                <p className="text-xs text-brand-text-secondary">Current Open Price: {editingTrade.openPrice?.toFixed(5)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Close Price</label>
                                <input
                                    type="number"
                                    value={forceClosePrice}
                                    onChange={e => setForceClosePrice(e.target.value)}
                                    placeholder="Enter close price"
                                    className="w-full input-field rounded-lg px-4 py-3 text-lg font-mono"
                                    step="0.00001"
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={() => {
                                        setShowForceCloseModal(false);
                                        setEditingTrade(null);
                                        setForceClosePrice('');
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleForceClose}
                                    className="flex-1 btn-danger py-3 rounded-lg font-semibold"
                                >
                                    Force Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Adjustment Modal */}
            {showBalanceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Adjust User Balance</h2>
                            <button
                                onClick={() => {
                                    setShowBalanceModal(false);
                                    setBalanceAdjustment({ userId: '', amount: '', description: '' });
                                }}
                                className="text-brand-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Amount</label>
                                <input
                                    type="number"
                                    value={balanceAdjustment.amount}
                                    onChange={e => setBalanceAdjustment({ ...balanceAdjustment, amount: e.target.value })}
                                    placeholder="Positive to add, negative to subtract"
                                    className="w-full input-field rounded-lg px-4 py-3 text-lg font-mono"
                                    step="0.01"
                                />
                                <p className="text-xs text-brand-text-secondary mt-2">Enter positive value to add funds, negative to subtract</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2">Description</label>
                                <input
                                    type="text"
                                    value={balanceAdjustment.description}
                                    onChange={e => setBalanceAdjustment({ ...balanceAdjustment, description: e.target.value })}
                                    placeholder="Enter description"
                                    className="w-full input-field rounded-lg px-4 py-3"
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={() => {
                                        setShowBalanceModal(false);
                                        setBalanceAdjustment({ userId: '', amount: '', description: '' });
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBalanceAdjustment}
                                    className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                                >
                                    Adjust Balance
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User transactions modal (admin view any user's ledger) */}
            {showTransactionsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-4xl max-h-[90vh] rounded-2xl p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                Transactions {transactionsUserId && users.find(u => u._id === transactionsUserId) ? `— ${users.find(u => u._id === transactionsUserId)?.firstName} ${users.find(u => u._id === transactionsUserId)?.lastName}` : ''}
                            </h2>
                            <button
                                type="button"
                                onClick={() => { setShowTransactionsModal(false); setTransactionsUserId(null); setUserTransactions([]); }}
                                className="text-brand-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-x-auto overflow-y-auto flex-1">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[10px] font-bold text-brand-text-secondary uppercase">
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-left">Type</th>
                                        <th className="px-4 py-2 text-left">Description</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-right">Balance after</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userTransactions.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-text-secondary">No transactions</td></tr>
                                    ) : (
                                        userTransactions.map((tx: any) => (
                                            <tr key={tx._id} className="border-b border-white/5">
                                                <td className="px-4 py-2 font-mono text-[10px]">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}</td>
                                                <td className="px-4 py-2">{tx.type || '-'}</td>
                                                <td className="px-4 py-2 text-brand-text-secondary max-w-xs truncate">{tx.description || '-'}</td>
                                                <td className={`px-4 py-2 text-right font-mono ${tx.amount >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>{tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-right font-mono">{tx.balanceAfter?.toFixed(2) ?? '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Trade Modal */}
            {showCreateTradeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6">Create Trade for User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">User</label>
                                <select
                                    value={createTradeForm.userId}
                                    onChange={e => setCreateTradeForm({ ...createTradeForm, userId: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                >
                                    <option value="">Select User</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Symbol</label>
                                    <input
                                        type="text"
                                        value={createTradeForm.symbol}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, symbol: e.target.value.toUpperCase() })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Direction</label>
                                    <select
                                        value={createTradeForm.direction}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, direction: e.target.value as 'BUY' | 'SELL' })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Lot Size</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={createTradeForm.lotSize}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, lotSize: parseFloat(e.target.value) || 0.01 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Market Price</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={createTradeForm.marketPrice}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, marketPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">
                                        Custom Open Price (optional - overrides calculated price)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={createTradeForm.customOpenPrice}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, customOpenPrice: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                        placeholder="Leave empty to use calculated price"
                                    />
                                    <p className="text-xs text-brand-text-secondary mt-1">
                                        If set, this exact price will be used as open price (ignores liquidity rules)
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Stop Loss (optional)</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={createTradeForm.sl}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, sl: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Take Profit (optional)</label>
                                    <input
                                        type="number"
                                        step="0.00001"
                                        value={createTradeForm.tp}
                                        onChange={e => setCreateTradeForm({ ...createTradeForm, tp: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateTradeModal(false);
                                    setCreateTradeForm({ userId: '', symbol: 'EURUSD', direction: 'BUY', lotSize: 0.01, marketPrice: 0, customOpenPrice: '', sl: '', tp: '' });
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createTradeForUser}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Create Trade
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Trade Modal */}
            {showDeleteTradeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6 text-brand-red">Delete Trade</h2>
                        <p className="text-sm text-brand-text-secondary mb-6">Are you sure you want to delete this trade? This action cannot be undone.</p>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => {
                                    setShowDeleteTradeModal(false);
                                    setSelectedTradeToDelete(null);
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteTrade}
                                className="flex-1 py-3 bg-brand-red hover:bg-brand-red/90 rounded-lg font-semibold text-white transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            {showDeleteUserModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6 text-brand-red">Delete User</h2>
                        <p className="text-sm text-brand-text-secondary mb-6">Are you sure you want to delete this user? This will permanently delete the user account and all associated data. This action cannot be undone.</p>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => {
                                    setShowDeleteUserModal(false);
                                    setSelectedUserToDelete(null);
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteUser}
                                className="flex-1 py-3 bg-brand-red hover:bg-brand-red/90 rounded-lg font-semibold text-white transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Profile Modal */}
            {showEditUserModal && selectedUserToEdit && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6">Edit User Profile</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={editUserForm.firstName}
                                        onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={editUserForm.lastName}
                                        onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                                        className="w-full input-field rounded-lg px-4 py-2.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editUserForm.email}
                                    onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Phone (optional)</label>
                                <input
                                    type="text"
                                    value={editUserForm.phone}
                                    onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowEditUserModal(false);
                                    setSelectedUserToEdit(null);
                                    setEditUserForm({ firstName: '', lastName: '', email: '', phone: '' });
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updateUserProfile}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6">Reset User Password</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={resetPasswordForm.newPassword}
                                    onChange={e => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                    placeholder="Minimum 6 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-brand-text-secondary mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={resetPasswordForm.confirmPassword}
                                    onChange={e => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                                    className="w-full input-field rounded-lg px-4 py-2.5"
                                    placeholder="Re-enter password"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowResetPasswordModal(false);
                                    setSelectedUserToResetPassword(null);
                                    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={resetUserPassword}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Reset Password
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable 2FA Modal */}
            {showDisable2FAModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6">Disable 2FA for User</h2>
                        <p className="text-brand-text-secondary mb-6">
                            Are you sure you want to disable 2FA for this user? They will need to set it up again if they want to re-enable it.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowDisable2FAModal(false);
                                    setSelectedUserToDisable2FA(null);
                                }}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={disableUser2FA}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Disable 2FA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset 2FA Modal */}
            {showReset2FAModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6">Reset 2FA for User</h2>
                        <p className="text-brand-text-secondary mb-6">
                            This will clear the user's 2FA secret and disable 2FA. They will need to set up 2FA again from scratch.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowReset2FAModal(false);
                                    setSelectedUserToReset2FA(null);
                                }}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={resetUser2FA}
                                className="flex-1 btn-primary py-3 rounded-lg font-semibold"
                            >
                                Reset 2FA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View User Orders Modal */}
            {showOrdersModal && ordersUserId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-4xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">User Orders</h2>
                                <p className="text-sm text-brand-text-secondary mt-1">
                                    {users.find(u => u._id === ordersUserId)?.firstName} {users.find(u => u._id === ordersUserId)?.lastName}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowOrdersModal(false);
                                    setOrdersUserId(null);
                                    setUserOrders([]);
                                }}
                                className="text-brand-text-secondary hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Order ID</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Symbol</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Type</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Direction</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Lot Size</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Price</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Created</th>
                                        <th className="pb-3 text-xs font-bold text-brand-text-secondary uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-brand-text-secondary">
                                                No pending orders found
                                            </td>
                                        </tr>
                                    ) : (
                                        userOrders.map((order: any) => (
                                            <tr key={order._id} className="border-b border-white/5">
                                                <td className="py-3 text-xs font-mono">{order._id.slice(-8)}</td>
                                                <td className="py-3 text-xs font-semibold">{order.symbol}</td>
                                                <td className="py-3 text-xs">
                                                    <span className={`badge ${order.orderType === 'LIMIT' ? 'badge-info' : 'badge-warning'}`}>
                                                        {order.orderType}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs">
                                                    <span className={`badge ${order.direction === 'BUY' ? 'badge-success' : 'badge-danger'}`}>
                                                        {order.direction}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs">{order.lotSize}</td>
                                                <td className="py-3 text-xs">
                                                    {order.orderType === 'LIMIT' ? order.limitPrice?.toFixed(5) : order.triggerPrice?.toFixed(5)}
                                                </td>
                                                <td className="py-3 text-xs text-brand-text-secondary">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}
                                                </td>
                                                <td className="py-3">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrderToDelete(order._id);
                                                            setShowDeleteOrderModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-semibold rounded transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Order Modal */}
            {showDeleteOrderModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md rounded-2xl p-8">
                        <h2 className="text-2xl font-bold mb-6 text-brand-red">Delete Order</h2>
                        <p className="text-sm text-brand-text-secondary mb-6">Are you sure you want to delete this order? This action cannot be undone.</p>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => {
                                    setShowDeleteOrderModal(false);
                                    setSelectedOrderToDelete(null);
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteOrder}
                                className="flex-1 py-3 bg-brand-red hover:bg-brand-red/90 rounded-lg font-semibold text-white transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputField({ label, value, onChange, step = 1, isInt = false }: { label: string, value: any, onChange: (v: any) => void, step?: number, isInt?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-brand-text-secondary mb-2">{label}</label>
            <input
                type="number"
                value={value}
                step={step}
                onChange={e => onChange(isInt ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
                className="w-full input-field rounded-lg px-4 py-2.5 font-mono text-sm"
            />
        </div>
    );
}
