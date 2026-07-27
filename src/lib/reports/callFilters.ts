import { supabase } from "@/integrations/supabase/client";

// Filtro salvato del report call (provenienze + periodo). Persistito in system_settings
// (RLS disabilitato) invece di una tabella dedicata: l'app usa la anon key senza sessione
// auth, quindi tabelle con RLS "authenticated" rifiuterebbero l'insert.
export interface CallFilterConfig { fonti?: string[]; period?: string; cFrom?: string; cTo?: string }
export interface CallFilter { id: string; nome: string; config: CallFilterConfig }

const keyFor = (market: string) => `call_report_filters_${market}`;

export async function fetchCallFilters(market: string): Promise<CallFilter[]> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", keyFor(market))
    .maybeSingle();
  if (error || !data?.value) return [];
  try {
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? (parsed as CallFilter[]) : [];
  } catch {
    return [];
  }
}

async function persist(market: string, filters: CallFilter[]): Promise<boolean> {
  const { error } = await supabase
    .from("system_settings")
    .upsert(
      { key: keyFor(market), value: JSON.stringify(filters), descrizione: "Filtri salvati report call" },
      { onConflict: "key" }
    );
  return !error;
}

export async function addCallFilter(market: string, nome: string, config: CallFilterConfig): Promise<boolean> {
  const list = await fetchCallFilters(market);
  const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  return persist(market, [{ id, nome, config }, ...list]);
}

export async function removeCallFilter(market: string, id: string): Promise<boolean> {
  const list = await fetchCallFilters(market);
  return persist(market, list.filter((f) => f.id !== id));
}
