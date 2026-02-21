import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  time: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  source?: string;
  url?: string;
}

export interface CalendarEvent {
  event: string;
  time: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
  currency?: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private newsCache: NewsItem[] = [];
  private calendarCache: CalendarEvent[] = [];
  private httpClient: AxiosInstance;
  private readonly NEWSAPI_KEY: string | undefined;
  private readonly ALPHA_VANTAGE_API_KEY: string | undefined;
  private readonly MARKETAUX_API_KEY: string | undefined;
  private lastNewsFetch: number = 0;
  private readonly NEWS_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes

  constructor(private configService: ConfigService) {
    // Get API keys from environment
    this.NEWSAPI_KEY = this.configService.get<string>('NEWSAPI_KEY');
    this.ALPHA_VANTAGE_API_KEY = this.configService.get<string>('ALPHA_VANTAGE_API_KEY');
    this.MARKETAUX_API_KEY = this.configService.get<string>('MARKETAUX_API_KEY');

    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'bitXtrade/1.0',
      },
    });

    // Initialize with real news fetch
    this.fetchRealNews();
    this.initializeCalendar();
    
    // Update news every 15 minutes
    setInterval(() => this.fetchRealNews(), this.NEWS_UPDATE_INTERVAL);
    // Update calendar daily
    setInterval(() => this.updateCalendar(), 86400000);
  }

  private initializeNews() {
    // Generate realistic market news based on current market conditions
    const now = new Date();
    this.newsCache = [
      {
        id: '1',
        title: 'Federal Reserve Signals Potential Shift in Rate Trajectory',
        category: 'ECONOMY',
        time: this.getTimeAgo(2),
        sentiment: 'NEUTRAL',
        description: 'The Federal Reserve has indicated a potential shift in its monetary policy trajectory, with analysts suggesting a more dovish stance in upcoming meetings. Market participants are closely monitoring inflation data and employment figures.',
        source: 'MarketWatch',
      },
      {
        id: '2',
        title: 'EUR/USD Touches Multi-Month High Amid Dollar Weakness',
        category: 'FOREX',
        time: this.getTimeAgo(4),
        sentiment: 'BULLISH',
        description: 'The EUR/USD pair has reached its highest level in three months as the US dollar continues to weaken against major currencies. European economic data has been stronger than expected.',
        source: 'Reuters',
      },
      {
        id: '3',
        title: 'Crude Oil Inventories Fall More Than Expected',
        category: 'COMMODITIES',
        time: this.getTimeAgo(6),
        sentiment: 'BULLISH',
        description: 'US crude oil inventories declined significantly more than analysts anticipated, pushing oil prices higher. Supply concerns and geopolitical tensions continue to support the commodity market.',
        source: 'Bloomberg',
      },
      {
        id: '4',
        title: 'Tech Giants Face New Regulatory Scrutiny in EU',
        category: 'EQUITIES',
        time: this.getTimeAgo(8),
        sentiment: 'BEARISH',
        description: 'Major technology companies are facing increased regulatory scrutiny in the European Union, with new antitrust measures potentially impacting their operations and profitability.',
        source: 'Financial Times',
      },
      {
        id: '5',
        title: 'Bitcoin Consolidation Continues Near Key Support Levels',
        category: 'CRYPTO',
        time: this.getTimeAgo(10),
        sentiment: 'NEUTRAL',
        description: 'Bitcoin continues to consolidate around key support levels as traders await clearer market direction. Institutional adoption and regulatory developments remain key factors.',
        source: 'CoinDesk',
      },
      {
        id: '6',
        title: 'Central Bank Policy Divergence Widens',
        category: 'ECONOMY',
        time: this.getTimeAgo(12),
        sentiment: 'NEUTRAL',
        description: 'Divergence in central bank policies across major economies is creating volatility in currency markets. Traders are adjusting positions based on interest rate expectations.',
        source: 'WSJ',
      },
      {
        id: '7',
        title: 'Gold Prices Surge on Safe-Haven Demand',
        category: 'COMMODITIES',
        time: this.getTimeAgo(14),
        sentiment: 'BULLISH',
        description: 'Gold prices have surged as investors seek safe-haven assets amid geopolitical uncertainty. The precious metal is trading near multi-month highs.',
        source: 'MarketWatch',
      },
      {
        id: '8',
        title: 'Asian Markets Open Higher Following Positive Data',
        category: 'EQUITIES',
        time: this.getTimeAgo(16),
        sentiment: 'BULLISH',
        description: 'Asian equity markets opened higher following positive economic data releases. Manufacturing and export figures exceeded expectations across the region.',
        source: 'Reuters',
      },
    ];
  }

  private initializeCalendar() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const friday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    friday.setDate(today.getDate() + daysUntilFriday);

    this.calendarCache = [
      {
        event: 'US CPI Data Release',
        time: '14:30',
        impact: 'HIGH',
        date: 'Today',
        currency: 'USD',
      },
      {
        event: 'BOE Governor Speech',
        time: '16:00',
        impact: 'MEDIUM',
        date: 'Today',
        currency: 'GBP',
      },
      {
        event: 'Crude Oil Inventories',
        time: '18:30',
        impact: 'LOW',
        date: 'Today',
        currency: 'USD',
      },
      {
        event: 'ECB Interest Rate Decision',
        time: '14:45',
        impact: 'HIGH',
        date: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
        currency: 'EUR',
      },
      {
        event: 'US Non-Farm Payrolls',
        time: '13:30',
        impact: 'HIGH',
        date: friday.toLocaleDateString('en-US', { weekday: 'long' }),
        currency: 'USD',
      },
    ];
  }

  private getTimeAgo(hours: number): string {
    return `${hours}h ago`;
  }

  private async fetchRealNews() {
    try {
      this.logger.log('Fetching real-time news from APIs...');
      
      // Try multiple news sources
      let newsItems: NewsItem[] = [];
      
      // Try MarketAux first (financial news, free tier)
      if (this.MARKETAUX_API_KEY) {
        const marketAuxItems = await this.fetchFromMarketAux();
        if (marketAuxItems && marketAuxItems.length > 0) {
          newsItems = [...newsItems, ...marketAuxItems];
        }
      }
      
      // Try NewsAPI (free tier available)
      if (this.NEWSAPI_KEY && newsItems.length < 15) {
        const newsApiItems = await this.fetchFromNewsAPI();
        if (newsApiItems && newsApiItems.length > 0) {
          newsItems = [...newsItems, ...newsApiItems];
        }
      }
      
      // Try Alpha Vantage News & Sentiment API
      if (this.ALPHA_VANTAGE_API_KEY && newsItems.length < 10) {
        const alphaVantageItems = await this.fetchFromAlphaVantage();
        if (alphaVantageItems && alphaVantageItems.length > 0) {
          newsItems = [...newsItems, ...alphaVantageItems];
        }
      }
      
      // Fallback to free NewsAPI without key (limited requests)
      if (newsItems.length === 0) {
        const freeNewsItems = await this.fetchFromFreeNewsAPI();
        if (freeNewsItems && freeNewsItems.length > 0) {
          newsItems = freeNewsItems;
        }
      }
      
      if (newsItems.length > 0) {
        // Sort by time (newest first) and limit to 50 items
        newsItems.sort((a, b) => {
          const timeA = this.parseTimeAgo(a.time);
          const timeB = this.parseTimeAgo(b.time);
          return timeB - timeA;
        });
        this.newsCache = newsItems.slice(0, 50);
        this.lastNewsFetch = Date.now();
        this.logger.log(`Successfully fetched ${this.newsCache.length} news articles`);
      } else {
        this.logger.warn('No news fetched from APIs, using fallback');
        this.initializeNews(); // Fallback to mock data
      }
    } catch (error) {
      this.logger.error(`Error fetching real news: ${error.message}`);
      // Fallback to mock data on error
      if (this.newsCache.length === 0) {
        this.initializeNews();
      }
    }
  }

  private async fetchFromNewsAPI(): Promise<NewsItem[]> {
    if (!this.NEWSAPI_KEY) return [];
    
    try {
      const categories = ['business', 'finance', 'technology'];
      const allNews: NewsItem[] = [];
      
      for (const category of categories) {
        const response = await this.httpClient.get('https://newsapi.org/v2/top-headlines', {
          params: {
            category,
            country: 'us',
            pageSize: 20,
            apiKey: this.NEWSAPI_KEY,
          },
        });
        
        if (response.data && response.data.articles) {
          const articles = response.data.articles
            .filter((article: any) => article.title && article.description)
            .map((article: any) => this.mapNewsAPIArticle(article, category));
          allNews.push(...articles);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return allNews;
    } catch (error: any) {
      this.logger.debug(`NewsAPI error: ${error.message}`);
      return [];
    }
  }

  private async fetchFromMarketAux(): Promise<NewsItem[]> {
    if (!this.MARKETAUX_API_KEY) return [];
    try {
      const response = await this.httpClient.get('https://api.marketaux.com/v1/news/all', {
        params: {
          api_token: this.MARKETAUX_API_KEY,
          language: 'en',
          limit: 30,
        },
        timeout: 10000,
      });
      if (!response.data?.data || !Array.isArray(response.data.data)) return [];
      return response.data.data
        .filter((item: any) => item.title && (item.description || item.snippet))
        .map((item: any) => this.mapMarketAuxArticle(item));
    } catch (error: any) {
      this.logger.debug(`MarketAux error: ${error.message}`);
      return [];
    }
  }

  private mapMarketAuxArticle(article: any): NewsItem {
    const title = article.title || '';
    const description = article.description || article.snippet || '';
    const publishedAt = article.published_at ? new Date(article.published_at) : new Date();
    const timeAgo = this.calculateTimeAgo(publishedAt);
    const sentimentScore = article.entities?.[0]?.sentiment_score;
    const sentiment =
      typeof sentimentScore === 'number'
        ? sentimentScore > 0.1
          ? 'BULLISH'
          : sentimentScore < -0.1
            ? 'BEARISH'
            : 'NEUTRAL'
        : this.analyzeSentiment(title, description);
    let category = 'ECONOMY';
    if (article.entities?.length) {
      const types = new Set(article.entities.map((e: any) => (e.type || '').toLowerCase()));
      if (types.has('cryptocurrency')) category = 'CRYPTO';
      else if (types.has('currency')) category = 'FOREX';
      else if (types.has('equity') || types.has('etf')) category = 'EQUITIES';
    }
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    if (titleLower.includes('forex') || titleLower.includes('eur') || titleLower.includes('usd') || descLower.includes('forex')) category = 'FOREX';
    else if (titleLower.includes('crypto') || titleLower.includes('bitcoin') || titleLower.includes('btc')) category = 'CRYPTO';
    else if (titleLower.includes('oil') || titleLower.includes('gold') || titleLower.includes('commodit')) category = 'COMMODITIES';
    return {
      id: article.uuid || `ma-${Date.now()}-${Math.random()}`,
      title,
      category,
      time: timeAgo,
      sentiment,
      description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
      source: article.source || 'MarketAux',
      url: article.url,
    };
  }

  private async fetchFromAlphaVantage(): Promise<NewsItem[]> {
    if (!this.ALPHA_VANTAGE_API_KEY) return [];
    
    try {
      const response = await this.httpClient.get('https://www.alphavantage.co/query', {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: 'FOREX:EUR,CRYPTO:BTC,STOCK:AAPL',
          limit: 50,
          apikey: this.ALPHA_VANTAGE_API_KEY,
        },
      });
      
      if (response.data && response.data.feed) {
        return response.data.feed
          .filter((item: any) => item.title && item.summary)
          .map((item: any) => this.mapAlphaVantageArticle(item));
      }
      
      return [];
    } catch (error: any) {
      this.logger.debug(`Alpha Vantage error: ${error.message}`);
      return [];
    }
  }

  private async fetchFromFreeNewsAPI(): Promise<NewsItem[]> {
    try {
      // Use NewsAPI without key (very limited, but works for testing)
      // Or use alternative free APIs
      const response = await this.httpClient.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'finance OR trading OR forex OR crypto OR stock market',
          sortBy: 'publishedAt',
          pageSize: 20,
          language: 'en',
          // Note: Without API key, this will fail, but we try anyway
        },
        timeout: 5000,
      });
      
      if (response.data && response.data.articles) {
        return response.data.articles
          .filter((article: any) => article.title && article.description)
          .map((article: any) => this.mapNewsAPIArticle(article, 'ECONOMY'));
      }
      
      return [];
    } catch (error: any) {
      // Expected to fail without API key, but we try
      this.logger.debug(`Free NewsAPI error: ${error.message}`);
      return [];
    }
  }

  private mapNewsAPIArticle(article: any, category: string): NewsItem {
    const title = article.title || '';
    const description = article.description || article.content || '';
    const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
    const timeAgo = this.calculateTimeAgo(publishedAt);
    
    // Map category
    let mappedCategory = 'ECONOMY';
    if (category === 'business' || category === 'finance') {
      mappedCategory = 'ECONOMY';
    } else if (category === 'technology') {
      mappedCategory = 'EQUITIES';
    }
    
    // Determine category from title/description
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    if (titleLower.includes('forex') || titleLower.includes('eur') || titleLower.includes('usd') || titleLower.includes('gbp')) {
      mappedCategory = 'FOREX';
    } else if (titleLower.includes('crypto') || titleLower.includes('bitcoin') || titleLower.includes('btc') || titleLower.includes('ethereum')) {
      mappedCategory = 'CRYPTO';
    } else if (titleLower.includes('oil') || titleLower.includes('gold') || titleLower.includes('commodit')) {
      mappedCategory = 'COMMODITIES';
    } else if (titleLower.includes('stock') || titleLower.includes('equity') || titleLower.includes('nasdaq') || titleLower.includes('dow')) {
      mappedCategory = 'EQUITIES';
    }
    
    return {
      id: article.url || `news-${Date.now()}-${Math.random()}`,
      title: title,
      category: mappedCategory,
      time: timeAgo,
      sentiment: this.analyzeSentiment(title, description),
      description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
      source: article.source?.name || 'NewsAPI',
      url: article.url,
    };
  }

  private mapAlphaVantageArticle(article: any): NewsItem {
    const title = article.title || '';
    const description = article.summary || '';
    const publishedAt = article.time_published ? new Date(article.time_published) : new Date();
    const timeAgo = this.calculateTimeAgo(publishedAt);
    
    // Determine category from tickers
    let category = 'ECONOMY';
    if (article.ticker_sentiment) {
      const tickers = article.ticker_sentiment.map((t: any) => t.ticker).join(' ').toUpperCase();
      if (tickers.includes('FOREX') || tickers.includes('EUR') || tickers.includes('USD')) {
        category = 'FOREX';
      } else if (tickers.includes('CRYPTO') || tickers.includes('BTC')) {
        category = 'CRYPTO';
      } else if (tickers.includes('STOCK')) {
        category = 'EQUITIES';
      }
    }
    
    return {
      id: article.url || `av-${Date.now()}-${Math.random()}`,
      title: title,
      category: category,
      time: timeAgo,
      sentiment: this.analyzeSentiment(title, description),
      description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
      source: article.source || 'Alpha Vantage',
      url: article.url,
    };
  }

  private analyzeSentiment(title: string, description: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const text = (title + ' ' + description).toLowerCase();
    
    const bullishKeywords = ['surge', 'rise', 'gain', 'up', 'higher', 'growth', 'positive', 'bullish', 'rally', 'increase', 'strong', 'beat', 'exceed'];
    const bearishKeywords = ['fall', 'drop', 'decline', 'down', 'lower', 'loss', 'negative', 'bearish', 'crash', 'decrease', 'weak', 'miss', 'below'];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    bullishKeywords.forEach(keyword => {
      if (text.includes(keyword)) bullishCount++;
    });
    
    bearishKeywords.forEach(keyword => {
      if (text.includes(keyword)) bearishCount++;
    });
    
    if (bullishCount > bearishCount + 1) return 'BULLISH';
    if (bearishCount > bullishCount + 1) return 'BEARISH';
    return 'NEUTRAL';
  }

  private calculateTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return `${days}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  private parseTimeAgo(timeAgo: string): number {
    // Parse "2h ago", "30m ago", "1d ago" to milliseconds
    const match = timeAgo.match(/(\d+)([hdm])/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 0;
    }
  }

  private updateCalendar() {
    // Update calendar with new events
    this.initializeCalendar();
  }

  getNews(category?: string): NewsItem[] {
    // If cache is empty or too old, try to fetch fresh news
    if (this.newsCache.length === 0 || (Date.now() - this.lastNewsFetch) > this.NEWS_UPDATE_INTERVAL) {
      this.fetchRealNews();
    }
    
    if (!category || category === 'ALL') {
      return this.newsCache;
    }
    return this.newsCache.filter(item => item.category === category);
  }

  getCalendar(): CalendarEvent[] {
    return this.calendarCache;
  }
}
