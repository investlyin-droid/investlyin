'use client';

import { useState } from 'react';

interface SymbolOption {
  value: string;
  label: string;
  category: string;
  defaultPrice: string;
}

const TRADING_SYMBOLS: SymbolOption[] = [
  // Forex - Major Pairs
  { value: 'EURUSD', label: 'EUR/USD', category: 'Forex Major', defaultPrice: '1.1000' },
  { value: 'GBPUSD', label: 'GBP/USD', category: 'Forex Major', defaultPrice: '1.2500' },
  { value: 'USDJPY', label: 'USD/JPY', category: 'Forex Major', defaultPrice: '150.00' },
  { value: 'USDCHF', label: 'USD/CHF', category: 'Forex Major', defaultPrice: '0.8800' },
  { value: 'AUDUSD', label: 'AUD/USD', category: 'Forex Major', defaultPrice: '0.6500' },
  { value: 'USDCAD', label: 'USD/CAD', category: 'Forex Major', defaultPrice: '1.3500' },
  { value: 'NZDUSD', label: 'NZD/USD', category: 'Forex Major', defaultPrice: '0.6000' },
  
  // Forex - Minor Pairs
  { value: 'EURGBP', label: 'EUR/GBP', category: 'Forex Minor', defaultPrice: '0.8800' },
  { value: 'EURJPY', label: 'EUR/JPY', category: 'Forex Minor', defaultPrice: '165.00' },
  { value: 'GBPJPY', label: 'GBP/JPY', category: 'Forex Minor', defaultPrice: '187.50' },
  { value: 'EURCHF', label: 'EUR/CHF', category: 'Forex Minor', defaultPrice: '0.9680' },
  { value: 'AUDJPY', label: 'AUD/JPY', category: 'Forex Minor', defaultPrice: '97.50' },
  { value: 'CADJPY', label: 'CAD/JPY', category: 'Forex Minor', defaultPrice: '111.00' },
  { value: 'NZDJPY', label: 'NZD/JPY', category: 'Forex Minor', defaultPrice: '90.00' },
  { value: 'EURAUD', label: 'EUR/AUD', category: 'Forex Minor', defaultPrice: '1.6923' },
  { value: 'EURCAD', label: 'EUR/CAD', category: 'Forex Minor', defaultPrice: '1.4850' },
  { value: 'GBPAUD', label: 'GBP/AUD', category: 'Forex Minor', defaultPrice: '1.9231' },
  { value: 'GBPCAD', label: 'GBP/CAD', category: 'Forex Minor', defaultPrice: '1.6875' },
  { value: 'AUDCAD', label: 'AUD/CAD', category: 'Forex Minor', defaultPrice: '0.8775' },
  { value: 'AUDNZD', label: 'AUD/NZD', category: 'Forex Minor', defaultPrice: '1.0833' },
  
  // Forex - Exotic Pairs
  { value: 'USDZAR', label: 'USD/ZAR', category: 'Forex Exotic', defaultPrice: '18.50' },
  { value: 'USDMXN', label: 'USD/MXN', category: 'Forex Exotic', defaultPrice: '17.00' },
  { value: 'USDTRY', label: 'USD/TRY', category: 'Forex Exotic', defaultPrice: '32.00' },
  { value: 'USDSEK', label: 'USD/SEK', category: 'Forex Exotic', defaultPrice: '10.50' },
  { value: 'USDNOK', label: 'USD/NOK', category: 'Forex Exotic', defaultPrice: '10.80' },
  { value: 'USDDKK', label: 'USD/DKK', category: 'Forex Exotic', defaultPrice: '6.90' },
  { value: 'USDPLN', label: 'USD/PLN', category: 'Forex Exotic', defaultPrice: '4.00' },
  { value: 'USDHKD', label: 'USD/HKD', category: 'Forex Exotic', defaultPrice: '7.80' },
  { value: 'USDSGD', label: 'USD/SGD', category: 'Forex Exotic', defaultPrice: '1.35' },
  { value: 'USDCNH', label: 'USD/CNH', category: 'Forex Exotic', defaultPrice: '7.20' },
  
  // Metals (Commodities)
  { value: 'XAUUSD', label: 'XAU/USD (Gold)', category: 'Metals', defaultPrice: '2050.00' },
  { value: 'XAGUSD', label: 'XAG/USD (Silver)', category: 'Metals', defaultPrice: '24.50' },
  { value: 'XPTUSD', label: 'XPT/USD (Platinum)', category: 'Metals', defaultPrice: '950.00' },
  { value: 'XPDUSD', label: 'XPD/USD (Palladium)', category: 'Metals', defaultPrice: '1100.00' },
  
  // Cryptocurrencies
  { value: 'BTCUSD', label: 'BTC/USD (Bitcoin)', category: 'Cryptocurrencies', defaultPrice: '45000.00' },
  { value: 'ETHUSD', label: 'ETH/USD (Ethereum)', category: 'Cryptocurrencies', defaultPrice: '3000.00' },
  { value: 'BNBUSD', label: 'BNB/USD (Binance Coin)', category: 'Cryptocurrencies', defaultPrice: '320.00' },
  { value: 'ADAUSD', label: 'ADA/USD (Cardano)', category: 'Cryptocurrencies', defaultPrice: '0.50' },
  { value: 'SOLUSD', label: 'SOL/USD (Solana)', category: 'Cryptocurrencies', defaultPrice: '100.00' },
  { value: 'XRPUSD', label: 'XRP/USD (Ripple)', category: 'Cryptocurrencies', defaultPrice: '0.60' },
  { value: 'DOTUSD', label: 'DOT/USD (Polkadot)', category: 'Cryptocurrencies', defaultPrice: '7.00' },
  { value: 'DOGEUSD', label: 'DOGE/USD (Dogecoin)', category: 'Cryptocurrencies', defaultPrice: '0.10' },
  { value: 'MATICUSD', label: 'MATIC/USD (Polygon)', category: 'Cryptocurrencies', defaultPrice: '0.90' },
  { value: 'LINKUSD', label: 'LINK/USD (Chainlink)', category: 'Cryptocurrencies', defaultPrice: '15.00' },
  { value: 'AVAXUSD', label: 'AVAX/USD (Avalanche)', category: 'Cryptocurrencies', defaultPrice: '35.00' },
  { value: 'UNIUSD', label: 'UNI/USD (Uniswap)', category: 'Cryptocurrencies', defaultPrice: '7.50' },
  
  // Energies (Commodities)
  { value: 'USOIL', label: 'USOIL (Crude Oil WTI)', category: 'Energies', defaultPrice: '75.00' },
  { value: 'UKOIL', label: 'UKOIL (Crude Oil Brent)', category: 'Energies', defaultPrice: '80.00' },
  { value: 'NATGAS', label: 'NATGAS (Natural Gas)', category: 'Energies', defaultPrice: '2.50' },
  
  // Stocks
  { value: 'AAPL', label: 'AAPL (Apple)', category: 'Stocks', defaultPrice: '180.00' },
  { value: 'MSFT', label: 'MSFT (Microsoft)', category: 'Stocks', defaultPrice: '380.00' },
  { value: 'GOOGL', label: 'GOOGL (Alphabet)', category: 'Stocks', defaultPrice: '140.00' },
  { value: 'AMZN', label: 'AMZN (Amazon)', category: 'Stocks', defaultPrice: '150.00' },
  { value: 'TSLA', label: 'TSLA (Tesla)', category: 'Stocks', defaultPrice: '250.00' },
  { value: 'META', label: 'META (Meta)', category: 'Stocks', defaultPrice: '350.00' },
  { value: 'NVDA', label: 'NVDA (NVIDIA)', category: 'Stocks', defaultPrice: '500.00' },
  { value: 'JPM', label: 'JPM (JPMorgan)', category: 'Stocks', defaultPrice: '160.00' },
  { value: 'V', label: 'V (Visa)', category: 'Stocks', defaultPrice: '250.00' },
  { value: 'JNJ', label: 'JNJ (Johnson & Johnson)', category: 'Stocks', defaultPrice: '160.00' },
  { value: 'WMT', label: 'WMT (Walmart)', category: 'Stocks', defaultPrice: '160.00' },
  { value: 'MA', label: 'MA (Mastercard)', category: 'Stocks', defaultPrice: '420.00' },
  { value: 'PG', label: 'PG (Procter & Gamble)', category: 'Stocks', defaultPrice: '150.00' },
  { value: 'DIS', label: 'DIS (Disney)', category: 'Stocks', defaultPrice: '100.00' },
  { value: 'NFLX', label: 'NFLX (Netflix)', category: 'Stocks', defaultPrice: '450.00' },
  { value: 'BAC', label: 'BAC (Bank of America)', category: 'Stocks', defaultPrice: '35.00' },
  { value: 'XOM', label: 'XOM (Exxon Mobil)', category: 'Stocks', defaultPrice: '110.00' },
  { value: 'CSCO', label: 'CSCO (Cisco)', category: 'Stocks', defaultPrice: '50.00' },
  { value: 'PFE', label: 'PFE (Pfizer)', category: 'Stocks', defaultPrice: '28.00' },
  { value: 'INTC', label: 'INTC (Intel)', category: 'Stocks', defaultPrice: '45.00' },
  
  // Indices
  { value: 'SPX500', label: 'SPX500 (S&P 500)', category: 'Indices', defaultPrice: '4500.00' },
  { value: 'NAS100', label: 'NAS100 (NASDAQ 100)', category: 'Indices', defaultPrice: '15000.00' },
  { value: 'UK100', label: 'UK100 (FTSE 100)', category: 'Indices', defaultPrice: '7500.00' },
  { value: 'GER30', label: 'GER30 (DAX 30)', category: 'Indices', defaultPrice: '16000.00' },
  { value: 'FRA40', label: 'FRA40 (CAC 40)', category: 'Indices', defaultPrice: '7200.00' },
  { value: 'JPN225', label: 'JPN225 (Nikkei 225)', category: 'Indices', defaultPrice: '33000.00' },
  { value: 'AUS200', label: 'AUS200 (ASX 200)', category: 'Indices', defaultPrice: '7200.00' },
  { value: 'US30', label: 'US30 (Dow Jones)', category: 'Indices', defaultPrice: '35000.00' },
  { value: 'SWI20', label: 'SWI20 (Swiss Market)', category: 'Indices', defaultPrice: '11000.00' },
  { value: 'ESP35', label: 'ESP35 (IBEX 35)', category: 'Indices', defaultPrice: '9500.00' },
];

export default function TradingCalculator() {
  const [accountBalance, setAccountBalance] = useState<string>('1000');
  const [riskPercent, setRiskPercent] = useState<string>('2');
  const [entryPrice, setEntryPrice] = useState<string>('1.1000');
  const [stopLoss, setStopLoss] = useState<string>('1.0950');
  const [leverage, setLeverage] = useState<string>('100');
  const [symbol, setSymbol] = useState<string>('EURUSD');

  const getSymbolInfo = (symbol: string) => {
    return TRADING_SYMBOLS.find(s => s.value === symbol) || TRADING_SYMBOLS[0];
  };

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    const symbolInfo = getSymbolInfo(newSymbol);
    if (symbolInfo) {
      setEntryPrice(symbolInfo.defaultPrice);
      // Set stop loss based on symbol type
      const entry = parseFloat(symbolInfo.defaultPrice);
      if (symbolInfo.category === 'Cryptocurrencies' || symbolInfo.category === 'Stocks' || symbolInfo.category === 'Indices') {
        setStopLoss((entry * 0.98).toFixed(2)); // 2% stop loss for crypto/stocks/indices
      } else if (symbolInfo.category === 'Metals' || symbolInfo.category === 'Energies') {
        setStopLoss((entry * 0.99).toFixed(2)); // 1% stop loss for commodities
      } else {
        // Forex pairs
        const isJPY = newSymbol.includes('JPY');
        const pipSize = isJPY ? 0.01 : 0.0001;
        setStopLoss((entry - (pipSize * 50)).toFixed(isJPY ? 2 : 4)); // 50 pips stop loss
      }
    }
  };

  const calculatePositionSize = () => {
    const balance = parseFloat(accountBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const lev = parseFloat(leverage) || 1;

    if (!balance || !risk || !entry || !sl || entry === sl || lev <= 0) return null;

    const riskAmount = balance * (risk / 100);
    const priceDiff = Math.abs(entry - sl);
    const symbolInfo = getSymbolInfo(symbol);
    const category = symbolInfo?.category || 'Forex Major';
    
    let pipSize: number;
    let contractSize: number;
    let pipValuePerLot: number;
    let pips: number;
    let lotSize: number;
    
    // Determine pip size and contract size based on instrument type
    if (category.includes('Forex')) {
      // Forex pairs
      const isJPY = symbol.includes('JPY');
      pipSize = isJPY ? 0.01 : 0.0001;
      contractSize = 100000; // Standard forex lot
      pips = priceDiff / pipSize;
      pipValuePerLot = (pipSize / entry) * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else if (category === 'Metals') {
      // Metals: Gold, Silver, Platinum, Palladium
      // Contract size: 100 oz for gold, 5000 oz for silver
      if (symbol === 'XAUUSD') {
        contractSize = 100; // 100 oz per lot
        pipSize = 0.01; // $0.01 per oz
      } else if (symbol === 'XAGUSD') {
        contractSize = 5000; // 5000 oz per lot
        pipSize = 0.001; // $0.001 per oz
      } else {
        contractSize = 100; // Default for other metals
        pipSize = 0.01;
      }
      pips = priceDiff / pipSize;
      pipValuePerLot = pipSize * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else if (category === 'Cryptocurrencies') {
      // Cryptocurrencies: Contract size varies, using 1 unit per lot
      contractSize = 1;
      pipSize = entry >= 1000 ? 1 : (entry >= 1 ? 0.01 : 0.0001); // Adaptive pip size
      pips = priceDiff / pipSize;
      pipValuePerLot = pipSize * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else if (category === 'Energies') {
      // Energies: Oil and Gas
      contractSize = 1000; // 1000 barrels/units per lot
      pipSize = 0.01; // $0.01 per unit
      pips = priceDiff / pipSize;
      pipValuePerLot = pipSize * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else if (category === 'Stocks') {
      // Stocks: 1 share per lot typically
      contractSize = 1;
      pipSize = 0.01; // $0.01 per share
      pips = priceDiff / pipSize;
      pipValuePerLot = pipSize * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else if (category === 'Indices') {
      // Indices: Contract multiplier varies, using 1 point = $1
      contractSize = 1;
      pipSize = 0.1; // 0.1 points
      pips = priceDiff / pipSize;
      pipValuePerLot = pipSize * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    } else {
      // Default to forex calculation
      const isJPY = symbol.includes('JPY');
      pipSize = isJPY ? 0.01 : 0.0001;
      contractSize = 100000;
      pips = priceDiff / pipSize;
      pipValuePerLot = (pipSize / entry) * contractSize;
      lotSize = riskAmount / (pips * pipValuePerLot);
    }

    const totalContractSize = lotSize * contractSize;
    const marginRequired = totalContractSize / lev;

    return {
      lotSize: Math.max(0.01, Math.min(100, parseFloat(lotSize.toFixed(2)))),
      marginRequired: parseFloat(marginRequired.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      pips: parseFloat(pips.toFixed(1)),
      pipValue: parseFloat(pipValuePerLot.toFixed(2)),
      priceMove: parseFloat(priceDiff.toFixed(4)),
    };
  };

  const results = calculatePositionSize();

  return (
    <div className="max-w-4xl mx-auto glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-white/5 hover:border-brand-gold/20 transition-all">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Trading Instrument</label>
            <select
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
            >
              <optgroup label="Forex - Major Pairs">
                {TRADING_SYMBOLS.filter(s => s.category === 'Forex Major').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Forex - Minor Pairs">
                {TRADING_SYMBOLS.filter(s => s.category === 'Forex Minor').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Forex - Exotic Pairs">
                {TRADING_SYMBOLS.filter(s => s.category === 'Forex Exotic').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Metals (Commodities)">
                {TRADING_SYMBOLS.filter(s => s.category === 'Metals').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Cryptocurrencies">
                {TRADING_SYMBOLS.filter(s => s.category === 'Cryptocurrencies').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Energies (Commodities)">
                {TRADING_SYMBOLS.filter(s => s.category === 'Energies').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Stocks">
                {TRADING_SYMBOLS.filter(s => s.category === 'Stocks').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Indices">
                {TRADING_SYMBOLS.filter(s => s.category === 'Indices').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Account Balance (USD)</label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
              placeholder="1000"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Risk Per Trade (%)</label>
            <input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
              placeholder="2"
              step="0.1"
              min="0.1"
              max="10"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Entry Price</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
              placeholder="1.1000"
              step="0.0001"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Stop Loss Price</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
              placeholder="1.0950"
              step="0.0001"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-brand-text-secondary mb-1.5 sm:mb-2">Leverage</label>
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full input-field rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-base sm:text-lg font-mono"
              placeholder="100"
              min="1"
              max="1000"
            />
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {results ? (
            <>
              <div className="glass-card p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border border-brand-gold/20 bg-brand-gold/5">
                <div className="text-[10px] sm:text-xs font-bold text-brand-gold uppercase tracking-widest mb-1.5 sm:mb-2">Recommended Position Size</div>
                <div className="text-2xl sm:text-3xl font-black text-white mb-1">{results.lotSize} Lots</div>
                <div className="text-xs sm:text-sm text-brand-text-secondary">Based on your risk parameters</div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="glass-card p-3 sm:p-4 rounded-lg border border-white/5">
                  <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Margin Required</div>
                  <div className="text-lg sm:text-xl font-black text-white">${results.marginRequired}</div>
                </div>
                <div className="glass-card p-3 sm:p-4 rounded-lg border border-white/5">
                  <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Risk Amount</div>
                  <div className="text-lg sm:text-xl font-black text-brand-red">${results.riskAmount}</div>
                </div>
                <div className="glass-card p-3 sm:p-4 rounded-lg border border-white/5">
                  <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Pip/Point Value (per lot)</div>
                  <div className="text-lg sm:text-xl font-black text-white">${results.pipValue}</div>
                </div>
                <div className="glass-card p-3 sm:p-4 rounded-lg border border-white/5">
                  <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Stop Loss</div>
                  <div className="text-lg sm:text-xl font-black text-white">{results.pips} {getSymbolInfo(symbol).category.includes('Forex') ? 'pips' : 'points'}</div>
                </div>
                <div className="glass-card p-3 sm:p-4 rounded-lg border border-white/5 col-span-2">
                  <div className="text-[10px] sm:text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1">Price Movement</div>
                  <div className="text-lg sm:text-xl font-black text-white">{results.priceMove.toFixed(4)} {getSymbolInfo(symbol).category.includes('Forex') ? 'pips' : 'units'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-8 sm:p-10 md:p-12 rounded-lg sm:rounded-xl border border-white/5 text-center">
              <div className="text-brand-text-secondary text-xs sm:text-sm">Enter values above to calculate position size</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
