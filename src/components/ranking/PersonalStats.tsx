import { TeamMember, MetricKey, METRIC_LABELS, rankByMetric } from "@/lib/ranking/googleSheets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface PersonalStatsProps {
  memberName: string;
  allMembers: TeamMember[];
}

export function PersonalStats({ memberName, allMembers }: PersonalStatsProps) {
  const metrics: MetricKey[] = ["fatturato", "incassato", "cr", "valoreCall"];
  const total = allMembers.length;

  const stats = metrics.map((metric) => {
    const ranked = rankByMetric(allMembers, metric);
    const me = ranked.find((m) => m.name.toLowerCase() === memberName.toLowerCase());
    const first = ranked[0];
    const format = METRIC_LABELS[metric].format;

    if (!me) return null;

    const gap = first[metric] - me[metric];
    const isFirst = me.rank === 1;
    const progressPct = first[metric] > 0 ? Math.round((me[metric] / first[metric]) * 100) : 0;

    return {
      metric,
      label: METRIC_LABELS[metric].label,
      icon: METRIC_LABELS[metric].icon,
      rank: me.rank,
      value: format(me[metric]),
      gap: isFirst ? null : format(gap),
      isFirst,
      firstName: first.name,
      progressPct,
    };
  });

  const validStats = stats.filter(Boolean);
  if (validStats.length === 0) return null;

  return (
    <Card className="border-primary/40 bg-primary/5 mt-8 mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2 text-primary">
          <TrendingUp className="w-5 h-5" />
          Le tue statistiche — {memberName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {validStats.map((s) => s && (
            <div key={s.metric} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.icon} {s.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-lg min-w-[2.5rem] h-9 px-2">
                    #{s.rank}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">su {total}</span>
                </div>
              </div>
              <div className="font-display font-semibold text-xl text-primary">{s.value}</div>
              <div className="space-y-1">
                <Progress value={s.progressPct} className="h-2" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{s.progressPct}% del 1°</span>
                  {s.isFirst ? (
                    <span className="text-green-500 font-semibold">🏆 Primo posto!</span>
                  ) : (
                    <span>-{s.gap} da {s.firstName}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}