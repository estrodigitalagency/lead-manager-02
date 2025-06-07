
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import AssignmentHistory from "@/components/AssignmentHistory";
import LeadDatabase from "@/components/LeadDatabase";
import { triggerLeadCheck } from "@/services/databaseService";
import { toast } from "sonner";

const Index = () => {
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);

  const handleManualLeadCheck = async () => {
    setIsCheckingLeads(true);
    try {
      const success = await triggerLeadCheck();
      if (success) {
        toast.success("Controllo dei lead completato con successo");
      }
    } catch (error) {
      console.error("Errore nel controllo manuale dei lead:", error);
      toast.error("Errore nel controllo dei lead");
    } finally {
      setIsCheckingLeads(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Lead Management System</h1>
        <p className="text-muted-foreground">Gestisci l'assegnazione e il monitoraggio dei tuoi lead</p>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-8 border h-auto">
          <TabsTrigger value="assign" className="data-[state=active]:text-primary py-3 px-4 text-sm">
            Assegnazione Lead
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:text-primary py-3 px-4 text-sm">
            Storico Assegnazioni
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:text-primary py-3 px-4 text-sm">
            Database Lead
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assign">
          <LeadAssignmentWithExclusions />
        </TabsContent>
        
        <TabsContent value="history">
          <Card className="border">
            <CardHeader>
              <CardTitle>Storico Assegnazioni</CardTitle>
              <CardDescription>
                Visualizza tutte le assegnazioni passate e le loro performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentHistory />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database">
          <Card className="border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Database Lead Non Assegnati</CardTitle>
                  <CardDescription>
                    Tutti i lead disponibili per l'assegnazione
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleManualLeadCheck}
                  disabled={isCheckingLeads}
                  variant="outline"
                  size="sm"
                >
                  {isCheckingLeads ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Controllo...
                    </>
                  ) : (
                    "Verifica Assegnabilità"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LeadDatabase />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
