import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Phone } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

const BUCKET_COLORS: Record<string, string> = {
  "3sfere": "hsl(232 100% 74%)",
  setter_ig: "hsl(280 70% 62%)",
  setter_new: "hsl(180 65% 48%)",
  vsl: "hsl(38 92% 55%)",
  outbound: "hsl(142 71% 45%)",
};

interface MonthData {
  mese: string;
  valore_call: number;
  n_call: number;
  fatturato: number;
  call_nette: number;
  valore_lead: number;
}
interface BucketData { bucket: string; label?: string; mesi: MonthData[]; trend: string; }
interface SellerData { venditore: string; data: BucketData[]; }
interface Response {
  market: string;
  months: string[];
  sellers_used: number;
  sellers_total: number;
  data: BucketData[];
  per_seller: SellerData[];
  unmapped: Record<string, number>;
  errors: string[];
  generated_at: string;
}

const eur = (n: number) => `€${n.toLocaleString("it-IT")}`;
const monthLabel = (mk: string) => {
  const [m, y] = mk.split("/");
  const names = ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${names[parseInt(m, 10)]} ${y.slice(2)}`;
};

const TrendBadge = ({ t }: { t: string }) => {
  if (t === "asc") return <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px] font-medium"><TrendingUp className="h-3 w-3" /> in crescita</span>;
  if (t === "desc") return <span className="inline-flex items-center gap-1 text-destructive text-[11px] font-medium"><TrendingDown className="h-3 w-3" /> in calo</span>;
  if (t === "stable") return <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] font-medium"><Minus className="h-3 w-3" /> stabile</span>;
  return <span className="text-muted-foreground text-[11px]">—</span>;
};

interface Props { refreshTrigger?: number; }

const ReportValoreCall = ({ refreshTrigger }: Props) => {
  const { selectedMarket } = useMarket();
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [seller, setSeller] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/valore-call?market=${selectedMarket}`, {
        headers: { Authorization: `Bearer ${ANON}` },
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setResp(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedMarket]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  // Bucket data: globale o venditore selezionato
  const buckets: BucketData[] = useMemo(() => {
    if (!resp) return [];
    if (seller === "__all__") return resp.data;
    return resp.per_seller.find((s) => s.venditore === seller)?.data ?? [];
  }, [resp, seller]);

  // Serie grafico: X = mesi, una linea per bucket (valore call)
  const chartData = useMemo(() => {
    if (!resp) return [];
    return resp.months.map((mk) => {
      const row: Record<string, any> = { mese: monthLabel(mk) };
      for (const b of buckets) {
        const m = b.mesi.find((x) => x.mese === mk);
        row[b.label || b.bucket] = m?.valore_call || 0;
      }
      return row;
    });
  }, [resp, buckets]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Valore call per fonte
          </CardTitle>
          <p className="text-[12px] text-muted-foreground mt-1">
            Fatturato / Call fatte, ultimi 3 mesi. Live dai fogli venditore.
            {resp && <span> · {resp.sellers_used}/{resp.sellers_total} venditori</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="h-8 w-[200px] text-[12.5px]">
              <SelectValue placeholder="Venditore" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tutti i venditori</SelectItem>
              {resp?.per_seller.map((s) => (
                <SelectItem key={s.venditore} value={s.venditore}>{s.venditore}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-[12.5px] text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{err}</span>
          </div>
        )}

        {loading && !resp ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : resp ? (
          <>
            {/* Grafico linee valore call */}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
                  <XAxis dataKey="mese" tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} width={44} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => eur(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {buckets.map((b) => (
                    <Line
                      key={b.bucket}
                      type="monotone"
                      dataKey={b.label || b.bucket}
                      stroke={BUCKET_COLORS[b.bucket] || "hsl(232 100% 74%)"}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabella valore call */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Fonte</th>
                    {resp.months.map((mk) => <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>)}
                    <th className="table-header-cell text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.bucket}>
                      <td className="table-body-cell font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: BUCKET_COLORS[b.bucket] }} />
                          {b.label || b.bucket}
                        </span>
                      </td>
                      {b.mesi.map((m) => (
                        <td key={m.mese} className="table-body-cell text-right num">
                          <span className="font-semibold">{m.valore_call > 0 ? eur(m.valore_call) : "—"}</span>
                          <span className="block text-[10px] text-muted-foreground">{m.n_call} call</span>
                        </td>
                      ))}
                      <td className="table-body-cell text-right"><TrendBadge t={b.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Valore lead outbound */}
            {(() => {
              const ob = buckets.find((d) => d.bucket === "outbound");
              if (!ob) return null;
              return (
                <div className="overflow-x-auto border-t border-border pt-3">
                  <div className="label-eyebrow mb-2">Valore lead — Outbound</div>
                  <table className="w-full text-[12.5px]">
                    <tbody>
                      <tr>
                        <td className="table-body-cell font-medium">Valore lead</td>
                        {ob.mesi.map((m) => (
                          <td key={m.mese} className="table-body-cell text-right num font-semibold">{m.valore_lead > 0 ? eur(m.valore_lead) : "—"}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ReportValoreCall;
