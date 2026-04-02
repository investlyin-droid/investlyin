'use client';

import React, { useEffect, useRef, useState, memo } from 'react';

interface TradingViewEconomicMapProps {
  theme?: 'light' | 'dark';
  height?: number;
}

function TradingViewEconomicMap({
  theme = 'dark',
  height = 500,
}: TradingViewEconomicMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
    if (!widgetDiv) return;

    widgetDiv.innerHTML = '';
    setError(null);

    const loadScript = (): Promise<void> => {
      const existing = document.querySelector('script[src*="tv-economic-map.js"]');
      if (existing) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://widgets.tradingview-widget.com/w/en/tv-economic-map.js';
        script.async = true;
        script.type = 'module';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Economic Map script'));
        document.head.appendChild(script);
      });
    };

    let cancelled = false;
    const run = async () => {
      try {
        await loadScript();
        if (cancelled) return;
        await customElements.whenDefined('tv-economic-map');
        if (cancelled) return;
        const mapEl = document.createElement('tv-economic-map');
        mapEl.setAttribute('theme', theme);
        widgetDiv.appendChild(mapEl);
      } catch (e) {
        if (!cancelled) setError('Economic map is temporarily unavailable.');
      }
    };
    run();

    return () => {
      cancelled = true;
      if (widgetDiv) widgetDiv.innerHTML = '';
    };
  }, [theme]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-brand-surface/40 border border-white/10 text-brand-text-secondary text-sm" style={{ height: `${height}px`, width: '100%' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ height: `${height}px`, width: '100%' }} />
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2">
        <a href="https://www.tradingview.com/economic-map/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Economic Map</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewEconomicMap);
