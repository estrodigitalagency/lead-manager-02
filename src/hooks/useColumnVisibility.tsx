
import { useState, useCallback } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export function useColumnVisibility(initialColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);

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
