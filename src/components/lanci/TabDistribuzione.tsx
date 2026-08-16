import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Zap, AlertTriangle, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCodaIds, setCoda } from "@/lib/automazioni/coda";
import { azzeraContatori } from "@/lib/automazioni/contatori";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { LancioConfig, LancioRow } from "@/lib/lanci/config";
import { checkConflitti, Conflitto, fetchEsecuzioni } from "@/lib/lanci/integrazioni";

const n = (v: number) => Math.round(v).toLocaleString("it-IT");

interface Props { lancio: LancioConfig; rows: LancioRow[]; market: string; onChange: () => void }

/**
 * Distribuzione del lancio.
 *
 * Qui si governa il flusso a lancio partito — mettere in pausa un venditore, spostare una
 * percentuale, alzare un tetto, azzerare un contatore, sospendere le assegnazioni — senza
 * passare dalle impostazioni, dove si tocca anche quello che non va toccato a lancio in corso:
 * tab dei fogli, campagne, condizioni, webhook, anagrafica.
 *
 * La regola resta la stessa di `lead_assignment_automations`: qui se ne modificano solo le leve
 * operative, tutto il resto è in sola lettura e si cambia da Impostazioni → Lanci.
 */
const TabDistribuzione = ({ lancio, rows, market, onChange }: Props) => {
  const { venditori } = useSalespeopleData();
  const { automations, isLoading } = useAutomationsData();
  const [log, setLog] = useState<any[]>([]);
  const [bozza, setBozza] = useState<Record<string, { weight?: number; cap?: number | null; paused?: boolean }>>({});
  const [inCoda, setInCoda] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const autom = useMemo(
    () => automations.find((a) => a.id === lancio.automazione_id) ?? null,
    [automations, lancio.automazione_id],
  );

  // conflitti: altre regole attive che intercettano le stesse fonti
  const [conflitti, setConflitti] = useState<Conflitto[]>([]);
  useEffect(() => {
    if (!autom) { setConflitti([]); return; }
    checkConflitti({
      market, condition: autom.condition_value ?? [],
      esclusioni: (autom as any).trigger_sources ?? [],
      trigger_field: autom.trigger_field, trigger_when: autom.trigger_when ?? "new_lead",
      priority: autom.priority ?? 999, escludiId: autom.id,
    }).then(setConflitti);
  }, [autom, market]);

  useEffect(() => {
    if (!autom?.id) return;
    fetchCodaIds().then((ids) => setInCoda(ids.includes(autom.id)));
  }, [autom?.id]);

  // Le modifiche restano in una bozza finché non si salva: così si sistemano più venditori
  // insieme e si vede la somma delle percentuali prima di applicare.
  const slotBozza = (slot: any) => ({ ...slot, ...(bozza[slot.venditore_id] ?? {}) });
  const modificato = Object.keys(bozza).length > 0;
  const configBozza = (autom?.distribution_config ?? []).map(slotBozza);
  const sommaPesi = configBozza.reduce((t: number, x: any) => t + (x.weight || 0), 0);
  const pesiValidi = autom?.distribution_mode === "count" || sommaPesi === 100;

  const tocca = (id: string, patch: any) => setBozza((b) => ({ ...b, [id]: { ...(b[id] ?? {}), ...patch } }));

  const salva = async () => {
    if (!autom?.id) return;
    if (!pesiValidi) { toast.error(`Le percentuali sommano a ${sommaPesi} invece di 100`); return; }
    setSalvo(true);
    const { error } = await supabase.from("lead_assignment_automations")
      .update({ distribution_config: configBozza }).eq("id", autom.id);
    setSalvo(false);
    if (error) { toast.error(error.message); return; }
    setBozza({});
    toast.success("Distribuzione aggiornata");
    onChange();
  };

  const [cambioStato, setCambioStato] = useState(false);
  const stato: "attiva" | "coda" | "spenta" = !autom?.attivo ? "spenta" : inCoda ? "coda" : "attiva";

  /** I tre stati sono esclusivi: si imposta insieme l'interruttore della regola e quello della coda. */
  const cambiaStato = async (nuovo: "attiva" | "coda" | "spenta") => {
    if (!autom?.id || nuovo === stato) return;
    if (nuovo === "spenta" && !confirm("Fermare l'assegnazione? I lead resteranno liberi, senza venditore.")) return;
    setCambioStato(true);
    try {
      const { error } = await supabase.from("lead_assignment_automations")
        .update({ attivo: nuovo !== "spenta" }).eq("id", autom.id);
      if (error) { toast.error(error.message); return; }
      const coda = nuovo === "coda";
      if (coda !== inCoda) {
        if (!(await setCoda(autom.id, coda))) { toast.error("Errore salvataggio della coda"); return; }
        setInCoda(coda);
      }
      toast.success({
        attiva: "Assegnazione attiva",
        coda: "Lead nuovi in attesa: passano solo quelli già noti",
        spenta: "Assegnazione spenta: i lead restano liberi",
      }[nuovo]);
      onChange();
    } finally { setCambioStato(false); }
  };

  const azzera = async (venditoreId?: string) => {
    if (!autom?.id) return;
    const chi = venditoreId ? nomeOf(venditoreId) : "tutti i venditori";
    if (!confirm(`Azzerare il contatore di ${chi}?`)) return;
    const r = await azzeraContatori(autom.id, venditoreId ? [venditoreId] : []);
    if (r?.error) { toast.error(r.error); return; }
    toast.success("Contatori azzerati");
    onChange();
  };

  const loadLog = useCallback(async () => {
    setLog(lancio.automazione_id ? await fetchEsecuzioni(lancio.automazione_id, 100) : []);
  }, [lancio.automazione_id]);
  useEffect(() => { loadLog(); }, [loadLog]);




  const nomeOf = (id: string) => {
    const v = venditori.find((x) => x.id === id);
    return v ? `${v.nome} ${v.cognome || ""}`.trim() : id.slice(0, 8);
  };
  const slotOf = (venditore: string) =>
    (autom?.distribution_config ?? []).find((s: any) => nomeOf(s.venditore_id) === venditore) as any;

  const assegnatiRegola = (autom?.distribution_state as any)?.count_assigned ?? {};
  const isCount = autom?.distribution_mode === "count";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400" /> Regola di assegnazione</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              {autom && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${autom.attivo
                  ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {autom.attivo ? "attiva" : "disattiva"}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">condizioni e fogli si cambiano in Impostazioni</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !autom ? (
            <div className="py-8 px-4 text-center text-sm text-muted-foreground">
              Nessuna regola collegata: i lead di questo lancio non vengono distribuiti automaticamente.<br />
              <span className="text-[12px]">Collegane una da <b>Impostazioni → Lanci</b>.</span>
            </div>
          ) : (
            <>
              {conflitti.length > 0 && (
                <div className="border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 text-[12.5px] font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {conflitti.length} regola/e in conflitto
                  </div>
                  {conflitti.map((c, i) => (
                    <p key={i} className="text-[12px] text-muted-foreground">
                      <b className="text-foreground">{c.automazione}</b> {c.motivo}
                      {c.priorityMinore
                        ? <span className="text-amber-400"> · ha priorità maggiore, scatta prima di questa</span>
                        : <span> · questa scatta prima</span>}
                    </p>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px] p-3.5">
                <dt className="text-muted-foreground">Nome</dt><dd className="font-medium">{autom.nome}</dd>
                <dt className="text-muted-foreground">Trigger</dt>
                <dd>{autom.trigger_when === "new_lead" ? "Nuovo lead" : "Duplicato da fonte diversa"} ·{" "}
                  <span className="text-muted-foreground">{autom.trigger_field}</span> {autom.condition_type}{" "}
                  {(autom.condition_value ?? []).map((c: string) => (
                    <code key={c} className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px] mr-1">{c}</code>))}
                </dd>
                <dt className="text-muted-foreground">Azione</dt>
                <dd>{autom.action_type === "weighted_distribution"
                      ? `Distribuzione ${isCount ? "a quota assoluta" : "percentuale"}` : autom.action_type}
                  {(autom as any).use_previous_seller_first && <span className="text-amber-400"> · prima al venditore precedente</span>}
                  {(autom as any).distribution_cap_total ? <span className="text-muted-foreground"> · cap totale {n((autom as any).distribution_cap_total)}</span> : null}
                </dd>
                {((autom as any).excluded_sellers ?? []).length > 0 && (
                  <>
                    <dt className="text-muted-foreground">Esclusi</dt>
                    <dd>{((autom as any).excluded_sellers ?? []).join(", ")}</dd>
                  </>
                )}
                {(autom as any).lock_period_days != null && (
                  <>
                    <dt className="text-muted-foreground">Lock period</dt>
                    <dd>{(autom as any).lock_period_days === -1 ? "sempre stesso venditore" : `${(autom as any).lock_period_days} giorni`}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Assegnati dalla regola</dt>
                <dd className="num">{n((autom.distribution_state as any)?.total_assigned ?? 0)}</dd>
              </dl>
            </>
          )}
        </CardContent>
      </Card>

      {/* Leve operative: quello che serve governare a lancio partito */}
      {autom && autom.action_type === "weighted_distribution" && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 border-b border-border">
            <CardTitle className="label-eyebrow flex items-center justify-between gap-2 flex-wrap">
              <span>Governo della distribuzione</span>
              <span className="flex items-center gap-2 normal-case tracking-normal">
                {modificato && (
                  <span className={`text-[11px] ${pesiValidi ? "text-emerald-400" : "text-amber-400"}`}>
                    {isCount ? `totale ${sommaPesi}` : `totale ${sommaPesi}%`}
                  </span>
                )}
                <Button size="sm" className="h-7 text-[11.5px]" disabled={!modificato || salvo} onClick={salva}>
                  {salvo ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Salva
                </Button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Tre stati che si escludono, invece di due interruttori che possono contraddirsi:
                "in coda con la regola spenta" non vorrebbe dire niente. */}
            <div className="px-3.5 py-3 border-b border-border">
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { k: "attiva", t: "Assegnazione attiva", c: "border-emerald-500 bg-emerald-500/15 text-emerald-400" },
                  { k: "coda", t: "Lead nuovi in attesa", c: "border-amber-500 bg-amber-500/15 text-amber-400" },
                  { k: "spenta", t: "Assegnazione spenta", c: "border-destructive bg-destructive/15 text-destructive" },
                ] as const).map((o) => (
                  <button key={o.k} type="button" disabled={cambioStato} onClick={() => cambiaStato(o.k)}
                    className={`px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors disabled:opacity-50 ${
                      stato === o.k ? o.c : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {o.t}
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-2">
                {stato === "attiva" &&
                  "I lead vengono distribuiti secondo le percentuali qui sotto, e chi era già stato assegnato di recente torna al suo venditore."}
                {stato === "coda" &&
                  "Chi non è mai entrato prima resta in attesa, assegnato a “Round Robin”: nessuno lo lavora finché non rimetti Attiva o premi Distribuiscili ora. Chi invece era già stato assegnato a un venditore negli ultimi giorni impostati nel lock period torna da lui, e gli scala il tetto. Percentuali, tetti e contatori restano dove sono."}
                {stato === "spenta" &&
                  "Nessun lead viene assegnato, nemmeno chi era già stato lavorato: restano liberi, senza venditore, e compaiono fra i lead da assegnare a mano. Niente scritture sui fogli e niente webhook."}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                I lead che arrivano già con un venditore — i link personali con UTM — non passano da qui in
                nessuno dei tre casi: continuano ad arrivare anche a regola spenta.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr>
                  <th className="table-header-cell text-left w-[34px]"></th>
                  <th className="table-header-cell text-left">Venditore</th>
                  <th className="table-header-cell text-right whitespace-nowrap">Ricevuti</th>
                  {!isCount && <th className="table-header-cell text-right whitespace-nowrap">Mancanti</th>}
                  <th className="table-header-cell text-right whitespace-nowrap">{isCount ? "Quota" : "Percentuale"}</th>
                  {!isCount && <th className="table-header-cell text-right whitespace-nowrap">Tetto max</th>}
                </tr></thead>
                <tbody>
                  {(autom.distribution_config ?? []).map((slotOrig: any) => {
                    const slot = slotBozza(slotOrig);
                    const id = slot.venditore_id;
                    const ricevuti = assegnatiRegola[id] ?? 0;
                    return (
                      <tr key={id} className={slot.paused ? "opacity-60" : ""}>
                        <td className="table-body-cell">
                          <button type="button" onClick={() => tocca(id, { paused: !slot.paused })}
                            title={slot.paused ? "In pausa: non riceve lead. Clicca per riattivare" : "Metti in pausa"}
                            className={`h-5 w-5 rounded-full border grid place-items-center text-[10px] ${slot.paused
                              ? "border-destructive bg-destructive/20 text-destructive"
                              : "border-border text-muted-foreground/50 hover:text-foreground"}`}>
                            {slot.paused ? "❚❚" : "▶"}
                          </button>
                        </td>
                        <td className={`table-body-cell font-medium ${slot.paused ? "text-destructive line-through" : ""}`}>
                          {nomeOf(id)}
                        </td>
                        <td className="table-body-cell text-right">
                          <button type="button" onClick={() => azzera(id)} title="Clicca per azzerare"
                            className={`num ${ricevuti > 0 ? "hover:text-destructive" : "text-muted-foreground/40"}`}>
                            {n(ricevuti)}
                          </button>
                        </td>
                        {!isCount && (
                          <td className="table-body-cell text-right num">
                            {!slot.cap
                              ? <span className="text-muted-foreground/40">—</span>
                              : ricevuti >= slot.cap
                                ? <span className="text-emerald-400 font-medium">pieno</span>
                                : n(slot.cap - ricevuti)}
                          </td>
                        )}
                        <td className="table-body-cell text-right">
                          <Input type="number" className="h-7 w-[74px] text-[12px] text-right ml-auto"
                            value={(isCount ? slot.count_target : slot.weight) ?? ""}
                            onChange={(e) => tocca(id, isCount
                              ? { count_target: parseInt(e.target.value, 10) || 0 }
                              : { weight: parseInt(e.target.value, 10) || 0 })} />
                        </td>
                        {!isCount && (
                          <td className="table-body-cell text-right">
                            <Input type="number" placeholder="nessuno" className="h-7 w-[84px] text-[12px] text-right ml-auto"
                              value={slot.cap ?? ""}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                tocca(id, { cap: isNaN(v) || v <= 0 ? null : v });
                              }} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2.5 border-t border-border">
              <p className="text-[11px] text-muted-foreground flex-1 min-w-[240px]">
                La pausa ferma i lead nuovi ma non le riassegnazioni: chi ha già parlato con quel venditore
                continua ad andare da lui. Il numero dei ricevuti si clicca per azzerarlo.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={() => azzera()}>
                Azzera tutti i contatori
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reale vs quota della regola vs target del lancio */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between">
            <span>Lead per sales — assegnati, quota regola e target</span><span className="text-primary">{rows.length} sales</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[52vh]">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="table-header-cell text-left sticky top-0 bg-card">Sales</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Assegnati (lancio)</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Quota %</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">{isCount ? "Quota regola" : "Peso regola"}</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Dalla regola</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Tetto max</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Mancanti</th>
                <th className="table-header-cell text-left sticky top-0 bg-card w-[130px]">Riempimento</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.tot_lead - a.tot_lead).map((r) => {
                const slot = slotOf(r.venditore);
                const daRegola = slot ? (assegnatiRegola[slot.venditore_id] ?? 0) : null;
                const quota = isCount ? slot?.count_target : slot?.weight;
                const rif = r.target || (isCount ? slot?.count_target : 0) || 0;
                // Il tetto conta le assegnazioni della regola, non le righe scritte sui fogli:
                // e' quel numero che a un certo punto lo fa smettere di ricevere lead.
                const consumato = daRegola ?? r.tot_lead;
                const p = rif ? Math.min(100, (consumato / rif) * 100) : 0;
                const mancanti = rif ? Math.max(0, rif - consumato) : null;
                return (
                  <tr key={r.venditore}>
                    <td className="table-body-cell font-medium">{r.venditore}</td>
                    <td className="table-body-cell text-right num">{n(r.tot_lead)}</td>
                    <td className="table-body-cell text-right num text-muted-foreground">{r.distribuzione}%</td>
                    <td className="table-body-cell text-right num">{quota != null ? (isCount ? n(quota) : `${quota}%`) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">{daRegola != null ? n(daRegola) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">
                      {r.target ? n(r.target) : <span className="text-muted-foreground/40">—</span>}
                      {/* Solo se qualcuno ha scritto un obiettivo diverso dal tetto della regola */}
                      {slot?.cap && r.target && slot.cap !== r.target && (
                        <span className="text-muted-foreground/60 text-[10.5px]"> · tetto {n(slot.cap)}</span>
                      )}
                    </td>
                    <td className="table-body-cell text-right num">
                      {mancanti === null
                        ? <span className="text-muted-foreground/40">—</span>
                        : mancanti === 0
                          ? <span className="text-emerald-400 font-medium">pieno</span>
                          : n(mancanti)}
                    </td>
                    <td className="table-body-cell">
                      {/* Con obiettivi da centinaia di lead i primi arrivi valgono frazioni di
                          pixel: senza il numero accanto la barra sembra ferma. */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                          <i className="block h-full rounded-full"
                            style={{ width: `${rif ? Math.max(p > 0 ? 2 : 0, p) : 0}%`,
                                     background: p >= 100 ? "hsl(142 71% 60%)" : "hsl(232 100% 74%)" }} />
                        </div>
                        <span className="text-[10.5px] num text-muted-foreground w-[42px] text-right shrink-0">
                          {rif ? `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%` : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Log esecuzioni */}
      {autom && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 border-b border-border">
            <CardTitle className="label-eyebrow flex items-center justify-between">
              <span>Log esecuzioni della regola</span><span className="text-primary">{log.length} eventi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[42vh]">
            {log.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nessuna esecuzione registrata.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead><tr>
                  <th className="table-header-cell text-left sticky top-0 bg-card">Quando</th>
                  <th className="table-header-cell text-left sticky top-0 bg-card">Lead</th>
                  <th className="table-header-cell text-left sticky top-0 bg-card">Fonte</th>
                  <th className="table-header-cell text-left sticky top-0 bg-card">Assegnato a</th>
                  <th className="table-header-cell text-left sticky top-0 bg-card">Esito</th>
                </tr></thead>
                <tbody>
                  {log.map((e, i) => (
                    <tr key={i}>
                      <td className="table-body-cell whitespace-nowrap text-muted-foreground">{new Date(e.executed_at).toLocaleString("it-IT")}</td>
                      <td className="table-body-cell">{e.lead_name || e.lead_email || "—"}</td>
                      <td className="table-body-cell text-muted-foreground">{e.trigger_value || "—"}</td>
                      <td className="table-body-cell">{e.seller_assigned || "—"}</td>
                      <td className={`table-body-cell ${e.result === "success" ? "text-emerald-400" : "text-amber-400"}`}>
                        {e.result}{e.error_message ? ` · ${e.error_message}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default TabDistribuzione;
