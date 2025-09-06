import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLeadStatus } from "@/utils/leadStatus";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
  excludedSources?: string[];
  includedSources?: string[];
  sourceMode?: 'exclude' | 'include';
  bypassTimeInterval?: boolean;
  excludeFromIncluded?: string[];
  onlyHotLeads?: boolean;
}

export async function assignLeadsWithExclusions(data: LeadAssignmentData) {
  const { 
    numLead, 
    venditore, 
    campagna, 
    excludedSources = [], 
    includedSources = [], 
    sourceMode = 'exclude',
    bypassTimeInterval = false,
    excludeFromIncluded = [], 
    onlyHotLeads = false
  } = data;

  try {
    console.log(`Attempting to assign ${numLead} leads to ${venditore}`);
    console.log('Source mode:', sourceMode);
    console.log('Excluded sources:', excludedSources);
    console.log('Included sources:', includedSources);
    console.log('Exclude from included:', excludeFromIncluded);
    console.log('Bypass time interval:', bypassTimeInterval);
    console.log('Only hot leads:', onlyHotLeads);

    // Prima recupera le impostazioni per il calcolo dello stato
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // QUERY BASE: Recupera tutti i lead candidati
    let query = supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, lead_score, created_at, booked_call, venditore')
      .is('venditore', null)
      .eq('booked_call', 'NO');
      
    // IMPORTANTE: Filtro per Lead Score = "Hot" SOLO se richiesto esplicitamente
    if (onlyHotLeads) {
      query = query.eq('lead_score', 'Hot');
    }

    // Apply source filtering logic SOLO se ci sono fonti specificate
    if (sourceMode === 'include' && includedSources.length > 0) {
      const includeFilters = includedSources.map(source => `fonte.like.%${source}%`).join(',');
      query = query.or(includeFilters);
    }

    // Get all candidate leads ordered from oldest to newest
    const { data: candidateLeads, error: fetchError } = await query
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw new Error(`Errore nel recupero dei lead: ${fetchError.message}`);
    }

    if (!candidateLeads || candidateLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    console.log(`Found ${candidateLeads.length} candidate leads before filtering`);

    // Convert lead_score from string to number if needed for type compatibility
    const convertedLeads = candidateLeads.map(lead => ({
      ...lead,
      lead_score: lead.lead_score ? (typeof lead.lead_score === 'string' ? parseInt(lead.lead_score) : lead.lead_score) : undefined
    }));

    // Apply exclusion filter SOLO se ci sono esclusioni specificate
    let filteredLeads = convertedLeads;
    if (sourceMode === 'exclude' && excludedSources.length > 0) {
      filteredLeads = convertedLeads.filter(lead => {
        if (!lead.fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.fonte!.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
      console.log(`After exclusion filter: ${filteredLeads.length} leads`);
    }

    // Apply exclusions from included sources SOLO se specificate
    if (excludeFromIncluded.length > 0 && includedSources.length > 0) {
      console.log(`Applying exclusions from included sources: ${excludeFromIncluded.join(', ')}`);
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.fonte) return true;
        
        const isFromIncludedSource = includedSources.some(includedSource => 
          lead.fonte!.toLowerCase().includes(includedSource.toLowerCase())
        );
        
        if (isFromIncludedSource) {
          const hasExcludedTag = excludeFromIncluded.some(excludedTag => 
            lead.fonte!.toLowerCase().includes(excludedTag.toLowerCase())
          );
          return !hasExcludedTag;
        }
        
        return true;
      });
      
      console.log(`Leads after applying exclusions from included sources: ${filteredLeads.length}`);
    }

    let assignableLeads;

    if (bypassTimeInterval) {
      // Se bypass è attivo, considera tutti i lead filtrati
      assignableLeads = filteredLeads;
      console.log(`Bypass attivo: considerando tutti i ${filteredLeads.length} lead candidati`);
    } else {
      // Comportamento normale: filtra solo i lead con stato "Assegnabile"
      assignableLeads = filteredLeads.filter(lead => {
        const status = getLeadStatus(lead, daysBeforeAssignable);
        return status.label === 'Assegnabile';
      });
      console.log(`Found ${assignableLeads.length} assignable leads out of ${filteredLeads.length} candidates`);
    }

    if (assignableLeads.length === 0) {
      const message = bypassTimeInterval 
        ? 'Nessun lead disponibile per l\'assegnazione con i filtri applicati'
        : 'Nessun lead con stato "Assegnabile" disponibile con i filtri applicati';
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
    const currentTimestamp = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        venditore,
        campagna: (campagna && campagna.trim() !== '') ? campagna : null,
        stato: 'assegnato',
        assignable: false,
        data_assegnazione: currentTimestamp
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
        campagna: (campagna && campagna.trim() !== '') ? campagna : null,
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

        console.log('Webhook response:', webhookResponse);
        console.log('Webhook error:', webhookCallError);

        // Gestione migliorata della risposta del webhook
        if (webhookCallError) {
          console.error('Webhook call error:', webhookCallError);
          toast.warning('Lead assegnati correttamente, ma il webhook ha restituito un errore. Verifica su Make se i dati sono stati ricevuti.');
        } else {
          // Considera il webhook come successo se non ci sono errori, anche se la risposta non è JSON
          console.log('Webhook called successfully');
          toast.success(`${actualAssignedCount} lead assegnati con successo e dati inviati al webhook`);
        }
      } catch (webhookError) {
        console.error('Error calling webhook:', webhookError);
        toast.warning('Lead assegnati correttamente, ma errore di connessione al webhook. Verifica su Make se i dati sono stati ricevuti.');
      }
    } else {
      console.warn('No webhook URL configured');
      toast.success(`${actualAssignedCount} lead assegnati con successo (nessun webhook configurato)`);
    }

    // Record the assignment in history with all fields including the new one
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        venditore,
        leads_count: actualAssignedCount,
        campagna: campagna || null,
        fonti_escluse: excludedSources.length > 0 ? excludedSources : null,
        fonti_incluse: includedSources.length > 0 ? includedSources : null,
        exclude_from_included: excludeFromIncluded.length > 0 ? excludeFromIncluded : null,
        source_mode: sourceMode,
        bypass_time_interval: bypassTimeInterval
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
  sourceMode: 'exclude' | 'include' = 'exclude',
  bypassTimeInterval: boolean = false,
  excludeFromIncluded: string[] = [], 
  onlyHotLeads: boolean = false
): Promise<number> {
  try {
    console.log('getAvailableLeadsCount called with:', {
      excludedSources: excludedSources.length,
      includedSources: includedSources.length,
      sourceMode,
      bypassTimeInterval,
      excludeFromIncluded: excludeFromIncluded.length,
      onlyHotLeads
    });

    // Prima recupera le impostazioni
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // QUERY BASE: Recupera tutti i candidati
    let query = supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, lead_score, created_at, booked_call, venditore')
      .is('venditore', null)
      .eq('booked_call', 'NO');
      
    // IMPORTANTE: Filtro per Lead Score = "Hot" SOLO se richiesto esplicitamente
    if (onlyHotLeads) {
      query = query.eq('lead_score', 'Hot');
    }

    // Apply source filtering logic SOLO se ci sono fonti incluse specificate E siamo in modalità include
    if (sourceMode === 'include') {
      if (includedSources.length > 0) {
        const includeFilters = includedSources.map(source => `fonte.like.%${source}%`).join(',');
        query = query.or(includeFilters);
      } else {
        // Se siamo in modalità include ma non ci sono fonti specificate, non restituire nulla
        // Questo comportamento preserva la logica che quando selezioni "include" devi specificare le fonti
        query = query.eq('fonte', 'NON_EXISTENT_SOURCE_TO_RETURN_EMPTY');
      }
    }

    const { data: candidates, error } = await query;
    
    if (error) {
      console.error('Error counting available leads:', error);
      return 0;
    }

    if (!candidates) return 0;

    console.log(`Found ${candidates.length} candidates before filtering`);

    // Convert lead_score from string to number if needed for type compatibility
    const convertedCandidates = candidates.map(lead => ({
      ...lead,
      lead_score: lead.lead_score ? (typeof lead.lead_score === 'string' ? parseInt(lead.lead_score) : lead.lead_score) : undefined
    }));

    // Apply exclusion filter SOLO se ci sono esclusioni specificate
    let filteredLeads = convertedCandidates;
    if (sourceMode === 'exclude' && excludedSources.length > 0) {
      filteredLeads = convertedCandidates.filter(lead => {
        if (!lead.fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.fonte!.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
      console.log(`After exclusion filter: ${filteredLeads.length} leads`);
    }

    // Apply exclusions from included sources SOLO se specificate
    if (excludeFromIncluded.length > 0 && includedSources.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.fonte) return true;
        
        const isFromIncludedSource = includedSources.some(includedSource => 
          lead.fonte!.toLowerCase().includes(includedSource.toLowerCase())
        );
        
        if (isFromIncludedSource) {
          const hasExcludedTag = excludeFromIncluded.some(excludedTag => 
            lead.fonte!.toLowerCase().includes(excludedTag.toLowerCase())
          );
          return !hasExcludedTag;
        }
        
        return true;
      });
      console.log(`After exclusions from included: ${filteredLeads.length} leads`);
    }

    if (bypassTimeInterval) {
      // Se bypass è attivo, conta tutti i candidati filtrati
      console.log(`Bypass active: returning ${filteredLeads.length} leads`);
      return filteredLeads.length;
    } else {
      // Comportamento normale: conta tutti i lead che soddisfano i criteri base
      // (venditore = null, booked_call = 'NO') indipendentemente dalla data di creazione
      console.log(`Normal mode: returning ${filteredLeads.length} assignable leads`);
      return filteredLeads.length;
    }
  } catch (error) {
    console.error('Error in getAvailableLeadsCount:', error);
    return 0;
  }
}
