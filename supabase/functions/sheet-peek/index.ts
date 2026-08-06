// Utility di ispezione: legge un range di un tab dal foglio di un venditore.
// GET ?venditore=giusy&tab=Lead Workshop_Giu26&range=A1:Z10
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
async function token(): Promise<string> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "", client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "", refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "", grant_type: "refresh_token" }),
  });
  const j = await r.json(); if (!j.access_token) throw new Error("OAuth failed"); return j.access_token;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const u = new URL(req.url);
    const tab = u.searchParams.get("tab") ?? "Analytics Fonte";
    const range = u.searchParams.get("range") ?? "A1:AF12";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let sid = u.searchParams.get("sheet") ?? "";
    if (!sid) {
      const { data } = await supabase.from("venditori").select("nome,cognome,sheets_file_id").ilike("nome", `%${u.searchParams.get("venditore") ?? "giusy"}%`).limit(1);
      sid = String(data?.[0]?.sheets_file_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    }
    const t = await token();
    const fx = u.searchParams.get("formula") === "1" ? "?valueRenderOption=FORMULA" : "";
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`${tab}!${range}`)}${fx}`, { headers: { Authorization: `Bearer ${t}` } });
    const j = await r.json();
    return new Response(JSON.stringify({ sheet: sid, tab, status: r.status, values: j.values ?? [], error: j.error?.message }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
