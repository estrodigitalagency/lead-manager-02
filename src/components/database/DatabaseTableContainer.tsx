
import { ReactNode, useState, useCallback, useRef } from "react";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileDown, Users, UserPlus, Trash2, Search, Filter, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { deleteMultipleLeads } from "@/services/databaseService";
import { supabase } from "@/integrations/supabase/client";
import ManualAssignmentDialog from "./ManualAssignmentDialog";
import MultiSearchDialog from "./MultiSearchDialog";

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
  const currentFiltersRef = useRef<Record<string, any>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showManualAssignDialog, setShowManualAssignDialog] = useState(false);
  const [showMultiSearchDialog, setShowMultiSearchDialog] = useState(false);
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [showColumnVisibilityMenu, setShowColumnVisibilityMenu] = useState(false);

  const handleSearch = useCallback((searchTerm: string) => {
    const newFilters = { ...currentFiltersRef.current, search: searchTerm || undefined };
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key] === undefined) delete newFilters[key];
    });
    currentFiltersRef.current = newFilters;
    setCurrentFilters(newFilters);
    onApplyFilters(newFilters);
  }, [onApplyFilters]);

  const handleAdvancedFilters = useCallback((filters: Record<string, any>) => {
    const searchFromCurrent = currentFiltersRef.current?.search;
    const newFilters = {
      ...filters,
      ...(searchFromCurrent && { search: searchFromCurrent })
    };
    currentFiltersRef.current = newFilters;
    setCurrentFilters(newFilters);
    onApplyFilters(newFilters);
  }, [onApplyFilters]);

  const handleExportCSV = async () => {
    console.log('Export CSV triggered');
    console.log('Selected items:', selectedItems);
    
    if (selectedItems.length === 0) {
      toast.error("Nessun elemento selezionato per l'esportazione");
      return;
    }
    
    let selectedData: any[] = [];
    
    // If allItems is empty (e.g. for server-paginated lead_generation), fetch from DB
    if (allItems.length === 0) {
      try {
        // Fetch in batches of 100 to handle large selections
        const batchSize = 100;
        for (let i = 0; i < selectedItems.length; i += batchSize) {
          const batch = selectedItems.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .in('id', batch);
          if (error) throw error;
          if (data) selectedData.push(...data);
        }
      } catch (error) {
        console.error('Error fetching selected data:', error);
        toast.error("Errore nel recupero dei dati selezionati");
        return;
      }
    } else {
      selectedData = allItems.filter(item => selectedItems.includes(item.id));
    }
    
    if (selectedData.length === 0) {
      toast.error("Nessun dato trovato per l'esportazione");
      return;
    }

    try {
      // Ottieni le chiavi dal primo elemento, escludendo 'id'
      const headers = Object.keys(selectedData[0]).filter(key => key !== 'id');
      console.log('Headers:', headers);
      
      const csvContent = [
        headers.join(','),
        ...selectedData.map(item => 
          headers.map(header => {
            let value = item[header];
            // Handle null/undefined values
            if (value === null || value === undefined) {
              value = '';
            }
            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
          }).join(',')
        )
      ].join('\n');

      console.log('CSV content generated, length:', csvContent.length);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
      console.log('Download filename:', a.download);
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('CSV export completed successfully');
      toast.success(`${selectedItems.length} record esportati con successo`);
    } catch (error) {
      console.error('Error during CSV export:', error);
      toast.error("Errore durante l'esportazione del CSV");
    }
  };

  const handleBulkAssign = async () => {
    if (tableName !== 'lead_generation' || selectedItems.length === 0) {
      toast.error("Nessun lead selezionato");
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('lead_generation')
        .update({ 
          assignable: true,
          venditore: null,      // Rimuove il venditore
          stato: 'nuovo',       // Reimposta lo stato a nuovo
          data_assegnazione: null // Rimuove la data di assegnazione
        })
        .in('id', selectedItems);

      if (error) throw error;

      toast.success(`${selectedItems.length} lead resi assegnabili e venditori rimossi`);
      onRefresh();
    } catch (error) {
      console.error("Errore durante l'aggiornamento:", error);
      toast.error("Errore durante l'aggiornamento dei lead");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkMakeUnassignable = async () => {
    if (tableName !== 'lead_generation' || selectedItems.length === 0) {
      toast.error("Nessun lead selezionato");
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('lead_generation')
        .update({ 
          manually_not_assignable: true
        })
        .in('id', selectedItems);

      if (error) throw error;

      toast.success(`${selectedItems.length} lead resi non assegnabili`);
      onSelectionChange([]);
      onRefresh();
    } catch (error) {
      console.error("Errore durante l'aggiornamento:", error);
      toast.error("Errore durante l'aggiornamento dei lead");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleManualAssignment = () => {
    if (selectedItems.length === 0) {
      toast.error("Nessun elemento selezionato per l'assegnazione");
      return;
    }
    setShowManualAssignDialog(true);
  };

  const handleAssignmentComplete = () => {
    onSelectionChange([]);
    onRefresh();
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

  const handleMultiSearchComplete = (selectedIds: string[]) => {
    // Aggiungi i nuovi ID selezionati a quelli esistenti, evitando duplicati
    const newSelection = [...new Set([...selectedItems, ...selectedIds])];
    onSelectionChange(newSelection);
  };

  return (
    <Card>
      <CardHeader>
        <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-4' : ''}`}>
          <div>
            <CardTitle className={isMobile ? 'text-center' : ''}>{title}</CardTitle>
            <CardDescription className={isMobile ? 'text-center' : ''}>{description}</CardDescription>
          </div>
          
          {/* Riga unificata con ricerca e menu azioni */}
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap justify-center' : ''}`}>
            <SearchInput onSearch={handleSearch} />
            
            {/* Menu dropdown con tutte le azioni */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 w-56 bg-background">
                <DropdownMenuLabel>Azioni Tabella</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Filtri e visualizzazione */}
                <DropdownMenuItem onClick={() => setShowFiltersDialog(true)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri Avanzati
                </DropdownMenuItem>
                
                {columns && onToggleColumn && (
                  <DropdownMenuItem 
                    onClick={() => setShowColumnVisibilityMenu(!showColumnVisibilityMenu)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visibilità Colonne
                  </DropdownMenuItem>
                )}
                
                {tableName === 'lead_generation' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowMultiSearchDialog(true)}>
                      <Search className="h-4 w-4 mr-2" />
                      Ricerca Multipla
                    </DropdownMenuItem>
                  </>
                )}
                
                {/* Azioni bulk se ci sono elementi selezionati */}
                {selectedItems.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      Azioni Multiple ({selectedItems.length} selezionati)
                    </DropdownMenuLabel>
                    
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Esporta CSV
                    </DropdownMenuItem>
                    
                    {tableName === 'lead_generation' && (
                      <>
                        <DropdownMenuItem 
                          onClick={handleBulkAssign}
                          disabled={isAssigning}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {isAssigning ? "Aggiornamento..." : "Rendi Assegnabili"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleBulkMakeUnassignable}
                          disabled={isAssigning}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          {isAssigning ? "Aggiornamento..." : "Rendi Non Assegnabile"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleManualAssignment}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assegna Manualmente
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleBulkDelete}
                      disabled={isDeleting}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Eliminazione..." : "Elimina"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Dialog per filtri senza button trigger */}
          <DatabaseFiltersResponsive 
            open={showFiltersDialog}
            onOpenChange={setShowFiltersDialog}
            onApplyFilters={handleAdvancedFilters} 
            tableName={tableName}
            hideButton={true}
          />
          
          {showColumnVisibilityMenu && columns && onToggleColumn && (
            <div className="absolute top-full right-0 mt-2 z-50">
              <ColumnVisibilityControls
                columns={columns}
                onToggleColumn={onToggleColumn}
              />
            </div>
          )}
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

      <ManualAssignmentDialog
        open={showManualAssignDialog}
        onOpenChange={setShowManualAssignDialog}
        selectedLeadIds={selectedItems}
        onAssignmentComplete={handleAssignmentComplete}
      />

      <MultiSearchDialog
        open={showMultiSearchDialog}
        onOpenChange={setShowMultiSearchDialog}
        onItemsSelected={handleMultiSearchComplete}
      />
    </Card>
  );
};

export default DatabaseTableContainer;
