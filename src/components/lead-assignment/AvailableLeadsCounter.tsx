
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

  // Update display count with smooth transition
  useEffect(() => {
    if (!isLoading) {
      // Determina il trend del cambiamento
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

      // Reset trend dopo 2 secondi
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
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getCountColor = () => {
    if (isLoading || isUpdating) return 'text-blue-500';
    
    switch (countTrend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className="p-4 border border-blue-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-blue-800">
            Lead Disponibili per Assegnazione
          </h3>
          {getTrendIcon()}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold transition-all duration-300 ${getCountColor()}`}>
            {isLoading || isUpdating ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="text-lg">Aggiornamento...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="tabular-nums">{displayCount}</span>
                {countTrend !== 'stable' && (
                  <span className="text-sm font-normal text-gray-500">
                    ({previousCount > displayCount ? '-' : '+'}{Math.abs(displayCount - previousCount)})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stato filtri attivi con indicatori di cambiamento */}
      <div className="space-y-2 text-sm">
        {/* Controllo temporale */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">
            Bypass temporale: 
            <Badge 
              variant={bypassTimeInterval ? "default" : "secondary"} 
              className={`ml-2 transition-colors duration-200 ${
                bypassTimeInterval ? 'bg-green-100 text-green-800 border-green-300' : ''
              }`}
            >
              {bypassTimeInterval ? "ATTIVO" : "Non attivo"}
            </Badge>
          </span>
        </div>

        {/* Filtri fonte con indicatori real-time */}
        {hasFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">Filtri attivi:</span>
            <div className="flex flex-wrap gap-1">
              {sourceMode === 'exclude' && excludedSources.length > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  🚫 {excludedSources.length} escluse
                </Badge>
              )}
              {sourceMode === 'include' && includedSources.length > 0 && (
                <Badge variant="default" className="text-xs animate-pulse">
                  ✅ {includedSources.length} incluse
                </Badge>
              )}
              {excludeFromIncluded.length > 0 && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 animate-pulse">
                  ➖ {excludeFromIncluded.length} escluse da incluse
                </Badge>
              )}
            </div>
          </div>
        )}

        {!hasFilters && !bypassTimeInterval && (
          <div className="text-gray-600 text-xs">
            Nessun filtro attivo - utilizzando criteri standard di assegnabilità
          </div>
        )}
      </div>

      {/* Messaggi di stato con migliore UX */}
      {!isLoading && !isUpdating && displayCount === 0 && (
        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800 animate-pulse">
          ⚠️ Nessun lead disponibile con i filtri attuali
        </div>
      )}

      {/* Indicatore di aggiornamento in tempo reale */}
      {(isLoading || isUpdating) && (
        <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800 animate-pulse">
          🔄 Aggiornamento conteggio in tempo reale...
        </div>
      )}

      {/* Indicatore di successo aggiornamento */}
      {countTrend !== 'stable' && !isLoading && !isUpdating && (
        <div className={`mt-3 p-2 rounded text-sm animate-pulse ${
          countTrend === 'up' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          {countTrend === 'up' ? '📈' : '📉'} Conteggio aggiornato: {displayCount} lead disponibili
        </div>
      )}
    </div>
  );
}
