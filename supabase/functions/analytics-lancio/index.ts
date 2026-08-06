/**
 * analytics-lancio — riproduce la matrice "Analytics <Lancio>" del master Google Sheet
 * leggendo direttamente i fogli dei venditori via API (niente IMPORTRANGE, quindi non si rompe).
 *
 * Logica ricavata dalle formule del master (verificata 1:1 su Workshop_Giu26):
 *   tab CALL  (es. "Giugno26 Elenco call/esito", range B:L)
 *     col B(0)=provenienza | H(6)=Esito chiamata | K(9)=prezzo | L(10)=incassato
 *     - Call Totali  = righe con provenienza == <provenienza lancio> (su TUTTI i mesi configurati)
 *     - Call da Fare = di quelle, esito contiene "closing"
 *     - Call Nette   = Totali − esito ~ (da rischedulare|rischedulato|no show|cancellat) − Call da Fare
 *     - Chiusure     = esito ∈ (pagamento a rate|pagamento unico|acconto)
 *     - Fatturato    = Σ prezzo delle chiusure     | Incassato = Σ incassato delle chiusure
 *   tab LEAD (es. "Lead Workshop_Giu26", range B:G)
 *     col B(0)=Nome (presenza = lead assegnato) | G(5)=Qualifica
 *     - <qualifica> = COUNTIF(qualifica == etichetta)
 *     - Non lavorato = righe con Nome − Σ(altre qualifiche)
 *     - Tot Lead Assegnati = Σ qualifiche (incl. Non lavorato)
 *
 * GET ?lancio=<id>&market=IT[&nocache=1]
 * Config dei lanci in ranking_settings.key = "lanci_config" (JSON array).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 5 * 60 * 1000;

// Etichette qualifica lead, nell'ordine del master (Non lavorato è calcolata, non contata).
const QUALIFICHE = [
  "Confermato",
  "Fix App",
  "In gestione / N. Risposta",
  "2° Follow Up Video  Mandato",
  "3° Follow Up Video  Mandato",
  "Numero inesistente",
  "Non partecipa",
  "Già Studente",
  "Duplicato",
];

const RE_CHIUSURA = /^(pagamento a rate|pagamento unico|acconto)$/i;
const RE_NON_NETTA = /da rischedulare|rischedulato|no show|cancellat/i;
const RE_DA_FARE = /closing/i;

interface LancioConfig {
  id: string;
  nome: string;
  provenienza: string;      // es. "3sfere"
  call_tabs: string[];      // es. ["Giugno26 Elenco call/esito", "Luglio26 Elenco call/esito"]
  lead_tab: string;         // es. "Lead Workshop_Giu26"
  target?: Record<string, number>;
}

function euro(x: unknown): number {
  let s = String(x ?? "").replace(/[€%\s]/g, "").trim();
  if (!s || s === "-") return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

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
  if (!j.access_token) throw new Error("OAuth token failed");
  return j.access_token;
}

async function fetchRetry(url: string, headers: Record<string, string>, tries = 6): Promise<Response> {
  let delay = 700;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers });
    if (r.status !== 429 && r.status < 500) return r;
    await new Promise((res) => setTimeout(res, delay));
    delay *= 2;
  }
  return fetch(url, { headers });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const market = (url.searchParams.get("market") || "IT").toUpperCase();
    const lancioId = url.searchParams.get("lancio") || "";
    const noCache = url.searchParams.get("nocache") === "1";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Config lanci (in system_settings: scrivibile dall'app con la anon key)
    const { data: cfgRow } = await supabase
      .from("system_settings").select("value").eq("key", "lanci_config").maybeSingle();
    let lanci: LancioConfig[] = [];
    try { lanci = JSON.parse(cfgRow?.value || "[]"); } catch { lanci = []; }

    if (!lancioId) {
      return new Response(JSON.stringify({ lanci: lanci.map((l) => ({ id: l.id, nome: l.nome })) }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const cfg = lanci.find((l) => l.id === lancioId);
    if (!cfg) throw new Error(`Lancio "${lancioId}" non configurato`);

    // Cache
    const CACHE_KEY = `lancio_cache_${market}_${lancioId}`;
    if (!noCache) {
      const { data: c } = await supabase
        .from("ranking_settings").select("value").eq("key", CACHE_KEY).maybeSingle();
      if (c?.value) {
        try {
          const parsed = JSON.parse(c.value);
          if (Date.now() - parsed.ts < CACHE_TTL_MS) {
            return new Response(JSON.stringify({ ...parsed.payload, cached: true }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        } catch { /* ricalcola */ }
      }
    }

    const { data: vend } = await supabase
      .from("venditori")
      .select("nome, cognome, sheets_file_id")
      .eq("market", market).eq("stato", "attivo").eq("is_sales", true)
      .not("sheets_file_id", "is", null);

    const token = await getAccessToken();
    const gh = { Authorization: `Bearer ${token}` };
    const prov = cfg.provenienza.trim().toLowerCase();
    const errors: string[] = [];

    const rows: any[] = [];
    const list = vend ?? [];
    const CONC = 2;
    for (let i = 0; i < list.length; i += CONC) {
      await Promise.all(list.slice(i, i + CONC).map(async (v) => {
        const sid = String(v.sheets_file_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const nome = `${v.nome} ${v.cognome || ""}`.trim();
        if (!sid) return;
        try {
          const wanted = [
            ...cfg.call_tabs.map((t) => ({ tab: t, rng: "B2:L1000" })),
            { tab: cfg.lead_tab, rng: "B2:G1000" },
          ];
          // Caso normale: una sola batchGet. Se un tab non esiste l'API risponde 400 →
          // fallback su letture singole, saltando i tab mancanti (senza chiamata meta extra).
          const qs = wanted.map((w) => `ranges=${encodeURIComponent(`${w.tab}!${w.rng}`)}`).join("&");
          const res = await fetchRetry(
            `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values:batchGet?${qs}`, gh,
          );
          let vr: any[];
          if (res.ok) {
            vr = (await res.json()).valueRanges ?? [];
          } else if (res.status === 400) {
            const missing: string[] = [];
            vr = [];
            for (const w of wanted) {
              const r1 = await fetchRetry(
                `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`${w.tab}!${w.rng}`)}`, gh,
              );
              if (r1.ok) vr.push(await r1.json());
              else { vr.push(undefined); missing.push(w.tab); }
            }
            if (missing.length) errors.push(`${nome}: tab mancanti (${missing.join(", ")})`);
            if (vr.every((x) => !x)) return;
          } else {
            errors.push(`${nome}: sheets ${res.status}`);
            return;
          }

          // ── CALL ──
          let tot = 0, daFare = 0, nonNette = 0, chiusure = 0, fatturato = 0, incassato = 0;
          for (let k = 0; k < cfg.call_tabs.length; k++) {
            for (const r of (vr[k]?.values ?? []) as any[][]) {
              if (String(r[0] ?? "").trim().toLowerCase() !== prov) continue;
              tot++;
              const esito = String(r[6] ?? "").trim();
              if (RE_DA_FARE.test(esito)) daFare++;
              else if (RE_NON_NETTA.test(esito)) nonNette++;
              if (RE_CHIUSURA.test(esito)) {
                chiusure++;
                fatturato += euro(r[9]);
                incassato += euro(r[10]);
              }
            }
          }
          const nette = tot - nonNette - daFare;

          // ── LEAD ──
          const leadVals = (vr[cfg.call_tabs.length]?.values ?? []) as any[][];
          const qual: Record<string, number> = {};
          for (const q of QUALIFICHE) qual[q] = 0;
          let conNome = 0;
          for (const r of leadVals) {
            if (String(r[0] ?? "").trim()) conNome++;
            const q = String(r[5] ?? "").trim();
            if (q && q in qual) qual[q]++;
          }
          const sommaQual = QUALIFICHE.reduce((s, q) => s + qual[q], 0);
          const nonLavorato = Math.max(0, conNome - sommaQual);
          const totLead = sommaQual + nonLavorato;
          const target = cfg.target?.[nome] ?? 0;

          rows.push({
            venditore: nome,
            fatturato, incassato, chiusure,
            call_totali: tot, call_da_fare: daFare, call_nette: nette,
            nette_su_totali: tot > 0 ? Math.round((nette / tot) * 1000) / 10 : 0,
            valore_lead_fatt: totLead > 0 ? Math.round(fatturato / totLead) : 0,
            valore_lead_inc: totLead > 0 ? Math.round(incassato / totLead) : 0,
            tasso_prenotazione: totLead > 0 ? Math.round((tot / totLead) * 1000) / 10 : 0,
            tasso_chiusura_call: tot > 0 ? Math.round((chiusure / tot) * 1000) / 10 : 0,
            tasso_chiusura_nette: nette > 0 ? Math.round((chiusure / nette) * 1000) / 10 : 0,
            target, distanza_target: target - totLead,
            tot_lead: totLead,
            qualifiche: { "Non lavorato": nonLavorato, ...qual },
          });
        } catch (e) {
          errors.push(`${nome}: ${(e as Error).message}`);
        }
      }));
    }

    rows.sort((a, b) => b.fatturato - a.fatturato);
    const totLeadTeam = rows.reduce((s, r) => s + r.tot_lead, 0);
    for (const r of rows) r.distribuzione = totLeadTeam > 0 ? Math.round((r.tot_lead / totLeadTeam) * 1000) / 10 : 0;

    const sum = (f: (r: any) => number) => rows.reduce((s, r) => s + f(r), 0);
    const totCall = sum((r) => r.call_totali), totNette = sum((r) => r.call_nette);
    const totChius = sum((r) => r.chiusure), totFatt = sum((r) => r.fatturato);
    const totale = {
      venditore: "Totale",
      fatturato: totFatt, incassato: sum((r) => r.incassato), chiusure: totChius,
      call_totali: totCall, call_da_fare: sum((r) => r.call_da_fare), call_nette: totNette,
      nette_su_totali: totCall > 0 ? Math.round((totNette / totCall) * 1000) / 10 : 0,
      valore_lead_fatt: totLeadTeam > 0 ? Math.round(totFatt / totLeadTeam) : 0,
      valore_lead_inc: totLeadTeam > 0 ? Math.round(sum((r) => r.incassato) / totLeadTeam) : 0,
      tasso_prenotazione: totLeadTeam > 0 ? Math.round((totCall / totLeadTeam) * 1000) / 10 : 0,
      tasso_chiusura_call: totCall > 0 ? Math.round((totChius / totCall) * 1000) / 10 : 0,
      tasso_chiusura_nette: totNette > 0 ? Math.round((totChius / totNette) * 1000) / 10 : 0,
      target: sum((r) => r.target), distanza_target: sum((r) => r.target) - totLeadTeam,
      tot_lead: totLeadTeam, distribuzione: 100,
      qualifiche: ["Non lavorato", ...QUALIFICHE].reduce((acc, q) => {
        acc[q] = rows.reduce((s, r) => s + (r.qualifiche[q] || 0), 0); return acc;
      }, {} as Record<string, number>),
    };

    const payload = {
      market, lancio: { id: cfg.id, nome: cfg.nome, provenienza: cfg.provenienza, call_tabs: cfg.call_tabs, lead_tab: cfg.lead_tab },
      qualifiche_order: ["Non lavorato", ...QUALIFICHE],
      totale, rows, errors: errors.slice(0, 20),
      generated_at: new Date().toISOString(),
    };

    await supabase.from("ranking_settings").upsert(
      { key: CACHE_KEY, value: JSON.stringify({ ts: Date.now(), payload }), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

    return new Response(JSON.stringify(payload), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
