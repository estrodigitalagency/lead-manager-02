
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Database, Settings, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardStats = () => {
  return (
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
  );
};

export default DashboardStats;
