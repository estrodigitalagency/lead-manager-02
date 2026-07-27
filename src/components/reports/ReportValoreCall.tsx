import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Phone, Maximize2 } from "lucide-react";
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
const colorOf = (id: string) => BUCKET_COLORS[id] || "hsl(232 100% 74%)";

interface MonthData {
  mese: string;
  valore_call: number;
  n_call: number;
  fatturato: number;
  call_nette: number;
  valore_lead: number;
}
interface BucketData {
  bucket: string;
  label?: string;
  has_call: boolean;
  valore_call: number;
  n_call: number;
  valore_lead: number;
  trend: string;
  mesi: MonthData[];
}
interface SellerData { venditore: string; data: BucketData[]; }
interface Response {
  market: string;
  history_months: number;
  use_months: number;
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
const mkOrder = (mk: string) => { const [m, y] = mk.split("/"); return parseInt(y) * 12 + parseInt(m); };

const Sparkline = ({ values, color }: { values: number[]; color: string }) => {
  const w = 48, h = 14, pad = 1.5;
  const pts = values.filter((v) => v != null);
  if (pts.length < 2 || pts.every((v) => v === 0)) return null;
  const max = Math.max(...pts), min = Math.min(...pts);
  const range = max - min || 1;
  const step = (w - pad * 2) / (pts.length - 1);
  const coords = pts.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={w} height={h} className="inline-block align-middle" viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.6} fill={color} />
    </svg>
  );
};

/** Variazione dal primo all'ultimo mese utile: % + assoluto € */
const delta = (series: number[]): { pct: number | null; abs: number } | null => {
  const s = series.filter((v) => v != null);
  if (s.length < 2) return null;
  const first = s[0], last = s[s.length - 1];
  const abs = Math.round(last - first);
  return { pct: first > 0 ? Math.round(((last - first) / first) * 100) : null, abs };
};

const TrendInline = ({ t, series }: { t: string; series?: number[] }) => {
  const d = series ? delta(series) : null;
  let variation = "";
  if (d) {
    const absStr = `${d.abs > 0 ? "+" : ""}€${Math.abs(d.abs).toLocaleString("it-IT")}`;
    const pctStr = d.pct != null ? `${d.pct > 0 ? "+" : ""}${d.pct}%` : "";
    variation = pctStr ? ` (${absStr} · ${pctStr})` : ` (${absStr})`;
  }
  if (t === "asc") return <span className="inline-flex items-center gap-0.5 text-emerald-500 text-[10px]"><TrendingUp className="h-2.5 w-2.5" /> asc{variation}</span>;
  if (t === "desc") return <span className="inline-flex items-center gap-0.5 text-destructive text-[10px]"><TrendingDown className="h-2.5 w-2.5" /> disc{variation}</span>;
  if (t === "stable") return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]"><Minus className="h-2.5 w-2.5" /> stab{variation}</span>;
  return <span className="text-muted-foreground text-[10px]">—</span>;
};

interface Props { refreshTrigger?: number; }

const ReportValoreCall = ({ refreshTrigger }: Props) => {
  const { selectedMarket } = useMarket();
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chartSeller, setChartSeller] = useState<string>("__all__");
  const [expanded, setExpanded] = useState(false);
  const [cellDetail, setCellDetail] = useState<{ title: string; color: string; mesi: MonthData[] } | null>(null);

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

  const bucketCols = useMemo(() => resp?.data.map((b) => ({ id: b.bucket, label: b.label || b.bucket })) ?? [], [resp]);

  // Righe: venditori con almeno una call, ordinati per n_call totale
  const rows = useMemo(() => {
    if (!resp) return [];
    return resp.per_seller
      .map((s) => {
        const byBucket: Record<string, BucketData> = {};
        let totN = 0;
        for (const b of s.data) { byBucket[b.bucket] = b; totN += b.n_call; }
        return { venditore: s.venditore, byBucket, totN };
      })
      .filter((r) => r.totN > 0)
      .sort((a, b) => b.totN - a.totN);
  }, [resp]);

  const totalRow = useMemo(() => {
    if (!resp) return null;
    const byBucket: Record<string, BucketData> = {};
    for (const b of resp.data) byBucket[b.bucket] = b;
    return byBucket;
  }, [resp]);

  // Grafico: bucket del venditore/team selezionato
  const chartBuckets: BucketData[] = useMemo(() => {
    if (!resp) return [];
    if (chartSeller === "__all__") return resp.data;
    return resp.per_seller.find((s) => s.venditore === chartSeller)?.data ?? [];
  }, [resp, chartSeller]);

  // X = unione mesi utili di tutti i bucket del selezionato (ordine cronologico)
  const chartData = useMemo(() => {
    const monthsSet = new Set<string>();
    for (const b of chartBuckets) for (const m of b.mesi) monthsSet.add(m.mese);
    const months = [...monthsSet].sort((a, b) => mkOrder(a) - mkOrder(b));
    return months.map((mk) => {
      const row: Record<string, any> = { mese: monthLabel(mk) };
      for (const b of chartBuckets) {
        const m = b.mesi.find((x) => x.mese === mk);
        row[b.label || b.bucket] = m ? m.valore_call : null;
      }
      return row;
    });
  }, [chartBuckets]);

  const renderChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
        <XAxis dataKey="mese" tick={{ fontSize: 12, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`} width={52} />
        <Tooltip contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => v == null ? "no call" : eur(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {chartBuckets.map((b) => (
          <Line key={b.bucket} type="monotone" dataKey={b.label || b.bucket} stroke={colorOf(b.bucket)} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const cell = (b: BucketData | undefined, id: string, sellerName: string, label: string) => {
    if (!b || !b.has_call) {
      return <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/40">no call</span>;
    }
    const openDetail = () => setCellDetail({ title: `${sellerName} · ${label}`, color: colorOf(id), mesi: b.mesi });
    return (
      <button type="button" onClick={openDetail} className="w-full text-right hover:bg-secondary/40 rounded px-1 -mx-1 transition-colors cursor-pointer" title="Clicca per ingrandire">
        <span className="font-semibold">{eur(b.valore_call)}</span>
        <span className="block text-[9px] text-muted-foreground">{b.n_call} call · {b.mesi.length}m</span>
        <span className="block leading-none"><Sparkline values={b.mesi.map((m) => m.valore_call)} color={colorOf(id)} /></span>
        <span className="block"><TrendInline t={b.trend} series={b.mesi.map((m) => m.valore_call)} /></span>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Valore call per fonte
          </CardTitle>
          <p className="text-[12px] text-muted-foreground mt-1">
            Valore call = Fatturato / Call fatte, sugli ultimi 3 mesi <strong>con call</strong> di ciascuna fonte (i mesi senza call vengono saltati).
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
            {/* TABELLA COMPARATIVA sales × fonte */}
            <div className="max-h-[65vh] overflow-auto rounded-md border border-border">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left sticky left-0 top-0 bg-card z-30">Venditore</th>
                    {bucketCols.map((c) => (
                      <th key={c.id} className="table-header-cell text-right whitespace-nowrap sticky top-0 bg-card z-20">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm" style={{ background: colorOf(c.id) }} />
                          {c.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {totalRow && (
                    <tr className="bg-secondary/40">
                      <td className="table-body-cell font-semibold sticky left-0 bg-card z-10">Media team</td>
                      {bucketCols.map((c) => (
                        <td key={c.id} className="table-body-cell text-right num">{cell(totalRow[c.id], c.id, "Media team", c.label)}</td>
                      ))}
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.venditore}>
                      <td className="table-body-cell font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{r.venditore}</td>
                      {bucketCols.map((c) => (
                        <td key={c.id} className="table-body-cell text-right num">{cell(r.byBucket[c.id], c.id, r.venditore, c.label)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GRAFICO andamento */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <span className="label-eyebrow">Andamento valore call</span>
                <div className="flex gap-2 items-center">
                  <Select value={chartSeller} onValueChange={setChartSeller}>
                    <SelectTrigger className="h-7 w-[200px] text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Media team</SelectItem>
                      {resp.per_seller.map((s) => (
                        <SelectItem key={s.venditore} value={s.venditore}>{s.venditore}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setExpanded(true)} title="Ingrandisci">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="cursor-pointer" onClick={() => setExpanded(true)} title="Clicca per ingrandire">
                {renderChart(260)}
              </div>
            </div>

            {/* Valore lead outbound team */}
            {(() => {
              const ob = resp.data.find((d) => d.bucket === "outbound");
              if (!ob || !ob.has_call) return null;
              return (
                <div className="border-t border-border pt-3 overflow-x-auto">
                  <div className="label-eyebrow mb-2">Valore lead — Outbound (team)</div>
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr>
                        <th className="table-header-cell text-left">Metrica</th>
                        {ob.mesi.map((m) => <th key={m.mese} className="table-header-cell text-right">{monthLabel(m.mese)}</th>)}
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

      {/* Modale grafico grande */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              Andamento valore call — {chartSeller === "__all__" ? "Media team" : chartSeller}
            </DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Select value={chartSeller} onValueChange={setChartSeller}>
              <SelectTrigger className="h-8 w-[220px] text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Media team</SelectItem>
                {resp?.per_seller.map((s) => (
                  <SelectItem key={s.venditore} value={s.venditore}>{s.venditore}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderChart(440)}
        </DialogContent>
      </Dialog>

      {/* Modale dettaglio singola cella (venditore × fonte) */}
      <Dialog open={!!cellDetail} onOpenChange={(o) => !o && setCellDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cellDetail?.color }} />
              {cellDetail?.title}
            </DialogTitle>
          </DialogHeader>
          {cellDetail && (
            <>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cellDetail.mesi.map((m) => ({ mese: monthLabel(m.mese), "Valore call": m.valore_call, n: m.n_call }))} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
                    <XAxis dataKey="mese" tick={{ fontSize: 12, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`} width={52} />
                    <Tooltip contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => eur(v)} />
                    <Line type="monotone" dataKey="Valore call" stroke={cellDetail.color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-[12.5px] mt-2">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Mese</th>
                    <th className="table-header-cell text-right">Valore call</th>
                    <th className="table-header-cell text-right">N call</th>
                    <th className="table-header-cell text-right">Fatturato</th>
                  </tr>
                </thead>
                <tbody>
                  {cellDetail.mesi.map((m) => (
                    <tr key={m.mese}>
                      <td className="table-body-cell font-medium">{monthLabel(m.mese)}</td>
                      <td className="table-body-cell text-right num font-semibold">{eur(m.valore_call)}</td>
                      <td className="table-body-cell text-right num">{m.n_call}</td>
                      <td className="table-body-cell text-right num text-muted-foreground">{eur(m.fatturato)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ReportValoreCall;
