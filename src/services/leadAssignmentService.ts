import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLeadStatus } from "@/utils/leadStatus";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
  excludedSources?: string[];
  includedSources?: string[];
  bypassTimeInterval?: boolean;
}

export async function assignLeadsWithExclusions(data: LeadAssignmentData) {
  const { 
    numLead, 
    venditore, 
    campagna, 
    excludedSources = [], 
    includedSources = [], 
    bypassTimeInterval = false 
  } = data;

  try {
    console.log(`Attempting to assign ${numLead} leads to ${venditore}`);
    console.log('Included sources:', includedSources);
    console.log('Excluded sources:', excludedSources);
    console.log('Bypass time interval:', bypassTimeInterval);

    // Prima recupera le impostazioni per il calcolo dello stato
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // QUERY CRITICA: Recupera tutti i lead candidati con tutti i campi necessari per il tipo Lead
    let query = supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, created_at, booked_call, venditore')
      .is('venditore', null)
      .eq('booked_call', 'NO'); // Solo lead senza call prenotate

    // Apply dual source filtering logic
    // Step 1: If there are included sources, filter to only those
    if (includedSources.length > 0) {
      const includeFilters = includedSources.map(source => `fonte.like.%${source}%`).join(',');
      query = query.or(includeFilters);
    }

    // Get candidate leads after inclusion filter
    const { data: candidateLeads, error: fetchError } = await query
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw new Error(`Errore nel recupero dei lead: ${fetchError.message}`);
    }

    if (!candidateLeads || candidateLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    // Step 2: Apply exclusion filter to the candidates
    let filteredLeads = candidateLeads;
    if (excludedSources.length > 0) {
      filteredLeads = candidateLeads.filter(lead => {
        if (!lead.fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.fonte.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
    }

    console.log(`Found ${filteredLeads.length} leads after include/exclude filtering (from ${candidateLeads.length} initial candidates)`);

    let assignableLeads;

    if (bypassTimeInterval) {
      // Se bypass è attivo, considera tutti i lead filtrati
      assignableLeads = filteredLeads;
      console.log(`Bypass attivo: considerando tutti i ${filteredLeads.length} lead filtrati`);
    } else {
      // Comportamento normale: filtra solo i lead con stato "Assegnabile"
      assignableLeads = filteredLeads.filter(lead => {
        const status = getLeadStatus(lead, daysBeforeAssignable);
        return status.label === 'Assegnabile';
      });
      console.log(`Found ${assignableLeads.length} assignable leads out of ${filteredLeads.length} filtered candidates`);
    }

    if (assignableLeads.length === 0) {
      const message = bypassTimeInterval 
        ? 'Nessun lead disponibile per l\'assegnazione dopo i filtri'
        : 'Nessun lead con stato "Assegnabile" disponibile dopo i filtri';
      throw new Error(message);
    }

    // Take only the requested number of leads
    const leadsToAssign = assignableLeads.slice(0, numLead);
    const actualAssignedCount = leadsToAssign.length;

    if (actualAssignedCount < numLead) {
      console.warn(`Solo ${actualAssignedCount} lead assegnabili disponibili su ${numLead} richiesti`);
    }

    const leadIds = leadsToAssign.map(lead => lead.id);
    console.log(`Assigning ${actualAssignedCount} leads (from oldest to newest):`, leadIds);

    // Update the leads with the assigned salesperson - using only 'assegnato' state
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        venditore,
        campagna: campagna || null,
        stato: 'assegnato',
        assignable: false
      })
      .in('id', leadIds);

    if (updateError) {
      console.error('Error updating leads:', updateError);
      throw new Error(`Errore nell'aggiornamento dei lead: ${updateError.message}`);
    }

    // MIGLIORAMENTO: Cerca venditore per nome completo (nome + cognome)
    const venditoreParts = venditore.trim().split(' ');
    const nomeVenditore = venditoreParts[0];
    const cognomeVenditore = venditoreParts.slice(1).join(' ');

    console.log(`Cercando venditore: nome="${nomeVenditore}", cognome="${cognomeVenditore}"`);

    // Prova prima con nome e cognome separati
    let venditoreDates = null;
    let venditoreError = null;

    if (cognomeVenditore) {
      const { data, error } = await supabase
        .from('venditori')
        .select('nome, cognome, email, telefono, sheets_file_id, sheets_tab_name')
        .eq('nome', nomeVenditore)
        .eq('cognome', cognomeVenditore)
        .single();
      
      venditoreDates = data;
      venditoreError = error;
    }

    // Se non trova con nome/cognome separati, prova con nome completo nel campo nome
    if (!venditoreDates) {
      const { data, error } = await supabase
        .from('venditori')
        .select('nome, cognome, email, telefono, sheets_file_id, sheets_tab_name')
        .eq('nome', venditore)
        .single();
      
      venditoreDates = data;
      venditoreError = error;
    }

    // Se ancora non trova, prova cercando per nome che contiene il valore
    if (!venditoreDates) {
      const { data, error } = await supabase
        .from('venditori')
        .select('nome, cognome, email, telefono, sheets_file_id, sheets_tab_name')
        .ilike('nome', `%${nomeVenditore}%`)
        .single();
      
      venditoreDates = data;
      venditoreError = error;
    }

    if (venditoreError || !venditoreDates) {
      console.warn('Could not fetch venditore details:', venditoreError);
      console.warn('Proceeding without venditore details for webhook');
    } else {
      console.log('Venditore trovato:', venditoreDates);
    }

    // Get webhook URL
    const { data: webhookData, error: webhookError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_assign_webhook_url')
      .single();

    if (!webhookError && webhookData?.value) {
      console.log('Calling webhook for lead assignment...');
      
      // Prepare webhook payload with all required data
      const assignmentPayload = {
        venditore: nomeVenditore,
        venditore_cognome: venditoreDates?.cognome || cognomeVenditore || '',
        venditore_email: venditoreDates?.email || '',
        venditore_telefono: venditoreDates?.telefono || '',
        google_sheets_file_id: venditoreDates?.sheets_file_id || '',
        google_sheets_tab_name: venditoreDates?.sheets_tab_name || '',
        campagna: campagna || '',
        leads_count: actualAssignedCount,
        timestamp: new Date().toISOString(),
        leads: leadsToAssign.map(lead => ({
          id: lead.id,
          nome: lead.nome,
          cognome: lead.cognome || '',
          email: lead.email || '',
          telefono: lead.telefono || '',
          fonte: lead.fonte || '',
          created_at: lead.created_at,
          assigned_at: new Date().toISOString()
        }))
      };

      console.log('Payload webhook con dati venditore:', {
        venditore: assignmentPayload.venditore,
        venditore_cognome: assignmentPayload.venditore_cognome,
        google_sheets_file_id: assignmentPayload.google_sheets_file_id,
        google_sheets_tab_name: assignmentPayload.google_sheets_tab_name,
        leads_count: assignmentPayload.leads_count
      });

      try {
        const { data: webhookResponse, error: webhookCallError } = await supabase.functions.invoke('lead-assign-webhook', {
          body: {
            assignmentData: assignmentPayload,
            webhookUrl: webhookData.value
          }
        });

        if (webhookCallError) {
          console.error('Webhook call error:', webhookCallError);
          toast.error('Lead assegnati ma errore nell\'invio del webhook');
        } else {
          console.log('Webhook called successfully:', webhookResponse);
          toast.success('Lead assegnati e webhook inviato con successo');
        }
      } catch (webhookError) {
        console.error('Error calling webhook:', webhookError);
        toast.error('Lead assegnati ma errore nell\'invio del webhook');
      }
    } else {
      console.warn('No webhook URL configured');
      toast.success('Lead assegnati (nessun webhook configurato)');
    }

    // Record the assignment in history
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        venditore,
        leads_count: actualAssignedCount,
        campagna: campagna || null,
        fonti_escluse: bypassTimeInterval ? excludedSources.length > 0 ? excludedSources : null : null
      });

    if (historyError) {
      console.error('Error recording assignment history:', historyError);
      // Don't throw here as the main assignment succeeded
    }

    // Update salesperson's current lead count - cerca usando la stessa logica
    let currentVenditore = null;
    
    if (cognomeVenditore) {
      const { data } = await supabase
        .from('venditori')
        .select('lead_attuali')
        .eq('nome', nomeVenditore)
        .eq('cognome', cognomeVenditore)
        .single();
      currentVenditore = data;
    }

    if (!currentVenditore) {
      const { data } = await supabase
        .from('venditori')
        .select('lead_attuali')
        .eq('nome', venditore)
        .single();
      currentVenditore = data;
    }

    if (!currentVenditore) {
      const { data } = await supabase
        .from('venditori')
        .select('lead_attuali')
        .ilike('nome', `%${nomeVenditore}%`)
        .single();
      currentVenditore = data;
    }

    if (currentVenditore) {
      const newLeadCount = (currentVenditore.lead_attuali || 0) + actualAssignedCount;
      
      // Aggiorna usando la stessa logica di ricerca
      if (cognomeVenditore) {
        await supabase
          .from('venditori')
          .update({ lead_attuali: newLeadCount })
          .eq('nome', nomeVenditore)
          .eq('cognome', cognomeVenditore);
      } else {
        await supabase
          .from('venditori')
          .update({ lead_attuali: newLeadCount })
          .eq('nome', venditore);
      }
    }

    console.log(`Successfully assigned ${actualAssignedCount} leads to ${venditore} (bypass: ${bypassTimeInterval})`);
    return { assignedCount: actualAssignedCount, leads: leadsToAssign };

  } catch (error) {
    console.error('Assignment error:', error);
    throw error;
  }
}

export async function getAvailableLeadsCount(
  excludedSources: string[] = [], 
  includedSources: string[] = [], 
  bypassTimeInterval: boolean = false
): Promise<number> {
  try {
    // Prima recupera le impostazioni
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // Recupera tutti i candidati con tutti i campi necessari
    let query = supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, created_at, booked_call, venditore')
      .is('venditore', null)
      .eq('booked_call', 'NO');

    // Apply dual source filtering logic
    // Step 1: If there are included sources, filter to only those
    if (includedSources.length > 0) {
      const includeFilters = includedSources.map(source => `fonte.like.%${source}%`).join(',');
      query = query.or(includeFilters);
    }

    const { data: candidates, error } = await query;
    
    if (error) {
      console.error('Error counting available leads:', error);
      return 0;
    }

    if (!candidates) return 0;

    // Step 2: Apply exclusion filter to the candidates
    let filteredCandidates = candidates;
    if (excludedSources.length > 0) {
      filteredCandidates = candidates.filter(lead => {
        if (!lead.fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.fonte.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
    }

    if (bypassTimeInterval) {
      // Se bypass è attivo, conta tutti i candidati filtrati
      return filteredCandidates.length;
    } else {
      // Comportamento normale: filtra solo quelli con stato "Assegnabile"
      const assignableCount = filteredCandidates.filter(lead => {
        const status = getLeadStatus(lead, daysBeforeAssignable);
        return status.label === 'Assegnabile';
      }).length;
      
      return assignableCount;
    }
  } catch (error) {
    console.error('Error in getAvailableLeadsCount:', error);
    return 0;
  }
}
