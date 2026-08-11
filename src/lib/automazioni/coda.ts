import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

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

/**
 * Quanti lead fermi in coda appartengono a QUESTA regola. Il totale grezzo della coda non
 * significa niente per un singolo lancio: contiene anni di campagne diverse.
 */
export async function contaInCoda(market: string, automazioneId?: string): Promise<number> {
  if (!automazioneId) return 0;
  const r = await fetch(`${SUPA_URL}/functions/v1/lead-generation-webhook`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      azione: "recupera_coda", sorgente: "coda", simula: true,
      market, automazione_id: automazioneId,
    }),
  });
  const j = await r.json();
  return j.trovati ?? 0;
}

/**
 * Rimette in circolo i lead fermi in coda: ripassano dalle automazioni come lead nuovi,
 * quindi rispettano venditore precedente, tetti, pause e contatori.
 */
export async function recuperaCoda(market: string, automazioneId?: string) {
  const r = await fetch(`${SUPA_URL}/functions/v1/lead-generation-webhook`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ azione: "recupera_coda", market, automazione_id: automazioneId }),
  });
  return r.json();
}

export interface AnteprimaLiberi {
  trovati: number;
  assegnabili: number;
  ripartizione: Record<string, number>;
}

/** Quanti lead sono rimasti liberi per questa regola e come verrebbero ripartiti. Non scrive. */
export async function anteprimaLiberi(market: string, automazioneId: string): Promise<AnteprimaLiberi> {
  const r = await fetch(`${SUPA_URL}/functions/v1/lead-generation-webhook`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      azione: "recupera_coda", sorgente: "liberi", simula: true,
      market, automazione_id: automazioneId,
    }),
  });
  const j = await r.json();
  return { trovati: j.trovati ?? 0, assegnabili: j.assegnabili ?? 0, ripartizione: j.ripartizione ?? {} };
}

/** Assegna davvero i lead rimasti liberi, passando dalle automazioni. */
export async function assegnaLiberi(market: string, automazioneId: string) {
  const r = await fetch(`${SUPA_URL}/functions/v1/lead-generation-webhook`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ azione: "recupera_coda", sorgente: "liberi", market, automazione_id: automazioneId }),
  });
  return r.json();
}
