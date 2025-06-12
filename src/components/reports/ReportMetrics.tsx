
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Phone, UserCheck, TrendingUp } from "lucide-react";
import { ReportMetrics } from "@/services/reportsService";

interface ReportMetricsProps {
  metrics: ReportMetrics;
  isLoading: boolean;
}

const ReportMetricsComponent = ({ metrics, isLoading }: ReportMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Lead Totali Generati",
      value: metrics.leadTotaliGenerati,
      icon: Users,
      description: "Lead generati nel periodo selezionato",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Call Totali Prenotate",
      value: metrics.callTotaliPrenotate,
      icon: Phone,
      description: "Call prenotate nel periodo selezionato",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Lead Totali Lavorati",
      value: metrics.leadTotaliLavorati,
      icon: UserCheck,
      description: "Lead assegnati nel periodo selezionato",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metricCards.map((metric) => {
        const IconComponent = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value.toLocaleString('it-IT')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReportMetricsComponent;
