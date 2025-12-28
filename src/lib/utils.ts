import { clsx, type ClassValue } from "clsx";
import { TableColumn, StockData } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatValue(value: number, format?: 'currency' | 'percentage' | 'number' | 'text'): string {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(2)}%`;
    
    case 'number':
      return new Intl.NumberFormat('en-US').format(value);
    
    case 'text':
    default:
      return value.toString();
  }
}

export function formatChange(value: number, isPercentage = false): { value: string; className: string } {
  const formatted = formatValue(value, isPercentage ? 'percentage' : 'currency');
  const isPositive = value >= 0;
  
  return {
    value: isPositive ? `+${formatted}` : formatted,
    className: isPositive ? 'text-green-600' : 'text-red-600',
  };
}

export function sortData(data: StockData[], sortBy: string, sortOrder: 'asc' | 'desc'): StockData[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });
}

export function filterData(data: StockData[], searchTerm: string): StockData[] {
  if (!searchTerm.trim()) return data;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return data.filter(item => 
    Object.values(item).some(value => 
      value?.toString().toLowerCase().includes(lowerSearchTerm)
    )
  );
}

export function paginateData(data: StockData[], page: number, limit: number): {
  paginatedData: StockData[];
  totalPages: number;
} {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / limit);
  
  return { paginatedData, totalPages };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getColorForValue(value: number, positive: boolean = true): string {
  if (positive) {
    if (value > 2) return 'text-green-700';
    if (value > 1) return 'text-green-600';
    if (value > 0) return 'text-green-500';
  } else {
    if (value < -2) return 'text-red-700';
    if (value < -1) return 'text-red-600';
    if (value < 0) return 'text-red-500';
  }
  return 'text-gray-600';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function validateApiKey(apiKey: string): boolean {
  return apiKey && apiKey.trim().length > 0;
}

export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
}
