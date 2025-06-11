
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface AssignmentFormProps {
  numLead: string;
  setNumLead: (value: string) => void;
  venditore: string;
  setVenditore: (value: string) => void;
  campagna: string;
  setCampagna: (value: string) => void;
  salespeople: { id: string; nome: string; cognome: string; }[];
  campagne: { id: string; nome: string; descrizione?: string; }[];
  isSubmitting: boolean;
  availableLeads: number;
  onAssign: () => Promise<void>;
  showButton?: boolean;
  showOnlyButton?: boolean;
  showOnlyCampaign?: boolean;
}

export function AssignmentForm({
  numLead,
  setNumLead,
  venditore,
  setVenditore,
  campagna,
  setCampagna,
  salespeople,
  campagne,
  isSubmitting,
  availableLeads,
  onAssign,
  showButton = true,
  showOnlyButton = false,
  showOnlyCampaign = false
}: AssignmentFormProps) {
  const isMobile = useIsMobile();

  if (showOnlyButton) {
    return (
      <Button 
        onClick={onAssign} 
        disabled={isSubmitting || !venditore || !numLead || parseInt(numLead) <= 0 || parseInt(numLead) > availableLeads}
        className="w-full mt-6 text-sm sm:text-base py-2 sm:py-3"
      >
        {isSubmitting ? "Assegnazione in corso..." : "Assegna Lead"}
      </Button>
    );
  }

  if (showOnlyCampaign) {
    return (
      <div className="space-y-2">
        <Label htmlFor="campagna" className="text-sm font-medium">Campagna</Label>
        <Select value={campagna} onValueChange={setCampagna}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona una campagna" />
          </SelectTrigger>
          <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
            {campagne.map((camp) => (
              <SelectItem 
                key={camp.id} 
                value={camp.nome}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{camp.nome}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="numLead" className="text-sm font-medium">Numero di Lead</Label>
        <Input
          id="numLead"
          type="number"
          min="1"
          max={availableLeads}
          value={numLead}
          onChange={(e) => setNumLead(e.target.value)}
          placeholder="Inserisci numero"
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="venditore" className="text-sm font-medium">Venditore</Label>
        <Select value={venditore} onValueChange={setVenditore}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona venditore" />
          </SelectTrigger>
          <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
            {salespeople.map((person) => {
              const fullName = `${person.nome} ${person.cognome}`;
              return (
                <SelectItem 
                  key={person.id} 
                  value={fullName}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{fullName}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {showButton && (
        <Button 
          onClick={onAssign} 
          disabled={isSubmitting || !venditore || !numLead || parseInt(numLead) <= 0 || parseInt(numLead) > availableLeads}
          className="w-full mt-6 text-sm sm:text-base py-2 sm:py-3"
        >
          {isSubmitting ? "Assegnazione in corso..." : "Assegna Lead"}
        </Button>
      )}
    </>
  );
}
