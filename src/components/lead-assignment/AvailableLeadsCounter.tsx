
import { Badge } from "@/components/ui/badge";
import { Users, Filter, Clock, RefreshCw } from "lucide-react";
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
  const [isUpdating, setIsUpdating] = useState(false);

  // Update display count immediately when availableLeads changes
  useEffect(() => {
    if (!isLoading) {
      setDisplayCount(availableLeads);
      setIsUpdating(false);
    } else {
      setIsUpdating(true);
    }
  }, [availableLeads, isLoading]);

  const hasFilters = excludedSources.length > 0 || 
                    includedSources.length > 0 || 
                    excludeFromIncluded.length > 0;

  return (
    <div className="p-4 border border-blue-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-blue-800">
            Lead Disponibili per Assegnazione
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold transition-all duration-200 ${
            isLoading || isUpdating ? 'text-blue-500' : 'text-blue-700'
          }`}>
            {isLoading || isUpdating ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="text-lg">Aggiornamento...</span>
              </div>
            ) : (
              <span className="tabular-nums">{displayCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stato dei filtri attivi */}
      <div className="space-y-2 text-sm">
        {/* Controllo temporale */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">
            Bypass temporale: 
            <Badge variant={bypassTimeInterval ? "default" : "secondary"} className="ml-2">
              {bypassTimeInterval ? "ATTIVO" : "Non attivo"}
            </Badge>
          </span>
        </div>

        {/* Filtri fonte */}
        {hasFilters && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">Filtri attivi:</span>
            <div className="flex flex-wrap gap-1">
              {sourceMode === 'exclude' && excludedSources.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  🚫 {excludedSources.length} escluse
                </Badge>
              )}
              {sourceMode === 'include' && includedSources.length > 0 && (
                <Badge variant="default" className="text-xs">
                  ✅ {includedSources.length} incluse
                </Badge>
              )}
              {excludeFromIncluded.length > 0 && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
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

      {/* Messaggio se non ci sono lead disponibili */}
      {!isLoading && !isUpdating && displayCount === 0 && (
        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
          ⚠️ Nessun lead disponibile con i filtri attuali
        </div>
      )}

      {/* Indicatore di aggiornamento in tempo reale */}
      {(isLoading || isUpdating) && (
        <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-800">
          🔄 Aggiornamento conteggio in corso...
        </div>
      )}
    </div>
  );
}
