import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/hooks/useLeadHistory";
import { 
  Calendar, 
  Phone, 
  Bot, 
  UserPlus, 
  RotateCcw, 
  DollarSign, 
  Tag,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from "lucide-react";

interface CustomerJourneyTimelineProps {
  timeline: TimelineEvent[];
  currentLeadId?: string;
}

const CustomerJourneyTimeline = ({ timeline, currentLeadId }: CustomerJourneyTimelineProps) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: it });
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ingresso':
        return <Calendar className="h-4 w-4" />;
      case 'call_prenotata':
        return <Phone className="h-4 w-4" />;
      case 'automation':
        return <Bot className="h-4 w-4" />;
      case 'assegnazione_manuale':
        return <UserPlus className="h-4 w-4" />;
      case 'azione':
        return <RotateCcw className="h-4 w-4" />;
      case 'vendita':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ingresso':
        return 'bg-green-500';
      case 'call_prenotata':
        return 'bg-blue-500';
      case 'automation':
        return 'bg-purple-500';
      case 'assegnazione_manuale':
        return 'bg-amber-500';
      case 'azione':
        return 'bg-slate-500';
      case 'vendita':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeVariant = (variant?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (variant) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'no_seller_found':
        return <AlertCircle className="h-3 w-3 text-amber-500" />;
      default:
        return null;
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nessun evento trovato per questo lead.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {timeline.map((event, index) => {
          const isCurrentLead = event.details?.isCurrentLead;
          
          return (
            <div key={event.id} className="relative pl-10">
              {/* Event dot */}
              <div 
                className={`absolute left-1 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white ${getEventColor(event.type)}`}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Event card */}
              <div 
                className={`p-3 rounded-lg border transition-colors ${
                  event.type === 'vendita'
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : isCurrentLead 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatDate(event.date)}
                    </span>
                    {isCurrentLead && (
                      <Badge variant="outline" className="text-xs">
                        Corrente
                      </Badge>
                    )}
                  </div>
                  
                  {/* Result badge for automations */}
                  {event.badge && (
                    <Badge 
                      variant={getBadgeVariant(event.badgeVariant)}
                      className="text-xs flex items-center gap-1"
                    >
                      {getResultIcon(event.badge)}
                      {event.badge === 'success' ? 'Successo' : 
                       event.badge === 'error' ? 'Errore' :
                       event.badge === 'no_seller_found' ? 'Nessun venditore' :
                       event.badge === 'beyond_lock_period' ? 'Oltre lock period' :
                       event.badge}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div className="mt-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {event.title}
                  </span>
                </div>

                {/* Details based on event type */}
                <div className="mt-2 space-y-1.5">
                  {/* Fonte/Tag */}
                  {event.fonte && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                        {event.fonte}
                      </Badge>
                    </div>
                  )}

                  {/* Venditore */}
                  {event.venditore && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {event.type === 'call_prenotata' ? 'Con:' : 
                         event.type === 'vendita' ? 'Venduto da:' : 'Assegnato a:'} 
                        <strong className="text-foreground ml-1">{event.venditore}</strong>
                      </span>
                    </div>
                  )}

                  {/* Call scheduled time */}
                  {event.type === 'call_prenotata' && event.details?.scheduled_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Programmata: <strong className="text-foreground">{formatDate(event.details.scheduled_at)}</strong>
                      </span>
                    </div>
                  )}

                  {/* Assignment campaign */}
                  {event.details?.campagna && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Campagna: <strong className="text-foreground">{event.details.campagna}</strong>
                      </span>
                    </div>
                  )}

                  {/* Action details: previous venditore */}
                  {event.type === 'azione' && event.details?.previous_venditore && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Da: <strong>{event.details.previous_venditore}</strong>
                        {event.venditore && (
                          <>
                            <span className="mx-1">→</span>
                            A: <strong>{event.venditore}</strong>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Sale details */}
                  {event.type === 'vendita' && (
                    <div className="mt-2 p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                      {event.details?.importo && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-bold text-emerald-700">
                            €{Number(event.details.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {event.details?.percorso && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-foreground/70" />
                          <span className="text-xs text-foreground">
                            <span className="text-muted-foreground">Percorso:</span> <strong>{event.details.percorso}</strong>
                          </span>
                        </div>
                      )}
                      {event.details?.fonte_vendita && (
                        <div className="flex items-center gap-2 mt-1">
                          <Tag className="h-3 w-3 text-foreground/70" />
                          <span className="text-xs text-foreground">
                            <span className="text-muted-foreground">Fonte vendita:</span> <strong>{event.details.fonte_vendita}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error message for automations */}
                  {event.details?.error_message && (
                    <div className="text-xs text-destructive mt-1 italic">
                      {event.details.error_message}
                    </div>
                  )}

                  {/* Notes */}
                  {event.details?.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      "{event.details.notes}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerJourneyTimeline;
