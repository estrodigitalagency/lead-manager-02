
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
import { CheckCircle2, User, Mail, Phone, AlertCircle } from "lucide-react";

interface SearchResult {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
}

interface SearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: SearchResult[];
  searchTerms: string[];
  onConfirm: () => void;
}

const SearchResultsDialog = ({
  open,
  onOpenChange,
  results,
  searchTerms,
  onConfirm
}: SearchResultsDialogProps) => {
  const handleConfirm = () => {
    console.log('SearchResultsDialog - Confirming with results:', results);
    onConfirm();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Trova i termini non trovati
  const foundTerms = new Set();
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
          
          {results.length > 0 && (
            <div className="space-y-2 flex-1 min-h-0">
              <h4 className="text-sm font-medium">Lead trovati e che verranno selezionati ({results.length}):</h4>
              <div className="border rounded-md" style={{ height: '300px' }}>
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3 pr-4">
                    {results.map((result, index) => (
                      <div
                        key={`${result.id}-${index}`}
                        className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30"
                      >
                        <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
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
            <Button onClick={handleConfirm} className="flex-1 sm:flex-none">
              Conferma selezione ({results.length} lead)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchResultsDialog;
