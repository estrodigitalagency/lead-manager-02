
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, UserCheck, TrendingUp } from "lucide-react";
import { ReportMetrics } from "@/services/reportsService";

interface ReportMetricsProps {
  metrics: ReportMetrics;
  isLoading: boolean;
}

const ReportMetricsComponent = ({ metrics, isLoading }: ReportMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="stat-card">
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const conversionRate = metrics.leadTotaliGenerati > 0
    ? ((metrics.callTotaliPrenotate / metrics.leadTotaliGenerati) * 100).toFixed(1)
    : '0.0';

  const metricCards = [
    {
      title: "Lead Generati",
      value: metrics.leadTotaliGenerati.toLocaleString('it-IT'),
      icon: Users,
      subtitle: "nel periodo",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Call Prenotate",
      value: metrics.callTotaliPrenotate.toLocaleString('it-IT'),
      icon: Phone,
      subtitle: "nel periodo",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Lead Lavorati",
      value: metrics.leadTotaliLavorati.toLocaleString('it-IT'),
      icon: UserCheck,
      subtitle: "nel periodo",
      color: "text-violet-600",
      bgColor: "bg-violet-50"
    },
    {
      title: "Conversione",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      subtitle: "lead \u2192 call",
      color: metrics.callTotaliPrenotate > 0 ? "text-amber-600" : "text-muted-foreground",
      bgColor: metrics.callTotaliPrenotate > 0 ? "bg-amber-50" : "bg-muted/40"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {metricCards.map((metric, i) => {
        const IconComponent = metric.icon;
        return (
          <Card key={metric.title} className={`stat-card stagger-${i + 1} animate-slide-up`}>
            <CardContent className="p-4 sm:p-5">
              <div className={`icon-container-sm ${metric.bgColor} mb-3 sm:mb-4`}>
                <IconComponent className={`h-4 w-4 ${metric.color}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight ${metric.color}`}>
                {metric.value}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">
                {metric.title}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReportMetricsComponent;
