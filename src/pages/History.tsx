import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AssignmentHistory from "@/components/AssignmentHistory";

const History = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);

  const handleRebuildHistory = async () => {
    setIsRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('rebuild-assignment-history');
      
      if (error) throw error;
      
      toast.success(`Storico ricostruito: ${data.recordsCreated} assegnazioni recuperate da ${data.assignmentGroups} gruppi`);
      
      // Ricarica la pagina per mostrare i nuovi dati
      window.location.reload();
    } catch (error) {
      console.error('Error rebuilding history:', error);
      toast.error('Errore durante la ricostruzione dello storico');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storico Assegnazioni Lead</CardTitle>
              <CardDescription>
                Visualizza tutte le assegnazioni di lead effettuate nel sistema
              </CardDescription>
            </div>
            <Button
              onClick={handleRebuildHistory}
              disabled={isRebuilding}
              variant="outline"
              size="sm"
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Ricostruzione...' : 'Ricostruisci Storico'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AssignmentHistory />
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
