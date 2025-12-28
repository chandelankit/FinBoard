import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Widget, DashboardState, ApiConfig } from '@/types';

interface DashboardStore extends DashboardState {
  // Widget actions
  addWidget: (widget: Omit<Widget, 'id' | 'position'>) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  
  // Dashboard actions
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // API configuration
  apiConfig: ApiConfig;
  setApiConfig: (config: Partial<ApiConfig>) => void;
  
  // Export/Import
  exportDashboard: () => string;
  importDashboard: (json: string) => void;
  resetDashboard: () => void;
}

const defaultApiConfig: ApiConfig = {
  provider: 'indianapi',
  apiKey: 'sk-live-kV2waWVc9z3oUzWaxvu5JWYU1gv9eYIcvtj9uHO9',
  baseUrl: 'https://stock.indianapi.in',
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerDay: 1000,
  },
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Initial state - start with empty widgets
      widgets: [],
      theme: 'dark',
      isLoading: false,
      error: null,
      apiConfig: defaultApiConfig,

      // Widget actions
      addWidget: (widget) => {
        const newWidget: Widget = {
          ...widget,
          id: Date.now().toString(),
          position: get().widgets.length,
        };
        set((state) => ({
          widgets: [...state.widgets, newWidget],
        }));
      },

      removeWidget: (id) => {
        set((state) => {
          const filteredWidgets = state.widgets.filter((w) => w.id !== id);
          const reorderedWidgets = filteredWidgets.map((widget, index) => ({
            ...widget,
            position: index,
          }));
          return { widgets: reorderedWidgets };
        });
      },

      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, ...updates } : widget
          ),
        }));
      },

      reorderWidgets: (fromIndex, toIndex) => {
        set((state) => {
          const widgets = [...state.widgets];
          const [movedWidget] = widgets.splice(fromIndex, 1);
          widgets.splice(toIndex, 0, movedWidget);
          
          const reorderedWidgets = widgets.map((widget, index) => ({
            ...widget,
            position: index,
          }));
          
          return { widgets: reorderedWidgets };
        });
      },

      // Dashboard actions
      setTheme: (theme) => set({ theme }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // API configuration
      setApiConfig: (config) => {
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        }));
      },

      // Export/Import
      exportDashboard: () => {
        const state = get();
        return JSON.stringify({
          widgets: state.widgets,
          theme: state.theme,
          apiConfig: state.apiConfig,
        });
      },

      importDashboard: (json) => {
        try {
          const data = JSON.parse(json);
          set({
            widgets: data.widgets || [],
            theme: data.theme || 'light',
            apiConfig: { ...defaultApiConfig, ...data.apiConfig },
          });
        } catch (error) {
          set({ error: 'Invalid dashboard configuration' });
        }
      },

      resetDashboard: () => {
        set({
          widgets: [],
          theme: 'light',
          error: null,
        });
      },
    }),
    {
      name: 'finboard-dashboard-v2',
      partialize: (state) => ({
        widgets: state.widgets,
        theme: state.theme,
        apiConfig: state.apiConfig,
      }),
    }
  )
);
