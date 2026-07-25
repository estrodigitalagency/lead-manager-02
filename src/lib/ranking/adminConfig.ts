import { supabase } from "@/integrations/supabase/client";

/**
 * Ranking settings — ora nel DB del lead-manager (tabella ranking_settings).
 * Lettura pubblica (anon), scrittura solo authenticated (admin dentro Impostazioni,
 * già protetto dal login del lead-manager: nessuna password separata).
 */

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1pH99VUX1xkws6TH7VzCSRpkXGNMqdy8T7ctAa1Zr1hg/edit";

export function getDefaultSheetUrl(): string {
  return DEFAULT_SHEET_URL;
}

/** Base URL per i link personali (es. https://leadmanager.3sfere.com/ranking?m=CODE) */
export function getRankingBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/ranking`;
  }
  return "/ranking";
}

export async function fetchSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("ranking_settings")
    .select("key, value");
  if (error) throw new Error("Errore nel caricamento impostazioni ranking");
  const settings: Record<string, string> = {};
  for (const row of data || []) settings[row.key] = row.value;
  return settings;
}

export async function saveSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from("ranking_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.error("saveSetting error:", error);
    return false;
  }
  return true;
}
