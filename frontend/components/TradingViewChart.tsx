'use client';

import { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  height?: number;
  width?: number;
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
    'XAUUSD': 'FX:XAUUSD',
    'XAGUSD': 'FX:XAGUSD',
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
    'USOIL': 'NYMEX:CL1!',
    'UKOIL': 'NYMEX:BRENT1!',
    'NATGAS': 'NYMEX:NG1!',
    'CRUDE': 'NYMEX:CL1!',
    'BRENT': 'NYMEX:BRENT1!',
    'WTI': 'NYMEX:CL1!',
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
  };
  
  // Indices
  const indices: Record<string, string> = {
    'SPX500': 'SPX',
    'SP500': 'SPX',
    'SPX': 'SPX',
    'NAS100': 'NASDAQ',
    'NASDAQ': 'NASDAQ',
    'UK100': 'FTSE',
    'FTSE': 'FTSE',
    'GER30': 'GERMANY:DAX',
    'DAX': 'GERMANY:DAX',
    'FRA40': 'FRANCE:CAC',
    'CAC': 'FRANCE:CAC',
    'JPN225': 'JAPAN:NIKKEI',
    'NIKKEI': 'JAPAN:NIKKEI',
    'AUS200': 'ASX:ASX200',
    'US30': 'DJI',
    'DJI': 'DJI',
    'DOW': 'DJI',
    'SWI20': 'SWISS:SMI',
    'ESP35': 'SPAIN:IBEX',
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
  
  // Pattern matching for forex pairs (6 characters, contains major currencies)
  if (sym.match(/^[A-Z]{6}$/) && (sym.includes('USD') || sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY') || sym.includes('CHF') || sym.includes('AUD') || sym.includes('CAD') || sym.includes('NZD'))) {
    return `FX:${sym}`;
  }
  
  // Pattern matching for metals
  if (sym.startsWith('XAU')) return 'FX:XAUUSD';
  if (sym.startsWith('XAG')) return 'FX:XAGUSD';
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
  if (sym.includes('OIL') || sym.includes('CRUDE') || sym.includes('WTI')) return 'NYMEX:CL1!';
  if (sym.includes('BRENT')) return 'NYMEX:BRENT1!';
  if (sym.includes('GAS') || sym.includes('NATGAS')) return 'NYMEX:NG1!';
  
  // Pattern matching for indices
  if (sym.includes('SPX') || sym.includes('SP500')) return 'SPX';
  if (sym.includes('NAS')) return 'NASDAQ';
  if (sym.includes('DJI') || sym.includes('DOW')) return 'DJI';
  if (sym.includes('FTSE') || sym.includes('UK100')) return 'FTSE';
  if (sym.includes('DAX') || sym.includes('GER30')) return 'GERMANY:DAX';
  if (sym.includes('NIKKEI') || sym.includes('JPN225')) return 'JAPAN:NIKKEI';
  
  // Default: try as forex pair
  return `FX:${sym}`;
}

// Map our timeframe to TradingView interval
function mapTimeframeToInterval(timeframe: string): string {
  const map: Record<string, string> = {
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
  return map[timeframe] || '5';
}

export default function TradingViewChart({
  symbol,
  interval = '5',
  theme = 'dark',
  autosize = true,
  height = 500,
  width,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const widgetRef = useRef<any>(null);

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      if (widgetRef.current && containerRef.current) {
        // TradingView widget automatically resizes with autosize enabled
        // Force a refresh by triggering a resize event
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerId = containerRef.current.id;
    const tvSymbol = mapSymbolToTradingView(symbol);
    const tvInterval = mapTimeframeToInterval(interval);

    const createWidget = () => {
      if (!containerRef.current || !(window as any).TradingView) return;
      
      containerRef.current.innerHTML = '';
      const widget = new (window as any).TradingView.widget({
        autosize: true, // Always use autosize for responsiveness
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC', // Use user's local timezone
        theme: theme,
        style: '1',
        locale: 'en',
        toolbar_bg: '#1a1a1a',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerId,
        height: undefined, // Let autosize handle it
        width: undefined, // Let autosize handle it
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        studies_overrides: {},
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        no_referral_id: true,
        referral_id: '',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'create_volume_indicator_by_default',
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
          'header_widget',
          'header_symbol_search',
          'header_compare',
          'header_screenshot',
          'header_chart_type',
          'header_resolutions',
          'header_save_load',
          'header_undo_redo',
          'header_fullscreen_button',
          'timeframes_toolbar',
          'control_bar',
          'display_market_status',
          'remove_library_container_border',
          'show_interval_dialog_on_key_press',
          'show_series_scale_buttons',
        ],
        overrides: {
          'paneProperties.background': '#0a0a0a',
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': '#1a1a1a',
          'paneProperties.horzGridProperties.color': '#1a1a1a',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#AAAAAA',
          'mainSeriesProperties.candleStyle.upColor': '#26a69a',
          'mainSeriesProperties.candleStyle.downColor': '#ef5350',
          'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
          'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
        },
      });
      widgetRef.current = widget;
    };

    // Check if script is already loaded
    if ((window as any).TradingView) {
      createWidget();
      return;
    }

    // Load TradingView widget script if not already loaded
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        createWidget();
      };
      
      // Fallback: if script loads but widget creation fails
      script.onerror = () => {
        scriptLoadedRef.current = false;
      };
      
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup: clear container and widget reference
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      widgetRef.current = null;
    };
  }, [symbol, interval, theme]);

  return (
    <div 
      id={`tradingview_${symbol}_${interval}`}
      ref={containerRef}
      className="w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px]"
      style={{ 
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    />
  );
}
