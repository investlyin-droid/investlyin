'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewEconomicMapProps {
  theme?: 'light' | 'dark';
  height?: number;
}

function TradingViewEconomicMap({
  theme = 'dark',
  height = 500,
}: TradingViewEconomicMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!container.current) return;

    // Clean up previous widget
    if (scriptLoadedRef.current) {
      const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
      if (widgetDiv) {
        widgetDiv.innerHTML = '';
      }
      scriptLoadedRef.current = false;
    }

    // Check if script is already loaded globally
    const existingScript = document.querySelector('script[src*="tv-economic-map.js"]');
    
    if (!existingScript) {
      // Load TradingView economic map widget script
      const script = document.createElement('script');
      script.src = 'https://widgets.tradingview-widget.com/w/en/tv-economic-map.js';
      script.async = true;
      script.type = 'module';
      document.head.appendChild(script);
    }

    // Get the widget container div
    const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
    if (!widgetDiv) {
      console.error('[TradingView] Widget container div not found');
      return;
    }

    // Clear any existing content
    widgetDiv.innerHTML = '';

    // Create the economic map element
    const mapElement = document.createElement('tv-economic-map');
    mapElement.setAttribute('theme', theme);

    widgetDiv.appendChild(mapElement);

    scriptLoadedRef.current = true;

    return () => {
      if (container.current) {
        const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
        if (widgetDiv) {
          widgetDiv.innerHTML = '';
        }
        scriptLoadedRef.current = false;
      }
    };
  }, [theme]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ height: `${height}px`, width: '100%' }}></div>
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
