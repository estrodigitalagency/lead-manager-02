import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, AlertTriangle, Loader2 } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { LancioConfig, LancioRow } from "@/lib/lanci/config";
import { checkConflitti, Conflitto, fetchEsecuzioni } from "@/lib/lanci/integrazioni";

const n = (v: number) => Math.round(v).toLocaleString("it-IT");

interface Props { lancio: LancioConfig; rows: LancioRow[]; market: string; onChange: () => void }

/**
 * Distribuzione del lancio. La regola vive in `lead_assignment_automations` e si crea/modifica
 * con lo stesso editor completo di Impostazioni → Automazioni (percentuale o quota assoluta,
 * cap, esclusioni, lock period, fonti), così non esistono due configuratori diversi.
 */
const TabDistribuzione = ({ lancio, rows, market, onChange }: Props) => {
  const { venditori } = useSalespeopleData();
  const { automations, isLoading } = useAutomationsData();
  const [log, setLog] = useState<any[]>([]);

  const autom = useMemo(
    () => automations.find((a) => a.id === lancio.automazione_id) ?? null,
    [automations, lancio.automazione_id],
  );

  // conflitti: altre regole attive che intercettano le stesse fonti
  const [conflitti, setConflitti] = useState<Conflitto[]>([]);
  useEffect(() => {
    if (!autom) { setConflitti([]); return; }
    checkConflitti(market, autom.condition_value ?? [], autom.trigger_field, autom.priority ?? 999, autom.id)
      .then(setConflitti);
  }, [autom, market]);

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
              <span className="text-[11px] text-muted-foreground">sola lettura · si configura in Impostazioni</span>
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
                <th className="table-header-cell text-right sticky top-0 bg-card">Cap</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Target</th>
                <th className="table-header-cell text-left sticky top-0 bg-card w-[130px]">Riempimento</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.tot_lead - a.tot_lead).map((r) => {
                const slot = slotOf(r.venditore);
                const daRegola = slot ? (assegnatiRegola[slot.venditore_id] ?? 0) : null;
                const quota = isCount ? slot?.count_target : slot?.weight;
                const rif = r.target || (isCount ? slot?.count_target : 0) || 0;
                const p = rif ? Math.min(100, (r.tot_lead / rif) * 100) : 0;
                return (
                  <tr key={r.venditore}>
                    <td className="table-body-cell font-medium">{r.venditore}</td>
                    <td className="table-body-cell text-right num">{n(r.tot_lead)}</td>
                    <td className="table-body-cell text-right num text-muted-foreground">{r.distribuzione}%</td>
                    <td className="table-body-cell text-right num">{quota != null ? (isCount ? n(quota) : `${quota}%`) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">{daRegola != null ? n(daRegola) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">{slot?.cap ? n(slot.cap) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">{r.target ? n(r.target) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell">
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <i className="block h-full rounded-full" style={{ width: `${p}%`, background: p >= 100 ? "hsl(142 71% 60%)" : "hsl(232 100% 74%)" }} />
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
