
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import LeadAssignmentForm from "@/components/LeadAssignmentForm";
import AssignmentHistory from "@/components/AssignmentHistory";
import LeadDatabase from "@/components/LeadDatabase";
import { Settings, Database, ChevronRight } from "lucide-react";

const Index = () => {
  const [refreshHistory, setRefreshHistory] = useState(false);
  const [refreshLeads, setRefreshLeads] = useState(false);

  const handleAssignmentSuccess = () => {
    // Trigger history refresh when assignment succeeds
    setRefreshHistory(prev => !prev);
    setRefreshLeads(prev => !prev);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold neon-text">Sistema di Assegnazione Lead</h1>
        <div className="flex gap-3">
          <Link to="/database">
            <Button variant="outline" className="flex items-center gap-2 neon-border hover:animate-glow">
              <Database size={18} className="text-primary" />
              Database Records
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" className="flex items-center gap-2 neon-border hover:animate-glow">
              <Settings size={18} className="text-primary" />
              Impostazioni
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Lead Assignment Form Section */}
        <Card className="lg:col-span-5 glass-card">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-primary">Modulo di Assegnazione Lead</CardTitle>
            <CardDescription className="text-muted-foreground">
              Assegna lead ai venditori selezionati
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <LeadAssignmentForm onAssignmentSuccess={handleAssignmentSuccess} />
          </CardContent>
        </Card>

        {/* Assignment History Section */}
        <Card className="lg:col-span-7 glass-card">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-primary">Cronologia Assegnazioni</CardTitle>
            <CardDescription className="text-muted-foreground">
              Le ultime 10 assegnazioni effettuate
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AssignmentHistory key={refreshHistory ? 'refresh' : 'initial'} />
          </CardContent>
        </Card>
      </div>

      {/* Lead Database Section */}
      <Card className="glass-card">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="text-primary">Database Lead</CardTitle>
          <CardDescription className="text-muted-foreground">
            Lead disponibili per l'assegnazione
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <LeadDatabase key={refreshLeads ? 'refresh' : 'initial'} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
