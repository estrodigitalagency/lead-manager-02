import { useState } from "react";
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
import { deleteMultipleLeads } from "@/services/databaseService";
import { supabase } from "@/integrations/supabase/client";
import ManualAssignmentDialog from "./ManualAssignmentDialog";

interface BulkActionsProps {
  selectedItems: string[];
  allItems: any[];
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
  onSelectionChange: (selected: string[]) => void;
  onRefresh: () => void;
}

const BulkActions = ({ 
  selectedItems, 
  allItems, 
  tableName, 
  onSelectionChange,
  onRefresh 
}: BulkActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManualAssignDialog, setShowManualAssignDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(allItems.map(item => item.id));
    } else {
      onSelectionChange([]);
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
        .update({ assignable: true })
        .in('id', selectedItems);

      if (error) throw error;

      toast.success(`${selectedItems.length} lead resi assegnabili`);
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

  const isAllSelected = selectedItems.length === allItems.length && allItems.length > 0;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < allItems.length;

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            className={isIndeterminate ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
          />
          <span className="text-sm text-muted-foreground">
            {selectedItems.length > 0 
              ? `${selectedItems.length} di ${allItems.length} selezionati`
              : `Seleziona tutto (${allItems.length})`
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
