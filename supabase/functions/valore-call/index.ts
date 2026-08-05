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

const HISTORY_MONTHS = 12; // storico letto dal foglio
const USE_MONTHS = 3;      // mesi UTILI (con call) da usare per cella

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

function monthKeys(now: Date, count: number): string[] {
  // ultimi `count` mesi fino al corrente incluso, dal più vecchio al corrente
  const keys: string[] = [];
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth(); // 0-based
  for (let k = count - 1; k >= 0; k--) {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch con retry su 429/5xx (exponential backoff) */
async function fetchRetry(url: string, headers: Record<string, string>, tries = 4): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers });
    if (res.status !== 429 && res.status < 500) return res;
    last = res;
    await sleep(400 * Math.pow(2, i) + Math.random() * 300); // 400,800,1600,3200ms + jitter
  }
  return last!;
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
    const noCache = url.searchParams.get("nocache") === "1";
    const CACHE_KEY = `valore_call_cache_${market}`;
    const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minuti

    // Cache: se fresh, ritorna subito (evita di rileggere 21 fogli Google ~15-30s)
    if (!noCache) {
      try {
        const { data: cRow } = await supabase.from("ranking_settings").select("value").eq("key", CACHE_KEY).maybeSingle();
        if (cRow?.value) {
          const cached = JSON.parse(cRow.value);
          if (cached?.ts && Date.now() - cached.ts < CACHE_TTL_MS && cached.payload) {
            return new Response(JSON.stringify({ ...cached.payload, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch { /* ignora, ricalcola */ }
    }

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

    const MKEYS = monthKeys(new Date(), HISTORY_MONTHS); // 12 mesi storico
    const token = await getAccessToken();
    const gh = { Authorization: "Bearer " + token };

    type Cell = { fatt: number; nette: number; fatte: number; vlead: number; inc: number; chiu: number };
    const newAgg = () => {
      const a: Record<string, Record<string, Cell>> = {};
      for (const b of BUCKETS) {
        a[b] = {};
        for (const mk of MKEYS) a[b][mk] = { fatt: 0, nette: 0, fatte: 0, vlead: 0, inc: 0, chiu: 0 };
      }
      return a;
    };
    // globale + per venditore
    const agg = newAgg();
    const aggSeller: Record<string, Record<string, Record<string, Cell>>> = {};
    const unmapped: Record<string, number> = {};
    let usedSellers = 0;
    const errors: string[] = [];

    // Concorrenza ridotta (3) + retry per evitare 429 di Google Sheets.
    // 1 sola chiamata per venditore: values diretto sul tab. Se il tab non esiste → 400 (skip silenzioso).
    const conc = 3;
    const list = (vend || []).filter((v) => v.sheets_file_id);
    for (let i = 0; i < list.length; i += conc) {
      const chunk = list.slice(i, i + conc);
      await Promise.all(chunk.map(async (v) => {
        // sanitize: rimuove slash/spazi/caratteri non validi dall'ID foglio
        const sid = String(v.sheets_file_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        if (!sid) { errors.push(`${v.nome}: sheet_file_id vuoto`); return; }
        try {
          const valRes = await fetchRetry(
            `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent("Analytics Fonte!A2:AD")}`,
            gh,
          );
          if (valRes.status === 400) return; // tab "Analytics Fonte" inesistente → skip
          if (!valRes.ok) { errors.push(`${v.nome}: values ${valRes.status}`); return; }
          const vals = (await valRes.json()).values as any[][] | undefined;
          if (!vals || vals.length === 0) return;
          usedSellers++;
          const sellerName = `${v.nome} ${v.cognome || ""}`.trim();
          if (!aggSeller[sellerName]) aggSeller[sellerName] = newAgg();

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
            // D=3 Fatturato | E=4 Incassato | T=19 Call fatte | X=23 Call nette | Y=24 Chiusure | AD=29 Valore Lead
            const f = euro(cell(3)), inc = euro(cell(4)), nt = euro(cell(23)), ft = euro(cell(19)), chiu = euro(cell(24)), vl = euro(cell(29));
            agg[b][mk].fatt += f; agg[b][mk].inc += inc; agg[b][mk].nette += nt; agg[b][mk].fatte += ft; agg[b][mk].chiu += chiu; agg[b][mk].vlead += vl;
            const sa = aggSeller[sellerName][b][mk];
            sa.fatt += f; sa.inc += inc; sa.nette += nt; sa.fatte += ft; sa.chiu += chiu; sa.vlead += vl;
          }
        } catch (e) {
          errors.push(`${v.nome}: ${(e as Error).message}`);
        }
      }));
    }

    // Helper: costruisce l'array bucket da una aggregazione.
    // Per ogni bucket prende SOLO i mesi con call (n_call>0), poi gli ultimi USE_MONTHS
    // più recenti. Se 0 mesi con call → has_call=false ("no call").
    const buildBuckets = (a: Record<string, Record<string, Cell>>) =>
      cfg.buckets.map((bdef) => {
        const b = bdef.id;
        // tutti i mesi dello storico con call effettive, ordine cronologico (vecchio→nuovo)
        const withCall = MKEYS
          .map((mk) => ({ mese: mk, ...a[b][mk] }))
          .filter((m) => m.fatte > 0);
        // ultimi USE_MONTHS mesi utili
        const utili = withCall.slice(-USE_MONTHS);
        const mesi = utili.map((m) => ({
          mese: m.mese,
          valore_call: m.fatte > 0 ? Math.round(m.fatt / m.fatte) : 0,
          n_call: Math.round(m.fatte),
          fatturato: Math.round(m.fatt),
          incassato: Math.round(m.inc),
          call_nette: Math.round(m.nette),
          chiusure: Math.round(m.chiu),
          cr: m.nette > 0 ? Math.round((m.chiu / m.nette) * 1000) / 10 : 0,
          valore_lead: Math.round(m.vlead),
        }));
        const totFatt = utili.reduce((s, m) => s + m.fatt, 0);
        const totFatte = utili.reduce((s, m) => s + m.fatte, 0);
        const totVlead = utili.reduce((s, m) => s + m.vlead, 0);
        const totInc = utili.reduce((s, m) => s + m.inc, 0);
        const totNette = utili.reduce((s, m) => s + m.nette, 0);
        const totChiu = utili.reduce((s, m) => s + m.chiu, 0);
        return {
          bucket: b,
          label: bdef.label,
          has_call: totFatte > 0,
          valore_call: totFatte > 0 ? Math.round(totFatt / totFatte) : 0,
          n_call: Math.round(totFatte),
          valore_lead: Math.round(totVlead),
          fatturato: Math.round(totFatt),
          incassato: Math.round(totInc),
          cr: totNette > 0 ? Math.round((totChiu / totNette) * 1000) / 10 : 0, // % chiusure/call nette
          trend: trend(mesi.map((m) => m.valore_call)),
          mesi, // solo mesi utili (max USE_MONTHS)
        };
      });

    const result = buildBuckets(agg);
    const perSeller = Object.entries(aggSeller)
      .map(([venditore, a]) => ({ venditore, data: buildBuckets(a) }))
      .sort((x, y) => x.venditore.localeCompare(y.venditore));

    const payload = {
      market,
      history_months: HISTORY_MONTHS,
      use_months: USE_MONTHS,
      sellers_used: usedSellers,
      sellers_total: list.length,
      data: result,
      per_seller: perSeller,
      unmapped,
      errors: errors.slice(0, 20),
      generated_at: new Date().toISOString(),
    };

    // Salva cache (best effort)
    try {
      await supabase.from("ranking_settings").upsert(
        { key: CACHE_KEY, value: JSON.stringify({ ts: Date.now(), payload }), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    } catch { /* no-op */ }

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
