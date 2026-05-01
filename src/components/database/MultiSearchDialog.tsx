
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SearchResultsDialog from "./SearchResultsDialog";

interface MultiSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsSelected: (selectedIds: string[]) => void;
}

interface SearchResult {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ultima_fonte?: string;
  created_at?: string;
  venditore?: string | null;
  data_assegnazione?: string | null;
}

const MultiSearchDialog = ({
  open,
  onOpenChange,
  onItemsSelected
}: MultiSearchDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      toast.error("Inserisci almeno un'email o numero di telefono");
      return;
    }

    setIsSearching(true);

    try {
      // Separa i valori per virgola e pulisce gli spazi
      const terms = searchText
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);

      if (terms.length === 0) {
        toast.error("Nessun termine di ricerca valido trovato");
        setIsSearching(false);
        return;
      }

      setSearchTerms(terms);
      console.log('Search terms:', terms);

      // Costruisci le condizioni OR per email e telefono
      const emailConditions = terms.map(term => `email.eq.${term}`).join(',');
      const phoneConditions = terms.map(term => `telefono.eq.${term}`).join(',');
      
      // Cerca tutti i match ordinati dal più recente, poi tieni solo il più recente per ogni termine
      const { data: matchedItems, error } = await supabase
        .from('lead_generation')
        .select('id, email, telefono, nome, cognome, ultima_fonte, created_at, venditore, data_assegnazione')
        .or(`${emailConditions},${phoneConditions}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database search error:', error);
        throw error;
      }

      console.log('Matched items from database:', matchedItems);

      if (!matchedItems || matchedItems.length === 0) {
        toast.error(`Nessun lead trovato per i termini di ricerca specificati`);
        setSearchResults([]);
      } else {
        // Per ogni termine, tieni solo il lead più recente (primo match dato l'ORDER BY DESC)
        const termsSet = new Set(terms);
        const claimedTerms = new Set<string>();
        const seenIds = new Set<string>();
        const uniqueResults: SearchResult[] = [];

        for (const item of matchedItems as SearchResult[]) {
          if (seenIds.has(item.id)) continue;

          const itemEmail = (item.email || '').trim().toLowerCase();
          const itemTel = (item.telefono || '').trim().toLowerCase();
          const matchedTerms: string[] = [];
          if (itemEmail && termsSet.has(itemEmail)) matchedTerms.push(itemEmail);
          if (itemTel && termsSet.has(itemTel)) matchedTerms.push(itemTel);

          // Salta se tutti i termini matchati sono già stati coperti da un lead più recente
          if (matchedTerms.length === 0) continue;
          const novelTerms = matchedTerms.filter(t => !claimedTerms.has(t));
          if (novelTerms.length === 0) continue;

          novelTerms.forEach(t => claimedTerms.add(t));
          seenIds.add(item.id);
          uniqueResults.push(item);

          if (claimedTerms.size === termsSet.size) break;
        }

        console.log('Unique results (most recent per term):', uniqueResults);
        setSearchResults(uniqueResults);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Errore durante la ricerca multipla:", error);
      toast.error("Errore durante la ricerca");
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmSelection = (selectedIds: string[]) => {
    console.log('Confirming selection with IDs:', selectedIds);
    onItemsSelected(selectedIds);
    toast.success(`${selectedIds.length} lead selezionati automaticamente`);
    
    // Reset e chiudi
    setSearchText("");
    setSearchResults([]);
    setSearchTerms([]);
    setShowResults(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSearchText("");
    setSearchResults([]);
    setSearchTerms([]);
    setShowResults(false);
    onOpenChange(false);
  };

  const handleResultsDialogClose = () => {
    setShowResults(false);
  };

  return (
    <>
      <Dialog open={open && !showResults} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Ricerca Multipla Lead
            </DialogTitle>
            <DialogDescription>
              Inserisci email e/o numeri di telefono separati da virgola per selezionare automaticamente i lead corrispondenti.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-terms">
                Email e/o Numeri di Telefono
              </Label>
              <Textarea
                id="search-terms"
                placeholder="esempio@email.com, +393331234567, altro@email.com, 3334567890"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• Separa più termini con virgole</p>
              <p>• La ricerca cerca corrispondenze esatte</p>
              <p>• Vengono cercati sia email che numeri di telefono</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Annulla
            </Button>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchText.trim()}
            >
              {isSearching ? "Ricerca..." : "Cerca Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchResultsDialog
        open={showResults}
        onOpenChange={handleResultsDialogClose}
        results={searchResults}
        searchTerms={searchTerms}
        onConfirm={handleConfirmSelection}
      />
    </>
  );
};

export default MultiSearchDialog;
