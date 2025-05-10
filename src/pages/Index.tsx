
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadAssignmentForm from "@/components/LeadAssignmentForm";
import AssignmentHistory from "@/components/AssignmentHistory";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [refreshHistory, setRefreshHistory] = useState(false);

  const handleAssignmentSuccess = () => {
    // Trigger history refresh when assignment succeeds
    setRefreshHistory(prev => !prev);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Sistema di Assegnazione Lead</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lead Assignment Form Section */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Modulo di Assegnazione Lead</CardTitle>
            <CardDescription>
              Assegna lead ai venditori selezionati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadAssignmentForm onAssignmentSuccess={handleAssignmentSuccess} />
          </CardContent>
        </Card>

        {/* Assignment History Section */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Cronologia Assegnazioni</CardTitle>
            <CardDescription>
              Le ultime 10 assegnazioni effettuate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssignmentHistory key={refreshHistory ? 'refresh' : 'initial'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
