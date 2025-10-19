import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Zap, AlertCircle, History } from "lucide-react";
import { AutomationList } from "./AutomationList";
import { AutomationForm } from "./AutomationForm";
import { AutomationExecutionHistory } from "./AutomationExecutionHistory";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { LeadAssignmentAutomation, NewAutomationForm } from "@/types/automation";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const activeAutomationsCount = automations.filter(a => a.attivo).length;

  return (
    <div className="space-y-6 w-full min-w-0 overflow-hidden">
      <Tabs defaultValue="automations" className="w-full min-w-0">
        <TabsList className="flex flex-col sm:grid sm:grid-cols-2 w-full h-auto gap-1 sm:gap-0 p-1">
          <TabsTrigger value="automations" className="w-full h-12 flex items-center justify-center space-x-2 text-sm sm:py-3 min-w-0">
            <Zap className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Automazioni</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="w-full h-12 flex items-center justify-center space-x-2 text-sm sm:py-3 min-w-0">
            <History className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Storico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-6 w-full min-w-0 overflow-hidden">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="space-y-4 w-full min-w-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">Automazioni Lead</CardTitle>
                    <CardDescription className="hidden sm:block text-sm">
                      Gestisci le regole automatiche per l'assegnazione dei lead duplicati
                    </CardDescription>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nuova Automazione</span>
                  <span className="sm:hidden">Nuova</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="w-full min-w-0 overflow-hidden p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 w-full min-w-0">
                <div className="text-sm text-muted-foreground truncate">
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
        </TabsContent>

        <TabsContent value="history" className="w-full min-w-0 overflow-hidden">
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