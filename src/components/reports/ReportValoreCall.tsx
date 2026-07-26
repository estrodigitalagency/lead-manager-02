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

/** Valore call medio 3 mesi = Σ fatturato / Σ call fatte */
const avgValoreCall = (b: BucketData) => {
  const fatt = b.mesi.reduce((s, m) => s + m.fatturato, 0);
  const call = b.mesi.reduce((s, m) => s + m.n_call, 0);
  return call > 0 ? Math.round(fatt / call) : 0;
};
const totCall = (b: BucketData) => b.mesi.reduce((s, m) => s + m.n_call, 0);

const TrendInline = ({ t }: { t: string }) => {
  if (t === "asc") return <span className="inline-flex items-center gap-0.5 text-emerald-500 text-[10px]"><TrendingUp className="h-2.5 w-2.5" /> asc</span>;
  if (t === "desc") return <span className="inline-flex items-center gap-0.5 text-destructive text-[10px]"><TrendingDown className="h-2.5 w-2.5" /> disc</span>;
  if (t === "stable") return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]"><Minus className="h-2.5 w-2.5" /> stab</span>;
  return <span className="text-muted-foreground text-[10px]">—</span>;
};

interface Props { refreshTrigger?: number; }

const ReportValoreCall = ({ refreshTrigger }: Props) => {
  const { selectedMarket } = useMarket();
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chartSeller, setChartSeller] = useState<string>("__all__");

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

  // Colonne = bucket dal globale (ordine e label stabili)
  const bucketCols = useMemo(() => resp?.data.map((b) => ({ id: b.bucket, label: b.label || b.bucket })) ?? [], [resp]);

  // Righe tabella comparativa: un venditore per riga (solo chi ha almeno una call)
  const rows = useMemo(() => {
    if (!resp) return [];
    return resp.per_seller
      .map((s) => {
        const byBucket: Record<string, { vc: number; n: number; trend: string }> = {};
        let totN = 0;
        for (const b of s.data) {
          const n = totCall(b);
          byBucket[b.bucket] = { vc: avgValoreCall(b), n, trend: b.trend };
          totN += n;
        }
        return { venditore: s.venditore, byBucket, totN };
      })
      .filter((r) => r.totN > 0)
      .sort((a, b) => b.totN - a.totN);
  }, [resp]);

  // Riga TOTALE (globale)
  const totalRow = useMemo(() => {
    if (!resp) return null;
    const byBucket: Record<string, { vc: number; n: number; trend: string }> = {};
    for (const b of resp.data) byBucket[b.bucket] = { vc: avgValoreCall(b), n: totCall(b), trend: b.trend };
    return byBucket;
  }, [resp]);

  // Grafico: venditore selezionato o globale
  const chartBuckets: BucketData[] = useMemo(() => {
    if (!resp) return [];
    if (chartSeller === "__all__") return resp.data;
    return resp.per_seller.find((s) => s.venditore === chartSeller)?.data ?? [];
  }, [resp, chartSeller]);

  const chartData = useMemo(() => {
    if (!resp) return [];
    return resp.months.map((mk) => {
      const row: Record<string, any> = { mese: monthLabel(mk) };
      for (const b of chartBuckets) {
        const m = b.mesi.find((x) => x.mese === mk);
        row[b.label || b.bucket] = m?.valore_call || 0;
      }
      return row;
    });
  }, [resp, chartBuckets]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Valore call per fonte
          </CardTitle>
          <p className="text-[12px] text-muted-foreground mt-1">
            Valore call = Fatturato / Call fatte, media ultimi 3 mesi. Il trend sotto ogni valore confronta i 3 mesi per quella fonte.
            {resp && <span> · {resp.sellers_used}/{resp.sellers_total} venditori</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Aggiorna
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {err && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-[12.5px] text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{err}</span>
          </div>
        )}

        {loading && !resp ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : resp ? (
          <>
            {/* ── TABELLA COMPARATIVA: sales × fonte ── */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left sticky left-0 bg-card z-10">Venditore</th>
                    {bucketCols.map((c) => (
                      <th key={c.id} className="table-header-cell text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm" style={{ background: BUCKET_COLORS[c.id] }} />
                          {c.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Riga totale in cima */}
                  {totalRow && (
                    <tr className="bg-secondary/40">
                      <td className="table-body-cell font-semibold sticky left-0 bg-card z-10">Media team</td>
                      {bucketCols.map((c) => {
                        const cell = totalRow[c.id];
                        return (
                          <td key={c.id} className="table-body-cell text-right num">
                            <span className="font-semibold">{cell?.vc > 0 ? eur(cell.vc) : "—"}</span>
                            <span className="block"><TrendInline t={cell?.trend || "—"} /></span>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.venditore}>
                      <td className="table-body-cell font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{r.venditore}</td>
                      {bucketCols.map((c) => {
                        const cell = r.byBucket[c.id];
                        return (
                          <td key={c.id} className="table-body-cell text-right num">
                            {cell && cell.n > 0 ? (
                              <>
                                <span className="font-semibold">{cell.vc > 0 ? eur(cell.vc) : "—"}</span>
                                <span className="block text-[9px] text-muted-foreground">{cell.n} call</span>
                                <span className="block"><TrendInline t={cell.trend} /></span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── GRAFICO andamento (per venditore o globale) ── */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <span className="label-eyebrow">Andamento 3 mesi</span>
                <Select value={chartSeller} onValueChange={setChartSeller}>
                  <SelectTrigger className="h-7 w-[200px] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Media team</SelectItem>
                    {resp.per_seller.map((s) => (
                      <SelectItem key={s.venditore} value={s.venditore}>{s.venditore}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
                    <XAxis dataKey="mese" tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} width={44} />
                    <Tooltip contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => eur(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {chartBuckets.map((b) => (
                      <Line key={b.bucket} type="monotone" dataKey={b.label || b.bucket} stroke={BUCKET_COLORS[b.bucket] || "hsl(232 100% 74%)"} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Valore lead outbound (globale) */}
            {(() => {
              const ob = resp.data.find((d) => d.bucket === "outbound");
              if (!ob) return null;
              return (
                <div className="border-t border-border pt-3 overflow-x-auto">
                  <div className="label-eyebrow mb-2">Valore lead — Outbound (team)</div>
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr>
                        <th className="table-header-cell text-left">Metrica</th>
                        {resp.months.map((mk) => <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="table-body-cell font-medium">Valore lead</td>
                        {ob.mesi.map((m) => <td key={m.mese} className="table-body-cell text-right num font-semibold">{m.valore_lead > 0 ? eur(m.valore_lead) : "—"}</td>)}
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
