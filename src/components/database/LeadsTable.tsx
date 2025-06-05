
import { Lead } from "@/types/lead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

const LeadsTable = ({ leads, isLoading, onDelete }: LeadsTableProps) => {
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

  const formatFonte = (fonte: string | null) => {
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
            <TableHead>Campagna</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Venditore</TableHead>
            <TableHead>Call Prenotate</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length > 0 ? (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{formatDate(lead.created_at)}</TableCell>
                <TableCell>{lead.nome}</TableCell>
                <TableCell>{lead.cognome || '-'}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.telefono}</TableCell>
                <TableCell>{formatFonte(lead.fonte)}</TableCell>
                <TableCell>{lead.campagna || '-'}</TableCell>
                <TableCell>
                  {lead.assignable ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Assegnabile
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      Non assegnabile
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{lead.venditore || '-'}</TableCell>
                <TableCell>{lead.booked_call}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(lead.id as string)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8">
                Nessun lead trovato
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
