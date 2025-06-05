
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Database, Settings, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import AssignmentHistory from "@/components/AssignmentHistory";
import LeadDatabase from "@/components/LeadDatabase";
import { triggerLeadCheck } from "@/services/databaseService";
import { toast } from "sonner";

const Index = () => {
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);

  useEffect(() => {
    // Esegui automaticamente il controllo dei lead all'apertura dell'app
    const performLeadCheck = async () => {
      setIsCheckingLeads(true);
      try {
        await triggerLeadCheck();
      } catch (error) {
        console.error("Errore nel controllo automatico dei lead:", error);
      } finally {
        setIsCheckingLeads(false);
      }
    };

    performLeadCheck();
  }, []);

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Lead Management System</h1>
        <p className="text-muted-foreground">Gestisci l'assegnazione e il monitoraggio dei tuoi lead</p>
        
        {isCheckingLeads && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Controllo automatico dell'assegnabilità dei lead in corso...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assegna Lead</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Nuovo</div>
            <p className="text-xs text-muted-foreground">
              Sistema avanzato con esclusioni
            </p>
          </CardContent>
        </Card>

        <Link to="/database">
          <Card className="border hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Visualizza</div>
              <p className="text-xs text-muted-foreground">
                Gestisci tutti i record
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports">
          <Card className="border hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Analizza</div>
              <p className="text-xs text-muted-foreground">
                Statistiche e performance
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/settings">
          <Card className="border hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impostazioni</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Configura</div>
              <p className="text-xs text-muted-foreground">
                Webhook e venditori
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 border">
          <TabsTrigger value="assign" className="data-[state=active]:text-primary">
            Assegnazione Lead
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:text-primary">
            Storico Assegnazioni
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:text-primary">
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
