// Utility: elenca i tab dei fogli dei venditori (per configurare le viste "lancio").
// GET ?market=IT            → tutti i venditori attivi con i loro tab
// GET ?sheet=<spreadsheetId> → i tab di un singolo foglio
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("OAuth failed");
  return j.access_token;
}

async function tabsOf(sid: string, token: string): Promise<string[]> {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`sheets ${r.status}`);
  const j = await r.json();
  return (j.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const token = await getAccessToken();
    const single = url.searchParams.get("sheet");
    if (single) {
      return new Response(JSON.stringify({ sheet: single, tabs: await tabsOf(single, token) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const market = (url.searchParams.get("market") || "IT").toUpperCase();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: vend } = await supabase
      .from("venditori")
      .select("nome, cognome, sheets_file_id")
      .eq("market", market).eq("stato", "attivo").eq("is_sales", true)
      .not("sheets_file_id", "is", null);

    const out: any[] = [];
    for (const v of vend ?? []) {
      const sid = String(v.sheets_file_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!sid) continue;
      try {
        out.push({ venditore: `${v.nome} ${v.cognome || ""}`.trim(), sheet: sid, tabs: await tabsOf(sid, token) });
      } catch (e) {
        out.push({ venditore: `${v.nome} ${v.cognome || ""}`.trim(), sheet: sid, error: (e as Error).message });
      }
    }
    return new Response(JSON.stringify({ market, sellers: out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
