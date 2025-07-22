
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lead } from "@/types/lead";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Mail, Phone, User, Tag, Users, CheckCircle, History, Clock } from "lucide-react";
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

        <div className="space-y-6">
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
          {fonti.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                FONTI
              </h3>
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

          {/* Storico Lead */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1 flex items-center gap-2">
              <History className="h-4 w-4" />
              STORICO LEAD
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
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {history.map((historyItem, index) => {
                  const historiFonti = historyItem.fonte ? historyItem.fonte.split(',').map(f => f.trim()).filter(f => f) : [];
                  const isCurrentLead = historyItem.id === lead.id;
                  
                  return (
                    <div 
                      key={historyItem.id} 
                      className={`p-3 rounded-lg border ${isCurrentLead ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                    >
                      <div className="flex flex-col space-y-2">
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">
                              {historyItem.nome} {historyItem.cognome || ''}
                            </span>
                          </div>
                          
                          {historiFonti.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {historiFonti.map((fonte, fonteIndex) => (
                                  <Badge key={fonteIndex} variant="outline" className="text-xs">
                                    {fonte}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {historyItem.venditore && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">
                              <strong>Assegnato a:</strong> {historyItem.venditore}
                              {historyItem.data_assegnazione && (
                                <span className="text-muted-foreground ml-2">
                                  ({formatDate(historyItem.data_assegnazione)})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;
