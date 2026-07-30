import { supabase } from "@/integrations/supabase/client";

// Template link WhatsApp. Persistiti in system_settings (RLS disabilitato) invece
// della tabella whatsapp_templates: l'app usa la anon key senza sessione auth, e la
// tabella ha RLS "authenticated" che rifiuta insert/update/delete dal browser.
// Chiave unica globale (i template contengono già il campo market).
export interface WaTemplate {
  id: string;
  slug: string;
  nome: string;
  messaggio_template: string;
  market: string;
  attivo: boolean;
  click_count: number;
  fallback_phone: string | null;
  fallback_message: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = "whatsapp_templates";
const nowISO = () => new Date().toISOString();

async function readAll(): Promise<WaTemplate[]> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", KEY).maybeSingle();
  if (!data?.value) return [];
  try {
    const p = JSON.parse(data.value);
    return Array.isArray(p) ? (p as WaTemplate[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: WaTemplate[]): Promise<boolean> {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: KEY, value: JSON.stringify(list), descrizione: "Template link WhatsApp" }, { onConflict: "key" });
  return !error;
}

export async function fetchTemplates(market?: string): Promise<WaTemplate[]> {
  const all = await readAll();
  const list = market ? all.filter((t) => t.market === market) : all;
  return list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

export async function fetchTemplateBySlug(slug: string): Promise<WaTemplate | null> {
  const all = await readAll();
  return all.find((t) => t.slug === slug && t.attivo) || null;
}

export interface SaveTemplateInput {
  id?: string;
  slug: string;
  nome: string;
  messaggio_template: string;
  market: string;
  attivo: boolean;
  fallback_phone: string | null;
  fallback_message: string | null;
}

// Ritorna 'duplicate' se lo slug è già usato da un altro template, 'error' su fallimento scrittura.
export async function saveTemplate(input: SaveTemplateInput): Promise<"ok" | "duplicate" | "error"> {
  const all = await readAll();
  if (all.some((t) => t.slug === input.slug && t.id !== input.id)) return "duplicate";
  if (input.id) {
    const i = all.findIndex((t) => t.id === input.id);
    if (i >= 0) all[i] = { ...all[i], ...input, updated_at: nowISO() };
  } else {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    all.unshift({ ...input, id, click_count: 0, created_at: nowISO(), updated_at: nowISO() });
  }
  return (await writeAll(all)) ? "ok" : "error";
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const all = await readAll();
  return writeAll(all.filter((t) => t.id !== id));
}

// Incremento click best-effort (non atomico, come prima).
export async function incrementTemplateClick(slug: string): Promise<void> {
  const all = await readAll();
  const t = all.find((x) => x.slug === slug);
  if (!t) return;
  t.click_count = (t.click_count || 0) + 1;
  await writeAll(all);
}
