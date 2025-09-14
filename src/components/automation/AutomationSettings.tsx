import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Zap, AlertCircle, Play, History } from "lucide-react";
import { AutomationList } from "./AutomationList";
import { AutomationForm } from "./AutomationForm";
import { AutomationTestPanel } from "./AutomationTestPanel";
import { AutomationExecutionHistory } from "./AutomationExecutionHistory";
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
    const automationData = {
      ...data,
      attivo: true,
      priority: maxPriority + 1,
      webhook_enabled: data.webhook_enabled ?? true, // Default to true if not specified
    };
    await createAutomation(automationData);
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
      <Tabs defaultValue="automations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="automations" className="flex items-center space-x-1 sm:space-x-2 py-3">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Automazioni</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-1 sm:space-x-2 py-3">
            <History className="h-4 w-4" />
            <span className="text-sm">Storico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Automazioni Lead</CardTitle>
                    <CardDescription className="hidden sm:block">
                      Gestisci le regole automatiche per l'assegnazione dei lead duplicati
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTestPanel(!showTestPanel)}
                    className="w-full sm:w-auto"
                  >
                    Test Automazioni
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProcessExistingLeads}
                    disabled={isProcessing || activeAutomationsCount === 0}
                    className="w-full sm:w-auto"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{isProcessing ? "Processando..." : "Processa Lead Esistenti"}</span>
                    <span className="sm:hidden">{isProcessing ? "Processando..." : "Processa Lead"}</span>
                  </Button>
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Nuova Automazione</span>
                    <span className="sm:hidden">Nuova</span>
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
        </TabsContent>

        <TabsContent value="history">
          <AutomationExecutionHistory />
        </TabsContent>
      </Tabs>

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