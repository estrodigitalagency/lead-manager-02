
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableSorting } from "@/hooks/useTableSorting";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import MobileBookingsTable from "./MobileBookingsTable";
import SortableTableHead from "./SortableTableHead";
import ColumnVisibilityControls from "./ColumnVisibilityControls";

interface CalendlyBooking {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  created_at: string;
  scheduled_at: string;
  data_call?: string;
  fonte?: string;
  note?: string;
}

interface BookingsTableProps {
  bookings: CalendlyBooking[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const BookingsTable = ({ 
  bookings, 
  isLoading, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: BookingsTableProps) => {
  const isMobile = useIsMobile();
  
  const { sortedData, sortConfig, requestSort } = useTableSorting(bookings, {
    key: 'created_at',
    direction: 'desc'
  });

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility([
    { key: 'created_at', label: 'Data Creazione', visible: true },
    { key: 'data_call', label: 'Data Call', visible: true },
    { key: 'nome', label: 'Nome', visible: true },
    { key: 'cognome', label: 'Cognome', visible: true },
    { key: 'email', label: 'Email', visible: true },
    { key: 'telefono', label: 'Telefono', visible: true },
    { key: 'fonte', label: 'Fonte', visible: true },
    { key: 'note', label: 'Note', visible: true },
  ]);

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
        <span>Caricamento prenotazioni...</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileBookingsTable
        bookings={sortedData}
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

  if (bookings.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessuna prenotazione trovata.
      </div>
    );
  }

  const renderCellContent = (booking: CalendlyBooking, columnKey: string) => {
    switch (columnKey) {
      case 'created_at':
        return formatDate(booking.created_at);
      case 'data_call':
        return formatDate(booking.data_call || booking.scheduled_at);
      case 'nome':
        return booking.nome;
      case 'cognome':
        return booking.cognome || '-';
      case 'email':
        return booking.email;
      case 'telefono':
        return booking.telefono;
      case 'fonte':
        return booking.fonte || '-';
      case 'note':
        return booking.note || '-';
      default:
        return '-';
    }
  };

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
                checked={selectedItems.length === bookings.length && bookings.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectionChange(bookings.map(booking => booking.id));
                  } else {
                    onSelectionChange([]);
                  }
                }}
              />
            </TableHead>
            {visibleColumns.map((column) => (
              <SortableTableHead
                key={column.key}
                sortKey={column.key}
                sortConfig={sortConfig}
                onSort={requestSort}
                className="table-header-cell"
              >
                {column.label}
              </SortableTableHead>
            ))}
            <TableHead className="table-header-cell w-20">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(booking.id)}
                  onCheckedChange={(checked) => handleItemSelect(booking.id, !!checked)}
                />
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell key={column.key} className="table-body-cell">
                  {renderCellContent(booking, column.key)}
                </TableCell>
              ))}
              <TableCell className="table-body-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(booking.id)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100"
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

export default BookingsTable;
