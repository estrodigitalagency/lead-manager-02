/**
 * Regole di assegnazione, senza accesso al database.
 *
 * Vivono qui perché le usano sia il webhook che assegna davvero i lead sia la prova a vuoto
 * della configurazione di un lancio: se il test riscrivesse le stesse condizioni per conto suo
 * finirebbe per divergere dal comportamento reale e direbbe che tutto va bene mentre in
 * produzione succede altro.
 */

export function calculateDaysSince(dateString: string): number {
  const date = new Date(dateString);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Valore del campo su cui la regola ragiona (stesso campo per condizione ed esclusioni). */
export function valoreCampo(lead: any, triggerField: string): string {
  switch (triggerField) {
    case 'fonte': return lead.fonte || '';
    case 'campagna': return lead.campagna || '';
    case 'nome': return lead.nome || '';
    case 'email': return lead.email || '';
    case 'telefono': return lead.telefono || '';
    case 'lead_score': return lead.lead_score || '';
    case 'created_at': return lead.created_at || '';
    default: return lead.ultima_fonte || '';
  }
}

export function checkCondition(
  lead: any, triggerField: string, conditionType: string, conditionValues: string[],
): boolean {
  if (!conditionValues || conditionValues.length === 0) return false;
  const field = valoreCampo(lead, triggerField).toLowerCase();
  const vals = conditionValues.map((v) => String(v).toLowerCase());
  switch (conditionType) {
    case 'contains': return vals.some((v) => field.includes(v));
    case 'equals': return vals.some((v) => field === v);
    case 'starts_with': return vals.some((v) => field.startsWith(v));
    case 'ends_with': return vals.some((v) => field.endsWith(v));
    // vero solo se il campo non contiene nessuno dei valori
    case 'not_contains': return vals.every((v) => !field.includes(v));
    default: return false;
  }
}

/** Perché una regola non si applica: utile al test, ignorato da chi assegna. */
export type EsitoRegola = { vale: true } | { vale: false; motivo: string };

export function valutaRegola(lead: any, automation: any): EsitoRegola {
  const shouldTrigger = automation.trigger_when === 'new_lead' ||
    (automation.trigger_when === 'duplicate_different_source' &&
      lead.ultima_fonte && String(lead.ultima_fonte).trim() !== '');
  if (!shouldTrigger) return { vale: false, motivo: 'momento di attivazione diverso' };

  const esclusioni: string[] = automation.trigger_sources || [];
  if (esclusioni.length > 0) {
    const campo = valoreCampo(lead, automation.trigger_field).toLowerCase();
    const hit = esclusioni.find((e) => e.trim() && campo.includes(e.trim().toLowerCase()));
    if (hit) return { vale: false, motivo: `escluso da "${hit}"` };
  }

  if (!checkCondition(lead, automation.trigger_field, automation.condition_type, automation.condition_value)) {
    return { vale: false, motivo: `la condizione non corrisponde a "${valoreCampo(lead, automation.trigger_field)}"` };
  }
  return { vale: true };
}

export function regolaSiApplica(lead: any, automation: any): boolean {
  return valutaRegola(lead, automation).vale;
}

/**
 * Il lead è stato assegnato di recente abbastanza da restare al suo venditore?
 * lock_period_days: -1 = sempre, 0/assente = nessun limite, N = entro N giorni.
 */
export function entroLockPeriod(automation: any, dataAssegnazione: string | null): boolean {
  const lock = automation.lock_period_days;
  if (lock === null || lock === undefined || lock === 0 || lock === -1) return true;
  if (!dataAssegnazione) return false;
  return calculateDaysSince(dataAssegnazione) < lock;
}

export interface SlotEleggibile { slot: any; seller: any }

/**
 * Slot che possono ancora ricevere lead: venditore attivo, tetto individuale non raggiunto e,
 * in modalità quota assoluta, quota non esaurita.
 */
export function slotEleggibili(
  config: any[], counts: Record<string, number>, attivi: any[], mode: string,
): SlotEleggibile[] {
  let eligible = (config || [])
    .map((slot: any) => ({ slot, seller: attivi.find((s: any) => s.id === slot.venditore_id) }))
    .filter((e: any) => !!e.seller)
    .filter((e: any) => {
      const cap = e.slot.cap;
      if (!cap || cap <= 0) return true;
      return (counts[e.slot.venditore_id] || 0) < cap;
    });

  if (mode === 'count') {
    eligible = eligible.filter((e: any) => (counts[e.slot.venditore_id] || 0) < (e.slot.count_target || 0));
  }
  return eligible;
}
