
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface CalendlyBooking {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  created_at: string;
  scheduled_at: string;
  fonte?: string;
  note?: string;
}

interface BookingsTableProps {
  bookings: CalendlyBooking[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

const BookingsTable = ({ bookings, isLoading, onDelete }: BookingsTableProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFonte = (fonte: string | null | undefined) => {
    if (!fonte) return '-';
    // Split by comma and display each source as a separate badge
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <span>Caricamento in corso...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Cognome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Data Chiamata</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{formatDate(booking.created_at)}</TableCell>
                <TableCell>{booking.nome}</TableCell>
                <TableCell>{booking.cognome || '-'}</TableCell>
                <TableCell>{booking.email}</TableCell>
                <TableCell>{booking.telefono}</TableCell>
                <TableCell>{formatFonte(booking.fonte)}</TableCell>
                <TableCell>{booking.scheduled_at ? formatDate(booking.scheduled_at) : '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(booking.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                Nessuna prenotazione trovata
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BookingsTable;
