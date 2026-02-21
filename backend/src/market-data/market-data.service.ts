import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  sourceTimestamp: number;
  isReal: boolean;
  dataQuality: 'real' | 'stale';
  source: 'yahoo';
}

export interface OhlcCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const OHLC_CACHE_TTL: Record<string, number> = {
  M1: 90,
  M2: 120,
  M5: 180,
  M15: 300,
  M30: 360,
  H1: 600,
  H4: 900,
  D1: 3600,
  W1: 7200,
  MN1: 14400,
};
const PRICES_CACHE_TTL = 2;

/** Headers to avoid 403/429 from Yahoo (required for real-time quote and chart APIs) */
const YAHOO_FETCH_OPTIONS: RequestInit = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  },
};

const QUOTE_BATCH_SIZE = 10;
const CHART_CONCURRENCY = 3;
/** Delay between quote batches to avoid 429 */
const QUOTE_BATCH_DELAY_MS = 400;
/** Live price refresh interval (ms) - higher reduces Yahoo rate limit hits */
const LIVE_PRICE_REFRESH_MS = 5000;
/** On 429, wait this long before retry (ms) */
const OHLC_429_RETRY_DELAY_MS = 12000;
/** Min delay between any two Yahoo OHLC requests (global throttle to avoid 429) */
const OHLC_GLOBAL_DELAY_MS = 3500;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly livePrices: Map<string, MarketPrice> = new Map();
  /** In-memory fallback when Yahoo returns 429 so chart can show last-known data */
  private readonly ohlcMemoryCache: Map<string, OhlcCandle[]> = new Map();
  /** After 429, skip Yahoo for this key for this many ms */
  private readonly ohlc429CooldownUntil: Map<string, number> = new Map();
  private static readonly OHLC_429_COOLDOWN_MS = 60000;
  /** Serialize and throttle Yahoo OHLC requests globally */
  private lastYahooOhlcFetchTime = 0;
  private ohlcQueue: Promise<void> = Promise.resolve();
  private readonly supportedSymbols: string[] = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    'XAUUSD', 'XAGUSD',
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD',
    'USOIL',
    'SPX500', 'NAS100', 'US30',
    'AAPL', 'TSLA', 'MSFT', 'NVDA',
  ];

  constructor(private readonly redis: RedisService) {
    this.refreshLivePrices().catch((err) => {
      this.logger.error(`Initial live price fetch failed: ${err?.message || 'unknown error'}`);
    });
    setInterval(() => {
      this.refreshLivePrices().catch((err) => {
        this.logger.error(`Live price refresh failed: ${err?.message || 'unknown error'}`);
      });
    }, LIVE_PRICE_REFRESH_MS);
  }

  private toYahooSymbol(symbol: string): string {
    const s = symbol.toUpperCase();
    const map: Record<string, string> = {
      XAUUSD: 'GC=F',
      XAGUSD: 'SI=F',
      XPTUSD: 'PL=F',
      XPDUSD: 'PA=F',
      BTCUSD: 'BTC-USD',
      ETHUSD: 'ETH-USD',
      BNBUSD: 'BNB-USD',
      ADAUSD: 'ADA-USD',
      SOLUSD: 'SOL-USD',
      XRPUSD: 'XRP-USD',
      DOTUSD: 'DOT-USD',
      DOGEUSD: 'DOGE-USD',
      MATICUSD: 'MATIC-USD',
      LINKUSD: 'LINK-USD',
      AVAXUSD: 'AVAX-USD',
      UNIUSD: 'UNI-USD',
      USOIL: 'CL=F',
      UKOIL: 'BZ=F',
      NATGAS: 'NG=F',
      SPX500: '^GSPC',
      NAS100: '^NDX',
      UK100: '^FTSE',
      GER30: '^GDAXI',
      FRA40: '^FCHI',
      JPN225: '^N225',
      AUS200: '^AXJO',
      US30: '^DJI',
      SWI20: '^SSMI',
      ESP35: '^IBEX',
    };
    if (map[s]) return map[s];
    if (/^[A-Z]{6}$/.test(s)) return `${s}=X`;
    return s;
  }

  /**
   * Fetch real-time quote for a batch of Yahoo symbols (v7 quote API).
   * Returns map: yahooSymbol -> { price, timeMs }.
   */
  private async fetchQuoteBatch(yahooSymbols: string[]): Promise<Map<string, { price: number; timeMs: number }>> {
    const out = new Map<string, { price: number; timeMs: number }>();
    if (yahooSymbols.length === 0) return out;
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbols.map((s) => encodeURIComponent(s)).join(',')}`;
    try {
      const response = await fetch(url, YAHOO_FETCH_OPTIONS);
      if (!response.ok) return out;
      const json = await response.json();
      const list = json?.quoteResponse?.result;
      if (!Array.isArray(list)) return out;
      const now = Date.now();
      for (const item of list) {
        const sym = item?.symbol;
        const price = Number(item?.regularMarketPrice ?? item?.regularMarketPreviousClose ?? item?.marketPrice);
        const timeMs = item?.regularMarketTime ? Number(item.regularMarketTime) * 1000 : now;
        if (sym && Number.isFinite(price) && price > 0) out.set(sym, { price, timeMs });
      }
    } catch {
      // ignore
    }
    return out;
  }

  /**
   * Fallback: get last close from chart API for one symbol (used when quote API misses a symbol).
   */
  private async fetchChartLastClose(yahooSymbol: string): Promise<{ price: number; timeMs: number } | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
    try {
      const response = await fetch(url, YAHOO_FETCH_OPTIONS);
      if (!response.ok) return null;
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
      const closes: number[] = Array.isArray(result?.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
      for (let i = closes.length - 1; i >= 0; i--) {
        const c = Number(closes[i]);
        const t = Number(timestamps[i]);
        if (Number.isFinite(c) && c > 0 && Number.isFinite(t)) return { price: c, timeMs: t * 1000 };
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async refreshLivePrices(): Promise<void> {
    const now = Date.now();
    const symbolToYahoo = new Map<string, string>();
    for (const symbol of this.supportedSymbols) symbolToYahoo.set(symbol, this.toYahooSymbol(symbol));

    const results: Array<{ symbol: string; close: number; time: number }> = [];
    const yahooList = [...symbolToYahoo.values()];

    // 1) Batch requests to v7 quote API (real-time quote)
    for (let i = 0; i < yahooList.length; i += QUOTE_BATCH_SIZE) {
      if (i > 0) await delay(QUOTE_BATCH_DELAY_MS);
      const batch = yahooList.slice(i, i + QUOTE_BATCH_SIZE);
      const quoteMap = await this.fetchQuoteBatch(batch);
      for (const [ourSymbol, yahooSymbol] of symbolToYahoo) {
        if (results.some((r) => r.symbol === ourSymbol)) continue;
        if (!batch.includes(yahooSymbol)) continue;
        const q = quoteMap.get(yahooSymbol);
        if (q) results.push({ symbol: ourSymbol, close: q.price, time: q.timeMs });
      }
    }

    // 2) Fallback: any symbol not in results, try chart API (with limited concurrency)
    const missing = this.supportedSymbols.filter((s) => !results.some((r) => r.symbol === s));
    for (let i = 0; i < missing.length; i += CHART_CONCURRENCY) {
      const chunk = missing.slice(i, i + CHART_CONCURRENCY);
      const settled = await Promise.all(
        chunk.map(async (symbol) => {
          const yahooSymbol = symbolToYahoo.get(symbol)!;
          const data = await this.fetchChartLastClose(yahooSymbol);
          return data ? { symbol, close: data.price, time: data.timeMs } : null;
        }),
      );
      for (const r of settled) if (r) results.push(r);
    }

    const spreadBps = 5;
    for (const p of results) {
      const mid = p.close;
      const halfSpread = mid * (spreadBps / 10000) * 0.5;
      let bid = Math.max(0.00001, mid - halfSpread);
      let ask = mid + halfSpread;
      if (ask <= bid) ask = bid + Math.max(1e-5, mid * 1e-5);
      this.livePrices.set(p.symbol, {
        symbol: p.symbol,
        bid,
        ask,
        timestamp: now,
        sourceTimestamp: p.time,
        isReal: true,
        dataQuality: 'real',
        source: 'yahoo',
      });
    }
  }

  /** Staleness: use our last refresh time (timestamp), not Yahoo's sourceTimestamp. 45s allows for refresh interval + cache + network. */
  private static readonly STALE_AFTER_MS = 45000;

  getPrice(symbol: string, _allowFallback = true): MarketPrice | undefined {
    const s = symbol.toUpperCase();
    const p = this.livePrices.get(s);
    if (!p) return undefined;
    const age = Date.now() - p.timestamp;
    const isStale = age > MarketDataService.STALE_AFTER_MS;
    return { ...p, dataQuality: isStale ? 'stale' : 'real' };
  }

  async getAllPrices(): Promise<MarketPrice[]> {
    if (this.redis.isEnabled()) {
      const cached = await this.redis.get<MarketPrice[]>('market:prices');
      if (cached != null && Array.isArray(cached)) return cached;
    }
    const list = this.supportedSymbols
      .map((s) => this.getPrice(s))
      .filter((p): p is MarketPrice => Boolean(p));
    if (this.redis.isEnabled()) {
      await this.redis.set('market:prices', list, PRICES_CACHE_TTL);
    }
    return list;
  }

  private getYahooIntervalAndRange(interval: string): { yahooInterval: string; range: string } {
    const map: Record<string, { yahooInterval: string; range: string }> = {
      M1: { yahooInterval: '1m', range: '1d' },
      M2: { yahooInterval: '2m', range: '5d' },
      M5: { yahooInterval: '5m', range: '5d' },
      M15: { yahooInterval: '15m', range: '1mo' },
      M30: { yahooInterval: '30m', range: '1mo' },
      H1: { yahooInterval: '1h', range: '3mo' },
      H4: { yahooInterval: '1h', range: '3mo' },
      D1: { yahooInterval: '1d', range: '1y' },
      W1: { yahooInterval: '1wk', range: '2y' },
      MN1: { yahooInterval: '1mo', range: '5y' },
    };
    return map[interval.toUpperCase()] || map.M5;
  }

  async getOHLCData(symbol: string, interval = 'M5'): Promise<OhlcCandle[]> {
    const normalizedSymbol = symbol.toUpperCase();
    const intervalUpper = interval.toUpperCase();
    const cacheKey = `ohlc:${normalizedSymbol}:${intervalUpper}`;

    if (this.redis.isEnabled()) {
      const cached = await this.redis.get<OhlcCandle[]>(cacheKey);
      if (cached != null && Array.isArray(cached)) return cached;
    }

    const cooldownUntil = this.ohlc429CooldownUntil.get(cacheKey) ?? 0;
    if (Date.now() < cooldownUntil) {
      const fallback = this.ohlcMemoryCache.get(cacheKey);
      if (fallback != null && fallback.length > 0) return fallback;
      return [];
    }

    const yahooSymbol = this.toYahooSymbol(normalizedSymbol);
    const { yahooInterval, range } = this.getYahooIntervalAndRange(interval);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yahooInterval}&range=${range}`;

    const fetchCandles = async (): Promise<OhlcCandle[]> => {
      const response = await fetch(url, YAHOO_FETCH_OPTIONS);
      if (response.status === 429) throw new Error('Yahoo chart API rate limit (429)');
      if (!response.ok) throw new Error(`Yahoo chart API failed with status ${response.status}`);
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = Array.isArray(result?.timestamp) ? result.timestamp : [];
      const quote = result?.indicators?.quote?.[0];
      const opens: number[] = Array.isArray(quote?.open) ? quote.open : [];
      const highs: number[] = Array.isArray(quote?.high) ? quote.high : [];
      const lows: number[] = Array.isArray(quote?.low) ? quote.low : [];
      const closes: number[] = Array.isArray(quote?.close) ? quote.close : [];

      const candles: OhlcCandle[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = Number(opens[i]);
        const h = Number(highs[i]);
        const l = Number(lows[i]);
        const c = Number(closes[i]);
        const t = Number(timestamps[i]);
        if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(t)) continue;
        candles.push({ time: t, open: o, high: h, low: l, close: c });
      }
      return candles;
    };

    const myTurn = this.ohlcQueue;
    let resolveNext!: () => void;
    this.ohlcQueue = new Promise((r) => {
      resolveNext = r;
    });

    try {
      await myTurn;
      const now = Date.now();
      const waitMs = Math.max(0, OHLC_GLOBAL_DELAY_MS - (now - this.lastYahooOhlcFetchTime));
      if (waitMs > 0) await delay(waitMs);
      this.lastYahooOhlcFetchTime = Date.now();

      let candles: OhlcCandle[];
      try {
        candles = await fetchCandles();
      } catch (err: any) {
        if (err?.message?.includes('429')) {
          this.logger.warn(`OHLC rate limited (429) for ${normalizedSymbol}/${interval}, retrying after ${OHLC_429_RETRY_DELAY_MS / 1000}s`);
          await delay(OHLC_429_RETRY_DELAY_MS);
          candles = await fetchCandles();
        } else {
          throw err;
        }
      }

      const ttl = OHLC_CACHE_TTL[intervalUpper] ?? 180;
      if (this.redis.isEnabled() && candles.length > 0) await this.redis.set(cacheKey, candles, ttl);
      if (candles.length > 0) this.ohlcMemoryCache.set(cacheKey, candles);
      return candles;
    } catch (error: any) {
      this.logger.warn(`OHLC fetch failed for ${normalizedSymbol}/${interval}: ${error?.message || 'unknown error'}`);
      if (error?.message?.includes('429')) {
        this.ohlc429CooldownUntil.set(cacheKey, Date.now() + MarketDataService.OHLC_429_COOLDOWN_MS);
      }
      const fallback = this.ohlcMemoryCache.get(cacheKey);
      if (fallback != null && fallback.length > 0) return fallback;
      return [];
    } finally {
      resolveNext();
    }
  }
}
