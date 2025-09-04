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
    source_mode?: string | null;
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
      // Use a narrower time window: ±2 minutes around assignment time to be more precise
      const assignedTime = new Date(assignmentRecord.assigned_at);
      const startTime = new Date(assignedTime.getTime() - 2 * 60 * 1000);
      const endTime = new Date(assignedTime.getTime() + 2 * 60 * 1000);

      console.log(`Searching for leads assigned to ${assignmentRecord.venditore} between ${startTime.toISOString()} and ${endTime.toISOString()}`);

      let query = supabase
        .from('lead_generation')
        .select('*')
        .eq('venditore', assignmentRecord.venditore)
        .gte('data_assegnazione', startTime.toISOString())
        .lte('data_assegnazione', endTime.toISOString());

      // Apply campaign filter if present
      if (assignmentRecord.campagna) {
        query = query.eq('campagna', assignmentRecord.campagna);
        console.log(`Filtering by campaign: ${assignmentRecord.campagna}`);
      }

      const { data, error } = await query.order('data_assegnazione', { ascending: false });

      if (error) {
        console.error('Error loading assigned leads:', error);
        setLeads([]);
      } else {
        console.log(`Found ${data?.length || 0} potential leads before source filtering`);
        
        // Apply precise source filtering based on assignment record
        let filteredData = data || [];
        
        if (assignmentRecord.source_mode === 'include' && assignmentRecord.fonti_incluse?.length) {
          console.log(`Applying include mode with sources: ${assignmentRecord.fonti_incluse.join(', ')}`);
          
          // For include mode, only show leads from included sources with flexible matching
          const includedSources = assignmentRecord.fonti_incluse;
          filteredData = filteredData.filter(lead => {
            if (!lead.fonte) return false;
            
            // Split fonte by comma, trim whitespace, and check for matches
            const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
            const isIncluded = includedSources.some(includedSource => 
              leadSources.some(leadSource => 
                leadSource.includes(includedSource.toLowerCase()) || 
                includedSource.toLowerCase().includes(leadSource)
              )
            );
            
            console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - included: ${isIncluded}`);
            return isIncluded;
          });
          
          // Apply exclusions from included sources if specified
          if (assignmentRecord.exclude_from_included?.length) {
            console.log(`Applying exclusions from included: ${assignmentRecord.exclude_from_included.join(', ')}`);
            const excludeFromIncluded = assignmentRecord.exclude_from_included;
            filteredData = filteredData.filter(lead => {
              if (!lead.fonte) return true;
              
              const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
              const isExcluded = excludeFromIncluded.some(excludedSource =>
                leadSources.some(leadSource =>
                  leadSource.includes(excludedSource.toLowerCase()) ||
                  excludedSource.toLowerCase().includes(leadSource)
                )
              );
              
              console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - excluded from included: ${isExcluded}`);
              return !isExcluded;
            });
          }
        } else if (assignmentRecord.source_mode === 'exclude' && assignmentRecord.fonti_escluse?.length) {
          console.log(`Applying exclude mode with sources: ${assignmentRecord.fonti_escluse.join(', ')}`);
          
          // For exclude mode, exclude specified sources with flexible matching
          const excludedSources = assignmentRecord.fonti_escluse;
          filteredData = filteredData.filter(lead => {
            if (!lead.fonte) return true;
            
            const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
            const isExcluded = excludedSources.some(excludedSource =>
              leadSources.some(leadSource =>
                leadSource.includes(excludedSource.toLowerCase()) ||
                excludedSource.toLowerCase().includes(leadSource)
              )
            );
            
            console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - excluded: ${isExcluded}`);
            return !isExcluded;
          });
        } else if (assignmentRecord.fonti_incluse?.length) {
          // Legacy handling for old records without source_mode
          console.log(`Applying legacy include mode with sources: ${assignmentRecord.fonti_incluse.join(', ')}`);
          
          filteredData = filteredData.filter(lead => {
            if (!lead.fonte) return false;
            
            const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
            const isIncluded = assignmentRecord.fonti_incluse!.some(includedSource => 
              leadSources.some(leadSource => 
                leadSource.includes(includedSource.toLowerCase()) || 
                includedSource.toLowerCase().includes(leadSource)
              )
            );
            
            console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - legacy included: ${isIncluded}`);
            return isIncluded;
          });
          
          if (assignmentRecord.exclude_from_included?.length) {
            console.log(`Applying legacy exclusions from included: ${assignmentRecord.exclude_from_included.join(', ')}`);
            const excludeFromIncluded = assignmentRecord.exclude_from_included;
            filteredData = filteredData.filter(lead => {
              if (!lead.fonte) return true;
              
              const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
              const isExcluded = excludeFromIncluded.some(excludedSource =>
                leadSources.some(leadSource =>
                  leadSource.includes(excludedSource.toLowerCase()) ||
                  excludedSource.toLowerCase().includes(leadSource)
                )
              );
              
              console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - legacy excluded from included: ${isExcluded}`);
              return !isExcluded;
            });
          }
        } else if (assignmentRecord.fonti_escluse?.length) {
          // Legacy handling for old records without source_mode
          console.log(`Applying legacy exclude mode with sources: ${assignmentRecord.fonti_escluse.join(', ')}`);
          
          const excludedSources = assignmentRecord.fonti_escluse;
          filteredData = filteredData.filter(lead => {
            if (!lead.fonte) return true;
            
            const leadSources = lead.fonte.split(',').map(s => s.trim().toLowerCase());
            const isExcluded = excludedSources.some(excludedSource =>
              leadSources.some(leadSource =>
                leadSource.includes(excludedSource.toLowerCase()) ||
                excludedSource.toLowerCase().includes(leadSource)
              )
            );
            
            console.log(`Lead ${lead.nome} (fonte: ${lead.fonte}) - legacy excluded: ${isExcluded}`);
            return !isExcluded;
          });
        } else {
          console.log('No source filtering applied - showing all leads in time window');
        }

        console.log(`Final filtered results: ${filteredData.length} leads`);
        console.log('Expected count from assignment record:', assignmentRecord.leads_count);
        
        setLeads(filteredData);
      }
    } catch (error) {
      console.error('Error loading assigned leads:', error);
      setLeads([]);
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
      <DialogContent className="max-w-6xl h-[80vh] z-[100] bg-background border flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Lead Assegnati - {assignmentRecord?.venditore}
            {assignmentRecord && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({formatDate(assignmentRecord.assigned_at)})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Caricamento lead...</span>
            </div>
          ) : (
            <div className="h-full overflow-auto">
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
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
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