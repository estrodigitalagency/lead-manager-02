
import { useState, useCallback, useEffect } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const STORAGE_KEY = 'lead-table-column-visibility';

export function useColumnVisibility(initialColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Try to load saved preferences from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedPreferences = JSON.parse(saved);
        // Merge saved preferences with initial columns
        return initialColumns.map(col => ({
          ...col,
          visible: savedPreferences[col.key] !== undefined ? savedPreferences[col.key] : col.visible
        }));
      }
    } catch (error) {
      console.warn('Failed to load column visibility preferences:', error);
    }
    return initialColumns;
  });

  // Save preferences to localStorage whenever columns change
  useEffect(() => {
    try {
      const preferences = columns.reduce((acc, col) => {
        acc[col.key] = col.visible;
        return acc;
      }, {} as Record<string, boolean>);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save column visibility preferences:', error);
    }
  }, [columns]);

  const toggleColumn = useCallback((key: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const visibleColumns = columns.filter(col => col.visible);

  return { columns, visibleColumns, toggleColumn };
}
