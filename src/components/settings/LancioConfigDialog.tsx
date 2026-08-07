import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, FileSpreadsheet, Zap, MessageCircle, AlertTriangle, Loader2, Plus } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { fetchTemplates, saveTemplate } from "@/lib/whatsapp/templates";
import { checkConflitti, Conflitto } from "@/lib/lanci/integrazioni";
import { LancioConfig } from "@/lib/lanci/config";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: LancioConfig;
  onSave: (cfg: LancioConfig) => Promise<boolean>;
  esistenti: string[];
  market: string;
}

type Azione = "weighted_distribution" | "assign_to_previous_seller" | "assign_to_seller";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

/**
 * Configurazione di un lancio in un unico flusso: chi ci lavora, da quali tab leggere,
 * come vengono assegnati i lead e con quale link WhatsApp.
 * L'automazione viene scritta in `lead_assignment_automations`, la stessa tabella della
 * sezione Automazioni: quello che si crea qui si ritrova lì e viceversa.
 */
const LancioConfigDialog = ({ open, onOpenChange, value, onSave, esistenti, market }: Props) => {
  const { venditori } = useSalespeopleData();
  const { automations, createAutomation, updateAutomation, toggleAutomation } = useAutomationsData();
  const [form, setForm] = useState<LancioConfig>(value);
  const [saving, setSaving] = useState(false);

  // ── automazione ──
  const [autoOn, setAutoOn] = useState(true);
  const [aTrigger, setATrigger] = useState<"new_lead" | "duplicate_different_source">("new_lead");
  const [aFonti, setAFonti] = useState("");
  const [aAzione, setAAzione] = useState<Azione>("weighted_distribution");
  const [aPrevFirst, setAPrevFirst] = useState(false);
  const [aTargetSeller, setATargetSeller] = useState("");
  const [aModo, setAModo] = useState<"percentage" | "count">("percentage");
  const [aQuote, setAQuote] = useState<Record<string, number>>({});   // nome venditore → peso/quota
  const [aSheetTab, setASheetTab] = useState("");
  const [aCampagna, setACampagna] = useState("");
  const [aWebhook, setAWebhook] = useState(true);
  const [aLockOn, setALockOn] = useState(false);
  const [aLockDays, setALockDays] = useState(30);   // -1 = sempre lo stesso venditore
  const [aEsclusi, setAEsclusi] = useState<string[]>([]);
  const [conflitti, setConflitti] = useState<Conflitto[]>([]);

  // ── whatsapp ──
  const [wa, setWa] = useState<{ slug: string; nome: string; click_count: number; messaggio_template: string; fallback_phone: string | null }[]>([]);
  const [waNuovo, setWaNuovo] = useState(false);
  const [waNome, setWaNome] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [waFallback, setWaFallback] = useState("");
  const [waOn, setWaOn] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const attivi = useMemo(
    () => venditori.filter((v) => v.stato === "attivo").map((v) => ({ id: v.id, nome: `${v.nome} ${v.cognome || ""}`.trim() })),
    [venditori],
  );
  const autom = automations.find((a) => a.id === form.automazione_id) ?? null;
  const waSel = wa.find((t) => t.slug === form.whatsapp_slug) ?? null;

  useEffect(() => {
    if (!open) return;
    setForm(value);
    setWaNuovo(false);
    setWaOn(!!value.whatsapp_slug || !value.id);
    fetchTemplates().then((t) => setWa(t as any));
    // precompila l'automazione da quella collegata, altrimenti dai dati del lancio
    if (autom) {
      setAutoOn(autom.attivo);
      setATrigger((autom.trigger_when as any) ?? "new_lead");
      setAFonti((autom.condition_value ?? []).join(", "));
      setAAzione((autom.action_type as Azione) ?? "weighted_distribution");
      setAPrevFirst(!!(autom as any).use_previous_seller_first);
      setATargetSeller((autom as any).target_seller_id ?? "");
      setAModo(((autom as any).distribution_mode as any) ?? "percentage");
      const q: Record<string, number> = {};
      for (const s of ((autom as any).distribution_config ?? []) as any[]) {
        const v = venditori.find((x) => x.id === s.venditore_id);
        if (v) q[`${v.nome} ${v.cognome || ""}`.trim()] = (s.count_target ?? s.weight ?? 0);
      }
      setAQuote(q);
      setASheetTab((autom as any).sheets_tab_name ?? "");
      setACampagna((autom as any).campagna ?? value.campagna ?? "");
      setAWebhook((autom as any).webhook_enabled !== false);
      const lp = (autom as any).lock_period_days;
      setALockOn(lp !== null && lp !== undefined);
      setALockDays(lp ?? 30);
      setAEsclusi((autom as any).excluded_sellers ?? []);
    } else {
      setAutoOn(true); setATrigger("new_lead"); setAAzione("weighted_distribution");
      setAFonti(value.campagna ? slugify(value.campagna).replace(/-/g, "_") : "");
      setAPrevFirst(false); setATargetSeller(""); setAModo("percentage"); setAQuote({});
      setASheetTab(""); setACampagna(value.campagna ?? ""); setAWebhook(true);
      setALockOn(false); setALockDays(30); setAEsclusi([]);
    }
  }, [open, value, autom?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // conflitti in tempo reale sulle fonti scritte
  useEffect(() => {
    const cond = aFonti.split(",").map((s) => s.trim()).filter(Boolean);
    if (!open || cond.length === 0) { setConflitti([]); return; }
    const t = setTimeout(async () => {
      setConflitti(await checkConflitti(market, cond, "ultima_fonte", (autom as any)?.priority ?? 999, autom?.id));
    }, 400);
    return () => clearTimeout(t);
  }, [aFonti, open, market, autom?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const sales = form.sales ?? [];
  const toggleSales = (nome: string) =>
    setForm((f) => {
      const cur = f.sales ?? [];
      return { ...f, sales: cur.includes(nome) ? cur.filter((x) => x !== nome) : [...cur, nome] };
    });

  const quotaSales = sales.length ? sales : attivi.map((a) => a.nome);
  const totQuote = quotaSales.reduce((s, nome) => s + (aQuote[nome] ?? 0), 0);
  const quoteValide = aAzione !== "weighted_distribution"
    || (aModo === "percentage" ? totQuote === 100 : totQuote > 0);

  const dividiEqua = () => {
    const n = quotaSales.length;
    if (!n) return;
    if (aModo === "percentage") {
      const base = Math.floor(100 / n), resto = 100 - base * n;
      setAQuote(Object.fromEntries(quotaSales.map((nome, i) => [nome, base + (i === 0 ? resto : 0)])));
    } else {
      setAQuote(Object.fromEntries(quotaSales.map((nome) => [nome, aQuote[nome] ?? 50])));
    }
  };

  const salvaAutomazione = async (): Promise<string | undefined> => {
    const cond = aFonti.split(",").map((s) => s.trim()).filter(Boolean);
    if (cond.length === 0) { toast.error("Indica la fonte che attiva l'assegnazione"); return; }
    if (aAzione === "assign_to_seller" && !aTargetSeller) { toast.error("Scegli il venditore a cui assegnare"); return; }
    if (!quoteValide) {
      toast.error(aModo === "percentage" ? `La somma delle percentuali deve essere 100 (ora ${totQuote})` : "Imposta le quote");
      return;
    }
    const dist = aAzione === "weighted_distribution"
      ? quotaSales.map((nome) => {
          const v = attivi.find((a) => a.nome === nome);
          const q = aQuote[nome] ?? 0;
          return v ? { venditore_id: v.id, weight: aModo === "percentage" ? q : null, count_target: aModo === "count" ? q : null, cap: null } : null;
        }).filter(Boolean)
      : [];
    const payload: any = {
      nome: `Assegnazione ${form.nome || value.nome}`.trim(),
      attivo: autoOn,
      trigger_when: aTrigger,
      trigger_field: "ultima_fonte",
      condition_type: "contains",
      condition_value: cond,
      action_type: aAzione,
      target_seller_id: aAzione === "assign_to_seller" ? aTargetSeller : null,
      use_previous_seller_first: aAzione === "weighted_distribution" ? aPrevFirst : false,
      distribution_enabled: aAzione === "weighted_distribution",
      distribution_mode: aAzione === "weighted_distribution" ? aModo : null,
      distribution_config: dist,
      sheets_tab_name: aSheetTab.trim() || null,
      campagna: aCampagna.trim() || null,
      webhook_enabled: aWebhook,
      lock_period_days: aLockOn ? aLockDays : null,
      excluded_sellers: aEsclusi,
    };
    try {
      if (autom) { await updateAutomation(autom.id, payload); return autom.id; }
      const maxP = Math.max(...automations.map((a) => a.priority ?? 0), 0);
      const created: any = await createAutomation({ ...payload, priority: maxP + 1 });
      return created?.id;
    } catch { toast.error("Errore nel salvataggio della regola"); return; }
  };

  const creaWa = async (): Promise<string | undefined> => {
    const nome = waNome.trim() || `WhatsApp ${form.nome}`;
    const slug = slugify(nome);
    const res = await saveTemplate({
      slug, nome, messaggio_template: waMsg.trim() || `Ciao {{venditore_nome}}, ho confermato la partecipazione a ${form.nome}!`,
      market, attivo: true, fallback_phone: waFallback.trim() || null, fallback_message: null,
    });
    if (res === "duplicate") { toast.error("Esiste già un link con questo nome"); return; }
    if (res === "error") { toast.error("Errore nella creazione del link"); return; }
    return slug;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error("Il nome del lancio è obbligatorio");
    const id = form.id || slugify(form.nome).replace(/-/g, "_").slice(0, 40);
    if (!value.id && esistenti.includes(id)) return toast.error("Esiste già un lancio con questo nome");
    setSaving(true);
    try {
      let automazione_id = form.automazione_id;
      if (aFonti.trim()) {
        const res = await salvaAutomazione();
        if (!res && !automazione_id) { setSaving(false); return; }
        if (res) automazione_id = res;
      }
      let whatsapp_slug = waOn ? form.whatsapp_slug : undefined;
      if (waOn && waNuovo) {
        const s = await creaWa();
        if (!s) { setSaving(false); return; }
        whatsapp_slug = s;
      }
      const ok = await onSave({
        ...form, id, nome: form.nome.trim(),
        lead_sales: form.sales, call_sales: form.sales,   // i venditori del lancio valgono per entrambi
        automazione_id, whatsapp_slug,
      });
      if (ok) onOpenChange(false);
    } finally { setSaving(false); }
  };

  const Sez = ({ icon: Icon, title, desc, children }: any) => (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 pb-1.5 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-[13px] font-semibold">{title}</h4>
        {desc && <span className="text-[11px] text-muted-foreground">· {desc}</span>}
      </div>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto top-[5vh] translate-y-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2">
        <DialogHeader><DialogTitle>{value.id ? "Configura lancio" : "Nuovo lancio"}</DialogTitle></DialogHeader>

        <div className="space-y-6">
          {/* 1 — nome */}
          <div>
            <Label>Nome del lancio</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="es. Workshop Set26" />
          </div>

          {/* 2 — venditori */}
          <Sez icon={Users} title="Venditori che lavorano al lancio" desc={sales.length ? `${sales.length} selezionati` : "tutti gli attivi"}>
            <div className="flex gap-1.5 mb-1.5">
              <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setForm((f) => ({ ...f, sales: attivi.map((a) => a.nome) }))}>Tutti</Button>
              <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setForm((f) => ({ ...f, sales: [] }))}>Nessuno</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
              {attivi.map((v) => (
                <button key={v.id} type="button" onClick={() => toggleSales(v.nome)}
                  className={`px-2 py-0.5 rounded-full border text-[11.5px] ${sales.includes(v.nome)
                    ? "border-primary bg-primary/15 text-primary font-medium" : "border-border bg-card text-muted-foreground"}`}>
                  {v.nome}
                </button>
              ))}
            </div>
          </Sez>

          {/* 3 — fogli */}
          <Sez icon={FileSpreadsheet} title="Dove leggere i dati" desc="nomi esatti dei tab nei fogli dei venditori">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Tab lead</Label>
                <Input value={form.lead_tab} onChange={(e) => setForm({ ...form, lead_tab: e.target.value })}
                  placeholder="es. Lead Workshop_Giu26" />
              </div>
              <div>
                <Label className="text-[12px]">Campagna dei lead</Label>
                <Input value={form.campagna ?? ""} onChange={(e) => setForm({ ...form, campagna: e.target.value })}
                  placeholder="es. Workshop Giu26" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Il valore che i lead di questo lancio hanno nel campo <b>campagna</b> (lo vedi in Database → Lead Generation). Serve a contare lead generati, fonti e andamento.
                </p>
              </div>
              <div>
                <Label className="text-[12px]">Tab call (uno per mese, separati da virgola)</Label>
                <Input value={form.call_tabs.join(", ")}
                  onChange={(e) => setForm({ ...form, call_tabs: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="es. Giugno26 Elenco call/esito, Luglio26…" />
              </div>
              <div>
                <Label className="text-[12px]">Provenienza delle call</Label>
                <Input value={form.provenienza} onChange={(e) => setForm({ ...form, provenienza: e.target.value })}
                  placeholder="es. 3sfere" />
              </div>
            </div>
          </Sez>

          {/* 4 — automazione */}
          <Sez icon={Zap} title="Assegnazione automatica" desc={autom ? `regola: ${autom.nome}` : "nuova regola"}>
            <div className="flex items-center gap-2 mb-1">
              <Switch checked={autoOn} onCheckedChange={setAutoOn} />
              <span className="text-[12.5px]">{autoOn ? "Attiva" : "Disattiva — assegni a mano"}</span>
            </div>

            <div className={`space-y-3 ${autoOn ? "" : "opacity-50 pointer-events-none"}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Quando</Label>
                  <Select value={aTrigger} onValueChange={(v) => setATrigger(v as any)}>
                    <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">Nuovo lead</SelectItem>
                      <SelectItem value="duplicate_different_source">Lead duplicato da fonte diversa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[12px]">Se la fonte contiene</Label>
                  <Input className="h-8 text-[12.5px]" value={aFonti} onChange={(e) => setAFonti(e.target.value)}
                    placeholder="es. workshop_set26" />
                </div>
              </div>

              {conflitti.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[12px] font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" /> {conflitti.length} regola/e attive in conflitto
                  </div>
                  {conflitti.map((c, i) => (
                    <p key={i} className="text-[11.5px] text-muted-foreground">
                      <b className="text-foreground">{c.automazione}</b> {c.motivo}
                      {c.priorityMinore ? <span className="text-amber-400"> · scatta prima di questa</span> : " · questa scatta prima"}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-[12px]">Azione</Label>
                <Select value={aAzione} onValueChange={(v) => setAAzione(v as Azione)}>
                  <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weighted_distribution">Distribuisci tra i venditori del lancio</SelectItem>
                    <SelectItem value="assign_to_previous_seller">Assegna al venditore precedente</SelectItem>
                    <SelectItem value="assign_to_seller">Assegna a un venditore specifico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aAzione === "assign_to_seller" && (
                <div>
                  <Label className="text-[12px]">Venditore</Label>
                  <Select value={aTargetSeller} onValueChange={setATargetSeller}>
                    <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Scegli" /></SelectTrigger>
                    <SelectContent>
                      {attivi.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {aAzione === "weighted_distribution" && (
                <div className="space-y-2.5 rounded-md border border-border bg-secondary/30 p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={aPrevFirst} onCheckedChange={setAPrevFirst} />
                      <span className="text-[12.5px]">Se il lead è già noto, cerca prima il venditore precedente</span>
                    </div>
                    {aPrevFirst && (
                      <div className="pl-9 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Switch checked={aLockOn} onCheckedChange={setALockOn} />
                          <span className="text-[12px]">Solo se l'ultima assegnazione è recente</span>
                          {aLockOn && (
                            <>
                              <Input type="number" className="h-7 w-[74px] text-[12px]" value={aLockDays < 0 ? "" : aLockDays}
                                onChange={(e) => setALockDays(parseInt(e.target.value, 10) || 0)} disabled={aLockDays < 0} />
                              <span className="text-[12px] text-muted-foreground">giorni</span>
                              <Button size="sm" variant={aLockDays < 0 ? "default" : "outline"} className="h-6 text-[11px]"
                                onClick={() => setALockDays(aLockDays < 0 ? 30 : -1)}>
                                sempre
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {!aLockOn
                            ? "Nessun limite di tempo: torna sempre al venditore precedente, se esiste."
                            : aLockDays < 0
                              ? "Il lead torna sempre allo stesso venditore, senza scadenza."
                              : `Oltre ${aLockDays} giorni dall'ultima assegnazione il lead viene ridistribuito.`}
                        </p>
                        <div>
                          <span className="text-[12px] text-muted-foreground">Venditori da non riprendere mai{aEsclusi.length ? ` (${aEsclusi.length})` : ""}</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {attivi.map((v) => (
                              <button key={v.id} type="button"
                                onClick={() => setAEsclusi((p) => p.includes(v.nome) ? p.filter((x) => x !== v.nome) : [...p, v.nome])}
                                className={`px-2 py-0.5 rounded-full border text-[11px] ${aEsclusi.includes(v.nome)
                                  ? "border-destructive bg-destructive/15 text-destructive font-medium" : "border-border bg-card text-muted-foreground"}`}>
                                {v.nome}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant={aModo === "percentage" ? "default" : "outline"} className="h-7 text-[11.5px]" onClick={() => setAModo("percentage")}>Percentuale</Button>
                      <Button size="sm" variant={aModo === "count" ? "default" : "outline"} className="h-7 text-[11.5px]" onClick={() => setAModo("count")}>Quota assoluta</Button>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className={`text-[11.5px] ${quoteValide ? "text-emerald-400" : "text-amber-400"}`}>
                        {aModo === "percentage" ? `totale ${totQuote}%` : `totale ${totQuote} lead`}
                      </span>
                      <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={dividiEqua}>Dividi equamente</Button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {quotaSales.map((nome) => (
                      <div key={nome} className="flex items-center gap-2">
                        <span className="flex-1 text-[12px] truncate">{nome}</span>
                        <Input type="number" className="h-7 w-[80px] text-[12px]" value={aQuote[nome] ?? ""}
                          onChange={(e) => setAQuote((q) => ({ ...q, [nome]: parseInt(e.target.value, 10) || 0 }))} />
                        <span className="text-[11px] text-muted-foreground w-8">{aModo === "percentage" ? "%" : "lead"}</span>
                      </div>
                    ))}
                    {quotaSales.length === 0 && <p className="text-[12px] text-muted-foreground">Seleziona prima i venditori del lancio.</p>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Nome tab Google Sheets <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
                  <Input className="h-8 text-[12.5px]" value={aSheetTab} onChange={(e) => setASheetTab(e.target.value)}
                    placeholder="dove scrivere i lead assegnati" />
                </div>
                <div>
                  <Label className="text-[12px]">Campagna da assegnare <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
                  <Input className="h-8 text-[12.5px]" value={aCampagna} onChange={(e) => setACampagna(e.target.value)}
                    placeholder="scritta sul lead al momento dell'assegnazione" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={aWebhook} onCheckedChange={setAWebhook} />
                <span className="text-[12.5px]">Invia i lead assegnati al webhook configurato</span>
              </div>
            </div>
          </Sez>

          {/* 5 — whatsapp */}
          <Sez icon={MessageCircle} title="Link WhatsApp del lancio" desc="porta il lead sulla chat del venditore assegnato">
            <div className="flex items-center gap-2 mb-1">
              <Switch checked={waOn} onCheckedChange={setWaOn} />
              <span className="text-[12.5px]">{waOn ? "Attivo" : "Non usato in questo lancio"}</span>
            </div>

            {waOn && (
              <div className="space-y-3">
                {/* scelta: link esistente o nuovo */}
                <div className="flex gap-1.5">
                  <Button size="sm" variant={!waNuovo ? "default" : "outline"} className="h-7 text-[11.5px]" onClick={() => setWaNuovo(false)}>
                    Usa un link esistente
                  </Button>
                  <Button size="sm" variant={waNuovo ? "default" : "outline"} className="h-7 text-[11.5px]"
                    onClick={() => { setWaNuovo(true); if (!waNome) setWaNome(`WhatsApp ${form.nome}`); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Creane uno nuovo
                  </Button>
                </div>

                {!waNuovo ? (
                  <div>
                    <Label className="text-[12px]">Link collegato</Label>
                    <Select value={form.whatsapp_slug ?? "__none__"}
                      onValueChange={(v) => setForm({ ...form, whatsapp_slug: v === "__none__" ? undefined : v })}>
                      <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Nessuno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nessuno</SelectItem>
                        {wa.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.nome} · {t.click_count} click</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {waSel && (
                      <div className="mt-2 rounded-md border border-border bg-secondary/30 p-2.5 space-y-1 text-[11.5px]">
                        <p className="text-muted-foreground">Indirizzo da mettere nel bottone della thank-you page:</p>
                        <code className="block px-2 py-1 rounded bg-primary/15 text-primary text-[11px] break-all">
                          {origin}/wa/{waSel.slug}?email=&#123;&#123;email&#125;&#125;&amp;nome=&#123;&#123;nome&#125;&#125;&amp;telefono=&#123;&#123;telefono&#125;&#125;
                        </code>
                        <p className="italic text-muted-foreground">"{waSel.messaggio_template}"</p>
                        <p className={waSel.fallback_phone ? "text-emerald-400" : "text-amber-400"}>
                          {waSel.fallback_phone
                            ? `Numero di riserva: ${waSel.fallback_phone}`
                            : "Nessun numero di riserva: se il lead non ha venditore vedrà un errore"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-3">
                    <div>
                      <Label className="text-[12px]">Nome del link</Label>
                      <Input className="h-8 text-[12.5px]" value={waNome} onChange={(e) => setWaNome(e.target.value)}
                        placeholder={`WhatsApp ${form.nome || "lancio"}`} />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Indirizzo: <code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11px]">{origin}/wa/{slugify(waNome) || "…"}</code>
                      </p>
                    </div>
                    <div>
                      <Label className="text-[12px]">Messaggio che il lead si trova già scritto</Label>
                      <Textarea rows={2} className="text-[12.5px]" value={waMsg} onChange={(e) => setWaMsg(e.target.value)}
                        placeholder={`Ciao {{venditore_nome}}, ho confermato la partecipazione a ${form.nome || "…"}!`} />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {["{{nome}}", "{{venditore_nome}}", "{{venditore}}", "{{fonte}}", "{{campagna}}"].map((ph) => (
                          <button key={ph} type="button" onClick={() => setWaMsg((m) => `${m}${m && !m.endsWith(" ") ? " " : ""}${ph}`)}
                            className="px-1.5 py-0.5 rounded border border-border bg-card text-[10.5px] text-muted-foreground hover:border-primary">
                            {ph}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[12px]">Numero di riserva <span className="text-muted-foreground font-normal">(consigliato)</span></Label>
                      <Input className="h-8 text-[12.5px]" value={waFallback} onChange={(e) => setWaFallback(e.target.value)}
                        placeholder="+39 340 123 4567" />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Usato quando il lead non ha ancora un venditore o il venditore non ha il numero: senza, il lead vedrebbe una pagina di errore.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Sez>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} {value.id ? "Salva lancio" : "Crea lancio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LancioConfigDialog;
