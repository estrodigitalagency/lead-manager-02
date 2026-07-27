import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Loader2, Save, Trash2, X, Check } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PALETTE = [
  "hsl(232 100% 74%)", "hsl(280 70% 62%)", "hsl(180 65% 48%)", "hsl(38 92% 55%)",
  "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(320 65% 60%)", "hsl(200 80% 55%)",
  "hsl(90 55% 50%)", "hsl(15 80% 58%)", "hsl(260 60% 62%)", "hsl(160 60% 45%)",
];

interface BC { fonte: string | null; venditore: string | null; created_at: string; }
interface SavedFilter { id: string; nome: string; config: { fonti?: string[]; period?: string; cFrom?: string; cTo?: string } }
const fonteOf = (r: BC) => (r.fonte || "—").trim() || "—";
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
const weekLabel = (ws: string) => {
  const d = new Date(ws + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

interface Props { refreshTrigger?: number; }

const CallWeekly = ({ refreshTrigger }: Props) => {
  const { selectedMarket } = useMarket();
  const [rows, setRows] = useState<BC[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("last_8w");
  const [cFrom, setCFrom] = useState("");
  const [cTo, setCTo] = useState("");
  const [chartSeller, setChartSeller] = useState(""); // grafico per singolo venditore (default: primo per volume)
  const [fontiSel, setFontiSel] = useState<string[]>([]); // provenienze selezionate (colonne pivot). vuoto = solo totale
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");

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
    const { data } = await supabase.from("call_report_filters").select("*").eq("market", selectedMarket).order("created_at", { ascending: false });
    setSaved((data as any) || []);
  }, [selectedMarket]);

  useEffect(() => { load(); }, [load, refreshTrigger]);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  // provenienze presenti NEL PERIODO (se non ci sono, non compaiono)
  const fontiAvail = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) { const f = fonteOf(r); c[f] = (c[f] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [rows]);

  // venditori presenti nel periodo (per selettore grafico)
  const sellersAvail = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) { const s = sellerOf(r); c[s] = (c[s] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [rows]);

  // Se una fonte selezionata non è più presente nel periodo, la deseleziono
  useEffect(() => {
    setFontiSel((prev) => prev.filter((f) => fontiAvail.includes(f)));
  }, [fontiAvail]);

  // Default venditore grafico = primo per volume; se quello scelto non c'è più, ripiega
  useEffect(() => {
    if (sellersAvail.length > 0 && !sellersAvail.includes(chartSeller)) setChartSeller(sellersAvail[0]);
  }, [sellersAvail, chartSeller]);

  // Pivot: righe = sales, colonne = provenienze selezionate (+ totale). Cella = n call nel periodo
  const pivot = useMemo(() => {
    const bySeller: Record<string, { tot: number; byFonte: Record<string, number> }> = {};
    for (const r of rows) {
      const s = sellerOf(r);
      const f = fonteOf(r);
      if (fontiSel.length > 0 && !fontiSel.includes(f)) continue;
      if (!bySeller[s]) bySeller[s] = { tot: 0, byFonte: {} };
      bySeller[s].tot++;
      bySeller[s].byFonte[f] = (bySeller[s].byFonte[f] || 0) + 1;
    }
    return Object.entries(bySeller)
      .map(([venditore, v]) => ({ venditore, ...v }))
      .sort((a, b) => b.tot - a.tot);
  }, [rows, fontiSel]);

  // Totali colonna
  const pivotTotals = useMemo(() => {
    const cols: Record<string, number> = {};
    let tot = 0;
    for (const r of pivot) { tot += r.tot; for (const [f, n] of Object.entries(r.byFonte)) cols[f] = (cols[f] || 0) + n; }
    return { cols, tot };
  }, [pivot]);

  // settimane ordinate
  const weekKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(weekStart(r.created_at));
    return [...s].sort();
  }, [rows]);

  // serie per grafico: se fonti selezionate → una serie per fonte; altrimenti totale
  const activeFonti = fontiSel.length > 0 ? fontiSel : ["Totale"];
  const chartData = useMemo(() => {
    const byWeek: Record<string, Record<string, number>> = {};
    for (const wk of weekKeys) byWeek[wk] = {};
    for (const r of rows) {
      if (chartSeller && sellerOf(r) !== chartSeller) continue; // grafico per singolo venditore
      const wk = weekStart(r.created_at);
      const f = fonteOf(r);
      if (fontiSel.length > 0) {
        if (!fontiSel.includes(f)) continue;
        byWeek[wk][f] = (byWeek[wk][f] || 0) + 1;
      } else {
        byWeek[wk]["Totale"] = (byWeek[wk]["Totale"] || 0) + 1;
      }
    }
    return weekKeys.map((wk) => ({ settimana: weekLabel(wk), ...byWeek[wk] }));
  }, [rows, weekKeys, fontiSel, chartSeller]);

  const toggleFonte = (f: string) => setFontiSel((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const saveFilter = async () => {
    if (!filterName.trim()) { toast.error("Dai un nome al filtro"); return; }
    const { error } = await supabase.from("call_report_filters").insert({ nome: filterName.trim(), config: { fonti: fontiSel, period, cFrom, cTo }, market: selectedMarket } as any);
    if (error) { toast.error("Errore salvataggio"); return; }
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
    await supabase.from("call_report_filters").delete().eq("id", id);
    loadSaved();
  };

  const totale = rows.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Call per settimana e provenienza</CardTitle>
          <p className="text-[12px] text-muted-foreground mt-1">Call entrate per settimana, per provenienza. {totale} call nel periodo — {PERIODS[period]}.</p>
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
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="label-eyebrow mr-1">Salvati:</span>
            {saved.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border border-border bg-secondary text-[11px]">
                <button onClick={() => applyFilter(f)} className="hover:text-primary font-medium">{f.nome}</button>
                <button onClick={() => deleteFilter(f.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
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
                <button key={f} onClick={() => toggleFonte(f)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${on ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary hover:border-border/80"}`}>
                  {on && <Check className="h-3 w-3" />}{f}
                </button>
              );
            })}
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {/* Selettore venditore per il grafico (sempre per singolo venditore) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="label-eyebrow">Grafico settimanale · venditore</span>
              <Select value={chartSeller} onValueChange={setChartSeller}>
                <SelectTrigger className="h-7 w-[220px] text-[12px]"><SelectValue placeholder="Seleziona venditore" /></SelectTrigger>
                <SelectContent>
                  {sellersAvail.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 8% 15%)" vertical={false} />
                  <XAxis dataKey="settimana" tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220 6% 60%)" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                  <Tooltip contentStyle={{ background: "hsl(220 12% 10.5%)", border: "1px solid hsl(220 8% 15%)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {activeFonti.map((f, i) => (
                    <Bar key={f} dataKey={f} stackId="a" fill={PALETTE[i % PALETTE.length]} radius={i === activeFonti.length - 1 ? [3, 3, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabella pivot: SALES (righe) × PROVENIENZE selezionate (colonne) */}
            <div className="border-t border-border pt-3">
              <div className="label-eyebrow mb-2">Call per sales × provenienza {fontiSel.length > 0 ? `(${fontiSel.length} provenienze)` : "(totale)"} · {PERIODS[period]}</div>
              <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="table-header-cell text-left sticky left-0 top-0 bg-card z-30">Sales</th>
                      {fontiSel.map((f) => <th key={f} className="table-header-cell text-right sticky top-0 bg-card z-20 whitespace-nowrap">{f}</th>)}
                      <th className="table-header-cell text-right sticky top-0 bg-card z-20">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.length === 0 ? (
                      <tr><td colSpan={fontiSel.length + 2} className="table-body-cell text-center text-muted-foreground py-4">Nessuna call nel periodo</td></tr>
                    ) : (
                      <>
                        {pivot.map((r) => (
                          <tr key={r.venditore}>
                            <td className="table-body-cell font-medium sticky left-0 bg-card z-10 whitespace-nowrap">{r.venditore}</td>
                            {fontiSel.map((f) => (
                              <td key={f} className="table-body-cell text-right num">{r.byFonte[f] || <span className="text-muted-foreground/40">0</span>}</td>
                            ))}
                            <td className="table-body-cell text-right num font-semibold">{r.tot}</td>
                          </tr>
                        ))}
                        <tr className="bg-secondary/40 font-semibold">
                          <td className="table-body-cell sticky left-0 bg-card z-10">Totale</td>
                          {fontiSel.map((f) => <td key={f} className="table-body-cell text-right num">{pivotTotals.cols[f] || 0}</td>)}
                          <td className="table-body-cell text-right num">{pivotTotals.tot}</td>
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
  );
};

export default CallWeekly;
