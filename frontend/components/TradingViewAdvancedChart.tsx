'use client';

import React, { useEffect, useRef, memo, useState, useMemo } from 'react';

interface TradingViewAdvancedChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  studies?: string[];
  height?: number;
  onSymbolChange?: (symbol: string) => void;
}

// Map our symbols to TradingView format (same as TradingViewChart)
function mapSymbolToTradingView(symbol: string): string {
  const sym = symbol.toUpperCase();
  
  // Forex - Major Pairs
  const forexMajor: Record<string, string> = {
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'USDCHF': 'FX:USDCHF',
    'AUDUSD': 'FX:AUDUSD',
    'USDCAD': 'FX:USDCAD',
    'NZDUSD': 'FX:NZDUSD',
  };
  
  // Forex - Minor Pairs
  const forexMinor: Record<string, string> = {
    'EURGBP': 'FX:EURGBP',
    'EURJPY': 'FX:EURJPY',
    'GBPJPY': 'FX:GBPJPY',
    'EURCHF': 'FX:EURCHF',
    'AUDJPY': 'FX:AUDJPY',
    'CADJPY': 'FX:CADJPY',
    'NZDJPY': 'FX:NZDJPY',
    'EURAUD': 'FX:EURAUD',
    'EURCAD': 'FX:EURCAD',
    'GBPAUD': 'FX:GBPAUD',
    'GBPCAD': 'FX:GBPCAD',
    'AUDCAD': 'FX:AUDCAD',
    'AUDNZD': 'FX:AUDNZD',
  };
  
  // Forex - Exotic Pairs
  const forexExotic: Record<string, string> = {
    'USDZAR': 'FX:USDZAR',
    'USDMXN': 'FX:USDMXN',
    'USDTRY': 'FX:USDTRY',
    'USDSEK': 'FX:USDSEK',
    'USDNOK': 'FX:USDNOK',
    'USDDKK': 'FX:USDDKK',
    'USDPLN': 'FX:USDPLN',
    'USDHKD': 'FX:USDHKD',
    'USDSGD': 'FX:USDSGD',
    'USDCNH': 'FX:USDCNH',
  };
  
  // Metals (Commodities)
  const metals: Record<string, string> = {
    'XAUUSD': 'PEPPERSTONE:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
    'XPTUSD': 'FX:XPTUSD',
    'XPDUSD': 'FX:XPDUSD',
  };
  
  // Cryptocurrencies
  const crypto: Record<string, string> = {
    'BTCUSD': 'BINANCE:BTCUSDT',
    'ETHUSD': 'BINANCE:ETHUSDT',
    'BNBUSD': 'BINANCE:BNBUSDT',
    'ADAUSD': 'BINANCE:ADAUSDT',
    'SOLUSD': 'BINANCE:SOLUSDT',
    'XRPUSD': 'BINANCE:XRPUSDT',
    'DOTUSD': 'BINANCE:DOTUSDT',
    'DOGEUSD': 'BINANCE:DOGEUSDT',
    'MATICUSD': 'BINANCE:MATICUSDT',
    'LINKUSD': 'BINANCE:LINKUSDT',
    'AVAXUSD': 'BINANCE:AVAXUSDT',
    'UNIUSD': 'BINANCE:UNIUSDT',
  };
  
  // Energies (Commodities)
  const energies: Record<string, string> = {
    'USOIL': 'TVC:USOIL',
    'UKOIL': 'NYMEX:BRENT1!',
    'NATGAS': 'NYMEX:NG1!',
    'CRUDE': 'TVC:USOIL',
    'BRENT': 'NYMEX:BRENT1!',
    'WTI': 'TVC:USOIL',
  };
  
  // Stocks - Major Global Companies
  const stocks: Record<string, string> = {
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'GOOGL': 'NASDAQ:GOOGL',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'META': 'NASDAQ:META',
    'NVDA': 'NASDAQ:NVDA',
    'JPM': 'NYSE:JPM',
    'V': 'NYSE:V',
    'JNJ': 'NYSE:JNJ',
    'WMT': 'NYSE:WMT',
    'MA': 'NYSE:MA',
    'PG': 'NYSE:PG',
    'DIS': 'NYSE:DIS',
    'NFLX': 'NASDAQ:NFLX',
    'BAC': 'NYSE:BAC',
    'XOM': 'NYSE:XOM',
    'CSCO': 'NASDAQ:CSCO',
    'PFE': 'NYSE:PFE',
    'INTC': 'NASDAQ:INTC',
    'T': 'NYSE:T', // AT&T
  };
  
  // Indices
  const indices: Record<string, string> = {
    'SPX500': 'FOREXCOM:SPXUSD',
    'SP500': 'FOREXCOM:SPXUSD',
    'SPX': 'FOREXCOM:SPXUSD',
    'NAS100': 'FOREXCOM:NSXUSD',
    'NASDAQ': 'FOREXCOM:NSXUSD',
    'UK100': 'FOREXCOM:UK100',
    'FTSE': 'FOREXCOM:UK100',
    'GER30': 'FOREXCOM:GER30',
    'DAX': 'FOREXCOM:GER30',
    'FRA40': 'FOREXCOM:FRA40',
    'CAC': 'FOREXCOM:FRA40',
    'JPN225': 'FOREXCOM:JPN225',
    'NIKKEI': 'FOREXCOM:JPN225',
    'AUS200': 'FOREXCOM:AUS200',
    'US30': 'FOREXCOM:DJI',
    'DJI': 'FOREXCOM:DJI',
    'DOW': 'FOREXCOM:DJI',
    'SWI20': 'FOREXCOM:SWI20',
    'ESP35': 'FOREXCOM:ESP35',
  };
  
  // Check all mappings
  if (forexMajor[sym]) return forexMajor[sym];
  if (forexMinor[sym]) return forexMinor[sym];
  if (forexExotic[sym]) return forexExotic[sym];
  if (metals[sym]) return metals[sym];
  if (crypto[sym]) return crypto[sym];
  if (energies[sym]) return energies[sym];
  if (stocks[sym]) return stocks[sym];
  if (indices[sym]) return indices[sym];
  
  // Pattern matching for forex pairs
  if (sym.match(/^[A-Z]{6}$/) && (sym.includes('USD') || sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY') || sym.includes('CHF') || sym.includes('AUD') || sym.includes('CAD') || sym.includes('NZD'))) {
    return `FX:${sym}`;
  }
  
  // Pattern matching for metals
  if (sym.startsWith('XAU')) return 'PEPPERSTONE:XAUUSD';
  if (sym.startsWith('XAG')) return 'OANDA:XAGUSD';
  if (sym.startsWith('XPT')) return 'FX:XPTUSD';
  if (sym.startsWith('XPD')) return 'FX:XPDUSD';
  
  // Pattern matching for crypto
  if (sym.includes('BTC')) return 'BINANCE:BTCUSDT';
  if (sym.includes('ETH')) return 'BINANCE:ETHUSDT';
  if (sym.includes('BNB')) return 'BINANCE:BNBUSDT';
  if (sym.includes('ADA')) return 'BINANCE:ADAUSDT';
  if (sym.includes('SOL')) return 'BINANCE:SOLUSDT';
  if (sym.includes('XRP')) return 'BINANCE:XRPUSDT';
  if (sym.includes('DOT')) return 'BINANCE:DOTUSDT';
  if (sym.includes('DOGE')) return 'BINANCE:DOGEUSDT';
  if (sym.includes('MATIC')) return 'BINANCE:MATICUSDT';
  if (sym.includes('LINK')) return 'BINANCE:LINKUSDT';
  if (sym.includes('AVAX')) return 'BINANCE:AVAXUSDT';
  if (sym.includes('UNI')) return 'BINANCE:UNIUSDT';
  
  // Pattern matching for energies
  if (sym.includes('OIL') || sym.includes('CRUDE') || sym.includes('WTI')) return 'TVC:USOIL';
  if (sym.includes('BRENT')) return 'NYMEX:BRENT1!';
  if (sym.includes('GAS') || sym.includes('NATGAS')) return 'NYMEX:NG1!';
  
  // Pattern matching for indices
  if (sym.includes('SPX') || sym.includes('SP500')) return 'FOREXCOM:SPXUSD';
  if (sym.includes('NAS')) return 'FOREXCOM:NSXUSD';
  if (sym.includes('DJI') || sym.includes('DOW')) return 'FOREXCOM:DJI';
  if (sym.includes('FTSE') || sym.includes('UK100')) return 'FOREXCOM:UK100';
  if (sym.includes('DAX') || sym.includes('GER30')) return 'FOREXCOM:GER30';
  if (sym.includes('NIKKEI') || sym.includes('JPN225')) return 'FOREXCOM:JPN225';
  
  // Default: try as forex pair
  return `FX:${sym}`;
}

// Reverse map TradingView symbol back to our internal format
function mapTradingViewToSymbol(tvSymbol: string): string {
  if (!tvSymbol || typeof tvSymbol !== 'string') {
    return 'EURUSD'; // Default fallback
  }
  
  const sym = tvSymbol.toUpperCase();
  
  // Remove exchange prefix (e.g., "FX:", "NASDAQ:", "BINANCE:")
  const parts = sym.split(':');
  const exchange = parts.length > 1 && parts[0] ? parts[0] : '';
  const symbolPart = (parts.length > 1 && parts[1]) ? parts[1] : (parts[0] || sym);
  
  // Handle special cases for indices
  if (sym.includes('FOREXCOM:SPXUSD') || sym.includes('SPX')) return 'SPX500';
  if (sym.includes('FOREXCOM:NSXUSD') || sym.includes('NSXUSD')) return 'NAS100';
  if (sym.includes('FOREXCOM:DJI') || sym.includes('DJI')) return 'US30';
  if (sym.includes('FOREXCOM:UK100') || sym.includes('FTSE')) return 'UK100';
  if (sym.includes('FOREXCOM:GER30') || sym.includes('DAX')) return 'GER30';
  if (sym.includes('FOREXCOM:FRA40') || sym.includes('CAC')) return 'FRA40';
  if (sym.includes('FOREXCOM:JPN225') || sym.includes('NIKKEI')) return 'JPN225';
  if (sym.includes('FOREXCOM:AUS200') || sym.includes('ASX')) return 'AUS200';
  if (sym.includes('FOREXCOM:SWI20') || sym.includes('SMI')) return 'SWI20';
  if (sym.includes('FOREXCOM:ESP35') || sym.includes('IBEX')) return 'ESP35';
  
  // Handle stocks - extract just the symbol (e.g., "NASDAQ:TSLA" -> "TSLA", "FXCM:T" -> "T")
  // Also handle cases where symbol might be just the stock ticker
  if (exchange && ['NASDAQ', 'NYSE', 'AMEX', 'OTC', 'NSE', 'BSE', 'FXCM', 'CBOE'].includes(exchange)) {
    return symbolPart;
  }
  
  // If no exchange prefix but looks like a stock ticker (1-5 uppercase letters/numbers)
  // Accept any valid stock ticker format, including single letters like "T" for AT&T
  if (!exchange && /^[A-Z0-9]{1,5}$/.test(symbolPart)) {
    // Don't check against known list - accept any valid ticker
    // Single letters like "T" for AT&T are valid
    return symbolPart;
  }
  
  // Handle crypto - remove USDT suffix
  if (exchange && ['BINANCE', 'COINBASE', 'BITSTAMP', 'OKX'].includes(exchange)) {
    return symbolPart.replace(/USDT$/i, 'USD').replace(/USDT\.P$/i, 'USD');
  }
  
  // Handle forex - remove FX: prefix
  if (exchange === 'FX' || sym.startsWith('FX:')) {
    return symbolPart;
  }
  
  // Handle metals
  if (exchange && ['PEPPERSTONE', 'OANDA', 'CMCMARKETS'].includes(exchange)) {
    if (symbolPart.includes('XAU')) return 'XAUUSD';
    if (symbolPart.includes('XAG')) return 'XAGUSD';
    if (symbolPart.includes('GOLD')) return 'XAUUSD';
    if (symbolPart.includes('SILVER')) return 'XAGUSD';
  }
  
  // Remove common suffixes
  let cleanSymbol = symbolPart
    .replace(/USDT$/i, 'USD')
    .replace(/USDT\.P$/i, 'USD')
    .replace(/1!$/i, '');
  
  // If it's a 6-character forex pair, return as-is
  if (/^[A-Z]{6}$/.test(cleanSymbol)) {
    return cleanSymbol;
  }
  
  // For stocks and other symbols, return the cleaned symbol
  return cleanSymbol;
}

// Map timeframe to TradingView interval
function mapTimeframeToInterval(timeframe: string): string {
  const tf = timeframe.toUpperCase();
  const mapping: Record<string, string> = {
    'M1': '1',
    'M5': '5',
    'M15': '15',
    'M30': '30',
    'H1': '60',
    'H2': '120',
    'H3': '180',
    'H4': '240',
    'H6': '360',
    'H8': '480',
    'H12': '720',
    'D1': 'D',
    'W1': 'W',
    'MN1': 'M',
  };
  return mapping[tf] || '5';
}

const DEFAULT_STUDIES = [
  'STD;24h%Volume',
  'STD;Accumulation_Distribution',
  'STD;Connors_RSI',
  'STD;DEMA',
  'STD;Money_Flow',
];

// Memoize studies array to prevent unnecessary recreations
const STUDIES_STR = DEFAULT_STUDIES.sort().join(',');

function TradingViewAdvancedChart({
  symbol = 'EURUSD',
  interval = 'M5',
  theme = 'dark',
  studies = DEFAULT_STUDIES,
  height = 600,
  onSymbolChange,
}: TradingViewAdvancedChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetContainerIdRef = useRef<string>(`tradingview-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const scriptLoadedRef = useRef(false);
  const widgetRef = useRef<any>(null);
  const onSymbolChangeRef = useRef(onSymbolChange);
  const symbolChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownSymbolRef = useRef<string>(symbol);
  const lastWidgetConfigRef = useRef<string>(''); // Track widget config to prevent unnecessary recreations

  // Keep callback ref up to date without causing re-renders
  useEffect(() => {
    onSymbolChangeRef.current = onSymbolChange;
    lastKnownSymbolRef.current = symbol;
  }, [onSymbolChange, symbol]);

  // Main effect for widget creation - only depends on actual widget config
  useEffect(() => {
    if (!container.current) {
      console.warn('[TradingView] Container ref is not available');
      return;
    }

    const tvSymbol = mapSymbolToTradingView(symbol);
    const tvInterval = mapTimeframeToInterval(interval);
    
    // Create a config string to check if widget needs to be recreated
    // Use sorted studies string for consistent comparison
    const studiesStr = Array.isArray(studies) ? studies.sort().join(',') : STUDIES_STR;
    const widgetConfig = `${tvSymbol}-${tvInterval}-${theme}-${studiesStr}`;
    
    // If config hasn't changed and widget is already loaded, don't recreate
    if (scriptLoadedRef.current && lastWidgetConfigRef.current === widgetConfig) {
      // Check if widget div still exists and has content
      const existingWidget = container.current?.querySelector(`#${widgetContainerIdRef.current}`);
      if (existingWidget && existingWidget.querySelector('iframe')) {
        return; // Widget already loaded with same config, skip recreation
      }
      // Widget div exists but no iframe - widget might have failed to load, recreate
      scriptLoadedRef.current = false;
    }
    
    lastWidgetConfigRef.current = widgetConfig;

    // Get the widget container div (the one with class tradingview-widget-container__widget)
    // Use the ID from the ref to find it reliably
    let widgetDiv = container.current.querySelector(`#${widgetContainerIdRef.current}`) as HTMLDivElement;
    
    // If widget div doesn't exist by ID, try class selector
    if (!widgetDiv) {
      widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
    }
    
    // If widget div still doesn't exist, create it
    if (!widgetDiv) {
      widgetDiv = document.createElement('div');
      widgetDiv.id = widgetContainerIdRef.current;
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = 'calc(100% - 32px)';
      widgetDiv.style.width = '100%';
      const copyrightDiv = container.current.querySelector('.tradingview-widget-copyright');
      if (copyrightDiv) {
        container.current.insertBefore(widgetDiv, copyrightDiv);
      } else {
        container.current.appendChild(widgetDiv);
      }
    } else {
      // Ensure it has the correct ID
      if (!widgetDiv.id) {
        widgetDiv.id = widgetContainerIdRef.current;
      }
    }

    // Clean up previous widget - only clear the widget div, not the entire container
    if (scriptLoadedRef.current) {
      // Remove all script tags and iframes
      const scripts = widgetDiv.querySelectorAll('script');
      const iframes = widgetDiv.querySelectorAll('iframe');
      scripts.forEach(s => s.remove());
      iframes.forEach(i => i.remove());
      widgetDiv.innerHTML = '';
      scriptLoadedRef.current = false;
      widgetRef.current = null;
    }

    // Ensure widget div has an ID for TradingView to find it
    if (!widgetDiv.id) {
      widgetDiv.id = widgetContainerIdRef.current;
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Double-check container and widget div still exist
      if (!container.current) {
        console.error('[TradingView] Container ref lost');
        return;
      }
      
      // Re-query widget div to ensure it's still in DOM
      let currentWidgetDiv = container.current.querySelector(`#${widgetContainerIdRef.current}`) as HTMLDivElement;
      if (!currentWidgetDiv) {
        currentWidgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
      }
      
      if (!currentWidgetDiv || !document.getElementById(currentWidgetDiv.id)) {
        console.error('[TradingView] Widget div not found in DOM');
        scriptLoadedRef.current = false;
        return;
      }

      // Ensure widget div is empty before adding script
      if (currentWidgetDiv.querySelector('script') || currentWidgetDiv.querySelector('iframe')) {
        // Widget already loading or loaded, don't add another script
        if (currentWidgetDiv.querySelector('iframe')) {
          scriptLoadedRef.current = true;
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      
      const widgetConfig = {
        allow_symbol_change: true,
        calendar: false,
        details: false,
        hide_side_toolbar: true,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: tvInterval,
        locale: 'en',
        save_image: true,
        style: '1',
        symbol: tvSymbol,
        theme: theme,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
        backgroundColor: 'rgba(10, 10, 10, 1)',
        gridColor: 'rgba(242, 242, 242, 0.06)',
        watchlist: [],
        withdateranges: false,
        compareSymbols: [],
        studies: Array.isArray(studies) ? studies : DEFAULT_STUDIES,
        autosize: true,
        container_id: currentWidgetDiv.id,
      };
      
      script.innerHTML = JSON.stringify(widgetConfig);

      // Add error handling for script loading
      script.onerror = () => {
        console.error('[TradingView] Failed to load widget script');
        scriptLoadedRef.current = false;
        if (currentWidgetDiv) {
          currentWidgetDiv.innerHTML = '';
        }
      };

      // Append script to the widget container div
      try {
        currentWidgetDiv.appendChild(script);
        scriptLoadedRef.current = true;
      } catch (error) {
        console.error('[TradingView] Failed to append script:', error);
        scriptLoadedRef.current = false;
      }
    }, 150); // Slightly longer delay to ensure DOM is fully ready

    return () => {
      clearTimeout(timeoutId);
      // Only clean up if this effect is being replaced by a new one with different config
      // The cleanup will run before the new effect runs, so we check if config is actually changing
      const currentConfig = `${mapSymbolToTradingView(symbol)}-${mapTimeframeToInterval(interval)}-${theme}-${Array.isArray(studies) ? studies.sort().join(',') : STUDIES_STR}`;
      
      // If config is the same, don't clean up (this shouldn't happen due to early return, but safety check)
      if (lastWidgetConfigRef.current === currentConfig) {
        return;
      }
      
      // Config is changing, clean up old widget
      if (container.current) {
        const widgetDiv = container.current.querySelector(`#${widgetContainerIdRef.current}`) as HTMLDivElement ||
                         container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
        if (widgetDiv) {
          // Remove all script tags and iframes
          const scripts = widgetDiv.querySelectorAll('script');
          const iframes = widgetDiv.querySelectorAll('iframe');
          scripts.forEach(s => s.remove());
          iframes.forEach(i => i.remove());
          widgetDiv.innerHTML = '';
        }
        scriptLoadedRef.current = false;
        widgetRef.current = null;
      }
    };
  }, [symbol, interval, theme, studies]);

  // Separate effect for message listening - doesn't recreate widget
  useEffect(() => {
    if (!onSymbolChange) return;

    const handleMessage = (event: MessageEvent) => {
      // Only process messages from TradingView domain for security
      if (!event.origin || (!event.origin.includes('tradingview.com') && !event.origin.includes('s3.tradingview.com'))) {
        return;
      }
      
      // Check if message is from TradingView widget
      if (!event.data) return;
      
      // Suppress permission denied errors from TradingView widgets
      try {
        // TradingView widget may send symbol information in various formats
        // Check both object and string formats
        let eventSymbol: string | null = null;
        let eventName: string | null = null;
        
        if (typeof event.data === 'object') {
          eventName = event.data.name || event.data.event || '';
          eventSymbol = event.data.symbol || event.data.p || event.data.s || event.data.symbol_name || event.data.symbolName;
        } else if (typeof event.data === 'string') {
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(event.data);
            eventName = parsed.name || parsed.event || '';
            eventSymbol = parsed.symbol || parsed.p || parsed.s || parsed.symbol_name || parsed.symbolName;
          } catch {
            // Not JSON, might be a direct symbol string
            if (event.data.length > 0 && event.data.length < 50) {
              eventSymbol = event.data;
            }
          }
        }
        
        const currentTvSymbol = mapSymbolToTradingView(lastKnownSymbolRef.current || 'EURUSD');
        
        // Process symbol changes - be more lenient with detection
        if (eventSymbol && typeof eventSymbol === 'string' && eventSymbol.length > 0) {
          // Check if it's different from current (case-insensitive)
          if (eventSymbol.toUpperCase() !== currentTvSymbol.toUpperCase()) {
            // Clear any pending timeout
            if (symbolChangeTimeoutRef.current) {
              clearTimeout(symbolChangeTimeoutRef.current);
            }
            
            // Debounce symbol changes to avoid too many updates
            symbolChangeTimeoutRef.current = setTimeout(() => {
              try {
                if (!eventSymbol || typeof eventSymbol !== 'string') return;
                const internalSymbol = mapTradingViewToSymbol(eventSymbol);
                if (internalSymbol && internalSymbol.toUpperCase() !== (lastKnownSymbolRef.current || '').toUpperCase() && onSymbolChangeRef.current) {
                  console.log('[TradingView] Symbol change detected via postMessage:', eventSymbol, '->', internalSymbol);
                  lastKnownSymbolRef.current = internalSymbol;
                  onSymbolChangeRef.current(internalSymbol);
                }
              } catch (error) {
                console.error('[TradingView] Error mapping symbol:', error);
              }
            }, 300);
          }
        }
      } catch (error) {
        // Silently ignore parsing errors and permission denied errors
        // TradingView widgets may send messages that cause permission errors
        // This is expected behavior and not a real error
        if (error instanceof Error && error.message.includes('permission denied')) {
          return; // Suppress permission denied errors
        }
      }
    };

    // Listen to all messages (TradingView widgets use postMessage)
    window.addEventListener('message', handleMessage, false);

    // Also try to observe the widget container for changes (fallback)
    let observer: MutationObserver | null = null;
    if (container.current) {
      observer = new MutationObserver(() => {
        // Check if we can detect symbol changes from DOM
        // This is a fallback if postMessage doesn't work
        try {
          const iframe = container.current?.querySelector('iframe');
          if (iframe) {
            // Try to extract symbol from iframe title
            // Wrap in try-catch to handle cross-origin restrictions gracefully
            let title = '';
            try {
              // This may throw "permission denied" errors due to cross-origin restrictions
              // This is expected behavior and we should handle it gracefully
              title = iframe.title || '';
            } catch (e) {
              // Cross-origin access denied - this is expected and safe to ignore
              // TradingView widgets are from a different origin, so we can't access their properties
              return;
            }
            
            if (title) {
              const titleMatch = title.match(/([A-Z]{2,6}(USD|EUR|GBP|JPY)?|[A-Z]{1,5})/);
              if (titleMatch && titleMatch[1]) {
                const detectedSymbol = titleMatch[1];
                if (!detectedSymbol || typeof detectedSymbol !== 'string') return;
                const internalSymbol = mapTradingViewToSymbol(detectedSymbol);
                if (internalSymbol && internalSymbol.toUpperCase() !== (lastKnownSymbolRef.current || '').toUpperCase() && onSymbolChangeRef.current) {
                  // Debounce
                  if (symbolChangeTimeoutRef.current) {
                    clearTimeout(symbolChangeTimeoutRef.current);
                  }
                  symbolChangeTimeoutRef.current = setTimeout(() => {
                    if (onSymbolChangeRef.current) {
                      lastKnownSymbolRef.current = internalSymbol;
                      onSymbolChangeRef.current(internalSymbol);
                    }
                  }, 500);
                }
              }
            }
          }
        } catch (error) {
          // Silently ignore
        }
      });
      
      observer.observe(container.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title', 'src']
      });
    }

    // Poll for symbol changes by checking iframe URL/title (fallback method)
    // This is necessary because TradingView widgets may not always emit postMessage events
    const pollInterval = setInterval(() => {
      if (!container.current || !onSymbolChangeRef.current) return;
      
      try {
        const iframe = container.current.querySelector('iframe');
        if (iframe) {
          // Try to extract symbol from iframe src URL or title
          // Wrap in try-catch to handle cross-origin restrictions gracefully
          let src = '';
          let title = '';
          
          try {
            // These may throw "permission denied" errors due to cross-origin restrictions
            // This is expected behavior and we should handle it gracefully
            src = iframe.src || '';
            title = iframe.title || '';
          } catch (e) {
            // Cross-origin access denied - this is expected and safe to ignore
            // TradingView widgets are from a different origin, so we can't access their properties
            // This is not an error, just a limitation of cross-origin iframes
            return;
          }
          
          // Look for symbol patterns in URL (e.g., symbol=TSLA or symbols/NASDAQ:TSLA or FXCM:T)
          // More flexible pattern to catch single-letter stocks like "T" for AT&T
          const urlMatch = src ? (src.match(/symbol[s]?[=:]?([A-Z]+[:][A-Z0-9]+|[A-Z0-9]{1,6})/i) || 
                         src.match(/symbol[s]?[=:]?([A-Z0-9]{1,6}(USD|EUR|GBP|JPY)?)/i) ||
                         src.match(/\/([A-Z]+[:][A-Z0-9]+|[A-Z0-9]{1,6})\//i)) : null;
          
          // Look for symbol in title - more flexible to catch single letters
          const titleMatch = title ? title.match(/([A-Z0-9]{1,6}(USD|EUR|GBP|JPY)?|[A-Z]{1,6})/) : null;
          
          const detectedTvSymbol = (urlMatch && urlMatch[1]) || (titleMatch && titleMatch[1]);
          
          if (detectedTvSymbol && typeof detectedTvSymbol === 'string') {
            const internalSymbol = mapTradingViewToSymbol(detectedTvSymbol);
            if (internalSymbol && 
                internalSymbol.toUpperCase() !== (lastKnownSymbolRef.current || '').toUpperCase() && 
                onSymbolChangeRef.current) {
              // Clear any pending timeout
              if (symbolChangeTimeoutRef.current) {
                clearTimeout(symbolChangeTimeoutRef.current);
              }
              
              // Update immediately (no debounce for polling)
              console.log('[TradingView] Symbol change detected via polling:', detectedTvSymbol, '->', internalSymbol);
              lastKnownSymbolRef.current = internalSymbol;
              onSymbolChangeRef.current(internalSymbol);
            }
          }
        }
      } catch (error) {
        // Silently ignore - cross-origin restrictions may prevent access
        // This is expected behavior when accessing iframe properties from different origins
        // Not a real error, just a browser security feature
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      window.removeEventListener('message', handleMessage, false);
      
      if (observer) {
        observer.disconnect();
      }
      
      // Clear polling interval
      clearInterval(pollInterval);
      
      // Clear any pending timeouts
      if (symbolChangeTimeoutRef.current) {
        clearTimeout(symbolChangeTimeoutRef.current);
        symbolChangeTimeoutRef.current = null;
      }
    };
  }, [symbol]); // Only depend on symbol, not the callback

  // Extract symbol name for copyright link
  const symbolName = useMemo(() => {
    if (!symbol || typeof symbol !== 'string') return 'EURUSD';
    const parts = symbol.split(':');
    return parts.length > 1 ? parts[1] : parts[0] || symbol;
  }, [symbol]);
  
  const exchangeName = useMemo(() => {
    if (!symbol || typeof symbol !== 'string') return 'PEPPERSTONE';
    const parts = symbol.split(':');
    return parts.length > 1 ? parts[0] : 'PEPPERSTONE';
  }, [symbol]);

  return (
    <div 
      className="tradingview-widget-container w-full h-full" 
      ref={container}
      style={{ height: '100%', width: '100%', minHeight: '300px', position: 'relative' }}
    >
      <div 
        id={widgetContainerIdRef.current}
        className="tradingview-widget-container__widget" 
        style={{ 
          height: `calc(100% - 32px)`, 
          width: '100%', 
          minHeight: '268px',
          position: 'relative'
        }}
      />
      {!scriptLoadedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-obsidian/80 z-10">
          <div className="text-center">
            <div className="spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-brand-text-secondary text-sm">Loading chart...</p>
          </div>
        </div>
      )}
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2" style={{ height: '32px' }}>
        <a
          href={`https://www.tradingview.com/symbols/${symbolName}/?exchange=${exchangeName}`}
          rel="noopener nofollow"
          target="_blank"
          className="text-brand-gold hover:text-brand-gold/80 transition-colors"
        >
          <span className="blue-text">{symbolName} chart</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewAdvancedChart);
