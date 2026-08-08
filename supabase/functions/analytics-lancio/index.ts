/**
 * analytics-lancio — riproduce la matrice "Analytics <Lancio>" del master Google Sheet
 * leggendo direttamente i fogli dei venditori via API (niente IMPORTRANGE, quindi non si rompe).
 *
 * Logica ricavata dalle formule del master (verificata 1:1 su Workshop_Giu26):
 *   tab CALL  (es. "Giugno26 Elenco call/esito", range B:L)
 *     col B(0)=provenienza | H(6)=Esito chiamata | K(9)=prezzo | L(10)=incassato
 *     - Call Totali  = righe con provenienza == <provenienza lancio> (su TUTTI i mesi configurati)
 *     - Call da Fare = di quelle, esito ancora vuoto (entrate − fatte)
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

const CACHE_FRESH_MS = 15 * 60 * 1000;   // entro 15 min: cache servita così com'è
const CACHE_STALE_MS = 12 * 60 * 60 * 1000; // fino a 12h: cache servita subito + ricalcolo in background

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
// Call da fare = entrate con quella provenienza ma non ancora svolte: esito vuoto, oppure
// "prenotato closing"/"closing" (su Pipedrive la call è fissata ma non è ancora stata fatta).
const RE_DA_FARE = /closing/i;
const daFareTest = (esito: string) => esito.trim() === "" || RE_DA_FARE.test(esito);

// Voto qualità lead (col H del tab Lead). Il peso è il numero iniziale dell'etichetta.
const VOTI = ["1 - Lontano", "2 - IB", "3 - CP", "4 - ISF", "5 - MM"];

interface LancioConfig {
  id: string;
  nome: string;
  provenienza: string;      // es. "3sfere"
  call_tabs: string[];      // es. ["Giugno26 Elenco call/esito", "Luglio26 Elenco call/esito"]
  lead_tab: string;         // es. "Lead Workshop_Giu26"
  campagna?: string;        // campagna in lead_generation per i lead generati (es. "Workshop Giu26")
  target?: Record<string, number>;
  sales?: string[];         // legacy
  lead_sales?: string[];    // venditori da cui leggere il tab lead (vuoto = tutti)
  call_sales?: string[];    // venditori da cui leggere i tab call (vuoto = tutti)
}

// Scaglioni di attesa fra l'ingresso del lead e l'assegnazione al venditore.
const SCAGLIONI: { l: string; max: number }[] = [
  { l: "< 1 min", max: 60 },
  { l: "1–5 min", max: 300 },
  { l: "5–60 min", max: 3600 },
  { l: "1–24 h", max: 86400 },
  { l: "> 24 h", max: Infinity },
];

const mediana = (v: number[]) => {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Lead generati dal DB per la campagna del lancio: totali, per fonte (nuovi/vecchi) e per giorno. */
async function leadGenerati(supabase: any, campagna: string, market: string) {
  const perFonte: Record<string, { Nuovo: number; Vecchio: number }> = {};
  const perGiorno: Record<string, Record<string, number>> = {};
  // coorte per giorno d'ingresso: quanti entrati, quanti poi assegnati, quanti hanno prenotato,
  // e i tempi di attesa (in secondi) per la mediana giornaliera
  const coorte: Record<string, { entrati: number; assegnati: number; prenotati: number; attese: number[] }> = {};
  const attese: number[] = [];
  const scaglioni = SCAGLIONI.map((s) => ({ label: s.l, n: 0 }));
  let generati = 0, assegnati = 0, prenotati = 0, mai = 0;

  for (let off = 0; off < 40000; off += 1000) {
    const { data } = await supabase
      .from("lead_generation")
      .select("created_at, ultima_fonte, stato_del_lead, venditore, data_assegnazione, booked_call")
      .eq("campagna", campagna).eq("market", market)
      .order("created_at").range(off, off + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      generati++;
      const fonte = r.ultima_fonte || "—";
      const stato = r.stato_del_lead === "Vecchio" ? "Vecchio" : "Nuovo";
      if (!perFonte[fonte]) perFonte[fonte] = { Nuovo: 0, Vecchio: 0 };
      perFonte[fonte][stato]++;

      const day = String(r.created_at ?? "").slice(0, 10);
      if (day) {
        if (!perGiorno[day]) perGiorno[day] = {};
        perGiorno[day][fonte] = (perGiorno[day][fonte] || 0) + 1;
        if (!coorte[day]) coorte[day] = { entrati: 0, assegnati: 0, prenotati: 0, attese: [] };
        coorte[day].entrati++;
      }

      const booked = String(r.booked_call ?? "").trim().toUpperCase() === "SI";
      if (booked) { prenotati++; if (day) coorte[day].prenotati++; }

      if (r.venditore) {
        assegnati++;
        if (day) coorte[day].assegnati++;
        const t0 = Date.parse(r.created_at ?? ""), t1 = Date.parse(r.data_assegnazione ?? "");
        if (isFinite(t0) && isFinite(t1) && t1 >= t0) {
          const sec = (t1 - t0) / 1000;
          attese.push(sec);
          if (day) coorte[day].attese.push(sec);
          scaglioni[SCAGLIONI.findIndex((s) => sec < s.max)].n++;
        }
      } else mai++;
    }
    if (data.length < 1000) break;
  }

  const days = Object.keys(perGiorno).sort();
  const fonti = Object.keys(perFonte).sort((a, b) =>
    (perFonte[b].Nuovo + perFonte[b].Vecchio) - (perFonte[a].Nuovo + perFonte[a].Vecchio));
  const series: Record<string, number[]> = {};
  for (const f of fonti) series[f] = days.map((d) => perGiorno[d][f] || 0);

  const entro5 = scaglioni[0].n + scaglioni[1].n;
  const speed = {
    days,
    entrati: days.map((d) => coorte[d]?.entrati ?? 0),
    assegnati: days.map((d) => coorte[d]?.assegnati ?? 0),
    prenotati: days.map((d) => coorte[d]?.prenotati ?? 0),
    attesa_mediana_sec: days.map((d) => Math.round(mediana(coorte[d]?.attese ?? []))),
    mediana_sec: Math.round(mediana(attese)),
    media_sec: attese.length ? Math.round(attese.reduce((s, x) => s + x, 0) / attese.length) : 0,
    entro_5min_perc: attese.length ? +((entro5 / attese.length) * 100).toFixed(1) : 0,
    misurati: attese.length,
    non_assegnati: mai,
    scaglioni,
  };
  return { generati, assegnati, prenotati, per_fonte: perFonte, trend: { days, series }, speed };
}

// I fogli scrivono "TS Invio" nell'ora locale italiana; il confronto con le date del CRM
// (in UTC) richiede di riportarlo indietro dell'offset di Roma valido in quel momento.
const ROME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome", hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});
function romeOffsetMs(utcMs: number): number {
  const p = ROME_FMT.formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
}
/** "11/06/2026 11:52:52" (ora italiana) -> millisecondi UTC. Null se la cella non è una data. */
function parseTsInvio(raw: string): number | null {
  const m = String(raw ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const naive = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] ?? 0));
  return naive - romeOffsetMs(naive);
}

/** Nome confrontabile fra tab Lead e tab Call: minuscolo, senza accenti, come insieme di parole. */
function nameTokens(s: string): string[] {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[.\-_]/g, " ").split(/\s+/).filter((w) => w.length > 1).sort();
}
const tokKey = (t: string[]) => t.join(" ");
const isSubset = (a: string[], b: string[]) => a.every((x) => b.includes(x));

// Scaglioni di presa in carico: dal lead in CRM al primo messaggio del venditore.
const SCAGLIONI_CONTATTO: { l: string; max: number }[] = [
  { l: "< 1 h", max: 3600 },
  { l: "1–6 h", max: 21600 },
  { l: "6–24 h", max: 86400 },
  { l: "1–3 gg", max: 259200 },
  { l: "> 3 gg", max: Infinity },
];

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

    // Cache stale-while-revalidate: la lettura dei fogli costa ~25s, quindi si serve
    // sempre l'ultimo payload disponibile e si ricalcola in background quando è vecchio.
    const CACHE_KEY = `lancio_cache_${market}_${lancioId}`;
    let staleAge = -1;
    if (!noCache) {
      const { data: c } = await supabase
        .from("ranking_settings").select("value").eq("key", CACHE_KEY).maybeSingle();
      if (c?.value) {
        try {
          const parsed = JSON.parse(c.value);
          const age = Date.now() - parsed.ts;
          if (age < CACHE_FRESH_MS) {
            return new Response(JSON.stringify({ ...parsed.payload, cached: true, age_ms: age }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
          if (age < CACHE_STALE_MS && parsed.payload) {
            // Risposta immediata con dati leggermente vecchi; il ricalcolo parte ora e
            // aggiorna la cache per la prossima richiesta (nessuna attesa per l'utente).
            staleAge = age;
            const bg = (async () => {
              try {
                await fetch(new URL(req.url).toString().replace(/([?&])nocache=[^&]*/, "$1") + "&nocache=1", {
                  headers: { Authorization: req.headers.get("Authorization") ?? "" },
                });
              } catch { /* best effort */ }
            })();
            // @ts-ignore EdgeRuntime è disponibile su Supabase Edge Functions
            if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(bg);
            return new Response(JSON.stringify({ ...parsed.payload, cached: true, stale: true, age_ms: age }), {
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
          // Un venditore può essere incluso solo nei lead, solo nelle call, o in entrambi.
          const inLead = !cfg.lead_sales?.length || cfg.lead_sales.includes(nome);
          const inCall = !cfg.call_sales?.length || cfg.call_sales.includes(nome);
          if (!inLead && !inCall) return;
          const wanted = [
            ...(inCall ? cfg.call_tabs.map((t) => ({ tab: t, rng: "B2:L1000" })) : []),
            ...(inLead && cfg.lead_tab ? [{ tab: cfg.lead_tab, rng: "A2:J1000" }] : []),
          ];
          if (wanted.length === 0) return;
          const nCallTabs = inCall ? cfg.call_tabs.length : 0;
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
          const callRows: { tok: string[]; netta: boolean; chiusa: boolean; fatt: number }[] = [];
          for (let k = 0; k < nCallTabs; k++) {
            for (const r of (vr[k]?.values ?? []) as any[][]) {
              if (String(r[0] ?? "").trim().toLowerCase() !== prov) continue;
              tot++;
              const esito = String(r[6] ?? "").trim();
              const fare = daFareTest(esito), nonNetta = !fare && RE_NON_NETTA.test(esito);
              if (fare) daFare++;
              else if (nonNetta) nonNette++;
              const chiusa = RE_CHIUSURA.test(esito);
              if (chiusa) {
                chiusure++;
                fatturato += euro(r[9]);
                incassato += euro(r[10]);
              }
              // col C = Nome del lead: aggancia la call al voto assegnato nel tab Lead
              callRows.push({ tok: nameTokens(r[1]), netta: !fare && !nonNetta, chiusa, fatt: chiusa ? euro(r[9]) : 0 });
            }
          }
          const nette = tot - nonNette - daFare;

          // ── LEAD ──
          const leadVals = (inLead && cfg.lead_tab ? (vr[nCallTabs]?.values ?? []) : []) as any[][];
          const qual: Record<string, number> = {};
          for (const q of QUALIFICHE) qual[q] = 0;
          const voti: Record<string, number> = {};
          for (const v of VOTI) voti[v] = 0;
          let conNome = 0;
          // A=data lead, B=nome, C=cognome, G=qualifica, H=voto, J=TS Invio (primo messaggio del venditore)
          const votoByName: { tok: string[]; voto: string }[] = [];
          const attesaContatto: number[] = [];
          let senzaTs = 0;
          for (const r of leadVals) {
            if (String(r[1] ?? "").trim()) conNome++;
            const q = String(r[6] ?? "").trim();
            if (q && q in qual) qual[q]++;
            const vt = String(r[7] ?? "").trim();
            if (vt && vt in voti) voti[vt]++;

            const tok = nameTokens(`${r[1] ?? ""} ${r[2] ?? ""}`);
            if (tok.length && vt) votoByName.push({ tok, voto: vt });

            const tIn = Date.parse(String(r[0] ?? ""));
            const tMsg = parseTsInvio(String(r[9] ?? ""));
            if (tMsg !== null && isFinite(tIn)) {
              const sec = (tMsg - tIn) / 1000;
              // scarti negativi oltre l'ora: riga incoerente, fuori dalla statistica
              if (sec > -3600) attesaContatto.push(Math.max(0, sec));
            } else if (isFinite(tIn)) senzaTs++;
          }
          // voto della call: match esatto sui nomi, poi sottoinsieme (secondi nomi, cognomi doppi)
          const votoIdx = new Map<string, string>();
          for (const v of votoByName) votoIdx.set(tokKey(v.tok), v.voto);
          const votoDiCall = (tok: string[]): string | null => {
            if (!tok.length) return null;
            const hit = votoIdx.get(tokKey(tok));
            if (hit) return hit;
            const sub = votoByName.find((v) => isSubset(tok, v.tok) || isSubset(v.tok, tok));
            return sub?.voto ?? null;
          };
          const perVoto: Record<string, { call: number; nette: number; chiusure: number; fatturato: number }> = {};
          for (const v of VOTI) perVoto[v] = { call: 0, nette: 0, chiusure: 0, fatturato: 0 };
          let callAbbinate = 0;
          for (const c of callRows) {
            const v = votoDiCall(c.tok);
            if (!v || !(v in perVoto)) continue;
            callAbbinate++;
            perVoto[v].call++;
            if (c.netta) perVoto[v].nette++;
            if (c.chiusa) { perVoto[v].chiusure++; perVoto[v].fatturato += c.fatt; }
          }
          const contatto = {
            contattati: attesaContatto.length,
            senza_ts: senzaTs,
            mediana_sec: Math.round(mediana(attesaContatto)),
            media_sec: attesaContatto.length
              ? Math.round(attesaContatto.reduce((s2, x) => s2 + x, 0) / attesaContatto.length) : 0,
            entro_1h: attesaContatto.filter((x) => x < 3600).length,
            entro_24h: attesaContatto.filter((x) => x < 86400).length,
            scaglioni: SCAGLIONI_CONTATTO.map((sc, si) => ({
              label: sc.l,
              n: attesaContatto.filter((x) => x < sc.max && x >= (SCAGLIONI_CONTATTO[si - 1]?.max ?? 0)).length,
            })),
          };
          const sommaQual = QUALIFICHE.reduce((s, q) => s + qual[q], 0);
          const nonLavorato = Math.max(0, conNome - sommaQual);
          const totLead = sommaQual + nonLavorato;
          const target = cfg.target?.[nome] ?? 0;

          // % qualifica sul totale lead (formula master: qualifica / Tot. Lead Assegnati)
          const qualPerc: Record<string, number> = {};
          for (const q of ["Non lavorato", ...QUALIFICHE]) {
            const v = q === "Non lavorato" ? nonLavorato : qual[q];
            qualPerc[q] = totLead > 0 ? Math.round((v / totLead) * 1000) / 10 : 0;
          }
          const confermato = qual["Confermato"] ?? 0, fixApp = qual["Fix App"] ?? 0;
          const lavorati = totLead - nonLavorato;
          // % voto calcolate sui soli Confermati (formula master: voto / Confermato)
          const votiPerc: Record<string, number> = {};
          for (const v of VOTI) votiPerc[v] = confermato > 0 ? Math.round((voti[v] / confermato) * 1000) / 10 : 0;
          const totVoti = VOTI.reduce((s, v) => s + voti[v], 0);
          const mediaVoto = totVoti > 0
            ? Math.round((VOTI.reduce((s, v, i) => s + voti[v] * (i + 1), 0) / totVoti) * 100) / 100
            : 0;

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
            qualifiche_perc: qualPerc,
            app_conferma_lavorati: lavorati > 0 ? Math.round(((confermato + fixApp) / lavorati) * 1000) / 10 : 0,
            app_conferma: totLead > 0 ? Math.round(((confermato + fixApp) / totLead) * 1000) / 10 : 0,
            voti, voti_perc: votiPerc, media_voto: mediaVoto,
            contatto, per_voto: perVoto, call_abbinate: callAbbinate,
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
      voti: VOTI.reduce((acc, v) => {
        acc[v] = rows.reduce((s, r) => s + (r.voti[v] || 0), 0); return acc;
      }, {} as Record<string, number>),
    };
    // % e medie del Totale, ricalcolate sugli aggregati (non medie di medie)
    {
      const nl = totale.qualifiche["Non lavorato"] || 0;
      const conf = totale.qualifiche["Confermato"] || 0, fx = totale.qualifiche["Fix App"] || 0;
      const lav = totLeadTeam - nl;
      totale.qualifiche_perc = ["Non lavorato", ...QUALIFICHE].reduce((acc, q) => {
        acc[q] = totLeadTeam > 0 ? Math.round(((totale.qualifiche[q] || 0) / totLeadTeam) * 1000) / 10 : 0;
        return acc;
      }, {} as Record<string, number>);
      totale.app_conferma_lavorati = lav > 0 ? Math.round(((conf + fx) / lav) * 1000) / 10 : 0;
      totale.app_conferma = totLeadTeam > 0 ? Math.round(((conf + fx) / totLeadTeam) * 1000) / 10 : 0;
      totale.voti_perc = VOTI.reduce((acc, v) => {
        acc[v] = conf > 0 ? Math.round(((totale.voti[v] || 0) / conf) * 1000) / 10 : 0; return acc;
      }, {} as Record<string, number>);
      const tv = VOTI.reduce((s, v) => s + (totale.voti[v] || 0), 0);
      totale.media_voto = tv > 0
        ? Math.round((VOTI.reduce((s, v, i) => s + (totale.voti[v] || 0) * (i + 1), 0) / tv) * 100) / 100
        : 0;
    }

    // ── Presa in carico (TS Invio) e qualità lead (voto x esito): aggregati di team ──
    const contattoTeam = {
      contattati: sum((r) => r.contatto?.contattati ?? 0),
      senza_ts: sum((r) => r.contatto?.senza_ts ?? 0),
      entro_1h: sum((r) => r.contatto?.entro_1h ?? 0),
      entro_24h: sum((r) => r.contatto?.entro_24h ?? 0),
      // mediana di team approssimata dalla mediana pesata delle mediane: i secondi grezzi
      // non escono dai fogli per non gonfiare il payload
      mediana_sec: (() => {
        const v = rows.filter((r) => (r.contatto?.contattati ?? 0) > 0)
          .flatMap((r) => Array(Math.min(r.contatto.contattati, 400)).fill(r.contatto.mediana_sec));
        return Math.round(mediana(v));
      })(),
      scaglioni: SCAGLIONI_CONTATTO.map((sc, si) => ({
        label: sc.l,
        n: rows.reduce((s2, r) => s2 + (r.contatto?.scaglioni?.[si]?.n ?? 0), 0),
      })),
    };
    const qualitaTeam = {
      call_abbinate: sum((r) => r.call_abbinate ?? 0),
      call_totali: totCall,
      voti: VOTI.map((v) => {
        const g = { voto: v, call: 0, nette: 0, chiusure: 0, fatturato: 0 };
        for (const r of rows) {
          const p = r.per_voto?.[v]; if (!p) continue;
          g.call += p.call; g.nette += p.nette; g.chiusure += p.chiusure; g.fatturato += p.fatturato;
        }
        return {
          ...g,
          tasso_nette: g.nette > 0 ? Math.round((g.chiusure / g.nette) * 1000) / 10 : 0,
          ticket: g.chiusure > 0 ? Math.round(g.fatturato / g.chiusure) : 0,
        };
      }),
    };

    // Lead generati dal DB (campagna del lancio): per fonte, nuovi/vecchi, andamento giornaliero
    let leadgen: any = null;
    if (cfg.campagna) {
      try { leadgen = await leadGenerati(supabase, cfg.campagna, market); }
      catch (e) { errors.push(`lead generati: ${(e as Error).message}`); }
    }

    const payload = {
      market,
      lancio: {
        id: cfg.id, nome: cfg.nome, provenienza: cfg.provenienza,
        call_tabs: cfg.call_tabs, lead_tab: cfg.lead_tab, campagna: cfg.campagna ?? null,
        sales: cfg.sales ?? [], lead_sales: cfg.lead_sales ?? [], call_sales: cfg.call_sales ?? [],
      },
      qualifiche_order: ["Non lavorato", ...QUALIFICHE],
      voti_order: VOTI,
      leadgen,
      contatto_team: contattoTeam, qualita: qualitaTeam,
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
