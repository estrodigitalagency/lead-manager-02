
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lead } from "@/types/lead";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Mail, Phone, User, Tag, Users, CheckCircle, History, Clock, DollarSign, ShoppingCart } from "lucide-react";
import { getLeadStatus } from "@/utils/leadStatus";
import { useLeadHistory } from "@/hooks/useLeadHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadDetailsDialog = ({ lead, open, onOpenChange }: LeadDetailsDialogProps) => {
  const { history, isLoading: historyLoading, error: historyError } = useLeadHistory(lead);
  
  if (!lead) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: it });
  };

  const fonti = lead.fonte ? lead.fonte.split(',').map(f => f.trim()).filter(f => f) : [];
  const status = getLeadStatus(lead);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dettagli Lead: {lead.nome} {lead.cognome || ''}
          </DialogTitle>
          <DialogDescription>
            Informazioni complete del lead
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="principale" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="principale">Principale</TabsTrigger>
            <TabsTrigger value="customer-journey">Customer Journey</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>

          {/* TAB PRINCIPALE */}
          <TabsContent value="principale" className="space-y-6 mt-4">
            {/* Informazioni personali */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                INFORMAZIONI PERSONALI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Nome:</strong> {lead.nome}
                  </span>
                </div>
                {lead.cognome && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Cognome:</strong> {lead.cognome}
                    </span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Email:</strong> {lead.email}
                    </span>
                  </div>
                )}
                {lead.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Telefono:</strong> {lead.telefono}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Date e stato */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                DATE E STATO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Creato il:</strong> {formatDate(lead.created_at)}
                  </span>
                </div>
                {lead.updated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Aggiornato il:</strong> {formatDate(lead.updated_at)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Stato:</strong> 
                    <Badge variant="outline" className={`ml-2 text-xs ${status.className}`}>
                      {status.label}
                    </Badge>
                  </span>
                </div>
                {lead.booked_call === 'SI' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <strong>Call prenotata:</strong>
                      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">
                        Sì
                      </Badge>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fonti */}
            {(fonti.length > 0 || lead.ultima_fonte) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                  FONTI
                </h3>
                <div className="space-y-3">
                  {fonti.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Tutte le fonti:</div>
                      <div className="flex flex-wrap gap-2">
                        {fonti.map((fonte, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {fonte}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.ultima_fonte && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Ultima fonte:</div>
                      <div className="flex flex-wrap gap-2">
                        {lead.ultima_fonte.split(',').map(f => f.trim()).filter(f => f).map((fonte, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-primary/10 border-primary/30">
                            <Tag className="h-3 w-3 mr-1" />
                            {fonte}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assegnazione */}
            {(lead.venditore || lead.campagna || lead.data_assegnazione) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                  ASSEGNAZIONE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lead.venditore && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Venditore:</strong> {lead.venditore}
                      </span>
                    </div>
                  )}
                  {lead.campagna && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Campagna:</strong> {lead.campagna}
                      </span>
                    </div>
                  )}
                  {lead.data_assegnazione && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>Data assegnazione:</strong> {formatDate(lead.data_assegnazione)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB CUSTOMER JOURNEY */}
          <TabsContent value="customer-journey" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1 flex items-center gap-2">
                <History className="h-4 w-4" />
                STORICO LEAD GENERATION
              </h3>
              
              {historyLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : historyError ? (
                <div className="text-sm text-destructive">
                  Errore nel caricamento dello storico: {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nessuno storico trovato per questo lead.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {history.map((historyItem) => {
                    const isCurrentLead = historyItem.id === lead.id;
                    
                    return (
                      <div 
                        key={historyItem.id} 
                        className={`p-3 rounded-lg border ${isCurrentLead ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                      >
                        <div className="flex flex-col space-y-2">
                          {/* Header con data e badge corrente */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                Creato il: {formatDate(historyItem.created_at)}
                              </span>
                              {isCurrentLead && (
                                <Badge variant="outline" className="text-xs">
                                  Corrente
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Informazioni di assegnazione */}
                          {historyItem.venditore && (
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">
                                Assegnato a: <strong>{historyItem.venditore}</strong>
                                {historyItem.data_assegnazione && (
                                  <span className="text-muted-foreground ml-2">
                                    ({formatDate(historyItem.data_assegnazione)})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* Ultima Fonte */}
                          {historyItem.ultima_fonte && (
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex items-center gap-1">
                                <span className="text-xs">Ultima fonte:</span>
                                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                                  {historyItem.ultima_fonte}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB SALES */}
          <TabsContent value="sales" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                INFORMAZIONI VENDITA
              </h3>
              
              {lead.vendita_chiusa ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-foreground">Vendita Chiusa</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lead.data_chiusura && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Data chiusura:</strong> {formatDate(lead.data_chiusura)}
                          </span>
                        </div>
                      )}
                      
                      {lead.importo_vendita && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Importo:</strong> €{lead.importo_vendita.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      
                      {lead.percorso_venduto && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Percorso venduto:</strong> {lead.percorso_venduto}
                          </span>
                        </div>
                      )}
                      
                      {lead.fonte_vendita && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Fonte vendita:</strong> 
                            <Badge variant="outline" className="ml-2 text-xs">
                              {lead.fonte_vendita}
                            </Badge>
                          </span>
                        </div>
                      )}
                      
                      {lead.venditore && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Venduto da:</strong> {lead.venditore}
                          </span>
                        </div>
                      )}
                      
                      {lead.ultima_fonte && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            <strong>Ultima fonte:</strong> 
                            <Badge variant="outline" className="ml-2 text-xs">
                              {lead.ultima_fonte}
                            </Badge>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {lead.note_vendita && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-foreground">
                            <strong>Note:</strong> {lead.note_vendita}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessuna vendita registrata per questo lead</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;
