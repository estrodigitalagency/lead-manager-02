import { useEffect, useRef, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";
import { fetchTemplateBySlug, incrementTemplateClick } from "@/lib/whatsapp/templates";
import { Loader2, AlertCircle, MessageCircle } from "lucide-react";

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

const WhatsAppRedirect = () => {
  const [params] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [venditore, setVenditore] = useState<{ nome: string; cognome: string } | null>(null);
  // Attesa che si allunga: si mostra una spiegazione e la possibilità di non aspettare oltre.
  const [attesaLunga, setAttesaLunga] = useState(false);
  const saltaAttesa = useRef(false);

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

        // Cerca il lead più recente CON venditore assegnato (per email o telefono).
        const COLS = "id, venditore, market, created_at, telefono, email, nome, cognome, ultima_fonte, campagna";

        /**
         * Cerca il lead per email o telefono, nel market del link. Le due interrogazioni sono
         * indipendenti e partono insieme: in fila i tempi si sommavano. L'email resta
         * prioritaria nella scelta del risultato.
         *
         * Nessuna variante dell'indirizzo e nessuna ricerca fuori dal market: due email simili
         * possono essere due persone diverse, e i link sono vincolati a un market solo.
         */
        const cerca = async (soloAssegnati: boolean): Promise<any | null> => {
          const base = () => {
            let q = supabase.from("lead_generation").select(COLS).eq("market", effectiveMarket);
            if (soloAssegnati) q = q.not("venditore", "is", null);
            return q.order("created_at", { ascending: false }).limit(1);
          };
          const tentativi: any[] = [];
          if (email) tentativi.push(base().ilike("email", email));
          if (phoneNorm) tentativi.push(base().ilike("telefono", `%${phoneNorm.slice(-9)}%`));
          if (tentativi.length === 0) return null;
          const esiti = await Promise.all(tentativi);
          return esiti.map((r: any) => r.data?.[0]).find(Boolean) ?? null;
        };

        const findAssignedLead = () => cerca(true);

        // Il lead esiste già in database ma non ha ancora un venditore? Allora l'assegnazione
        // è in corso e il numero di riserva sarebbe un errore: quel lead un venditore ce l'avrà.
        const leadInLavorazione = async (): Promise<boolean> => !!(await cerca(false));

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
        const ATTESA_LEAD_NOTO = 50000;
        const ATTESA_LEAD_IGNOTO = 50000;
        // Dopo qualche secondo si offre comunque una via d'uscita, cosi nessuno resta fermo a
        // guardare una rotella: chi ha fretta scrive al numero di riserva quando vuole.
        const SCORCIATOIA_DOPO = 8000;

        let lead: any = await findAssignedLead();
        if (!lead) {
          const noto = await leadInLavorazione();
          const inizio = Date.now();
          const scadenza = inizio + (noto ? ATTESA_LEAD_NOTO : ATTESA_LEAD_IGNOTO);
          console.log(noto
            ? "[wa] lead presente ma non ancora assegnato: attendo l'assegnazione"
            : "[wa] lead non ancora registrato: attendo che il flusso lo scriva");
          while (!lead && Date.now() < scadenza && !saltaAttesa.current) {
            await new Promise((r) => setTimeout(r, POLL_MS));
            if (Date.now() - inizio > SCORCIATOIA_DOPO) setAttesaLunga(true);
            lead = await findAssignedLead();
          }
        }

        if (!lead || !lead.venditore) {
          if (await goFallback("no_lead_or_venditore", nome)) return;
          setStatus("error");
          setErrorMsg("Nessun venditore assegnato trovato per questo lead.");
          await logClick({ template_slug: slug || null, market: effectiveMarket, status: "error", error_reason: "no_lead_or_venditore", lead_email: email || null, lead_phone: telParam || null, lead_nome: nome || null });
          return;
        }

        // Fetch venditore.telefono
        const { data: vendList } = await supabase
          .from("venditori")
          .select("nome, cognome, telefono, stato")
          .eq("market", lead.market)
          .eq("stato", "attivo");
        const match = (vendList || []).find(
          (v: any) => nomeConfrontabile(`${v.nome} ${v.cognome}`) === nomeConfrontabile(lead.venditore)
        );

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
            <h1 className="text-lg font-semibold">Ti stiamo indirizzando...</h1>
            <p className="text-sm text-muted-foreground">
              {attesaLunga
                ? "Stiamo ancora registrando la tua richiesta: ancora qualche secondo e ti mettiamo in contatto con la persona giusta."
                : "Un momento, stiamo trovando il tuo referente."}
            </p>
            {attesaLunga && (
              <button type="button" onClick={() => { saltaAttesa.current = true; }}
                className="text-[12.5px] text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Non voglio aspettare, scrivi subito
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
