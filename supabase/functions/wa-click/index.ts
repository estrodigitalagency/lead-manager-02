import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { calculateDaysSince, eParcheggio, inviaAnomalia, nomeConfrontabile, regolaSiApplica, type Anomalia, type MotivoAnomalia } from "../_shared/regole.ts";

/**
 * Registra il click sul link WhatsApp.
 *
 * La pagina /wa/ scriveva direttamente su whatsapp_click_logs con la anon key, ma la RLS
 * rifiuta l'inserimento: l'errore veniva ingoiato e la tabella è rimasta vuota, quindi tutte
 * le statistiche di contatto erano a zero senza che si vedesse. Qui si scrive con la service
 * role, cioè per una via che la RLS non blocca.
 *
 * La chiamata arriva subito prima del redirect a WhatsApp, quindi deve essere veloce e non
 * deve mai far fallire il redirect: qualunque errore torna 200 con esito "ignorato".
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/**
 * Da che cosa è stato aperto il link, leggendo lo user agent che la pagina manda già a ogni
 * click. Serve a due cose: capire se il pubblico è da telefono o da computer, e togliere dal
 * conteggio le aperture che non sono di una persona.
 *
 * Le aperture automatiche non si cancellano, si separano: anteprime dei link (WhatsApp, Meta),
 * antivirus e scanner aziendali aprono gli URL da soli, e contarle come contatti gonfierebbe il
 * tasso di click proprio nella metrica su cui poi si decide.
 *
 * Il riconoscimento è prudente in una direzione sola: si marca "automatico" solo con indizi
 * espliciti o quando la stringa non ha la forma di un browser. Un bot scambiato per persona
 * sposta poco; una persona scambiata per bot sparirebbe dai numeri, ed è l'errore peggiore.
 */
const AUTOMA = /bot\b|crawler|spider|slurp|facebookexternalhit|externalhit|preview|curl\/|wget|python-requests|httpx|axios|okhttp|java\/|go-http|headless|phantomjs|lighthouse|pingdom|uptime|monitor|scan/i;

function dispositivoDa(ua: string | null): "mobile" | "tablet" | "desktop" | "automatico" | "ignoto" {
  const s = String(ua ?? "").trim();
  if (!s) return "ignoto";
  // Un browser vero si presenta come "Mozilla/5.0 ...". Chi non lo fa non è una persona.
  if (AUTOMA.test(s) || !/^mozilla\//i.test(s)) return "automatico";
  if (/ipad|tablet|playbook|silk|kindle/i.test(s)) return "tablet";
  // Android senza "Mobile" è un tablet: è il modo con cui Android stesso distingue i due.
  if (/android/i.test(s) && !/mobile/i.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(s)) return "mobile";
  return "desktop";
}

/**
 * Cerca chi aveva in carico questa persona e se e' ancora dentro l'intervallo della regola che
 * la riguarda. Si guarda solo l'email e la coda del telefono, gli stessi appigli con cui la
 * pagina trova il lead: nessuna variante, per non attribuire a qualcuno un lead che non e' suo.
 */
async function segnalaClickDeviato(riga: Record<string, unknown>, supabase: any) {
  const mercato = String(riga.market ?? "IT").toUpperCase();
  const email = String(riga.lead_email ?? "").toLowerCase().trim();
  const tel = String(riga.lead_phone ?? "").replace(/\D/g, "").slice(-9);
  if (!email && !tel) return;

  const COLS = "id, nome, cognome, email, telefono, market, campagna, ultima_fonte, venditore, data_assegnazione, created_at";
  const q = () => supabase.from("lead_generation").select(COLS)
    .eq("market", mercato).not("venditore", "is", null)
    .order("data_assegnazione", { ascending: false }).limit(5);
  const tentativi: any[] = [];
  if (email) tentativi.push(q().eq("email", email));
  if (tel) tentativi.push(q().ilike("telefono", `%${tel}%`));
  const esiti = await Promise.all(tentativi);

  const righe = esiti.flatMap((r: any) => r.data ?? [])
    .filter((l: any) => l.venditore && !eParcheggio(l.venditore))
    .sort((a: any, b: any) => String(b.data_assegnazione ?? "").localeCompare(String(a.data_assegnazione ?? "")));
  const prec = righe[0];
  if (!prec?.data_assegnazione) return;

  /*
   * L'intervallo e quello della regola che riconosce questo lead, e va deciso con la stessa
   * funzione che usa l'assegnazione: confrontare le fonti a mano ignorava il tipo di condizione
   * e faceva scattare "Evergreen", che su un lead workshop non si applica affatto perche' la
   * sua condizione e "non contiene workshop". Ne usciva l'intervallo sbagliato.
   */
  const { data: regole } = await supabase.from("lead_assignment_automations")
    .select("nome, lock_period_days, trigger_when, trigger_field, condition_type, condition_value, trigger_sources")
    .eq("market", mercato).eq("attivo", true).order("priority", { ascending: true });
  const regola = (regole ?? []).find((r: any) => regolaSiApplica(prec, r)) ?? null;
  const intervallo = regola?.lock_period_days ?? null;

  const giorni = calculateDaysSince(prec.data_assegnazione);
  const dentro = intervallo === null || intervallo === -1 || intervallo === 0 || giorni < intervallo;
  if (!dentro) return;

  const finito = String(riga.venditore_nome ?? "").trim() || null;
  // Se la chat si e aperta proprio col suo venditore non c'e niente di storto.
  if (finito && nomeConfrontabile(finito) === nomeConfrontabile(prec.venditore)) return;

  const motivo: MotivoAnomalia = !finito ? "numero_di_riserva"
    : eParcheggio(finito) ? "parcheggio" : "venditore_diverso";

  const anomalia: Anomalia = {
    motivo,
    lead_id: (riga.lead_id as string) ?? prec.id ?? null,
    lead_nome: String(riga.lead_nome ?? `${prec.nome ?? ""} ${prec.cognome ?? ""}`).trim() || null,
    lead_email: (riga.lead_email as string) ?? prec.email ?? null,
    lead_telefono: (riga.lead_phone as string) ?? prec.telefono ?? null,
    market: mercato,
    campagna: prec.campagna ?? null,
    ultima_fonte: prec.ultima_fonte ?? null,
    venditore_precedente: prec.venditore,
    precedente_assegnato_il: prec.data_assegnazione,
    giorni_dall_ultima_assegnazione: giorni,
    intervallo_giorni: intervallo,
    venditore_attuale: finito,
    regola: regola?.nome ?? null,
    rilevato_da: "click_whatsapp",
    rilevato_il: new Date().toISOString(),
  };
  await inviaAnomalia(anomalia, supabase);
}

const contaPer = <T extends string>(valori: T[]): { nome: T; n: number }[] => {
  const m: Record<string, number> = {};
  for (const v of valori) m[v] = (m[v] || 0) + 1;
  return Object.entries(m).map(([nome, n]) => ({ nome: nome as T, n })).sort((a, b) => b.n - a.n);
};

// Campi accettati: tutto il resto viene scartato invece di far fallire l'inserimento.
const CAMPI = [
  "template_slug", "lead_id", "lead_email", "lead_phone", "lead_nome",
  "venditore_nome", "venditore_phone_used", "market", "status", "error_reason",
  "referrer", "user_agent",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const corpo = await req.json();

    const supabaseSR = () => createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    /**
     * Percorso del singolo lead: entrato → ha cliccato → quanto ci ha messo il sistema ad
     * assegnarlo → a chi.
     *
     * Le statistiche aggregate dicono quanti click ci sono stati, non a chi sono successi: un
     * lead che non ha mai cliccato non compare da nessuna parte, e proprio quelli sono la
     * maggioranza. Qui si parte dai lead, non dai click, così i due insiemi si vedono insieme.
     *
     * L'incrocio è per email esatta e, in mancanza, per le ultime nove cifre del telefono: sono
     * gli stessi identificativi con cui la pagina /wa/ trova il lead, quindi la tabella mostra
     * gli stessi abbinamenti che avvengono dal vivo.
     */
    if (corpo.azione === "percorso") {
      const mercato = String(corpo.market ?? "IT").toUpperCase();
      const campagna = String(corpo.campagna ?? "").trim();
      const slugs: string[] = Array.isArray(corpo.slugs) ? corpo.slugs.filter(Boolean) : [];
      if (!campagna) return json({ error: "Serve la campagna del lancio" }, 400);
      const sr = supabaseSR();

      // A pagine: un lancio può avere migliaia di lead e un tetto di lettura direbbe che i lead
      // sono meno di quanti sono, cioè esattamente l'errore che questa vista deve escludere.
      const leggiTutto = async (tabella: string, colonne: string, filtra: (q: any) => any) => {
        const righe: any[] = [];
        for (let off = 0; off < 100000; off += 1000) {
          const { data } = await filtra(sr.from(tabella).select(colonne)).range(off, off + 999);
          if (!data || data.length === 0) break;
          righe.push(...data);
          if (data.length < 1000) break;
        }
        return righe;
      };

      const lead = await leggiTutto(
        "lead_generation",
        "id, nome, cognome, email, telefono, venditore, stato, booked_call, created_at, data_assegnazione",
        (q: any) => q.eq("market", mercato).eq("campagna", campagna).order("created_at", { ascending: false }),
      );

      const click = slugs.length === 0 ? [] : await leggiTutto(
        "whatsapp_click_logs",
        "clicked_at, template_slug, lead_id, lead_email, lead_phone, venditore_nome, status, error_reason, user_agent",
        (q: any) => q.in("template_slug", slugs).order("clicked_at", { ascending: true }),
      );

      // Indici di ricerca: id, email, coda del telefono. Si tiene il primo click in ordine di
      // tempo, perché è quello che ha deciso il contatto; i successivi sono ritorni.
      const perId = new Map<string, any>(), perEmail = new Map<string, any>(), perTel = new Map<string, any>();
      const coda = (t: string | null) => { const d = String(t ?? "").replace(/\D/g, ""); return d.length >= 9 ? d.slice(-9) : ""; };
      for (const c of click) {
        if (c.lead_id && !perId.has(c.lead_id)) perId.set(c.lead_id, c);
        const em = String(c.lead_email ?? "").toLowerCase().trim();
        if (em && !perEmail.has(em)) perEmail.set(em, c);
        const tl = coda(c.lead_phone);
        if (tl && !perTel.has(tl)) perTel.set(tl, c);
      }

      const secondiFra = (a: string | null, b: string | null) =>
        a && b ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000) : null;

      const righe = lead.map((l: any) => {
        const c = perId.get(l.id)
          ?? perEmail.get(String(l.email ?? "").toLowerCase().trim())
          ?? (coda(l.telefono) ? perTel.get(coda(l.telefono)) : null)
          ?? null;
        return {
          id: l.id,
          nome: `${l.nome ?? ""} ${l.cognome ?? ""}`.trim(),
          email: l.email,
          creato: l.created_at,
          venditore: l.venditore,
          stato: l.stato,
          // Assegnazione: quanto ci ha messo il sistema, non la persona.
          assegnato_dopo_sec: secondiFra(l.created_at, l.data_assegnazione),
          data_assegnazione: l.data_assegnazione,
          // Click: se c'è stato, dopo quanto, com'è finito e da quale pulsante.
          click_at: c?.clicked_at ?? null,
          click_dopo_sec: c ? secondiFra(l.created_at, c.clicked_at) : null,
          click_esito: c?.status ?? null,
          click_motivo: c?.error_reason ?? null,
          click_slug: c?.template_slug ?? null,
          click_venditore: c?.venditore_nome ?? null,
          click_dispositivo: c ? dispositivoDa(c.user_agent) : null,
        };
      });

      const conClick = righe.filter((r) => r.click_at);
      const mediana = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
      const attese = righe.map((r) => r.assegnato_dopo_sec).filter((x): x is number => x !== null && x >= 0);
      const ritardi = conClick.map((r) => r.click_dopo_sec).filter((x): x is number => x !== null && x >= 0);

      // I click registrati che non si agganciano a nessun lead di questa campagna: o il lead è
      // di un'altra campagna, o è arrivato senza email utilizzabile. Vanno detti, non nascosti.
      const agganciati = new Set(conClick.map((r) => r.click_at));
      const orfani = click.filter((c) => !agganciati.has(c.clicked_at)).length;

      return json({
        totale_lead: righe.length,
        con_click: conClick.length,
        click_ok: conClick.filter((r) => r.click_esito === "ok").length,
        click_riserva: conClick.filter((r) => r.click_esito === "fallback").length,
        click_errore: conClick.filter((r) => r.click_esito === "error").length,
        assegnati: righe.filter((r) => r.venditore).length,
        senza_venditore: righe.filter((r) => !r.venditore).length,
        assegnazione_mediana_sec: mediana(attese),
        ritardo_click_mediano_sec: mediana(ritardi),
        click_non_agganciati: orfani,
        per_dispositivo: contaPer(conClick.map((r) => r.click_dispositivo!).filter(Boolean)),
        // La tabella mostra i più recenti: il resto vive negli aggregati qui sopra.
        righe: righe.slice(0, Number(corpo.limite) || 400),
      });
    }

    // Azzera le statistiche di un link: serve per ripartire da zero prima di una prova vera,
    // senza portarsi dietro i click falliti delle configurazioni precedenti.
    if (corpo.azione === "reset") {
      const slug = String(corpo.slug ?? "").trim();
      if (!slug) return json({ error: "Serve lo slug del link" }, 400);
      const { count: prima } = await supabaseSR()
        .from("whatsapp_click_logs").select("id", { count: "exact", head: true }).eq("template_slug", slug);
      const { error } = await supabaseSR().from("whatsapp_click_logs").delete().eq("template_slug", slug);
      if (error) return json({ error: error.message }, 500);
      console.log(`[wa-click] azzerate ${prima ?? 0} righe per ${slug}`);
      return json({ ok: true, cancellati: prima ?? 0 });
    }

    // Lettura delle statistiche: la RLS non lascia leggere la tabella con la anon key, quindi
    // anche i conteggi devono passare da qui, altrimenti l'app mostra zero click comunque.
    if (corpo.azione === "stats") {
      // A pagine invece che con un tetto: cinquemila click sembrano tanti finche un lancio non
      // li supera, e a quel punto le statistiche sarebbero piu basse del vero senza dirlo.
      const righe: any[] = [];
      for (let off = 0; off < 100000; off += 1000) {
        const { data } = await supabaseSR()
          .from("whatsapp_click_logs")
          .select("clicked_at, lead_nome, lead_email, venditore_nome, venditore_phone_used, status, error_reason, referrer, user_agent")
          .eq("template_slug", corpo.slug ?? "")
          .order("clicked_at", { ascending: false })
          .range(off, off + 999);
        if (!data || data.length === 0) break;
        righe.push(...data);
        if (data.length < 1000) break;
      }
      const perSales: Record<string, any> = {};
      const perGiorno: Record<string, number> = {};
      const perOrigine: Record<string, number> = {};
      let ok = 0, errori = 0, senzaOrigine = 0;

      // Da dove è stato cliccato. Fra domini diversi il browser manda solo l'origine, non il
      // percorso, a meno che il link non abbia referrerpolicy="unsafe-url": quando c'è si vede
      // la pagina esatta, altrimenti solo il sito.
      const origineDi = (raw: string | null): string | null => {
        const v = (raw || "").trim();
        if (!v) return null;
        try {
          const u = new URL(v);
          const percorso = u.pathname.replace(/\/$/, "");
          return u.host + percorso;
        } catch {
          return v.slice(0, 120);
        }
      };
      for (const r of righe) {
        const v = r.venditore_nome || "—";
        perSales[v] ??= { venditore: v, click: 0, ok: 0, fallback: 0, errore: 0 };
        perSales[v].click++;
        if (r.status === "ok") { ok++; perSales[v].ok++; }
        else if (r.status === "fallback") perSales[v].fallback++;
        else { errori++; perSales[v].errore++; }
        const g = String(r.clicked_at ?? "").slice(0, 10);
        if (g) perGiorno[g] = (perGiorno[g] || 0) + 1;
        const o = origineDi((r as any).referrer);
        if (o) perOrigine[o] = (perOrigine[o] || 0) + 1; else senzaOrigine++;
      }
      return json({
        totale: righe.length, ok, errori,
        perSales: Object.values(perSales).sort((a: any, b: any) => b.click - a.click),
        perGiorno: Object.keys(perGiorno).sort().map((day) => ({ day, n: perGiorno[day] })),
        perOrigine: Object.entries(perOrigine).map(([origine, n]) => ({ origine, n })).sort((a, b) => b.n - a.n),
        perDispositivo: contaPer(righe.map((r: any) => dispositivoDa(r.user_agent))),
        senza_origine: senzaOrigine,
        ultimi: righe.slice(0, 30),
      });
    }

    const riga: Record<string, unknown> = {};
    for (const k of CAMPI) if (corpo[k] !== undefined && corpo[k] !== "") riga[k] = corpo[k];
    if (Object.keys(riga).length === 0) return json({ ok: false, motivo: "payload vuoto" });

    const supabase = supabaseSR();

    // Stesso lead, stesso link, stesso esito entro un minuto: è un ricaricamento della pagina,
    // non un secondo contatto. Contarlo due volte gonfierebbe il tasso di contatto.
    const identificativo = (riga.lead_email || riga.lead_phone || "") as string;
    if (identificativo) {
      const unMinutoFa = new Date(Date.now() - 60_000).toISOString();
      let q = supabase.from("whatsapp_click_logs").select("id")
        .eq("template_slug", riga.template_slug ?? "")
        .gte("clicked_at", unMinutoFa).limit(1);
      q = riga.lead_email ? q.eq("lead_email", riga.lead_email) : q.eq("lead_phone", riga.lead_phone);
      const { data: gia } = await q;
      if (gia && gia.length > 0) return json({ ok: true, duplicato: true });
    }

    /*
     * Click che non ha portato la persona dal suo venditore, pur avendone uno.
     *
     * Vale la pena segnalarlo solo se il lead un venditore ce l'aveva davvero ed era ancora
     * dentro l'intervallo: se ne aveva uno vecchio e scaduto, il numero di riserva e' la
     * risposta giusta e non c'e' niente da avvisare.
     */
    if (riga.status !== "ok") {
      // fuori dalla risposta: un avviso lento non deve trattenere chi sta aprendo WhatsApp
      const avviso = segnalaClickDeviato(riga, supabase).catch((e) =>
        console.error("[anomalia] controllo sul click fallito:", (e as Error).message));
      // @ts-ignore EdgeRuntime e disponibile su Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(avviso);
    }

    const { error } = await supabase.from("whatsapp_click_logs").insert(riga);
    if (error) {
      console.error("[wa-click] inserimento fallito:", error.message, riga);
      return json({ ok: false, motivo: error.message });
    }
    return json({ ok: true });
  } catch (e) {
    console.error("[wa-click] errore:", (e as Error).message);
    return json({ ok: false, motivo: (e as Error).message });
  }
});
