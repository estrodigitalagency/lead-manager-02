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

interface BC { fonte: string | null; created_at: string; }
interface SavedFilter { id: string; nome: string; config: { fonti?: string[]; weeks?: number }; }

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
  const [weeks, setWeeks] = useState(12);
  const [fontiSel, setFontiSel] = useState<string[]>([]); // vuoto = tutte (totale)
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString();
    let all: BC[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("booked_call")
        .select("fonte, created_at")
        .eq("market", selectedMarket)
        .gte("created_at", since)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      all = all.concat(data as BC[]);
      if (data.length < 1000) break;
      from += 1000;
    }
    setRows(all);
    setLoading(false);
  }, [selectedMarket, weeks]);

  const loadSaved = useCallback(async () => {
    const { data } = await supabase.from("call_report_filters").select("*").eq("market", selectedMarket).order("created_at", { ascending: false });
    setSaved((data as any) || []);
  }, [selectedMarket]);

  useEffect(() => { load(); }, [load, refreshTrigger]);
  useEffect(() => { loadSaved(); }, [loadSaved]);

  // fonti disponibili (ordinate per volume)
  const fontiAvail = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) { const f = (r.fonte || "—").trim() || "—"; c[f] = (c[f] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  }, [rows]);

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
      const wk = weekStart(r.created_at);
      const f = (r.fonte || "—").trim() || "—";
      if (fontiSel.length > 0) {
        if (!fontiSel.includes(f)) continue;
        byWeek[wk][f] = (byWeek[wk][f] || 0) + 1;
      } else {
        byWeek[wk]["Totale"] = (byWeek[wk]["Totale"] || 0) + 1;
      }
    }
    return weekKeys.map((wk) => ({ settimana: weekLabel(wk), ...byWeek[wk] }));
  }, [rows, weekKeys, fontiSel]);

  const toggleFonte = (f: string) => setFontiSel((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const saveFilter = async () => {
    if (!filterName.trim()) { toast.error("Dai un nome al filtro"); return; }
    const { error } = await supabase.from("call_report_filters").insert({ nome: filterName.trim(), config: { fonti: fontiSel, weeks }, market: selectedMarket } as any);
    if (error) { toast.error("Errore salvataggio"); return; }
    toast.success("Filtro salvato");
    setFilterName("");
    loadSaved();
  };
  const applyFilter = (f: SavedFilter) => {
    setFontiSel(f.config.fonti || []);
    if (f.config.weeks) setWeeks(f.config.weeks);
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
          <p className="text-[12px] text-muted-foreground mt-1">Call entrate per settimana, per provenienza. {totale} call negli ultimi {weeks} settimane.</p>
        </div>
        <Select value={String(weeks)} onValueChange={(v) => setWeeks(parseInt(v))}>
          <SelectTrigger className="h-8 w-[150px] text-[12.5px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="8">Ultime 8 sett.</SelectItem>
            <SelectItem value="12">Ultime 12 sett.</SelectItem>
            <SelectItem value="26">Ultime 26 sett.</SelectItem>
            <SelectItem value="52">Ultime 52 sett.</SelectItem>
          </SelectContent>
        </Select>
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
            <span className="label-eyebrow">Provenienza call {fontiSel.length === 0 && "(tutte = totale)"}</span>
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
