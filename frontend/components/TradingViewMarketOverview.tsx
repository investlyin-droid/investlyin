'use client';

import React, { useEffect, useRef, memo } from 'react';

interface MarketOverviewTab {
  title: string;
  symbols: Array<{
    s: string;
    d: string;
  }>;
  originalTitle: string;
}

interface TradingViewMarketOverviewProps {
  colorTheme?: 'light' | 'dark';
  dateRange?: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  locale?: string;
  largeChartUrl?: string;
  isTransparent?: boolean;
  showFloatingTooltip?: boolean;
  plotLineColorGrowing?: string;
  plotLineColorFalling?: string;
  gridLineColor?: string;
  scaleFontColor?: string;
  belowLineFillColorGrowing?: string;
  belowLineFillColorFalling?: string;
  belowLineFillColorGrowingBottom?: string;
  belowLineFillColorFallingBottom?: string;
  symbolActiveColor?: string;
  tabs?: MarketOverviewTab[];
  backgroundColor?: string;
  width?: string | number;
  height?: string | number;
  showSymbolLogo?: boolean;
  showChart?: boolean;
}

function TradingViewMarketOverview({
  colorTheme = 'dark',
  dateRange = '1D',
  locale = 'en',
  largeChartUrl = '',
  isTransparent = false,
  showFloatingTooltip = false,
  plotLineColorGrowing = 'rgba(41, 98, 255, 1)',
  plotLineColorFalling = 'rgba(41, 98, 255, 1)',
  gridLineColor = 'rgba(240, 243, 250, 0)',
  scaleFontColor = '#DBDBDB',
  belowLineFillColorGrowing = 'rgba(41, 98, 255, 0.12)',
  belowLineFillColorFalling = 'rgba(41, 98, 255, 0.12)',
  belowLineFillColorGrowingBottom = 'rgba(41, 98, 255, 0)',
  belowLineFillColorFallingBottom = 'rgba(41, 98, 255, 0)',
  symbolActiveColor = 'rgba(41, 98, 255, 0.12)',
  tabs = [
    {
      title: 'Indices',
      symbols: [
        { s: 'FOREXCOM:SPXUSD', d: 'S&P 500 Index' },
        { s: 'FOREXCOM:NSXUSD', d: 'US 100 Cash CFD' },
        { s: 'FOREXCOM:DJI', d: 'Dow Jones Industrial Average Index' },
        { s: 'INDEX:NKY', d: 'Japan 225' },
        { s: 'INDEX:DEU40', d: 'DAX Index' },
        { s: 'FOREXCOM:UKXGBP', d: 'FTSE 100 Index' },
      ],
      originalTitle: 'Indices',
    },
    {
      title: 'Futures',
      symbols: [
        { s: 'BMFBOVESPA:ISP1!', d: 'S&P 500' },
        { s: 'BMFBOVESPA:EUR1!', d: 'Euro' },
        { s: 'CMCMARKETS:GOLD', d: 'Gold' },
        { s: 'PYTH:WTI3!', d: 'WTI Crude Oil' },
        { s: 'BMFBOVESPA:CCM1!', d: 'Corn' },
      ],
      originalTitle: 'Futures',
    },
    {
      title: 'Bonds',
      symbols: [
        { s: 'EUREX:FGBL1!', d: 'Euro Bund' },
        { s: 'EUREX:FBTP1!', d: 'Euro BTP' },
        { s: 'EUREX:FGBM1!', d: 'Euro BOBL' },
      ],
      originalTitle: 'Bonds',
    },
    {
      title: 'Forex',
      symbols: [
        { s: 'FX:EURUSD', d: 'EUR to USD' },
        { s: 'FX:GBPUSD', d: 'GBP to USD' },
        { s: 'FX:USDJPY', d: 'USD to JPY' },
        { s: 'FX:USDCHF', d: 'USD to CHF' },
        { s: 'FX:AUDUSD', d: 'AUD to USD' },
        { s: 'FX:USDCAD', d: 'USD to CAD' },
      ],
      originalTitle: 'Forex',
    },
  ],
  backgroundColor = '#0f0f0f',
  width = '100%',
  height = 550,
  showSymbolLogo = true,
  showChart = true,
}: TradingViewMarketOverviewProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetContainerIdRef = useRef<string>(`tradingview-market-overview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
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
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        colorTheme,
        dateRange,
        locale,
        largeChartUrl,
        isTransparent,
        showFloatingTooltip,
        plotLineColorGrowing,
        plotLineColorFalling,
        gridLineColor,
        scaleFontColor,
        belowLineFillColorGrowing,
        belowLineFillColorFalling,
        belowLineFillColorGrowingBottom,
        belowLineFillColorFallingBottom,
        symbolActiveColor,
        tabs,
        support_host: 'https://www.tradingview.com',
        backgroundColor,
        width: typeof width === 'number' ? width : '100%',
        height: typeof height === 'number' ? height : 550,
        showSymbolLogo,
        showChart,
      });

      // Add error handling for script loading
      script.onerror = () => {
        console.error('[TradingView] Failed to load market overview widget script');
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
  }, [
    colorTheme,
    dateRange,
    locale,
    largeChartUrl,
    isTransparent,
    showFloatingTooltip,
    plotLineColorGrowing,
    plotLineColorFalling,
    gridLineColor,
    scaleFontColor,
    belowLineFillColorGrowing,
    belowLineFillColorFalling,
    belowLineFillColorGrowingBottom,
    belowLineFillColorFallingBottom,
    symbolActiveColor,
    tabs,
    backgroundColor,
    width,
    height,
    showSymbolLogo,
    showChart,
  ]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div 
        id={widgetContainerIdRef.current}
        className="tradingview-widget-container__widget" 
        style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
      ></div>
      <div className="tradingview-widget-copyright text-xs text-brand-text-secondary text-center py-2">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Market summary</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewMarketOverview);
