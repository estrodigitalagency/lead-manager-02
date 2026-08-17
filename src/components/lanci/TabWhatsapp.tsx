import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Copy, ExternalLink, Loader2, AlertTriangle, Smartphone, Monitor, Tablet, Bot, HelpCircle } from "lucide-react";
import { LancioConfig, LancioRow } from "@/lib/lanci/config";
import { fetchClickStats, fetchPercorso, Percorso, TemplateWa } from "@/lib/lanci/integrazioni";
import { fetchTemplates } from "@/lib/whatsapp/templates";

const n = (v: number) => Math.round(v).toLocaleString("it-IT");
/** Somma le statistiche di piu link: i totali del lancio contano tutti i pulsanti insieme. */
const sommaStat = (parti: any[]) => {
  const perSales: Record<string, any> = {};
  const perGiorno: Record<string, number> = {};
  const perOrigine: Record<string, number> = {};
  const perDisp: Record<string, number> = {};
  let totale = 0, ok = 0, errori = 0, senza = 0;
  const ultimi: any[] = [];
  for (const p of parti) {
    totale += p.totale; ok += p.ok; errori += p.errori; senza += p.senza_origine ?? 0;
    for (const d of p.perDispositivo ?? []) perDisp[d.nome] = (perDisp[d.nome] || 0) + d.n;
    for (const s of p.perSales) {
      const r = (perSales[s.venditore] ??= { venditore: s.venditore, click: 0, ok: 0, fallback: 0, errore: 0 });
      r.click += s.click; r.ok += s.ok; r.fallback += s.fallback; r.errore += s.errore;
    }
    for (const g of p.perGiorno) perGiorno[g.day] = (perGiorno[g.day] || 0) + g.n;
    for (const o of p.perOrigine ?? []) perOrigine[o.origine] = (perOrigine[o.origine] || 0) + o.n;
    ultimi.push(...p.ultimi);
  }
  return {
    totale, ok, errori, senza_origine: senza,
    perSales: Object.values(perSales).sort((a: any, b: any) => b.click - a.click),
    perGiorno: Object.keys(perGiorno).sort().map((day) => ({ day, n: perGiorno[day] })),
    perOrigine: Object.entries(perOrigine).map(([origine, n]) => ({ origine, n })).sort((a, b) => b.n - a.n),
    perDispositivo: Object.entries(perDisp).map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n),
    ultimi: ultimi.sort((a, b) => String(b.clicked_at).localeCompare(String(a.clicked_at))).slice(0, 30),
  } as any;
};

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");

/** Durata leggibile: sotto il minuto i secondi contano, sopra l'ora no. */
const durata = (sec: number | null): string => {
  if (sec === null || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`;
  return `${Math.round(sec / 86400)} g`;
};

const quando = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Da cosa hanno aperto il link. "Automatiche" non sono persone: anteprime dei link, antivirus,
 * scanner. Restano visibili invece di sparire, perché sapere che ci sono cambia come si legge
 * il tasso di click — e sapere che non ci sono vale altrettanto.
 */
const DISPOSITIVO: Record<string, { t: string; c: string }> = {
  mobile: { t: "Da telefono", c: "hsl(142 71% 55%)" },
  desktop: { t: "Da computer", c: "hsl(232 100% 74%)" },
  tablet: { t: "Da tablet", c: "hsl(174 62% 55%)" },
  automatico: { t: "Aperture automatiche", c: "hsl(38 92% 60%)" },
  ignoto: { t: "Non rilevato", c: "hsl(220 9% 55%)" },
};
const BREVE: Record<string, string> = { mobile: "telefono", desktop: "computer", tablet: "tablet", automatico: "automatico", ignoto: "?" };
const ICONA: Record<string, typeof Smartphone> = {
  mobile: Smartphone, desktop: Monitor, tablet: Tablet, automatico: Bot, ignoto: HelpCircle,
};

/**
 * Esito del click, detto per quello che è.
 *
 * Il redirect apre `wa.me/numero?text=...`: WhatsApp si apre con il messaggio già scritto, ma
 * l'invio lo fa la persona, dentro WhatsApp, dove non arriviamo. Quindi qui si sa verso chi è
 * stata aperta la chat, non che il venditore abbia ricevuto qualcosa: chiamarlo "arrivato in
 * chat" farebbe cercare un problema tecnico dove invece qualcuno non ha premuto invia.
 */
const ESITO: Record<string, { t: string; c: string }> = {
  ok: { t: "chat aperta col sales", c: "text-emerald-400" },
  fallback: { t: "numero di riserva", c: "text-amber-400" },
  error: { t: "errore", c: "text-red-400" },
};

/** Confronto fra nomi che tollera accenti e spazi doppi: serve solo a segnalare le differenze. */
const nomeSemplice = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

interface Props { lancio: LancioConfig; rows: LancioRow[]; market: string; onChange?: () => void }

/** Contatto WhatsApp del lancio: link, click tracciati e passaggio lead → contatto → call. */
const TabWhatsapp = ({ lancio, rows, market }: Props) => {
  const [percorso, setPercorso] = useState<Percorso | null>(null);
  const [filtro, setFiltro] = useState<"tutti" | "click" | "senza">("tutti");
  const [tpl, setTpl] = useState<TemplateWa | null>(null);
  const [all, setAll] = useState<TemplateWa[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchClickStats>> | null>(null);
  const [perLink, setPerLink] = useState<{ tpl: TemplateWa; stats: Awaited<ReturnType<typeof fetchClickStats>> }[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const slugs = useMemo(
    () => (lancio.whatsapp_slugs?.length ? lancio.whatsapp_slugs : (lancio.whatsapp_slug ? [lancio.whatsapp_slug] : [])),
    [lancio.whatsapp_slugs, lancio.whatsapp_slug],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const list = (await fetchTemplates()) as TemplateWa[];
    setAll(list);
    const collegati = slugs.map((sl) => list.find((x) => x.slug === sl)).filter(Boolean) as TemplateWa[];
    setTpl(collegati[0] ?? null);
    // Un blocco di statistiche per link, cosi due pulsanti su pagine diverse si confrontano.
    const perLink = await Promise.all(collegati.map(async (t) => ({ tpl: t, stats: await fetchClickStats(t.slug) })));
    setPerLink(perLink);
    setStats(perLink.length ? sommaStat(perLink.map((x) => x.stats)) : null);
    // Il percorso parte dai lead della campagna, quindi si popola anche senza nessun link
    // collegato: dice comunque in quanto vengono assegnati e a chi.
    setPercorso(await fetchPercorso(lancio.campagna ?? "", market, slugs));
    setLoading(false);
  }, [slugs, lancio.campagna, market]);
  useEffect(() => { load(); }, [load]);

  const righeFiltrate = useMemo(() => {
    const r = percorso?.righe ?? [];
    if (filtro === "click") return r.filter((x) => x.click_at);
    if (filtro === "senza") return r.filter((x) => !x.click_at);
    return r;
  }, [percorso, filtro]);




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

      {/* Confronto fra i link del lancio: serve quando ce n'e piu di uno (A/B) */}
      {perLink.length > 1 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3.5 border-b border-border">
            <CardTitle className="label-eyebrow">Confronto fra i link · {perLink.length} pulsanti</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr>
                <th className="table-header-cell text-left">Link</th>
                <th className="table-header-cell text-right whitespace-nowrap">Click</th>
                <th className="table-header-cell text-right whitespace-nowrap">Quota</th>
                <th className="table-header-cell text-right whitespace-nowrap">Arrivati in chat</th>
                <th className="table-header-cell text-right whitespace-nowrap">Errori</th>
              </tr></thead>
              <tbody>
                {[...perLink].sort((a, b) => b.stats.totale - a.stats.totale).map(({ tpl: t, stats: st }, i) => (
                  <tr key={t.slug}>
                    <td className="table-body-cell">
                      <div className="font-medium truncate">{t.nome}</div>
                      <code className="text-[10.5px] text-muted-foreground">/wa/{t.slug}</code>
                    </td>
                    <td className="table-body-cell text-right num font-semibold"
                      style={{ color: i === 0 && st.totale > 0 ? "hsl(142 71% 55%)" : undefined }}>
                      {n(st.totale)}
                    </td>
                    <td className="table-body-cell text-right num text-muted-foreground">
                      {pct(st.totale, stats?.totale ?? 0)}
                    </td>
                    <td className="table-body-cell text-right num">{n(st.ok)} <span className="text-muted-foreground">{pct(st.ok, st.totale)}</span></td>
                    <td className={`table-body-cell text-right num ${st.errori > 0 ? "text-destructive" : "text-muted-foreground"}`}>{n(st.errori)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground px-3.5 py-2.5 border-t border-border">
              I click sono contati per link, quindi due pulsanti su pagine diverse si confrontano senza ambiguità.
              Le schede qui sopra e le tabelle qui sotto sommano tutti i link del lancio.
            </p>
          </CardContent>
        </Card>
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

      {/* Percorso del singolo lead: entrato → ha cliccato → assegnato in → a chi */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2.5 px-3.5 border-b border-border">
          <CardTitle className="label-eyebrow flex items-center justify-between gap-2 flex-wrap">
            <span>Percorso del lead — entrato, click, assegnazione, sales</span>
            <span className="flex items-center gap-1 normal-case tracking-normal">
              {(["tutti", "click", "senza"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFiltro(f)}
                  className={`h-6 px-2 rounded text-[11px] transition-colors ${
                    filtro === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "tutti" ? "Tutti" : f === "click" ? "Ha cliccato" : "Non ha cliccato"}
                </button>
              ))}
            </span>
          </CardTitle>
        </CardHeader>

        {percorso && percorso.totale_lead > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 border-b border-border">
            {[
              { k: "Lead del lancio", v: n(percorso.totale_lead), s: `${n(percorso.assegnati)} con sales` },
              { k: "Hanno cliccato", v: n(percorso.con_click), s: pct(percorso.con_click, percorso.totale_lead) },
              { k: "Click mediano", v: durata(percorso.ritardo_click_mediano_sec), s: "dopo l'optin" },
              { k: "Assegnazione mediana", v: durata(percorso.assegnazione_mediana_sec), s: "dall'ingresso" },
            ].map((c) => (
              <div key={c.k} className="px-3.5 py-2.5 border-r border-border">
                <div className="label-eyebrow">{c.k}</div>
                <div className="text-lg font-bold num tracking-tight">{c.v}</div>
                <div className="text-[10.5px] text-muted-foreground">{c.s}</div>
              </div>
            ))}

            {/* Da cosa hanno cliccato: qui e non in una scheda a parte, perché è una
                ripartizione degli stessi click contati qui accanto. */}
            <div className="px-3.5 py-2.5 col-span-2 md:col-span-1">
              <div className="label-eyebrow">Da cosa hanno cliccato</div>
              {percorso.con_click === 0 ? (
                <div className="text-lg font-bold num tracking-tight text-muted-foreground/40">—</div>
              ) : (
                <>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-border mt-1.5 mb-1">
                    {percorso.per_dispositivo.map((d) => (
                      <i key={d.nome} className="block h-full"
                        style={{ width: `${(d.n / percorso.con_click) * 100}%`, background: DISPOSITIVO[d.nome]?.c ?? "hsl(220 9% 55%)" }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                    {percorso.per_dispositivo.map((d) => {
                      const Icona = ICONA[d.nome] ?? HelpCircle;
                      return (
                        <span key={d.nome} className="flex items-center gap-1 text-[11px]" title={DISPOSITIVO[d.nome]?.t ?? d.nome}>
                          <Icona className="h-3 w-3 shrink-0" style={{ color: DISPOSITIVO[d.nome]?.c }} />
                          <span className="num font-semibold">{pct(d.n, percorso.con_click)}</span>
                          <span className="num text-muted-foreground">({n(d.n)})</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <CardContent className="p-0 overflow-auto max-h-[52vh]">
          <table className="w-full text-[12px]">
            <thead><tr>
              <th className="table-header-cell text-left sticky top-0 bg-card">Lead</th>
              <th className="table-header-cell text-left sticky top-0 bg-card whitespace-nowrap">Data ingresso</th>
              <th className="table-header-cell text-left sticky top-0 bg-card whitespace-nowrap">Data clic</th>
              <th className="table-header-cell text-left sticky top-0 bg-card">Esito</th>
              <th className="table-header-cell text-center sticky top-0 bg-card whitespace-nowrap">Dispositivo</th>
              <th className="table-header-cell text-right sticky top-0 bg-card whitespace-nowrap">Tempo d'assegnazione</th>
              <th className="table-header-cell text-left sticky top-0 bg-card">Sales</th>
            </tr></thead>
            <tbody>
              {righeFiltrate.map((r) => (
                <tr key={r.id}>
                  <td className="table-body-cell">
                    <div className="truncate max-w-[190px]">{r.nome || "—"}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate max-w-[190px]">{r.email || "—"}</div>
                  </td>
                  <td className="table-body-cell whitespace-nowrap text-muted-foreground num">{quando(r.creato)}</td>
                  <td className="table-body-cell whitespace-nowrap num">
                    {r.click_at ? (
                      <>
                        <span className="text-emerald-400">{quando(r.click_at)}</span>
                        {/* Ritardo negativo: ha premuto il pulsante prima che il flusso scrivesse
                            il lead. È il caso in cui la pagina deve aspettare, non un errore. */}
                        {r.click_dopo_sec !== null && (r.click_dopo_sec < 0
                          ? <span className="text-amber-400" title="Ha cliccato prima che il lead fosse registrato: la pagina ha dovuto aspettare"> · {durata(-r.click_dopo_sec)} prima</span>
                          : <span className="text-muted-foreground"> · +{durata(r.click_dopo_sec)}</span>)}
                      </>
                    ) : <span className="text-muted-foreground/40">nessun click</span>}
                  </td>
                  <td className="table-body-cell">
                    {r.click_esito ? (
                      <span className="flex items-center gap-1.5">
                        <span className={ESITO[r.click_esito]?.c ?? "text-muted-foreground"}>
                          {ESITO[r.click_esito]?.t ?? r.click_esito}
                        </span>
                        {r.click_motivo && <span className="text-[10px] text-muted-foreground">{r.click_motivo}</span>}
                        {r.click_slug && slugs.length > 1 && (
                          <span className="text-[10px] px-1 rounded bg-secondary text-muted-foreground">{r.click_slug}</span>
                        )}
                      </span>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  {/* Il dispositivo ha colonna sua: da solo si legge a colpo d'occhio, invece di
                      perdersi in coda all'esito fra il motivo dell'errore e il nome del pulsante. */}
                  <td className="table-body-cell text-center">
                    {r.click_dispositivo ? (() => {
                      const Icona = ICONA[r.click_dispositivo] ?? HelpCircle;
                      return (
                        <span className="inline-flex" title={DISPOSITIVO[r.click_dispositivo]?.t ?? r.click_dispositivo}>
                          <Icona className="h-3.5 w-3.5" style={{ color: DISPOSITIVO[r.click_dispositivo]?.c }} />
                          <span className="sr-only">{BREVE[r.click_dispositivo]}</span>
                        </span>
                      );
                    })() : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="table-body-cell text-right num whitespace-nowrap">
                    {r.assegnato_dopo_sec === null
                      ? <span className="text-muted-foreground/40">—</span>
                      : durata(r.assegnato_dopo_sec)}
                  </td>
                  <td className="table-body-cell">
                    {r.venditore
                      ? <span className={r.click_venditore && nomeSemplice(r.click_venditore) !== nomeSemplice(r.venditore) ? "text-amber-400" : ""}>{r.venditore}</span>
                      : <span className="text-muted-foreground/40">libero</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {righeFiltrate.length === 0 && (
            <p className="py-4 px-4 text-center text-[12px] text-muted-foreground border-t border-border">
              {!lancio.campagna
                ? <>Il lancio non ha una campagna configurata: senza quella non si sa quali lead gli appartengono. Si imposta in <b>Impostazioni → Lanci</b>.</>
                : percorso && percorso.totale_lead > 0
                  ? "Nessun lead in questo filtro."
                  : "Nessun lead per questa campagna."}
            </p>
          )}

          <p className="py-2 px-3.5 text-[11px] text-muted-foreground border-t border-border">
            {percorso && percorso.righe.length < percorso.totale_lead &&
              <>In tabella i {n(percorso.righe.length)} lead più recenti su {n(percorso.totale_lead)}; i numeri qui sopra li contano tutti. </>}
            {percorso && percorso.click_non_agganciati > 0 &&
              <>{n(percorso.click_non_agganciati)} click non si agganciano a nessun lead di questa campagna: o il lead è di un altro lancio, o è arrivato senza email utilizzabile. </>}
            {/* Le aperture automatiche si nominano solo quando ci sono: dirlo sempre sarebbe
                rumore, tacerlo quando ci sono falserebbe la lettura del tasso di click. */}
            {percorso?.per_dispositivo.some((d) => d.nome === "automatico") &&
              <>Fra i click ci sono aperture automatiche — anteprime dei link, antivirus, scanner: non sono persone, tienile fuori dal tasso di contatto. </>}
            <b className="text-foreground/80">Chat aperta non vuol dire messaggio inviato:</b> il link apre WhatsApp col
            testo già scritto, ma premere invia tocca alla persona, dentro WhatsApp, dove non possiamo vedere.
            Se un sales dice di non aver ricevuto nulla da lead che qui risultano "chat aperta", quasi sempre è questo —
            non un numero sbagliato.
          </p>
        </CardContent>
      </Card>

    </div>
  );
};

export default TabWhatsapp;
