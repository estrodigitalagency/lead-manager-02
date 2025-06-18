
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Filter, Plus, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface SourceFilterProps {
  uniqueSources: string[];
  excludedSources: string[];
  includedSources: string[];
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
  onAddIncludedSource: (source: string) => void;
  onRemoveIncludedSource: (source: string) => void;
}

export function SourceFilter({ 
  uniqueSources, 
  excludedSources,
  includedSources,
  onAddExcludedSource, 
  onRemoveExcludedSource,
  onAddIncludedSource,
  onRemoveIncludedSource
}: SourceFilterProps) {
  const isMobile = useIsMobile();

  const usedSources = [...excludedSources, ...includedSources];
  const availableSources = uniqueSources.filter(source => !usedSources.includes(source));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Filtro per Fonti</h3>
      </div>

      <div className="p-4 border border-border rounded-lg bg-card/50 space-y-6">
        {/* Sezione Fonti da Includere */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">✅ Fonti da Includere</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Info className="h-3 w-3 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Seleziona le fonti da cui vuoi includere i lead. Se vuoto, considererà tutte le fonti.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select onValueChange={onAddIncludedSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aggiungi una fonte da includere..." />
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
                  Nessuna fonte disponibile
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {includedSources.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              {includedSources.map((source) => (
                <Badge 
                  key={source} 
                  variant="default" 
                  className="flex items-center gap-1 text-xs max-w-full px-2 py-1 bg-green-100 text-green-800 hover:bg-green-200"
                >
                  <span className="truncate">{source}</span>
                  <button
                    onClick={() => onRemoveIncludedSource(source)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
                    aria-label={`Rimuovi ${source}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sezione Fonti da Escludere */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">🚫 Fonti da Escludere</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Info className="h-3 w-3 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Seleziona le fonti da escludere dall'assegnazione. Vengono applicate dopo l'inclusione.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select onValueChange={onAddExcludedSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aggiungi una fonte da escludere..." />
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
                  Nessuna fonte disponibile
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {excludedSources.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              {excludedSources.map((source) => (
                <Badge 
                  key={source} 
                  variant="destructive" 
                  className="flex items-center gap-1 text-xs max-w-full px-2 py-1"
                >
                  <span className="truncate">{source}</span>
                  <button
                    onClick={() => onRemoveExcludedSource(source)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
                    aria-label={`Rimuovi ${source}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
