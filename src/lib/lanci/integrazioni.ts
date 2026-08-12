import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

/**
 * Collegamenti del lancio: automazione di assegnazione e link WhatsApp.
 * L'automazione vive in `lead_assignment_automations` (stessa tabella dell'editor Automazioni),
 * così i log di esecuzione (`automation_executions`) e la tracciabilità restano invariati.
 */

export interface AutomazioneLancio {
  id: string;
  nome: string;
  attivo: boolean;
  priority: number;
  trigger_when: string;
  trigger_field: string;
  condition_type: string;
  condition_value: string[];
  action_type: string;
  campagna: string | null;
  distribution_config: { venditore_id: string; weight?: number | null; count_target?: number | null }[];
  distribution_state: { count_assigned?: Record<string, number>; total_assigned?: number; last_updated?: string };
  distribution_mode: string | null;
  use_previous_seller_first: boolean;
  lock_period_days: number | null;
}

export interface Conflitto {
  automazione: string;
  motivo: string;
  priorityMinore: boolean;   // true = l'altra scatta prima (priority più bassa)
  /** La regola nomina le stesse fonti ma non se le contende: va spiegato, non segnalato. */
  innocuo?: boolean;
}

const norm = (s: string) => (s || "").trim().toLowerCase();

/** Due condizioni si sovrappongono se una stringa contiene l'altra (match "contains" tipico). */
const overlap = (a: string[], b: string[]) =>
  a.some((x) => b.some((y) => {
    const [nx, ny] = [norm(x), norm(y)];
    return !!nx && !!ny && (nx === ny || nx.includes(ny) || ny.includes(nx));
  }));

export interface ContestoConflitto {
  market: string;
  condition: string[];
  esclusioni?: string[];          // fonti escluse dalla nostra regola
  trigger_field: string;
  trigger_when: string;           // due regole con trigger diverso non si contendono lo stesso lead
  priority: number;
  escludiId?: string;
}

/**
 * Regole attive che nominano le stesse fonti. Quelle che se le contendono davvero tornano come
 * conflitti; quelle che le nominano per escluderle tornano con innocuo=true, così l'interfaccia
 * può dire perché non danno fastidio invece di tacere e lasciare il dubbio.
 * Restano fuori del tutto le regole su un altro campo o su un altro momento di attivazione:
 * lì non c'è niente da spiegare.
 */
export async function checkConflitti(ctx: ContestoConflitto): Promise<Conflitto[]> {
  const { data } = await supabase
    .from("lead_assignment_automations")
    .select("id, nome, attivo, priority, trigger_field, trigger_when, condition_value, condition_type, trigger_sources, action_type")
    .eq("market", ctx.market).eq("attivo", true);
  const out: Conflitto[] = [];
  const mieEscl = (ctx.esclusioni ?? []).map(norm).filter(Boolean);

  for (const a of (data ?? []) as any[]) {
    if (ctx.escludiId && a.id === ctx.escludiId) continue;
    if (a.trigger_field !== ctx.trigger_field) continue;
    // trigger diversi (nuovo lead vs duplicato) non intercettano lo stesso evento
    if ((a.trigger_when ?? "new_lead") !== ctx.trigger_when) continue;
    const sue = (a.condition_value ?? []) as string[];
    if (!overlap(ctx.condition, sue)) continue;

    const priorityMinore = (a.priority ?? 999) < ctx.priority;

    // "non contiene" nomina quelle fonti per scartarle: prende tutto tranne i nostri lead
    if (a.condition_type === "not_contains") {
      out.push({
        automazione: a.nome, priorityMinore, innocuo: true,
        motivo: `scarta le fonti che contengono ${sue.join(", ")}, quindi lascia passare i tuoi lead`,
      });
      continue;
    }

    // se una delle due esclude esplicitamente le fonti dell'altra, non c'è contesa
    const sueEscl = ((a.trigger_sources ?? []) as string[]).map(norm).filter(Boolean);
    const separateDaLoro = sueEscl.find((e) => ctx.condition.some((c) => norm(c).includes(e)));
    const separateDaNoi = mieEscl.find((e) => sue.some((c) => norm(c).includes(e)));
    if (separateDaLoro) {
      out.push({
        automazione: a.nome, priorityMinore, innocuo: true,
        motivo: `esclude "${separateDaLoro}", quindi non tocca i tuoi lead`,
      });
      continue;
    }
    if (separateDaNoi) {
      out.push({
        automazione: a.nome, priorityMinore, innocuo: true,
        motivo: `la tua regola esclude "${separateDaNoi}", quindi non vi sovrapponete`,
      });
      continue;
    }

    out.push({
      automazione: a.nome, priorityMinore,
      motivo: `intercetta le stesse fonti (${sue.join(", ")})`,
    });
  }
  return out;
}

export async function fetchAutomazione(id: string): Promise<AutomazioneLancio | null> {
  const { data } = await supabase.from("lead_assignment_automations").select("*").eq("id", id).maybeSingle();
  return (data as any) ?? null;
}

export interface NuovaAutomazione {
  nome: string;
  market: string;
  campagna?: string;
  condition_value: string[];               // es. ["workshop_set26"]
  distribuzione: { venditore_id: string; weight: number }[];
  use_previous_seller_first?: boolean;
  lock_period_days?: number | null;
}

/** Crea l'automazione del lancio (distribuzione pesata). Ritorna l'id da salvare nella config. */
export async function creaAutomazione(n: NuovaAutomazione): Promise<{ id?: string; error?: string }> {
  const { data: maxRow } = await supabase
    .from("lead_assignment_automations").select("priority")
    .eq("market", n.market).order("priority", { ascending: false }).limit(1);
  const priority = ((maxRow?.[0] as any)?.priority ?? 0) + 1;

  const payload: any = {
    nome: n.nome,
    market: n.market,
    attivo: true,
    priority,
    trigger_when: "new_lead",
    trigger_field: "ultima_fonte",
    condition_type: "contains",
    condition_value: n.condition_value,
    action_type: "weighted_distribution",
    distribution_enabled: true,
    distribution_mode: "percentage",
    distribution_config: n.distribuzione.map((d) => ({ venditore_id: d.venditore_id, weight: d.weight, count_target: null })),
    distribution_state: {},
    use_previous_seller_first: n.use_previous_seller_first ?? false,
    lock_period_days: n.lock_period_days ?? null,
    campagna: n.campagna || null,
    webhook_enabled: true,
    excluded_sellers: [],
  };
  const { data, error } = await supabase.from("lead_assignment_automations").insert(payload).select("id").single();
  if (error) return { error: error.message };
  return { id: (data as any).id };
}

export async function setAutomazioneAttiva(id: string, attivo: boolean): Promise<boolean> {
  const { error } = await supabase.from("lead_assignment_automations").update({ attivo }).eq("id", id);
  return !error;
}

/** Esecuzioni dell'automazione (log integrale, per tracciabilità). */
export async function fetchEsecuzioni(automationId: string, limit = 200) {
  const { data } = await supabase
    .from("automation_executions")
    .select("executed_at, lead_name, lead_email, trigger_value, action_taken, result, seller_assigned, webhook_success, error_message")
    .eq("automation_id", automationId).order("executed_at", { ascending: false }).limit(limit);
  return (data ?? []) as any[];
}

// ── WhatsApp ──
export interface TemplateWa {
  id: string; slug: string; nome: string; messaggio_template: string;
  market: string; attivo: boolean; click_count: number;
  fallback_phone: string | null; fallback_message: string | null;
  created_at: string; updated_at: string;
}

export interface ClickStat { venditore: string; click: number; ok: number; fallback: number; errore: number }

/**
 * Click del template: totali, per sales e per giorno.
 *
 * La lettura passa da un edge con la service role perché la RLS non lascia leggere
 * whatsapp_click_logs con la anon key: interrogandola da qui tornavano zero righe senza errore,
 * e le statistiche di contatto risultavano vuote anche quando i click c'erano.
 */
export async function fetchClickStats(slug: string): Promise<{
  totale: number; ok: number; errori: number;
  perSales: ClickStat[]; perGiorno: { day: string; n: number }[];
  ultimi: { clicked_at: string; lead_nome: string | null; lead_email: string | null; venditore_nome: string | null; status: string | null; error_reason: string | null }[];
}> {
  const vuoto = { totale: 0, ok: 0, errori: 0, perSales: [], perGiorno: [], ultimi: [] };
  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/wa-click`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ azione: "stats", slug }),
    });
    const j = await r.json();
    return j?.totale === undefined ? vuoto : j;
  } catch {
    return vuoto;
  }
}

export async function fetchTemplate(slug: string): Promise<TemplateWa | null> {
  const { fetchTemplates } = await import("@/lib/whatsapp/templates");
  const all = await fetchTemplates();
  return (all.find((t) => t.slug === slug) as TemplateWa) ?? null;
}

/** Crea il template WhatsApp del lancio. Ritorna lo slug da salvare nella config. */
export async function creaTemplate(input: {
  nome: string; slug: string; messaggio: string; market: string;
  fallback_phone?: string; fallback_message?: string;
}): Promise<{ slug?: string; error?: string }> {
  const { saveTemplate } = await import("@/lib/whatsapp/templates");
  const res = await saveTemplate({
    slug: input.slug, nome: input.nome, messaggio_template: input.messaggio,
    market: input.market, attivo: true,
    fallback_phone: input.fallback_phone?.trim() || null,
    fallback_message: input.fallback_message?.trim() || null,
  });
  if (res === "duplicate") return { error: "Esiste già un link con questo slug" };
  if (res === "error") return { error: "Errore nel salvataggio del link" };
  return { slug: input.slug };
}
