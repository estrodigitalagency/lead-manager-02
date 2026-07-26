import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Valore Call / Valore Lead per fonte — ultimi N mesi, live dai fogli venditore.
 *
 * Logica (dal prototipo Matteo 2026-07-24):
 *   - Legge tab "Analytics Fonte" di ogni foglio venditore (venditori.sheets_file_id)
 *     col B = data (DD/MM/YYYY o MM/YYYY) | C = Provenienza | D Fatturato | T(19) Call fatte
 *     X(23) Call nette | AD(29) Valore Lead
 *   - Bucket fonte: 3sfere | setter_ig | setter_new | vsl | outbound
 *   - valore_call = Fatturato(D) / Call fatte(T)
 *   - trend su N mesi via slope
 *   - valore_lead = AD (outbound)
 *
 * Google OAuth (refresh token) letto dai secret dell'edge function.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N_MONTHS = 3;

interface BucketDef { id: string; label: string; sources: string[]; }
interface BucketConfig { buckets: BucketDef[]; ignore: string[]; }

const DEFAULT_CONFIG: BucketConfig = {
  buckets: [
    { id: "3sfere", label: "3Sfere", sources: ["3sfere"] },
    { id: "setter_ig", label: "Setter IG", sources: ["typeform", "setter", "setter ig", "setter_ig"] },
    { id: "setter_new", label: "Setter New", sources: ["setter_new", "setter new"] },
    { id: "vsl", label: "VSL / Funnel", sources: ["vsl*", "guida*", "mail", "email", "funnel video", "podcast"] },
    { id: "outbound", label: "Outbound", sources: ["outbound"] },
  ],
  ignore: ["totale", "rischedulate", "upsell", "altro"],
};

/** Match fonte → bucket. Supporta wildcard prefisso con '*' (es. "vsl*"). */
function makeBucketMatcher(cfg: BucketConfig) {
  return (src: string): string | null => {
    const s = src.trim().toLowerCase();
    if (!s) return null;
    for (const b of cfg.buckets) {
      for (const pat of b.sources) {
        const p = pat.trim().toLowerCase();
        if (!p) continue;
        if (p.endsWith("*")) {
          if (s.startsWith(p.slice(0, -1))) return b.id;
        } else if (s === p) {
          return b.id;
        }
      }
    }
    return null;
  };
}

function euro(x: unknown): number {
  let s = String(x ?? "").replace(/€|%| /g, "").trim();
  if (!s || s === "-") return 0;
  s = s.replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function mkey(dcell: unknown): string | null {
  const s = String(dcell ?? "");
  let m = s.match(/\d{1,2}\/(\d{2})\/(\d{4})/); // DD/MM/YYYY
  if (m) return `${m[1]}/${m[2]}`;
  m = s.match(/(\d{2})\/(\d{4})/); // MM/YYYY
  if (m) return `${m[1]}/${m[2]}`;
  return null;
}

function monthKeys(now: Date): string[] {
  // ultimi N mesi fino al corrente incluso, dal più vecchio al corrente
  const keys: string[] = [];
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth(); // 0-based
  for (let k = N_MONTHS - 1; k >= 0; k--) {
    const idx = y * 12 + mo - k;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    keys.push(`${String(mm).padStart(2, "0")}/${yy}`);
  }
  return keys;
}

function trend(series: number[]): string {
  const xs = series.filter((v) => v != null);
  if (xs.length < 2) return "—";
  const n = xs.length;
  const sx = (n * (n - 1)) / 2;
  const sy = xs.reduce((a, b) => a + b, 0);
  const sxx = Array.from({ length: n }, (_, i) => i * i).reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, v, i) => a + i * v, 0);
  const den = n * sxx - sx * sx;
  if (den === 0) return "—";
  const slope = (n * sxy - sx * sy) / den;
  if (slope > 1) return "asc";
  if (slope < -1) return "desc";
  return "stable";
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN")!,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("OAuth token error: " + JSON.stringify(j));
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const market = (url.searchParams.get("market") || "IT").toUpperCase();

    // Carica config bucket dal DB (customizzabile via UI), fallback al default
    let cfg = DEFAULT_CONFIG;
    try {
      const { data: cfgRow } = await supabase
        .from("ranking_settings")
        .select("value")
        .eq("key", "valore_call_buckets")
        .maybeSingle();
      if (cfgRow?.value) {
        const parsed = JSON.parse(cfgRow.value);
        if (parsed?.buckets?.length) cfg = parsed;
      }
    } catch { /* usa default */ }
    const BUCKETS = cfg.buckets.map((b) => b.id);
    const IGNORE = (cfg.ignore || []).map((x) => x.trim().toLowerCase());
    const bucketOf = makeBucketMatcher(cfg);

    // Venditori attivi, SOLO sales (is_sales=true), con foglio
    const { data: vend, error: vErr } = await supabase
      .from("venditori")
      .select("nome, cognome, sheets_file_id, stato, market, is_sales")
      .eq("market", market)
      .eq("stato", "attivo")
      .eq("is_sales", true)
      .not("sheets_file_id", "is", null);
    if (vErr) throw vErr;

    const MKEYS = monthKeys(new Date());
    const token = await getAccessToken();
    const gh = { Authorization: "Bearer " + token };

    // agg[bucket][mkey] = { fatt, nette, fatte, vlead }
    const agg: Record<string, Record<string, { fatt: number; nette: number; fatte: number; vlead: number }>> = {};
    for (const b of BUCKETS) {
      agg[b] = {};
      for (const mk of MKEYS) agg[b][mk] = { fatt: 0, nette: 0, fatte: 0, vlead: 0 };
    }
    const unmapped: Record<string, number> = {};
    let usedSellers = 0;
    const errors: string[] = [];

    // Concorrenza limitata
    const conc = 6;
    const list = (vend || []).filter((v) => v.sheets_file_id);
    for (let i = 0; i < list.length; i += conc) {
      const chunk = list.slice(i, i + conc);
      await Promise.all(chunk.map(async (v) => {
        const sid = v.sheets_file_id as string;
        try {
          // Verifica esistenza tab
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties.title`,
            { headers: gh },
          );
          if (!metaRes.ok) { errors.push(`${v.nome}: meta ${metaRes.status}`); return; }
          const meta = await metaRes.json();
          const tabs: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
          if (!tabs.includes("Analytics Fonte")) return;

          const valRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent("Analytics Fonte!A2:AD")}`,
            { headers: gh },
          );
          if (!valRes.ok) { errors.push(`${v.nome}: values ${valRes.status}`); return; }
          const vals = (await valRes.json()).values as any[][] | undefined;
          if (!vals || vals.length === 0) return;
          usedSellers++;

          for (const row of vals) {
            if (row.length < 4) continue;
            const mk = mkey(row[1]);
            if (!mk || !MKEYS.includes(mk)) continue;
            const src = String(row[2] ?? "");
            const b = bucketOf(src);
            if (!b) {
              const low = src.trim().toLowerCase();
              if (low && !IGNORE.includes(low)) {
                unmapped[low] = (unmapped[low] || 0) + 1;
              }
              continue;
            }
            const cell = (idx: number) => (row.length > idx ? row[idx] : "");
            agg[b][mk].fatt += euro(cell(3));
            agg[b][mk].nette += euro(cell(23));
            agg[b][mk].fatte += euro(cell(19));
            agg[b][mk].vlead += euro(cell(29));
          }
        } catch (e) {
          errors.push(`${v.nome}: ${(e as Error).message}`);
        }
      }));
    }

    // Costruisci risultato
    const result = cfg.buckets.map((bdef) => {
      const b = bdef.id;
      const perMonth = MKEYS.map((mk) => {
        const d = agg[b][mk];
        return {
          mese: mk,
          valore_call: d.fatte > 0 ? Math.round(d.fatt / d.fatte) : 0,
          n_call: Math.round(d.fatte),
          fatturato: Math.round(d.fatt),
          call_nette: Math.round(d.nette),
          valore_lead: Math.round(d.vlead),
        };
      });
      const vcSeries = perMonth.map((m) => m.valore_call);
      return { bucket: b, label: bdef.label, mesi: perMonth, trend: trend(vcSeries) };
    });

    return new Response(JSON.stringify({
      market,
      months: MKEYS,
      sellers_used: usedSellers,
      sellers_total: list.length,
      data: result,
      unmapped,
      errors: errors.slice(0, 20),
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
