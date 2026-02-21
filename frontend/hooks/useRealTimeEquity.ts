import { useMemo } from 'react';
import { useMarketSocket } from './useMarketSocket';

/**
 * Helper function to categorize trading symbols by asset type
 */
function getSymbolCategory(symbol: string): 'forex' | 'stocks' | 'indices' | 'crypto' | 'metals' | 'energies' {
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
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC', 'JPM', 'V', 'JNJ', 'WMT', 'MA', 'PG', 'DIS', 'BAC', 'XOM', 'CSCO', 'PFE', 'T'];
    if (stockSymbols.some(s => sym.includes(s))) {
        return 'stocks';
    }
    
    // Indices
    if (sym.includes('SPX') || sym.includes('NAS') || sym.includes('DJI') || sym.includes('DOW') || 
        sym.includes('FTSE') || sym.includes('UK100') || sym.includes('DAX') || sym.includes('GER30') || 
        sym.includes('NIKKEI') || sym.includes('JPN225') || sym.includes('AUS200') || sym.includes('ASX') ||
        sym.includes('US30') || sym.includes('SWI20') || sym.includes('SMI') || sym.includes('ESP35') || 
        sym.includes('IBEX') || sym.includes('FRA40') || sym.includes('CAC')) {
        return 'indices';
    }
    
    // Default to Forex
    return 'forex';
}

/**
 * Hook to calculate real-time equity (balance + floating P/L from open trades)
 * Uses asset-type aware contract sizes for accurate P/L calculation
 * @param balance - Base wallet balance
 * @param trades - Array of open trades
 * @returns Real-time equity value
 */
export function useRealTimeEquity(balance: number = 0, trades: any[] = []): number {
    const { prices } = useMarketSocket();

    const totalPnL = useMemo(() => {
        if (!Array.isArray(trades) || trades.length === 0) return 0;
        if (!Array.isArray(prices) || prices.length === 0) return 0;

        return trades.reduce((sum, t) => {
            // Only calculate P/L for open trades
            if (t.status !== 'OPEN') return sum;
            
            // Case-insensitive price lookup
            const cp = prices.find((p: any) => p.symbol.toUpperCase() === t.symbol.toUpperCase());
            if (!cp) return sum;
            
            // Get current market price based on trade direction
            // BUY positions: Use bid price (what you'd get if you close now)
            // SELL positions: Use ask price (what you'd pay to close now)
            const cmp: number | undefined = t.direction === 'BUY' ? cp.bid : cp.ask;
            
            if (typeof cmp !== 'number' || !t.openPrice || cmp <= 0 || t.openPrice <= 0) return sum;
            
            // Calculate P/L with asset-type aware contract size
            const category = getSymbolCategory(t.symbol);
            let contractSize: number;
            
            switch (category) {
                case 'forex':
                    contractSize = 100000; // Standard forex lot size
                    break;
                case 'stocks':
                case 'indices':
                case 'crypto':
                    contractSize = 1; // 1 share/unit per lot
                    break;
                case 'metals':
                    if (t.symbol.toUpperCase().includes('XAU')) {
                        contractSize = 100; // 100 oz per lot for gold
                    } else if (t.symbol.toUpperCase().includes('XAG')) {
                        contractSize = 5000; // 5000 oz per lot for silver
                    } else {
                        contractSize = 100; // Default
                    }
                    break;
                case 'energies':
                    contractSize = 1000; // 1000 barrels/units per lot
                    break;
                default:
                    contractSize = 100000; // Default to forex
            }
            
            // Calculate P/L: (price_diff) * lotSize * contractSize
            // BUY: profit when close price > open price
            //   P/L = (close_bid - open_ask) * lotSize * contractSize
            // SELL: profit when close price < open price  
            //   P/L = (open_bid - close_ask) * lotSize * contractSize
            const pnl = t.direction === 'BUY'
                ? (cmp - t.openPrice) * t.lotSize * contractSize
                : (t.openPrice - cmp) * t.lotSize * contractSize;
            
            return sum + (pnl || 0);
        }, 0);
    }, [trades, prices]);

    return balance + totalPnL;
}
