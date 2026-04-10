
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
import { LeadLavorato } from "@/types/leadLavorato";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useColumnVisibility, ColumnConfig } from "@/hooks/useColumnVisibility";
import SortableTableHead from "./SortableTableHead";
import ColumnVisibilityControls from "./ColumnVisibilityControls";
import MobileLavoratiTable from "./MobileLavoratiTable";

interface LeadLavoratiTableProps {
  leadLavorati: LeadLavorato[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const initialColumns: ColumnConfig[] = [
  { key: 'data_contatto', label: 'Data Contatto', visible: true },
  { key: 'data_call', label: 'Data Call', visible: true },
  { key: 'nome', label: 'Nome', visible: true },
  { key: 'cognome', label: 'Cognome', visible: true },
  { key: 'email', label: 'Email', visible: true },
  { key: 'telefono', label: 'Telefono', visible: true },
  { key: 'venditore', label: 'Venditore', visible: true },
  { key: 'esito', label: 'Esito', visible: true },
  { key: 'obiezioni', label: 'Obiezioni', visible: true },
];

const LeadLavoratiTable = ({ 
  leadLavorati, 
  isLoading, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: LeadLavoratiTableProps) => {
  const isMobile = useIsMobile();
  const { sortedData, sortConfig, requestSort } = useTableSorting(leadLavorati);
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(initialColumns);

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span>Caricamento lead lavorati...</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileLavoratiTable
        leadLavorati={sortedData}
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
        onDelete={onDelete}
      />
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

  const getEsitoBadge = (esito: string | null) => {
    if (!esito) return <span>-</span>;
    
    const esitoLower = esito.toLowerCase();
    let className = "";
    
    if (esitoLower.includes('vendita') || esitoLower.includes('chiuso')) {
      className = "bg-green-500/15 text-green-400 border-green-500/30";
    } else if (esitoLower.includes('interessato') || esitoLower.includes('ricontattare')) {
      className = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    } else if (esitoLower.includes('non interessato') || esitoLower.includes('rifiutato')) {
      className = "bg-destructive/10 text-destructive border-destructive/30";
    } else {
      className = "bg-muted text-muted-foreground border-border";
    }
    
    return (
      <Badge variant="outline" className={className}>
        {esito}
      </Badge>
    );
  };

  if (leadLavorati.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead lavorato trovato.
      </div>
    );
  }

  const isColumnVisible = (key: string) => visibleColumns.some(col => col.key === key);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
                checked={selectedItems.length === leadLavorati.length && leadLavorati.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectionChange(leadLavorati.map(lead => lead.id!));
                  } else {
                    onSelectionChange([]);
                  }
                }}
              />
            </TableHead>
            {isColumnVisible('data_contatto') && (
              <SortableTableHead
                sortKey="data_contatto"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Data Contatto
              </SortableTableHead>
            )}
            {isColumnVisible('data_call') && (
              <SortableTableHead
                sortKey="data_call"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Data Call
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
            {isColumnVisible('esito') && (
              <SortableTableHead
                sortKey="esito"
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                Esito
              </SortableTableHead>
            )}
            {isColumnVisible('obiezioni') && (
              <TableHead className="table-header-cell">Obiezioni</TableHead>
            )}
            <TableHead className="table-header-cell w-20">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((lead) => (
            <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(lead.id!)}
                  onCheckedChange={(checked) => handleItemSelect(lead.id!, !!checked)}
                />
              </TableCell>
              {isColumnVisible('data_contatto') && (
                <TableCell className="table-body-cell">
                  {lead.data_contatto ? formatDate(lead.data_contatto) : '-'}
                </TableCell>
              )}
              {isColumnVisible('data_call') && (
                <TableCell className="table-body-cell">
                  {lead.data_call ? formatDate(lead.data_call) : '-'}
                </TableCell>
              )}
              {isColumnVisible('nome') && (
                <TableCell className="table-body-cell">{lead.nome}</TableCell>
              )}
              {isColumnVisible('cognome') && (
                <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
              )}
              {isColumnVisible('email') && (
                <TableCell className="table-body-cell">{lead.email || '-'}</TableCell>
              )}
              {isColumnVisible('telefono') && (
                <TableCell className="table-body-cell">{lead.telefono || '-'}</TableCell>
              )}
              {isColumnVisible('venditore') && (
                <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
              )}
              {isColumnVisible('esito') && (
                <TableCell className="table-body-cell">{getEsitoBadge(lead.esito)}</TableCell>
              )}
              {isColumnVisible('obiezioni') && (
                <TableCell className="table-body-cell">{lead.obiezioni || '-'}</TableCell>
              )}
              <TableCell className="table-body-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(lead.id!)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadLavoratiTable;
