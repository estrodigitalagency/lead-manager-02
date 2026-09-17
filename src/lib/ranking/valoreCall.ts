import { supabase } from "@/integrations/supabase/client";
import { MetricKey, RankedMember } from "./googleSheets";
import { generateMemberCode } from "./hashUtils";

/** Risposta dell'edge `valore-call`: numeri per fonte (bucket), per venditore, mese per mese. */
export interface MonthData {
  mese: string; fatturato: number; incassato: number; cr: number; valore_call: number;
  n_call: number; call_nette: number; chiusure: number;
}
export interface BucketData {
  bucket: string; label?: string; has_call: boolean;
  valore_call: number; fatturato: number; incassato: number; cr: number;
  mesi?: MonthData[];
}
export interface SellerData { venditore: string; data: BucketData[]; }
export interface ValoreCallResp { data: BucketData[]; per_seller: SellerData[]; }

export async function fetchValoreCall(market: "IT" | "ES" = "IT"): Promise<ValoreCallResp | null> {
  const { data, error } = await supabase.functions.invoke(`valore-call?market=${market}`, { method: "GET" });
  if (error || !data || data.error) return null;
  return data as ValoreCallResp;
}

// Match nome sales robusto. I nomi del foglio ranking sono brevi/soprannomi con
// accenti (es. "Desiree", "Rocco", "Vincenzo"), quelli dell'edge valore-call sono
// completi (es. "Desirée Masiero", "Rocco Alicchio"). Serve: togliere accenti +
// confronto esatto → token-set (ordine invertito) → sottoinsieme (nome ⊂ completo).
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
const toks = (s: string) => fold(s).split(" ").filter(Boolean);
const isInitial = (t: string) => /^[a-z]\.?$/.test(t); // "a" o "a."
// Due token combaciano se uguali o se uno è l'iniziale dell'altro (es. "a." ~ "alicchio").
const tokMatch = (a: string, b: string) => a === b || (isInitial(a) && b[0] === a[0]) || (isInitial(b) && a[0] === b[0]);
// Bijezione greedy: quanti token del target trovano un token distinto nel candidato.
const matchCount = (tt: string[], ct: string[]) => {
  const used = new Array(ct.length).fill(false);
  let m = 0;
  for (const t of tt) for (let i = 0; i < ct.length; i++) if (!used[i] && tokMatch(t, ct[i])) { used[i] = true; m++; break; }
  return m;
};
// Nomi ranking abbreviati ("Rocco A.") vs edge completi ("Rocco Alicchio"): match via iniziali + accenti.
export const resolveSales = (target: string, candidates: string[]): string | null => {
  const tt = toks(target);
  const scored = candidates.map((c) => { const ct = toks(c); const m = matchCount(tt, ct); return { c, m, full: m === tt.length && m === ct.length }; });
  const full = scored.filter((s) => s.full);
  if (full.length) return full[0].c;                       // bijezione completa (caso normale)
  const cover = scored.filter((s) => s.m === tt.length && tt.length > 0);
  return cover.sort((a, b) => b.m - a.m)[0]?.c ?? null;    // tutti i token del target coperti
};

/** Nome del sales che apre la pagina, risolto al nome esatto usato nell'edge. */
export function nomeSalesInEdge(resp: ValoreCallResp, myName?: string | null, memberCode?: string): string | null {
  const names = resp.per_seller.map((s) => s.venditore);
  if (myName) return resolveSales(myName, names);
  if (memberCode) return names.find((n) => generateMemberCode(n) === memberCode) || null;
  return null;
}

const ordMese = (mk: string) => { const [m, y] = mk.split("/"); return `${y}${m}`; };

// Mese di riferimento UNICO per tutta la classifica: il più recente presente nei dati.
// (senza questo ogni fonte mostrerebbe un mese diverso — non confrontabile)
export function meseRiferimento(resp: ValoreCallResp): string | null {
  let best: string | null = null;
  for (const s of resp.per_seller)
    for (const b of s.data)
      for (const m of b.mesi || [])
        if (!best || ordMese(m.mese) > ordMese(best)) best = m.mese;
  return best;
}

interface Somma { fatt: number; inc: number; call: number; nette: number; chiu: number }

// Fatturato e incassato si sommano; valore call e CR sono rapporti e vanno ricalcolati
// dai loro numeratori e denominatori, come fa l'edge.
const valoreDi = (x: Somma, metric: MetricKey): number => {
  switch (metric) {
    case "fatturato": return x.fatt;
    case "incassato": return x.inc;
    case "valoreCall": return x.call > 0 ? Math.round(x.fatt / x.call) : 0;
    case "cr": return x.nette > 0 ? Math.round((x.chiu / x.nette) * 1000) / 10 : 0;
  }
};

/**
 * Classifica con tutte le fonti insieme. Stessa regola della vista per fonte: valore principale
 * = mese di riferimento, sotto la media dei 3 mesi più recenti con call; in classifica solo chi ha
 * avuto call nel mese di riferimento.
 *
 * Esatto anche sui 3 mesi: ogni fonte porta i suoi ultimi 3 mesi con call, e un mese che sta fra
 * gli ultimi 3 con call del venditore sta per forza fra gli ultimi 3 di ogni fonte che lo contiene.
 */
export function classificaGenerale(resp: ValoreCallResp, metric: MetricKey, meseRif: string | null): RankedMember[] {
  if (!meseRif) return [];
  const isSum = metric === "fatturato" || metric === "incassato";
  const list = resp.per_seller
    .map((s) => {
      const perMese = new Map<string, Somma>();
      for (const b of s.data)
        for (const m of b.mesi || []) {
          const x = perMese.get(m.mese) || { fatt: 0, inc: 0, call: 0, nette: 0, chiu: 0 };
          x.fatt += Number(m.fatturato) || 0;
          x.inc += Number(m.incassato) || 0;
          x.call += Number(m.n_call) || 0;
          x.nette += Number(m.call_nette) || 0;
          x.chiu += Number(m.chiusure) || 0;
          perMese.set(m.mese, x);
        }
      const rif = perMese.get(meseRif);
      if (!rif || rif.call === 0) return null;
      const ultimi = [...perMese.entries()]
        .filter(([mese, x]) => x.call > 0 && ordMese(mese) <= ordMese(meseRif))
        .sort((a, b) => ordMese(a[0]).localeCompare(ordMese(b[0])))
        .slice(-3)
        .map(([, x]) => x);
      const tre = ultimi.reduce<Somma>(
        (t, x) => ({ fatt: t.fatt + x.fatt, inc: t.inc + x.inc, call: t.call + x.call, nette: t.nette + x.nette, chiu: t.chiu + x.chiu }),
        { fatt: 0, inc: 0, call: 0, nette: 0, chiu: 0 },
      );
      const avg = isSum ? Math.round(valoreDi(tre, metric) / ultimi.length) : valoreDi(tre, metric);
      return { name: s.venditore, val: valoreDi(rif, metric), sub: { avg, mese: meseRif } };
    })
    .filter(Boolean) as { name: string; val: number; sub: RankedMember["sub"] }[];
  list.sort((a, b) => b.val - a.val);
  return list.map((x, i) => ({
    name: x.name,
    rank: i + 1,
    fatturato: metric === "fatturato" ? x.val : 0,
    incassato: metric === "incassato" ? x.val : 0,
    cr: metric === "cr" ? x.val : 0,
    valoreCall: metric === "valoreCall" ? x.val : 0,
    sub: x.sub,
  }));
}
