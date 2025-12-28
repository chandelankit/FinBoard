import { ApiConfig, StockData, CardData, ChartData } from '@/types';

// Indian Stock API client
export class IndianStockAPI {
  private config: ApiConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds to ensure fresh data

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async fetchWithCache(endpoint: string, params: Record<string, string> = {}) {
    const cacheKey = `${endpoint}?${new URLSearchParams(params).toString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const url = new URL(endpoint, this.config.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log('Making API request to:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      console.error('Request URL:', url.toString());
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // Get stock data by name
  async getStockData(name: string): Promise<StockData[]> {
    try {
      const data = await this.fetchWithCache('/stock', { name });
      
      // Transform API response to StockData format
      if (!data || !data.currentPrice) {
        console.log('No currentPrice data found:', data);
        return [];
      }

      const price = parseFloat(data.currentPrice.NSE || data.currentPrice.BSE || '0');
      const change = parseFloat(data.stockDetailsReusableData?.change || '0');
      const changePercent = parseFloat(data.percentChange || '0');

      const stockData = {
        symbol: data.stockDetailsReusableData?.tickerId || name,
        name: data.companyName || name,
        price,
        change,
        changePercent,
        volume: parseInt(data.stockDetailsReusableData?.volume || '0'),
        marketCap: 0, // API doesn't provide this directly
        high: parseFloat(data.yearHigh || '0'),
        low: parseFloat(data.yearLow || '0'),
        open: price, // Not provided in response
        close: price,
      };

      console.log('Transformed stock data:', stockData);
      return [stockData];
    } catch (error) {
      console.error('Error fetching stock data:', error);
      return [];
    }
  }

  // Get trending stocks (gainers and losers)
  async getTrendingStocks(): Promise<CardData[]> {
    try {
      const data = await this.fetchWithCache('/trending');
      const cardData: CardData[] = [];

      // Process top gainers
      if (data.trending_stocks?.top_gainers) {
        data.trending_stocks.top_gainers.forEach((stock: any) => {
          cardData.push({
            symbol: stock.ticker_id || '',
            name: stock.company_name || '',
            value: parseFloat(stock.price || '0'),
            change: parseFloat(stock.net_change || '0'),
            changePercent: parseFloat(stock.percent_change || '0'),
            volume: parseInt(stock.volume || '0'),
            type: 'gainer',
          });
        });
      }

      // Process top losers
      if (data.trending_stocks?.top_losers) {
        data.trending_stocks.top_losers.forEach((stock: any) => {
          cardData.push({
            symbol: stock.ticker_id || '',
            name: stock.company_name || '',
            value: parseFloat(stock.price || '0'),
            change: parseFloat(stock.net_change || '0'),
            changePercent: parseFloat(stock.percent_change || '0'),
            volume: parseInt(stock.volume || '0'),
            type: 'loser',
          });
        });
      }

      return cardData;
    } catch (error) {
      console.error('Error fetching trending stocks:', error);
      return [];
    }
  }

  // Get most active stocks
  async getMostActiveStocks(exchange: 'NSE' | 'BSE' = 'NSE'): Promise<CardData[]> {
    try {
      const endpoint = exchange === 'NSE' ? '/NSE_most_active' : '/BSE_most_active';
      const data = await this.fetchWithCache(endpoint);

      return data.map((stock: any) => ({
        symbol: stock.ticker || '',
        name: stock.company || '',
        value: parseFloat(stock.price || '0'),
        change: parseFloat(stock.net_change || '0'),
        changePercent: parseFloat(stock.percent_change || '0'),
        volume: parseInt(stock.volume || '0'),
        type: 'active',
      }));
    } catch (error) {
      console.error('Error fetching most active stocks:', error);
      return [];
    }
  }

  // Get historical data for charts
  async getHistoricalData(symbol: string, period: string = '1yr'): Promise<ChartData[]> {
    try {
      console.log('Fetching historical data for:', symbol, 'period:', period);
      
      const data = await this.fetchWithCache('/historical_data', {
        stock_name: symbol,
        period,
        filter: 'price',
      });

      console.log('Historical data response:', data);

      const chartData: ChartData[] = [];
      
      if (data.datasets && data.datasets.length > 0) {
        const priceDataset = data.datasets.find((d: any) => d.metric === 'Price');
        if (priceDataset && priceDataset.values) {
          priceDataset.values.forEach((value: any[]) => {
            if (value.length >= 2) {
              chartData.push({
                date: value[0],
                open: parseFloat(value[1]) || 0,
                high: parseFloat(value[1]) || 0,
                low: parseFloat(value[1]) || 0,
                close: parseFloat(value[1]) || 0,
                volume: 0,
              });
            }
          });
        }
      } else if (data.data && Array.isArray(data.data)) {
        // Alternative response format
        data.data.forEach((item: any) => {
          chartData.push({
            date: item.date || item.timestamp,
            open: parseFloat(item.open || item.price || '0'),
            high: parseFloat(item.high || item.price || '0'),
            low: parseFloat(item.low || item.price || '0'),
            close: parseFloat(item.close || item.price || '0'),
            volume: parseInt(item.volume || '0'),
          });
        });
      }

      console.log('Transformed chart data:', chartData);
      return chartData.reverse(); // Reverse to show oldest to newest
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  // Get 52 week high/low data
  async get52WeekData(): Promise<CardData[]> {
    try {
      const data = await this.fetchWithCache('/fetch_52_week_high_low_data');
      const cardData: CardData[] = [];

      // Process NSE data
      if (data.NSE_52WeekHighLow) {
        if (data.NSE_52WeekHighLow.high52Week) {
          data.NSE_52WeekHighLow.high52Week.forEach((stock: any) => {
            cardData.push({
              symbol: stock.ticker || '',
              name: stock.company || '',
              value: parseFloat(stock.price || '0'),
              change: 0,
              changePercent: 0,
              volume: 0,
              type: 'high',
              metadata: {
                week52High: parseFloat(stock['52_week_high'] || '0'),
              },
            });
          });
        }

        if (data.NSE_52WeekHighLow.low52Week) {
          data.NSE_52WeekHighLow.low52Week.forEach((stock: any) => {
            cardData.push({
              symbol: stock.ticker || '',
              name: stock.company || '',
              value: parseFloat(stock.price || '0'),
              change: 0,
              changePercent: 0,
              volume: 0,
              type: 'low',
              metadata: {
                week52Low: parseFloat(stock['52_week_low'] || '0'),
              },
            });
          });
        }
      }

      return cardData;
    } catch (error) {
      console.error('Error fetching 52 week data:', error);
      return [];
    }
  }

  // Search stocks by industry
  async searchByIndustry(query: string): Promise<StockData[]> {
    try {
      const data = await this.fetchWithCache('/industry_search', { query });

      return data.map((stock: any) => ({
        symbol: stock.exchangeCodeNsi || stock.exchangeCodeBse || '',
        name: stock.commonName || '',
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0,
        high: 0,
        low: 0,
        open: 0,
        close: 0,
      }));
    } catch (error) {
      console.error('Error searching by industry:', error);
      return [];
    }
  }

  // Clear cache manually (useful for testing)
  clearCache(): void {
    this.cache.clear();
    console.log('API cache cleared');
  }
}

// Factory function to create API client
export const getIndianApiClient = (config: ApiConfig) => {
  return new IndianStockAPI(config);
};

// Mock data for fallback
export const indianMockData = {
  stockList: [
    {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      price: 2200.50,
      change: 15.45,
      changePercent: 0.70,
      volume: 12000000,
      marketCap: 0,
      high: 2300.00,
      low: 1800.00,
      open: 2185.05,
      close: 2185.05,
    },
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      price: 3500.25,
      change: -25.75,
      changePercent: -0.73,
      volume: 8500000,
      marketCap: 0,
      high: 3600.00,
      low: 3400.00,
      open: 3526.00,
      close: 3526.00,
    },
    {
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      price: 1650.80,
      change: 8.30,
      changePercent: 0.51,
      volume: 6200000,
      marketCap: 0,
      high: 1700.00,
      low: 1600.00,
      open: 1642.50,
      close: 1642.50,
    },
    {
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      price: 1450.60,
      change: 12.40,
      changePercent: 0.86,
      volume: 4800000,
      marketCap: 0,
      high: 1500.00,
      low: 1400.00,
      open: 1438.20,
      close: 1438.20,
    },
    {
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      price: 450.75,
      change: -5.25,
      changePercent: -1.15,
      volume: 9800000,
      marketCap: 0,
      high: 480.00,
      low: 440.00,
      open: 456.00,
      close: 456.00,
    },
  ],
  gainers: [
    {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      value: 2200.50,
      change: 15.45,
      changePercent: 0.70,
      volume: 12000000,
      type: 'gainer',
    },
    {
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      value: 1450.60,
      change: 12.40,
      changePercent: 0.86,
      volume: 4800000,
      type: 'gainer',
    },
    {
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      value: 1650.80,
      change: 8.30,
      changePercent: 0.51,
      volume: 6200000,
      type: 'gainer',
    },
  ],
  losers: [
    {
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      value: 3500.25,
      change: -25.75,
      changePercent: -0.73,
      volume: 8500000,
      type: 'loser',
    },
    {
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      value: 450.75,
      change: -5.25,
      changePercent: -1.15,
      volume: 9800000,
      type: 'loser',
    },
  ],
  historicalData: [
    {
      date: '2024-01-01',
      open: 2100.00,
      high: 2150.00,
      low: 2080.00,
      close: 2145.00,
      volume: 10000000,
    },
    {
      date: '2024-01-02',
      open: 2145.00,
      high: 2180.00,
      low: 2130.00,
      close: 2175.00,
      volume: 9500000,
    },
    {
      date: '2024-01-03',
      open: 2175.00,
      high: 2200.00,
      low: 2160.00,
      close: 2195.00,
      volume: 11000000,
    },
  ],
};
