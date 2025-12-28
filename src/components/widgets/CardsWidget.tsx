import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDashboardStore } from '@/lib/store';
import { getApiClient, mockData } from '@/lib/api';
import { formatValue, formatChange, filterData, debounce } from '@/lib/utils';
import { Settings, Trash2, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';

interface CardsWidgetProps {
  widget: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CardsWidget: React.FC<CardsWidgetProps> = ({ widget, onEdit, onDelete }) => {
  const { apiConfig } = useDashboardStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const config = widget.config.cardsConfig;

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      console.log('Cards search term:', term);
      setSearchTerm(term);
    }, 300),
    []
  );

  // Process data
  const processedData = useMemo(() => {
    let result = data;
    
    // Apply search filter
    result = filterData(result, searchTerm);
    console.log('Cards data filtered:', result.length, 'items from', data.length, 'original items');
    
    // Apply type filter
    if (filterType === 'gainers') {
      result = result.filter(item => (item.change || 0) > 0);
    } else if (filterType === 'losers') {
      result = result.filter(item => (item.change || 0) < 0);
    }
    
    return result;
  }, [data, searchTerm, filterType]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') {
          // Use mock data if no API key
          setData(mockData.gainers);
        } else {
          const api = getApiClient(apiConfig);
          let result;
          
          switch (config.type) {
            case 'gainers':
              result = await api.getTrendingStocks();
              break;
            case 'watchlist':
              result = await api.getMostActiveStocks(); // Use most active as watchlist
              break;
            default:
              result = mockData.gainers;
          }
          
          setData(result);
        }
      } catch (err) {
        setError('Failed to fetch data');
        // Fallback to mock data
        setData(mockData.gainers);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up refresh interval
    const interval = setInterval(fetchData, config.refreshInterval || 60000);
    
    return () => clearInterval(interval);
  }, [apiConfig, config.type, config.refreshInterval]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading && data.length === 0) {
    return (
      <Card className="h-full">
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
    <Card className="h-full glass-card">
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
                style={{ backgroundColor: '#ef4444' }}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>
        </CardTitle>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
            <Input
              placeholder="Search stocks..."
              className="pl-10 glass-card text-white placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-400"
              style={{ color: 'white' }}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <select 
            className="glass-card text-white px-3 py-2 rounded-md border border-gray-600 dark:text-white dark:border-gray-600"
            style={{ color: 'white', backgroundColor: 'rgba(30, 41, 59, 0.95)' }}
            onChange={(e) => setFilterType(e.target.value)}
            value={filterType}
          >
            <option value="all" style={{ color: 'white', backgroundColor: '#1e293b' }}>All</option>
            <option value="gainers" style={{ color: 'white', backgroundColor: '#1e293b' }}>Gainers</option>
            <option value="losers" style={{ color: 'white', backgroundColor: '#1e293b' }}>Losers</option>
          </select>
        </div>
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
        ) : null}
        
        <div className="space-y-3">
          {processedData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.symbol}</span>
                  {getTrendIcon(item.change || 0)}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {item.name}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium text-sm">
                  {formatValue(item.value, 'currency')}
                </div>
                {item.change !== undefined && (
                  <div className={`text-xs ${getTrendColor(item.change)}`}>
                    {formatChange(item.change).value}
                  </div>
                )}
                {item.changePercent !== undefined && (
                  <div className={`text-xs ${getTrendColor(item.changePercent)}`}>
                    {formatChange(item.changePercent, true).value}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
