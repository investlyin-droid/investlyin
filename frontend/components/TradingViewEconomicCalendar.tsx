'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewEconomicCalendarProps {
  colorTheme?: 'light' | 'dark';
  isTransparent?: boolean;
  locale?: string;
  countryFilter?: string;
  importanceFilter?: string;
  width?: number | string;
  height?: number | string;
}

function TradingViewEconomicCalendar({
  colorTheme = 'dark',
  isTransparent = false,
  locale = 'en',
  countryFilter = '',
  importanceFilter = '-1,0,1',
  width = '100%',
  height = 550,
}: TradingViewEconomicCalendarProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetContainerIdRef = useRef<string>(`tradingview-events-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!container.current) return;

    // Get the widget container div
    let widgetDiv = container.current.querySelector('.tradingview-widget-container__widget') as HTMLDivElement;
    
    // If widget div doesn't exist, create it (shouldn't happen, but safety check)
    if (!widgetDiv) {
      widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.height = typeof height === 'number' ? `${height}px` : height;
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
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        colorTheme,
        isTransparent,
        locale,
        countryFilter,
        importanceFilter,
        width: typeof width === 'number' ? width : '100%',
        height: typeof height === 'number' ? height : 550,
      });

      // Add error handling for script loading
      script.onerror = () => {
        console.error('[TradingView] Failed to load economic calendar widget script');
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
  }, [colorTheme, isTransparent, locale, countryFilter, importanceFilter, width, height]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div 
        id={widgetContainerIdRef.current}
        className="tradingview-widget-container__widget" 
        style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
      ></div>
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2">
        <a href="https://www.tradingview.com/economic-calendar/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Economic Calendar</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewEconomicCalendar);
