import { format, formatDistanceToNow } from "date-fns";
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

type EventType = TimelineEvent['type'];

const EVENT_STYLE: Record<EventType, {
  icon: JSX.Element;
  ring: string;     // bg + ring around dot
  dot: string;      // inner dot bg
  label: string;
  cardAccent: string; // left border accent on card
}> = {
  ingresso: {
    icon: <Calendar className="h-3.5 w-3.5" />,
    ring: 'bg-emerald-500/15 ring-emerald-500/30',
    dot: 'bg-emerald-500 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_18px_-2px_rgba(16,185,129,0.5)]',
    label: 'Ingresso',
    cardAccent: 'before:bg-emerald-500/60',
  },
  call_prenotata: {
    icon: <Phone className="h-3.5 w-3.5" />,
    ring: 'bg-sky-500/15 ring-sky-500/30',
    dot: 'bg-sky-500 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_18px_-2px_rgba(14,165,233,0.5)]',
    label: 'Call',
    cardAccent: 'before:bg-sky-500/60',
  },
  automation: {
    icon: <Bot className="h-3.5 w-3.5" />,
    ring: 'bg-violet-500/15 ring-violet-500/30',
    dot: 'bg-violet-500 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_18px_-2px_rgba(139,92,246,0.5)]',
    label: 'Automazione',
    cardAccent: 'before:bg-violet-500/60',
  },
  assegnazione_manuale: {
    icon: <UserPlus className="h-3.5 w-3.5" />,
    ring: 'bg-amber-500/15 ring-amber-500/30',
    dot: 'bg-amber-500 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_18px_-2px_rgba(245,158,11,0.5)]',
    label: 'Assegnazione',
    cardAccent: 'before:bg-amber-500/60',
  },
  azione: {
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    ring: 'bg-slate-500/15 ring-slate-500/30',
    dot: 'bg-slate-500 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_18px_-2px_rgba(100,116,139,0.4)]',
    label: 'Azione',
    cardAccent: 'before:bg-slate-500/60',
  },
  vendita: {
    icon: <DollarSign className="h-3.5 w-3.5" />,
    ring: 'bg-emerald-600/20 ring-emerald-600/40',
    dot: 'bg-emerald-600 text-white shadow-[0_0_0_4px_hsl(var(--background)),0_0_22px_-2px_rgba(5,150,105,0.6)]',
    label: 'Vendita',
    cardAccent: 'before:bg-emerald-600/70',
  },
};

const BADGE_LABELS: Record<string, string> = {
  success: 'Successo',
  error: 'Errore',
  no_seller_found: 'Nessun venditore',
  no_previous_assignment: 'Nessuna assegnazione precedente',
  beyond_lock_period: 'Oltre lock period',
  within_lock_period: 'Entro lock period',
  seller_excluded: 'Venditore escluso',
  seller_inactive: 'Venditore inattivo',
  seller_deleted: 'Venditore eliminato',
  reassigned: 'Riassegnato',
  reassigned_original: 'Riassegnato originale',
  reassigned_round_robin: 'Round Robin',
  round_robin: 'Round Robin',
  duplicate: 'Duplicato',
  skipped: 'Saltato',
  pending: 'In attesa',
  warning: 'Attenzione',
  automation: 'Automatica',
  manual: 'Manuale',
  default: 'Default',
};

const translateBadge = (b: string) => BADGE_LABELS[b] ?? b;

const translateErrorMessage = (msg: string): string => {
  if (!msg) return msg;

  // "Previous seller X is in excluded list"
  const excludedMatch = msg.match(/previous seller\s+(.+?)\s+is in excluded list/i);
  if (excludedMatch) return `Venditore precedente "${excludedMatch[1]}" presente nella lista esclusi`;

  // "Previous seller X is inactive/deleted/disabled"
  const inactiveMatch = msg.match(/previous seller\s+(.+?)\s+is\s+(inactive|deleted|disabled|not active)/i);
  if (inactiveMatch) {
    const stateMap: Record<string, string> = {
      inactive: 'inattivo', deleted: 'eliminato', disabled: 'disattivato', 'not active': 'non attivo'
    };
    return `Venditore precedente "${inactiveMatch[1]}" ${stateMap[inactiveMatch[2].toLowerCase()] || inactiveMatch[2]}`;
  }

  // "Previous seller X not found"
  const notFoundMatch = msg.match(/previous seller\s+(.+?)\s+not found/i);
  if (notFoundMatch) return `Venditore precedente "${notFoundMatch[1]}" non trovato`;

  // No previous assignment
  if (/no previous assignment found/i.test(msg)) return 'Nessuna assegnazione precedente trovata';

  // No seller / venditore
  if (/no (seller|venditore) found/i.test(msg)) return 'Nessun venditore disponibile';
  if (/no active sellers?/i.test(msg)) return 'Nessun venditore attivo disponibile';
  if (/no eligible sellers?/i.test(msg)) return 'Nessun venditore idoneo disponibile';

  // "X days since last assignment exceeds lock period of Y days"
  const lockMatch = msg.match(/(\d+)\s+days?\s+since\s+last\s+assignment\s+exceeds\s+lock\s+period\s+of\s+(\d+)\s+days?/i);
  if (lockMatch) {
    return `Trascorsi ${lockMatch[1]} giorni dall'ultima assegnazione, oltre il lock period di ${lockMatch[2]} giorni`;
  }
  // "X days since last assignment within lock period of Y days"
  const withinMatch = msg.match(/(\d+)\s+days?\s+since\s+last\s+assignment\s+within\s+lock\s+period\s+of\s+(\d+)\s+days?/i);
  if (withinMatch) {
    return `Trascorsi ${withinMatch[1]} giorni dall'ultima assegnazione, entro lock period di ${withinMatch[2]} giorni`;
  }

  // Generic single-word swaps
  if (/already assigned/i.test(msg)) return 'Lead già assegnato';
  if (/lead not found/i.test(msg)) return 'Lead non trovato';
  if (/insufficient leads?/i.test(msg)) return 'Lead insufficienti';
  if (/excluded list/i.test(msg)) return msg.replace(/excluded list/gi, 'lista esclusi');
  if (/lock period/i.test(msg)) return msg.replace(/lock period/gi, 'lock period');
  return msg;
};

const CustomerJourneyTimeline = ({ timeline }: CustomerJourneyTimelineProps) => {
  const formatDate = (dateString: string) =>
    format(new Date(dateString), "dd MMM yyyy 'alle' HH:mm", { locale: it });

  const formatRelative = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { locale: it, addSuffix: true });
    } catch {
      return '';
    }
  };

  const getBadgeVariant = (variant?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (variant) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'success': return <CheckCircle className="h-3 w-3" />;
      case 'error': return <XCircle className="h-3 w-3" />;
      case 'no_seller_found': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Nessun evento per questo lead</p>
      </div>
    );
  }

  // Build summary stats
  const summary = (() => {
    const ingressi = timeline.filter(e => e.type === 'ingresso').length;
    const assegnazioni = timeline.filter(e => e.type === 'assegnazione_manuale').length;
    const calls = timeline.filter(e => e.type === 'call_prenotata').length;
    const issues = timeline.filter(e =>
      e.details?.error_message ||
      (Array.isArray(e.details?.related) && (e.details!.related as TimelineEvent[]).some(s => s.details?.error_message))
    ).length;
    const currentEvent = timeline.find(e => e.details?.isCurrentLead);
    const currentVend = currentEvent?.venditore;
    const currentFonte = currentEvent?.fonte;
    return { ingressi, assegnazioni, calls, issues, currentVend, currentFonte };
  })();

  return (
    <div className="relative pl-1">
      {/* Summary card */}
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/10 border border-border/50">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Ingressi:</span>
            <span className="font-bold text-foreground">{summary.ingressi}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">Assegnazioni:</span>
            <span className="font-bold text-foreground">{summary.assegnazioni}</span>
          </div>
          {summary.calls > 0 && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-muted-foreground">Call:</span>
              <span className="font-bold text-foreground">{summary.calls}</span>
            </div>
          )}
          {summary.issues > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Anomalie:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{summary.issues}</span>
            </div>
          )}
          {summary.currentVend && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-muted-foreground">Stato attuale:</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-semibold text-[11px]">
                {summary.currentVend}
              </span>
              {summary.currentFonte && (
                <span className="text-[11px] text-muted-foreground italic">via {summary.currentFonte}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vertical rail with fade-out top/bottom */}
      <div
        className="absolute left-[14px] w-px"
        style={{
          top: 'var(--rail-top, 90px)',
          bottom: '8px',
          background: 'linear-gradient(180deg, transparent 0%, hsl(var(--border)) 8%, hsl(var(--border)) 92%, transparent 100%)'
        }}
      />

      <ol className="space-y-3">
        {timeline.map((event) => {
          const style = EVENT_STYLE[event.type] || EVENT_STYLE.azione;
          const isCurrentLead = event.details?.isCurrentLead;
          const isSale = event.type === 'vendita';

          return (
            <li key={event.id} className="relative pl-10 group">
              {/* Dot with halo ring */}
              <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full ring-4 ${style.ring} flex items-center justify-center`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.dot}`}>
                  {style.icon}
                </div>
              </div>

              {/* Card */}
              <div
                className={`
                  relative overflow-hidden rounded-xl border bg-card/60 backdrop-blur-sm
                  px-4 py-3 transition-all duration-200
                  before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-full
                  ${style.cardAccent}
                  ${isSale
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] to-transparent'
                    : isCurrentLead
                    ? 'border-primary/40 bg-gradient-to-br from-primary/[0.06] to-transparent shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]'
                    : 'border-border/60 hover:border-border'
                  }
                  group-hover:translate-x-[2px]
                `}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground tracking-tight">
                        {event.title}
                      </span>
                      {isCurrentLead && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider">
                          Corrente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDate(event.date)}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">·</span>
                      <span className="text-[11px] text-muted-foreground/80 italic">
                        {formatRelative(event.date)}
                      </span>
                    </div>
                  </div>

                  {/* Status badge — hide if redundant with error_message */}
                  {event.badge && (() => {
                    const translated = translateBadge(event.badge);
                    const errMsg = event.details?.error_message
                      ? translateErrorMessage(event.details.error_message)
                      : '';
                    const redundant = errMsg && errMsg.toLowerCase().startsWith(translated.toLowerCase());
                    if (redundant) return null;
                    return (
                      <Badge
                        variant={getBadgeVariant(event.badgeVariant)}
                        className="text-[10px] flex items-center gap-1 h-5 shrink-0"
                      >
                        {getResultIcon(event.badge)}
                        {translated}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Body — chips row */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {event.fonte && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium">
                      <Tag className="h-2.5 w-2.5" />
                      {event.fonte}
                    </div>
                  )}

                  {event.venditore && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[11px]">
                      <Users className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {event.type === 'call_prenotata' ? 'Con' :
                         event.type === 'vendita' ? 'Venduto da' : 'A'}
                      </span>
                      <span className="font-semibold text-foreground">{event.venditore}</span>
                    </div>
                  )}

                  {event.details?.historicalVenditore && event.details.historicalVenditore !== event.venditore && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px]">
                      <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                      <span className="text-muted-foreground">Originariamente</span>
                      <span className="font-semibold text-foreground line-through opacity-70">{event.details.historicalVenditore}</span>
                    </div>
                  )}

                  {event.details?.campagna && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-[11px]">
                      <Tag className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Camp.</span>
                      <span className="font-semibold text-foreground">{event.details.campagna}</span>
                    </div>
                  )}

                  {event.type === 'assegnazione_manuale' && typeof event.details?.leads_count === 'number' && event.details.leads_count > 1 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-[11px] text-violet-600 dark:text-violet-400">
                      <Users className="h-2.5 w-2.5" />
                      <span>Bulk di {event.details.leads_count} lead</span>
                    </div>
                  )}

                  {event.type === 'call_prenotata' && event.details?.scheduled_at && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[11px]">
                      <Clock className="h-2.5 w-2.5 text-sky-500" />
                      <span className="text-muted-foreground">Prog.</span>
                      <span className="font-semibold text-foreground">{formatDate(event.details.scheduled_at)}</span>
                    </div>
                  )}
                </div>

                {/* Reassignment arrow */}
                {event.type === 'azione' && event.details?.previous_venditore && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/40">
                    <span className="text-muted-foreground line-through">{event.details.previous_venditore}</span>
                    <span className="text-muted-foreground/60">→</span>
                    <span className="font-semibold text-foreground">{event.venditore || '—'}</span>
                  </div>
                )}

                {/* Sale block */}
                {isSale && (
                  <div className="mt-2.5 p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/25">
                    {event.details?.importo && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium">Importo</span>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          €{Number(event.details.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {event.details?.percorso && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">Percorso:</span>{' '}
                          <span className="font-semibold text-foreground">{event.details.percorso}</span>
                        </div>
                      )}
                      {event.details?.fonte_vendita && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">Fonte vendita:</span>{' '}
                          <span className="font-semibold text-foreground">{event.details.fonte_vendita}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {event.details?.error_message && (
                  <div className="mt-2 text-[11px] text-destructive px-2.5 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{translateErrorMessage(event.details.error_message)}</span>
                  </div>
                )}

                {/* Notes */}
                {event.details?.notes && (
                  <div className="mt-2 text-[11px] text-muted-foreground italic border-l-2 border-border pl-2">
                    "{event.details.notes}"
                  </div>
                )}

                {/* Related (merged) sub-events — filter out redundant noise */}
                {(() => {
                  const allRelated = Array.isArray(event.details?.related)
                    ? (event.details.related as TimelineEvent[])
                    : [];
                  const BENIGN_BADGES = new Set(['success', 'automation', 'manual', 'default']);
                  const usefulRelated = allRelated.filter((sub) => {
                    const hasError = !!sub.details?.error_message;
                    const sameVend = !!sub.venditore && sub.venditore === event.venditore;
                    const sameFonte = !!sub.fonte && sub.fonte === event.fonte;
                    const benign = !sub.badge || BENIGN_BADGES.has(sub.badge);
                    // Drop if no error AND benign badge AND same venditore/fonte (no new info)
                    if (!hasError && benign && (sameVend || sameFonte)) return false;
                    return true;
                  });
                  if (usefulRelated.length === 0) return null;
                  return (
                    <div className="mt-2.5 pt-2.5 border-t border-border/40 space-y-2">
                      {usefulRelated.map((sub) => {
                        const subStyle = EVENT_STYLE[sub.type] || EVENT_STYLE.azione;
                        const subErr = sub.details?.error_message ? translateErrorMessage(sub.details.error_message) : '';
                        const subBadge = sub.badge ? translateBadge(sub.badge) : '';
                        const badgeRedundantWithErr = subErr && subBadge && subErr.toLowerCase().startsWith(subBadge.toLowerCase());
                        const hasIssue = !!subErr;
                        return (
                          <div
                            key={sub.id}
                            className={`flex items-start gap-2 text-[11px] rounded-md px-2 py-1.5 ${
                              hasIssue
                                ? 'bg-amber-500/10 border border-amber-500/25'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${subStyle.dot}`} style={{ boxShadow: 'none' }}>
                              <span className="scale-75">{subStyle.icon}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                              <span className="font-semibold text-foreground/95">{sub.title}</span>
                              {subBadge && !badgeRedundantWithErr && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  hasIssue
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'bg-muted/60 border border-border/50'
                                }`}>{subBadge}</span>
                              )}
                              {subErr && (
                                <span className="text-amber-700 dark:text-amber-300 text-[11px]">{subErr}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default CustomerJourneyTimeline;
