import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, MessageCircle } from "lucide-react";

/**
 * Redirect pubblico: legge nome/email/telefono da query string,
 * cerca il venditore assegnato al lead nel DB, apre WhatsApp del venditore.
 *
 * URL supportati:
 *   /wa?email=X@Y.com
 *   /wa?telefono=+393401234567
 *   /wa?email=X&nome=Mario&telefono=... (tutti opzionali, basta email o telefono)
 *   /wa?market=IT (opzionale, default IT)
 *   /wa?text=... (testo pre-compilato opzionale, altrimenti default)
 */
const digitsOnly = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

/**
 * Normalizza telefono in E.164 senza prefisso + iniziale.
 * Casi gestiti:
 * - "+39 340 123 4567" → "393401234567"
 * - "3401234567" (IT senza prefisso) → assume 39 + prefixIfMissing
 * - "0039 340..." → "39340..."
 * - "0034 6..." (ES) → "346..."
 */
const normalizePhone = (phone: string, defaultCountryCode = "39"): string => {
  let d = digitsOnly(phone);
  if (!d) return "";
  // strip leading 00
  if (d.startsWith("00")) d = d.slice(2);
  // se lunghezza <= 10 assume mancante country code
  if (d.length <= 10 && !d.startsWith(defaultCountryCode)) {
    d = defaultCountryCode + d;
  }
  return d;
};

const buildDefaultMessage = (nomeLead: string) => {
  const nome = nomeLead ? nomeLead.trim().split(/\s+/)[0] : "";
  if (nome) return `Ciao ${nome}, grazie per esserti registrato/a! Ti scrivo qui su WhatsApp.`;
  return "Ciao, grazie per esserti registrato/a! Ti scrivo qui su WhatsApp.";
};

const WhatsAppRedirect = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [venditore, setVenditore] = useState<{ nome: string; cognome: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const email = (params.get("email") || "").trim().toLowerCase();
        const telParam = params.get("telefono") || params.get("phone") || "";
        const nome = params.get("nome") || "";
        const marketParam = (params.get("market") || "IT").toUpperCase();
        const market = marketParam === "ES" ? "ES" : "IT";
        const defaultCountry = market === "ES" ? "34" : "39";
        const phoneNorm = normalizePhone(telParam, defaultCountry);
        const customText = params.get("text") || "";

        if (!email && !phoneNorm) {
          setStatus("error");
          setErrorMsg("Parametri mancanti: serve almeno email o telefono.");
          return;
        }

        // Cerca lead più recente per email o telefono nel mercato
        let lead: any = null;
        if (email) {
          const { data } = await supabase
            .from("lead_generation")
            .select("id, venditore, market, created_at, telefono, email, nome, cognome")
            .eq("market", market)
            .ilike("email", email)
            .not("venditore", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);
          lead = data?.[0] || null;
        }
        if (!lead && phoneNorm) {
          // Cerca con match ultimi 9 digits (tollera prefissi + spazi in DB)
          const suffix = phoneNorm.slice(-9);
          const { data } = await supabase
            .from("lead_generation")
            .select("id, venditore, market, created_at, telefono, email, nome, cognome")
            .eq("market", market)
            .ilike("telefono", `%${suffix}%`)
            .not("venditore", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);
          lead = data?.[0] || null;
        }

        if (!lead || !lead.venditore) {
          setStatus("error");
          setErrorMsg("Nessun venditore assegnato trovato per questo lead.");
          return;
        }

        // Fetch venditore.telefono per lo stesso mercato
        const parts = lead.venditore.trim().split(/\s+/);
        const nomeVend = parts[0] || "";
        const cognomeVend = parts.slice(1).join(" ") || "";
        const { data: vendList } = await supabase
          .from("venditori")
          .select("nome, cognome, telefono, stato")
          .eq("market", lead.market)
          .eq("stato", "attivo");
        const match = (vendList || []).find(
          (v: any) =>
            (`${v.nome} ${v.cognome}`.trim().toLowerCase()) === lead.venditore.trim().toLowerCase() ||
            (v.nome?.toLowerCase() === nomeVend.toLowerCase() && (v.cognome || "").toLowerCase() === cognomeVend.toLowerCase())
        );

        if (!match || !match.telefono) {
          setStatus("error");
          setErrorMsg(`Venditore ${lead.venditore} non ha telefono configurato.`);
          return;
        }

        const vendPhone = normalizePhone(match.telefono, defaultCountry);
        if (!vendPhone) {
          setStatus("error");
          setErrorMsg("Numero venditore non valido.");
          return;
        }

        const nomeForMsg = nome || lead.nome || "";
        const text = encodeURIComponent(customText || buildDefaultMessage(nomeForMsg));
        const waUrl = `https://wa.me/${vendPhone}?text=${text}`;

        setVenditore({ nome: match.nome, cognome: match.cognome });
        setStatus("redirecting");
        // Redirect immediato
        window.location.replace(waUrl);
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMsg("Errore imprevisto. Riprova o contatta l'assistenza.");
      }
    };
    run();
  }, [params]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4 p-6 rounded-2xl border bg-card">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
            <h1 className="text-lg font-semibold">Ti stiamo indirizzando...</h1>
            <p className="text-sm text-muted-foreground">
              Un momento, stiamo trovando il tuo referente.
            </p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <MessageCircle className="h-10 w-10 mx-auto text-emerald-500" />
            <h1 className="text-lg font-semibold">Apertura WhatsApp...</h1>
            <p className="text-sm text-muted-foreground">
              Ti stiamo mettendo in contatto con {venditore?.nome} {venditore?.cognome}.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Se non si apre automaticamente ricarica la pagina.
            </p>
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
