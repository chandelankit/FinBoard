export interface Widget {
  id: string;
  type: 'table' | 'cards' | 'chart';
  title: string;
  config: WidgetConfig;
  position: number;
  size: WidgetSize;
}

export interface WidgetConfig {
  tableConfig?: TableConfig;
  cardsConfig?: CardsConfig;
  chartConfig?: ChartConfig;
}

export interface TableConfig {
  data: StockData[];
  columns: TableColumn[];
  pagination: PaginationConfig;
  filters: FilterConfig;
}

export interface CardsConfig {
  type: 'watchlist' | 'gainers' | 'performance' | 'financial';
  data: CardData[];
  refreshInterval: number;
}

export interface ChartConfig {
  type: 'candlestick' | 'line';
  interval: 'daily' | 'weekly' | 'monthly';
  symbol: string;
  data: ChartData[];
  refreshInterval: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  format?: 'currency' | 'percentage' | 'number' | 'text';
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

export interface FilterConfig {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  [key: string]: any;
}

export interface CardData {
  symbol: string;
  name: string;
  value: number;
  change?: number;
  changePercent?: number;
  [key: string]: any;
}

export interface ChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ApiResponse {
  data: any;
  timestamp: number;
  cached: boolean;
}

export interface DashboardState {
  widgets: Widget[];
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
}

export interface ApiConfig {
  provider: 'indianapi';
  apiKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  _updatedAt?: number; // Timestamp to track when config was last updated
}
