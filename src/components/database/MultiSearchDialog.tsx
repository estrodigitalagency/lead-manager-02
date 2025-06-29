
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

interface MultiSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allItems: any[];
  onItemsSelected: (selectedIds: string[]) => void;
}

const MultiSearchDialog = ({
  open,
  onOpenChange,
  allItems,
  onItemsSelected
}: MultiSearchDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchText.trim()) {
      toast.error("Inserisci almeno un'email o numero di telefono");
      return;
    }

    setIsSearching(true);

    try {
      // Separa i valori per virgola e pulisce gli spazi
      const searchTerms = searchText
        .split(',')
        .map(term => term.trim().toLowerCase())
        .filter(term => term.length > 0);

      if (searchTerms.length === 0) {
        toast.error("Nessun termine di ricerca valido trovato");
        setIsSearching(false);
        return;
      }

      console.log('Search terms:', searchTerms);
      console.log('All items count:', allItems.length);
      console.log('Sample item:', allItems[0]);

      // Cerca i lead che corrispondono ai termini di ricerca
      const matchedItems = allItems.filter(item => {
        const email = (item.email || '').toLowerCase().trim();
        const telefono = (item.telefono || '').toLowerCase().trim();
        
        // Verifica se qualche termine di ricerca corrisponde esattamente all'email o telefono
        const emailMatch = searchTerms.some(term => term === email);
        const phoneMatch = searchTerms.some(term => term === telefono);
        
        return emailMatch || phoneMatch;
      });

      console.log('Matched items:', matchedItems);

      if (matchedItems.length === 0) {
        // Mostra dettagliato quale ricerca non ha dato risultati
        console.log('No matches found. Checking individual terms:');
        searchTerms.forEach(term => {
          const termMatches = allItems.filter(item => {
            const email = (item.email || '').toLowerCase().trim();
            const telefono = (item.telefono || '').toLowerCase().trim();
            return term === email || term === telefono;
          });
          console.log(`Term "${term}" matches:`, termMatches.length);
        });
        
        toast.error(`Nessun lead trovato per i termini di ricerca specificati`);
      } else {
        const selectedIds = matchedItems.map(item => item.id);
        onItemsSelected(selectedIds);
        toast.success(`${matchedItems.length} lead selezionati automaticamente`);
        
        // Chiudi il dialog e resetta il form
        onOpenChange(false);
        setSearchText("");
      }
    } catch (error) {
      console.error("Errore durante la ricerca multipla:", error);
      toast.error("Errore durante la ricerca");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancel = () => {
    setSearchText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {isSearching ? "Ricerca..." : "Cerca e Seleziona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSearchDialog;
