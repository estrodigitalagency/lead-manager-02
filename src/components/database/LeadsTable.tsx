
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useColumnVisibility, ColumnConfig } from "@/hooks/useColumnVisibility";
import MobileLeadsTable from "./MobileLeadsTable";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "./PaginationControls";
import LeadTableHeader from "./LeadTableHeader";
import LeadTableRow from "./LeadTableRow";
import LeadTableControls from "./LeadTableControls";

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
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
  { key: 'note', label: 'Note', visible: true },
];

const LeadsTable = ({ 
  leads, 
  isLoading, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: LeadsTableProps) => {
  const isMobile = useIsMobile();
  const { sortedData, sortConfig, requestSort } = useTableSorting(leads);
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(initialColumns);
  
  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex
  } = usePagination({ data: sortedData, initialPageSize: 50 });

  // Fix: Funzione corretta per gestire la selezione di un singolo item
  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(selectedId => selectedId !== id));
    }
  };

  // Fix: Funzione corretta per gestire la selezione di tutti gli item della pagina
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedData.map(lead => lead.id!);
      onSelectionChange([...new Set([...selectedItems, ...currentPageIds])]);
    } else {
      const currentPageIds = paginatedData.map(lead => lead.id!);
      onSelectionChange(selectedItems.filter(id => !currentPageIds.includes(id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span>Caricamento lead...</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <MobileLeadsTable
          leads={paginatedData}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
          onDelete={onDelete}
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
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead trovato.
      </div>
    );
  }

  // Fix: Calcolare correttamente se tutti gli item della pagina corrente sono selezionati
  const currentPageIds = paginatedData.map(lead => lead.id!);
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
          {paginatedData.map((lead) => (
            <LeadTableRow
              key={lead.id}
              lead={lead}
              isSelected={selectedItems.includes(lead.id!)}
              visibleColumns={visibleColumnKeys}
              onSelect={handleItemSelect}
              onDelete={onDelete}
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
    </div>
  );
};

export default LeadsTable;
