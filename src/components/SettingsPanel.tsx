import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDashboardStore } from '@/lib/store';
import { validateApiKey, getErrorMessage } from '@/lib/utils';
import { X, Save, Key } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { apiConfig, setApiConfig, setError } = useDashboardStore();
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!validateApiKey(localConfig.apiKey)) {
        throw new Error('Please enter a valid API key');
      }

      // Test the API key (optional - you could make an actual API call here)
      setApiConfig(localConfig);
      onClose();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Settings
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API Provider</label>
            <select
              value={localConfig.provider}
              disabled
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
            >
              <option value="indianapi">Indian Stock API</option>
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Using Indian Stock API for real-time market data
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <Input
              type="password"
              value={localConfig.apiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              placeholder="Enter your Indian Stock API key"
            />
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Configure your Indian Stock API key to access real-time market data.
          </div>

          <div className="text-xs text-gray-600 space-y-2">
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-medium mb-1">Rate Limits:</div>
              <div>• {localConfig.rateLimit.requestsPerMinute} requests/minute</div>
              <div>• {localConfig.rateLimit.requestsPerDay} requests/day</div>
            </div>
            
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="font-medium mb-1">API Endpoint:</div>
              <div className="text-blue-600">{localConfig.baseUrl}</div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save'}
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
