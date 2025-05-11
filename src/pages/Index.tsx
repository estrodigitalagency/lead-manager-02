
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadAssignmentForm from "@/components/LeadAssignmentForm";
import AssignmentHistory from "@/components/AssignmentHistory";
import { Settings, Database, BarChart } from "lucide-react";

const Index = () => {
  const [refreshHistory, setRefreshHistory] = useState(false);

  const handleAssignmentSuccess = () => {
    // Trigger history refresh when assignment succeeds
    setRefreshHistory(prev => !prev);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">LeadHero</h1>
        <div className="flex gap-3">
          <Link to="/reports">
            <Button variant="outline" className="flex items-center gap-2 border">
              <BarChart size={18} className="text-primary" />
              Reports
            </Button>
          </Link>
          <Link to="/database">
            <Button variant="outline" className="flex items-center gap-2 border">
              <Database size={18} className="text-primary" />
              Database Records
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" className="flex items-center gap-2 border">
              <Settings size={18} className="text-primary" />
              Impostazioni
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lead Assignment Form Section */}
        <Card className="lg:col-span-5 border">
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
        <Card className="lg:col-span-7 border">
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
    </div>
  );
};

export default Index;
