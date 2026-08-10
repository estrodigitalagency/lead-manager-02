const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

/**
 * Contatori della distribuzione. Le operazioni passano dall'edge perché la scelta della regola
 * a cui attribuire un lead deve usare le stesse funzioni del webhook che assegna: rifarle qui
 * significherebbe vederle divergere alla prima modifica.
 */
async function chiama(body: unknown): Promise<any> {
  const r = await fetch(`${SUPA_URL}/functions/v1/contatori-distribuzione`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

/** Azzera i contatori: tutti, oppure solo i venditori indicati (id). */
export async function azzeraContatori(automazioneId: string, venditori: string[] = []) {
  return chiama({ azione: "reset", automazione_id: automazioneId, venditori });
}

/**
 * Sposta i contatori dopo una riassegnazione manuale: chi cede il lead scende di uno, chi lo
 * prende sale di uno, sulla regola che avrebbe gestito quel lead.
 */
export async function spostaContatori(leadIds: string[], destinatario: string, market: string) {
  return chiama({ azione: "sposta", lead_ids: leadIds, a: destinatario, market });
}
