
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface ExcludedSourcesProps {
  uniqueSources: string[];
  excludedSources: string[];
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
}

export function ExcludedSources({ 
  uniqueSources, 
  excludedSources, 
  onAddExcludedSource, 
  onRemoveExcludedSource 
}: ExcludedSourcesProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Escludi Fonti</Label>
      <Select onValueChange={onAddExcludedSource}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleziona fonte da escludere" />
        </SelectTrigger>
        <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
          {uniqueSources
            .filter(source => !excludedSources.includes(source))
            .map((source) => (
            <SelectItem 
              key={source} 
              value={source}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <span className="truncate">{source}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {excludedSources.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {excludedSources.map((source) => (
            <Badge key={source} variant="secondary" className="flex items-center gap-1 text-xs max-w-full">
              <span className="truncate">{source}</span>
              <button
                onClick={() => onRemoveExcludedSource(source)}
                className="ml-1 hover:text-destructive flex-shrink-0"
                aria-label={`Rimuovi ${source}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
