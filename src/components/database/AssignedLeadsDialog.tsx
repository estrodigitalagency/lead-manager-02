import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface AssignedLead {
  id: string;
  created_at: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  venditore: string;
  campagna?: string;
  fonte?: string;
  lead_score?: string;
  data_assegnazione?: string;
}

interface AssignedLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentRecord: {
    id: string;
    assigned_at: string;
    venditore: string;
    campagna?: string | null;
    fonti_escluse?: string[] | null;
    fonti_incluse?: string[] | null;
    exclude_from_included?: string[] | null;
    leads_count: number;
  } | null;
}

const AssignedLeadsDialog = ({ open, onOpenChange, assignmentRecord }: AssignedLeadsDialogProps) => {
  const [leads, setLeads] = useState<AssignedLead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && assignmentRecord) {
      loadAssignedLeads();
    }
  }, [open, assignmentRecord]);

  const loadAssignedLeads = async () => {
    if (!assignmentRecord) return;

    setLoading(true);
    try {
      // Create a time window around the assignment time (±5 minutes)
      const assignedTime = new Date(assignmentRecord.assigned_at);
      const startTime = new Date(assignedTime.getTime() - 5 * 60 * 1000);
      const endTime = new Date(assignedTime.getTime() + 5 * 60 * 1000);

      let query = supabase
        .from('lead_generation')
        .select('*')
        .eq('venditore', assignmentRecord.venditore)
        .gte('data_assegnazione', startTime.toISOString())
        .lte('data_assegnazione', endTime.toISOString());

      // Apply campaign filter if present
      if (assignmentRecord.campagna) {
        query = query.eq('campagna', assignmentRecord.campagna);
      }

      const { data, error } = await query.order('data_assegnazione', { ascending: false });

      if (error) {
        console.error('Error loading assigned leads:', error);
      } else {
        // Apply source filters if present
        let filteredData = data || [];
        
        if (assignmentRecord.fonti_incluse && assignmentRecord.fonti_incluse.length > 0) {
          filteredData = filteredData.filter(lead => 
            assignmentRecord.fonti_incluse!.includes(lead.fonte || '')
          );
          
          // Apply exclude_from_included if present
          if (assignmentRecord.exclude_from_included && assignmentRecord.exclude_from_included.length > 0) {
            filteredData = filteredData.filter(lead => 
              !assignmentRecord.exclude_from_included!.includes(lead.fonte || '')
            );
          }
        } else if (assignmentRecord.fonti_escluse && assignmentRecord.fonti_escluse.length > 0) {
          // Exclude mode
          filteredData = filteredData.filter(lead => 
            !assignmentRecord.fonti_escluse!.includes(lead.fonte || '')
          );
        }

        setLeads(filteredData);
      }
    } catch (error) {
      console.error('Error loading assigned leads:', error);
    } finally {
      setLoading(false);
    }
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Lead Assegnati - {assignmentRecord?.venditore}
            {assignmentRecord && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatDate(assignmentRecord.assigned_at)})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Caricamento lead...</span>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            {leads.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nessun lead trovato per questa assegnazione.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Campagna</TableHead>
                    <TableHead>Lead Score</TableHead>
                    <TableHead>Data Assegnazione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.nome} {lead.cognome}
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.telefono}</TableCell>
                      <TableCell>
                        {lead.fonte && (
                          <Badge variant="outline">{lead.fonte}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.campagna && (
                          <Badge variant="secondary">{lead.campagna}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.lead_score && (
                          <Badge variant={lead.lead_score === 'HOT' ? 'destructive' : 'default'}>
                            {lead.lead_score}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.data_assegnazione && formatDate(lead.data_assegnazione)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {leads.length} lead trovati
          </span>
          <span className="text-sm text-muted-foreground">
            Previsti: {assignmentRecord?.leads_count || 0}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignedLeadsDialog;