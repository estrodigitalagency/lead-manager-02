
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import AssignmentHistory from "@/components/AssignmentHistory";
import LeadDatabase from "@/components/LeadDatabase";

interface DashboardTabsProps {
  isCheckingLeads: boolean;
  handleManualLeadCheck: () => void;
}

const DashboardTabs = ({ isCheckingLeads, handleManualLeadCheck }: DashboardTabsProps) => {
  return (
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
  );
};

export default DashboardTabs;
