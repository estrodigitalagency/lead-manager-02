
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";

export async function getRecentData(tableName: string, limit: number = 100) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching recent data from ${tableName}:`, error);
    throw error;
  }
}

export async function getUnassignedLeads(): Promise<Lead[]> {
  try {
    // QUERY CRITICA: Escludere SEMPRE lead con call prenotate
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null)
      .neq('booked_call', 'SI') // CRITICO: Non mostrare lead con call prenotate
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching unassigned leads:", error);
    throw error;
  }
}

export async function filterLeads(tableName: string, filters: Record<string, any>) {
  try {
    let query = supabase.from(tableName).select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string') {
          query = query.ilike(key, `%${value}%`);
        } else {
          query = query.eq(key, value);
        }
      }
    });
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error filtering ${tableName}:`, error);
    throw error;
  }
}

export async function bulkDeleteLeads(tableName: string, ids: string[]) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error bulk deleting from ${tableName}:`, error);
    throw error;
  }
}

export async function getAllFonti() {
  try {
    const { data, error } = await supabase
      .from('database_fonti')
      .select('*')
      .eq('attivo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching fonti:", error);
    return [];
  }
}

export async function getAllCampagne() {
  try {
    const { data, error } = await supabase
      .from('database_campagne')
      .select('*')
      .eq('attivo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching campagne:", error);
    return [];
  }
}

export async function getUniqueSourcesFromLeads(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('fonte')
      .not('fonte', 'is', null)
      .not('fonte', 'eq', '');
    
    if (error) throw error;
    
    // Extract and flatten all sources
    const allSources = new Set<string>();
    data?.forEach(item => {
      if (item.fonte) {
        // Split by comma and add each source
        item.fonte.split(',').forEach((source: string) => {
          const trimmedSource = source.trim();
          if (trimmedSource) {
            allSources.add(trimmedSource);
          }
        });
      }
    });
    
    return Array.from(allSources).sort();
  } catch (error) {
    console.error("Error fetching unique sources:", error);
    return [];
  }
}

export async function syncSourcesToDatabase() {
  try {
    const uniqueSources = await getUniqueSourcesFromLeads();
    
    for (const source of uniqueSources) {
      const { error } = await supabase
        .from('database_fonti')
        .upsert(
          { nome: source, descrizione: `Fonte automatica: ${source}` },
          { onConflict: 'nome', ignoreDuplicates: true }
        );
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`Error syncing source ${source}:`, error);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error syncing sources to database:", error);
    return { success: false, error };
  }
}

export async function getLeadsStats() {
  try {
    const [totalResult, assignableResult, assignedResult, bookedResult] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('assignable', true)
        .is('venditore', null)
        .neq('booked_call', 'SI'), // CRITICO: Escludere lead con call prenotate
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
    console.error('Error fetching leads stats:', error);
    return {
      total: 0,
      assignable: 0,
      assigned: 0,
      booked: 0
    };
  }
}
