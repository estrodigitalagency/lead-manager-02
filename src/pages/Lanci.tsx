import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Rocket, AlertTriangle } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  fetchLanci, fetchLancioData, fetchColorRules,
  LancioConfig, LancioData, ColorRule,
} from "@/lib/lanci/config";
import AcquisizioneWidget from "@/components/lanci/AcquisizioneWidget";
import LancioMatrix, { fmt } from "@/components/lanci/LancioMatrix";
import LancioMobile from "@/components/lanci/LancioMobile";

const Lanci = () => {
  const { selectedMarket } = useMarket();
  const isMobile = useIsMobile();
  const [lanci, setLanci] = useState<LancioConfig[]>([]);
  const [lancioId, setLancioId] = useState("");
  const [data, setData] = useState<LancioData | null>(null);
  const [rules, setRules] = useState<ColorRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(true);

  useEffect(() => {
    fetchLanci().then((l) => {
      setLanci(l);
      setLancioId((cur) => cur || l[0]?.id || "");
    });
  }, []);

  const load = useCallback(async (force = false) => {
    if (!lancioId) return;
    setLoading(true); setErr(null);
    try {
      const [d, r] = await Promise.all([
        fetchLancioData(lancioId, selectedMarket, force),
        fetchColorRules(lancioId),
      ]);
      setData(d); setRules(r);
    } catch (e: any) {
      setErr(e.message || "Errore nel caricamento");
      setData(null);
    } finally { setLoading(false); }
  }, [lancioId, selectedMarket]);

  useEffect(() => { load(); }, [load]);

  // sales inclusi: da config; se vuota, tutti quelli con dati
  const rows = useMemo(() => {
    if (!data) return [];
    const sel = data.lancio.sales ?? [];
    const withData = data.rows.filter((r) => r.tot_lead > 0 || r.call_totali > 0);
    return sel.length ? withData.filter((r) => sel.includes(r.venditore)) : withData;
  }, [data]);

  const kpi = useMemo(() => {
    if (!data) return [];
    const sum = (k: string) => rows.reduce((s, r) => s + ((r as any)[k] || 0), 0);
    const lg = data.leadgen, t = data.totale ?? ({} as any);
    const nuovi = lg ? Object.values(lg.per_fonte).reduce((s, c) => s + c.Nuovo, 0) : 0;
    return [
      { k: "Lead generati", v: lg ? fmt.n(lg.generati) : "—", s: lg ? `${fmt.n(nuovi)} nuovi · ${fmt.n(lg.generati - nuovi)} vecchi` : "", lead: true },
      { k: "Assegnati", v: fmt.n(sum("tot_lead")), s: lg ? `${((sum("tot_lead") / lg.generati) * 100).toFixed(1).replace(".", ",")}% dei generati` : "", lead: true },
      { k: "Voto medio", v: fmt.dec(t.media_voto ?? 0), s: `${t.app_conferma ?? 0}% conferma`, lead: true },
      { k: "Call totali", v: fmt.n(sum("call_totali")), s: `${fmt.n(sum("call_nette"))} nette · ${t.nette_su_totali ?? 0}%` },
      { k: "Chiusure", v: fmt.n(sum("chiusure")), s: `CR ${t.tasso_chiusura_nette ?? 0}% su nette` },
      { k: "Fatturato", v: fmt.eur(sum("fatturato")), s: `incassato ${fmt.eur(sum("incassato"))}` },
    ];
  }, [data, rows]);

  return (
    <div className="max-w-[1520px] mx-auto px-3 sm:px-5 pt-16 py-5 pb-24 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Analytics Lancio</h1>
          {data && (
            <p className="text-[12px] text-muted-foreground mt-1 hidden sm:block">
              call <code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px]">{data.lancio.provenienza}</code>
              {" · "}{data.lancio.call_tabs.map((t) => <code key={t} className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px] mr-1">{t}</code>)}
              {" · lead "}<code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px]">{data.lancio.lead_tab}</code>
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={lancioId} onValueChange={setLancioId}>
            <SelectTrigger className="h-8 w-[200px] text-[12.5px]"><SelectValue placeholder="Seleziona lancio" /></SelectTrigger>
            <SelectContent>
              {lanci.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {!isMobile && (
            <Button size="sm" variant={heatmap ? "default" : "outline"} className="h-8" onClick={() => setHeatmap((v) => !v)}>
              Heatmap {heatmap ? "ON" : "OFF"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {lanci.length === 0 && !loading && (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          Nessun lancio configurato. Vai in <b>Impostazioni → Lanci</b> per crearne uno.
        </CardContent></Card>
      )}

      {err && (
        <Card className="border-destructive/40"><CardContent className="py-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {err}
        </CardContent></Card>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {kpi.map((c) => (
              <div key={c.k} className={`rounded-xl border border-border bg-card p-3 border-l-[3px] ${c.lead ? "border-l-teal-400" : "border-l-primary"}`}>
                <div className="label-eyebrow">{c.k}</div>
                <div className="text-lg font-bold num tracking-tight">{c.v}</div>
                <div className="text-[10.5px] text-muted-foreground">{c.s}</div>
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="py-2.5 px-3.5 border-b border-border">
              <CardTitle className="label-eyebrow flex items-center justify-between gap-2">
                <span>{isMobile ? "Dettaglio per sales" : "Matrice — clicca ▾ per chiudere una sezione"}</span>
                <span className="text-primary">{rows.length} sales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile
                ? <LancioMobile data={data} rows={rows} rules={rules} />
                : <LancioMatrix data={data} rows={rows} rules={rules} heatmap={heatmap} />}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="py-2.5 px-3.5 border-b border-border">
              <CardTitle className="label-eyebrow">Acquisizione lead — andamento e mix per fonte</CardTitle>
            </CardHeader>
            <CardContent className="p-0"><AcquisizioneWidget leadgen={data.leadgen} /></CardContent>
          </Card>

          {data.errors?.length > 0 && (
            <details className="text-[11.5px] text-muted-foreground">
              <summary className="cursor-pointer">{data.errors.length} avvisi di lettura fogli</summary>
              <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">{data.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
};

export default Lanci;
