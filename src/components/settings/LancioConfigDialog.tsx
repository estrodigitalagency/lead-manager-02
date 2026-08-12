import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, FileSpreadsheet, Zap, MessageCircle, AlertTriangle, Loader2, Plus, Rocket, CheckCircle2 } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { fetchTemplates, saveTemplate } from "@/lib/whatsapp/templates";
import { fetchCodaIds, setCoda, contaInCoda, recuperaCoda, anteprimaLiberi, assegnaLiberi, AnteprimaLiberi } from "@/lib/automazioni/coda";
import { azzeraContatori } from "@/lib/automazioni/contatori";
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

/** Contenitore di uno step. Definito fuori dal componente: se stesse dentro, React lo
 *  tratterebbe come un tipo nuovo a ogni render e gli input perderebbero il focus. */
const Sez = ({ desc, children }: { desc?: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    {desc && <p className="text-[12px] text-muted-foreground">{desc}</p>}
    {children}
  </div>
);

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
  const [step, setStep] = useState(0);

  // ── automazione ──
  const [autoOn, setAutoOn] = useState(true);
  const [aTrigger, setATrigger] = useState<"new_lead" | "duplicate_different_source">("new_lead");
  const [aFonti, setAFonti] = useState("");
  const [aCondTipo, setACondTipo] = useState<"contains" | "not_contains">("contains");
  const [aEscl, setAEscl] = useState("");   // fonti da escludere anche se la condizione è vera
  const [aAzione, setAAzione] = useState<Azione>("weighted_distribution");
  const [aPrevFirst, setAPrevFirst] = useState(false);
  const [aTargetSeller, setATargetSeller] = useState("");
  const [aModo, setAModo] = useState<"percentage" | "count">("percentage");
  const [aQuote, setAQuote] = useState<Record<string, number>>({});   // nome venditore → peso/quota
  const [aCap, setACap] = useState<Record<string, number>>({});      // nome venditore → tetto massimo lead
  const [conta, setConta] = useState<Record<string, number>>({});    // id venditore → lead già assegnati
  const [aPausa, setAPausa] = useState<Record<string, boolean>>({}); // nome venditore → distribuzione sospesa
  const [aGruppo, setAGruppo] = useState<Record<string, string>>({});   // nome venditore → gruppo (es. Closer)
  const [aQuotaGruppo, setAQuotaGruppo] = useState<Record<string, number>>({}); // gruppo → quota sul totale
  const [inCoda, setInCoda] = useState(0);          // lead fermi in attesa di distribuzione
  const [recupero, setRecupero] = useState(false);
  const [liberi, setLiberi] = useState<AnteprimaLiberi | null>(null);   // proposta dopo il salvataggio
  const [aWebhook, setAWebhook] = useState(true);
  const [aCoda, setACoda] = useState(false);   // assegnazione in coda: i lead nuovi aspettano
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

  // "Round Robin" è una riga della tabella venditori ma è la coda d'attesa, non una persona.
  const attivi = useMemo(
    () => venditori
      .filter((v) => v.stato === "attivo" && `${v.nome}`.trim().toLowerCase() !== "round robin")
      .map((v) => ({ id: v.id, nome: `${v.nome} ${v.cognome || ""}`.trim() })),
    [venditori],
  );

  /** Venditori del lancio (passo 2). Senza selezione valgono tutti gli attivi. */
  const delLancio = useMemo(
    () => (form.sales?.length ? attivi.filter((v) => form.sales!.includes(v.nome)) : attivi),
    [attivi, form.sales],
  );
  const autom = automations.find((a) => a.id === form.automazione_id) ?? null;
  const waSel = wa.find((t) => t.slug === form.whatsapp_slug) ?? null;

  useEffect(() => {
    if (!open) return;
    setForm(value);
    setStep(0);

    setWaNuovo(false);
    setWaOn(!!value.whatsapp_slug || !value.id);
    fetchTemplates().then((t) => setWa(t as any));
    // precompila l'automazione da quella collegata, altrimenti dai dati del lancio
    if (autom) {
      setAutoOn(autom.attivo);
      setATrigger((autom.trigger_when as any) ?? "new_lead");
      setAFonti((autom.condition_value ?? []).join(", "));
      setACondTipo(((autom as any).condition_type === "not_contains" ? "not_contains" : "contains"));
      fetchCodaIds().then((ids) => setACoda(ids.includes(autom.id)));
      contaInCoda(market, autom.id).then(setInCoda);
      setConta(((autom as any).distribution_state?.count_assigned) ?? {});
      {
        const cfgSlot = ((autom as any).distribution_config ?? []) as any[];
        setAGruppo(Object.fromEntries(cfgSlot
          .map((sl) => [attivi.find((v) => v.id === sl.venditore_id)?.nome ?? "", String(sl.gruppo ?? "")])
          .filter(([n]: any[]) => n)));
        const qg: Record<string, number> = {};
        for (const sl of cfgSlot) {
          const g = String(sl.gruppo ?? "").trim();
          if (g && Number(sl.gruppo_weight) > 0) qg[g] = Number(sl.gruppo_weight);
        }
        setAQuotaGruppo(qg);
      }
      setAPausa(Object.fromEntries(((autom as any).distribution_config ?? [])
        .filter((sl: any) => sl.paused)
        .map((sl: any) => {
          const v = venditori.find((x) => x.id === sl.venditore_id);
          return [v ? `${v.nome} ${v.cognome || ""}`.trim() : sl.venditore_id, true];
        })));
      setAEscl(((autom as any).trigger_sources ?? []).join(", "));
      setAAzione((autom.action_type as Azione) ?? "weighted_distribution");
      setAPrevFirst(!!(autom as any).use_previous_seller_first);
      setATargetSeller((autom as any).target_seller_id ?? "");
      setAModo(((autom as any).distribution_mode as any) ?? "percentage");
      const q: Record<string, number> = {}, cp: Record<string, number> = {};
      for (const s of ((autom as any).distribution_config ?? []) as any[]) {
        const v = venditori.find((x) => x.id === s.venditore_id);
        if (!v) continue;
        const nome = `${v.nome} ${v.cognome || ""}`.trim();
        q[nome] = (s.count_target ?? s.weight ?? 0);
        if (s.cap != null) cp[nome] = s.cap;
      }
      setAQuote(q); setACap(cp);
      setAWebhook((autom as any).webhook_enabled !== false);
      const lp = (autom as any).lock_period_days;
      setALockOn(lp !== null && lp !== undefined);
      setALockDays(lp ?? 30);
      setAEsclusi((autom as any).excluded_sellers ?? []);
    } else {
      setAutoOn(true); setATrigger("new_lead"); setAAzione("weighted_distribution");
      setAFonti(value.campagna ? slugify(value.campagna).replace(/-/g, "_") : "");
      setAPrevFirst(false); setATargetSeller(""); setAModo("percentage"); setAQuote({}); setACap({});
      setAWebhook(true);
      setALockOn(false); setALockDays(30); setAEsclusi([]);
      setACondTipo("contains"); setAEscl(""); setACoda(false); setConta({}); setAPausa({}); setAGruppo({}); setAQuotaGruppo({}); setInCoda(0);
    }
  }, [open, value, autom?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // conflitti in tempo reale sulle fonti scritte
  useEffect(() => {
    const cond = aFonti.split(",").map((s) => s.trim()).filter(Boolean);
    if (!open || cond.length === 0) { setConflitti([]); return; }
    const t = setTimeout(async () => {
      setConflitti(await checkConflitti({
        market, condition: cond,
        esclusioni: aEscl.split(",").map((x) => x.trim()).filter(Boolean),
        trigger_field: "ultima_fonte", trigger_when: aTrigger,
        priority: (autom as any)?.priority ?? 999, escludiId: autom?.id,
      }));
    }, 400);
    return () => clearTimeout(t);
  }, [aFonti, aEscl, aTrigger, open, market, autom?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const sales = form.sales ?? [];
  const toggleSales = (nome: string) =>
    setForm((f) => {
      const cur = f.sales ?? [];
      return { ...f, sales: cur.includes(nome) ? cur.filter((x) => x !== nome) : [...cur, nome] };
    });

  const quotaSales = sales.length ? sales : attivi.map((a) => a.nome);
  const gruppoDi = (nome: string) => (aGruppo[nome] ?? "").trim();
  const gruppi = Array.from(new Set(quotaSales.map(gruppoDi).filter(Boolean))).sort();
  const conGruppi = gruppi.length > 0 && quotaSales.every((n) => gruppoDi(n));
  const totaleGruppo = (g: string) =>
    quotaSales.filter((n) => gruppoDi(n) === g).reduce((s, n) => s + (aQuote[n] ?? 0), 0);
  const totQuoteGruppi = gruppi.reduce((s, g) => s + (aQuotaGruppo[g] ?? 0), 0);
  const totQuote = quotaSales.reduce((s, nome) => s + (aQuote[nome] ?? 0), 0);
  // Con i gruppi ognuno è una distribuzione a sé: le percentuali individuali si sommano a 100
  // dentro il gruppo, e le quote dei gruppi si sommano a 100 fra loro.
  const quoteValide = aAzione !== "weighted_distribution"
    || (aModo !== "percentage" ? totQuote > 0
        : conGruppi
          ? gruppi.every((g) => totaleGruppo(g) === 100) && totQuoteGruppi === 100
          : totQuote === 100);

  const assegnatiDi = (nome: string) => {
    const v = attivi.find((a) => a.nome === nome);
    return v ? (conta[v.id] ?? 0) : 0;
  };
  const totAssegnati = quotaSales.reduce((s2, n) => s2 + assegnatiDi(n), 0);

  /** Azzera i contatori: senza nomi li azzera tutti. Serve a far ripartire un lancio da zero. */
  const azzera = async (nomi?: string[]) => {
    if (!autom?.id) return;
    const ids = (nomi ?? []).map((n) => attivi.find((a) => a.nome === n)?.id).filter(Boolean) as string[];
    if (nomi && ids.length === 0) return;
    const testo = nomi ? `Azzerare il contatore di ${nomi.join(", ")}?` : "Azzerare i contatori di tutti i venditori?";
    if (!confirm(testo)) return;
    const res = await azzeraContatori(autom.id, ids);
    if (res?.error) { toast.error(res.error); return; }
    setConta(res.counts ?? {});
    toast.success(nomi ? "Contatore azzerato" : "Contatori azzerati");
  };

  const dividiEqua = () => {
    const n = quotaSales.length;
    if (!n) return;
    if (aModo === "percentage") {
      // 100 non è divisibile per ogni numero di venditori: il resto va distribuito un punto
      // per volta, altrimenti finisce tutto sul primo (13 venditori: 16% lui, 7% gli altri).
      const q: Record<string, number> = {};
      const insiemi = conGruppi ? gruppi.map((g) => quotaSales.filter((x) => gruppoDi(x) === g)) : [quotaSales];
      for (const dentro of insiemi) {
        const b = Math.floor(100 / dentro.length), r = 100 - b * dentro.length;
        dentro.forEach((x, i) => { q[x] = b + (i < r ? 1 : 0); });
      }
      setAQuote(q);
    } else {
      setAQuote(Object.fromEntries(quotaSales.map((nome) => [nome, aQuote[nome] ?? 50])));
    }
  };

  const salvaAutomazione = async (): Promise<string | undefined> => {
    const cond = aFonti.split(",").map((s) => s.trim()).filter(Boolean);
    if (cond.length === 0) { toast.error("Indica la fonte che attiva l'assegnazione"); return; }
    if (aAzione === "assign_to_seller" && !aTargetSeller) { toast.error("Scegli il venditore a cui assegnare"); return; }
    if (!quoteValide) {
      toast.error(daSistemare(3) ?? "Quote non valide");
      return;
    }
    const dist = aAzione === "weighted_distribution"
      ? quotaSales.map((nome) => {
          const v = attivi.find((a) => a.nome === nome);
          const q = aQuote[nome] ?? 0;
          return v ? { venditore_id: v.id, weight: aModo === "percentage" ? q : null, count_target: aModo === "count" ? q : null, cap: aCap[nome] ?? null, paused: !!aPausa[nome], gruppo: aGruppo[nome] ?? "", gruppo_weight: aQuotaGruppo[aGruppo[nome] ?? ""] ?? 0 } : null;
        }).filter(Boolean)
      : [];
    const payload: any = {
      nome: `Assegnazione ${form.nome || value.nome}`.trim(),
      attivo: autoOn,
      trigger_when: aTrigger,
      trigger_field: "ultima_fonte",
      condition_type: aCondTipo,
      condition_value: cond,
      trigger_sources: aEscl.split(",").map((x) => x.trim()).filter(Boolean),
      action_type: aAzione,
      target_seller_id: aAzione === "assign_to_seller" ? aTargetSeller : null,
      use_previous_seller_first: aAzione === "weighted_distribution" ? aPrevFirst : false,
      distribution_enabled: aAzione === "weighted_distribution",
      distribution_mode: aAzione === "weighted_distribution" ? aModo : null,
      distribution_config: dist,
      sheets_tab_name: form.lead_tab.trim() || null,
      campagna: (form.campagna ?? "").trim() || null,
      webhook_enabled: aWebhook,
      lock_period_days: aLockOn ? aLockDays : null,
      excluded_sellers: aEsclusi,
    };
    try {
      if (autom) { await updateAutomation(autom.id, payload); await setCoda(autom.id, aCoda); return autom.id; }
      const maxP = Math.max(...automations.map((a) => a.priority ?? 0), 0);
      const created: any = await createAutomation({ ...payload, priority: maxP + 1 });
      if (created?.id) await setCoda(created.id, aCoda);
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
    const ko = primoProblema();
    if (ko >= 0) {
      setStep(ko);
      return toast.error(daSistemare(ko) ?? "Configurazione incompleta");
    }
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
      if (!ok) return;

      // Alzando i tetti (o togliendo una pausa) i lead rimasti liberi possono rientrare:
      // invece di lasciarli fermi in silenzio si propone di distribuirli subito.
      if (automazione_id) {
        try {
          const a = await anteprimaLiberi(market, automazione_id);
          if (a.assegnabili > 0) { setLiberi(a); return; }
        } catch { /* la proposta è un extra, non blocca il salvataggio */ }
      }
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  // ── passi del wizard ──
  const STEPS = [
    { k: "base", label: "Lancio", icon: Rocket },
    { k: "sales", label: "Venditori", icon: Users },
    { k: "dati", label: "Dati", icon: FileSpreadsheet },
    { k: "auto", label: "Assegnazione", icon: Zap },
    { k: "wa", label: "WhatsApp", icon: MessageCircle },
  ];
  const ultimo = step === STEPS.length - 1;

  /** Cosa manca su un passo, in una frase. Null se è a posto. */
  const daSistemare = (i: number): string | null => {
    if (i === 0 && !form.nome.trim()) return "Manca il nome del lancio";
    if (i === 2 && !form.lead_tab.trim()) return "Manca il tab dei lead";
    if (i === 3 && autoOn && aFonti.trim() && !quoteValide) {
      if (aModo !== "percentage") return "Mancano le quote dei venditori";
      if (conGruppi) {
        if (totQuoteGruppi !== 100) return `Le quote dei gruppi sommano a ${totQuoteGruppi}% invece di 100`;
        const rotto = gruppi.find((g) => totaleGruppo(g) !== 100);
        return `Nel gruppo ${rotto} le percentuali sommano a ${totaleGruppo(rotto!)}% invece di 100`;
      }
      return `Le percentuali sommano a ${totQuote}% invece di 100`;
    }
    return null;
  };
  const primoProblema = () => STEPS.findIndex((_, i) => daSistemare(i) !== null);

  const avanti = () => setStep((n) => Math.min(STEPS.length - 1, n + 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto top-[5vh] translate-y-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            {value.id ? "Configura lancio" : "Nuovo lancio"}
            {form.nome && <span className="text-muted-foreground font-normal text-[14px]">· {form.nome}</span>}
          </DialogTitle>
          {/* passi liberi: si salta dove serve senza rifare tutto il giro. Le cose incomplete
              restano segnalate sul passo, e vengono ricontrollate al salvataggio. */}
          <div className="flex items-center gap-1">
            {STEPS.map((st, i) => {
              const Icon = st.icon;
              const cur = i === step;
              const problema = daSistemare(i);
              return (
                <button key={st.k} type="button" onClick={() => setStep(i)} title={problema || st.label}
                  className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11.5px] transition-colors ${
                    cur ? "bg-primary/15 text-primary font-semibold" : "text-foreground/70 hover:bg-secondary"}`}>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${problema ? "text-amber-400" : ""}`} />
                  <span className="truncate">{st.label}</span>
                  {problema && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="min-h-[330px]">
          {/* 1 — nome */}
          {step === 0 && (
          <Sez desc="Il nome identifica il lancio nella pagina Lanci e nei report.">
          <div>
            <Label>Nome del lancio</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="es. Workshop Set26" />
          </div>
          </Sez>
          )}

          {/* 2 — venditori */}
          {step === 1 && (
          <Sez desc={`Chi lavora ai lead di questo lancio. ${sales.length ? `${sales.length} selezionati` : "Nessuna selezione = tutti gli attivi."}`}>
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
          )}

          {/* 3 — fogli */}
          {step === 2 && (
          <Sez desc="Nomi esatti dei tab nei fogli dei venditori: se non combaciano, per quel venditore i dati non vengono letti.">
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
          )}

          {/* 4 — automazione */}
          {step === 3 && (
          <Sez>
            {/* Testata della regola: nome e interruttore insieme, invece di una riga di testo
                sopra e uno switch sciolto sotto. */}
            <div className={`rounded-lg border p-3 mb-3 ${autoOn ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"}`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Switch checked={autoOn} onCheckedChange={setAutoOn} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">
                    {autom ? autom.nome : `Assegnazione ${form.nome || "del lancio"}`}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {!autoOn
                      ? "Regola spenta: i lead di questo lancio li assegni a mano"
                      : autom
                        ? "Regola esistente · la stessa che vedi in Impostazioni → Automazioni"
                        : "Verrà creata al salvataggio · comparirà anche in Impostazioni → Automazioni"}
                  </div>
                </div>
              </div>
            </div>

            <div className={`space-y-4 ${autoOn ? "" : "opacity-50 pointer-events-none"}`}>
              {/* ── Quando scatta ── */}
              <div>
                <div className="label-eyebrow pb-1.5">Quando scatta</div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-muted-foreground w-[92px] shrink-0">Al momento di</span>
                    <Select value={aTrigger} onValueChange={(v) => setATrigger(v as any)}>
                      <SelectTrigger className="h-8 text-[12.5px] flex-1 min-w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_lead">Nuovo lead</SelectItem>
                        <SelectItem value="duplicate_different_source">Lead duplicato da fonte diversa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-muted-foreground w-[92px] shrink-0">Se la fonte</span>
                    <Select value={aCondTipo} onValueChange={(v) => setACondTipo(v as any)}>
                      <SelectTrigger className="h-8 w-[128px] text-[12.5px] shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">contiene</SelectItem>
                        <SelectItem value="not_contains">non contiene</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-[12.5px] flex-1 min-w-[150px]" value={aFonti}
                      onChange={(e) => setAFonti(e.target.value)} placeholder="es. workshop_set26" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-muted-foreground w-[92px] shrink-0">…ma non se</span>
                    <span className="text-[12px] text-muted-foreground/70 w-[128px] shrink-0 pl-1">contiene</span>
                    <Input className="h-8 text-[12.5px] flex-1 min-w-[150px]" value={aEscl}
                      onChange={(e) => setAEscl(e.target.value)} placeholder="niente escluso" />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Più valori separati da virgola: basta che ne corrisponda uno. Le esclusioni vincono sulla condizione.
                  </p>

                  {(conflitti.length > 0) && (
                    <div className="border-t border-border pt-2 space-y-1">
                      {conflitti.some((c) => !c.innocuo) ? (
                        <>
                          <div className="flex items-center gap-1.5 text-amber-400 text-[12px] font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {conflitti.filter((c) => !c.innocuo).length} regola/e attive si contendono questi lead
                          </div>
                          {conflitti.filter((c) => !c.innocuo).map((c, i) => (
                            <p key={i} className="text-[11.5px] text-muted-foreground pl-5">
                              <b className="text-foreground">{c.automazione}</b> {c.motivo}
                              {c.priorityMinore ? <span className="text-amber-400"> · scatta prima di questa</span> : " · questa scatta prima"}
                            </p>
                          ))}
                        </>
                      ) : (
                        <div className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-px" />
                          <span>
                            Nessuna contesa.{" "}
                            {conflitti.filter((c) => c.innocuo).map((c) => `${c.automazione} ${c.motivo}`).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── A chi va ── */}
              <div className="label-eyebrow pb-1.5">A chi va</div>
              <div>
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
                      {delLancio.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
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
                          <span className="text-[12px] text-muted-foreground">
                            Venditori da non riprendere mai{aEsclusi.length ? ` (${aEsclusi.length})` : ""}
                            {!form.sales?.length && <span className="text-amber-400"> — nessun venditore scelto nel passo Venditori, qui ci sono tutti gli attivi</span>}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {delLancio.map((v) => (
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
                        {aModo !== "percentage" ? `totale ${totQuote} lead`
                          : conGruppi
                            ? `gruppi ${totQuoteGruppi}% · ${gruppi.map((g) => `${g} ${totaleGruppo(g)}%`).join(" · ")}`
                            : `totale ${totQuote}%`}
                      </span>
                      <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={dividiEqua}>Dividi equamente</Button>
                      {autom?.id && totAssegnati > 0 && (
                        <Button size="sm" variant="outline" className="h-6 text-[11px] text-destructive" onClick={() => azzera()}>
                          Azzera contatori ({totAssegnati})
                        </Button>
                      )}
                    </div>
                  </div>
                  {gruppi.length > 0 && (
                    <div className="rounded-md border border-border bg-secondary/20 p-2.5 space-y-1.5">
                      <div className="label-eyebrow">Quota di ogni gruppo sul totale dei lead</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {gruppi.map((g) => (
                          <div key={g} className="flex items-center gap-1.5">
                            <span className="text-[12px]">{g}</span>
                            <Input type="number" className="h-7 w-[64px] text-[12px]"
                              value={aQuotaGruppo[g] ?? ""}
                              onChange={(e) => setAQuotaGruppo((p) => ({ ...p, [g]: parseInt(e.target.value, 10) || 0 }))} />
                            <span className="text-[11.5px] text-muted-foreground">%</span>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => {
                            const n = gruppi.length;
                            const b = Math.floor(100 / n), r = 100 - b * n;
                            setAQuotaGruppo(Object.fromEntries(gruppi.map((g, i) => [g, b + (i < r ? 1 : 0)])));
                          }}>Dividi fra i gruppi</Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Su 10 lead, {gruppi.map((g) => `${Math.round((aQuotaGruppo[g] ?? 0) / 10)} a ${g}`).join(" e ")}.
                        {aModo === "percentage"
                          ? " Dentro il gruppo si dividono secondo le percentuali della tabella qui sotto."
                          : " Dentro il gruppo si alternano finché ognuno non ha raggiunto la sua quota: le quote decidono i totali, questa ripartizione il ritmo."}
                        {!conGruppi && <span className="text-amber-400"> Alcuni venditori non hanno un gruppo: finché è così i gruppi vengono ignorati.</span>}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    <div className="flex items-center gap-2 pb-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                      <span className="flex-1">Venditore</span>
                      <span className="w-[104px] text-center">Gruppo</span>
                      <span className="w-[80px] text-right">{aModo === "percentage" ? "Quota %" : "Quota lead"}</span>
                      {aModo === "percentage" && <span className="w-[86px] text-right">Tetto max</span>}
                    </div>
                    {quotaSales.map((nome) => (
                      <div key={nome} className="flex items-center gap-2">
                        <button type="button" title={aPausa[nome] ? "In pausa: non riceve lead. Clicca per riattivare" : "Sospendi la distribuzione per questo venditore"}
                          onClick={() => setAPausa((p) => ({ ...p, [nome]: !p[nome] }))}
                          className={`shrink-0 h-5 w-5 rounded-full border grid place-items-center text-[10px] ${
                            aPausa[nome] ? "border-destructive bg-destructive/20 text-destructive" : "border-border text-muted-foreground/50 hover:text-foreground"}`}>
                          {aPausa[nome] ? "❚❚" : "▶"}
                        </button>
                        <span className={`flex-1 text-[12px] truncate ${aPausa[nome] ? "text-destructive line-through" : ""}`}>{nome}</span>
                        {autom?.id && (
                          <button type="button" title="Lead già assegnati — clicca per azzerare"
                            onClick={() => azzera([nome])}
                            className={`w-[52px] shrink-0 text-right text-[11.5px] num tabular-nums ${
                              assegnatiDi(nome) > 0 ? "text-foreground/80 hover:text-destructive" : "text-muted-foreground/40"}`}>
                            {assegnatiDi(nome)}
                          </button>
                        )}
                        <Select value={gruppoDi(nome) || "__no__"}
                          onValueChange={(v) => {
                            if (v === "__new__") {
                              const g = window.prompt("Nome del gruppo (es. Closer, Setter)")?.trim();
                              if (g) { setAGruppo((p) => ({ ...p, [nome]: g })); setAQuotaGruppo((p) => ({ ...p, [g]: p[g] ?? 0 })); }
                              return;
                            }
                            setAGruppo((p) => ({ ...p, [nome]: v === "__no__" ? "" : v }));
                          }}>
                          <SelectTrigger className="h-7 w-[104px] text-[11.5px] px-2 shrink-0"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__no__">nessuno</SelectItem>
                            {gruppi.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            <SelectItem value="__new__">+ nuovo gruppo…</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" className="h-7 w-[80px] text-[12px]" value={aQuote[nome] ?? ""}
                          onChange={(e) => setAQuote((q) => ({ ...q, [nome]: parseInt(e.target.value, 10) || 0 }))} />
                        {aModo === "percentage" && (
                          <Input type="number" className="h-7 w-[86px] text-[12px]" placeholder="nessuno" value={aCap[nome] ?? ""}
                            onChange={(e) => setACap((c) => {
                              const v = parseInt(e.target.value, 10);
                              const next = { ...c };
                              if (isNaN(v) || v <= 0) delete next[nome]; else next[nome] = v;
                              return next;
                            })} />
                        )}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      {aModo === "percentage"
                        ? "Tetto max: oltre quel numero di lead il venditore viene saltato e i lead vanno agli altri. Lascia vuoto per nessun limite."
                        : "In quota assoluta il numero è già il limite: raggiunta la quota il venditore esce dalla distribuzione, quindi non serve un tetto separato."}
                      {autom?.id && " La colonna in mezzo sono i lead già assegnati: cliccala per azzerare quel venditore."}
                      {" "}Il tasto a sinistra del nome sospende un singolo venditore: i suoi lead vanno agli altri e la sua percentuale resta lì per quando riparte.
                      {" "}Gruppo: serve a dare a closer e setter una quota diversa dei lead. La quota del gruppo decide quanti lead gli arrivano, la percentuale nella tabella come se li dividono fra loro.
                    </p>
                    {quotaSales.length === 0 && <p className="text-[12px] text-muted-foreground">Seleziona prima i venditori del lancio.</p>}
                  </div>
                </div>
              )}

              {/* Tab e campagna sono già stati indicati nel passo Dati: qui si mostrano soltanto,
                  così non possono divergere da quelli che la matrice legge davvero. */}
              <div className="label-eyebrow pt-1 pb-1.5">Dove finisce</div>
              <div className="rounded-md border border-border bg-secondary/30 p-2.5 text-[11.5px] space-y-0.5">
                <div>
                  <span className="text-muted-foreground">Scrive i lead assegnati nel tab </span>
                  {form.lead_tab
                    ? <b className="text-foreground/85">{form.lead_tab}</b>
                    : <span className="text-amber-400">non impostato — vai al passo Dati</span>}
                </div>
                <div>
                  <span className="text-muted-foreground">Campagna scritta sul lead: </span>
                  {form.campagna
                    ? <b className="text-foreground/85">{form.campagna}</b>
                    : <span className="text-muted-foreground">nessuna</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={aWebhook} onCheckedChange={setAWebhook} />
                <span className="text-[12.5px]">Invia i lead assegnati al webhook configurato</span>
              </div>

              {/* Sezione a sé: non è configurazione del lancio ma una leva da usare a lancio
                  partito, quindi sta in fondo e si distingue dal resto. */}
              <div className="pt-2 mt-1 border-t border-border">
                <div className="label-eyebrow pb-1.5 text-destructive/80">Sospensione temporanea</div>
                {/* Rosso tenue da spenta, rosso pieno da accesa: ferma il flusso dei lead,
                    deve saltare all'occhio se e rimasta attiva. */}
                <div className={`rounded-md border p-3 transition-colors ${
                  aCoda ? "border-destructive bg-destructive/15" : "border-destructive/25 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Switch checked={aCoda} onCheckedChange={setACoda}
                      className="data-[state=checked]:bg-destructive" />
                    <span className={`text-[12.5px] font-medium ${aCoda ? "text-destructive" : ""}`}>
                      Metti i lead nuovi in coda (Round Robin)
                    </span>
                    {aCoda && (
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold">
                        ATTIVA — nessun lead nuovo viene distribuito
                      </span>
                    )}
                  </div>
                  {inCoda > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mt-2.5 pl-9">
                      <span className="text-[11.5px]">
                        <b>{inCoda}</b> lead di questo lancio fermi in coda
                      </span>
                      <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={aCoda || recupero}
                        title={aCoda ? "Spegni prima la sospensione, altrimenti tornerebbero subito in coda" : "Rimettili nel giro delle automazioni"}
                        onClick={async () => {
                          if (!confirm(`Distribuire ora i ${inCoda} lead in coda?`)) return;
                          setRecupero(true);
                          try {
                            const r = await recuperaCoda(market, autom?.id);
                            if (r?.error) toast.error(r.error);
                            else {
                              toast.success(`${r.assegnati} lead distribuiti${r.ancora_in_coda ? `, ${r.ancora_in_coda} ancora in coda` : ""}`);
                              setInCoda(await contaInCoda(market, autom?.id));
                            }
                          } finally { setRecupero(false); }
                        }}>
                        {recupero ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                        Distribuiscili ora
                      </Button>
                      {aCoda && <span className="text-[10.5px] text-muted-foreground">spegni prima la sospensione</span>}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1.5 pl-9">
                    {aCoda
                      ? "I lead nuovi non vengono distribuiti: entrano come assegnati al venditore \u201cRound Robin\u201d e restano in attesa. Passa solo chi era già stato assegnato entro il periodo impostato sopra, che torna al suo venditore e gli scala il tetto come una normale assegnazione."
                      : "Da usare a lancio partito, quando i venditori sono indietro con la lavorazione e non vuoi continuare a caricarli anche se il tetto non è ancora pieno. Percentuali, tetti e contatori restano dove sono: spegnendola l\u2019assegnazione riprende da dov\u2019era."}
                  </p>
                </div>
              </div>
            </div>
          </Sez>
          )}

          {/* 5 — whatsapp */}
          {step === 4 && (
          <Sez desc="Il link porta il lead sulla chat del venditore assegnato e traccia le chat aperte.">
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
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => step === 0 ? onOpenChange(false) : setStep((n) => n - 1)}>
            {step === 0 ? "Annulla" : "Indietro"}
          </Button>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Passo {step + 1} di {STEPS.length}</span>
            {!ultimo && <Button variant="outline" onClick={avanti}>Avanti</Button>}
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} {value.id ? "Salva lancio" : "Crea lancio"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {liberi && (
        <Dialog open onOpenChange={() => { setLiberi(null); onOpenChange(false); }}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-[15px]">Ci sono lead liberi da assegnare</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-[12.5px] text-muted-foreground">
                <b className="text-foreground">{liberi.trovati}</b> lead con la fonte di questo lancio sono rimasti
                senza venditore perché i tetti erano pieni. Con i limiti attuali ne rientrerebbero{" "}
                <b className="text-foreground">{liberi.assegnabili}</b>.
              </p>
              <div className="rounded-md border border-border bg-secondary/30 p-2.5 space-y-1">
                <div className="label-eyebrow pb-0.5">Come verrebbero distribuiti</div>
                {Object.entries(liberi.ripartizione).sort((a, b) => b[1] - a[1]).map(([nome, n]) => (
                  <div key={nome} className="flex justify-between text-[12px]">
                    <span className="truncate">{nome}</span>
                    <span className="num font-medium">{n}</span>
                  </div>
                ))}
              </div>
              {liberi.assegnabili < liberi.trovati && (
                <p className="text-[11px] text-amber-400">
                  {liberi.trovati - liberi.assegnabili} resterebbero comunque liberi: i tetti finiscono prima.
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => { setLiberi(null); onOpenChange(false); }}>
                Lasciali liberi
              </Button>
              <Button disabled={recupero} onClick={async () => {
                setRecupero(true);
                try {
                  const r = await assegnaLiberi(market, form.automazione_id ?? "");
                  toast.success(`${r.assegnati ?? 0} lead assegnati`);
                } finally {
                  setRecupero(false); setLiberi(null); onOpenChange(false);
                }
              }}>
                {recupero && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Assegnali ora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default LancioConfigDialog;
