import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { CalendarDays, Loader2, Save, Trash2, X, Check, Bookmark } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyFonteGroups, fetchFonteGroups, FonteGroupRule } from "@/lib/reports/fonteGroups";
import { fetchCallFilters, addCallFilter, removeCallFilter } from "@/lib/reports/callFilters";

// Mini sparkline multi-serie: una linea per fonte, scala condivisa così le altezze sono confrontabili.
const SparkMulti = ({ series }: { series: { values: number[]; color: string }[] }) => {
  const w = 92, h = 24, pad = 2;
  const all = series.flatMap((s) => s.values);
  if (!series.length || all.length < 2 || all.every((v) => v === 0)) return <span className="text-muted-foreground/30 text-[10px]">—</span>;
  const max = Math.max(...all), min = Math.min(...all), range = max - min || 1;
  const n = Math.max(...series.map((s) => s.values.length));
  const step = (w - pad * 2) / Math.max(1, n - 1);
  const toPath = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * step).toFixed(1)},${(h - pad - ((v - min) / range) * (h - pad * 2)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block align-middle">
      {series.map((s, k) => {
        if (s.values.every((v) => v === 0)) return null;
        const last = s.values.length - 1;
        const lx = pad + last * step, ly = h - pad - ((s.values[last] - min) / range) * (h - pad * 2);
        return (<g key={k}>
          <path d={toPath(s.values)} fill="none" stroke={s.color} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={lx} cy={ly} r={1.6} fill={s.color} />
        </g>);
      })}
    </svg>
  );
};

// Palette linee grafico dettaglio (una per fonte). Totale usa il primo colore.
const PALETTE = ["hsl(232 100% 74%)", "hsl(280 70% 62%)", "hsl(180 65% 48%)", "hsl(38 92% 55%)", "hsl(340 75% 60%)", "hsl(150 60% 50%)", "hsl(20 85% 60%)"];
const weekShort = (ws: string) => { const d = new Date(ws + "T00:00:00Z"); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

interface BC { fonte: string | null; venditore: string | null; created_at: string; }
interface SavedFilter { id: string; nome: string; config: { fonti?: string[]; period?: string; cFrom?: string; cTo?: string } }
const rawFonteOf = (r: BC) => (r.fonte || "—").trim() || "—";
const sellerOf = (r: BC) => (r.venditore || "—").trim() || "—";

// ── Periodi ──
const PERIODS: Record<string, string> = {
  this_week: "Questa settimana",
  last_week: "Settimana scorsa",
  this_month: "Questo mese",
  last_month: "Mese scorso",
  last_4w: "Ultime 4 sett.",
  last_8w: "Ultime 8 sett.",
  last_12w: "Ultime 12 sett.",
  last_26w: "Ultime 26 sett.",
  custom: "Personalizzato",
};
const startOfWeekMon = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; };
const computeRange = (period: string, cFrom: string, cTo: string): { from: string; to: string } => {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  let from = new Date(now);
  switch (period) {
    case "this_week": from = startOfWeekMon(now); break;
    case "last_week": { const s = startOfWeekMon(now); s.setDate(s.getDate() - 7); from = s; const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return { from: s.toISOString(), to: e.toISOString() }; }
    case "this_month": from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); e.setHours(23, 59, 59, 999); return { from: s.toISOString(), to: e.toISOString() }; }
    case "last_4w": from = new Date(now.getTime() - 28 * 86400000); break;
    case "last_8w": from = new Date(now.getTime() - 56 * 86400000); break;
    case "last_12w": from = new Date(now.getTime() - 84 * 86400000); break;
    case "last_26w": from = new Date(now.getTime() - 182 * 86400000); break;
    case "custom":
      return { from: cFrom ? new Date(cFrom + "T00:00:00").toISOString() : new Date(now.getTime() - 56 * 86400000).toISOString(), to: cTo ? new Date(cTo + "T23:59:59").toISOString() : end.toISOString() };
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: end.toISOString() };
};

// lunedì della settimana (ISO), formato YYYY-MM-DD
const weekStart = (iso: string): string => {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // 0=lun
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};
const dayKey = (iso: string): string => new Date(iso).toISOString().slice(0, 10);
const fmtDate = (iso: string): string => { const d = new Date(iso); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };
interface Props { refreshTrigger?: number; }

const CallWeekly = ({ refreshTrigger }: Props) => {
  const { selectedMarket } = useMarket();
  const [rows, setRows] = useState<BC[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("last_8w");
  const [cFrom, setCFrom] = useState("");
  const [cTo, setCTo] = useState("");
  const [fontiSel, setFontiSel] = useState<string[]>([]); // provenienze selezionate (colonne pivot). vuoto = solo totale
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const [groups, setGroups] = useState<FonteGroupRule[]>([]);
  const [chartRow, setChartRow] = useState<string | null>(null); // venditore di cui mostrare il dettaglio

  useEffect(() => { fetchFonteGroups().then(setGroups); }, []);
  // fonte raggruppata secondo le regole configurabili (Impostazioni → provenienze)
  const fonteOf = useCallback((r: BC) => applyFonteGroups(rawFonteOf(r), groups), [groups]);

  const range = useMemo(() => computeRange(period, cFrom, cTo), [period, cFrom, cTo]);

  const load = useCallback(async () => {
    setLoading(true);
    let all: BC[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("booked_call")
        .select("fonte, venditore, created_at")
        .eq("market", selectedMarket)
        .gte("created_at", range.from)
        .lte("created_at", range.to)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      all = all.concat(data as BC[]);
      if (data.length < 1000) break;
      from += 1000;
    }
    setRows(all);
    setLoading(false);
  }, [selectedMarket, range.from, range.to]);

  const loadSaved = useCallback(async () => {
    setSaved(await fetchCallFilters(selectedMarket));
  }, [selectedMarket]);

  useEffect(() => { load(); }, [load, refreshTrigger]);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  // provenienze presenti NEL PERIODO (se non ci sono, non compaiono)
  const fontiAvail = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) { const f = fonteOf(r); c[f] = (c[f] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [rows, fonteOf]);

  // Colonne mostrate = selezionate ∩ presenti nel periodo. La selezione (fontiSel) resta
  // intatta: cambiando periodo le colonne assenti spariscono ma tornano se ripristini il periodo.
  const cols = useMemo(() => fontiSel.filter((f) => fontiAvail.includes(f)), [fontiSel, fontiAvail]);

  // settimane ordinate (per gli sparkline riga)
  // Granularità adattiva: periodi corti (≤16gg, es. "settimana scorsa") → per giorno,
  // altrimenti per settimana. Evita mini-andamento con 1 solo punto.
  const bucketMode: "day" | "week" = useMemo(() => {
    const span = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000;
    return span <= 16 ? "day" : "week";
  }, [range]);
  const bucketOf = useCallback((iso: string) => (bucketMode === "day" ? dayKey(iso) : weekStart(iso)), [bucketMode]);

  // Chiavi bucket continue sull'intero range (niente buchi → linea sempre disegnabile)
  const weekKeys = useMemo(() => {
    const keys: string[] = [];
    const end = new Date(range.to);
    if (bucketMode === "day") {
      const d = new Date(dayKey(range.from) + "T00:00:00Z");
      while (d <= end) { keys.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    } else {
      const d = new Date(weekStart(range.from) + "T00:00:00Z");
      const endW = weekStart(range.to);
      while (true) { const k = d.toISOString().slice(0, 10); keys.push(k); if (k >= endW) break; d.setUTCDate(d.getUTCDate() + 7); }
    }
    return keys;
  }, [range, bucketMode]);

  // Pivot: righe = sales, colonne = provenienze selezionate (+ totale). Cella = n call nel periodo.
  // series = call totali (rispettando fontiSel) per settimana → sparkline riga.
  const pivot = useMemo(() => {
    const idx: Record<string, number> = {};
    weekKeys.forEach((wk, i) => { idx[wk] = i; });
    const bySeller: Record<string, { tot: number; byFonte: Record<string, number>; series: number[]; seriesByFonte: Record<string, number[]> }> = {};
    for (const r of rows) {
      const s = sellerOf(r);
      const f = fonteOf(r);
      if (cols.length > 0 && !cols.includes(f)) continue;
      if (!bySeller[s]) bySeller[s] = { tot: 0, byFonte: {}, series: new Array(weekKeys.length).fill(0), seriesByFonte: {} };
      const wi = idx[bucketOf(r.created_at)];
      if (wi === undefined) continue;
      bySeller[s].tot++;
      bySeller[s].byFonte[f] = (bySeller[s].byFonte[f] || 0) + 1;
      bySeller[s].series[wi]++;
      if (!bySeller[s].seriesByFonte[f]) bySeller[s].seriesByFonte[f] = new Array(weekKeys.length).fill(0);
      bySeller[s].seriesByFonte[f][wi]++;
    }
    return Object.entries(bySeller)
      .map(([venditore, v]) => ({ venditore, ...v }))
      .sort((a, b) => b.tot - a.tot);
  }, [rows, cols, weekKeys, fonteOf, bucketOf]);

  // Totali colonna
  const pivotTotals = useMemo(() => {
    const cols: Record<string, number> = {};
    const series = new Array(weekKeys.length).fill(0);
    const seriesByFonte: Record<string, number[]> = {};
    let tot = 0;
    for (const r of pivot) {
      tot += r.tot;
      for (const [f, n] of Object.entries(r.byFonte)) cols[f] = (cols[f] || 0) + n;
      r.series.forEach((n, i) => { series[i] += n; });
      for (const [f, arr] of Object.entries(r.seriesByFonte)) {
        if (!seriesByFonte[f]) seriesByFonte[f] = new Array(weekKeys.length).fill(0);
        arr.forEach((n, i) => { seriesByFonte[f][i] += n; });
      }
    }
    return { cols, tot, series, seriesByFonte };
  }, [pivot, weekKeys]);

  // Dati grafico dettaglio del venditore selezionato: Totale + una linea per fonte selezionata.
  const chart = useMemo(() => {
    if (!chartRow) return null;
    const row = pivot.find((r) => r.venditore === chartRow);
    if (!row) return null;
    const fonti = cols.length ? cols : [];
    const data = weekKeys.map((wk, i) => {
      const o: Record<string, string | number> = { settimana: weekShort(wk), Totale: row.series[i] };
      for (const f of fonti) o[f] = row.seriesByFonte[f]?.[i] ?? 0;
      return o;
    });
    return { venditore: row.venditore, tot: row.tot, fonti, data };
  }, [chartRow, pivot, cols, weekKeys]);

  // Colore coerente per fonte (legenda = mini sparkline = grafico grande)
  const colorOfFonte = useCallback((f: string) => PALETTE[Math.max(0, cols.indexOf(f)) % PALETTE.length], [cols]);
  // Serie mini sparkline riga: una per fonte mostrata, altrimenti solo il totale.
  const rowSeries = useCallback((sbf: Record<string, number[]>, tot: number[]) =>
    cols.length
      ? cols.map((f) => ({ values: sbf[f] ?? new Array(weekKeys.length).fill(0), color: colorOfFonte(f) }))
      : [{ values: tot, color: PALETTE[0] }]
  , [cols, weekKeys, colorOfFonte]);

  const toggleFonte = (f: string) => setFontiSel((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const saveFilter = async () => {
    if (!filterName.trim()) { toast.error("Dai un nome al filtro"); return; }
    const ok = await addCallFilter(selectedMarket, filterName.trim(), { fonti: fontiSel, period, cFrom, cTo });
    if (!ok) { toast.error("Errore salvataggio"); return; }
    toast.success("Filtro salvato");
    setFilterName("");
    loadSaved();
  };
  const applyFilter = (f: SavedFilter) => {
    if (f.config.period) setPeriod(f.config.period);
    if (f.config.cFrom !== undefined) setCFrom(f.config.cFrom || "");
    if (f.config.cTo !== undefined) setCTo(f.config.cTo || "");
    setFontiSel(f.config.fonti || []);
  };
  const deleteFilter = async (id: string) => {
    await removeCallFilter(selectedMarket, id);
    loadSaved();
  };

  const totale = rows.length;

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Call per settimana e provenienza</CardTitle>
          <p className="text-[12px] text-muted-foreground mt-1">Call entrate per {bucketMode === "day" ? "giorno" : "settimana"}, per provenienza. {totale} call · {PERIODS[period]} · <span className="text-foreground/80">{fmtDate(range.from)} – {fmtDate(range.to)}</span>.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-[170px] text-[12.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="flex items-center gap-1">
              <Input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} className="h-8 w-[140px] text-[12px]" />
              <span className="text-muted-foreground text-[12px]">→</span>
              <Input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} className="h-8 w-[140px] text-[12px]" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtri salvati */}
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="label-eyebrow mr-1">Filtri salvati</span>
            {saved.map((f) => (
              <span key={f.id} className="inline-flex items-center rounded-lg border border-border bg-secondary overflow-hidden transition-colors hover:border-primary/50">
                <button onClick={() => applyFilter(f)} title="Applica filtro" className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 text-[12.5px] font-medium hover:text-primary transition-colors">
                  <Bookmark className="h-3.5 w-3.5 opacity-70" />{f.nome}
                </button>
                <button onClick={() => deleteFilter(f.id)} title="Elimina filtro" className="px-1.5 self-stretch flex items-center border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Selettore fonti */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="label-eyebrow">Provenienza call {fontiSel.length === 0 ? "(nessuna = solo totale)" : "(colonne tabella)"}</span>
            {fontiSel.length > 0 && <button onClick={() => setFontiSel([])} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="h-3 w-3" /> azzera</button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fontiAvail.map((f) => {
              const on = fontiSel.includes(f);
              return (
                <button key={f} onClick={() => toggleFonte(f)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12.5px] font-medium transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-foreground/85 hover:border-primary/40 hover:text-foreground"}`}>
                  {on && <Check className="h-3.5 w-3.5" />}{f}
                </button>
              );
            })}
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {/* Tabella pivot: SALES (righe) × PROVENIENZE selezionate (colonne) */}
            <div className="border-t border-border pt-3">
              <div className="label-eyebrow mb-2">Call per sales × provenienza {cols.length > 0 ? `(${cols.length} provenienze)` : "(totale)"} · {PERIODS[period]}</div>
              {/* Legenda mini-andamento: colore ↔ provenienza (una linea per fonte) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[11px]">
                <span className="text-muted-foreground uppercase tracking-wide">Andamento:</span>
                {cols.length > 0 ? cols.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-[2px] rounded" style={{ background: colorOfFonte(f) }} />{f}
                  </span>
                )) : (
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 h-[2px] rounded" style={{ background: PALETTE[0] }} />Totale call</span>
                )}
              </div>
              <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="[&>th]:align-bottom">
                      <th className="table-header-cell text-left sticky left-0 top-0 bg-card z-30">Sales</th>
                      {cols.map((f) => <th key={f} className="table-header-cell text-right sticky top-0 bg-card z-20 whitespace-normal break-words leading-tight w-[72px]">{f}</th>)}
                      <th className="table-header-cell text-right sticky top-0 bg-card z-20">Totale</th>
                      <th className="table-header-cell text-center sticky top-0 bg-card z-20 whitespace-nowrap">Andamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.length === 0 ? (
                      <tr><td colSpan={cols.length + 3} className="table-body-cell text-center text-muted-foreground py-4">Nessuna call nel periodo</td></tr>
                    ) : (
                      <>
                        {pivot.map((r) => (
                          <tr key={r.venditore}>
                            <td className="table-body-cell font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{r.venditore}</td>
                            {cols.map((f) => (
                              <td key={f} className="table-body-cell text-right num">{r.byFonte[f] || <span className="text-muted-foreground/40">0</span>}</td>
                            ))}
                            <td className="table-body-cell text-right num font-semibold">{r.tot}</td>
                            <td className="table-body-cell text-center">
                              <button type="button" onClick={() => setChartRow(r.venditore)} className="hover:bg-secondary/40 rounded px-1 transition-colors cursor-pointer" title="Clicca per il dettaglio">
                                <SparkMulti series={rowSeries(r.seriesByFonte, r.series)} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-secondary/40 font-semibold">
                          <td className="table-body-cell sticky left-0 bg-card z-10">Totale</td>
                          {cols.map((f) => <td key={f} className="table-body-cell text-right num">{pivotTotals.cols[f] || 0}</td>)}
                          <td className="table-body-cell text-right num">{pivotTotals.tot}</td>
                          <td className="table-body-cell text-center"><SparkMulti series={rowSeries(pivotTotals.seriesByFonte, pivotTotals.series)} /></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Salva filtro corrente */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Nome filtro da salvare…" className="h-8 max-w-[240px]" onKeyDown={(e) => e.key === "Enter" && saveFilter()} />
              <Button size="sm" variant="outline" onClick={saveFilter}><Save className="h-3.5 w-3.5 mr-1.5" /> Salva filtro</Button>
              <span className="text-[11px] text-muted-foreground">salva provenienze + periodo selezionati</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Dialog dettaglio andamento venditore: Totale + una linea per fonte selezionata */}
    <Dialog open={!!chartRow} onOpenChange={(o) => !o && setChartRow(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Andamento call · {chart?.venditore} <span className="text-muted-foreground font-normal">· {PERIODS[period]} · {chart?.tot ?? 0} call</span>
          </DialogTitle>
        </DialogHeader>
        {chart && (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
                <XAxis dataKey="settimana" tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <RTooltip contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Totale" stroke="hsl(220 6% 72%)" strokeWidth={chart.fonti.length ? 2 : 3} dot={{ r: 3 }} activeDot={{ r: 6 }} strokeDasharray={chart.fonti.length ? "4 3" : undefined} />
                {chart.fonti.map((f) => (
                  <Line key={f} type="monotone" dataKey={f} stroke={colorOfFonte(f)} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {chart && chart.fonti.length === 0 && (
          <p className="text-[12px] text-muted-foreground -mt-2">Seleziona delle provenienze in alto per vedere una linea per ciascuna.</p>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CallWeekly;
