
import { ReactNode, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import DatabaseFiltersResponsive from "@/components/DatabaseFiltersResponsive";
import SearchInput from "./SearchInput";
import BulkActions from "./BulkActions";

interface DatabaseTableContainerProps {
  title: string;
  description: string;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
  allItems: any[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onApplyFilters: (filters: Record<string, any>) => void;
  onAddRecord: () => void;
  onImport: () => void;
  onRefresh: () => void;
  children: ReactNode;
}

const DatabaseTableContainer = ({
  title,
  description,
  tableName,
  allItems,
  selectedItems,
  onSelectionChange,
  onApplyFilters,
  onAddRecord,
  onImport,
  onRefresh,
  children
}: DatabaseTableContainerProps) => {
  const isMobile = useIsMobile();
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});

  const handleSearch = (searchTerm: string) => {
    console.log('Search term:', searchTerm);
    
    const newFilters = {
      ...currentFilters,
      search: searchTerm || undefined // Remove search if empty
    };
    
    // Remove undefined values
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key] === undefined) {
        delete newFilters[key];
      }
    });
    
    setCurrentFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleAdvancedFilters = (filters: Record<string, any>) => {
    console.log('Advanced filters:', filters);
    
    const newFilters = {
      ...filters,
      // Preserve search if it exists
      ...(currentFilters.search && { search: currentFilters.search })
    };
    
    setCurrentFilters(newFilters);
    onApplyFilters(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <CardTitle className={isMobile ? 'text-center' : ''}>{title}</CardTitle>
            <CardDescription className={isMobile ? 'text-center' : ''}>{description}</CardDescription>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
            <DatabaseFiltersResponsive 
              onApplyFilters={handleAdvancedFilters} 
              tableName={tableName}
            />
            <SearchInput onSearch={handleSearch} />
          </div>
        </div>
      </CardHeader>
      
      <BulkActions
        selectedItems={selectedItems}
        allItems={allItems}
        tableName={tableName}
        onSelectionChange={onSelectionChange}
        onRefresh={onRefresh}
      />
      
      <CardContent className={isMobile ? 'p-2 overflow-x-auto' : 'overflow-x-auto'}>
        <div className="min-w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseTableContainer;
