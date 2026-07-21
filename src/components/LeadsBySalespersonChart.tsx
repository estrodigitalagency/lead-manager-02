import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, Loader2 } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { getLeadsBySalesperson, LeadsBySalespersonItem, ReportFilters } from "@/services/reportsService";
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

interface LeadsBySalespersonChartProps {
  filters: ReportFilters;
  refreshTrigger?: number;
}

export function LeadsBySalespersonChart({ filters, refreshTrigger }: LeadsBySalespersonChartProps) {
  const { selectedMarket } = useMarket();
  const [data, setData] = useState<LeadsBySalespersonItem[]>([]);
  const [totaleGenerati, setTotaleGenerati] = useState(0);
  const [totaleLavorati, setTotaleLavorati] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const result = await getLeadsBySalesperson({ ...filters, market: selectedMarket });
    setData(result.items);
    setTotaleGenerati(result.totaleGenerati);
    setTotaleLavorati(result.totaleLavorati);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMarket, refreshTrigger]);

  const chartData = useMemo(() => {
    if (!data.length) return [];
    const main: LeadsBySalespersonItem[] = [];
    let otherCount = 0;

    data.forEach(item => {
      if (item.percentage >= THRESHOLD_PERCENT) {
        main.push(item);
      } else {
        otherCount += item.count;
      }
    });

    if (otherCount > 0) {
      main.push({
        venditore: "Altro",
        count: otherCount,
        percentage: totaleGenerati > 0 ? Math.round((otherCount / totaleGenerati) * 1000) / 10 : 0,
      });
    }
    return main;
  }, [data, totaleGenerati]);

  const orfani = totaleGenerati - totaleLavorati;
  const percOrfani = totaleGenerati > 0 ? Math.round((orfani / totaleGenerati) * 1000) / 10 : 0;
  const percLavorati = totaleGenerati > 0 ? Math.round((totaleLavorati / totaleGenerati) * 1000) / 10 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Users className="h-5 w-5" />
          Lavorazione per Venditore
          {totaleGenerati > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({totaleLavorati.toLocaleString()} / {totaleGenerati.toLocaleString()} — {percLavorati}%)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessun dato disponibile per i filtri selezionati.</p>
        ) : (
          <>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="venditore"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ venditore, percentage }) => `${venditore} (${percentage}%)`}
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

            <div className="rounded-md border max-h-[300px] overflow-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venditore</TableHead>
                    <TableHead className="text-right">Lead</TableHead>
                    <TableHead className="text-right">% sul totale generati</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, i) => (
                    <TableRow key={item.venditore}>
                      <TableCell className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {item.venditore}
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                  {orfani > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="flex items-center gap-2 italic text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm shrink-0 bg-muted-foreground/30" />
                        Non assegnati (orfani)
                      </TableCell>
                      <TableCell className="text-right font-medium">{orfani.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{percOrfani}%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
