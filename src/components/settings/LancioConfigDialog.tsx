import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Phone, Zap, MessageCircle, Link2 } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { useAutomationsData } from "@/hooks/useAutomationsData";
import { AutomationSettings } from "@/components/automation/AutomationSettings";
import WhatsAppTemplatesSection from "@/components/settings/WhatsAppTemplatesSection";
import { fetchTemplates } from "@/lib/whatsapp/templates";
import { LancioConfig } from "@/lib/lanci/config";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: LancioConfig;
  onSave: (cfg: LancioConfig) => Promise<boolean>;
  esistenti: string[];   // id già usati, per evitare duplicati
}

/**
 * Configurazione di un lancio in 4 schede.
 * Automazioni e WhatsApp incorporano gli STESSI componenti delle rispettive sezioni di
 * Impostazioni: si può creare da qui o da lì, il risultato è identico. In cima resta il
 * selettore che decide quale regola/link è collegato a questo lancio.
 */
const LancioConfigDialog = ({ open, onOpenChange, value, onSave, esistenti }: Props) => {
  const { venditori } = useSalespeopleData();
  const { automations } = useAutomationsData();
  const [form, setForm] = useState<LancioConfig>(value);
  const [wa, setWa] = useState<{ slug: string; nome: string; click_count: number }[]>([]);
  const [tab, setTab] = useState("lead");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(value); setTab("lead"); } }, [open, value]);
  const loadWa = () => fetchTemplates().then((t) => setWa(t as any));
  useEffect(() => { if (open) loadWa(); }, [open]);

  const nomi = venditori.map((v) => `${v.nome} ${v.cognome || ""}`.trim());
  const toggle = (campo: "lead_sales" | "call_sales", nome: string) =>
    setForm((f) => {
      const cur = f[campo] ?? [];
      return { ...f, [campo]: cur.includes(nome) ? cur.filter((x) => x !== nome) : [...cur, nome] };
    });
  const setAll = (campo: "lead_sales" | "call_sales", all: boolean) =>
    setForm((f) => ({ ...f, [campo]: all ? [...nomi] : [] }));

  const SalesPicker = ({ campo }: { campo: "lead_sales" | "call_sales" }) => {
    const sel = form[campo] ?? [];
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Venditori inclusi <span className="text-muted-foreground font-normal">({sel.length || "tutti"})</span></Label>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setAll(campo, true)}>Tutti</Button>
            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setAll(campo, false)}>Nessuno</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-[190px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
          {nomi.map((nome) => (
            <button key={nome} type="button" onClick={() => toggle(campo, nome)}
              className={`px-2 py-0.5 rounded-full border text-[11.5px] ${sel.includes(nome)
                ? "border-primary bg-primary/15 text-primary font-medium" : "border-border bg-card text-muted-foreground"}`}>
              {nome}
            </button>
          ))}
        </div>
        {sel.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">Nessuna selezione = tutti i venditori attivi.</p>}
      </div>
    );
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return toast.error("Il nome del lancio è obbligatorio");
    const id = form.id || form.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    if (!value.id && esistenti.includes(id)) return toast.error("Esiste già un lancio con questo nome");
    setSaving(true);
    const ok = await onSave({ ...form, id, nome: form.nome.trim() });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {value.id ? "Configura lancio" : "Nuovo lancio"}
            <Input className="h-8 w-[260px] text-[13px]" value={form.nome} placeholder="Nome del lancio (es. Workshop Set26)"
              onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 bg-secondary/60">
            <TabsTrigger value="lead" className="text-[12.5px]"><Users className="h-3.5 w-3.5 mr-1.5" /> Lead</TabsTrigger>
            <TabsTrigger value="call" className="text-[12.5px]"><Phone className="h-3.5 w-3.5 mr-1.5" /> Call</TabsTrigger>
            <TabsTrigger value="automazioni" className="text-[12.5px]"><Zap className="h-3.5 w-3.5 mr-1.5" /> Automazioni</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-[12.5px]"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp</TabsTrigger>
          </TabsList>

          {/* ── LEAD ── */}
          <TabsContent value="lead" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome del tab lead nei fogli sales</Label>
                <Input value={form.lead_tab} onChange={(e) => setForm({ ...form, lead_tab: e.target.value })}
                  placeholder="es. Lead Workshop_Giu26" />
                <p className="text-[11px] text-muted-foreground mt-1">Nome esatto, identico nei fogli dei venditori selezionati.</p>
              </div>
              <div>
                <Label>Campagna nel database</Label>
                <Input value={form.campagna ?? ""} onChange={(e) => setForm({ ...form, campagna: e.target.value })}
                  placeholder="es. Workshop Giu26" />
                <p className="text-[11px] text-muted-foreground mt-1">Serve per lead generati, fonti e andamento giornaliero.</p>
              </div>
            </div>
            <SalesPicker campo="lead_sales" />
            <div>
              <Label>Target lead per venditore</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5 max-h-[170px] overflow-y-auto p-2 rounded-md border border-border bg-secondary/30">
                {(form.lead_sales?.length ? form.lead_sales : nomi).map((nome) => (
                  <div key={nome} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground truncate flex-1" title={nome}>{nome.split(" ")[0]}</span>
                    <Input type="number" className="h-7 w-[68px] text-[12px]" value={form.target?.[nome] ?? ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setForm((f) => {
                          const t = { ...(f.target ?? {}) };
                          if (isNaN(v)) delete t[nome]; else t[nome] = v;
                          return { ...f, target: t };
                        });
                      }} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── CALL ── */}
          <TabsContent value="call" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tab call (uno per mese, separati da virgola)</Label>
                <Input value={form.call_tabs.join(", ")}
                  onChange={(e) => setForm({ ...form, call_tabs: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="es. Giugno26 Elenco call/esito, Luglio26 Elenco call/esito" />
                <p className="text-[11px] text-muted-foreground mt-1">Nome esatto dei tab mensili nei fogli sales.</p>
              </div>
              <div>
                <Label>Provenienza delle call</Label>
                <Input value={form.provenienza} onChange={(e) => setForm({ ...form, provenienza: e.target.value })}
                  placeholder="es. 3sfere" />
                <p className="text-[11px] text-muted-foreground mt-1">Valore esatto nella colonna provenienza: solo queste call contano per il lancio.</p>
              </div>
            </div>
            <SalesPicker campo="call_sales" />
          </TabsContent>

          {/* ── AUTOMAZIONI (replica della sezione Automazioni) ── */}
          <TabsContent value="automazioni" className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <Label className="flex items-center gap-1.5 text-[12.5px]"><Link2 className="h-3.5 w-3.5" /> Regola collegata a questo lancio</Label>
              <Select value={form.automazione_id ?? "__none__"}
                onValueChange={(v) => setForm({ ...form, automazione_id: v === "__none__" ? undefined : v })}>
                <SelectTrigger className="h-8 mt-1.5 text-[12.5px]"><SelectValue placeholder="Nessuna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuna</SelectItem>
                  {automations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}{a.attivo ? "" : " (disattiva)"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Crea qui sotto la regola e poi selezionala: è la stessa lista di Impostazioni → Automazioni, si lavora indifferentemente da entrambe le parti.
              </p>
            </div>
            <AutomationSettings />
          </TabsContent>

          {/* ── WHATSAPP (replica della sezione Link WhatsApp) ── */}
          <TabsContent value="whatsapp" className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <Label className="flex items-center gap-1.5 text-[12.5px]"><Link2 className="h-3.5 w-3.5" /> Link collegato a questo lancio</Label>
              <div className="flex gap-2 items-center mt-1.5">
                <Select value={form.whatsapp_slug ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, whatsapp_slug: v === "__none__" ? undefined : v })}>
                  <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Nessuno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {wa.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.nome} · {t.click_count} click</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8" onClick={loadWa}>Ricarica</Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Crea qui sotto il link e poi selezionalo: è la stessa lista di Impostazioni → Link WhatsApp.
              </p>
            </div>
            <WhatsAppTemplatesSection />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>{value.id ? "Salva" : "Crea lancio"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LancioConfigDialog;
