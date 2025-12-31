import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AlreadyAssignedLead {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  venditore: string;
}

export type GroupAssignmentChoice = 'target' | 'original';

export interface GroupAssignmentDecisions {
  [originalVenditore: string]: GroupAssignmentChoice;
}

interface AlreadyAssignedLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAssignedLeads: AlreadyAssignedLead[];
  targetVenditore: string;
  onConfirmAssignments: (decisions: GroupAssignmentDecisions) => void;
  isProcessing?: boolean;
}

export function AlreadyAssignedLeadsDialog({
  open,
  onOpenChange,
  alreadyAssignedLeads,
  targetVenditore,
  onConfirmAssignments,
  isProcessing = false,
}: AlreadyAssignedLeadsDialogProps) {
  // Group leads by their original salesperson
  const leadsByVenditore = alreadyAssignedLeads.reduce((acc, lead) => {
    const venditore = lead.venditore;
    if (!acc[venditore]) {
      acc[venditore] = [];
    }
    acc[venditore].push(lead);
    return acc;
  }, {} as Record<string, AlreadyAssignedLead[]>);

  const totalLeads = alreadyAssignedLeads.length;
  const venditori = Object.keys(leadsByVenditore);

  // State for each group's decision - default to 'original'
  const [decisions, setDecisions] = useState<GroupAssignmentDecisions>({});

  // Initialize decisions when dialog opens or leads change
  useEffect(() => {
    if (open && venditori.length > 0) {
      const initialDecisions: GroupAssignmentDecisions = {};
      venditori.forEach(v => {
        initialDecisions[v] = 'original';
      });
      setDecisions(initialDecisions);
    }
  }, [open, alreadyAssignedLeads]);

  const handleDecisionChange = (venditore: string, choice: GroupAssignmentChoice) => {
    setDecisions(prev => ({
      ...prev,
      [venditore]: choice
    }));
  };

  const handleAssignAllToTarget = () => {
    const allToTarget: GroupAssignmentDecisions = {};
    venditori.forEach(v => {
      allToTarget[v] = 'target';
    });
    onConfirmAssignments(allToTarget);
  };

  const handleConfirm = () => {
    onConfirmAssignments(decisions);
  };

  const targetFirstName = targetVenditore.split(' ')[0];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Lead già assegnati rilevati
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                I seguenti <strong>{totalLeads} lead</strong> risultano precedentemente 
                assegnati ad {venditori.length === 1 ? 'un altro venditore' : 'altri venditori'}.
              </p>
              <p className="text-sm text-muted-foreground">
                Per ogni gruppo, scegli a chi assegnarli:
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="max-h-[350px] rounded-md border p-3">
          <div className="space-y-5">
            {venditori.map((venditoreOriginale) => (
              <div key={venditoreOriginale} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {venditoreOriginale}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {leadsByVenditore[venditoreOriginale].length} lead
                  </Badge>
                </div>
                
                {/* Lead list preview */}
                <ul className="ml-6 text-sm text-muted-foreground space-y-1">
                  {leadsByVenditore[venditoreOriginale].slice(0, 3).map((lead) => (
                    <li key={lead.id}>
                      {lead.nome} {lead.cognome || ''} 
                      {lead.email && <span className="text-xs"> ({lead.email})</span>}
                    </li>
                  ))}
                  {leadsByVenditore[venditoreOriginale].length > 3 && (
                    <li className="italic">
                      ...e altri {leadsByVenditore[venditoreOriginale].length - 3} lead
                    </li>
                  )}
                </ul>

                {/* Choice radio group */}
                <RadioGroup
                  value={decisions[venditoreOriginale] || 'original'}
                  onValueChange={(value) => handleDecisionChange(venditoreOriginale, value as GroupAssignmentChoice)}
                  className="ml-6 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="original" id={`${venditoreOriginale}-original`} />
                    <Label 
                      htmlFor={`${venditoreOriginale}-original`} 
                      className="text-sm cursor-pointer flex items-center gap-1"
                    >
                      Riassegna a <span className="font-medium text-amber-600">{venditoreOriginale.split(' ')[0]}</span>
                      <span className="text-muted-foreground">(originale)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="target" id={`${venditoreOriginale}-target`} />
                    <Label 
                      htmlFor={`${venditoreOriginale}-target`} 
                      className="text-sm cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRight className="h-3 w-3" />
                      Assegna a <span className="font-medium text-primary">{targetFirstName}</span>
                      <span className="text-muted-foreground">(nuovo)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              onClick={handleAssignAllToTarget}
              disabled={isProcessing}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isProcessing ? "Elaborazione..." : `Assegna tutti a ${targetFirstName}`}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              variant="secondary"
              className="flex-1"
            >
              {isProcessing ? "Elaborazione..." : "Conferma selezioni"}
            </Button>
          </div>
          <AlertDialogCancel disabled={isProcessing} className="w-full sm:w-auto mt-0">
            Annulla
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
