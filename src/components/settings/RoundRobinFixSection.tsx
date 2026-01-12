import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, Users, Calendar, Send, AlertCircle, CheckCircle2, XCircle, Filter, Search, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarket } from "@/contexts/MarketContext";
import { useCampaignsData } from "@/hooks/useCampaignsData";
import { toast } from "sonner";

interface AnalyzedLead {
  id: string;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  fonte_attuale: string | null;
  created_at: string | null;
  previous_venditore: string;
  previous_data_assegnazione: string;
  previous_ultima_fonte: string | null;
  giorni_da_assegnazione: number;
}

interface VenditoreGroup {
  venditore: string;
  count: number;
  oldestAssignment: string;
  newestAssignment: string;
  leads: AnalyzedLead[];
}

interface AnalysisData {
  summary: {
    totalRoundRobinLeads: number;
    withPreviousSeller: number;
    withoutPreviousSeller: number;
    uniqueVenditori: number;
  };
  byVenditore: VenditoreGroup[];
}

interface ProcessResult {
  lead_id: string;
  nome: string;
  email: string | null;
  previous_venditore: string;
  status: 'success' | 'error';
  error?: string;
  webhook_sent?: boolean;
}

export function RoundRobinFixSection() {
  const { selectedMarket } = useMarket();
  const { campaigns } = useCampaignsData();
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  // Filters
  const [maxDaysFilter, setMaxDaysFilter] = useState<string>("90");
  const [minDaysFilter, setMinDaysFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  
  // Assignment options
  const [sendWebhook, setSendWebhook] = useState(true);
  const [selectedCampagna, setSelectedCampagna] = useState<string>("none");
  const [notes, setNotes] = useState("");
  
  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Processing results
  const [processResults, setProcessResults] = useState<ProcessResult[] | null>(null);
  const [processProgress, setProcessProgress] = useState(0);

  const fetchAnalysis = async () => {
    setLoading(true);
    setAnalysisData(null);
    setSelectedLeadIds(new Set());
    
    try {
      console.log('Fetching Round Robin analysis for market:', selectedMarket);
      const { data, error } = await supabase.functions.invoke('get-round-robin-analysis', {
        body: {
          market: selectedMarket,
          maxDaysAgo: maxDaysFilter ? parseInt(maxDaysFilter) : undefined,
          minDaysAgo: minDaysFilter ? parseInt(minDaysFilter) : undefined,
        }
      });

      console.log('Analysis response:', data, 'Error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      setAnalysisData(data);
      toast.success(`Analisi completata: ${data?.summary?.withPreviousSeller || 0} lead con venditore precedente`);
    } catch (error: any) {
      console.error('Error fetching analysis:', error);
      toast.error(`Errore nel caricamento: ${error.message || 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [selectedMarket]);

  const handleRefresh = () => {
    fetchAnalysis();
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  const toggleVenditoreSelection = (leads: AnalyzedLead[]) => {
    const leadIds = leads.map(l => l.id);
    const allSelected = leadIds.every(id => selectedLeadIds.has(id));
    
    const newSelected = new Set(selectedLeadIds);
    if (allSelected) {
      leadIds.forEach(id => newSelected.delete(id));
    } else {
      leadIds.forEach(id => newSelected.add(id));
    }
    setSelectedLeadIds(newSelected);
  };

  const selectAllWithinDays = (days: number) => {
    if (!analysisData) return;
    
    const newSelected = new Set<string>();
    for (const group of analysisData.byVenditore) {
      for (const lead of group.leads) {
        if (lead.giorni_da_assegnazione <= days) {
          newSelected.add(lead.id);
        }
      }
    }
    setSelectedLeadIds(newSelected);
  };

  const selectAll = () => {
    if (!analysisData) return;
    
    const newSelected = new Set<string>();
    for (const group of analysisData.byVenditore) {
      for (const lead of group.leads) {
        newSelected.add(lead.id);
      }
    }
    setSelectedLeadIds(newSelected);
  };

  const deselectAll = () => {
    setSelectedLeadIds(new Set());
  };

  const handleProcess = async () => {
    if (selectedLeadIds.size === 0) {
      toast.error('Seleziona almeno un lead');
      return;
    }
    setShowConfirmDialog(true);
  };

  const executeProcess = async () => {
    setShowConfirmDialog(false);
    setProcessing(true);
    setProcessResults(null);
    setProcessProgress(0);

    try {
      const leadIdsArray = Array.from(selectedLeadIds);
      
      const { data, error } = await supabase.functions.invoke('process-round-robin-leads', {
        body: {
          market: selectedMarket,
          leadIds: leadIdsArray,
          sendWebhook: sendWebhook,
          campagna: selectedCampagna !== "none" ? campaigns.find(c => c.id === selectedCampagna)?.nome : null,
          notes: notes.trim() || null,
        }
      });

      if (error) throw error;

      setProcessResults(data.results);
      setProcessProgress(100);

      const successCount = data.results.filter((r: ProcessResult) => r.status === 'success').length;
      const failedCount = data.results.filter((r: ProcessResult) => r.status === 'error').length;

      if (failedCount === 0) {
        toast.success(`${successCount} lead riassegnati con successo`);
      } else {
        toast.warning(`${successCount} successi, ${failedCount} errori`);
      }

      // Refresh data
      await fetchAnalysis();

    } catch (error) {
      console.error('Error processing leads:', error);
      toast.error('Errore nella riassegnazione');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysColor = (days: number) => {
    if (days <= 7) return 'text-green-600';
    if (days <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter leads by search query
  const filteredGroups = analysisData?.byVenditore.map(group => ({
    ...group,
    leads: group.leads.filter(lead => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lead.nome?.toLowerCase().includes(query) ||
        lead.cognome?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.telefono?.includes(query) ||
        lead.fonte_attuale?.toLowerCase().includes(query)
      );
    })
  })).filter(group => group.leads.length > 0) || [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Fix Lead Round Robin
          </CardTitle>
          <CardDescription>
            Trova i lead assegnati a "Round Robin" che hanno un venditore precedente e riassegnali
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          {analysisData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{analysisData.summary.totalRoundRobinLeads}</p>
                <p className="text-sm text-muted-foreground">Lead Round Robin totali</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{analysisData.summary.withPreviousSeller}</p>
                <p className="text-sm text-muted-foreground">Con venditore precedente</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{analysisData.summary.withoutPreviousSeller}</p>
                <p className="text-sm text-muted-foreground">Senza venditore precedente</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{analysisData.summary.uniqueVenditori}</p>
                <p className="text-sm text-muted-foreground">Venditori unici</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Max giorni fa</Label>
              <Input
                type="number"
                value={maxDaysFilter}
                onChange={(e) => setMaxDaysFilter(e.target.value)}
                placeholder="90"
                className="w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min giorni fa</Label>
              <Input
                type="number"
                value={minDaysFilter}
                onChange={(e) => setMinDaysFilter(e.target.value)}
                placeholder="0"
                className="w-24"
              />
            </div>
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
              Applica Filtri
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, email, telefono o fonte..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions */}
      {analysisData && analysisData.summary.withPreviousSeller > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAllWithinDays(7)}>
                  Seleziona ultimi 7 giorni
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAllWithinDays(30)}>
                  Seleziona ultimi 30 giorni
                </Button>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Seleziona tutti
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deseleziona tutti
                </Button>
              </div>
              <Badge variant="secondary" className="text-base">
                {selectedLeadIds.size} lead selezionati
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Options */}
      {selectedLeadIds.size > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Opzioni Riassegnazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Campagna
                </Label>
                <Select value={selectedCampagna} onValueChange={setSelectedCampagna}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuna campagna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna campagna</SelectItem>
                    {campaigns.filter(c => c.attivo).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Webhook
                </Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="send-webhook" 
                    checked={sendWebhook} 
                    onCheckedChange={setSendWebhook}
                  />
                  <Label htmlFor="send-webhook">Invia webhook ai venditori</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note (salvate nello storico del lead)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es: Bulk fix Round Robin - Gennaio 2026"
                rows={2}
              />
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleProcess}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Riassegna {selectedLeadIds.size} lead ai venditori precedenti
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {processing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Elaborazione in corso...</span>
                <span>{processProgress}%</span>
              </div>
              <Progress value={processProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Risultati Elaborazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-xl font-bold text-green-600">
                  {processResults.filter(r => r.status === 'success').length}
                </p>
                <p className="text-sm text-muted-foreground">Successi</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg text-center">
                <p className="text-xl font-bold text-red-600">
                  {processResults.filter(r => r.status === 'error').length}
                </p>
                <p className="text-sm text-muted-foreground">Errori</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-xl font-bold text-blue-600">
                  {processResults.filter(r => r.webhook_sent).length}
                </p>
                <p className="text-sm text-muted-foreground">Webhook inviati</p>
              </div>
            </div>
            
            {processResults.filter(r => r.status === 'error').length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">Errori:</p>
                {processResults.filter(r => r.status === 'error').map(r => (
                  <div key={r.lead_id} className="text-sm p-2 bg-red-50 dark:bg-red-900/10 rounded">
                    {r.nome} ({r.email}): {r.error}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead Groups */}
      {loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Caricamento analisi...</span>
            </div>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Nessun lead Round Robin con venditore precedente trovato</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filteredGroups.map((group) => {
            const groupLeadIds = group.leads.map(l => l.id);
            const selectedInGroup = groupLeadIds.filter(id => selectedLeadIds.has(id)).length;
            const allSelected = selectedInGroup === group.leads.length;

            return (
              <AccordionItem key={group.venditore} value={group.venditore} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleVenditoreSelection(group.leads)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 text-left">
                      <span className="font-medium">{group.venditore}</span>
                      <Badge variant="secondary" className="ml-2">{group.leads.length} lead</Badge>
                      {selectedInGroup > 0 && selectedInGroup < group.leads.length && (
                        <Badge variant="outline" className="ml-2">{selectedInGroup} selezionati</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground hidden md:block">
                      Da {formatDate(group.newestAssignment)} a {formatDate(group.oldestAssignment)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {group.leads.map((lead) => (
                      <div 
                        key={lead.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedLeadIds.has(lead.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleLeadSelection(lead.id)}
                      >
                        <Checkbox
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{lead.nome} {lead.cognome}</span>
                            {lead.email && <span className="text-sm text-muted-foreground truncate">{lead.email}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lead.telefono && (
                              <span className="text-xs text-muted-foreground">{lead.telefono}</span>
                            )}
                            {lead.fonte_attuale && (
                              <Badge variant="outline" className="text-xs">Fonte: {lead.fonte_attuale}</Badge>
                            )}
                            {lead.previous_ultima_fonte && lead.previous_ultima_fonte !== lead.fonte_attuale && (
                              <Badge variant="secondary" className="text-xs">Prec: {lead.previous_ultima_fonte}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-sm font-medium ${getDaysColor(lead.giorni_da_assegnazione)}`}>
                              {lead.giorni_da_assegnazione}g fa
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(lead.previous_data_assegnazione)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Riassegnazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per riassegnare <strong>{selectedLeadIds.size} lead</strong> ai rispettivi venditori precedenti.
              {selectedCampagna !== "none" && (
                <span> Campagna: <strong>{campaigns.find(c => c.id === selectedCampagna)?.nome}</strong>.</span>
              )}
              {sendWebhook && <span> Verranno inviati i webhook.</span>}
              {notes && <span> Nota: "{notes}"</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executeProcess}>
              Conferma Riassegnazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
