
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, User, Mail, Phone, AlertCircle, Tag, Filter } from "lucide-react";
import FonteDisplay from "./FonteDisplay";

interface SearchResult {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ultima_fonte?: string;
}

interface SearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: SearchResult[];
  searchTerms: string[];
  onConfirm: (selectedIds: string[]) => void;
}

const SearchResultsDialog = ({
  open,
  onOpenChange,
  results,
  searchTerms,
  onConfirm
}: SearchResultsDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFonti, setSelectedFonti] = useState<Set<string>>(new Set());

  // Extract unique fonti from results
  const uniqueFonti = useMemo(() => {
    const fonti = new Set<string>();
    results.forEach(r => {
      if (r.ultima_fonte) fonti.add(r.ultima_fonte);
    });
    return Array.from(fonti).sort();
  }, [results]);

  // Initialize all selected when results change
  useMemo(() => {
    setSelectedIds(new Set(results.map(r => r.id)));
    setSelectedFonti(new Set());
  }, [results]);

  // Filter results by selected fonti
  const filteredResults = useMemo(() => {
    if (selectedFonti.size === 0) return results;
    return results.filter(r => r.ultima_fonte && selectedFonti.has(r.ultima_fonte));
  }, [results, selectedFonti]);

  const toggleFonte = (fonte: string) => {
    setSelectedFonti(prev => {
      const next = new Set(prev);
      if (next.has(fonte)) {
        next.delete(fonte);
      } else {
        next.add(fonte);
      }
      return next;
    });
    // When fonte filter changes, auto-select all visible results
    setTimeout(() => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        // We'll handle this in an effect-like way below
        return next;
      });
    }, 0);
  };

  // Auto-update selection when fonte filter changes
  useMemo(() => {
    setSelectedIds(new Set(filteredResults.map(r => r.id)));
  }, [filteredResults]);

  const toggleLeadSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    }
  };

  const handleConfirm = () => {
    const ids = Array.from(selectedIds);
    console.log('SearchResultsDialog - Confirming with IDs:', ids);
    onConfirm(ids);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Trova i termini non trovati
  const foundTerms = new Set<string>();
  results.forEach(result => {
    if (result.email && searchTerms.includes(result.email.toLowerCase())) {
      foundTerms.add(result.email.toLowerCase());
    }
    if (result.telefono && searchTerms.includes(result.telefono.toLowerCase())) {
      foundTerms.add(result.telefono.toLowerCase());
    }
  });
  
  const notFoundTerms = searchTerms.filter(term => !foundTerms.has(term));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Risultati Ricerca Multipla
          </DialogTitle>
          <DialogDescription>
            Trovati {results.length} lead corrispondenti ai termini di ricerca.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 space-y-4 py-4 min-h-0 overflow-y-auto">
          <div className="space-y-2 flex-shrink-0">
            <h4 className="text-sm font-medium">Termini di ricerca utilizzati:</h4>
            <div className="flex flex-wrap gap-2">
              {searchTerms.map((term, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {term}
                </Badge>
              ))}
            </div>
          </div>

          {notFoundTerms.length > 0 && (
            <div className="space-y-2 flex-shrink-0">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Lead non trovati ({notFoundTerms.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {notFoundTerms.map((term, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Fonte filter */}
          {uniqueFonti.length > 1 && (
            <div className="space-y-2 flex-shrink-0">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtra per fonte:
              </h4>
              <div className="flex flex-wrap gap-2">
                {uniqueFonti.map(fonte => (
                  <Badge
                    key={fonte}
                    variant={selectedFonti.has(fonte) ? "default" : "outline"}
                    className="cursor-pointer text-xs transition-colors"
                    onClick={() => toggleFonte(fonte)}
                  >
                    <FonteDisplay fonte={fonte} />
                  </Badge>
                ))}
                {selectedFonti.size > 0 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedFonti(new Set())}
                  >
                    Mostra tutti
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {filteredResults.length > 0 && (
            <div className="space-y-2 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Lead da selezionare ({selectedIds.size}/{filteredResults.length}):
                </h4>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                  {selectedIds.size === filteredResults.length ? "Deseleziona tutti" : "Seleziona tutti"}
                </Button>
              </div>
              <div className="border rounded-md" style={{ height: '300px' }}>
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3 pr-4">
                    {filteredResults.map((result, index) => (
                      <div
                        key={`${result.id}-${index}`}
                        className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          selectedIds.has(result.id) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                        }`}
                        onClick={() => toggleLeadSelection(result.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(result.id)}
                          onCheckedChange={() => toggleLeadSelection(result.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {result.nome} {result.cognome}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {result.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{result.email}</span>
                              </div>
                            )}
                            {result.telefono && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{result.telefono}</span>
                              </div>
                            )}
                            {result.ultima_fonte && (
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3 flex-shrink-0" />
                                <FonteDisplay fonte={result.ultima_fonte} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 sm:justify-end">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
              Annulla
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={selectedIds.size === 0}
              className="flex-1 sm:flex-none"
            >
              Conferma selezione ({selectedIds.size} lead)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchResultsDialog;
