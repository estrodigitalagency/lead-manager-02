import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap, AlertCircle, Play } from "lucide-react";
import { AutomationList } from "./AutomationList";
import { AutomationForm } from "./AutomationForm";
import { AutomationTestPanel } from "./AutomationTestPanel";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { LeadAssignmentAutomation, NewAutomationForm } from "@/types/automation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AutomationSettings() {
  const { 
    automations, 
    isLoading, 
    createAutomation, 
    updateAutomation, 
    deleteAutomation, 
    toggleAutomation,
    updatePriorities 
  } = useAutomationsData();

  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<LeadAssignmentAutomation | undefined>();
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateAutomation = async (data: NewAutomationForm) => {
    const maxPriority = Math.max(...automations.map(a => a.priority), 0);
    await createAutomation({
      ...data,
      attivo: true,
      priority: maxPriority + 1
    });
  };

  const handleEditAutomation = async (data: NewAutomationForm) => {
    if (!editingAutomation) return;
    await updateAutomation(editingAutomation.id, data);
    setEditingAutomation(undefined);
  };

  const handleDeleteAutomation = async (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questa automazione?")) {
      await deleteAutomation(id);
    }
  };

  const handleReorder = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(automations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Aggiorna le priorità
    const updatedItems = items.map((item, index) => ({
      ...item,
      priority: index + 1
    }));

    await updatePriorities(updatedItems);
  };

  const handleProcessExistingLeads = async () => {
    if (activeAutomationsCount === 0) {
      toast.error("Nessuna automazione attiva trovata");
      return;
    }

    try {
      setIsProcessing(true);
      toast.info("Processamento automazioni in corso...");

      const { data, error } = await supabase.functions.invoke('process-existing-automations', {
        body: { market: 'IT', limit: 500 }
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result.success) {
        const { summary } = result;
        toast.success(
          `Processamento completato: ${summary.assigned} lead assegnati, ${summary.no_match} non matchati`
        );
      } else {
        throw new Error("Errore nel processamento");
      }
    } catch (error) {
      console.error("Error processing existing leads:", error);
      toast.error("Errore nel processamento delle automazioni");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeAutomationsCount = automations.filter(a => a.attivo).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Automazioni Lead</CardTitle>
                <CardDescription>
                  Gestisci le regole automatiche per l'assegnazione dei lead duplicati
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestPanel(!showTestPanel)}
              >
                Test Automazioni
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleProcessExistingLeads}
                disabled={isProcessing || activeAutomationsCount === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                {isProcessing ? "Processando..." : "Processa Lead Esistenti"}
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Automazione
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {activeAutomationsCount} di {automations.length} automazioni attive
            </div>
          </div>

          {activeAutomationsCount > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le automazioni vengono eseguite in ordine di priorità. 
                Trascina per riordinare e ferma alla prima che corrisponde.
              </AlertDescription>
            </Alert>
          )}

          <AutomationList
            automations={automations}
            onToggle={toggleAutomation}
            onEdit={setEditingAutomation}
            onDelete={handleDeleteAutomation}
            onReorder={handleReorder}
          />
        </CardContent>
      </Card>

      {showTestPanel && (
        <AutomationTestPanel 
          automations={automations.filter(a => a.attivo)}
          onClose={() => setShowTestPanel(false)}
        />
      )}

      <AutomationForm
        open={showForm || !!editingAutomation}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingAutomation(undefined);
        }}
        onSubmit={editingAutomation ? handleEditAutomation : handleCreateAutomation}
        automation={editingAutomation}
        isLoading={isLoading}
      />
    </div>
  );
}