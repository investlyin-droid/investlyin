'use client';

import React, { useEffect, useRef, memo } from 'react';

function TradingViewHeatmap() {
  const container = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!container.current || scriptLoadedRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: 'AllUSA',
      blockSize: 'market_cap_basic',
      blockColor: 'change|60',
      grouping: 'sector',
      locale: 'en',
      symbolUrl: '',
      colorTheme: 'dark',
      exchanges: [
        'ADX',
        'AMEX',
        'ASX',
        'BCBA',
        'BCS',
        'BER',
        'BET',
        'BIVA',
        'BVCV',
        'BME',
        'BMFBOVESPA',
        'BSE',
        'BVC',
        'BX',
        'CSECY',
        'DUS',
        'EGX',
        'EURONEXT',
        'FWB',
        'GPW',
        'HAM',
        'HNX',
        'IDX',
        'KRX',
        'KSE',
        'MIL',
        'MUN',
        'NASDAQ',
        'NASDAQDUBAI',
        'NEO',
        'NEWCONNECT',
        'NYSE',
        'OMXCOP',
        'OMXHEX',
        'OMXICE',
        'OMXRSE',
        'OMXSTO',
        'OMXTSE',
        'OMXVSE',
        'OTC',
        'SIX',
        'SSE',
        'TASE',
        'TPEX',
        'TSX',
        'TSXV',
        'UPCOM',
        'XETR',
      ],
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%',
    });

    container.current.appendChild(script);
    scriptLoadedRef.current = true;

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
        scriptLoadedRef.current = false;
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container w-full" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2">
        <a
          href="https://www.tradingview.com/heatmap/stock/"
          rel="noopener nofollow"
          target="_blank"
          className="text-brand-gold hover:text-brand-gold/80 transition-colors"
        >
          <span className="blue-text">Stock Heatmap</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewHeatmap);
