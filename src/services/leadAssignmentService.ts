
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
  excludedSources: string[];
}

export async function assignLeadsWithExclusions(data: LeadAssignmentData) {
  try {
    console.log("Inizio processo di assegnazione con dati:", data);
    
    // Get global webhook URL from system settings
    const { data: webhookData, error: webhookError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_assign_webhook_url')
      .single();
    
    console.log("Webhook data retrieved:", webhookData);
    
    if (webhookError) {
      console.error('Errore nel recupero webhook URL:', webhookError);
      throw new Error(`Errore webhook: ${webhookError.message}`);
    }
    
    if (!webhookData?.value) {
      throw new Error('Webhook URL non configurato nelle impostazioni');
    }

    const webhookUrl = webhookData.value;
    console.log("Using webhook URL:", webhookUrl);

    // Get venditore details INCLUDING Google Sheets info
    const { data: venditorData, error: venditorError } = await supabase
      .from('venditori')
      .select('*')
      .eq('stato', 'attivo')
      .ilike('nome', `%${data.venditore.split(' ')[0]}%`)
      .ilike('cognome', `%${data.venditore.split(' ')[1] || ''}%`);
    
    console.log("Venditore data retrieved:", venditorData);
    
    if (venditorError) {
      console.error('Errore nel recupero dati venditore:', venditorError);
      throw new Error(`Errore venditore: ${venditorError.message}`);
    }
    
    if (!venditorData || venditorData.length === 0) {
      throw new Error(`Venditore "${data.venditore}" non trovato nella tabella venditori`);
    }

    // If multiple results, try to find exact match
    let selectedVenditore = venditorData[0];
    if (venditorData.length > 1) {
      const exactMatch = venditorData.find(v => 
        `${v.nome} ${v.cognome}`.toLowerCase() === data.venditore.toLowerCase()
      );
      if (exactMatch) {
        selectedVenditore = exactMatch;
      }
    }

    console.log("Selected venditore:", selectedVenditore);

    // Costruisci la query per ottenere i lead assegnabili - ORDINA PER DATA CREAZIONE (PIÙ VECCHI PRIMA)
    console.log("Costruzione query per lead assegnabili (ordinati cronologicamente)...");
    let query = supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null)
      .neq('booked_call', 'SI') // Escludi lead con call prenotate
      .order('created_at', { ascending: true }) // I più vecchi prima
      .limit(data.numLead);

    if (data.excludedSources.length > 0) {
      console.log("Applicando esclusioni per fonti:", data.excludedSources);
      data.excludedSources.forEach(source => {
        query = query.not('fonte', 'like', `%${source}%`);
      });
    }

    const { data: leadsToAssign, error: fetchError } = await query;
    
    console.log("Lead recuperati per assegnazione (ordinati cronologicamente):", leadsToAssign?.length || 0);
    if (leadsToAssign && leadsToAssign.length > 0) {
      console.log("Primo lead (più vecchio):", {
        id: leadsToAssign[0].id,
        email: leadsToAssign[0].email,
        created_at: leadsToAssign[0].created_at
      });
      console.log("Ultimo lead (più recente):", {
        id: leadsToAssign[leadsToAssign.length - 1].id,
        email: leadsToAssign[leadsToAssign.length - 1].email,
        created_at: leadsToAssign[leadsToAssign.length - 1].created_at
      });
    }
    
    if (fetchError) {
      console.error('Errore nel recupero lead:', fetchError);
      throw new Error(`Errore recupero lead: ${fetchError.message}`);
    }
    
    if (!leadsToAssign || leadsToAssign.length < data.numLead) {
      const availableCount = leadsToAssign?.length || 0;
      throw new Error(`Solo ${availableCount} lead disponibili per l'assegnazione (richiesti: ${data.numLead}).`);
    }
    
    console.log(`Assegnando ${leadsToAssign.length} lead a ${data.venditore} (ordinati cronologicamente):`, 
      leadsToAssign.map(l => ({ id: l.id, email: l.email, created_at: l.created_at })));
    
    // Aggiorna i lead per assegnarli
    const leadIds = leadsToAssign.map(lead => lead.id);
    
    const updateObj: Record<string, any> = { venditore: data.venditore };
    if (data.campagna) updateObj.campagna = data.campagna;
    
    console.log("Aggiornamento lead con oggetto:", updateObj);
    
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update(updateObj)
      .in('id', leadIds);
    
    if (updateError) {
      console.error('Errore nell\'aggiornamento lead:', updateError);
      throw new Error(`Errore aggiornamento lead: ${updateError.message}`);
    }

    console.log("Lead aggiornati con successo (cronologicamente ordinati)");

    // Salva la nuova campagna se non esiste
    if (data.campagna && data.campagna.trim()) {
      try {
        console.log("Tentativo di salvare nuova campagna:", data.campagna);
        await supabase
          .from('database_campagne')
          .insert([{ nome: data.campagna.trim() }])
          .select()
          .single();
        console.log("Campagna salvata con successo");
      } catch (error) {
        console.log('Campagna già esistente o errore nel salvataggio:', error);
      }
    }

    // Registra nell'assignment_history
    console.log("Registrazione nell'assignment_history...");
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        leads_count: leadsToAssign.length,
        venditore: data.venditore,
        campagna: data.campagna || null,
        fonti_escluse: data.excludedSources.length > 0 ? data.excludedSources : null
      });

    if (historyError) {
      console.error("Error recording assignment history:", historyError);
    } else {
      console.log("Assignment history registrato con successo");
    }

    // Invia tramite webhook globale con TUTTI i dati richiesti inclusi Google Sheets
    if (leadsToAssign.length > 0) {
      try {
        console.log("Preparazione dati per webhook...");
        const assignmentData = {
          venditore: data.venditore,
          venditore_cognome: selectedVenditore.cognome || '',
          venditore_email: selectedVenditore.email || '',
          venditore_telefono: selectedVenditore.telefono || '',
          google_sheets_file_id: selectedVenditore.sheets_file_id,
          google_sheets_tab_name: selectedVenditore.sheets_tab_name,
          campagna: data.campagna || '',
          leads: leadsToAssign.map(lead => ({
            id: lead.id,
            nome: lead.nome,
            cognome: lead.cognome || '',
            email: lead.email || '',
            telefono: lead.telefono || '',
            fonte: lead.fonte || '',
            note: lead.note || '',
            created_at: lead.created_at,
            assigned_at: new Date().toISOString()
          })),
          timestamp: new Date().toISOString(),
          leads_count: leadsToAssign.length
        };

        console.log('Invio dati tramite webhook globale:', assignmentData);

        const response = await supabase.functions.invoke('lead-assign-webhook', {
          body: { 
            assignmentData,
            webhookUrl
          }
        });
        
        if (response.error) {
          console.error("Error sending to webhook:", response.error);
          toast.warning("Lead assegnati ma errore nell'invio al webhook");
        } else {
          console.log("Successfully sent to webhook:", response.data);
          toast.success("Lead assegnati e inviati tramite webhook");
        }
      } catch (error) {
        console.error("Error in webhook delivery:", error);
        toast.warning("Lead assegnati ma errore nel sistema di delivery");
      }
    }
    
    return leadsToAssign;
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}
