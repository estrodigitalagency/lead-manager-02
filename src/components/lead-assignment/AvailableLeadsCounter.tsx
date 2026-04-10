
import { Badge } from "@/components/ui/badge";
import { Users, Filter, Clock, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface AvailableLeadsCounterProps {
  availableLeads: number;
  sourceMode: 'exclude' | 'include';
  excludedSources: string[];
  includedSources: string[];
  excludeFromIncluded: string[];
  bypassTimeInterval: boolean;
  isLoading?: boolean;
}

export function AvailableLeadsCounter({
  availableLeads,
  sourceMode,
  excludedSources,
  includedSources,
  excludeFromIncluded,
  bypassTimeInterval,
  isLoading = false
}: AvailableLeadsCounterProps) {
  const [displayCount, setDisplayCount] = useState(availableLeads);
  const [previousCount, setPreviousCount] = useState(availableLeads);
  const [isUpdating, setIsUpdating] = useState(false);
  const [countTrend, setCountTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (!isLoading) {
      if (availableLeads > previousCount) {
        setCountTrend('up');
      } else if (availableLeads < previousCount) {
        setCountTrend('down');
      } else {
        setCountTrend('stable');
      }

      setPreviousCount(displayCount);
      setDisplayCount(availableLeads);
      setIsUpdating(false);

      const trendTimer = setTimeout(() => {
        setCountTrend('stable');
      }, 2000);

      return () => clearTimeout(trendTimer);
    } else {
      setIsUpdating(true);
    }
  }, [availableLeads, isLoading, previousCount, displayCount]);

  const hasFilters = excludedSources.length > 0 ||
                    includedSources.length > 0 ||
                    excludeFromIncluded.length > 0;

  const getTrendIcon = () => {
    switch (countTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getCountColor = () => {
    if (isLoading || isUpdating) return 'text-primary';

    switch (countTrend) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            Lead Disponibili
          </h3>
          {getTrendIcon()}
        </div>

        <div className={`text-2xl sm:text-3xl font-bold transition-all duration-300 ${getCountColor()}`}>
          {isLoading || isUpdating ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Aggiornamento...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="tabular-nums">{displayCount}</span>
              {countTrend !== 'stable' && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({previousCount > displayCount ? '-' : '+'}{Math.abs(displayCount - previousCount)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Bypass temporale:
            <Badge
              variant={bypassTimeInterval ? "default" : "secondary"}
              className={`ml-2 transition-colors duration-200 ${
                bypassTimeInterval ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''
              }`}
            >
              {bypassTimeInterval ? "ATTIVO" : "Non attivo"}
            </Badge>
          </span>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Filtri attivi:</span>
            <div className="flex flex-wrap gap-1">
              {sourceMode === 'exclude' && excludedSources.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {excludedSources.length} escluse
                </Badge>
              )}
              {sourceMode === 'include' && includedSources.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {includedSources.length} incluse
                </Badge>
              )}
              {excludeFromIncluded.length > 0 && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                  {excludeFromIncluded.length} escluse da incluse
                </Badge>
              )}
            </div>
          </div>
        )}

        {!hasFilters && !bypassTimeInterval && (
          <div className="text-muted-foreground text-xs">
            Nessun filtro attivo - utilizzando criteri standard di assegnabilità
          </div>
        )}
      </div>

      {!isLoading && !isUpdating && displayCount === 0 && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
          Nessun lead disponibile con i filtri attuali
        </div>
      )}

      {(isLoading || isUpdating) && (
        <div className="mt-3 p-2 bg-primary/5 border border-primary/10 rounded-lg text-sm text-primary">
          Aggiornamento conteggio in tempo reale...
        </div>
      )}

      {countTrend !== 'stable' && !isLoading && !isUpdating && (
        <div className={`mt-3 p-2 rounded-lg text-sm ${
          countTrend === 'up'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-destructive/10 border border-destructive/30 text-destructive'
        }`}>
          Conteggio aggiornato: {displayCount} lead disponibili
        </div>
      )}
    </div>
  );
}
