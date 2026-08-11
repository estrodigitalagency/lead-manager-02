import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Rocket, AlertTriangle } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchLanci, fetchLancioData, fetchColorRules, LancioConfig, LancioData, ColorRule } from "@/lib/lanci/config";
import AcquisizioneWidget from "@/components/lanci/AcquisizioneWidget";
import SpeedToLeadWidget from "@/components/lanci/SpeedToLeadWidget";
import DocumentazioneDialog from "@/components/lanci/DocumentazioneDialog";
import QualitaLeadWidget from "@/components/lanci/QualitaLeadWidget";
import LancioMatrix, { fmt } from "@/components/lanci/LancioMatrix";
import LancioMobile from "@/components/lanci/LancioMobile";
import TabDistribuzione from "@/components/lanci/TabDistribuzione";
import TabWhatsapp from "@/components/lanci/TabWhatsapp";

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
  const [tab, setTab] = useState("panoramica");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [bg, setBg] = useState(false);   // aggiornamento silenzioso in corso
  const [adesso, setAdesso] = useState(() => Date.now());   // fa invecchiare l'etichetta da sola

  useEffect(() => {
    fetchLanci().then((l) => { setLanci(l); setLancioId((cur) => cur || l[0]?.id || ""); });
  }, []);

  const load = useCallback(async (force = false, silent = false) => {
    if (!lancioId) return;
    silent ? setBg(true) : setLoading(true);
    if (!silent) setErr(null);
    try {
      const [d, r] = await Promise.all([
        fetchLancioData(lancioId, selectedMarket, force),
        fetchColorRules(lancioId),
      ]);
      setData(d); setRules(r); setLastSync(new Date());
    } catch (e: any) {
      if (!silent) { setErr(e.message || "Errore nel caricamento"); setData(null); }
    } finally { silent ? setBg(false) : setLoading(false); }
  }, [lancioId, selectedMarket]);
  useEffect(() => { load(); }, [load]);

  // Aggiornamento automatico ogni 5 min, solo a scheda visibile: la risposta arriva dalla
  // cache dell'edge (~1s) e i fogli Google vengono riletti al massimo ogni 15 min.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") load(false, true); };
    const id = setInterval(tick, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setAdesso(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = useMemo(() => lanci.find((l) => l.id === lancioId) ?? null, [lanci, lancioId]);
  // I dati arrivano dopo il cambio di lancio: finché sono di un altro lancio non vanno mostrati.
  const dataDelLancio = data && data.lancio?.id === lancioId ? data : null;

  // Età dei dati: conta il momento in cui l'edge li ha calcolati, non quando il browser li ha
  // ricevuti. La risposta può arrivare dalla cache e sembrare fresca senza esserlo.
  const etaMin = useMemo(() => {
    const t = dataDelLancio?.generated_at ? Date.parse(dataDelLancio.generated_at) : NaN;
    return isFinite(t) ? Math.max(0, Math.floor((adesso - t) / 60_000)) : null;
  }, [dataDelLancio, adesso]);

  // Un tab che manca è una configurazione da sistemare; una lettura fallita è un totale sbagliato.
  const letturefallite = useMemo(
    () => (dataDelLancio?.errors ?? []).filter((e) => e.startsWith("LETTURA FALLITA")),
    [dataDelLancio],
  );

  const etaTesto = useMemo(() => {
    if (etaMin === null) return "";
    if (etaMin < 1) return "meno di un minuto fa";
    if (etaMin === 1) return "un minuto fa";
    if (etaMin < 60) return `${etaMin} minuti fa`;
    const h = Math.floor(etaMin / 60), m = etaMin % 60;
    if (h < 24) return m ? `${h}h ${m}m fa` : `${h} ore fa`;
    const g = Math.floor(h / 24);
    return g === 1 ? "ieri" : `${g} giorni fa`;
  }, [etaMin]);
  const reload = useCallback(() => { fetchLanci().then(setLanci); load(true); }, [load]);

  // sales inclusi: da config; se vuota, tutti quelli con dati
  const rows = useMemo(() => {
    if (!dataDelLancio) return [];
    const sel = dataDelLancio.lancio?.sales ?? [];
    const withData = dataDelLancio.rows.filter((r) => r.tot_lead > 0 || r.call_totali > 0);
    return sel.length ? withData.filter((r) => sel.includes(r.venditore)) : withData;
  }, [dataDelLancio]);

  const sum = useCallback((k: string) => rows.reduce((s, r) => s + ((r as any)[k] || 0), 0), [rows]);

  // Funnel: dai lead generati alle chiusure, con conversione tra gli stadi
  const funnel = useMemo(() => {
    if (!dataDelLancio) return [];
    const gen = dataDelLancio.leadgen?.generati ?? sum("tot_lead");
    const ass = sum("tot_lead"), conf = dataDelLancio.totale?.qualifiche?.["Confermato"] ?? 0;
    const call = sum("call_totali"), nette = sum("call_nette"), chius = sum("chiusure");
    const p = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
    return [
      { l: "Lead generati", v: gen, c: "hsl(174 62% 50%)", p: 100, s: "" },
      { l: "Assegnati", v: ass, c: "hsl(174 62% 50%)", p: p(ass, gen), s: "dei generati" },
      { l: "Confermati", v: conf, c: "hsl(38 92% 55%)", p: p(conf, gen), s: "dei generati" },
      { l: "Call schedulate", v: call, c: "hsl(232 100% 74%)", p: p(call, gen), s: "dei generati" },
      { l: "Call nette", v: nette, c: "hsl(232 100% 74%)", p: p(nette, call), s: "delle call" },
      { l: "Chiusure", v: chius, c: "hsl(142 71% 60%)", p: p(chius, nette), s: "delle nette" },
    ];
  }, [dataDelLancio, sum]);

  const kpi = useMemo(() => {
    if (!dataDelLancio) return [];
    const lg = dataDelLancio.leadgen, t = dataDelLancio.totale ?? ({} as any);
    const nuovi = lg ? Object.values(lg.per_fonte).reduce((s, c) => s + c.Nuovo, 0) : 0;
    // Qualifiche contate sui soli venditori del lancio, come tutte le altre somme qui sopra.
    const assegnati = sum("tot_lead");
    const perQualifica = (q: string) => rows.reduce((acc, r) => acc + (r.qualifiche?.[q] ?? 0), 0);
    const suAssegnati = (n: number) =>
      assegnati > 0 ? `${((n / assegnati) * 100).toFixed(1).replace(".", ",")}% degli assegnati` : "—";
    const nonLavorato = perQualifica("Non lavorato");
    const confermato = perQualifica("Confermato");
    const fixApp = perQualifica("Fix App");
    return [
      { k: "Lead generati", v: lg ? fmt.n(lg.generati) : "—", s: lg ? `${fmt.n(nuovi)} nuovi · ${fmt.n(lg.generati - nuovi)} vecchi` : "", lead: true },
      { k: "Assegnati", v: fmt.n(assegnati), s: lg ? `${((assegnati / lg.generati) * 100).toFixed(1).replace(".", ",")}% dei generati` : "", lead: true },
      { k: "Non lavorato", v: fmt.n(nonLavorato), s: suAssegnati(nonLavorato), lead: true, allarme: nonLavorato > 0 },
      { k: "Confermato", v: fmt.n(confermato), s: suAssegnati(confermato), lead: true },
      { k: "Fix App", v: fmt.n(fixApp), s: suAssegnati(fixApp), lead: true },
      { k: "Voto medio", v: fmt.dec(t.media_voto ?? 0), s: `${t.app_conferma ?? 0}% conferma`, lead: true },
      { k: "Call totali", v: fmt.n(sum("call_totali")), s: `${fmt.n(sum("call_nette"))} nette · ${t.nette_su_totali ?? 0}%` },
      { k: "Chiusure", v: fmt.n(sum("chiusure")), s: `CR ${t.tasso_chiusura_nette ?? 0}% su nette` },
      { k: "Fatturato", v: fmt.eur(sum("fatturato")), s: `incassato ${fmt.eur(sum("incassato"))}` },
    ];
  }, [dataDelLancio, rows, sum]);

  return (
    <div className={`container mx-auto max-w-7xl ${isMobile ? "px-4 py-5 pt-16 pb-24" : "px-6 py-8 pt-16"} space-y-4`}>
      {/* Intestazione compatta: selettore lancio a sinistra, azioni a destra.
          Le sorgenti dati stanno nel tab Panoramica, non nel titolo. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <Rocket className="h-4 w-4 text-primary shrink-0" />
          <Select value={lancioId} onValueChange={setLancioId}>
            <SelectTrigger className="h-9 w-[230px] text-[14px] font-semibold border-0 bg-transparent px-0 focus:ring-0 hover:text-primary">
              <SelectValue placeholder="Seleziona lancio" />
            </SelectTrigger>
            <SelectContent>
              {lanci.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {etaMin !== null && (
            <span className={`text-[10.5px] whitespace-nowrap ${etaMin >= 20 ? "text-amber-400" : "text-muted-foreground"}`}>
              {bg ? "aggiorno…" : `dati di ${etaTesto}`}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <DocumentazioneDialog />
          {!isMobile && tab === "performance" && (
            <Button size="sm" variant={heatmap ? "default" : "outline"} className="h-8" onClick={() => setHeatmap((v) => !v)}>
              Heatmap {heatmap ? "ON" : "OFF"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={() => load(true)} disabled={loading} title="Ricarica dai fogli">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {letturefallite.length > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-[12.5px] flex-1 min-w-[200px]">
            <b>Numeri incompleti.</b>{" "}
            <span className="text-muted-foreground">
              {letturefallite.length === 1 ? "Un foglio non è stato letto" : `${letturefallite.length} fogli non sono stati letti`}
              , quindi quei venditori mancano dai totali: {letturefallite.map((e) => e.replace("LETTURA FALLITA — ", "")).join(" · ")}
            </span>
          </span>
          <Button size="sm" variant="outline" className="h-7 text-[11.5px] shrink-0" onClick={() => load(true)} disabled={loading || bg}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${bg ? "animate-spin" : ""}`} /> Riprova
          </Button>
        </div>
      )}

      {etaMin !== null && etaMin >= 20 && !loading && (
        <div className="flex items-center gap-2.5 flex-wrap rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-[12.5px] flex-1 min-w-[200px]">
            <b>Dati calcolati {etaTesto}.</b>{" "}
            <span className="text-muted-foreground">
              Fogli e assegnazioni possono essere cambiati da allora: aggiorna prima di prendere decisioni.
            </span>
          </span>
          <Button size="sm" className="h-7 text-[11.5px] shrink-0" onClick={() => load(true)} disabled={loading || bg}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${bg ? "animate-spin" : ""}`} /> Aggiorna ora
          </Button>
        </div>
      )}

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

      {loading && !dataDelLancio && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[12px]">Lettura dei fogli in corso. La prima apertura di un lancio richiede qualche decina di secondi, poi resta in cache.</p>
        </div>
      )}

      {dataDelLancio && cfg && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
            {kpi.map((c) => (
              <div key={c.k} className={`rounded-xl border border-border bg-card p-3 border-l-[3px] ${
                (c as any).allarme ? "border-l-amber-400" : c.lead ? "border-l-teal-400" : "border-l-primary"}`}>
                <div className="label-eyebrow truncate">{c.k}</div>
                <div className={`text-lg font-bold num tracking-tight ${(c as any).allarme ? "text-amber-400" : ""}`}>{c.v}</div>
                <div className="text-[10.5px] text-muted-foreground">{c.s}</div>
              </div>
            ))}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            {/* su schermi stretti i quattro tab non ci stanno: scorrono invece di allargare la pagina */}
            <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
              <TabsList className="bg-secondary/60 w-max">
                <TabsTrigger value="panoramica" className="text-[12.5px]">Panoramica</TabsTrigger>
                <TabsTrigger value="distribuzione" className="text-[12.5px]">Distribuzione</TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-[12.5px]">WhatsApp</TabsTrigger>
                <TabsTrigger value="performance" className="text-[12.5px]">Call &amp; fatturato</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="panoramica" className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Call: provenienza <b className="text-foreground/80">{dataDelLancio.lancio.provenienza}</b> da {dataDelLancio.lancio.call_tabs.join(" + ")} ·
                Lead: {dataDelLancio.lancio.lead_tab}{dataDelLancio.lancio.campagna ? ` · campagna ${dataDelLancio.lancio.campagna}` : ""}
              </p>
              <Card className="overflow-hidden">
                <CardHeader className="py-2.5 px-3.5 border-b border-border">
                  <CardTitle className="label-eyebrow">Funnel del lancio</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex flex-wrap">
                  {funnel.map((st, i) => (
                    <div key={st.l} className={`flex-1 min-w-[46%] sm:min-w-[150px] p-3.5 border-b sm:border-b-0 border-border ${i < funnel.length - 1 ? "sm:border-r" : ""}`}>
                      <div className="label-eyebrow">{st.l}</div>
                      <div className="text-xl font-bold num tracking-tight">{fmt.n(st.v)}</div>
                      <div className="text-[10.5px] text-muted-foreground">
                        <b style={{ color: st.c }}>{st.p.toFixed(1).replace(".", ",")}%</b> {st.s}
                      </div>
                      <div className="h-1 rounded-full bg-border mt-2 overflow-hidden">
                        <i className="block h-full rounded-full" style={{ width: `${Math.min(100, st.p)}%`, background: st.c }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="py-2.5 px-3.5 border-b border-border">
                  <CardTitle className="label-eyebrow">Acquisizione lead — andamento e mix per fonte</CardTitle>
                </CardHeader>
                <CardContent className="p-0"><AcquisizioneWidget leadgen={dataDelLancio.leadgen} /></CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="py-2.5 px-3.5 border-b border-border">
                  <CardTitle className="label-eyebrow">Speed to lead — da lead entrato ad assegnato</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <SpeedToLeadWidget speed={dataDelLancio.leadgen?.speed}
                    totLead={sum("tot_lead")}
                    lavorati={sum("tot_lead") - (dataDelLancio.totale?.qualifiche?.["Non lavorato"] ?? 0)} />
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="py-2.5 px-3.5 border-b border-border">
                  <CardTitle className="label-eyebrow">Qualità del lead contro il risultato</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <QualitaLeadWidget qualita={dataDelLancio.qualita} rows={rows} />
                </CardContent>
              </Card>

              {dataDelLancio.errors?.length > 0 && (
                <details className="text-[11.5px] text-muted-foreground">
                  <summary className="cursor-pointer">
                    {dataDelLancio.errors.length} avvisi di lettura fogli
                  </summary>
                  <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">{dataDelLancio.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </details>
              )}
            </TabsContent>

            <TabsContent value="distribuzione" className="mt-3">
              <TabDistribuzione lancio={cfg} rows={rows} market={selectedMarket} onChange={reload} />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-3">
              <TabWhatsapp lancio={cfg} rows={rows} market={selectedMarket} onChange={reload} />
            </TabsContent>

            <TabsContent value="performance" className="mt-3">
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Lanci;
