
import { LeadLavorato } from "@/types/leadLavorato";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface LeadLavoratiTableProps {
  leadLavorati: LeadLavorato[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

const LeadLavoratiTable = ({ leadLavorati, isLoading, onDelete }: LeadLavoratiTableProps) => {
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
            <TableHead>Venditore</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Cognome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Esito</TableHead>
            <TableHead>Obiezioni</TableHead>
            <TableHead>Data Contatto</TableHead>
            <TableHead>Data Call</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadLavorati.length > 0 ? (
            leadLavorati.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.venditore || '-'}</TableCell>
                <TableCell>{lead.nome}</TableCell>
                <TableCell>{lead.cognome || '-'}</TableCell>
                <TableCell>{lead.email || '-'}</TableCell>
                <TableCell>{lead.telefono || '-'}</TableCell>
                <TableCell>{lead.esito || '-'}</TableCell>
                <TableCell>{lead.obiezioni || '-'}</TableCell>
                <TableCell>{lead.data_contatto ? formatDate(lead.data_contatto) : '-'}</TableCell>
                <TableCell>{lead.data_call ? formatDate(lead.data_call) : '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                Nessun lead lavorato trovato
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadLavoratiTable;
