import React, { useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import { TableWidget } from '@/components/widgets/TableWidget';
import { CardsWidget } from '@/components/widgets/CardsWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { SettingsPanel } from '@/components/SettingsPanel';
import { WidgetConfigPanel } from '@/components/WidgetConfigPanel';
import { AddWidgetDialog } from '@/components/AddWidgetDialog';
import { ThemeProvider } from '@/components/ThemeProvider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Settings, Download, Upload, RotateCcw, Moon, Sun, Key } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-widget relative">
      {children}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 w-8 h-8 cursor-move bg-gray-200 rounded flex items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 7a2 2 0 11-4 0 2 2 0 014 0zM7 12a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0zM17 7a2 2 0 11-4 0 2 2 0 014 0zM17 12a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>
  );
};

const DashboardContent: React.FC = () => {
  const { 
    widgets, 
    theme, 
    setTheme, 
    reorderWidgets, 
    addWidget, 
    exportDashboard, 
    importDashboard, 
    resetDashboard,
    removeWidget 
  } = useDashboardStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<any>(null);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [showAddWidgetDialog, setShowAddWidgetDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex((widget) => widget.id === active.id);
      const newIndex = widgets.findIndex((widget) => widget.id === over?.id);
      
      reorderWidgets(oldIndex, newIndex);
    }
  };

  const handleAddWidget = (widgetConfig: any) => {
    addWidget(widgetConfig);
    setShowAddWidgetDialog(false);
  };

  const handleExport = () => {
    const data = exportDashboard();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finboard-dashboard.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importDashboard(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the dashboard? This will remove all widgets.')) {
      resetDashboard();
    }
  };

  const renderWidget = (widget: any) => {
    const commonProps = {
      widget,
      onDelete: () => removeWidget(widget.id),
    };

    switch (widget.type) {
      case 'table':
        return <TableWidget {...commonProps} />;
      case 'cards':
        return <CardsWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`} style={{ minHeight: '100vh', padding: '16px', backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }}>
      {/* Header - Always visible */}
      <header className="glass-card rounded-2xl shadow-lg mb-6" style={{ border: 'none', overflow: 'hidden' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '12px 20px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ minWidth: '200px' }}>
              <div>
                <h1 className="text-lg font-heading text-gradient" style={{ marginBottom: '2px', lineHeight: '1.2' }}>
                  FinBoard
                </h1>
                <p className="text-xs opacity-75" style={{ whiteSpace: 'nowrap', lineHeight: '1' }}>Finance Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddWidgetDialog(true)}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSettingsOpen(true)}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                <Key className="h-4 w-4 mr-2" />
                API Settings
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowImportDialog(true)}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="bg-transparent border-transparent hover:bg-green-500 hover:border-green-500 transition-all duration-200"
                style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#10b981'}
                onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#ffffff' : '#000000'}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Empty state when no widgets */}
      {widgets.length === 0 ? (
        <div className="max-w-7xl mx-auto" style={{ marginTop: '80px' }}>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 glass-card rounded-full flex items-center justify-center mb-4">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-heading mb-2">No widgets yet</h3>
              <p className="opacity-75 mb-6">Add your first financial widget</p>
              <Button onClick={() => setShowAddWidgetDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>
          </div>
          
          {/* Add Widget Dialog - appears in empty state */}
          {showAddWidgetDialog && (
            <AddWidgetDialog 
              isOpen={showAddWidgetDialog}
              onClose={() => setShowAddWidgetDialog(false)}
              onAddWidget={handleAddWidget}
            />
          )}
        </div>
      ) : (
        /* Main Dashboard - when widgets exist */
        <main className="max-w-7xl mx-auto" style={{ marginTop: '24px', padding: '0 16px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-wrap" style={{ gap: '24px' }}>
                {widgets.map((widget) => (
                  <SortableWidget key={widget.id} id={widget.id}>
                    <div style={{ 
                      border: '3px dotted #10b981', 
                      borderRadius: '16px',
                      padding: '0',
                      minWidth: 'fit-content',
                      overflow: 'hidden'
                    }}>
                      {renderWidget(widget)}
                    </div>
                  </SortableWidget>
                ))}
              </div>
              
              {/* Add Widget Dialog - appears after widgets */}
              {showAddWidgetDialog && (
                <div className="w-full">
                  <AddWidgetDialog 
                    isOpen={showAddWidgetDialog}
                    onClose={() => setShowAddWidgetDialog(false)}
                    onAddWidget={handleAddWidget}
                  />
                </div>
              )}
            </SortableContext>
          </DndContext>
        </main>
      )}

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WidgetConfigPanel 
        isOpen={!!editingWidget} 
        onClose={() => setEditingWidget(null)} 
        widget={editingWidget} 
      />
    </div>
  );
};
