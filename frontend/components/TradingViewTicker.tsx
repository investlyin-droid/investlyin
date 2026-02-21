'use client';

import { useEffect, useRef } from 'react';

interface TradingViewTickerProps {
  symbols?: string;
  height?: number;
  colorTheme?: 'light' | 'dark';
}

// Default comprehensive symbol list from TradingView ticker tape
const DEFAULT_SYMBOLS = 'FOREXCOM:SPXUSD,FOREXCOM:NSXUSD,FOREXCOM:DJI,FX:EURUSD,BITSTAMP:BTCUSD,BITSTAMP:ETHUSD,CMCMARKETS:GOLD,PEPPERSTONE:XAUUSD,OANDA:XAGUSD,NASDAQ:AAPL,NSEIX:NIFTY1!,NASDAQ:NVDA,TVC:DXY,TVC:SILVER,TVC:USOIL,COINBASE:SOLUSD,BINANCE:BTCUSDT,MCX:CRUDEOIL1!,NASDAQ:META,NYSE:TSM,NSE:SBIN,NASDAQ:EOSE,NASDAQ:TSLA,CME_MINI:ES1!,CME_MINI:NQ1!,NASDAQ:QQQ,BINANCE:ETHUSDT,NASDAQ:PLTR,CAPITALCOM:US500,NASDAQ:GOOG,NASDAQ:HOOD,NYSE:AMC,NASDAQ:AMZN,NASDAQ:AMD,NASDAQ:NFLX,NYSE:ORCL,NYSE:BABA,NASDAQ:SHOP,NYSE:UBER,NSE:BHARTIARTL,NASDAQ:CSCO,NYSE:RDDT,NSE:VEDL,CME_MINI:MNQ1!,CME_MINI:MES1!,MCX:COPPER1!,COMEX_MINI:MGC1!,CME_MINI:RTY1!,BIST:XU030D1!,FPMARKETS:GBPUSD,FX:EURUSD,FX:USDJPY,OANDA:GBPJPY,OANDA:EURJPY,TICKMILL:EURUSD,FOREXCOM:GBPUSD,FX:GBPJPY,OANDA:CADJPY,FX:GBPAUD,FX:GBPCAD,CAPITALCOM:USDJPY,FX:USDJPY,CRYPTOCAP:TOTAL,BITSTAMP:BTCUSD,BINANCE:BTCUSDT,CRYPTO:BTCUSD,BINANCE:ETHUSDT,BITSTAMP:ETHUSD,BINANCE:SOLUSDT,OKX:BTCUSDT.P,TVC:US10Y,TVC:US02Y,TVC:US30Y,TVC:US20Y,TVC:JP10Y,TVC:DE10Y,TVC:US05Y,TVC:US01Y,TVC:JP02Y,TVC:US03Y,TVC:DE10Y,TVC:IN10Y,TVC:JP05Y,TVC:CH02Y,TVC:EU02Y,TVC:FR10Y,RUS:SU26248RMFS3,TVC:US04MY,ECONOMICS:USBCOI,FRED:FEDFUNDS,FRED:BAMLH0A0HYM2,ECONOMICS:USINTR,FRED:WALCL,FRED:WALCL,ECONOMICS:USIRYY,FRED:SP500,ECONOMICS:USM2,FRED:M2SL,FRED:MORTGAGE30US,ECONOMICS:CAINTR,ECONOMICS:RUINTR,ECONOMICS:JPIRYY,FRED:RBCNBIS,FRED:RRPONTSYAWARD';

export default function TradingViewTicker({
  symbols = DEFAULT_SYMBOLS,
  height = 60,
  colorTheme = 'dark',
}: TradingViewTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content if theme or symbols change
    if (scriptLoadedRef.current) {
      containerRef.current.innerHTML = '';
      scriptLoadedRef.current = false;
    }

    // Check if script is already loaded globally
    const existingScript = document.querySelector('script[src*="tv-ticker-tape.js"]');
    
    if (!existingScript) {
      // Load TradingView ticker tape widget script
      const script = document.createElement('script');
      script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
      script.async = true;
      script.type = 'module';
      document.head.appendChild(script);
    }

    // Create the ticker tape element
    const tickerElement = document.createElement('tv-ticker-tape');
    tickerElement.setAttribute('symbols', symbols);
    tickerElement.setAttribute('colorTheme', colorTheme);

    containerRef.current.appendChild(tickerElement);

    scriptLoadedRef.current = true;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        scriptLoadedRef.current = false;
      }
    };
  }, [symbols, colorTheme]);

  return (
    <div 
      className="tradingview-ticker-container w-full"
      ref={containerRef}
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    />
  );
}
