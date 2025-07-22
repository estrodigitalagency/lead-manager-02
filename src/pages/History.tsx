
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssignmentHistory from "@/components/AssignmentHistory";

const History = () => {
  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <Card className="border">
        <CardHeader>
          <CardTitle>Storico Assegnazioni Lead</CardTitle>
          <CardDescription>
            Visualizza tutte le assegnazioni di lead effettuate nel sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignmentHistory />
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
