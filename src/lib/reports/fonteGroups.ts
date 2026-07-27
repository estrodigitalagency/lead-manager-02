import { supabase } from "@/integrations/supabase/client";

// Regola di raggruppamento provenienze call: collassa più valori grezzi di
// "fonte" in un'unica colonna cumulata nel report call.
// Es. { pattern: "setter_new", gruppo: "setter_new", match: "prefix" }
export interface FonteGroupRule {
  pattern: string;
  gruppo: string;
  match: "prefix" | "exact" | "contains";
}

export const FONTE_GROUPS_KEY = "call_fonte_groups";

// Default usato finché l'utente non salva le proprie regole.
export const DEFAULT_FONTE_GROUPS: FonteGroupRule[] = [
  { pattern: "setter_new", gruppo: "setter_new", match: "prefix" },
];

const norm = (s: string) => s.toLowerCase().trim();

export function applyFonteGroups(fonte: string, rules: FonteGroupRule[]): string {
  const f = norm(fonte);
  for (const r of rules) {
    const p = norm(r.pattern);
    if (!p) continue;
    const hit =
      r.match === "exact" ? f === p :
      r.match === "contains" ? f.includes(p) :
      f.startsWith(p); // prefix (default)
    if (hit) return r.gruppo;
  }
  return fonte;
}

export async function fetchFonteGroups(): Promise<FonteGroupRule[]> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", FONTE_GROUPS_KEY)
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_FONTE_GROUPS;
  try {
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? (parsed as FonteGroupRule[]) : DEFAULT_FONTE_GROUPS;
  } catch {
    return DEFAULT_FONTE_GROUPS;
  }
}

export async function saveFonteGroups(rules: FonteGroupRule[]): Promise<boolean> {
  const { error } = await supabase
    .from("system_settings")
    .upsert(
      { key: FONTE_GROUPS_KEY, value: JSON.stringify(rules), descrizione: "Raggruppamento provenienze call (report)" },
      { onConflict: "key" }
    );
  return !error;
}
