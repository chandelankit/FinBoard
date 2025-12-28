import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDashboardStore } from '@/lib/store';
import { getApiClient, mockData } from '@/lib/api';
import { formatValue } from '@/lib/utils';
import { Settings, Trash2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface ChartWidgetProps {
  widget: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, onEdit, onDelete }) => {
  const { apiConfig, theme } = useDashboardStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const config = widget.config.chartConfig;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') {
          // Use mock data if no API key
          setData(mockData.historicalData);
        } else {
          const api = getApiClient(apiConfig);
          const result = await api.getHistoricalData(config.symbol || 'RELIANCE', config.interval || '1yr');
          setData(result);
        }
      } catch (err) {
        setError('Failed to fetch chart data');
        // Fallback to mock data
        setData(mockData.historicalData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up refresh interval
    const interval = setInterval(fetchData, config.refreshInterval || 300000);
    
    return () => clearInterval(interval);
  }, [apiConfig, config.symbol, config.interval, config.refreshInterval]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    const isDark = theme === 'dark';
    
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 border rounded-lg shadow-lg ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
          <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value, 'currency')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#ffffff' : '#000000';
    
    if (config.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: textColor }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: textColor }}
              tickFormatter={(value) => formatValue(value, 'currency')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (config.type === 'candlestick') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: textColor }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: textColor }}
              tickFormatter={(value) => formatValue(value, 'currency')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="high" 
              fill="#10b981"
            />
            <Bar 
              dataKey="low" 
              fill="#ef4444"
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading">{widget.title}</span>
            <span className="text-sm opacity-75 font-normal">
              ({config.symbol})
            </span>
          </div>
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
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Interval: {config.interval}</span>
          <span>Type: {config.type}</span>
          {data.length > 0 && (
            <span>Updated: {new Date().toLocaleTimeString()}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!apiConfig.apiKey || apiConfig.apiKey.trim() === '' ? (
          <div className="text-center py-8">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-blue-700 font-medium mb-2">API Key Required</div>
              <div className="text-blue-600 text-sm">
                Click "API Settings" in the header to configure your Indian Stock API key for real-time data.
              </div>
              <div className="text-blue-500 text-xs mt-2">
                Currently showing demo data
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        ) : null}
        
        {data.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No chart data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
