import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

/** Configurazione di un lancio: da dove leggere call e lead, target e sales inclusi. */
export interface LancioConfig {
  id: string;
  nome: string;
  provenienza: string;          // provenienza call nel tab del mese (es. "3sfere")
  call_tabs: string[];          // tab call nei fogli sales (es. "Giugno26 Elenco call/esito")
  lead_tab: string;             // tab lead del lancio (es. "Lead Workshop_Giu26")
  campagna?: string;            // campagna in lead_generation (per i lead generati)
  target?: Record<string, number>;
  sales?: string[];             // legacy: sales della vista (vuoto = tutti quelli con dati)
  lead_sales?: string[];        // venditori da cui leggere il tab lead
  call_sales?: string[];        // venditori da cui leggere i tab call
  automazione_id?: string;      // automazione di assegnazione collegata (lead_assignment_automations)
  whatsapp_slug?: string;       // template link WhatsApp collegato
}

/** Regola di formattazione condizionale su una metrica. */
export interface ColorRule { key: string; op: "lt" | "gt" | "lte" | "gte"; val: number; color: string }

export const PALETTE = [
  "#4ade80", "#f87171", "#fbbf24", "#60a5fa", "#c084fc",
  "#2dd4bf", "#fb923c", "#f472b6", "#a3e635", "#94a3b8",
];

const KEY_CFG = "lanci_config";
const KEY_RULES = "lanci_color_rules";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return fallback;
  try { const p = JSON.parse(data.value); return (p ?? fallback) as T; } catch { return fallback; }
}

async function writeJson(key: string, value: unknown, descrizione: string): Promise<boolean> {
  const { error } = await supabase.from("system_settings")
    .upsert({ key, value: JSON.stringify(value), descrizione }, { onConflict: "key" });
  return !error;
}

export const fetchLanci = () => readJson<LancioConfig[]>(KEY_CFG, []);
export const saveLanci = (l: LancioConfig[]) => writeJson(KEY_CFG, l, "Configurazione lanci (Analytics Lancio)");

/** Regole colore per lancio: { [lancioId]: ColorRule[] } */
export const fetchColorRules = async (lancioId: string): Promise<ColorRule[]> => {
  const all = await readJson<Record<string, ColorRule[]>>(KEY_RULES, {});
  return all[lancioId] ?? [];
};
export const saveColorRules = async (lancioId: string, rules: ColorRule[]): Promise<boolean> => {
  const all = await readJson<Record<string, ColorRule[]>>(KEY_RULES, {});
  all[lancioId] = rules;
  return writeJson(KEY_RULES, all, "Formattazione condizionale Analytics Lancio");
};

// ── Dati del lancio dall'edge ──
export interface LancioRow {
  venditore: string;
  fatturato: number; incassato: number; chiusure: number;
  call_totali: number; call_da_fare: number; call_nette: number;
  nette_su_totali: number; valore_lead_fatt: number; valore_lead_inc: number;
  tasso_prenotazione: number; tasso_chiusura_call: number; tasso_chiusura_nette: number;
  target: number; distanza_target: number; tot_lead: number; distribuzione: number;
  app_conferma: number; app_conferma_lavorati: number; media_voto: number;
  qualifiche: Record<string, number>;
  qualifiche_perc: Record<string, number>;
  voti: Record<string, number>;
  voti_perc: Record<string, number>;
}
/** Tempi fra l'ingresso del lead e l'assegnazione, per coorte di giorno d'ingresso. */
export interface SpeedToLead {
  days: string[];
  entrati: number[];
  assegnati: number[];
  prenotati: number[];
  attesa_mediana_sec: number[];
  mediana_sec: number;
  media_sec: number;
  entro_5min_perc: number;
  misurati: number;
  non_assegnati: number;
  scaglioni: { label: string; n: number }[];
}

export interface LancioData {
  market: string;
  lancio: { id: string; nome: string; provenienza: string; call_tabs: string[]; lead_tab: string; campagna: string | null; sales: string[] };
  qualifiche_order: string[];
  voti_order: string[];
  leadgen: {
    generati: number; assegnati: number; prenotati?: number;
    per_fonte: Record<string, { Nuovo: number; Vecchio: number }>;
    trend: { days: string[]; series: Record<string, number[]> };
    speed?: SpeedToLead;
  } | null;
  totale: LancioRow;
  rows: LancioRow[];
  errors: string[];
  generated_at: string;
  cached?: boolean;
  stale?: boolean;
  age_ms?: number;
}

export async function fetchLancioData(lancioId: string, market: string, force = false): Promise<LancioData> {
  const url = `${SUPA_URL}/functions/v1/analytics-lancio?lancio=${encodeURIComponent(lancioId)}&market=${market}${force ? "&nocache=1" : ""}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${ANON}` } });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j as LancioData;
}

/** Elenco tab disponibili nei fogli dei venditori (per configurare un lancio). */
export async function fetchSheetTabs(market: string): Promise<{ venditore: string; tabs: string[] }[]> {
  const r = await fetch(`${SUPA_URL}/functions/v1/sheet-tabs?market=${market}`, { headers: { Authorization: `Bearer ${ANON}` } });
  const j = await r.json();
  return (j.sellers ?? []).filter((s: any) => s.tabs) as { venditore: string; tabs: string[] }[];
}
