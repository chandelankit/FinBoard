import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDashboardStore } from '@/lib/store';
import { X, Save } from 'lucide-react';

interface WidgetConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  widget: any;
}

export const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({ 
  isOpen, 
  onClose, 
  widget 
}) => {
  const { updateWidget } = useDashboardStore();
  const [localConfig, setLocalConfig] = useState(widget);

  const handleSave = () => {
    updateWidget(widget.id, localConfig);
    onClose();
  };

  const handleTitleChange = (title: string) => {
    setLocalConfig({ ...localConfig, title });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Configure Widget</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Widget Title</label>
            <Input
              value={localConfig.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter widget title"
            />
          </div>

          {widget.type === 'chart' && (
            <div>
              <label className="block text-sm font-medium mb-2">Stock Symbol</label>
              <Input
                value={localConfig.config.chartConfig?.symbol || ''}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  config: {
                    ...localConfig.config,
                    chartConfig: {
                      ...localConfig.config.chartConfig,
                      symbol: e.target.value.toUpperCase()
                    }
                  }
                })}
                placeholder="e.g., AAPL"
              />
            </div>
          )}

          {widget.type === 'chart' && (
            <div>
              <label className="block text-sm font-medium mb-2">Chart Type</label>
              <select
                value={localConfig.config.chartConfig?.type || 'line'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  config: {
                    ...localConfig.config,
                    chartConfig: {
                      ...localConfig.config.chartConfig,
                      type: e.target.value
                    }
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="line">Line Chart</option>
                <option value="candlestick">Candlestick</option>
              </select>
            </div>
          )}

          {widget.type === 'chart' && (
            <div>
              <label className="block text-sm font-medium mb-2">Interval</label>
              <select
                value={localConfig.config.chartConfig?.interval || 'daily'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  config: {
                    ...localConfig.config,
                    chartConfig: {
                      ...localConfig.config.chartConfig,
                      interval: e.target.value
                    }
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {widget.type === 'cards' && (
            <div>
              <label className="block text-sm font-medium mb-2">Cards Type</label>
              <select
                value={localConfig.config.cardsConfig?.type || 'gainers'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  config: {
                    ...localConfig.config,
                    cardsConfig: {
                      ...localConfig.config.cardsConfig,
                      type: e.target.value
                    }
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="gainers">Market Gainers</option>
                <option value="watchlist">Watchlist</option>
                <option value="performance">Performance</option>
                <option value="financial">Financial Data</option>
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
