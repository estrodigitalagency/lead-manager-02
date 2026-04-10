
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import FonteDisplay from "./database/FonteDisplay";
import { useLeadStatus } from "@/hooks/useLeadStatus";

const LeadDatabase = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { getStatus } = useLeadStatus();

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

  if (isMobile) {
    return (
      <div className="space-y-3">
        {leads.map((lead) => {
          const status = getStatus(lead);
          
          return (
            <Card key={lead.id} className="border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">
                        {lead.nome} {lead.cognome || ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      {lead.booked_call === "SI" && (
                        <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                          Call Prenotata
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {lead.email && (
                      <div className="text-muted-foreground truncate">
                        📧 {lead.email}
                      </div>
                    )}
                    {lead.telefono && (
                      <div className="text-muted-foreground">
                        📞 {lead.telefono}
                      </div>
                    )}
                    {lead.fonte && (
                      <div>
                        <span className="text-xs text-muted-foreground">Fonte: </span>
                        <FonteDisplay fonte={lead.fonte} />
                      </div>
                    )}
                    {lead.lead_score && (
                      <div className="text-xs text-muted-foreground">
                        Lead Score: {lead.lead_score}
                      </div>
                    )}
                    {lead.venditore && (
                      <div className="text-xs text-muted-foreground">
                        Venditore: {lead.venditore}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

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
            <TableHead className="table-header-cell">Lead Score</TableHead>
            <TableHead className="table-header-cell">Call Prenotate</TableHead>
            <TableHead className="table-header-cell">Stato</TableHead>
            <TableHead className="table-header-cell">Venditore</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const status = getStatus(lead);
            
            return (
              <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="table-body-cell">{formatDate(lead.created_at)}</TableCell>
                <TableCell className="table-body-cell">{lead.nome}</TableCell>
                <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
                <TableCell className="table-body-cell">{lead.email}</TableCell>
                <TableCell className="table-body-cell">{lead.telefono}</TableCell>
                <TableCell className="table-body-cell">
                  <FonteDisplay fonte={lead.fonte} />
                </TableCell>
                <TableCell className="table-body-cell">
                  {lead.lead_score || '-'}
                </TableCell>
                <TableCell className="table-body-cell">
                  <Badge variant="outline" className={lead.booked_call === "SI" ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}>
                    {lead.booked_call || "NO"}
                  </Badge>
                </TableCell>
                <TableCell className="table-body-cell">
                  <Badge variant="outline" className={`text-xs ${status.className}`}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export default LeadDatabase;
