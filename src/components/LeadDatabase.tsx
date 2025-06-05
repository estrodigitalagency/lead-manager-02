
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
import { Badge } from "@/components/ui/badge";

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
            <TableHead className="table-header-cell">Fonte</TableHead>
            <TableHead className="table-header-cell">Call Prenotate</TableHead>
            <TableHead className="table-header-cell">Stato</TableHead>
            <TableHead className="table-header-cell">Venditore</TableHead>
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
              <TableCell className="table-body-cell">{formatFonte(lead.fonte)}</TableCell>
              <TableCell className="table-body-cell">
                <Badge variant="outline" className={lead.booked_call === "SI" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                  {lead.booked_call || "NO"}
                </Badge>
              </TableCell>
              <TableCell className="table-body-cell">
                {getStatusBadge(lead)}
              </TableCell>
              <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
              <TableCell className="table-body-cell">{lead.note || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default LeadDatabase;
