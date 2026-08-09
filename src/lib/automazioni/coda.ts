import { supabase } from "@/integrations/supabase/client";

/**
 * "Assegnazione Round Robin": interruttore per mettere in coda i lead nuovi di una regola,
 * lasciando passare solo chi è già stato lavorato di recente. Serve quando i venditori sono
 * indietro con la lavorazione e non si vuole continuare a caricarli, senza toccare
 * percentuali e tetti già configurati.
 *
 * L'elenco vive in system_settings perché l'app scrive con la anon key e non può aggiungere
 * colonne a lead_assignment_automations: stesso schema del soft-delete delle automazioni.
 */
const KEY = "automations_round_robin";

export async function fetchCodaIds(): Promise<string[]> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", KEY).maybeSingle();
  try {
    const p = JSON.parse(data?.value || "[]");
    return Array.isArray(p) ? (p as string[]) : [];
  } catch {
    return [];
  }
}

export async function setCoda(automationId: string, attiva: boolean): Promise<boolean> {
  const ids = await fetchCodaIds();
  const next = attiva
    ? Array.from(new Set([...ids, automationId]))
    : ids.filter((x) => x !== automationId);
  const { error } = await supabase.from("system_settings").upsert(
    { key: KEY, value: JSON.stringify(next), descrizione: "Automazioni con assegnazione in coda (Round Robin)" },
    { onConflict: "key" },
  );
  return !error;
}
