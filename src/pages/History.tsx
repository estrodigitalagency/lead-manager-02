import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AssignmentHistory from "@/components/AssignmentHistory";
import { useIsMobile } from "@/hooks/use-mobile";

const History = () => {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const isMobile = useIsMobile();

  const handleRebuildHistory = async () => {
    setIsRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('rebuild-assignment-history');
      
      if (error) throw error;
      
      toast.success(`Storico ricostruito: ${data.recordsCreated} assegnazioni recuperate da ${data.assignmentGroups} gruppi`);
      
      window.location.reload();
    } catch (error) {
      console.error('Error rebuilding history:', error);
      toast.error('Errore durante la ricostruzione dello storico');
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <div className={`container mx-auto max-w-7xl ${isMobile ? 'px-4 py-5 pt-16 pb-24' : 'px-6 py-8 pt-[72px]'}`}>
      <Card>
        <CardHeader className={isMobile ? 'px-3 py-4' : ''}>
          <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : ''}`}>
            <div>
              <CardTitle className={isMobile ? 'text-lg' : ''}>Storico Assegnazioni Lead</CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : ''}>
                Visualizza tutte le assegnazioni di lead effettuate nel sistema
              </CardDescription>
            </div>
            <Button
              onClick={handleRebuildHistory}
              disabled={isRebuilding}
              variant="outline"
              size="sm"
              className={`active:scale-95 transition-all ${isMobile ? 'w-full' : ''}`}
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
              {isRebuilding ? 'Ricostruzione...' : 'Ricostruisci Storico'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2' : ''}>
          <AssignmentHistory />
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
