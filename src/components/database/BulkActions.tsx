import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { deleteMultipleLeads, getAllFilteredIds } from "@/services/databaseService";
import { supabase } from "@/integrations/supabase/client";
import { useMarket } from "@/contexts/MarketContext";
import ManualAssignmentDialog from "./ManualAssignmentDialog";

interface BulkActionsProps {
  selectedItems: string[];
  allItems: any[];
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
  onSelectionChange: (selected: string[]) => void;
  onRefresh: () => void;
  filters?: Record<string, any>;
  totalCount?: number;
}

const BulkActions = ({
  selectedItems,
  allItems,
  tableName,
  onSelectionChange,
  onRefresh,
  filters,
  totalCount
}: BulkActionsProps) => {
  const { selectedMarket } = useMarket();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManualAssignDialog, setShowManualAssignDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [fetchedTotal, setFetchedTotal] = useState<number | null>(null);

  const isServerPaginated = allItems.length === 0;
  const effectiveTotal = isServerPaginated
    ? (totalCount ?? fetchedTotal ?? 0)
    : allItems.length;

  // Fetch count filtrato quando server-paginated e parent non fornisce totalCount
  useEffect(() => {
    if (!isServerPaginated || totalCount !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        let q: any = supabase.from(tableName).select('id', { count: 'exact', head: true });
        if (selectedMarket === 'IT') {
          q = q.or('market.eq.IT,market.is.null');
        } else {
          q = q.eq('market', selectedMarket);
        }
        if (filters) {
          if (filters.search) {
            const s = String(filters.search).trim();
            q = q.or(`nome.ilike.%${s}%,cognome.ilike.%${s}%,email.ilike.%${s}%,telefono.ilike.%${s}%`);
          } else {
            if (filters.nome) q = q.ilike('nome', `%${filters.nome}%`);
            if (filters.email) q = q.ilike('email', `%${filters.email}%`);
            if (filters.telefono) q = q.ilike('telefono', `%${filters.telefono}%`);
          }
          if (filters.venditore) q = q.ilike('venditore', `%${filters.venditore}%`);
          if (filters.campagna) q = q.ilike('campagna', `%${filters.campagna}%`);
          if (filters.esito) q = q.ilike('esito', `%${filters.esito}%`);
          const fonteCol = tableName === 'lead_generation' ? 'ultima_fonte' : 'fonte';
          if (filters.fontiIncluse?.length > 0) {
            q = q.or(filters.fontiIncluse.map((f: string) => `${fonteCol}.ilike.${f}`).join(','));
          }
          if (filters.fontiEscluse?.length > 0) {
            filters.fontiEscluse.forEach((f: string) => { q = q.not(fonteCol, 'ilike', f); });
          }
          if (filters.bookedCall && filters.bookedCall !== 'all') q = q.eq('booked_call', filters.bookedCall);
          if (filters.venditaChiusa === true) q = q.eq('vendita_chiusa', true);
        }
        const { count, error } = await q;
        if (!cancelled && !error) setFetchedTotal(count || 0);
      } catch (e) {
        console.error('Errore fetch count BulkActions:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [tableName, selectedMarket, JSON.stringify(filters), isServerPaginated, totalCount]);

  // Deseleziona tutto quando cambiano i filtri (evita stato stale)
  useEffect(() => {
    if (selectedItems.length > 0) {
      onSelectionChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const handleSelectAll = async (checked: boolean) => {
    if (!checked) {
      onSelectionChange([]);
      return;
    }
    if (isServerPaginated) {
      try {
        setIsSelectingAll(true);
        const ids = await getAllFilteredIds(tableName, filters, selectedMarket);
        onSelectionChange(ids);
        toast.success(`${ids.length} record selezionati`);
      } catch (error) {
        console.error('Errore select all:', error);
        toast.error('Errore nel selezionare tutti i record');
      } finally {
        setIsSelectingAll(false);
      }
    } else {
      onSelectionChange(allItems.map(item => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      toast.error("Nessun elemento selezionato per l'eliminazione");
      return;
    }

    setIsProcessing(true);
    try {
      await deleteMultipleLeads(tableName, selectedItems);
      toast.success(`${selectedItems.length} record eliminati con successo`);
      onSelectionChange([]);
      onRefresh();
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      toast.error(`Errore durante l'eliminazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkAssign = async () => {
    if (tableName !== 'lead_generation') return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('lead_generation')
        .update({ 
          assignable: true,
          venditore: null,      // Rimuove il venditore
          stato: 'nuovo',       // Reimposta lo stato a nuovo
          data_assegnazione: null // Rimuove la data di assegnazione
        })
        .in('id', selectedItems);

      if (error) throw error;

      toast.success(`${selectedItems.length} lead resi assegnabili e venditori rimossi`);
      onRefresh();
    } catch (error) {
      console.error("Errore durante l'aggiornamento:", error);
      toast.error("Errore durante l'aggiornamento dei lead");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const selectedData = allItems.filter(item => selectedItems.includes(item.id));
    if (selectedData.length === 0) return;

    const headers = Object.keys(selectedData[0]).filter(key => key !== 'id');
    const csvContent = [
      headers.join(','),
      ...selectedData.map(item => 
        headers.map(header => `"${item[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`${selectedItems.length} record esportati`);
  };

  const handleManualAssignment = () => {
    setShowManualAssignDialog(true);
  };

  const handleAssignmentComplete = () => {
    onSelectionChange([]);
    onRefresh();
  };

  const isAllSelected = effectiveTotal > 0 && selectedItems.length === effectiveTotal;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < effectiveTotal;

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            disabled={isSelectingAll || effectiveTotal === 0}
            className={isIndeterminate ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
          />
          <span className="text-sm text-muted-foreground">
            {isSelectingAll
              ? 'Selezione in corso...'
              : selectedItems.length > 0
                ? `${selectedItems.length} di ${effectiveTotal} selezionati`
                : `Seleziona tutto (${effectiveTotal})`
            }
          </span>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione multipla</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare {selectedItems.length} record selezionati? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManualAssignmentDialog
        open={showManualAssignDialog}
        onOpenChange={setShowManualAssignDialog}
        selectedLeadIds={selectedItems}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </>
  );
};

export default BulkActions;
