
import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PieChartIcon, Loader2 } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { getLeadsBySource, LeadsBySourceItem, PRESET_PERIODS } from "@/services/reportsService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = [
  "hsl(210, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(35, 90%, 55%)",
  "hsl(0, 70%, 55%)", "hsl(270, 60%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(330, 65%, 55%)", "hsl(60, 70%, 45%)", "hsl(200, 50%, 50%)",
  "hsl(120, 40%, 50%)", "hsl(15, 80%, 55%)", "hsl(240, 50%, 60%)",
  "hsl(90, 50%, 45%)", "hsl(300, 40%, 50%)", "hsl(45, 85%, 50%)",
];

const THRESHOLD_PERCENT = 1;

export function LeadsBySourceChart() {
  const { selectedMarket } = useMarket();
  const [data, setData] = useState<LeadsBySourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(PRESET_PERIODS.last30days.startDate);
  const [endDate, setEndDate] = useState(PRESET_PERIODS.last30days.endDate);

  const fetchData = async () => {
    setLoading(true);
    const result = await getLeadsBySource(selectedMarket, startDate, endDate);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMarket]);

  const handlePreset = (key: string) => {
    const period = PRESET_PERIODS[key as keyof typeof PRESET_PERIODS];
    if (period) {
      setStartDate(period.startDate);
      setEndDate(period.endDate);
    }
  };

  const handleApply = () => {
    fetchData();
  };

  const chartData = useMemo(() => {
    if (!data.length) return [];
    const total = data.reduce((s, i) => s + i.count, 0);
    const main: { fonte: string; count: number; percentage: number }[] = [];
    let otherCount = 0;

    data.forEach(item => {
      const pct = total > 0 ? (item.count / total) * 100 : 0;
      if (pct >= THRESHOLD_PERCENT) {
        main.push(item);
      } else {
        otherCount += item.count;
      }
    });

    if (otherCount > 0) {
      main.push({
        fonte: "Altro",
        count: otherCount,
        percentage: total > 0 ? Math.round((otherCount / total) * 1000) / 10 : 0,
      });
    }
    return main;
  }, [data]);

  const totalLeads = data.reduce((s, i) => s + i.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Lead per Fonte
          {totalLeads > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({totalLeads.toLocaleString()} totali)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["last7days", "7gg"],
              ["last30days", "30gg"],
              ["thisMonth", "Questo mese"],
              ["lastMonth", "Mese scorso"],
            ].map(([key, label]) => (
              <Button key={key} variant="outline" size="sm" onClick={() => handlePreset(key)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Da</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[150px] h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">A</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[150px] h-8 text-sm" />
            </div>
            <Button size="sm" onClick={handleApply}>Applica</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessun dato disponibile per il periodo selezionato.</p>
        ) : (
          <>
            {/* Pie Chart */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="fonte"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ fonte, percentage }) => `${fonte} (${percentage}%)`}
                    labelLine
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value.toLocaleString()} lead`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Table */}
            <div className="rounded-md border max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Lead</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((item, i) => (
                    <TableRow key={item.fonte}>
                      <TableCell className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {item.fonte}
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
