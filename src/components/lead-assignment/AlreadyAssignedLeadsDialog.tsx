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
import { AlertTriangle, UserCheck } from "lucide-react";

export interface AlreadyAssignedLead {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  venditore: string;
}

interface AlreadyAssignedLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAssignedLeads: AlreadyAssignedLead[];
  targetVenditore: string;
  onContinueWithAll: () => void;
  onAssignToOriginal: () => void;
  isProcessing?: boolean;
}

export function AlreadyAssignedLeadsDialog({
  open,
  onOpenChange,
  alreadyAssignedLeads,
  targetVenditore,
  onContinueWithAll,
  onAssignToOriginal,
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
                assegnati ad {venditori.length === 1 ? 'un altro venditore' : 'altri venditori'}:
              </p>
              
              <ScrollArea className="max-h-[200px] rounded-md border p-3">
                <div className="space-y-4">
                  {venditori.map((venditoreOriginale) => (
                    <div key={venditoreOriginale} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {venditoreOriginale}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {leadsByVenditore[venditoreOriginale].length} lead
                        </Badge>
                      </div>
                      <ul className="ml-6 text-sm text-muted-foreground space-y-1">
                        {leadsByVenditore[venditoreOriginale].slice(0, 5).map((lead) => (
                          <li key={lead.id}>
                            {lead.nome} {lead.cognome || ''} 
                            {lead.email && <span className="text-xs"> ({lead.email})</span>}
                          </li>
                        ))}
                        {leadsByVenditore[venditoreOriginale].length > 5 && (
                          <li className="italic">
                            ...e altri {leadsByVenditore[venditoreOriginale].length - 5} lead
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <p className="font-medium">Cosa preferisci fare?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isProcessing}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAssignToOriginal}
            disabled={isProcessing}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isProcessing ? "Elaborazione..." : "Riassegna al venditore originale"}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onContinueWithAll}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? "Elaborazione..." : `Assegna tutti a ${targetVenditore.split(' ')[0]}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
