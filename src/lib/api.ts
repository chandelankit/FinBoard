import { ApiConfig, StockData, CardData, ChartData } from '@/types';
import { getIndianApiClient, indianMockData } from './indian-api';

// API client factory - only supports Indian Stock API
export function getApiClient(config: ApiConfig) {
  return getIndianApiClient(config);
}

// Legacy mock data export for backward compatibility
export const mockData = indianMockData;
