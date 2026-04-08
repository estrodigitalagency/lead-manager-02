import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, Filter, Info, Play, Bot, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/contexts/MarketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import AssignedLeadsDialog from "@/components/database/AssignedLeadsDialog";
import ReplayAssignmentDialog from "@/components/database/ReplayAssignmentDialog";

interface AssignmentRecord {
  id: string;
  assigned_at: string;
  leads_count: number;
  venditore: string;
  campagna: string | null;
  fonti_escluse: string[] | null;
  fonti_incluse: string[] | null;
  exclude_from_included: string[] | null;
  source_mode: string | null;
  bypass_time_interval: boolean | null;
  assignment_type: string | null;
  lead_ids: string[] | null;
}

const AssignmentHistory = () => {
  const { selectedMarket } = useMarket();
  const isMobile = useIsMobile();
  const [history, setHistory] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRecord | null>(null);
  const [leadsDialogOpen, setLeadsDialogOpen] = useState(false);
  const [replayDialogOpen, setReplayDialogOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignment_history')
        .select('*')
        .eq('market', selectedMarket)
        .order('assigned_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Failed to fetch assignment history:", error);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch assignment history:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMarket]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Caricamento cronologia...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessuna assegnazione trovata.
      </div>
    );
  }

  // Mobile card-based view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {history.map((record) => {
            const isExpanded = expandedCards.has(record.id);
            return (
              <Card key={record.id} className="p-3 border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {record.assignment_type === 'automation' ? (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          Auto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Man.
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {record.leads_count} Lead
                      </Badge>
                    </div>
                    <p className="font-medium text-sm truncate">{record.venditore}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(record.assigned_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAssignment(record);
                        setLeadsDialogOpen(true);
                      }}
                      className="h-9 w-9 active:scale-95"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAssignment(record);
                        setReplayDialogOpen(true);
                      }}
                      className="h-9 w-9 active:scale-95"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expandable details */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(record.id)}
                  className="w-full mt-2 h-7 text-xs text-muted-foreground"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {isExpanded ? 'Meno dettagli' : 'Più dettagli'}
                </Button>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border space-y-2 text-xs">
                    {record.campagna && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Campagna:</span>
                        <Badge variant="secondary" className="text-xs">{record.campagna}</Badge>
                      </div>
                    )}
                    {record.bypass_time_interval && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Bypass Temporale</span>
                      </div>
                    )}
                    {record.fonti_incluse && record.fonti_incluse.length > 0 && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 mb-1">
                          <Filter className="h-3 w-3" /> Fonti incluse:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {record.fonti_incluse.map((fonte, i) => (
                            <Badge key={i} variant="default" className="text-xs">{fonte}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {record.fonti_escluse && record.fonti_escluse.length > 0 && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1 mb-1">
                          <Filter className="h-3 w-3" /> Fonti escluse:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {record.fonti_escluse.map((fonte, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">{fonte}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <AssignedLeadsDialog
          open={leadsDialogOpen}
          onOpenChange={setLeadsDialogOpen}
          assignmentRecord={selectedAssignment}
          onRefresh={loadHistory}
        />
        
        <ReplayAssignmentDialog
          open={replayDialogOpen}
          onOpenChange={setReplayDialogOpen}
          assignmentRecord={selectedAssignment}
          onSuccess={loadHistory}
        />
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Ora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Venditore</TableHead>
              <TableHead>Campagna</TableHead>
              <TableHead>Controlli</TableHead>
              <TableHead>Filtri Fonti</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="text-sm">
                  {formatDate(record.assigned_at)}
                </TableCell>
                <TableCell>
                  {record.assignment_type === 'automation' ? (
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Bot className="h-3 w-3" />
                      Auto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <User className="h-3 w-3" />
                      Manuale
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {record.leads_count} Lead
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {record.venditore}
                </TableCell>
                <TableCell>
                  {record.campagna ? (
                    <Badge variant="secondary">{record.campagna}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {record.bypass_time_interval && (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        Bypass Temporale
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {record.fonti_incluse && record.fonti_incluse.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <span>Incluse:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {record.fonti_incluse.map((fonte, index) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {fonte}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {record.fonti_escluse && record.fonti_escluse.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <span>Escluse:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {record.fonti_escluse.map((fonte, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {fonte}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.exclude_from_included && record.exclude_from_included.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Filter className="h-3 w-3" />
                          <span>Escluse dalle Incluse:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {record.exclude_from_included.map((fonte, index) => (
                            <Badge key={index} variant="outline" className="text-xs border-orange-300 text-orange-600">
                              {fonte}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!record.fonti_incluse || record.fonti_incluse.length === 0) && 
                     (!record.fonti_escluse || record.fonti_escluse.length === 0) &&
                     (!record.exclude_from_included || record.exclude_from_included.length === 0) && (
                      <span className="text-xs text-muted-foreground">Nessun filtro</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(record);
                        setLeadsDialogOpen(true);
                      }}
                      className="h-9 w-9 p-0 active:scale-95"
                      title="Visualizza dettagli e azioni"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(record);
                        setReplayDialogOpen(true);
                      }}
                      className="h-9 w-9 p-0 active:scale-95"
                      title="Replay assegnazione"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      
      <AssignedLeadsDialog
        open={leadsDialogOpen}
        onOpenChange={setLeadsDialogOpen}
        assignmentRecord={selectedAssignment}
        onRefresh={loadHistory}
      />
      
      <ReplayAssignmentDialog
        open={replayDialogOpen}
        onOpenChange={setReplayDialogOpen}
        assignmentRecord={selectedAssignment}
        onSuccess={loadHistory}
      />
    </>
  );
};

export default AssignmentHistory;
