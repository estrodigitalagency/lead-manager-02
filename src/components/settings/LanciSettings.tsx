import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Settings2, Rocket, Palette } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import {
  fetchLanci, saveLanci, fetchColorRules, saveColorRules,
  LancioConfig, ColorRule, PALETTE,
} from "@/lib/lanci/config";
import { CALL_METRICS, LEAD_METRICS } from "@/components/lanci/LancioMatrix";
import LancioConfigDialog from "@/components/settings/LancioConfigDialog";

const emptyCfg = (): LancioConfig => ({
  id: "", nome: "", provenienza: "", call_tabs: [], lead_tab: "",
  campagna: "", target: {}, lead_sales: [], call_sales: [],
});

const LanciSettings = () => {
  const { selectedMarket } = useMarket();
  const { automations } = useAutomationsData();
  const [lanci, setLanci] = useState<LancioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LancioConfig | null>(null);
  const [rulesOpen, setRulesOpen] = useState<string | null>(null);
  const [rules, setRules] = useState<ColorRule[]>([]);
  const [nr, setNr] = useState<{ key: string; op: ColorRule["op"]; val: string; color: string }>(
    { key: "tasso_chiusura_nette", op: "lt", val: "", color: PALETTE[0] });

  const load = useCallback(async () => {
    setLoading(true);
    setLanci(await fetchLanci());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const persist = async (next: LancioConfig[]) => {
    if (!(await saveLanci(next))) { toast.error("Errore salvataggio"); return false; }
    setLanci(next); return true;
  };

  const handleSave = async (cfg: LancioConfig) => {
    const esiste = lanci.some((l) => l.id === cfg.id);
    const next = esiste ? lanci.map((l) => (l.id === cfg.id ? cfg : l)) : [...lanci, cfg];
    const ok = await persist(next);
    if (ok) toast.success(esiste ? "Lancio aggiornato" : "Lancio creato");
    return ok;
  };

  const handleDelete = async (l: LancioConfig) => {
    if (!confirm(`Eliminare il lancio "${l.nome}"?`)) return;
    if (await persist(lanci.filter((x) => x.id !== l.id))) toast.success("Lancio eliminato");
  };

  const openRules = async (id: string) => { setRules(await fetchColorRules(id)); setRulesOpen(id); };
  const addRule = async () => {
    const v = parseFloat(nr.val);
    if (isNaN(v) || !rulesOpen) return toast.error("Inserisci un valore");
    const next = [...rules.filter((r) => r.key !== nr.key), { key: nr.key, op: nr.op, val: v, color: nr.color }];
    if (await saveColorRules(rulesOpen, next)) { setRules(next); setNr({ ...nr, val: "" }); }
    else toast.error("Errore salvataggio regola");
  };
  const delRule = async (key: string) => {
    if (!rulesOpen) return;
    const next = rules.filter((r) => r.key !== key);
    if (await saveColorRules(rulesOpen, next)) setRules(next);
  };

  const ALL_METRICS = [...CALL_METRICS, ...LEAD_METRICS];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Lanci ({selectedMarket})</CardTitle>
          <CardDescription>
            Un lancio definisce chi ci lavora, da quali tab leggere i dati, come vengono assegnati i lead e con quale link WhatsApp.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing(emptyCfg())}><Plus className="h-4 w-4 mr-1" /> Nuovo lancio</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : lanci.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rocket className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">Nessun lancio configurato.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lanci.map((l) => {
              const aut = automations.find((a) => a.id === l.automazione_id);
              return (
                <div key={l.id} className="p-3 rounded-lg border border-border bg-card/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">{l.nome}</h4>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5 mt-1 text-[11.5px] text-muted-foreground">
                        <p>Venditori: <b className="text-foreground/80">{(l.sales?.length ?? 0) > 0 ? `${l.sales!.length}` : "tutti gli attivi"}</b></p>
                        <p>Lead: <b className={l.lead_tab ? "text-foreground/80" : "text-amber-400"}>{l.lead_tab || "tab mancante"}</b></p>
                        <p>Call: <b className={l.provenienza ? "text-foreground/80" : "text-amber-400"}>{l.provenienza || "provenienza mancante"}</b> · {l.call_tabs.length || 0} tab</p>
                        <p>Automazione: <b className={aut ? "text-foreground/80" : "text-amber-400"}>{aut?.nome ?? "nessuna"}</b>{aut && !aut.attivo && <span className="text-amber-400"> (disattiva)</span>}</p>
                        <p>WhatsApp: <b className={l.whatsapp_slug ? "text-foreground/80" : "text-amber-400"}>{l.whatsapp_slug ?? "nessuno"}</b></p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openRules(l.id)} title="Formattazione condizionale">
                        <Palette className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(l)}>
                        <Settings2 className="h-3.5 w-3.5 mr-1" /> Configura
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(l)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {editing && (
        <LancioConfigDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          value={editing}
          onSave={handleSave}
          esistenti={lanci.map((l) => l.id)}
          market={selectedMarket}
        />
      )}

      {/* Formattazione condizionale */}
      <Dialog open={!!rulesOpen} onOpenChange={(o) => !o && setRulesOpen(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Formattazione condizionale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[170px]">
                <Label className="text-[11px]">Metrica</Label>
                <Select value={nr.key} onValueChange={(v) => setNr({ ...nr, key: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_METRICS.map((m) => <SelectItem key={String(m.key)} value={String(m.key)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Se</Label>
                <Select value={nr.op} onValueChange={(v) => setNr({ ...nr, op: v as ColorRule["op"] })}>
                  <SelectTrigger className="h-8 w-[74px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt">&lt;</SelectItem><SelectItem value="gt">&gt;</SelectItem>
                    <SelectItem value="lte">≤</SelectItem><SelectItem value="gte">≥</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" className="h-8 w-[92px]" placeholder="valore" value={nr.val}
                onChange={(e) => setNr({ ...nr, val: e.target.value })} />
              <Button size="sm" className="h-8" onClick={addRule}>Aggiungi</Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setNr({ ...nr, color: c })}
                  className={`w-6 h-6 rounded-md border-2 ${nr.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="space-y-1.5">
              {rules.length === 0 && <p className="text-[12px] text-muted-foreground">Nessuna regola.</p>}
              {rules.map((r) => {
                const m = ALL_METRICS.find((x) => String(x.key) === r.key);
                const op = { lt: "<", gt: ">", lte: "≤", gte: "≥" }[r.op];
                return (
                  <div key={r.key} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: r.color }} />
                    <span className="flex-1">{m?.label ?? r.key} {op} {r.val}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => delRule(r.key)}>✕</Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setRulesOpen(null)}>Chiudi</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LanciSettings;
