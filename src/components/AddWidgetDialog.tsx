import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Plus, Table, BarChart3, CreditCard, Settings, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

interface AddWidgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetConfig: any) => void;
}

interface WidgetConfig {
  title: string;
  type: 'table' | 'cards' | 'chart';
  apiEndpoint: string;
  refreshInterval: number;
  fields: string[];
  customConfig?: any;
}

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({ isOpen, onClose, onAddWidget }) => {
  const [step, setStep] = useState(1);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    title: '',
    type: 'table',
    apiEndpoint: '/stock',
    refreshInterval: 60000,
    fields: [],
    customConfig: {},
  });
  
  // Get theme from store
  const { theme } = useDashboardStore();

  const widgetTypes = [
    {
      type: 'table' as const,
      name: 'Table Widget',
      description: 'Paginated list of stocks with filters and search',
      icon: Table,
      defaultFields: ['symbol', 'name', 'price', 'change', 'changePercent', 'volume'],
      availableEndpoints: ['/stock', '/industry_search'],
    },
    {
      type: 'cards' as const,
      name: 'Finance Cards',
      description: 'Watchlist, market gainers, performance data',
      icon: CreditCard,
      defaultFields: ['symbol', 'name', 'value', 'change', 'changePercent'],
      availableEndpoints: ['/trending', '/NSE_most_active', '/BSE_most_active', '/fetch_52_week_high_low_data'],
    },
    {
      type: 'chart' as const,
      name: 'Chart Widget',
      description: 'Candle or line graphs for stock prices',
      icon: BarChart3,
      defaultFields: ['date', 'open', 'high', 'low', 'close', 'volume'],
      availableEndpoints: ['/historical_data'],
    },
  ];

  const apiEndpoints = [
    { path: '/stock', description: 'Get stock data by company name', params: ['name'] },
    { path: '/trending', description: 'Get trending stocks (gainers/losers)', params: [] },
    { path: '/historical_data', description: 'Get historical price data', params: ['stock_name', 'period', 'filter'] },
    { path: '/industry_search', description: 'Search stocks by industry', params: ['query'] },
    { path: '/NSE_most_active', description: 'Most active NSE stocks', params: [] },
    { path: '/BSE_most_active', description: 'Most active BSE stocks', params: [] },
    { path: '/fetch_52_week_high_low_data', description: '52-week high/low data', params: [] },
  ];

  const refreshIntervals = [
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 1800000, label: '30 minutes' },
  ];

  const handleTypeSelect = (type: 'table' | 'cards' | 'chart') => {
    const widgetType = widgetTypes.find(w => w.type === type);
    setWidgetConfig(prev => ({
      ...prev,
      type,
      fields: widgetType?.defaultFields || [],
      apiEndpoint: widgetType?.availableEndpoints[0] || '/stock',
    }));
    setStep(2);
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddWidget = () => {
    if (!widgetConfig.title.trim()) return;

    const finalConfig = {
      title: widgetConfig.title.trim(),
      type: widgetConfig.type,
      size: { width: 2, height: 2 },
      config: {
        apiEndpoint: widgetConfig.apiEndpoint,
        refreshInterval: widgetConfig.refreshInterval,
        fields: widgetConfig.fields,
        ...getWidgetSpecificConfig(),
      },
    };

    onAddWidget(finalConfig);
    onClose();
    // Reset form
    setStep(1);
    setWidgetConfig({
      title: '',
      type: 'table',
      apiEndpoint: '/stock',
      refreshInterval: 60000,
      fields: [],
      customConfig: {},
    });
  };

  const getWidgetSpecificConfig = () => {
    switch (widgetConfig.type) {
      case 'table':
        return {
          tableConfig: {
            columns: widgetConfig.fields.map(field => ({ key: field, label: field, sortable: true })),
            pagination: { pageSize: 10, showPagination: true },
            filters: [],
            search: { enabled: true, placeholder: 'Search stocks...' },
            symbol: widgetConfig.customConfig.symbol || 'RELIANCE',
          },
        };
      case 'cards':
        return {
          cardsConfig: {
            type: 'gainers', // or 'watchlist', 'losers'
            showVolume: true,
            showChangePercent: true,
            compact: false,
          },
        };
      case 'chart':
        return {
          chartConfig: {
            symbol: widgetConfig.customConfig.symbol || 'RELIANCE',
            interval: '1yr',
            type: 'line', // or 'candlestick'
            showVolume: false,
            showMA: false,
          },
        };
      default:
        return {};
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Choose Widget Type</h3>
            <div className="grid grid-cols-1 gap-3">
              {widgetTypes.map((widgetType) => {
                const Icon = widgetType.icon;
                return (
                  <button
                    key={widgetType.type}
                    onClick={() => handleTypeSelect(widgetType.type)}
                    className="p-4 border-2 rounded-xl hover:border-orange-500 text-left transition-all duration-200"
                    style={{ 
                      borderRadius: '12px',
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: isDark ? '#7c2d12' : '#fed7aa'
                        }}
                      >
                        <Icon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {widgetType.name}
                        </div>
                        <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                          {widgetType.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Widget Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Widget Name</label>
              <Input
                value={widgetConfig.title}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter widget name"
                className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                style={{ 
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }}
              />
            </div>

            {(widgetConfig.type === 'table' || widgetConfig.type === 'chart') && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Stock Symbol</label>
                <Input
                  value={widgetConfig.customConfig.symbol || 'RELIANCE'}
                  onChange={(e) => setWidgetConfig(prev => ({ 
                    ...prev, 
                    customConfig: { ...prev.customConfig, symbol: e.target.value.toUpperCase() }
                  }))}
                  placeholder="Enter stock symbol (e.g., RELIANCE, HDFC)"
                  className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                  style={{ 
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderColor: isDark ? '#4b5563' : '#d1d5db'
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">API Endpoint</label>
              <select
                value={widgetConfig.apiEndpoint}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-gray-100"
                style={{ 
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a'
                }}
              >
                {apiEndpoints
                  .filter(endpoint => 
                    widgetTypes.find(w => w.type === widgetConfig.type)?.availableEndpoints.includes(endpoint.path)
                  )
                  .map((endpoint) => (
                    <option 
                      key={endpoint.path} 
                      value={endpoint.path}
                      style={{ 
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a'
                      }}
                    >
                      {endpoint.path} - {endpoint.description}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Refresh Interval</label>
              <select
                value={widgetConfig.refreshInterval}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-gray-100"
                style={{ 
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a'
                }}
              >
                {refreshIntervals.map((interval) => (
                  <option 
                    key={interval.value} 
                    value={interval.value}
                    style={{ 
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                  >
                    {interval.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Field Selection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the data fields you want to display in this widget
            </p>
            
            <div className="space-y-2">
              {widgetTypes
                .find(w => w.type === widgetConfig.type)
                ?.defaultFields.map((field) => (
                  <label key={field} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widgetConfig.fields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWidgetConfig(prev => ({ ...prev, fields: [...prev.fields, field] }));
                        } else {
                          setWidgetConfig(prev => ({ 
                            ...prev, 
                            fields: prev.fields.filter(f => f !== field) 
                          }));
                        }
                      }}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{field}</span>
                  </label>
                ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Review & Create</h3>
            
            <div 
              className="p-4 rounded-xl space-y-3 border"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                borderColor: isDark ? '#374151' : '#e5e7eb'
              }}
            >
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Widget Type:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{widgetTypes.find(w => w.type === widgetConfig.type)?.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{widgetConfig.title || 'Not set'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">API Endpoint:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{widgetConfig.apiEndpoint}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Refresh Interval:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                  {refreshIntervals.find(i => i.value === widgetConfig.refreshInterval)?.label}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Selected Fields:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">{widgetConfig.fields.join(', ')}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className={`w-full mx-auto ${isDark ? 'dark' : ''}`} style={{ maxWidth: '40%', minWidth: '400px' }}>
      <Card 
        className="w-full overflow-y-auto glass-card" 
        style={{ 
          border: '3px solid #f97316', 
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(249, 115, 22, 0.3)',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a'
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-500" />
              <span className="font-heading">Add New Widget</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
              style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `2px solid ${isDark ? '#374151' : '#e5e7eb'}`
              }}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </CardTitle>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  stepNum <= step 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-12 h-1 mx-2 transition-all ${
                    stepNum < step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          {renderStep()}
          
          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="flex-1"
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }}
              >
                Back
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              style={{
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                borderColor: isDark ? '#4b5563' : '#d1d5db'
              }}
            >
              Cancel
            </Button>
            {step < 4 ? (
              <Button 
                onClick={handleNext} 
                className="flex-1 border-0" 
                disabled={step === 2 && !widgetConfig.title.trim()}
                style={{
                  backgroundColor: '#f97316',
                  color: '#ffffff'
                }}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleAddWidget} 
                className="flex-1 border-0" 
                disabled={!widgetConfig.title.trim()}
                style={{
                  backgroundColor: '#f97316',
                  color: '#ffffff'
                }}
              >
                Create Widget
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
