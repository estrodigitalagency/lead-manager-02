
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { getUnassignedLeads } from "@/services/databaseService";
import { Lead } from "@/types/lead";

const LeadDatabase = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true);
      try {
        const data = await getUnassignedLeads();
        setLeads(data);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span>Caricamento lead...</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead disponibile.
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

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header-cell">Data</TableHead>
            <TableHead className="table-header-cell">Nome</TableHead>
            <TableHead className="table-header-cell">Cognome</TableHead>
            <TableHead className="table-header-cell">Email</TableHead>
            <TableHead className="table-header-cell">Telefono</TableHead>
            <TableHead className="table-header-cell">Chiamata Prenotata</TableHead>
            <TableHead className="table-header-cell">Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="table-body-cell">{formatDate(lead.created_at)}</TableCell>
              <TableCell className="table-body-cell">{lead.nome}</TableCell>
              <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
              <TableCell className="table-body-cell">{lead.email}</TableCell>
              <TableCell className="table-body-cell">{lead.telefono}</TableCell>
              <TableCell className="table-body-cell">
                <span className={lead.booked_call === "SI" ? "text-primary" : "text-muted-foreground"}>
                  {lead.booked_call}
                </span>
              </TableCell>
              <TableCell className="table-body-cell">{lead.note || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default LeadDatabase;
