import { supabase } from "@/integrations/supabase/client";

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
}

const norm = (s: string) => (s || "").trim().toLowerCase();

/** Due condizioni si sovrappongono se una stringa contiene l'altra (match "contains" tipico). */
const overlap = (a: string[], b: string[]) =>
  a.some((x) => b.some((y) => {
    const [nx, ny] = [norm(x), norm(y)];
    return !!nx && !!ny && (nx === ny || nx.includes(ny) || ny.includes(nx));
  }));

/** Automazioni attive che potrebbero intercettare gli stessi lead del lancio. */
export async function checkConflitti(
  market: string, condition: string[], trigger_field: string, priority: number, escludiId?: string,
): Promise<Conflitto[]> {
  const { data } = await supabase
    .from("lead_assignment_automations")
    .select("id, nome, attivo, priority, trigger_field, condition_value, action_type")
    .eq("market", market).eq("attivo", true);
  const out: Conflitto[] = [];
  for (const a of (data ?? []) as any[]) {
    if (escludiId && a.id === escludiId) continue;
    if (a.trigger_field !== trigger_field) continue;
    if (!overlap(condition, a.condition_value ?? [])) continue;
    const prima = (a.priority ?? 999) < priority;
    out.push({
      automazione: a.nome,
      motivo: `intercetta le stesse fonti (${(a.condition_value ?? []).join(", ")})`,
      priorityMinore: prima,
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

/** Click del template: totali, per sales e per giorno (da whatsapp_click_logs). */
export async function fetchClickStats(slug: string): Promise<{
  totale: number; ok: number; errori: number;
  perSales: ClickStat[]; perGiorno: { day: string; n: number }[];
  ultimi: { clicked_at: string; lead_nome: string | null; lead_email: string | null; venditore_nome: string | null; status: string | null; error_reason: string | null }[];
}> {
  const { data } = await supabase
    .from("whatsapp_click_logs")
    .select("clicked_at, lead_nome, lead_email, venditore_nome, status, error_reason")
    .eq("template_slug", slug).order("clicked_at", { ascending: false }).limit(5000);
  const rows = (data ?? []) as any[];
  const bySales: Record<string, ClickStat> = {};
  const byDay: Record<string, number> = {};
  let ok = 0, errori = 0;
  for (const r of rows) {
    const v = r.venditore_nome || "—";
    if (!bySales[v]) bySales[v] = { venditore: v, click: 0, ok: 0, fallback: 0, errore: 0 };
    bySales[v].click++;
    if (r.status === "ok") { ok++; bySales[v].ok++; }
    else if (r.status === "fallback") bySales[v].fallback++;
    else { errori++; bySales[v].errore++; }
    const d = String(r.clicked_at ?? "").slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  }
  return {
    totale: rows.length, ok, errori,
    perSales: Object.values(bySales).sort((a, b) => b.click - a.click),
    perGiorno: Object.keys(byDay).sort().map((day) => ({ day, n: byDay[day] })),
    ultimi: rows.slice(0, 30),
  };
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
