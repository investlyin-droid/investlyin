import { Controller, Get, Param } from '@nestjs/common';
import { MarketDataService, OhlcCandle } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private marketDataService: MarketDataService) {}

  @Get('prices')
  async getAllPrices() {
    return this.marketDataService.getAllPrices();
  }

  @Get('prices/:symbol')
  getPrice(@Param('symbol') symbol: string) {
    return this.marketDataService.getPrice(symbol);
  }

  @Get('ohlc/:symbol')
  async getOHLCData(
    @Param('symbol') symbol: string,
  ): Promise<OhlcCandle[]> {
    return this.marketDataService.getOHLCData(symbol);
  }

  @Get('ohlc/:symbol/:interval')
  async getOHLCDataWithInterval(
    @Param('symbol') symbol: string,
    @Param('interval') interval: string,
  ): Promise<OhlcCandle[]> {
    return this.marketDataService.getOHLCData(symbol, interval);
  }

  @Get('test/all-symbols')
  async testAllSymbols() {
    const allPrices = await this.marketDataService.getAllPrices();
    const symbols = allPrices.map(p => p.symbol);
    
    // Categorize symbols - MUST match frontend logic exactly (order matters!)
    const categorize = (sym: string): 'forex' | 'metals' | 'crypto' | 'energies' | 'stocks' | 'indices' => {
      const s = sym.toUpperCase();
      
      // Metals (check first)
      if (s.startsWith('XAU') || s.startsWith('XAG') || s.startsWith('XPT') || s.startsWith('XPD')) {
        return 'metals';
      }
      
      // Cryptocurrencies (check before stocks to avoid conflicts)
      if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP', 'DOT', 'DOGE', 'MATIC', 'LINK', 'AVAX', 'UNI'].some(c => s.includes(c))) {
        return 'crypto';
      }
      
      // Energies
      if (s.includes('OIL') || s.includes('GAS') || s.includes('CRUDE') || s.includes('BRENT') || s.includes('WTI')) {
        return 'energies';
      }
      
      // Stocks (exact match only, not substring)
      const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JPM', 'V', 'JNJ', 'WMT', 'MA', 'PG', 'DIS', 'BAC', 'XOM', 'CSCO', 'PFE', 'INTC'];
      if (stockSymbols.some(st => s === st || (s.length <= 5 && s.includes(st) && !s.includes('USD')))) {
        return 'stocks';
      }
      
      // Indices
      if (s.includes('SPX') || s.includes('NAS') || s.includes('DJI') || s.includes('DOW') || 
          s.includes('FTSE') || s.includes('UK100') || s.includes('DAX') || s.includes('GER30') || 
          s.includes('NIKKEI') || s.includes('JPN225') || s.includes('AUS200') || s.includes('ASX') ||
          s.includes('US30') || s.includes('SWI20') || s.includes('SMI') || s.includes('ESP35') || 
          s.includes('IBEX') || s.includes('FRA40') || s.includes('CAC')) {
        return 'indices';
      }
      
      // Default to Forex
      return 'forex';
    };
    
    const categories = {
      forex: symbols.filter(s => categorize(s) === 'forex'),
      metals: symbols.filter(s => categorize(s) === 'metals'),
      crypto: symbols.filter(s => categorize(s) === 'crypto'),
      energies: symbols.filter(s => categorize(s) === 'energies'),
      stocks: symbols.filter(s => categorize(s) === 'stocks'),
      indices: symbols.filter(s => categorize(s) === 'indices'),
    };

    return {
      total: symbols.length,
      categories: {
        forex: { count: categories.forex.length, symbols: categories.forex },
        metals: { count: categories.metals.length, symbols: categories.metals },
        crypto: { count: categories.crypto.length, symbols: categories.crypto },
        energies: { count: categories.energies.length, symbols: categories.energies },
        stocks: { count: categories.stocks.length, symbols: categories.stocks },
        indices: { count: categories.indices.length, symbols: categories.indices },
      },
      allSymbols: symbols.sort(),
      prices: allPrices,
      timestamp: new Date().toISOString(),
    };
  }
}
