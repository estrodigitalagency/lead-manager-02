
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
import MobileBookingsTable from "./MobileBookingsTable";

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
        bookings={bookings}
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

  return (
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
          <TableHead className="table-header-cell">Data Creazione</TableHead>
          <TableHead className="table-header-cell">Data Call</TableHead>
          <TableHead className="table-header-cell">Nome</TableHead>
          <TableHead className="table-header-cell">Cognome</TableHead>
          <TableHead className="table-header-cell">Email</TableHead>
          <TableHead className="table-header-cell">Telefono</TableHead>
          <TableHead className="table-header-cell">Fonte</TableHead>
          <TableHead className="table-header-cell">Note</TableHead>
          <TableHead className="table-header-cell w-20">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
            <TableCell>
              <Checkbox
                checked={selectedItems.includes(booking.id)}
                onCheckedChange={(checked) => handleItemSelect(booking.id, !!checked)}
              />
            </TableCell>
            <TableCell className="table-body-cell">{formatDate(booking.created_at)}</TableCell>
            <TableCell className="table-body-cell">{formatDate(booking.data_call || booking.scheduled_at)}</TableCell>
            <TableCell className="table-body-cell">{booking.nome}</TableCell>
            <TableCell className="table-body-cell">{booking.cognome || '-'}</TableCell>
            <TableCell className="table-body-cell">{booking.email}</TableCell>
            <TableCell className="table-body-cell">{booking.telefono}</TableCell>
            <TableCell className="table-body-cell">{booking.fonte || '-'}</TableCell>
            <TableCell className="table-body-cell">{booking.note || '-'}</TableCell>
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
  );
};

export default BookingsTable;
