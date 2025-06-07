
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Phone, Mail, Calendar, User, Clock } from "lucide-react";

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

interface MobileBookingsTableProps {
  bookings: CalendlyBooking[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const MobileBookingsTable = ({ 
  bookings, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: MobileBookingsTableProps) => {
  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
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
    <div className="space-y-3">
      {bookings.map((booking) => (
        <Card key={booking.id} className="border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedItems.includes(booking.id)}
                  onCheckedChange={(checked) => handleItemSelect(booking.id, !!checked)}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {booking.nome} {booking.cognome || ''}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                    Call Prenotata
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(booking.id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              {booking.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{booking.email}</span>
                </div>
              )}
              
              {booking.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{booking.telefono}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  Data Call: {formatDate(booking.data_call || booking.scheduled_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  Creata: {formatDate(booking.created_at)}
                </span>
              </div>

              {booking.fonte && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {booking.fonte.split(',').map((fonte, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {fonte.trim()}
                    </Badge>
                  ))}
                </div>
              )}

              {booking.note && (
                <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  Note: {booking.note}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MobileBookingsTable;
