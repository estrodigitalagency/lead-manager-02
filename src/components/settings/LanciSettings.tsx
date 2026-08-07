import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Rocket, Palette } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import {
  fetchLanci, saveLanci, fetchColorRules, saveColorRules,
  LancioConfig, ColorRule, PALETTE,
} from "@/lib/lanci/config";
import { CALL_METRICS, LEAD_METRICS } from "@/components/lanci/LancioMatrix";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

const emptyCfg = (): LancioConfig => ({ id: "", nome: "", provenienza: "3sfere", call_tabs: [], lead_tab: "", campagna: "", target: {}, sales: [] });

const LanciSettings = () => {
  const { selectedMarket } = useMarket();
  const { venditori } = useSalespeopleData();
  const [lanci, setLanci] = useState<LancioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LancioConfig | null>(null);
  const [form, setForm] = useState<LancioConfig>(emptyCfg());
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

  const openNew = () => { setEditing(null); setForm(emptyCfg()); setOpen(true); };
  const openEdit = (l: LancioConfig) => { setEditing(l); setForm({ ...emptyCfg(), ...l }); setOpen(true); };

  const persist = async (next: LancioConfig[]) => {
    if (!(await saveLanci(next))) { toast.error("Errore salvataggio"); return false; }
    setLanci(next); return true;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Il nome è obbligatorio"); return; }
    if (!form.provenienza.trim()) { toast.error("Indica la provenienza delle call"); return; }
    if (form.call_tabs.length === 0) { toast.error("Seleziona almeno un tab call"); return; }
    if (!form.lead_tab.trim()) { toast.error("Seleziona il tab dei lead"); return; }
    const id = form.id || slug(form.nome);
    const cfg: LancioConfig = { ...form, id, nome: form.nome.trim() };
    const next = editing ? lanci.map((l) => (l.id === editing.id ? cfg : l)) : [...lanci, cfg];
    if (editing ? false : lanci.some((l) => l.id === id)) { toast.error("Esiste già un lancio con questo nome"); return; }
    if (await persist(next)) { toast.success(editing ? "Lancio aggiornato" : "Lancio creato"); setOpen(false); }
  };

  const handleDelete = async (l: LancioConfig) => {
    if (!confirm(`Eliminare il lancio "${l.nome}"?`)) return;
    if (await persist(lanci.filter((x) => x.id !== l.id))) toast.success("Lancio eliminato");
  };

  const toggleTab = (t: string) =>
    setForm((f) => ({ ...f, call_tabs: f.call_tabs.includes(t) ? f.call_tabs.filter((x) => x !== t) : [...f.call_tabs, t] }));
  const toggleSales = (n: string) =>
    setForm((f) => ({ ...f, sales: (f.sales ?? []).includes(n) ? (f.sales ?? []).filter((x) => x !== n) : [...(f.sales ?? []), n] }));

  const openRules = async (id: string) => { setRules(await fetchColorRules(id)); setRulesOpen(id); };
  const addRule = async () => {
    const v = parseFloat(nr.val);
    if (isNaN(v) || !rulesOpen) { toast.error("Inserisci un valore"); return; }
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
  const sellerNames = venditori.map((s) => `${s.nome} ${s.cognome || ""}`.trim());

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Lanci ({selectedMarket})</CardTitle>
          <CardDescription>
            Configura i lanci mostrati in Analytics Lancio: da quali tab leggere call e lead, i target e i sales inclusi.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuovo lancio</Button>
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
            {lanci.map((l) => (
              <div key={l.id} className="p-3 rounded-lg border border-border bg-card/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">{l.nome}</h4>
                    <p className="text-[11.5px] text-muted-foreground mt-1">
                      call <b>{l.provenienza}</b> · {l.call_tabs.join(" + ") || "—"} · lead <b>{l.lead_tab || "—"}</b>
                      {l.campagna && <> · campagna <b>{l.campagna}</b></>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {(l.sales?.length ?? 0) > 0 ? `${l.sales!.length} sales inclusi` : "tutti i sales con dati"}
                      {Object.keys(l.target ?? {}).length > 0 && ` · ${Object.keys(l.target!).length} target impostati`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openRules(l.id)} title="Formattazione condizionale">
                      <Palette className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(l)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Configurazione lancio */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifica lancio" : "Nuovo lancio"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="es. Workshop Set26" />
              </div>
              <div>
                <Label>Provenienza call</Label>
                <Input value={form.provenienza} onChange={(e) => setForm({ ...form, provenienza: e.target.value })} placeholder="es. 3sfere" />
                <p className="text-[11px] text-muted-foreground mt-1">Valore esatto nella colonna provenienza del tab call.</p>
              </div>
            </div>

            <div>
              <Label>Tab call nei fogli sales (uno per mese, separati da virgola)</Label>
              <Input value={form.call_tabs.join(", ")}
                onChange={(e) => setForm({ ...form, call_tabs: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="es. Giugno26 Elenco call/esito, Luglio26 Elenco call/esito" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Nome <b>esatto</b> del tab, identico in tutti i fogli sales. Se in un foglio manca, per quel sales le call non vengono lette (compare tra gli avvisi).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tab lead del lancio</Label>
                <Input value={form.lead_tab} onChange={(e) => setForm({ ...form, lead_tab: e.target.value })}
                  placeholder="es. Lead Workshop_Giu26" />
              </div>
              <div>
                <Label>Campagna (lead generati)</Label>
                <Input value={form.campagna ?? ""} onChange={(e) => setForm({ ...form, campagna: e.target.value })}
                  placeholder="es. Workshop Giu26" />
                <p className="text-[11px] text-muted-foreground mt-1">Campagna nel database, per lead generati e andamento.</p>
              </div>
            </div>

            <div>
              <Label>Sales inclusi <span className="text-muted-foreground font-normal">(nessuno = tutti quelli con dati)</span></Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-[110px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
                {sellerNames.map((n) => (
                  <button key={n} type="button" onClick={() => toggleSales(n)}
                    className={`px-2 py-0.5 rounded-full border text-[11.5px] ${(form.sales ?? []).includes(n)
                      ? "border-primary bg-primary/15 text-primary font-medium" : "border-border bg-card text-muted-foreground"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Target lead per sales</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5 max-h-[160px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
                {sellerNames.map((n) => (
                  <div key={n} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground truncate flex-1" title={n}>{n.split(" ")[0]}</span>
                    <Input type="number" className="h-7 w-[68px] text-[12px]" value={form.target?.[n] ?? ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setForm((f) => {
                          const t = { ...(f.target ?? {}) };
                          if (isNaN(v)) delete t[n]; else t[n] = v;
                          return { ...f, target: t };
                        });
                      }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={handleSave}>{editing ? "Salva" : "Crea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
