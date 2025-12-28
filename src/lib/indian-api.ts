import { ApiConfig, StockData, CardData, ChartData } from '@/types';

/* ===============================
   Indian Stock API Client
================================ */

class IndianStockAPI {
  private config: ApiConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 300_000; // 5 minutes (increased to reduce API calls)
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  private pendingRequests = new Map<string, Promise<any>>(); // Track in-flight requests
  private rateLimitedUntil = 0; // Track when rate limit expires
  private retryDelay = 5000; // Start with 5 second retry delay

  constructor(config: ApiConfig) {
    this.config = config;

    console.log(
      '[IndianStockAPI] Using API key:',
      config.apiKey ? config.apiKey.slice(0, 6) + '...' : '❌ NOT FOUND'
    );
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check if we're rate limited
      if (Date.now() < this.rateLimitedUntil) {
        const waitTime = this.rateLimitedUntil - Date.now();
        console.log(`[Rate Limited] Waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => 
          setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
          // Reset retry delay on success
          this.retryDelay = 5000;
        } catch (error: any) {
          console.error('Request failed:', error);
          // If rate limited, set backoff
          if (error.message?.includes('429')) {
            this.rateLimitedUntil = Date.now() + this.retryDelay;
            this.retryDelay = Math.min(this.retryDelay * 2, 60000); // Max 1 minute
            console.log(`[Rate Limited] Backing off for ${this.retryDelay}ms`);
          }
        }
        this.lastRequestTime = Date.now();
      }
    }

    this.isProcessingQueue = false;
  }

  private queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async fetchWithCache(
    endpoint: string,
    params: Record<string, string> = {}
  ) {
    const cacheKey = `${endpoint}?${new URLSearchParams(params).toString()}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached.data;
    }

    // Check if there's already a pending request for this endpoint
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`[Pending Request] Waiting for existing request: ${cacheKey}`);
      return pending;
    }

    console.log(`[Cache MISS] ${cacheKey} - Queueing request`);

    // Create the request promise and store it
    const requestPromise = this.queueRequest(async () => {
      // Check cache again in case another request filled it while we were waiting
      const cachedAfterWait = this.cache.get(cacheKey);
      if (cachedAfterWait && Date.now() - cachedAfterWait.timestamp < this.CACHE_DURATION) {
        console.log(`[Cache HIT after queue] ${cacheKey}`);
        return cachedAfterWait.data;
      }

      const url = new URL(endpoint, this.config.baseUrl);
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.append(key, value)
      );

      console.log(`[Fetching] ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: url.toString(),
          apiKeyUsed: this.config.apiKey ? this.config.apiKey.slice(0, 6) + '...' : 'NOT_FOUND'
        });
        
        // Remove from pending requests on error
        this.pendingRequests.delete(cacheKey);
        
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      console.log(`[Cached] ${cacheKey}`);
      
      // Remove from pending requests on success
      this.pendingRequests.delete(cacheKey);
      
      return data;
    });

    // Store the pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  /* ---------- Stock by name ---------- */
  async getStockData(name: string): Promise<StockData[]> {
    try {
      const data = await this.fetchWithCache('/stock', { name });
      if (!data?.currentPrice) return [];

      const price = Number(
        data.currentPrice.NSE || data.currentPrice.BSE || 0
      );

      return [
        {
          symbol: data.stockDetailsReusableData?.tickerId || name,
          name: data.companyName || name,
          price,
          change: Number(data.stockDetailsReusableData?.change || 0),
          changePercent: Number(data.percentChange || 0),
          volume: Number(data.stockDetailsReusableData?.volume || 0),
          marketCap: 0,
          high: Number(data.yearHigh || 0),
          low: Number(data.yearLow || 0),
          open: price,
          close: price,
        },
      ];
    } catch {
      return [];
    }
  }

  /* ---------- Trending ---------- */
  async getTrendingStocks(): Promise<CardData[]> {
    try {
      const data = await this.fetchWithCache('/trending');
      const result: CardData[] = [];

      data?.trending_stocks?.top_gainers?.forEach((s: any) =>
        result.push({
          symbol: s.ticker_id || '',
          name: s.company_name || '',
          value: Number(s.price || 0),
          change: Number(s.net_change || 0),
          changePercent: Number(s.percent_change || 0),
          volume: Number(s.volume || 0),
          type: 'gainer',
        })
      );

      data?.trending_stocks?.top_losers?.forEach((s: any) =>
        result.push({
          symbol: s.ticker_id || '',
          name: s.company_name || '',
          value: Number(s.price || 0),
          change: Number(s.net_change || 0),
          changePercent: Number(s.percent_change || 0),
          volume: Number(s.volume || 0),
          type: 'loser',
        })
      );

      return result;
    } catch {
      return [];
    }
  }

  /* ---------- Most active ---------- */
  async getMostActiveStocks(exchange: 'NSE' | 'BSE' = 'NSE'): Promise<CardData[]> {
    try {
      const endpoint =
        exchange === 'NSE' ? '/NSE_most_active' : '/BSE_most_active';
      const data = await this.fetchWithCache(endpoint);

      return data.map((s: any) => ({
        symbol: s.ticker || '',
        name: s.company || '',
        value: Number(s.price || 0),
        change: Number(s.net_change || 0),
        changePercent: Number(s.percent_change || 0),
        volume: Number(s.volume || 0),
        type: 'active',
      }));
    } catch {
      return [];
    }
  }

  /* ---------- Historical ---------- */
  async getHistoricalData(
    symbol: string,
    period = '1yr'
  ): Promise<ChartData[]> {
    try {
      const data = await this.fetchWithCache('/historical_data', {
        stock_name: symbol,
        period,
        filter: 'price',
      });

      if (!data?.datasets?.length) return [];

      const priceSet = data.datasets.find((d: any) => d.metric === 'Price');

      return (
        priceSet?.values?.map((v: any[]) => ({
          date: v[0],
          open: Number(v[1]),
          high: Number(v[1]),
          low: Number(v[1]),
          close: Number(v[1]),
          volume: 0,
        })) ?? []
      ).reverse();
    } catch {
      return [];
    }
  }

  clearCache() {
    console.log('[IndianStockAPI] Clearing cache...');
    this.cache.clear();
    this.pendingRequests.clear();
    this.rateLimitedUntil = 0;
    this.retryDelay = 5000;
    console.log('[IndianStockAPI] Cache cleared, rate limit reset');
  }
}

/* ===============================
   ✅ SINGLETON EXPORT (FIX)
================================ */

let client: IndianStockAPI | null = null;

export function getIndianApiClient(config: ApiConfig) {
  // Always create a new client with fresh config to ensure API key updates
  client = new IndianStockAPI(config);
  // Clear any existing cache to prevent old failed requests
  client.clearCache();
  return client;
}

/* ===============================
   MOCK DATA FOR TESTING
================================ */

export const indianMockData = {
  stockList: [
    {
      symbol: 'RELIANCE',
      name: 'Reliance Industries',
      price: 2450.50,
      change: 25.30,
      changePercent: 1.04,
      volume: 5234567,
      marketCap: 16500000000000,
      high: 2460.00,
      low: 2430.00,
      open: 2435.00,
      close: 2450.50,
    },
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      price: 3650.75,
      change: -15.25,
      changePercent: -0.42,
      volume: 2345678,
      marketCap: 13300000000000,
      high: 3670.00,
      low: 3640.00,
      open: 3665.00,
      close: 3650.75,
    },
  ],
  gainers: [
    {
      symbol: 'INFY',
      name: 'Infosys',
      value: 1450.30,
      change: 45.20,
      changePercent: 3.22,
      volume: 3456789,
      type: 'gainer',
    },
    {
      symbol: 'HDFC',
      name: 'HDFC Bank',
      value: 1650.80,
      change: 32.50,
      changePercent: 2.01,
      volume: 4567890,
      type: 'gainer',
    },
  ],
  historicalData: [
    { date: '2024-01-01', open: 2400, high: 2420, low: 2390, close: 2410, volume: 5000000 },
    { date: '2024-01-02', open: 2410, high: 2430, low: 2405, close: 2425, volume: 5200000 },
    { date: '2024-01-03', open: 2425, high: 2445, low: 2420, close: 2440, volume: 5100000 },
    { date: '2024-01-04', open: 2440, high: 2460, low: 2435, close: 2450, volume: 5300000 },
  ],
};
