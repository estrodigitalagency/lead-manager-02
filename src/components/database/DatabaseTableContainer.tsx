
import { ReactNode, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UploadCloud } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DatabaseFilters from "@/components/DatabaseFilters";
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

  return (
    <Card>
      <CardHeader>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <CardTitle className={isMobile ? 'text-center' : ''}>{title}</CardTitle>
            <CardDescription className={isMobile ? 'text-center' : ''}>{description}</CardDescription>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
            <DatabaseFilters 
              onApplyFilters={onApplyFilters} 
              tableName={tableName}
            />
            <Button 
              variant="outline" 
              size="sm"
              className={`flex items-center gap-1 ${isMobile ? 'w-full justify-center' : ''}`}
              onClick={onAddRecord}
            >
              <Plus className="h-4 w-4" />
              <span>Aggiungi Record</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={`flex items-center gap-1 ${isMobile ? 'w-full justify-center' : ''}`}
              onClick={onImport}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Importa CSV</span>
            </Button>
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
      
      <CardContent className={isMobile ? 'p-2' : ''}>
        {children}
      </CardContent>
    </Card>
  );
};

export default DatabaseTableContainer;
