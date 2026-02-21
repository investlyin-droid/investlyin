'use client';

import React, { useEffect, useRef, memo, useMemo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  onSymbolChange?: (symbol: string) => void;
  height?: number;
}

// Map our symbols to TradingView format
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
    'AVAXUSD': 'BINANCE:AVAXUSD',
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
  if (sym.includes('AVAX')) return 'BINANCE:AVAXUSD';
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

// Reverse map TradingView symbol back to our internal format
function mapTradingViewToSymbol(tvSymbol: string): string {
  if (!tvSymbol || typeof tvSymbol !== 'string') {
    return 'EURUSD';
  }
  
  const sym = tvSymbol.toUpperCase();
  const parts = sym.split(':');
  const exchange = parts.length > 1 ? parts[0] : '';
  let symbolPart = parts.length > 1 ? parts[1] : parts[0];
  
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
  
  // Handle stocks - extract just the symbol
  if (exchange && ['NASDAQ', 'NYSE', 'AMEX', 'OTC', 'NSE', 'BSE', 'FXCM', 'CBOE'].includes(exchange)) {
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
  
  return cleanSymbol;
}

function TradingViewWidget({
  symbol = 'EURUSD',
  interval = 'M5',
  theme = 'dark',
  onSymbolChange,
  height = 600,
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetDivRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const lastConfigRef = useRef<string>('');

  const tvSymbol = useMemo(() => mapSymbolToTradingView(symbol), [symbol]);
  const tvInterval = useMemo(() => mapTimeframeToInterval(interval), [interval]);
  const configKey = useMemo(() => `${tvSymbol}-${tvInterval}-${theme}`, [tvSymbol, tvInterval, theme]);

  useEffect(() => {
    if (!container.current || !widgetDivRef.current) return;

    // Skip if config hasn't changed and widget is already loaded
    if (scriptLoadedRef.current && lastConfigRef.current === configKey) {
      return;
    }

    lastConfigRef.current = configKey;

    // Clean up previous widget
    if (scriptLoadedRef.current) {
      const widgetDiv = widgetDivRef.current;
      const scripts = widgetDiv.querySelectorAll('script');
      const iframes = widgetDiv.querySelectorAll('iframe');
      scripts.forEach(s => s.remove());
      iframes.forEach(i => i.remove());
      widgetDiv.innerHTML = '';
      scriptLoadedRef.current = false;
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!container.current || !widgetDivRef.current) return;

      const widgetDiv = widgetDivRef.current;
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
        backgroundColor: '#0F0F0F',
        gridColor: 'rgba(242, 242, 242, 0.06)',
        watchlist: [],
        withdateranges: false,
        compareSymbols: [],
        studies: [],
        autosize: true,
        container_id: widgetDiv.id || `tradingview-widget-${Date.now()}`,
        overrides: {
          'paneProperties.background': '#0F0F0F',
          'paneProperties.backgroundType': 'solid',
        },
      };

      script.innerHTML = JSON.stringify(widgetConfig);

      script.onerror = () => {
        console.error('[TradingView] Failed to load widget script');
        scriptLoadedRef.current = false;
      };

      widgetDiv.appendChild(script);
      scriptLoadedRef.current = true;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [configKey, tvSymbol, tvInterval, theme]);

  // Listen for symbol changes from TradingView widget
  const onSymbolChangeRef = useRef(onSymbolChange);
  const lastKnownSymbolRef = useRef<string>(symbol);
  const symbolChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectedSymbolRef = useRef<string>('');

  // Keep callback ref up to date
  useEffect(() => {
    onSymbolChangeRef.current = onSymbolChange;
    lastKnownSymbolRef.current = symbol;
  }, [onSymbolChange, symbol]);

  useEffect(() => {
    if (!onSymbolChangeRef.current) {
      console.log('[TradingViewWidget] No onSymbolChange callback provided');
      return;
    }

    console.log('[TradingViewWidget] Setting up symbol change detection');

    const handleMessage = (event: MessageEvent) => {
      try {
        // Log all TradingView messages for debugging
        if (event.origin && (event.origin.includes('tradingview.com') || event.origin.includes('s3.tradingview.com'))) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[TradingViewWidget] Received message from TradingView:', {
              origin: event.origin,
              data: event.data,
              dataType: typeof event.data
            });
          }
        }

        // Only process messages from TradingView domain for security
        if (!event.origin || (!event.origin.includes('tradingview.com') && !event.origin.includes('s3.tradingview.com'))) {
          return;
        }

        if (!event.data) return;

        let eventSymbol: string | null = null;
        let eventName: string | null = null;

        // Try to extract symbol from message
        if (typeof event.data === 'object') {
          eventName = event.data.name || event.data.event || '';
          eventSymbol = event.data.symbol || event.data.p || event.data.s || event.data.symbol_name || event.data.symbolName || event.data.symbol_name || event.data.s;
          
          // Also check nested objects
          if (!eventSymbol && event.data.data) {
            eventSymbol = event.data.data.symbol || event.data.data.p || event.data.data.s;
          }
        } else if (typeof event.data === 'string') {
          try {
            const parsed = JSON.parse(event.data);
            eventName = parsed.name || parsed.event || '';
            eventSymbol = parsed.symbol || parsed.p || parsed.s || parsed.symbol_name || parsed.symbolName;
            
            if (!eventSymbol && parsed.data) {
              eventSymbol = parsed.data.symbol || parsed.data.p || parsed.data.s;
            }
          } catch {
            // If not JSON, check if it's a simple symbol string
            if (event.data.length > 0 && event.data.length < 50 && /^[A-Z0-9:]+$/.test(event.data)) {
              eventSymbol = event.data;
            }
          }
        }

        // Process symbol changes
        if (eventSymbol && typeof eventSymbol === 'string' && eventSymbol.length > 0) {
          const currentTvSymbol = mapSymbolToTradingView(lastKnownSymbolRef.current || 'EURUSD');
          
          // Check if symbol actually changed
          if (eventSymbol.toUpperCase() !== currentTvSymbol.toUpperCase()) {
            console.log('[TradingViewWidget] Symbol change detected in postMessage:', {
              eventSymbol,
              currentTvSymbol,
              eventName
            });
            
            // Clear any pending timeout
            if (symbolChangeTimeoutRef.current) {
              clearTimeout(symbolChangeTimeoutRef.current);
            }
            
            // Debounce symbol changes to avoid too many updates
            symbolChangeTimeoutRef.current = setTimeout(() => {
              try {
                if (!eventSymbol || typeof eventSymbol !== 'string') return;
                const internalSymbol = mapTradingViewToSymbol(eventSymbol);
                if (internalSymbol && 
                    internalSymbol.toUpperCase() !== (lastKnownSymbolRef.current || '').toUpperCase() && 
                    onSymbolChangeRef.current) {
                  console.log('[TradingViewWidget] ✅ Symbol change confirmed via postMessage:', eventSymbol, '->', internalSymbol);
                  lastKnownSymbolRef.current = internalSymbol;
                  lastDetectedSymbolRef.current = internalSymbol;
                  onSymbolChangeRef.current(internalSymbol);
                }
              } catch (error) {
                console.error('[TradingViewWidget] Error mapping symbol:', error);
              }
            }, 300);
          }
        }
      } catch (error) {
        // Log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TradingViewWidget] Error processing message:', error);
        }
        if (error instanceof Error && error.message.includes('permission denied')) {
          return;
        }
      }
    };

    // Listen to all messages (TradingView widgets use postMessage)
    window.addEventListener('message', handleMessage, false);

    // More aggressive polling for symbol changes (every 1 second)
    const pollInterval = setInterval(() => {
      if (!widgetDivRef.current || !onSymbolChangeRef.current) return;
      
      try {
        const iframe = widgetDivRef.current.querySelector('iframe');
        if (iframe) {
          // Try to extract symbol from iframe src URL or title
          let src = '';
          let title = '';
          
          try {
            // These may throw "permission denied" errors due to cross-origin restrictions
            src = iframe.src || '';
            title = iframe.title || '';
          } catch (e) {
            // Cross-origin access denied - this is expected and safe to ignore
            return;
          }
          
          // Look for symbol patterns in URL - more comprehensive patterns
          // Try multiple patterns to catch different URL formats
          let urlMatch = null;
          if (src) {
            // Pattern 1: symbol=NASDAQ:AAPL or symbol=AAPL
            urlMatch = src.match(/[?&]symbol[=:]([A-Z0-9:]+)/i) ||
                      // Pattern 2: /symbols/NASDAQ:AAPL or /symbols/AAPL
                      src.match(/\/symbols\/([A-Z0-9:]+)/i) ||
                      // Pattern 3: symbol[s]?[=:]?([A-Z]+[:][A-Z0-9]+|[A-Z0-9]{1,6})
                      src.match(/symbol[s]?[=:]?([A-Z]+[:][A-Z0-9]+|[A-Z0-9]{1,6})/i) ||
                      // Pattern 4: /chart/?symbol=...
                      src.match(/\/chart\/[^?]*[?&]symbol=([A-Z0-9:]+)/i) ||
                      // Pattern 5: Any path with symbol-like pattern (NASDAQ:AAPL, AAPL, etc.)
                      src.match(/\/([A-Z]+[:][A-Z0-9]{1,6}|[A-Z]{2,6})\//i) ||
                      // Pattern 6: widget config in URL
                      src.match(/symbol["']?\s*[:=]\s*["']?([A-Z0-9:]+)/i);
          }
          
          // Look for symbol in title - more flexible
          const titleMatch = title ? (
            title.match(/([A-Z0-9]{2,6}(USD|EUR|GBP|JPY)?)/) ||
            title.match(/([A-Z]+[:][A-Z0-9]+)/) ||
            title.match(/\b([A-Z]{2,6})\b/) // Stock symbols like AAPL, TSLA, MSFT
          ) : null;
          
          const detectedTvSymbol = (urlMatch && urlMatch[1]) || (titleMatch && titleMatch[1]);
          
          if (detectedTvSymbol && typeof detectedTvSymbol === 'string') {
            const cleanSymbol = detectedTvSymbol.toUpperCase().trim();
            const internalSymbol = mapTradingViewToSymbol(cleanSymbol);
            const currentSymbol = (lastKnownSymbolRef.current || 'EURUSD').toUpperCase();
            
            // Log detection attempts for debugging
            if (process.env.NODE_ENV === 'development' && cleanSymbol !== currentSymbol) {
              console.log('[TradingViewWidget] Polling detected symbol:', {
                detectedTvSymbol: cleanSymbol,
                internalSymbol,
                currentSymbol,
                src: src.substring(0, 200), // Log first 200 chars of URL
                title,
                urlMatch: urlMatch ? urlMatch[0] : null,
                titleMatch: titleMatch ? titleMatch[0] : null
              });
            }
            
            if (internalSymbol && 
                internalSymbol.toUpperCase() !== currentSymbol &&
                internalSymbol.toUpperCase() !== (lastDetectedSymbolRef.current || '').toUpperCase()) {
              // Clear any pending timeout
              if (symbolChangeTimeoutRef.current) {
                clearTimeout(symbolChangeTimeoutRef.current);
              }
              
              console.log('[TradingViewWidget] ✅ Symbol change detected via polling:', {
                detectedTvSymbol: cleanSymbol,
                internalSymbol,
                currentSymbol,
                src: src.substring(0, 200), // Log first 200 chars of URL
                title,
                urlMatch: urlMatch ? urlMatch[0] : null,
                titleMatch: titleMatch ? titleMatch[0] : null
              });
              
              lastKnownSymbolRef.current = internalSymbol;
              lastDetectedSymbolRef.current = internalSymbol;
              onSymbolChangeRef.current(internalSymbol);
            }
          } else if (process.env.NODE_ENV === 'development' && src) {
            // Log when we can't detect symbol for debugging
            console.debug('[TradingViewWidget] Could not detect symbol from:', {
              src: src.substring(0, 200),
              title,
              hasIframe: !!iframe
            });
          }
        }
      } catch (error) {
        // Silently ignore - cross-origin restrictions may prevent access
        if (process.env.NODE_ENV === 'development') {
          console.debug('[TradingViewWidget] Polling error (expected):', error);
        }
      }
    }, 500); // Poll every 500ms for faster detection

    // Also use MutationObserver to watch for DOM changes
    let observer: MutationObserver | null = null;
    if (widgetDivRef.current) {
      observer = new MutationObserver(() => {
        // When DOM changes, check for symbol changes
        const iframe = widgetDivRef.current?.querySelector('iframe');
        if (iframe) {
          try {
            const src = iframe.src || '';
            const urlMatch = src.match(/symbol[s]?[=:]?([A-Z]+[:][A-Z0-9]+|[A-Z0-9]{1,6})/i) || 
                           src.match(/symbols\/([A-Z0-9:]+)/i);
            if (urlMatch && urlMatch[1]) {
              const detectedTvSymbol = urlMatch[1];
              const internalSymbol = mapTradingViewToSymbol(detectedTvSymbol);
              const currentSymbol = lastKnownSymbolRef.current || 'EURUSD';
              
              if (internalSymbol && internalSymbol.toUpperCase() !== currentSymbol.toUpperCase()) {
                console.log('[TradingViewWidget] ✅ Symbol change detected via MutationObserver:', detectedTvSymbol, '->', internalSymbol);
                lastKnownSymbolRef.current = internalSymbol;
                lastDetectedSymbolRef.current = internalSymbol;
                onSymbolChangeRef.current?.(internalSymbol);
              }
            }
          } catch (e) {
            // Ignore cross-origin errors
          }
        }
      });
      
      observer.observe(widgetDivRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'title'],
      });
    }

    return () => {
      window.removeEventListener('message', handleMessage, false);
      clearInterval(pollInterval);
      if (observer) {
        observer.disconnect();
      }
      if (symbolChangeTimeoutRef.current) {
        clearTimeout(symbolChangeTimeoutRef.current);
        symbolChangeTimeoutRef.current = null;
      }
    };
  }, []); // Empty deps - we use refs for callbacks

  // Extract symbol name for copyright link
  const symbolName = useMemo(() => {
    if (!symbol || typeof symbol !== 'string') return 'EURUSD';
    const parts = symbol.split(':');
    return parts.length > 1 ? parts[1] : parts[0] || symbol;
  }, [symbol]);

  const exchangeName = useMemo(() => {
    if (!symbol || typeof symbol !== 'string') return 'PEPPERSTONE';
    const parts = tvSymbol.split(':');
    return parts.length > 1 ? parts[0] : 'PEPPERSTONE';
  }, [tvSymbol]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={container} style={{ height: '100%', width: '100%', minHeight: '300px', position: 'relative' }}>
      <div 
        className="tradingview-widget-container__widget" 
        ref={widgetDivRef}
        id={`tradingview-widget-${Date.now()}`}
        style={{ height: `calc(100% - 32px)`, width: '100%', minHeight: '268px' }}
      />
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2" style={{ height: '32px' }}>
        <a
          href={`https://www.tradingview.com/symbols/${symbolName}/?exchange=${exchangeName}`}
          rel="noopener nofollow"
          target="_blank"
          className="text-brand-gold hover:text-brand-gold/80 transition-colors"
        >
          <span className="blue-text">{symbolName} price</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
