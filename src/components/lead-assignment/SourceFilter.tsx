
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Filter, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

interface SourceFilterProps {
  uniqueSources: string[];
  excludedSources: string[];
  includedSources: string[];
  sourceMode: 'exclude' | 'include';
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
  onAddIncludedSource: (source: string) => void;
  onRemoveIncludedSource: (source: string) => void;
  onToggleSourceMode: (mode: 'exclude' | 'include') => void;
}

export function SourceFilter({ 
  uniqueSources, 
  excludedSources,
  includedSources,
  sourceMode,
  onAddExcludedSource, 
  onRemoveExcludedSource,
  onAddIncludedSource,
  onRemoveIncludedSource,
  onToggleSourceMode
}: SourceFilterProps) {
  const isMobile = useIsMobile();

  const currentSources = sourceMode === 'exclude' ? excludedSources : includedSources;
  const availableSources = uniqueSources.filter(source => !currentSources.includes(source));

  const handleAddSource = (sourceName: string) => {
    if (sourceMode === 'exclude') {
      onAddExcludedSource(sourceName);
    } else {
      onAddIncludedSource(sourceName);
    }
  };

  const handleRemoveSource = (sourceName: string) => {
    if (sourceMode === 'exclude') {
      onRemoveExcludedSource(sourceName);
    } else {
      onRemoveIncludedSource(sourceName);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Filtro per Fonti</h3>
      </div>

      {/* Mode Toggle with clearer explanation */}
      <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Modalità di Filtro</Label>
          <div className="flex items-center space-x-3">
            <span className={`text-sm px-2 py-1 rounded ${
              sourceMode === 'exclude' 
                ? 'bg-red-100 text-red-700 font-medium' 
                : 'text-gray-500'
            }`}>
              🚫 Escludi
            </span>
            <Switch
              checked={sourceMode === 'include'}
              onCheckedChange={(checked) => onToggleSourceMode(checked ? 'include' : 'exclude')}
            />
            <span className={`text-sm px-2 py-1 rounded ${
              sourceMode === 'include' 
                ? 'bg-green-100 text-green-700 font-medium' 
                : 'text-gray-500'
            }`}>
              ✅ Includi
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
          {sourceMode === 'exclude' 
            ? "🚫 Modalità ESCLUSIONE: Le fonti selezionate verranno escluse dall'assegnazione. Tutti gli altri lead verranno considerati."
            : "✅ Modalità INCLUSIONE: Verranno assegnati SOLO i lead dalle fonti selezionate. Tutte le altre fonti verranno ignorate."
          }
        </div>
      </div>

      {/* Source Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-gray-600" />
          <Label className="text-sm font-medium">
            {sourceMode === 'exclude' ? 'Aggiungi Fonte da Escludere' : 'Aggiungi Fonte da Includere'}
          </Label>
        </div>
        
        <Select onValueChange={handleAddSource}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={
              sourceMode === 'exclude' 
                ? "Seleziona una fonte da escludere..." 
                : "Seleziona una fonte da includere..."
            } />
          </SelectTrigger>
          <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
            {availableSources.length > 0 ? (
              availableSources.map((source) => (
                <SelectItem 
                  key={source} 
                  value={source}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{source}</span>
                </SelectItem>
              ))
            ) : (
              <SelectItem disabled value="no-sources">
                {currentSources.length > 0 ? "Nessuna fonte disponibile" : "Nessuna fonte trovata"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Selected Sources */}
        {currentSources.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {sourceMode === 'exclude' 
                ? `🚫 Fonti Escluse (${currentSources.length})` 
                : `✅ Fonti Incluse (${currentSources.length})`
              }
            </Label>
            <div className="flex flex-wrap gap-2 p-3 bg-white border rounded-lg">
              {currentSources.map((source) => (
                <Badge 
                  key={source} 
                  variant={sourceMode === 'exclude' ? 'destructive' : 'default'} 
                  className="flex items-center gap-1 text-xs max-w-full px-2 py-1"
                >
                  <span className="truncate">{source}</span>
                  <button
                    onClick={() => handleRemoveSource(source)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
                    aria-label={`Rimuovi ${source}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {currentSources.length === 0 && (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border">
            {sourceMode === 'exclude' 
              ? "📝 Nessuna fonte esclusa. Verranno considerati lead da tutte le fonti disponibili."
              : "📝 Nessuna fonte selezionata. Seleziona almeno una fonte per attivare il filtro di inclusione."
            }
          </div>
        )}
      </div>
    </div>
  );
}
