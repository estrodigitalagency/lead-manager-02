import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useColumnVisibility, ColumnConfig } from "@/hooks/useColumnVisibility";
import SortableTableHead from "./SortableTableHead";
import ColumnVisibilityControls from "./ColumnVisibilityControls";
import MobileLeadsTable from "./MobileLeadsTable";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "./PaginationControls";

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

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...new Set([...selectedItems, ...paginatedData.map(lead => lead.id!)])]);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFonte = (fonte: string | null) => {
    if (!fonte) return '-';
    const fonti = fonte.split(',').map(f => f.trim()).filter(f => f);
    if (fonti.length === 0) return '-';
    
    return (
      <div className="flex flex-wrap gap-1">
        {fonti.map((f, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {f}
          </Badge>
        ))}
      </div>
    );
  };

  const getStatusBadge = (lead: Lead) => {
    if (lead.venditore) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          Assegnato
        </Badge>
      );
    } else if (lead.assignable) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          Assegnabile
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Non assegnabile
        </Badge>
      );
    }
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead trovato.
      </div>
    );
  }

  const isColumnVisible = (key: string) => visibleColumns.some(col => col.key === key);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Totale: {totalItems} lead
        </div>
        <ColumnVisibilityControls
          columns={columns}
          onToggleColumn={toggleColumn}
        />
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectionChange([...new Set([...selectedItems, ...paginatedData.map(lead => lead.id!)])]);
                  } else {
                    const currentPageIds = paginatedData.map(lead => lead.id!);
                    onSelectionChange(selectedItems.filter(id => !currentPageIds.includes(id)));
                  }
                }}
              />
            </TableHead>
            {isColumnVisible('data') && (
              <SortableTableHead
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Data
              </SortableTableHead>
            )}
            {isColumnVisible('nome') && (
              <SortableTableHead
                sortKey="nome"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Nome
              </SortableTableHead>
            )}
            {isColumnVisible('cognome') && (
              <SortableTableHead
                sortKey="cognome"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Cognome
              </SortableTableHead>
            )}
            {isColumnVisible('email') && (
              <SortableTableHead
                sortKey="email"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Email
              </SortableTableHead>
            )}
            {isColumnVisible('telefono') && (
              <SortableTableHead
                sortKey="telefono"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Telefono
              </SortableTableHead>
            )}
            {isColumnVisible('fonte') && (
              <TableHead className="table-header-cell">Fonte</TableHead>
            )}
            {isColumnVisible('booked_call') && (
              <SortableTableHead
                sortKey="booked_call"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Call Prenotate
              </SortableTableHead>
            )}
            {isColumnVisible('stato') && (
              <TableHead className="table-header-cell">Stato</TableHead>
            )}
            {isColumnVisible('venditore') && (
              <SortableTableHead
                sortKey="venditore"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Venditore
              </SortableTableHead>
            )}
            {isColumnVisible('note') && (
              <TableHead className="table-header-cell">Note</TableHead>
            )}
            <TableHead className="table-header-cell w-20">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((lead) => (
            <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(lead.id!)}
                  onCheckedChange={(checked) => handleItemSelect(lead.id!, !!checked)}
                />
              </TableCell>
              {isColumnVisible('data') && (
                <TableCell className="table-body-cell">{formatDate(lead.created_at)}</TableCell>
              )}
              {isColumnVisible('nome') && (
                <TableCell className="table-body-cell">{lead.nome}</TableCell>
              )}
              {isColumnVisible('cognome') && (
                <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
              )}
              {isColumnVisible('email') && (
                <TableCell className="table-body-cell">{lead.email}</TableCell>
              )}
              {isColumnVisible('telefono') && (
                <TableCell className="table-body-cell">{lead.telefono}</TableCell>
              )}
              {isColumnVisible('fonte') && (
                <TableCell className="table-body-cell">{formatFonte(lead.fonte)}</TableCell>
              )}
              {isColumnVisible('booked_call') && (
                <TableCell className="table-body-cell">
                  <Badge variant="outline" className={lead.booked_call === "SI" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                    {lead.booked_call || "NO"}
                  </Badge>
                </TableCell>
              )}
              {isColumnVisible('stato') && (
                <TableCell className="table-body-cell">
                  {getStatusBadge(lead)}
                </TableCell>
              )}
              {isColumnVisible('venditore') && (
                <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
              )}
              {isColumnVisible('note') && (
                <TableCell className="table-body-cell">{lead.note || '-'}</TableCell>
              )}
              <TableCell className="table-body-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(lead.id!)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
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
