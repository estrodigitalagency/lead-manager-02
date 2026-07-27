import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Settings2, X, Plus, Save } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

const BUCKET_LABELS: Record<string, string> = {
  "3sfere": "3Sfere",
  setter_ig: "Setter IG",
  setter_new: "Setter New",
  vsl: "VSL / Funnel",
  outbound: "Outbound",
};

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
  mesi: MonthData[];
  trend: string;
}
interface Response {
  market: string;
  months: string[];
  sellers_used: number;
  sellers_total: number;
  data: BucketData[];
  unmapped: Record<string, number>;
  errors: string[];
  generated_at: string;
}

interface BucketDef { id: string; label: string; sources: string[]; }
interface BucketConfig { buckets: BucketDef[]; ignore: string[]; }

const eur = (n: number) => `€${n.toLocaleString("it-IT")}`;
const monthLabel = (mk: string) => {
  const [m, y] = mk.split("/");
  const names = ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${names[parseInt(m, 10)]} ${y.slice(2)}`;
};

const SourceAdder = ({ onAdd }: { onAdd: (v: string) => void; suggestions?: string[] }) => {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1.5">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v); setV(""); } }}
        placeholder="aggiungi fonte (es. vsl* o typeform)"
        className="h-7 text-[11px]"
      />
      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => { if (v.trim()) { onAdd(v); setV(""); } }}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

const TrendBadge = ({ t }: { t: string }) => {
  if (t === "asc") return <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px] font-medium"><TrendingUp className="h-3 w-3" /> in crescita</span>;
  if (t === "desc") return <span className="inline-flex items-center gap-1 text-destructive text-[11px] font-medium"><TrendingDown className="h-3 w-3" /> in calo</span>;
  if (t === "stable") return <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] font-medium"><Minus className="h-3 w-3" /> stabile</span>;
  return <span className="text-muted-foreground text-[11px]">—</span>;
};

const ValoreCallView = () => {
  const { selectedMarket } = useMarket();
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState<BucketConfig | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);

  const loadConfig = useCallback(async () => {
    const { data } = await supabase.from("ranking_settings").select("value").eq("key", "valore_call_buckets").maybeSingle();
    if (data?.value) {
      try { setCfg(JSON.parse(data.value)); } catch { /* */ }
    }
  }, []);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async () => {
    if (!cfg) return;
    setSavingCfg(true);
    const { error } = await supabase.from("ranking_settings").upsert(
      { key: "valore_call_buckets", value: JSON.stringify(cfg), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSavingCfg(false);
    if (error) { toast.error("Errore salvataggio configurazione"); return; }
    toast.success("Configurazione salvata");
    load();
  };

  const addSource = (bucketId: string, src: string) => {
    const s = src.trim().toLowerCase();
    if (!s || !cfg) return;
    setCfg({ ...cfg, buckets: cfg.buckets.map(b => b.id === bucketId && !b.sources.includes(s) ? { ...b, sources: [...b.sources, s] } : b) });
  };
  const removeSource = (bucketId: string, src: string) => {
    if (!cfg) return;
    setCfg({ ...cfg, buckets: cfg.buckets.map(b => b.id === bucketId ? { ...b, sources: b.sources.filter(x => x !== src) } : b) });
  };

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/valore-call?market=${selectedMarket}${force ? "&nocache=1" : ""}`, {
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

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[12.5px] text-muted-foreground">
            Valore call = Fatturato / Call fatte, per fonte, ultimi 3 mesi. Dati live dai fogli venditore (tab Analytics Fonte).
          </p>
          {resp && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {resp.sellers_used}/{resp.sellers_total} venditori · aggiornato {new Date(resp.generated_at).toLocaleString("it-IT")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(v => !v)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Configura fonti
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Editor bucket (customizzabile, no codice) */}
      {showConfig && cfg && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Configurazione fonti → bucket</CardTitle>
            <Button size="sm" onClick={saveConfig} disabled={savingCfg}>
              {savingCfg ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Salva
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[11px] text-muted-foreground">
              Assegna le fonti (come scritte nel foglio) a ciascun gruppo. Usa <code>*</code> come jolly finale (es. <code>vsl*</code> prende vsl14, vsl16…). Dopo aver salvato, premi Aggiorna per ricalcolare.
            </p>
            {cfg.buckets.map((b) => (
              <div key={b.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="font-medium text-[13px]">{b.label} <span className="text-muted-foreground text-[11px]">({b.id})</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {b.sources.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-secondary text-[11px]">
                      {s}
                      <button onClick={() => removeSource(b.id, s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <SourceAdder onAdd={(v) => addSource(b.id, v)} suggestions={resp ? Object.keys(resp.unmapped) : []} />
              </div>
            ))}

            {/* Fonti non mappate — assegnazione rapida */}
            {resp && Object.keys(resp.unmapped).length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                <div className="text-[12px] font-medium text-amber-600 dark:text-amber-400">Fonti non ancora mappate</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(resp.unmapped).sort((a, b) => b[1] - a[1]).map(([src, cnt]) => (
                    <select
                      key={src}
                      className="text-[11px] bg-secondary border border-border rounded px-1.5 py-1"
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) addSource(e.target.value, src); }}
                    >
                      <option value="">{src} ({cnt}) → …</option>
                      {cfg.buckets.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Scegli il bucket, poi Salva + Aggiorna.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {err && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-[12.5px] text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {loading && !resp && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {resp && (
        <>
          {/* Valore call per bucket */}
          <Card>
            <CardHeader>
              <CardTitle>Valore call per fonte</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Fonte</th>
                    {resp.months.map((mk) => (
                      <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>
                    ))}
                    <th className="table-header-cell text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {resp.data.map((b) => (
                    <tr key={b.bucket}>
                      <td className="table-body-cell font-medium">{(b as any).label || BUCKET_LABELS[b.bucket] || b.bucket}</td>
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
            </CardContent>
          </Card>

          {/* Valore lead (outbound) */}
          <Card>
            <CardHeader>
              <CardTitle>Valore lead — Outbound</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Metrica</th>
                    {resp.months.map((mk) => (
                      <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const ob = resp.data.find((d) => d.bucket === "outbound");
                    if (!ob) return null;
                    return (
                      <>
                        <tr>
                          <td className="table-body-cell font-medium">Valore lead</td>
                          {ob.mesi.map((m) => (
                            <td key={m.mese} className="table-body-cell text-right num font-semibold">
                              {m.valore_lead > 0 ? eur(m.valore_lead) : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="table-body-cell text-muted-foreground">Fatturato</td>
                          {ob.mesi.map((m) => (
                            <td key={m.mese} className="table-body-cell text-right num text-muted-foreground">{eur(m.fatturato)}</td>
                          ))}
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {resp.unmapped && Object.keys(resp.unmapped).length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Fonti non mappate (ignorate): {Object.entries(resp.unmapped).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} (${v})`).join(", ")}
            </p>
          )}
          {resp.errors && resp.errors.length > 0 && (
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">Errori lettura ({resp.errors.length})</summary>
              <ul className="mt-1 space-y-0.5 pl-3">
                {resp.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
};

export default ValoreCallView;
