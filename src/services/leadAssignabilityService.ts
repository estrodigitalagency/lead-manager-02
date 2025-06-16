
import { supabase } from "@/integrations/supabase/client";

export interface AssignabilityCheckResult {
  totalChecked: number;
  updated: number;
  availableLeads: number;
}

// Callback globale per notificare l'aggiornamento
let globalRefreshCallback: (() => Promise<void>) | null = null;

export function setGlobalRefreshCallback(callback: (() => Promise<void>) | null) {
  globalRefreshCallback = callback;
}

export async function checkLeadsAssignability(): Promise<AssignabilityCheckResult> {
  try {
    console.log("🔍 Avvio verifica assegnabilità lead...");
    
    // Chiamata alla funzione edge per verificare l'assegnabilità
    const { data, error } = await supabase.functions.invoke('lead-check');
    
    if (error) {
      console.error('❌ Errore nella verifica assegnabilità:', error);
      throw error;
    }
    
    console.log("✅ Verifica assegnabilità completata:", data);
    
    // Conta i lead disponibili dopo la verifica - CRITICO: Solo quelli senza call prenotate
    const { count: availableCount, error: countError } = await supabase
      .from('lead_generation')
      .select('id', { count: 'exact', head: true })
      .eq('assignable', true)
      .is('venditore', null)
      .eq('booked_call', 'NO'); // CRITICO: Solo lead senza call prenotate
    
    if (countError) {
      console.error('❌ Errore nel conteggio lead disponibili:', countError);
    }

    const result = {
      totalChecked: data?.checked || 0,
      updated: data?.updated || 0,
      availableLeads: availableCount || 0
    };

    // Trigger refresh globale IMMEDIATAMENTE dopo la verifica
    if (globalRefreshCallback) {
      console.log("🔄 Triggering global data refresh...");
      await globalRefreshCallback();
    }
    
    return result;
  } catch (error) {
    console.error('❌ Errore durante la verifica assegnabilità:', error);
    throw error;
  }
}

export async function getOptimizedLeadCounts() {
  try {
    // Query ottimizzata per ottenere tutti i conteggi in una sola chiamata
    const [totalResult, assignableResult, assignedResult, bookedResult] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('assignable', true)
        .is('venditore', null)
        .eq('booked_call', 'NO'), // CRITICO: Solo lead senza call prenotate
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .not('venditore', 'is', null),
      supabase.from('booked_call').select('id', { count: 'exact', head: true })
    ]);

    return {
      total: totalResult.count || 0,
      assignable: assignableResult.count || 0,
      assigned: assignedResult.count || 0,
      booked: bookedResult.count || 0
    };
  } catch (error) {
    console.error('❌ Errore nel recupero conteggi ottimizzati:', error);
    throw error;
  }
}
