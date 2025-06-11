
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
import { Calendar, Mail, Phone, User, Tag, Users, CheckCircle } from "lucide-react";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadDetailsDialog = ({ lead, open, onOpenChange }: LeadDetailsDialogProps) => {
  if (!lead) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: it });
  };

  const fonti = lead.fonte ? lead.fonte.split(',').map(f => f.trim()).filter(f => f) : [];

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
                  <Badge variant="outline" className={`ml-2 text-xs ${
                    lead.assignable 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {lead.assignable ? 'Assegnabile' : 'Non assegnabile'}
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
          {(lead.venditore || lead.campagna) && (
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;
