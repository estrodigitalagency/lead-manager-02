import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Lettura delle statistiche: la RLS non lascia leggere la tabella con la anon key, quindi
    // anche i conteggi devono passare da qui, altrimenti l'app mostra zero click comunque.
    if (corpo.azione === "stats") {
      const { data } = await supabaseSR()
        .from("whatsapp_click_logs")
        .select("clicked_at, lead_nome, lead_email, venditore_nome, status, error_reason")
        .eq("template_slug", corpo.slug ?? "")
        .order("clicked_at", { ascending: false }).limit(5000);
      const righe = data ?? [];
      const perSales: Record<string, any> = {};
      const perGiorno: Record<string, number> = {};
      let ok = 0, errori = 0;
      for (const r of righe) {
        const v = r.venditore_nome || "—";
        perSales[v] ??= { venditore: v, click: 0, ok: 0, fallback: 0, errore: 0 };
        perSales[v].click++;
        if (r.status === "ok") { ok++; perSales[v].ok++; }
        else if (r.status === "fallback") perSales[v].fallback++;
        else { errori++; perSales[v].errore++; }
        const g = String(r.clicked_at ?? "").slice(0, 10);
        if (g) perGiorno[g] = (perGiorno[g] || 0) + 1;
      }
      return json({
        totale: righe.length, ok, errori,
        perSales: Object.values(perSales).sort((a: any, b: any) => b.click - a.click),
        perGiorno: Object.keys(perGiorno).sort().map((day) => ({ day, n: perGiorno[day] })),
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
