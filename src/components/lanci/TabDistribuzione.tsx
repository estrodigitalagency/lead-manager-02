import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Zap, AlertTriangle, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { LancioConfig, LancioRow, fetchLanci, saveLanci } from "@/lib/lanci/config";
import {
  AutomazioneLancio, Conflitto, fetchAutomazione, checkConflitti,
  creaAutomazione, setAutomazioneAttiva, fetchEsecuzioni,
} from "@/lib/lanci/integrazioni";

const n = (v: number) => Math.round(v).toLocaleString("it-IT");

interface Props { lancio: LancioConfig; rows: LancioRow[]; market: string; onChange: () => void }

/** Distribuzione lead del lancio: regola di assegnazione, stato live vs target, log esecuzioni. */
const TabDistribuzione = ({ lancio, rows, market, onChange }: Props) => {
  const { venditori } = useSalespeopleData();
  const [autom, setAutom] = useState<AutomazioneLancio | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [conflitti, setConflitti] = useState<Conflitto[]>([]);
  const [saving, setSaving] = useState(false);
  // form nuova automazione
  const [fNome, setFNome] = useState("");
  const [fCond, setFCond] = useState("");
  const [fPrev, setFPrev] = useState(false);
  const [slots, setSlots] = useState<{ venditore_id: string; weight: number }[]>([]);

  const load = useCallback(async () => {
    if (!lancio.automazione_id) { setAutom(null); setLog([]); return; }
    setLoading(true);
    const a = await fetchAutomazione(lancio.automazione_id);
    setAutom(a);
    setLog(a ? await fetchEsecuzioni(a.id, 100) : []);
    setLoading(false);
  }, [lancio.automazione_id]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setFNome(`Assegnazione ${lancio.nome}`);
    setFCond(lancio.campagna ? lancio.campagna.toLowerCase().replace(/\s+/g, "_") : "");
    const inclusi = (lancio.sales?.length ? lancio.sales : rows.map((r) => r.venditore));
    const ids = venditori.filter((v) => inclusi.includes(`${v.nome} ${v.cognome || ""}`.trim())).map((v) => v.id);
    const w = ids.length ? Math.floor(100 / ids.length) : 0;
    setSlots(ids.map((id, i) => ({ venditore_id: id, weight: i === 0 ? 100 - w * (ids.length - 1) : w })));
    setConflitti([]);
    setOpen(true);
  };

  // controlla i conflitti mentre scrivi la condizione
  useEffect(() => {
    if (!open || !fCond.trim()) { setConflitti([]); return; }
    const t = setTimeout(async () => {
      setConflitti(await checkConflitti(market, fCond.split(",").map((s) => s.trim()).filter(Boolean), "ultima_fonte", 999, lancio.automazione_id));
    }, 400);
    return () => clearTimeout(t);
  }, [fCond, open, market, lancio.automazione_id]);

  const totWeight = slots.reduce((s, x) => s + (x.weight || 0), 0);

  const handleCreate = async () => {
    const cond = fCond.split(",").map((s) => s.trim()).filter(Boolean);
    if (!fNome.trim()) return toast.error("Dai un nome alla regola");
    if (cond.length === 0) return toast.error("Indica la fonte che attiva l'assegnazione");
    if (slots.length === 0) return toast.error("Aggiungi almeno un venditore");
    if (totWeight !== 100) return toast.error(`La somma delle percentuali deve essere 100 (ora ${totWeight})`);
    setSaving(true);
    const res = await creaAutomazione({
      nome: fNome.trim(), market, campagna: lancio.campagna,
      condition_value: cond, distribuzione: slots, use_previous_seller_first: fPrev,
    });
    if (res.error || !res.id) { setSaving(false); return toast.error(res.error || "Errore creazione"); }
    // collega al lancio
    const all = await fetchLanci();
    await saveLanci(all.map((l) => (l.id === lancio.id ? { ...l, automazione_id: res.id } : l)));
    setSaving(false); setOpen(false);
    toast.success("Regola creata e collegata al lancio");
    onChange();
  };

  const toggleAttiva = async (v: boolean) => {
    if (!autom) return;
    if (await setAutomazioneAttiva(autom.id, v)) { setAutom({ ...autom, attivo: v }); toast.success(v ? "Regola attivata" : "Regola disattivata"); }
    else toast.error("Errore aggiornamento");
  };

  const nomeOf = (id: string) => {
    const v = venditori.find((x) => x.id === id);
    return v ? `${v.nome} ${v.cognome || ""}`.trim() : id.slice(0, 8);
  };

  return (
    <div className="space-y-3">
      {/* Regola collegata */}
      <Card>
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400" /> Regola di assegnazione</span>
            {autom
              ? <span className="flex items-center gap-2 normal-case tracking-normal">
                  <Switch checked={autom.attivo} onCheckedChange={toggleAttiva} />
                  <span className={autom.attivo ? "text-emerald-400" : "text-muted-foreground"}>{autom.attivo ? "attiva" : "disattiva"}</span>
                </span>
              : <Button size="sm" className="h-7" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Crea regola</Button>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !autom ? (
            <div className="py-8 px-4 text-center text-sm text-muted-foreground">
              Nessuna regola collegata: i lead di questo lancio non vengono distribuiti automaticamente.
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px] p-3.5">
              <dt className="text-muted-foreground">Nome</dt><dd className="font-medium">{autom.nome}</dd>
              <dt className="text-muted-foreground">Trigger</dt>
              <dd>Nuovo lead · <span className="text-muted-foreground">{autom.trigger_field}</span> contiene{" "}
                {autom.condition_value.map((c) => <code key={c} className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px] mr-1">{c}</code>)}</dd>
              <dt className="text-muted-foreground">Azione</dt>
              <dd>{autom.action_type === "weighted_distribution" ? "Distribuzione pesata" : autom.action_type}
                {autom.use_previous_seller_first && <span className="text-amber-400"> · prima al venditore precedente</span>}</dd>
              <dt className="text-muted-foreground">Priorità</dt><dd>{autom.priority}</dd>
              <dt className="text-muted-foreground">Assegnati dalla regola</dt>
              <dd className="num">{n(autom.distribution_state?.total_assigned ?? 0)}
                {autom.distribution_state?.last_updated && (
                  <span className="text-muted-foreground text-[11px] ml-2">
                    ultimo {new Date(autom.distribution_state.last_updated).toLocaleString("it-IT")}
                  </span>)}
              </dd>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Reale vs target */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between">
            <span>Lead assegnati per sales — reale vs target</span><span className="text-primary">{rows.length} sales</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[52vh]">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr>
                <th className="table-header-cell text-left sticky top-0 bg-card">Sales</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Assegnati</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Quota</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Peso regola</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Target</th>
                <th className="table-header-cell text-right sticky top-0 bg-card">Δ</th>
                <th className="table-header-cell text-left sticky top-0 bg-card w-[140px]">Riempimento</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.tot_lead - a.tot_lead).map((r) => {
                const slot = autom?.distribution_config?.find((s) => nomeOf(s.venditore_id) === r.venditore);
                const p = r.target ? Math.min(100, (r.tot_lead / r.target) * 100) : 0;
                return (
                  <tr key={r.venditore}>
                    <td className="table-body-cell font-medium">{r.venditore}</td>
                    <td className="table-body-cell text-right num">{n(r.tot_lead)}</td>
                    <td className="table-body-cell text-right num text-muted-foreground">{r.distribuzione}%</td>
                    <td className="table-body-cell text-right num">{slot ? `${slot.weight ?? 0}%` : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="table-body-cell text-right num">{r.target ? n(r.target) : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className={`table-body-cell text-right num ${r.target ? (r.distanza_target > 0 ? "text-emerald-400" : r.distanza_target < 0 ? "text-red-400" : "") : ""}`}>
                      {r.target ? `${r.distanza_target > 0 ? "+" : ""}${n(r.distanza_target)}` : "—"}
                    </td>
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

      {/* Dialog creazione regola */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuova regola di assegnazione — {lancio.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome regola</Label>
              <Input value={fNome} onChange={(e) => setFNome(e.target.value)} />
            </div>
            <div>
              <Label>Si attiva quando la fonte del lead contiene</Label>
              <Input value={fCond} onChange={(e) => setFCond(e.target.value)} placeholder="es. workshop_set26 (separa con virgola per più fonti)" />
              <p className="text-[11px] text-muted-foreground mt-1">Confronto su <b>ultima_fonte</b> del lead, tipo "contiene".</p>
            </div>

            {conflitti.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 text-[12.5px] font-semibold">
                  <AlertTriangle className="h-4 w-4" /> {conflitti.length} regola/e in conflitto
                </div>
                {conflitti.map((c, i) => (
                  <p key={i} className="text-[12px] text-muted-foreground">
                    <b className="text-foreground">{c.automazione}</b> {c.motivo}
                    {c.priorityMinore
                      ? <span className="text-amber-400"> · ha priorità maggiore, scatterà prima di questa</span>
                      : <span> · questa regola scatterà prima</span>}
                  </p>
                ))}
                <p className="text-[11px] text-muted-foreground">Le regole si valutano per priorità: il primo match assegna il lead.</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={fPrev} onCheckedChange={setFPrev} />
              <Label className="font-normal">Se il lead è già noto, riassegnalo al venditore precedente</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Distribuzione tra i sales</Label>
                <span className={`text-[12px] ${totWeight === 100 ? "text-emerald-400" : "text-amber-400"}`}>Totale {totWeight}%</span>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
                {slots.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-[12.5px] truncate">{nomeOf(s.venditore_id)}</span>
                    <Input type="number" className="h-7 w-[76px] text-[12px]" value={s.weight}
                      onChange={(e) => setSlots((p) => p.map((x, j) => j === i ? { ...x, weight: parseInt(e.target.value, 10) || 0 } : x))} />
                    <span className="text-[12px] text-muted-foreground">%</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSlots((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {slots.length === 0 && <p className="text-[12px] text-muted-foreground">Nessun venditore: aggiungine almeno uno.</p>}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {venditori.filter((v) => !slots.some((s) => s.venditore_id === v.id)).slice(0, 12).map((v) => (
                  <button key={v.id} type="button" onClick={() => setSlots((p) => [...p, { venditore_id: v.id, weight: 0 }])}
                    className="px-2 py-0.5 rounded-full border border-border bg-card text-[11.5px] text-muted-foreground hover:border-primary">
                    + {v.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Crea e collega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabDistribuzione;
