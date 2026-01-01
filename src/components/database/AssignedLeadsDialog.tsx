import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCcw, UserPlus, Clock, Bot, User, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarket } from "@/contexts/MarketContext";
import { toast } from "sonner";

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
  assignable?: boolean;
}

interface ActionLog {
  id: string;
  created_at: string;
  action_type: string;
  leads_count: number;
  previous_venditore: string | null;
  new_venditore: string | null;
  performed_by: string | null;
  notes: string | null;
}

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
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
    lead_ids?: string[] | null;
    assignment_type?: string | null;
  } | null;
  onRefresh?: () => void;
}

const AssignedLeadsDialog = ({ open, onOpenChange, assignmentRecord, onRefresh }: AssignedLeadsDialogProps) => {
  const { selectedMarket } = useMarket();
  const [leads, setLeads] = useState<AssignedLead[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVenditore, setSelectedVenditore] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && assignmentRecord) {
      loadAssignedLeads();
      loadActionLogs();
      loadVenditori();
      setSelectedLeadIds([]);
      setSelectedVenditore("");
    }
  }, [open, assignmentRecord]);

  const loadVenditori = async () => {
    const { data } = await supabase
      .from('venditori')
      .select('id, nome, cognome')
      .eq('market', selectedMarket)
      .eq('stato', 'attivo')
      .order('nome');
    
    if (data) setVenditori(data);
  };

  const loadActionLogs = async () => {
    if (!assignmentRecord) return;
    
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('lead_actions_log')
        .select('*')
        .eq('source_assignment_id', assignmentRecord.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActionLogs(data);
      }
    } catch (error) {
      console.error('Error loading action logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadAssignedLeads = async () => {
    if (!assignmentRecord) return;

    setLoading(true);
    try {
      // If we have lead_ids, use them directly
      if (assignmentRecord.lead_ids && assignmentRecord.lead_ids.length > 0) {
        const { data, error } = await supabase
          .from('lead_generation')
          .select('*')
          .in('id', assignmentRecord.lead_ids);

        if (!error && data) {
          setLeads(data);
          setLoading(false);
          return;
        }
      }

      // Fallback to time-based search
      const assignedTime = new Date(assignmentRecord.assigned_at);
      const startTime = new Date(assignedTime.getTime() - 2 * 60 * 1000);
      const endTime = new Date(assignedTime.getTime() + 2 * 60 * 1000);

      let query = supabase
        .from('lead_generation')
        .select('*')
        .eq('venditore', assignmentRecord.venditore)
        .gte('data_assegnazione', startTime.toISOString())
        .lte('data_assegnazione', endTime.toISOString());

      if (assignmentRecord.campagna) {
        query = query.eq('campagna', assignmentRecord.campagna);
      }

      const { data, error } = await query.order('data_assegnazione', { ascending: false });

      if (!error) {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error loading assigned leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAssignable = async () => {
    const idsToUpdate = selectedLeadIds.length > 0 ? selectedLeadIds : leads.map(l => l.id);
    
    if (idsToUpdate.length === 0) {
      toast.error("Nessun lead selezionato");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('lead_generation')
        .update({ 
          assignable: true, 
          venditore: null, 
          data_assegnazione: null, 
          stato: 'nuovo' 
        })
        .in('id', idsToUpdate);

      if (error) throw error;

      // Log the action
      await supabase
        .from('lead_actions_log')
        .insert({
          action_type: 'made_assignable',
          lead_ids: idsToUpdate,
          leads_count: idsToUpdate.length,
          previous_venditore: assignmentRecord?.venditore,
          new_venditore: null,
          source_assignment_id: assignmentRecord?.id,
          performed_by: 'user',
          notes: `${idsToUpdate.length} lead resi assegnabili`,
          market: selectedMarket
        });

      toast.success(`${idsToUpdate.length} lead resi assegnabili`);
      await loadAssignedLeads();
      await loadActionLogs();
      setSelectedLeadIds([]);
      onRefresh?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Errore nell'operazione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedVenditore) {
      toast.error("Seleziona un venditore");
      return;
    }

    const idsToUpdate = selectedLeadIds.length > 0 ? selectedLeadIds : leads.map(l => l.id);
    
    if (idsToUpdate.length === 0) {
      toast.error("Nessun lead selezionato");
      return;
    }

    const venditore = venditori.find(v => v.id === selectedVenditore);
    if (!venditore) return;

    const venditoreName = `${venditore.nome} ${venditore.cognome}`;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('lead_generation')
        .update({ 
          venditore: venditoreName,
          data_assegnazione: new Date().toISOString(),
          stato: 'assegnato',
          assignable: false
        })
        .in('id', idsToUpdate);

      if (error) throw error;

      // Log the action
      await supabase
        .from('lead_actions_log')
        .insert({
          action_type: 'reassigned',
          lead_ids: idsToUpdate,
          leads_count: idsToUpdate.length,
          previous_venditore: assignmentRecord?.venditore,
          new_venditore: venditoreName,
          source_assignment_id: assignmentRecord?.id,
          performed_by: 'user',
          notes: `${idsToUpdate.length} lead riassegnati da ${assignmentRecord?.venditore} a ${venditoreName}`,
          market: selectedMarket
        });

      // Create new assignment history record
      await supabase
        .from('assignment_history')
        .insert({
          venditore: venditoreName,
          leads_count: idsToUpdate.length,
          campagna: assignmentRecord?.campagna || null,
          lead_ids: idsToUpdate,
          assignment_type: 'manual',
          market: selectedMarket
        });

      toast.success(`${idsToUpdate.length} lead riassegnati a ${venditoreName}`);
      await loadAssignedLeads();
      await loadActionLogs();
      setSelectedLeadIds([]);
      setSelectedVenditore("");
      onRefresh?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Errore nella riassegnazione");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
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

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'made_assignable':
        return <Badge variant="outline" className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />Reso Assegnabile</Badge>;
      case 'reassigned':
        return <Badge variant="secondary" className="flex items-center gap-1"><UserPlus className="h-3 w-3" />Riassegnato</Badge>;
      case 'manual_assignment':
        return <Badge variant="default" className="flex items-center gap-1"><User className="h-3 w-3" />Assegnazione Manuale</Badge>;
      case 'automation_assignment':
        return <Badge className="flex items-center gap-1 bg-blue-500"><Bot className="h-3 w-3" />Automazione</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  const currentLeadsCount = leads.filter(l => l.venditore === assignmentRecord?.venditore).length;
  const reassignedCount = leads.filter(l => l.venditore && l.venditore !== assignmentRecord?.venditore).length;
  const madeAssignableCount = leads.filter(l => l.assignable && !l.venditore).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] z-[100] bg-background border flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Dettagli Assegnazione - {assignmentRecord?.venditore}
            {assignmentRecord?.assignment_type === 'automation' ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />Auto
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />Manuale
              </Badge>
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {assignmentRecord && formatDate(assignmentRecord.assigned_at)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Status Summary */}
        <div className="flex gap-4 py-2 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ancora assegnati:</span>
            <Badge variant="default">{currentLeadsCount}</Badge>
          </div>
          {reassignedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Riassegnati:</span>
              <Badge variant="secondary">{reassignedCount}</Badge>
            </div>
          )}
          {madeAssignableCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Resi assegnabili:</span>
              <Badge variant="outline">{madeAssignableCount}</Badge>
            </div>
          )}
        </div>
        
        <Tabs defaultValue="leads" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="leads">Lead ({leads.length})</TabsTrigger>
            <TabsTrigger value="logs">Log Azioni ({actionLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="flex-1 overflow-hidden flex flex-col mt-0">
            {/* Actions Bar */}
            <div className="flex items-center gap-4 py-3 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLeadIds.length > 0 ? `${selectedLeadIds.length} selezionati` : 'Tutti i lead'}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleMakeAssignable}
                disabled={actionLoading || leads.length === 0}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Rendi Assegnabili
              </Button>

              <div className="flex items-center gap-2">
                <Select value={selectedVenditore} onValueChange={setSelectedVenditore}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleziona venditore..." />
                  </SelectTrigger>
                  <SelectContent>
                    {venditori.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome} {v.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleReassign}
                  disabled={actionLoading || !selectedVenditore || leads.length === 0}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Riassegna
                </Button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Caricamento lead...</span>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Nessun lead trovato per questa assegnazione.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input 
                          type="checkbox" 
                          checked={selectedLeadIds.length === leads.length && leads.length > 0}
                          onChange={toggleAllLeads}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Stato Attuale</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Data Assegnazione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className={selectedLeadIds.includes(lead.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {lead.nome} {lead.cognome}
                        </TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.telefono}</TableCell>
                        <TableCell>
                          {lead.assignable && !lead.venditore ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">Assegnabile</Badge>
                          ) : lead.venditore === assignmentRecord?.venditore ? (
                            <Badge variant="default">Assegnato</Badge>
                          ) : lead.venditore ? (
                            <Badge variant="secondary">→ {lead.venditore}</Badge>
                          ) : (
                            <Badge variant="outline">Libero</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.fonte && <Badge variant="outline">{lead.fonte}</Badge>}
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
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-auto mt-0">
            {loadingLogs ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Caricamento log...</span>
              </div>
            ) : actionLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                <Clock className="h-8 w-8" />
                <span>Nessuna azione registrata per questa assegnazione.</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Azione</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Da</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead>Eseguito da</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.leads_count} lead</Badge>
                      </TableCell>
                      <TableCell>{log.previous_venditore || '-'}</TableCell>
                      <TableCell>{log.new_venditore || '-'}</TableCell>
                      <TableCell>
                        {log.performed_by === 'user' ? (
                          <Badge variant="outline"><User className="h-3 w-3 mr-1" />Utente</Badge>
                        ) : (
                          <Badge variant="secondary"><Bot className="h-3 w-3 mr-1" />Sistema</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AssignedLeadsDialog;
