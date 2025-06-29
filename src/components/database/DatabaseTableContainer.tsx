import { ReactNode, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import DatabaseFiltersResponsive from "@/components/DatabaseFiltersResponsive";
import SearchInput from "./SearchInput";
import BulkActions from "./BulkActions";
import ColumnVisibilityControls from "./ColumnVisibilityControls";
import { ColumnConfig } from "@/hooks/useColumnVisibility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileDown, Users, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMultipleLeads } from "@/services/databaseService";

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
  columns?: ColumnConfig[];
  onToggleColumn?: (key: string) => void;
  onBulkAction?: (action: string) => void;
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
  children,
  columns,
  onToggleColumn,
  onBulkAction
}: DatabaseTableContainerProps) => {
  const isMobile = useIsMobile();
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearch = (searchTerm: string) => {
    console.log('Search term:', searchTerm);
    
    const newFilters = {
      ...currentFilters,
      search: searchTerm || undefined
    };
    
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
      ...(currentFilters.search && { search: currentFilters.search })
    };
    
    setCurrentFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return;
    
    const selectedData = allItems.filter(item => selectedItems.includes(item.id));
    const headers = Object.keys(selectedData[0]).filter(key => key !== 'id');
    const csvContent = [
      headers.join(','),
      ...selectedData.map(item => 
        headers.map(header => `"${item[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      toast.error("Nessun elemento selezionato per l'eliminazione");
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare ${selectedItems.length} record selezionati? Questa azione non può essere annullata.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMultipleLeads(tableName, selectedItems);
      toast.success(`${selectedItems.length} record eliminati con successo`);
      onSelectionChange([]);
      onRefresh();
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      toast.error(`Errore durante l'eliminazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <CardTitle className={isMobile ? 'text-center' : ''}>{title}</CardTitle>
            <CardDescription className={isMobile ? 'text-center' : ''}>{description}</CardDescription>
          </div>
          
          {/* Riga unificata con tutti i controlli */}
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap justify-center' : ''}`}>
            <DatabaseFiltersResponsive 
              onApplyFilters={handleAdvancedFilters} 
              tableName={tableName}
            />
            
            {columns && onToggleColumn && (
              <ColumnVisibilityControls
                columns={columns}
                onToggleColumn={onToggleColumn}
              />
            )}
            
            <SearchInput onSearch={handleSearch} />
            
            {selectedItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Esporta CSV
                  </DropdownMenuItem>
                  {tableName === 'lead_generation' && (
                    <>
                      <DropdownMenuItem onClick={() => onBulkAction?.('make_assignable')}>
                        <Users className="h-4 w-4 mr-2" />
                        Rendi Assegnabili
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBulkAction?.('manual_assign')}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assegna Manualmente
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Eliminazione..." : "Elimina"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
