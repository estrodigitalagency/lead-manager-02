import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { getAllCampagne } from "@/services/databaseService";
import { replayAssignment } from "@/services/replayAssignmentService";
import { useMarket } from "@/contexts/MarketContext";

interface AssignmentRecord {
  id: string;
  assigned_at: string;
  leads_count: number;
  venditore: string;
  campagna: string | null;
  fonti_escluse: string[] | null;
  fonti_incluse: string[] | null;
  exclude_from_included: string[] | null;
  source_mode: string | null;
  bypass_time_interval: boolean | null;
}

interface Campaign {
  id: string;
  nome: string;
}

interface ReplayAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentRecord: AssignmentRecord | null;
  onSuccess?: () => void;
}

const ReplayAssignmentDialog = ({ 
  open, 
  onOpenChange, 
  assignmentRecord,
  onSuccess 
}: ReplayAssignmentDialogProps) => {
  const [selectedVenditore, setSelectedVenditore] = useState("");
  const [selectedCampagna, setSelectedCampagna] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { venditori, isLoading: venditoriLoading } = useSalespeopleData();
  const { selectedMarket } = useMarket();

  useEffect(() => {
    if (open) {
      loadCampaigns();
      // Reset form when dialog opens
      setSelectedVenditore("");
      setSelectedCampagna("");
    }
  }, [open]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const campaignsData = await getAllCampagne();
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Errore nel caricamento delle campagne");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplayAssignment = async () => {
    if (!assignmentRecord || !selectedVenditore) {
      toast.error("Seleziona un venditore per continuare");
      return;
    }

    setIsSubmitting(true);

    try {
      await replayAssignment({
        historyId: assignmentRecord.id,
        newVenditore: selectedVenditore,
        newCampagna: selectedCampagna && selectedCampagna !== "none" ? selectedCampagna : undefined
      });
      
      toast.success(`Replay completato: ${assignmentRecord.leads_count} lead assegnati a ${selectedVenditore}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error in replay assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore durante il replay dell'assegnazione";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeVenditori = venditori.filter(v => v.stato === 'attivo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Replay Assegnazione
          </DialogTitle>
        </DialogHeader>

        {assignmentRecord && (
          <div className="space-y-6">
            {/* Assignment Details */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">Dettagli Assegnazione Originale:</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Lead:</span> {assignmentRecord.leads_count}</p>
                <p><span className="font-medium">Venditore originale:</span> {assignmentRecord.venditore}</p>
                <p><span className="font-medium">Campagna originale:</span> {assignmentRecord.campagna || 'Nessuna'}</p>
                <p><span className="font-medium">Data:</span> {new Date(assignmentRecord.assigned_at).toLocaleString('it-IT')}</p>
              </div>
            </div>

            {/* New Assignment Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="venditore">Nuovo Venditore *</Label>
                <Select
                  value={selectedVenditore}
                  onValueChange={setSelectedVenditore}
                  disabled={venditoriLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un venditore" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeVenditori.map((venditore) => (
                      <SelectItem key={venditore.id} value={`${venditore.nome} ${venditore.cognome}`}>
                        {venditore.nome} {venditore.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campagna">Nuova Campagna (Opzionale)</Label>
                <Select
                  value={selectedCampagna}
                  onValueChange={setSelectedCampagna}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una campagna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna campagna</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.nome}>
                        {campaign.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground p-3 bg-primary/10 rounded-lg">
              <p className="font-medium mb-1">Nota:</p>
              <p>Il replay riassegnerà ESATTAMENTE gli stessi {assignmentRecord.leads_count} lead dell'assegnazione originale al nuovo venditore selezionato. I lead verranno prima sbloccati e poi riassegnati.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleReplayAssignment}
            disabled={!selectedVenditore || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Replay Assegnazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplayAssignmentDialog;