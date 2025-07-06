
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SortConfig } from "@/hooks/useTableSorting";
import SortableTableHead from "./SortableTableHead";

interface LeadTableHeaderProps {
  visibleColumns: string[];
  sortConfig: SortConfig | null;
  allCurrentPageSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSort: (key: string) => void;
}

const LeadTableHeader = ({ 
  visibleColumns, 
  sortConfig, 
  allCurrentPageSelected, 
  onSelectAll, 
  onSort 
}: LeadTableHeaderProps) => {
  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox
            checked={allCurrentPageSelected}
            onCheckedChange={onSelectAll}
          />
        </TableHead>
        {isColumnVisible('data') && (
          <SortableTableHead
            sortKey="created_at"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Data
          </SortableTableHead>
        )}
        {isColumnVisible('nome') && (
          <SortableTableHead
            sortKey="nome"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Nome
          </SortableTableHead>
        )}
        {isColumnVisible('cognome') && (
          <SortableTableHead
            sortKey="cognome"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Cognome
          </SortableTableHead>
        )}
        {isColumnVisible('email') && (
          <SortableTableHead
            sortKey="email"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Email
          </SortableTableHead>
        )}
        {isColumnVisible('telefono') && (
          <SortableTableHead
            sortKey="telefono"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Telefono
          </SortableTableHead>
        )}
        {isColumnVisible('fonte') && (
          <TableHead className="table-header-cell">Fonte</TableHead>
        )}
        {isColumnVisible('lead_score') && (
          <SortableTableHead
            sortKey="lead_score"
            sortConfig={sortConfig}
            onSort={onSort}
            className="table-header-cell"
          >
            Lead Score
          </SortableTableHead>
        )}
        {isColumnVisible('booked_call') && (
          <SortableTableHead
            sortKey="booked_call"
            sortConfig={sortConfig}
            onSort={onSort}
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
            onSort={onSort}
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
  );
};

export default LeadTableHeader;
