import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDashboardStore } from '@/lib/store';
import { getApiClient, mockData } from '@/lib/api';
import { formatValue, sortData, paginateData } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Settings, Trash2 } from 'lucide-react';

interface TableWidgetProps {
  widget: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ widget, onEdit, onDelete }) => {
  const { setApiConfig, apiConfig } = useDashboardStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const config = widget.config?.tableConfig || {};
  const { columns = [], pagination = {}, filters = {} } = config;

  // Fetch data with staggered loading
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') {
          // Use mock data if no API key
          setData(mockData.stockList);
        } else {
          const api = getApiClient(apiConfig);
          // Use the symbol from widget config or default to first available stock
          const symbol = config.symbol || 'RELIANCE';
          const stocks = await api.getStockData(symbol);
          setData(stocks);
        }
      } catch (err) {
        setError('Failed to fetch data');
        // Fallback to mock data
        setData(mockData.stockList);
      } finally {
        setLoading(false);
      }
    };

    // Stagger initial load to prevent simultaneous requests
    const staggerDelay = Math.random() * 5000; // Random delay 0-5 seconds (increased)
    const initialTimeout = setTimeout(fetchData, staggerDelay);
    
    // Set up refresh interval
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [config.symbol, apiConfig.apiKey, apiConfig._updatedAt]);

  // Process data
  const processedData = useMemo(() => {
    let result = data;
    
    // Apply sorting
    result = sortData(result, filters.sortBy, filters.sortOrder);
    
    return result;
  }, [data, filters]);

  // Pagination
  const { paginatedData, totalPages } = useMemo(() => {
    const limit = pagination.limit || pagination.pageSize || 10;
    
    // Temporarily bypass pagination to test
    if (processedData.length <= 10) {
      return { paginatedData: processedData, totalPages: 1 };
    }
    
    const result = paginateData(processedData, currentPage, limit);
    return result;
  }, [processedData, currentPage, pagination]);

  // Update pagination info
  useEffect(() => {
    const total = processedData.length;
    if (pagination.total !== total) {
      useDashboardStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          tableConfig: {
            ...config,
            pagination: { ...pagination, total },
          },
        },
      });
    }
  }, [processedData.length, pagination.total]);

  const handleSort = (columnKey: string) => {
    const newSortOrder = filters.sortBy === columnKey && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    useDashboardStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        tableConfig: {
          ...config,
          filters: { ...filters, sortBy: columnKey, sortOrder: newSortOrder },
        },
      },
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    useDashboardStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        tableConfig: {
          ...config,
          pagination: { ...pagination, page },
        },
      },
    });
  };

  if (loading && data.length === 0) {
    return (
      <Card className="glass-card" style={{ border: 'none', width: 'fit-content', minWidth: '400px', borderRadius: '16px', overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{widget.title}</span>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card" style={{ border: 'none', width: 'fit-content', minWidth: '400px', borderRadius: '16px', overflow: 'hidden' }}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="font-heading">{widget.title}</span>
          <div className="flex gap-2">
            {onDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this widget?')) {
                    onDelete();
                  }
                }}
                className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 border-0"
                style={{pointerEvents: 'auto', backgroundColor: '#ef4444'}}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!apiConfig.apiKey || apiConfig.apiKey.trim() === '' ? (
          <div className="text-center py-8">
            <div className="mb-4 p-4 glass-card">
              <div className="font-medium mb-2">API Key Required</div>
              <div className="text-sm opacity-75">
                Configure your Indian Stock API key for real-time data
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 glass-card">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 opacity-75">
            No data available
          </div>
        ) : null}
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((column: any) => (
                  <th
                    key={column.key}
                    className="text-left p-2 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        <div className="flex flex-col">
                          {filters.sortBy === column.key ? (
                            filters.sortOrder === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  {columns.map((column: any) => (
                    <td key={column.key} className="p-2">
                      {column.key === 'change' || column.key === 'changePercent' ? (
                        <span className={row[column.key] >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatValue(row[column.key], column.format)}
                        </span>
                      ) : (
                        formatValue(row[column.key], column.format)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(currentPage * pagination.limit, processedData.length)} of{' '}
              {processedData.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
