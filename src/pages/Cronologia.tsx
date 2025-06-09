
import PersistentNavigation from "@/components/PersistentNavigation";
import AssignmentHistory from "@/components/AssignmentHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Cronologia = () => {
  return (
    <div className="min-h-screen bg-background">
      <PersistentNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Cronologia Assegnazioni</h1>
          <p className="text-muted-foreground">
            Visualizza lo storico di tutte le assegnazioni di lead effettuate
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storico Assegnazioni</CardTitle>
            <CardDescription>
              Elenco completo delle assegnazioni lead con dettagli su venditore, campagna e fonti escluse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssignmentHistory />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cronologia;
