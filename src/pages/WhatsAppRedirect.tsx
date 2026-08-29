import { useEffect, useRef, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";
import { fetchTemplateBySlug, incrementTemplateClick } from "@/lib/whatsapp/templates";
import { Loader2, AlertCircle, MessageCircle, Check } from "lucide-react";

/**
 * Redirect pubblico WhatsApp: cerca lead → apre WhatsApp del venditore.
 *
 * Route:
 *   /wa              → messaggio default
 *   /wa/:slug        → messaggio da template DB
 *
 * Query:
 *   email, telefono/phone, nome, market (IT/ES), text (override)
 *
 * Log click in whatsapp_click_logs.
 */

const digitsOnly = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

const normalizePhone = (phone: string, defaultCountryCode = "39"): string => {
  let d = digitsOnly(phone);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length <= 10 && !d.startsWith(defaultCountryCode)) {
    d = defaultCountryCode + d;
  }
  return d;
};

/**
 * Nome ridotto alla forma confrontabile: minuscolo, senza accenti, spazi normalizzati.
 * Il venditore scritto sul lead può arrivare da fuori — workflow esterni, fogli — e differire
 * dall'anagrafica per un accento: senza questo il suo numero non si troverebbe e il lead
 * vedrebbe un errore pur avendo un venditore assegnato.
 */
const nomeConfrontabile = (nome: string): string =>
  (nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Nome del venditore come lo deve leggere il lead. In anagrafica alcuni profili hanno il ruolo
 * attaccato al nome per distinguerli ("Nicola Feliciolli Setter"), ma al lead il ruolo non
 * interessa e suona sbagliato dentro un messaggio.
 */
const nomeVisibile = (nome: string, cognome?: string): string =>
  `${nome || ""} ${cognome || ""}`.trim().replace(/\s+(setter|closer|sales)$/i, "").trim();

const substitutePlaceholders = (tpl: string, ctx: Record<string, string>) => {
  return tpl.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => ctx[key] ?? "");
};

const defaultMessage = (nome: string) => {
  const primo = nome ? nome.trim().split(/\s+/)[0] : "";
  return primo
    ? `Ciao ${primo}, grazie per esserti registrato/a! Ti scrivo qui su WhatsApp.`
    : "Ciao, grazie per esserti registrato/a! Ti scrivo qui su WhatsApp.";
};

// Messaggi d'attesa che ruotano: l'assegnazione può metterci 15-40s (le automazioni a monte
// hanno delle pause), e una rotella muta spinge la gente ad andarsene. Qui si tiene la persona
// occupata e tranquilla finché il suo venditore è pronto. NB: la conferma dell'iscrizione la
// fa il messaggio WhatsApp che l'utente invia dopo, quindi qui non si parla di "confermare".
const MESSAGGI_ATTESA = [
  "Ti stiamo mettendo in contatto su WhatsApp…",
  "Assegniamo il referente giusto per te…",
  "Prepariamo la tua chat dedicata…",
  "Ci siamo quasi, apriamo WhatsApp tra pochi secondi…",
];

const WhatsAppRedirect = () => {
  const [params] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [venditore, setVenditore] = useState<{ nome: string; cognome: string } | null>(null);
  // Indice del messaggio d'attesa mostrato: ruota mentre siamo in "loading".
  const [msgIdx, setMsgIdx] = useState(0);
  // Chi comunque deve aspettare non deve restare bloccato: dopo pochi secondi compare una via
  // d'uscita verso il numero di riserva. Senza, l'unica alternativa e chiudere la pagina - e
  // chi chiude non lascia traccia, quindi non sapremmo nemmeno di averlo perso.
  const [attesaLunga, setAttesaLunga] = useState(false);
  const saltaAttesa = useRef(false);
  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGGI_ATTESA.length), 3500);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    /**
     * Il click passa da un edge con la service role: scrivendo qui con la anon key la RLS
     * rifiutava la riga e il log restava vuoto senza che si vedesse.
     *
     * keepalive tiene viva la richiesta anche mentre il browser sta già lasciando la pagina
     * per andare su WhatsApp, e il timeout evita che un edge lento trattenga il lead.
     */
    const logClick = async (payload: Record<string, any>) => {
      const corpo = JSON.stringify({
        ...payload,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      });
      try {
        const stop = new AbortController();
        const t = setTimeout(() => stop.abort(), 2500);
        await fetch(`${SUPA_URL}/functions/v1/wa-click`, {
          method: "POST", keepalive: true, signal: stop.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
          body: corpo,
        });
        clearTimeout(t);
      } catch {
        // Ultima spiaggia: sopravvive alla navigazione anche senza attesa.
        try { navigator.sendBeacon?.(`${SUPA_URL}/functions/v1/wa-click`, new Blob([corpo], { type: "application/json" })); } catch { /* niente da fare */ }
      }
    };

    // Prova a estrarre param da referrer se query attuale non li ha.
    // Utile quando thank-you page non può passare query nell'href (es. link statico su piattaforma no-code).
    const referrerParams: URLSearchParams | null = (() => {
      try {
        if (!document.referrer) return null;
        return new URL(document.referrer).searchParams;
      } catch {
        return null;
      }
    })();

    // Un valore è "reale" se non è un placeholder non sostituito dalla piattaforma
    // (es. {{contact.email}}, [email], %7B%7B...). In quel caso lo ignoro e provo il referrer.
    const isPlaceholder = (v: string) => /\{\{|\}\}|^\[.*\]$|%7b|%7d/i.test(v);
    const realVal = (v: string | null): string => {
      const t = (v || "").trim();
      return t && !isPlaceholder(t) ? t : "";
    };
    const getParam = (...keys: string[]): string => {
      for (const k of keys) {
        const v = realVal(params.get(k));
        if (v) return v;
      }
      if (referrerParams) {
        for (const k of keys) {
          const v = realVal(referrerParams.get(k));
          if (v) return v;
        }
      }
      return "";
    };

    const run = async () => {
      try {
        const email = getParam("email", "e-mail", "mail").toLowerCase();
        const telParam = getParam("telefono", "phone", "tel", "cellulare", "mobile");
        const nome = getParam("nome", "name", "first_name", "firstname");
        const marketParam = (getParam("market") || "IT").toUpperCase();
        const market = marketParam === "ES" ? "ES" : "IT";
        const defaultCountry = market === "ES" ? "34" : "39";
        const phoneNorm = normalizePhone(telParam, defaultCountry);
        const customText = getParam("text");

        // Fetch template se slug presente
        let templateText: string | null = null;
        let templateMarket: string | null = null;
        let fallbackPhone: string | null = null;
        let fallbackMessage: string | null = null;
        if (slug) {
          const tpl = await fetchTemplateBySlug(slug);
          if (!tpl) {
            setStatus("error");
            setErrorMsg("Template non trovato o disattivato.");
            await logClick({ template_slug: slug, market, status: "error", error_reason: "template_not_found", lead_email: email || null, lead_phone: telParam || null, lead_nome: nome || null });
            return;
          }
          templateText = tpl.messaggio_template;
          templateMarket = tpl.market;
          fallbackPhone = (tpl as any).fallback_phone || null;
          fallbackMessage = (tpl as any).fallback_message || null;
        }

        // Helper: redirect al numero di fallback se configurato
        const goFallback = async (reason: string, ctxNome: string) => {
          if (!fallbackPhone) return false;
          const fbPhone = normalizePhone(fallbackPhone, defaultCountry);
          if (!fbPhone) return false;
          const msg = customText || fallbackMessage || templateText || defaultMessage(ctxNome);
          const finalMsg = substitutePlaceholders(msg, {
            nome: ctxNome.split(/\s+/)[0] || "",
            nome_completo: ctxNome,
            venditore: "",
            venditore_nome: "",
            fonte: "",
            campagna: "",
            market,
          });
          setVenditore(null);
          setStatus("redirecting");
          await logClick({
            template_slug: slug || null,
            lead_email: email || null,
            lead_phone: telParam || null,
            lead_nome: ctxNome || null,
            venditore_phone_used: fbPhone,
            market,
            status: "fallback",
            error_reason: reason,
          });
          window.location.replace(`https://wa.me/${fbPhone}?text=${encodeURIComponent(finalMsg)}`);
          return true;
        };

        // Parametri mancanti → prova fallback, altrimenti errore
        if (!email && !phoneNorm) {
          if (await goFallback("missing_params", nome)) return;
          setStatus("error");
          setErrorMsg("Parametri mancanti: serve almeno email o telefono.");
          await logClick({ template_slug: slug || null, market, status: "error", error_reason: "missing_params", lead_email: null, lead_phone: null, lead_nome: nome || null });
          return;
        }

        const effectiveMarket = (templateMarket || market) as "IT" | "ES";

        const COLS = "id, venditore, market, created_at, telefono, email, nome, cognome, ultima_fonte, campagna";

        // Venditori consegnabili del market: attivi e con un telefono. Serve per capire quando
        // una riga è "pronta": un parcheggio senza numero (Round Robin, CRM4) NON è consegnabile
        // e non deve far aprire il numero di riserva al posto del venditore vero.
        const { data: vendList } = await supabase
          .from("venditori")
          .select("nome, cognome, telefono, stato")
          .eq("market", effectiveMarket)
          .eq("stato", "attivo");
        const vendByNome = new Map<string, any>();
        for (const v of vendList || []) vendByNome.set(nomeConfrontabile(`${v.nome} ${v.cognome}`), v);
        const consegnabile = (nomeVend: string | null | undefined): boolean => {
          if (!nomeVend) return false;
          const v = vendByNome.get(nomeConfrontabile(nomeVend));
          return !!(v && (v.telefono || "").trim());
        };

        /**
         * I record di questa persona, dal più recente. Si incrociano email E telefono: se ha
         * usato un'email diversa o un numero diverso, ma esiste un record più recente con lo
         * stesso numero e/o la stessa email, quello vince. Prima l'email aveva la precedenza a
         * prescindere, e un lead di ritorno con una vecchia riga-parcheggio (CRM4/Round Robin)
         * sotto l'email dell'optin finiva lì, ignorando record più recenti col suo venditore
         * vero sotto l'altra email (caso reale: optin con aurorecarmalvintage@ → vecchia riga
         * CRM4 del 2025, mentre il suo Matteo Petrucci stava su aurorecarmal@).
         *
         * Nessuna variante dell'indirizzo e nessuna ricerca fuori dal market: due indirizzi
         * simili possono essere due persone diverse.
         */
        const candidati = async (): Promise<any[]> => {
          const base = () => supabase.from("lead_generation").select(COLS)
            .eq("market", effectiveMarket)
            .order("created_at", { ascending: false }).limit(8);
          const tentativi: any[] = [];
          if (email) tentativi.push(base().ilike("email", email));
          if (phoneNorm) tentativi.push(base().ilike("telefono", `%${phoneNorm.slice(-9)}%`));
          if (tentativi.length === 0) return [];
          const esiti = await Promise.all(tentativi);
          const rows = esiti.flatMap((r: any) => r.data || [])
            .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
          const seen = new Set<string>();
          const uniq: any[] = [];
          for (const r of rows) if (!seen.has(r.id)) { seen.add(r.id); uniq.push(r); }
          return uniq; // dal più recente
        };

        /*
         * Quale record rappresenta l'optin di ADESSO.
         *
         * Prima si usava una soglia: la data del record consegnabile piu recente presente
         * all'arrivo, e si pretendeva poi un record piu NUOVO di quella. Ma il record giusto era
         * proprio quello che aveva fissato la soglia, quindi veniva escluso da se stesso: la
         * pagina non trovava nulla, aspettava i 75 secondi interi e solo alla fine ripiegava sul
         * record che aveva gia in mano dall'inizio. Su 1184 click, 1176 hanno aspettato per
         * niente, e in sei casi il ripiego ha aperto un venditore vecchio o estraneo.
         *
         * Il dato che serviva non e "quale record e piu recente" ma "quanto e recente": chi ha
         * appena compilato il modulo ha un record di pochi minuti. Sopra i dieci minuti si torna
         * ad aspettare, perche' li potrebbe esserci un optin nuovo in arrivo che assegnera' un
         * altro venditore (lead di ritorno oltre il lock).
         *
         * Dieci minuti e non trenta perche' il flusso a monte puo' metterci minuti a scrivere:
         * misurato, mediana 116s con casi oltre i dieci minuti. Con una finestra larga si
         * rischierebbe di prendere il record di un optin precedente mentre quello nuovo arriva.
         */
        const FRESCO_MS = 10 * 60 * 1000;

        const findAssignedLead = async (): Promise<any | null> => {
          const cands = await candidati();
          const valido = cands.find((c) => consegnabile(c.venditore));
          if (!valido) return null;
          const eta = Date.now() - new Date(valido.created_at).getTime();
          return eta < FRESCO_MS ? valido : null;
        };

        // Il lead esiste già in database? Serve solo a scegliere il messaggio d'attesa.
        const leadInLavorazione = async (): Promise<boolean> => (await candidati()).length > 0;

        // Due attese diverse, perché i due casi non sono lo stesso problema.
        //
        // Se il lead è già in tabella si aspetta a lungo: sotto carico l'assegnazione ha
        // impiegato fino a otto secondi, e mandare al numero di riserva qualcuno che sta per
        // avere il suo venditore è proprio l'errore da evitare.
        //
        // Se invece il lead non risulta da nessuna parte non c'è niente in arrivo: aspettare
        // servirebbe solo a tenerlo fermo davanti a una pagina bianca.
        // Quanto si aspetta prima di arrendersi. Il lead che non risulta ancora non significa
        // che non arrivera: chi clicca da una pagina di ringraziamento ha appena compilato il
        // modulo, e il flusso che lo registra puo metterci mezzo minuto. Misurato su un caso
        // reale: click alle 15:29:38, lead scritto alle 15:29:55 — la pagina si era gia arresa.
        const POLL_MS = 600;
        // Stessa attesa nei due casi: un lead che risulta gia in database non puo aspettare
        // meno di uno che deve ancora essere scritto, sarebbe al contrario.
        // Misurato: l'automazione a monte scrive il lead con mediana ~14s, p95 ~37s, max ~43s.
        // Con l'attesa "guidata" (messaggi che ruotano) la persona regge senza scappare, quindi
        // si copre il caso peggiore con margine invece di arrendersi a 50s appena prima.
        const ATTESA_LEAD_NOTO = 75000;
        const ATTESA_LEAD_IGNOTO = 75000;

        let lead: any = await findAssignedLead();
        if (!lead) {
          const noto = await leadInLavorazione();
          const inizio = Date.now();
          const scadenza = inizio + (noto ? ATTESA_LEAD_NOTO : ATTESA_LEAD_IGNOTO);
          console.log(noto
            ? "[wa] lead presente ma non ancora assegnato: attendo l'assegnazione"
            : "[wa] lead non ancora registrato: attendo che il flusso lo scriva");
          const SCORCIATOIA_DOPO = 8000;
          while (!lead && Date.now() < scadenza && !saltaAttesa.current) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            if (Date.now() - inizio > SCORCIATOIA_DOPO) setAttesaLunga(true);
            lead = await findAssignedLead();
          }
        }

        if (!lead) {
          // Attesa scaduta senza un'assegnazione nuova (es. click non da un optin fresco, o
          // pipeline mai arrivata): si usa il venditore consegnabile più recente che esiste,
          // così non si finisce al numero di riserva quando un venditore valido comunque c'è.
          lead = (await candidati()).find((c) => consegnabile(c.venditore)) ?? null;
        }

        if (!lead || !lead.venditore) {
          if (await goFallback("no_lead_or_venditore", nome)) return;
          setStatus("error");
          setErrorMsg("Nessun venditore assegnato trovato per questo lead.");
          await logClick({ template_slug: slug || null, market: effectiveMarket, status: "error", error_reason: "no_lead_or_venditore", lead_email: email || null, lead_phone: telParam || null, lead_nome: nome || null });
          return;
        }

        // Il venditore è già garantito consegnabile da findAssignedLead: risolvo il telefono
        // dalla mappa dei venditori attivi del market (niente seconda query).
        const match = vendByNome.get(nomeConfrontabile(lead.venditore));

        if (!match || !match.telefono) {
          if (await goFallback("no_venditore_phone", nome || lead.nome || "")) return;
          setStatus("error");
          setErrorMsg(`Venditore ${lead.venditore} non ha telefono configurato.`);
          await logClick({ template_slug: slug || null, lead_id: lead.id, lead_email: lead.email, lead_phone: lead.telefono, lead_nome: lead.nome, venditore_nome: lead.venditore, market: lead.market, status: "error", error_reason: "no_venditore_phone" });
          return;
        }

        const vendPhone = normalizePhone(match.telefono, defaultCountry);
        if (!vendPhone) {
          if (await goFallback("invalid_venditore_phone", nome || lead.nome || "")) return;
          setStatus("error");
          setErrorMsg("Numero venditore non valido.");
          await logClick({ template_slug: slug || null, lead_id: lead.id, lead_email: lead.email, lead_phone: lead.telefono, lead_nome: lead.nome, venditore_nome: lead.venditore, market: lead.market, status: "error", error_reason: "invalid_venditore_phone" });
          return;
        }

        // Costruisce messaggio
        const nomeForCtx = (nome || lead.nome || "").trim();
        const ctx = {
          nome: nomeForCtx.split(/\s+/)[0] || "",
          nome_completo: nomeForCtx,
          cognome: lead.cognome || "",
          venditore: nomeVisibile(match.nome, match.cognome),
          venditore_nome: nomeVisibile(match.nome).split(/\s+/)[0] || "",
          fonte: lead.ultima_fonte || "",
          campagna: lead.campagna || "",
          market: lead.market || "",
        };

        let messaggio: string;
        if (customText) messaggio = customText;
        else if (templateText) messaggio = substitutePlaceholders(templateText, ctx);
        else messaggio = defaultMessage(nomeForCtx);

        const text = encodeURIComponent(messaggio);
        const waUrl = `https://wa.me/${vendPhone}?text=${text}`;

        setVenditore({ nome: match.nome, cognome: match.cognome });
        setStatus("redirecting");

        // Log success + increment template counter
        await logClick({
          template_slug: slug || null,
          lead_id: lead.id,
          lead_email: lead.email,
          lead_phone: lead.telefono,
          lead_nome: lead.nome,
          venditore_nome: lead.venditore,
          venditore_phone_used: vendPhone,
          market: lead.market,
          status: "ok",
        });

        if (slug) {
          // Increment click_count best effort
          try { await incrementTemplateClick(slug); } catch { /* no-op */ }
        }

        window.location.replace(waUrl);
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMsg("Errore imprevisto. Riprova o contatta l'assistenza.");
      }
    };
    run();
  }, [params, slug]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4 p-6 rounded-2xl border bg-card">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
            <h1 className="text-lg font-semibold">Ti stiamo mettendo in contatto su WhatsApp</h1>
            <p className="text-sm text-muted-foreground min-h-[2.5rem] transition-opacity duration-300">
              {MESSAGGI_ATTESA[msgIdx]}
            </p>
            <ul className="text-sm text-left inline-block mx-auto space-y-1.5">
              <li className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" /> Dati ricevuti
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" /> Assegnazione del tuo referente
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <span className="h-4 w-4 flex items-center justify-center shrink-0 leading-none">•</span> Apertura di WhatsApp
              </li>
            </ul>
            {/* Compare solo quando l'attesa si allunga: prima sarebbe un invito a saltare
                un'attesa che dura un istante. */}
            {attesaLunga && (
              <button type="button" onClick={() => { saltaAttesa.current = true; }}
                className="block mx-auto text-[12.5px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Non voglio aspettare, scrivimi subito
              </button>
            )}
          </>
        )}
        {status === "redirecting" && (
          <>
            <MessageCircle className="h-10 w-10 mx-auto text-emerald-500" />
            <h1 className="text-lg font-semibold">Apertura WhatsApp...</h1>
            <p className="text-sm text-muted-foreground">
              Ti stiamo mettendo in contatto con {nomeVisibile(venditore?.nome ?? "", venditore?.cognome)}.
            </p>
            <p className="text-[11px] text-muted-foreground">Se non si apre automaticamente ricarica la pagina.</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
            <h1 className="text-lg font-semibold">Impossibile aprire WhatsApp</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppRedirect;
