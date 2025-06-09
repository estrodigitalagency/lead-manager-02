
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  leadGenerati: number;
  conversioneMedia: number;
  venditoriAttivi: number;
  speedToLead: number; // in ore
}

export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // 1. Lead generati negli ultimi 30 giorni
    const { count: leadGenerati } = await supabase
      .from('lead_generation')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgoISO);

    // 2. Lead lavorati con esito "Prenotato Triage" o "Prenotato Closing" negli ultimi 30 giorni
    const { count: leadPrenotati } = await supabase
      .from('lead_lavorati')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgoISO)
      .in('esito', ['Prenotato Triage', 'Prenotato Closing']);

    // 3. Venditori attivi (che hanno almeno un lead assegnato negli ultimi 30 giorni)
    const { data: venditoriData } = await supabase
      .from('lead_generation')
      .select('venditore')
      .not('venditore', 'is', null)
      .gte('created_at', thirtyDaysAgoISO);

    const venditoriAttivi = new Set(venditoriData?.map(v => v.venditore)).size;

    // 4. Speed to Lead - tempo medio tra generazione e assegnazione
    const { data: assignedLeads } = await supabase
      .from('lead_generation')
      .select('created_at, updated_at')
      .not('venditore', 'is', null)
      .gte('created_at', thirtyDaysAgoISO);

    let speedToLead = 0;
    if (assignedLeads && assignedLeads.length > 0) {
      const totalTime = assignedLeads.reduce((acc, lead) => {
        const createdAt = new Date(lead.created_at!);
        const assignedAt = new Date(lead.updated_at!);
        const diffHours = (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return acc + diffHours;
      }, 0);
      speedToLead = totalTime / assignedLeads.length;
    }

    // Calcola conversione media
    const conversioneMedia = leadGenerati && leadGenerati > 0 
      ? ((leadPrenotati || 0) / leadGenerati) * 100 
      : 0;

    return {
      leadGenerati: leadGenerati || 0,
      conversioneMedia: Math.round(conversioneMedia * 10) / 10,
      venditoriAttivi: venditoriAttivi || 0,
      speedToLead: Math.round(speedToLead * 10) / 10
    };
  } catch (error) {
    console.error('Errore nel recupero dei dati analytics:', error);
    return {
      leadGenerati: 0,
      conversioneMedia: 0,
      venditoriAttivi: 0,
      speedToLead: 0
    };
  }
};
