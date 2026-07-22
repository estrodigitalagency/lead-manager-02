import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportMetrics } from "@/services/reportsService";

interface ReportMetricsProps {
  metrics: ReportMetrics;
  isLoading: boolean;
}

const ReportMetricsComponent = ({ metrics, isLoading }: ReportMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="stat-card">
            <CardContent className="p-4">
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const conversionRate = metrics.leadTotaliGenerati > 0
    ? ((metrics.callTotaliPrenotate / metrics.leadTotaliGenerati) * 100)
    : 0;

  const assignedPct = metrics.leadTotaliGenerati > 0
    ? ((metrics.leadTotaliLavorati / metrics.leadTotaliGenerati) * 100)
    : 0;

  const metricCards = [
    {
      label: "Lead generati",
      value: metrics.leadTotaliGenerati.toLocaleString('it-IT'),
      hint: "nel periodo",
      accent: false,
    },
    {
      label: "Assegnati",
      value: metrics.leadTotaliLavorati.toLocaleString('it-IT'),
      hint: `${assignedPct.toFixed(1)}% del totale`,
      accent: false,
    },
    {
      label: "Call prenotate",
      value: metrics.callTotaliPrenotate.toLocaleString('it-IT'),
      hint: `${conversionRate.toFixed(1)}% conversion`,
      accent: false,
    },
    {
      label: "Conversion rate",
      value: `${conversionRate.toFixed(1)}%`,
      hint: "lead → call",
      accent: true,
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {metricCards.map((m) => (
        <Card key={m.label} className="stat-card">
          <CardContent className="p-4 flex flex-col gap-1.5">
            <div className="label-eyebrow">{m.label}</div>
            <div className={`text-[26px] font-semibold leading-none tracking-tight num ${m.accent ? 'text-primary' : 'text-foreground'}`}>
              {m.value}
            </div>
            <div className="text-[11px] text-muted-foreground num">{m.hint}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportMetricsComponent;
