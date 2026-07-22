import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Edit, Trash2, Plus, MessageCircle, ExternalLink, TrendingUp } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";

interface Template {
  id: string;
  slug: string;
  nome: string;
  messaggio_template: string;
  market: string;
  attivo: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}

const PLACEHOLDERS = [
  { k: "{{nome}}", d: "Nome (prima parola)" },
  { k: "{{nome_completo}}", d: "Nome + cognome se disponibili" },
  { k: "{{venditore}}", d: "Nome completo del venditore" },
  { k: "{{venditore_nome}}", d: "Solo nome del venditore" },
  { k: "{{fonte}}", d: "ultima_fonte del lead" },
  { k: "{{campagna}}", d: "campagna del lead" },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

const WhatsAppTemplatesSection = () => {
  const { selectedMarket } = useMarket();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({
    slug: "",
    nome: "",
    messaggio_template: "Ciao {{nome}}, grazie per esserti registrato/a! Come posso aiutarti?",
    market: selectedMarket,
    attivo: true,
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("market", selectedMarket)
      .order("created_at", { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedMarket]);

  const openNew = () => {
    setEditing(null);
    setForm({
      slug: "",
      nome: "",
      messaggio_template: "Ciao {{nome}}, grazie per esserti registrato/a! Come posso aiutarti?",
      market: selectedMarket,
      attivo: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      slug: t.slug,
      nome: t.nome,
      messaggio_template: t.messaggio_template,
      market: t.market as "IT" | "ES",
      attivo: t.attivo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.messaggio_template.trim()) {
      toast.error("Nome e messaggio obbligatori");
      return;
    }
    const slug = form.slug.trim() || slugify(form.nome);
    if (!slug) {
      toast.error("Slug non valido");
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from("whatsapp_templates")
          .update({
            slug,
            nome: form.nome.trim(),
            messaggio_template: form.messaggio_template,
            market: form.market,
            attivo: form.attivo,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Template aggiornato");
      } else {
        const { error } = await supabase.from("whatsapp_templates").insert({
          slug,
          nome: form.nome.trim(),
          messaggio_template: form.messaggio_template,
          market: form.market,
          attivo: form.attivo,
        } as any);
        if (error) throw error;
        toast.success("Template creato");
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message?.includes("duplicate") ? "Slug già esistente, cambialo" : "Errore salvataggio");
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Eliminare template "${t.nome}"?`)) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", t.id);
    if (error) toast.error("Errore eliminazione");
    else {
      toast.success("Template eliminato");
      load();
    }
  };

  const copyLink = (slug: string) => {
    const url = `${baseUrl}/wa/${slug}?email={{email}}&nome={{nome}}&telefono={{telefono}}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiato — sostituisci {{email}}, {{nome}}, {{telefono}} con i tuoi placeholder");
  };

  const insertPlaceholder = (ph: string) => {
    setForm((f) => ({ ...f, messaggio_template: f.messaggio_template + " " + ph }));
  };

  const totalClicks = templates.reduce((s, t) => s + (t.click_count || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            Link WhatsApp ({selectedMarket})
          </CardTitle>
          <CardDescription>
            Genera link personalizzati che portano i lead sul WhatsApp del venditore assegnato.
            {totalClicks > 0 && (
              <span className="ml-2 text-emerald-600 font-medium">{totalClicks} click totali</span>
            )}
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nuovo link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica link" : "Nuovo link WhatsApp"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome (uso interno)</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="es. Thank-you page Workshop Maggio"
                />
              </div>
              <div>
                <Label>Slug (usato nell'URL)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder={form.nome ? slugify(form.nome) : "es. workshop-maggio"}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se vuoto, verrà generato da: {form.nome ? slugify(form.nome) : "—"}
                </p>
              </div>
              <div>
                <Label>Messaggio (con placeholder)</Label>
                <Textarea
                  rows={5}
                  value={form.messaggio_template}
                  onChange={(e) => setForm({ ...form, messaggio_template: e.target.value })}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {PLACEHOLDERS.map((p) => (
                    <Button key={p.k} type="button" size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => insertPlaceholder(p.k)} title={p.d}>
                      {p.k}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Market</Label>
                  <Select value={form.market} onValueChange={(v) => setForm({ ...form, market: v as "IT" | "ES" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.attivo} onCheckedChange={(v) => setForm({ ...form, attivo: v })} />
                  <Label>Attivo</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleSave}>{editing ? "Salva" : "Crea"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">Nessun link WhatsApp configurato per {selectedMarket}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border bg-card/60 hover:border-border transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm truncate">{t.nome}</h4>
                      <Badge variant={t.attivo ? "default" : "secondary"} className="text-[10px] h-5">
                        {t.attivo ? "Attivo" : "Disattivo"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {t.click_count} click
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <code className="bg-muted px-1 py-0.5 rounded">{baseUrl}/wa/{t.slug}</code>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">"{t.messaggio_template}"</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => copyLink(t.slug)} title="Copia link">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`${baseUrl}/wa/${t.slug}?email=test@example.com&nome=Test`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" title="Testa link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted/40 text-[11px] text-muted-foreground space-y-2">
          <p><strong>2 modi per usarli</strong>:</p>
          <div>
            <p><strong>Metodo A — placeholder piattaforma (raccomandato):</strong></p>
            <p>Incolla nel link della thank-you page e la piattaforma sostituisce i placeholder al volo:</p>
            <code className="block bg-background/60 px-2 py-1 rounded mt-1">{baseUrl}/wa/mio-slug?email=[email]&nome=[first_name]&telefono=[phone]</code>
            <p className="mt-1">Sostituisci <code>[email]</code>, <code>[first_name]</code>, <code>[phone]</code> con le variabili della tua piattaforma (Systeme.io, Kajabi, GHL, ecc.).</p>
          </div>
          <div>
            <p><strong>Metodo B — link statico:</strong></p>
            <p>Se la thank-you page ha già email/nome/telefono nel suo URL (es. <code>?email=X&nome=Y</code>), puoi usare link statico senza query:</p>
            <code className="block bg-background/60 px-2 py-1 rounded mt-1">{baseUrl}/wa/mio-slug</code>
            <p className="mt-1">Il tool leggerà i parametri direttamente dall'URL della pagina di provenienza (<code>document.referrer</code>).</p>
          </div>
          <p className="mt-2"><strong>Nomi param supportati</strong>: <code>email</code>/<code>e-mail</code>/<code>mail</code> · <code>nome</code>/<code>name</code>/<code>first_name</code>/<code>firstname</code> · <code>telefono</code>/<code>phone</code>/<code>tel</code>/<code>cellulare</code>/<code>mobile</code> · <code>market</code> (IT/ES)</p>
          <p><strong>Placeholder nel messaggio</strong>: <code>{"{{nome}}"}</code>, <code>{"{{venditore}}"}</code>, <code>{"{{fonte}}"}</code>, <code>{"{{campagna}}"}</code></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppTemplatesSection;
