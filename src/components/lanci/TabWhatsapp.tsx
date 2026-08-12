import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Copy, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { LancioConfig, LancioRow } from "@/lib/lanci/config";
import { fetchClickStats, TemplateWa } from "@/lib/lanci/integrazioni";
import { fetchTemplates } from "@/lib/whatsapp/templates";

const n = (v: number) => Math.round(v).toLocaleString("it-IT");
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");

interface Props { lancio: LancioConfig; rows: LancioRow[]; market: string; onChange?: () => void }

/** Contatto WhatsApp del lancio: link, click tracciati e passaggio lead → contatto → call. */
const TabWhatsapp = ({ lancio, rows }: Props) => {
  const [tpl, setTpl] = useState<TemplateWa | null>(null);
  const [all, setAll] = useState<TemplateWa[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchClickStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    setLoading(true);
    const list = (await fetchTemplates()) as TemplateWa[];
    setAll(list);
    const t = lancio.whatsapp_slug ? list.find((x) => x.slug === lancio.whatsapp_slug) ?? null : null;
    setTpl(t);
    setStats(t ? await fetchClickStats(t.slug) : null);
    setLoading(false);
  }, [lancio.whatsapp_slug]);
  useEffect(() => { load(); }, [load]);




  const link = tpl ? `${baseUrl}/wa/${tpl.slug}` : "";
  const clickOf = (venditore: string) => stats?.perSales.find((s) => s.venditore === venditore)?.click ?? 0;
  const totLead = rows.reduce((s, r) => s + r.tot_lead, 0);
  const totCall = rows.reduce((s, r) => s + r.call_totali, 0);

  if (loading) return <div className="py-12 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {/* Link del lancio */}
      <Card>
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> Link WhatsApp del lancio</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              {tpl && (
                <>
                  <Button size="sm" variant="outline" className="h-7"
                    onClick={() => { navigator.clipboard.writeText(`${link}?email={{email}}&nome={{nome}}&telefono={{telefono}}`); toast.success("Link copiato"); }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copia
                  </Button>
                  <a href={`${link}?email=test@example.com&nome=Test`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7" title="Prova il link"><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </a>
                </>
              )}
              <span className="text-[11px] text-muted-foreground">sola lettura · si configura in Impostazioni</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tpl ? (
            <div className="flex gap-2.5 items-start px-3.5 py-3 bg-amber-500/10 border-l-[3px] border-amber-500 text-[12.5px]">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>Nessun link collegato: non puoi vedere quanti lead hanno aperto la chat col venditore.
                Collega o crea il link da <b>Impostazioni → Lanci</b>, poi mettilo nel bottone WhatsApp della thank-you page.</div>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px] p-3.5">
              <dt className="text-muted-foreground">Link</dt>
              <dd><code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[11.5px]">{link}</code>
                {!tpl.attivo && <span className="text-amber-400 ml-2">disattivato</span>}</dd>
              <dt className="text-muted-foreground">Messaggio</dt>
              <dd className="italic text-muted-foreground">"{tpl.messaggio_template}"</dd>
              <dt className="text-muted-foreground">Fallback</dt>
              <dd>{tpl.fallback_phone
                ? <span className="text-emerald-400">{tpl.fallback_phone}</span>
                : <span className="text-amber-400">nessuno — se il lead non ha venditore vedrà un errore</span>}</dd>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* KPI contatto */}
      {tpl && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { k: "Chat aperte", v: n(stats.totale), s: `${n(stats.ok)} ok · ${n(stats.errori)} errori` },
            { k: "Tasso contatto", v: pct(stats.ok, totLead), s: `su ${n(totLead)} lead assegnati` },
            { k: "Contatto → call", v: pct(totCall, stats.ok), s: `${n(totCall)} call` },
            { k: "Ultimo click", v: stats.ultimi[0] ? new Date(stats.ultimi[0].clicked_at).toLocaleDateString("it-IT") : "—", s: stats.ultimi[0]?.venditore_nome ?? "" },
          ].map((c) => (
            <div key={c.k} className="rounded-xl border border-border bg-card p-3 border-t-2 border-t-emerald-500">
              <div className="label-eyebrow">{c.k}</div>
              <div className="text-lg font-bold num tracking-tight">{c.v}</div>
              <div className="text-[10.5px] text-muted-foreground">{c.s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Da dove arrivano i click */}
      {stats && stats.totale > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 border-b border-border">
            <CardTitle className="label-eyebrow flex items-center justify-between gap-2 flex-wrap">
              <span>Da dove cliccano</span>
              {stats.senza_origine > 0 && (
                <span className="text-[10.5px] text-muted-foreground normal-case tracking-normal">
                  {n(stats.senza_origine)} senza provenienza
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 space-y-1.5">
            {stats.perOrigine.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Nessuna provenienza registrata: il browser la manda solo se il link ha
                <code className="px-1 mx-1 rounded bg-secondary text-[11px]">referrerpolicy="unsafe-url"</code>,
                altrimenti fra domini diversi resta nascosta.
              </p>
            ) : stats.perOrigine.slice(0, 8).map((o) => (
              <div key={o.origine} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[12px] truncate" title={o.origine}>{o.origine}</span>
                <div className="w-[38%] h-2 rounded bg-secondary/50 overflow-hidden shrink-0">
                  <i className="block h-full rounded bg-emerald-500/70"
                    style={{ width: `${(o.n / stats.perOrigine[0].n) * 100}%` }} />
                </div>
                <span className="w-[70px] text-right text-[11.5px] num shrink-0">
                  {n(o.n)} <span className="text-muted-foreground">{pct(o.n, stats.totale)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Funnel per sales */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between">
            <span>Lead → chat aperte → call, per sales</span>
            <span className="text-primary">{stats ? `${n(stats.totale)} click` : "0 click"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[52vh]">
          <table className="w-full text-[12.5px]">
            <thead><tr>
              <th className="table-header-cell text-left sticky top-0 bg-card">Sales</th>
              <th className="table-header-cell text-right sticky top-0 bg-card">Lead assegnati</th>
              <th className="table-header-cell text-right sticky top-0 bg-card">Chat aperte</th>
              <th className="table-header-cell text-right sticky top-0 bg-card">Tasso contatto</th>
              <th className="table-header-cell text-right sticky top-0 bg-card">Call</th>
              <th className="table-header-cell text-right sticky top-0 bg-card">Contatto → call</th>
            </tr></thead>
            <tbody>
              {[...rows].sort((a, b) => b.tot_lead - a.tot_lead).map((r) => {
                const c = clickOf(r.venditore);
                return (
                  <tr key={r.venditore}>
                    <td className="table-body-cell font-medium">{r.venditore}</td>
                    <td className="table-body-cell text-right num">{n(r.tot_lead)}</td>
                    <td className={`table-body-cell text-right num ${c === 0 ? "text-muted-foreground/40" : ""}`}>{n(c)}</td>
                    <td className="table-body-cell text-right num text-muted-foreground">{c ? pct(c, r.tot_lead) : "—"}</td>
                    <td className="table-body-cell text-right num">{n(r.call_totali)}</td>
                    <td className="table-body-cell text-right num text-muted-foreground">{c ? pct(r.call_totali, c) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!stats || stats.totale === 0) && (
            <p className="py-4 px-4 text-center text-[12px] text-muted-foreground border-t border-border">
              Nessun click registrato: le colonne si popolano appena il link viene usato nella thank-you page.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ultimi click */}
      {stats && stats.ultimi.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 border-b border-border">
            <CardTitle className="label-eyebrow">Ultimi click</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[38vh]">
            <table className="w-full text-[12px]">
              <thead><tr>
                <th className="table-header-cell text-left sticky top-0 bg-card">Quando</th>
                <th className="table-header-cell text-left sticky top-0 bg-card">Lead</th>
                <th className="table-header-cell text-left sticky top-0 bg-card">Venditore</th>
                <th className="table-header-cell text-left sticky top-0 bg-card">Esito</th>
              </tr></thead>
              <tbody>
                {stats.ultimi.map((c, i) => (
                  <tr key={i}>
                    <td className="table-body-cell whitespace-nowrap text-muted-foreground">{new Date(c.clicked_at).toLocaleString("it-IT")}</td>
                    <td className="table-body-cell">{c.lead_nome || c.lead_email || "—"}</td>
                    <td className="table-body-cell">{c.venditore_nome || "—"}</td>
                    <td className={`table-body-cell ${c.status === "ok" ? "text-emerald-400" : c.status === "fallback" ? "text-amber-400" : "text-red-400"}`}>
                      {c.status}{c.error_reason ? ` · ${c.error_reason}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default TabWhatsapp;
