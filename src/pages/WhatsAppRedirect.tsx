import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    const logClick = async (payload: Record<string, any>) => {
      try {
        await supabase.from("whatsapp_click_logs").insert({
          ...payload,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        });
      } catch (e) {
        console.warn("Click log fallito:", e);
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

    const getParam = (...keys: string[]): string => {
      for (const k of keys) {
        const v = params.get(k);
        if (v && v.trim()) return v.trim();
      }
      if (referrerParams) {
        for (const k of keys) {
          const v = referrerParams.get(k);
          if (v && v.trim()) return v.trim();
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

        // Cerca lead più recente per email o telefono
        let lead: any = null;
        if (email) {
          const { data } = await supabase
            .from("lead_generation")
            .select("id, venditore, market, created_at, telefono, email, nome, cognome, ultima_fonte, campagna")
            .eq("market", effectiveMarket)
            .ilike("email", email)
            .not("venditore", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);
          lead = data?.[0] || null;
        }
        if (!lead && phoneNorm) {
          const suffix = phoneNorm.slice(-9);
          const { data } = await supabase
            .from("lead_generation")
            .select("id, venditore, market, created_at, telefono, email, nome, cognome, ultima_fonte, campagna")
            .eq("market", effectiveMarket)
            .ilike("telefono", `%${suffix}%`)
            .not("venditore", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);
          lead = data?.[0] || null;
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
          (v: any) => (`${v.nome} ${v.cognome}`.trim().toLowerCase()) === lead.venditore.trim().toLowerCase()
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
          venditore: `${match.nome} ${match.cognome}`.trim(),
          venditore_nome: match.nome || "",
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
            <p className="text-sm text-muted-foreground">Un momento, stiamo trovando il tuo referente.</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <MessageCircle className="h-10 w-10 mx-auto text-emerald-500" />
            <h1 className="text-lg font-semibold">Apertura WhatsApp...</h1>
            <p className="text-sm text-muted-foreground">
              Ti stiamo mettendo in contatto con {venditore?.nome} {venditore?.cognome}.
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
