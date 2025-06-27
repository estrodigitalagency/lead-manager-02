
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useColumnVisibility, ColumnConfig } from "@/hooks/useColumnVisibility";
import { useServerPagination } from "@/hooks/useServerPagination";
import MobileLeadsTable from "./MobileLeadsTable";
import PaginationControls from "./PaginationControls";
import LeadTableHeader from "./LeadTableHeader";
import LeadTableRow from "./LeadTableRow";
import LeadTableControls from "./LeadTableControls";
import LeadDetailsDialog from "./LeadDetailsDialog";

interface LeadsTableProps {
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
  filters?: Record<string, any>;
}

const initialColumns: ColumnConfig[] = [
  { key: 'data', label: 'Data', visible: true },
  { key: 'nome', label: 'Nome', visible: true },
  { key: 'cognome', label: 'Cognome', visible: true },
  { key: 'email', label: 'Email', visible: true },
  { key: 'telefono', label: 'Telefono', visible: true },
  { key: 'fonte', label: 'Fonte', visible: true },
  { key: 'booked_call', label: 'Call Prenotate', visible: true },
  { key: 'stato', label: 'Stato', visible: true },
  { key: 'venditore', label: 'Venditore', visible: true },
];

const LeadsTable = ({ 
  selectedItems, 
  onSelectionChange, 
  onDelete,
  filters = {}
}: LeadsTableProps) => {
  const isMobile = useIsMobile();
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(initialColumns);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Usa la paginazione server-side
  const {
    data: leads,
    isLoading,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    refetch
  } = useServerPagination<Lead>({ 
    tableName: 'lead_generation',
    initialPageSize: 50,
    filters
  });

  // Sorting locale sui dati della pagina corrente
  const { sortedData, sortConfig, requestSort } = useTableSorting(leads);

  // Reset selezioni quando cambiano i filtri
  useEffect(() => {
    onSelectionChange([]);
  }, [JSON.stringify(filters), onSelectionChange]);

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = sortedData.map(lead => lead.id!);
      onSelectionChange([...new Set([...selectedItems, ...currentPageIds])]);
    } else {
      const currentPageIds = sortedData.map(lead => lead.id!);
      onSelectionChange(selectedItems.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleShowDetails = (lead: Lead) => {
    setSelectedLeadForDetails(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    // Ricarica i dati dopo l'eliminazione
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span>Caricamento lead...</span>
      </div>
    );
  }

  if (leads.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        {Object.keys(filters).length > 0 ? 'Nessun lead trovato con i filtri attuali.' : 'Nessun lead trovato.'}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4 w-full">
        <MobileLeadsTable
          leads={sortedData}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
          onDelete={handleDelete}
          onShowDetails={handleShowDetails}
        />
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
        />
        
        <LeadDetailsDialog
          lead={selectedLeadForDetails}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
      </div>
    );
  }

  const currentPageIds = sortedData.map(lead => lead.id!);
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedItems.includes(id));
  const visibleColumnKeys = visibleColumns.map(col => col.key);

  return (
    <div className="space-y-4">
      <LeadTableControls
        totalItems={totalItems}
        columns={columns}
        onToggleColumn={toggleColumn}
      />
      
      <Table>
        <LeadTableHeader
          visibleColumns={visibleColumnKeys}
          sortConfig={sortConfig}
          allCurrentPageSelected={allCurrentPageSelected}
          onSelectAll={handleSelectAll}
          onSort={requestSort}
        />
        <TableBody>
          {sortedData.map((lead) => (
            <LeadTableRow
              key={lead.id}
              lead={lead}
              isSelected={selectedItems.includes(lead.id!)}
              visibleColumns={visibleColumnKeys}
              onSelect={handleItemSelect}
              onDelete={handleDelete}
              onShowDetails={handleShowDetails}
            />
          ))}
        </TableBody>
      </Table>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        startIndex={startIndex}
        endIndex={endIndex}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        onNextPage={nextPage}
        onPreviousPage={previousPage}
      />

      <LeadDetailsDialog
        lead={selectedLeadForDetails}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  );
};

export default LeadsTable;
