'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewTechnicalAnalysisProps {
  symbol?: string;
  colorTheme?: 'light' | 'dark';
  displayMode?: 'single' | 'multiple';
  isTransparent?: boolean;
  locale?: string;
  interval?: string;
  disableInterval?: boolean;
  width?: number | string;
  height?: number;
  showIntervalTabs?: boolean;
}

function TradingViewTechnicalAnalysis({
  symbol = 'NASDAQ:AAPL',
  colorTheme = 'dark',
  displayMode = 'single',
  isTransparent = false,
  locale = 'en',
  interval = '1m',
  disableInterval = false,
  width = '100%',
  height = 450,
  showIntervalTabs = true,
}: TradingViewTechnicalAnalysisProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetContainerIdRef = useRef<string>(`tradingview-technical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!container.current) return;

    // Get the widget container div
    let widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
    
    // If widget div doesn't exist, create it (shouldn't happen, but safety check)
    if (!widgetDiv) {
      widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = `${height}px`;
      widgetDiv.style.width = '100%';
      container.current.insertBefore(widgetDiv, container.current.querySelector('.tradingview-widget-copyright'));
    }

    // Clean up previous widget
    if (scriptLoadedRef.current) {
      const scripts = widgetDiv.querySelectorAll('script');
      const iframes = widgetDiv.querySelectorAll('iframe');
      scripts.forEach(s => s.remove());
      iframes.forEach(i => i.remove());
      widgetDiv.innerHTML = '';
      scriptLoadedRef.current = false;
    }

    // Ensure widget div has an ID
    if (!widgetDiv.id) {
      widgetDiv.id = widgetContainerIdRef.current;
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!container.current || !widgetDiv || !document.getElementById(widgetDiv.id)) {
        console.error('[TradingView] Container not ready');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        colorTheme,
        displayMode,
        isTransparent,
        locale,
        interval,
        disableInterval,
        width: typeof width === 'number' ? width : '100%',
        height,
        symbol,
        showIntervalTabs,
      });

      // Add error handling for script loading
      script.onerror = () => {
        console.error('[TradingView] Failed to load technical analysis widget script');
        scriptLoadedRef.current = false;
      };

      // Append script to the widget container div
      widgetDiv.appendChild(script);
      scriptLoadedRef.current = true;
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      // Clean up widget
      if (container.current) {
        const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
        if (widgetDiv) {
          const scripts = widgetDiv.querySelectorAll('script');
          const iframes = widgetDiv.querySelectorAll('iframe');
          scripts.forEach(s => s.remove());
          iframes.forEach(i => i.remove());
          widgetDiv.innerHTML = '';
        }
        scriptLoadedRef.current = false;
      }
    };
  }, [symbol, colorTheme, displayMode, isTransparent, locale, interval, disableInterval, width, height, showIntervalTabs]);

  // Extract symbol name for copyright link
  const symbolName = symbol.split(':').pop() || symbol;

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div 
        id={widgetContainerIdRef.current}
        className="tradingview-widget-container__widget" 
        style={{ height: `${height}px`, width: '100%' }}
      ></div>
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2">
        <a
          href={`https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/technicals/`}
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">{symbolName} stock analysis</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewTechnicalAnalysis);
