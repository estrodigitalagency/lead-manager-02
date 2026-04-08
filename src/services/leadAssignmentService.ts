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
  market?: 'IT' | 'ES';
  specificLeadIds?: string[]; // For replay functionality
  skipAlreadyAssignedCheck?: boolean; // Skip pre-assignment check
}

export interface AlreadyAssignedLeadInfo {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  venditore: string;
}

export interface PreAssignmentCheckResult {
  canProceed: boolean;
  alreadyAssignedLeads: AlreadyAssignedLeadInfo[];
  newLeads: any[];
  totalLeadsToAssign: number;
}

// Helper function to process assignment completion (webhook, history, counter update)
async function processAssignmentCompletion(
  venditore: string,
  campagna: string | undefined,
  actualAssignedCount: number,
  leadsToAssign: any[],
  market: string,
  excludedSources: string[],
  includedSources: string[],
  sourceMode: string,
  bypassTimeInterval: boolean,
  excludeFromIncluded: string[],
  leadIds: string[]
) {
  // Cerca venditore confrontando nome+cognome concatenati per evitare problemi con nomi composti
  console.log(`Cercando venditore: "${venditore}", market="${market}"`);

  let venditoreDates = null;

  const { data: allVenditori, error: venditoreError } = await supabase
    .from('venditori')
    .select('nome, cognome, email, telefono, sheets_file_id, sheets_tab_name')
    .eq('market', market)
    .eq('stato', 'attivo');

  if (!venditoreError && allVenditori) {
    venditoreDates = allVenditori.find(v =>
      `${v.nome} ${v.cognome}`.trim() === venditore.trim() ||
      v.nome.trim() === venditore.trim()
    ) || null;
  }

  if (!venditoreDates) {
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
      market: market,
      leads_count: actualAssignedCount,
      timestamp: new Date().toISOString(),
      leads: leadsToAssign.map(lead => ({
        id: lead.id,
        nome: lead.nome,
        cognome: lead.cognome || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        fonte: lead.fonte || '',
        ultima_fonte: lead.ultima_fonte || '',
        lead_score: lead.lead_score || null,
        stato: lead.stato || '',
        stato_del_lead: lead.stato_del_lead || '',
        campagna: lead.campagna || '',
        booked_call: lead.booked_call || '',
        market: market,
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

  // Record the assignment in history with all fields including market and lead_ids
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
      bypass_time_interval: bypassTimeInterval,
      market: market,
      lead_ids: leadIds, // Save the specific lead IDs for replay
      assignment_type: 'manual'
    });

  if (historyError) {
    console.error('Error recording assignment history:', historyError);
    // Don't throw here as the main assignment succeeded
  }

  // Update salesperson's current lead count is now handled by database trigger
  console.log('Lead count will be updated automatically by database trigger');
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
    onlyHotLeads = false,
    market = 'IT',
    specificLeadIds // For replay functionality
  } = data;

  try {
    console.log(`Attempting to assign ${numLead} leads to ${venditore}`);
    console.log('Source mode:', sourceMode);
    console.log('Excluded sources:', excludedSources);
    console.log('Included sources:', includedSources);
    console.log('Exclude from included:', excludeFromIncluded);
    console.log('Bypass time interval:', bypassTimeInterval);
    console.log('Only hot leads:', onlyHotLeads);
    console.log('Specific lead IDs:', specificLeadIds);

    // If specific lead IDs are provided (replay mode), use them directly
    if (specificLeadIds && specificLeadIds.length > 0) {
      console.log(`Replay mode: assigning specific ${specificLeadIds.length} leads`);
      
      const { data: specificLeads, error: fetchError } = await supabase
        .from('lead_generation')
        .select('id, nome, cognome, email, telefono, fonte, ultima_fonte, lead_score, stato, stato_del_lead, campagna, booked_call, created_at, venditore, market')
        .in('id', specificLeadIds)
        .eq('market', market);

      if (fetchError) {
        console.error('Error fetching specific leads:', fetchError);
        throw new Error(`Errore nel recupero dei lead specifici: ${fetchError.message}`);
      }

      if (!specificLeads || specificLeads.length === 0) {
        throw new Error('Nessuno dei lead specificati è disponibile');
      }

      const leadsToAssign = specificLeads.slice(0, numLead);
      const actualAssignedCount = leadsToAssign.length;
      const leadIds = leadsToAssign.map(lead => lead.id);

      console.log(`Replay: Assigning ${actualAssignedCount} specific leads:`, leadIds);

      // Update the leads with the assigned salesperson
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

      // Continue with webhook and history recording...
      await processAssignmentCompletion(
        venditore, 
        campagna, 
        actualAssignedCount, 
        leadsToAssign, 
        market,
        excludedSources,
        includedSources,
        sourceMode,
        bypassTimeInterval,
        excludeFromIncluded,
        leadIds
      );

      console.log(`Successfully replayed assignment of ${actualAssignedCount} leads to ${venditore}`);
      return { assignedCount: actualAssignedCount, leads: leadsToAssign };
    }

    // Normal mode: find and assign leads based on filters
    // Prima recupera le impostazioni per il calcolo dello stato
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // QUERY BASE con paginazione per superare il limite di 1000 righe Supabase
    let allCandidateLeads: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('lead_generation')
        .select('id, nome, cognome, email, telefono, fonte, ultima_fonte, lead_score, stato, stato_del_lead, campagna, booked_call, created_at, venditore, market')
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false)
        .eq('market', market)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (onlyHotLeads) {
        query = query.eq('lead_score', 'Hot');
      }

      if (sourceMode === 'include' && includedSources.length > 0) {
        const includeFilters = includedSources.map(source => `ultima_fonte.like.%${source}%`).join(',');
        query = query.or(includeFilters);
      }

      const { data: pageLeads, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching leads:', fetchError);
        throw new Error(`Errore nel recupero dei lead: ${fetchError.message}`);
      }

      if (!pageLeads || pageLeads.length === 0) {
        hasMore = false;
      } else {
        allCandidateLeads = [...allCandidateLeads, ...pageLeads];
        hasMore = pageLeads.length === pageSize;
        page++;
      }
    }

    const candidateLeads = allCandidateLeads;
    console.log(`Found ${candidateLeads.length} candidate leads (${page} pages)`);

    if (candidateLeads.length === 0) {
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
        if (!lead.ultima_fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.ultima_fonte!.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
      console.log(`After exclusion filter: ${filteredLeads.length} leads`);
    }

    // Apply exclusions from included sources SOLO se specificate
    if (excludeFromIncluded.length > 0 && includedSources.length > 0) {
      console.log(`Applying exclusions from included sources: ${excludeFromIncluded.join(', ')}`);
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.ultima_fonte) return true;
        
        const isFromIncludedSource = includedSources.some(includedSource => 
          lead.ultima_fonte!.toLowerCase().includes(includedSource.toLowerCase())
        );
        
        if (isFromIncludedSource) {
          const hasExcludedTag = excludeFromIncluded.some(excludedTag => 
            lead.ultima_fonte!.toLowerCase().includes(excludedTag.toLowerCase())
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
    console.log(`Assigning ${actualAssignedCount} leads (from oldest to newest)`);

    // Update the leads in batches of 500 to avoid query size limits
    const currentTimestamp = new Date().toISOString();
    const batchSize = 500;
    
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batchIds = leadIds.slice(i, i + batchSize);
      console.log(`Updating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leadIds.length / batchSize)}: ${batchIds.length} leads`);
      
      const { error: updateError } = await supabase
        .from('lead_generation')
        .update({ 
          venditore,
          campagna: (campagna && campagna.trim() !== '') ? campagna : null,
          stato: 'assegnato',
          assignable: false,
          data_assegnazione: currentTimestamp
        })
        .in('id', batchIds);

      if (updateError) {
        console.error(`Error updating batch ${Math.floor(i / batchSize) + 1}:`, updateError);
        throw new Error(`Errore nell'aggiornamento dei lead (batch ${Math.floor(i / batchSize) + 1}): ${updateError.message}`);
      }
    }

    // Process webhook, history, and counter update
    await processAssignmentCompletion(
      venditore,
      campagna,
      actualAssignedCount,
      leadsToAssign,
      market,
      excludedSources,
      includedSources,
      sourceMode,
      bypassTimeInterval,
      excludeFromIncluded,
      leadIds
    );

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
  onlyHotLeads: boolean = false,
  market: 'IT' | 'ES' = 'IT'
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

    // Se non ci sono filtri complessi, usa una count query diretta per efficienza
    const hasSourceExclusions = sourceMode === 'exclude' && excludedSources.length > 0;
    const hasExcludeFromIncluded = excludeFromIncluded.length > 0 && includedSources.length > 0;
    const needsClientFiltering = hasSourceExclusions || hasExcludeFromIncluded || !bypassTimeInterval;

    if (!needsClientFiltering && sourceMode === 'include' && includedSources.length > 0) {
      // Count query diretta per modalità include con bypass attivo
      let countQuery = supabase
        .from('lead_generation')
        .select('id', { count: 'exact', head: true })
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false)
        .eq('market', market);

      if (onlyHotLeads) {
        countQuery = countQuery.eq('lead_score', 'Hot');
      }

      const includeFilters = includedSources.map(source => `ultima_fonte.like.%${source}%`).join(',');
      countQuery = countQuery.or(includeFilters);

      const { count, error } = await countQuery;
      
      if (error) {
        console.error('Error counting available leads:', error);
        return 0;
      }

      console.log(`Direct count query result: ${count} leads`);
      return count || 0;
    }

    if (!needsClientFiltering && sourceMode === 'exclude' && excludedSources.length === 0) {
      // Count query diretta senza filtri complessi
      let countQuery = supabase
        .from('lead_generation')
        .select('id', { count: 'exact', head: true })
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false)
        .eq('market', market);

      if (onlyHotLeads) {
        countQuery = countQuery.eq('lead_score', 'Hot');
      }

      const { count, error } = await countQuery;
      
      if (error) {
        console.error('Error counting available leads:', error);
        return 0;
      }

      console.log(`Direct count query result: ${count} leads`);
      return count || 0;
    }

    // Per filtri complessi, dobbiamo fare fetch dei dati con range per superare il limite di 1000
    let allCandidates: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('lead_generation')
        .select('id, nome, cognome, email, telefono, fonte, ultima_fonte, lead_score, created_at, booked_call, venditore')
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false)
        .eq('market', market)
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (onlyHotLeads) {
        query = query.eq('lead_score', 'Hot');
      }

      if (sourceMode === 'include') {
        if (includedSources.length > 0) {
          const includeFilters = includedSources.map(source => `ultima_fonte.like.%${source}%`).join(',');
          query = query.or(includeFilters);
        } else {
          return 0;
        }
      }

      const { data: candidates, error } = await query;
      
      if (error) {
        console.error('Error counting available leads:', error);
        return 0;
      }

      if (!candidates || candidates.length === 0) {
        hasMore = false;
      } else {
        allCandidates = [...allCandidates, ...candidates];
        hasMore = candidates.length === pageSize;
        page++;
      }
    }

    console.log(`Found ${allCandidates.length} total candidates after pagination`);

    // Convert lead_score from string to number if needed for type compatibility
    const convertedCandidates = allCandidates.map(lead => ({
      ...lead,
      lead_score: lead.lead_score ? (typeof lead.lead_score === 'string' ? parseInt(lead.lead_score) : lead.lead_score) : undefined
    }));

    // Apply exclusion filter SOLO se ci sono esclusioni specificate
    let filteredLeads = convertedCandidates;
    if (sourceMode === 'exclude' && excludedSources.length > 0) {
      filteredLeads = convertedCandidates.filter(lead => {
        if (!lead.ultima_fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.ultima_fonte!.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
      console.log(`After exclusion filter: ${filteredLeads.length} leads`);
    }

    // Apply exclusions from included sources SOLO se specificate
    if (excludeFromIncluded.length > 0 && includedSources.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.ultima_fonte) return true;
        
        const isFromIncludedSource = includedSources.some(includedSource => 
          lead.ultima_fonte!.toLowerCase().includes(includedSource.toLowerCase())
        );
        
        if (isFromIncludedSource) {
          const hasExcludedTag = excludeFromIncluded.some(excludedTag => 
            lead.ultima_fonte!.toLowerCase().includes(excludedTag.toLowerCase())
          );
          return !hasExcludedTag;
        }
        
        return true;
      });
      console.log(`After exclusion from included: ${filteredLeads.length} leads`);
    }

    let assignableCount;

    if (bypassTimeInterval) {
      // Se bypass è attivo, considera tutti i lead filtrati
      assignableCount = filteredLeads.length;
      console.log(`Bypass attivo: conteggiando tutti i ${filteredLeads.length} lead candidati`);
    } else {
      // Comportamento normale: conta solo i lead con stato "Assegnabile"
      assignableCount = filteredLeads.filter(lead => {
        const status = getLeadStatus(lead, daysBeforeAssignable);
        return status.label === 'Assegnabile';
      }).length;
      console.log(`Found ${assignableCount} assignable leads out of ${filteredLeads.length} candidates`);
    }

    return assignableCount;

  } catch (error) {
    console.error('Error in getAvailableLeadsCount:', error);
    return 0;
  }
}

// Pre-assignment check to identify leads already assigned to other salespeople
export async function checkLeadsForPreviousAssignment(
  data: LeadAssignmentData
): Promise<PreAssignmentCheckResult> {
  const { 
    numLead, 
    venditore,
    excludedSources = [], 
    includedSources = [], 
    sourceMode = 'exclude',
    bypassTimeInterval = false,
    excludeFromIncluded = [], 
    onlyHotLeads = false,
    market = 'IT',
  } = data;

  try {
    console.log(`🔍 Pre-assignment check: checking ${numLead} leads for previous assignments in history`);

    // Get settings for lead status calculation
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;

    // Build the query for candidate leads with pagination (same logic as assignLeadsWithExclusions)
    let allCandidateLeads: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('lead_generation')
        .select('id, nome, cognome, email, telefono, fonte, ultima_fonte, lead_score, created_at, booked_call, venditore')
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false)
        .eq('market', market)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (onlyHotLeads) {
        query = query.eq('lead_score', 'Hot');
      }

      if (sourceMode === 'include' && includedSources.length > 0) {
        const includeFilters = includedSources.map(source => `ultima_fonte.like.%${source}%`).join(',');
        query = query.or(includeFilters);
      }

      const { data: pageLeads, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching leads for pre-check:', fetchError);
        throw new Error(`Errore nel recupero dei lead: ${fetchError.message}`);
      }

      if (!pageLeads || pageLeads.length === 0) {
        hasMore = false;
      } else {
        allCandidateLeads = [...allCandidateLeads, ...pageLeads];
        hasMore = pageLeads.length === pageSize;
        page++;
      }
    }

    const candidateLeads = allCandidateLeads;

    if (candidateLeads.length === 0) {
      return {
        canProceed: true,
        alreadyAssignedLeads: [],
        newLeads: [],
        totalLeadsToAssign: 0
      };
    }

    // Convert lead_score
    const convertedLeads = candidateLeads.map(lead => ({
      ...lead,
      lead_score: lead.lead_score ? (typeof lead.lead_score === 'string' ? parseInt(lead.lead_score) : lead.lead_score) : undefined
    }));

    // Apply exclusion filter
    let filteredLeads = convertedLeads;
    if (sourceMode === 'exclude' && excludedSources.length > 0) {
      filteredLeads = convertedLeads.filter(lead => {
        if (!lead.ultima_fonte) return true;
        return !excludedSources.some(excludedSource => 
          lead.ultima_fonte!.toLowerCase().includes(excludedSource.toLowerCase())
        );
      });
    }

    // Apply exclusions from included sources
    if (excludeFromIncluded.length > 0 && includedSources.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.ultima_fonte) return true;
        
        const isFromIncludedSource = includedSources.some(includedSource => 
          lead.ultima_fonte!.toLowerCase().includes(includedSource.toLowerCase())
        );
        
        if (isFromIncludedSource) {
          const hasExcludedTag = excludeFromIncluded.some(excludedTag => 
            lead.ultima_fonte!.toLowerCase().includes(excludedTag.toLowerCase())
          );
          return !hasExcludedTag;
        }
        
        return true;
      });
    }

    // Filter for assignable status (or all if bypass is active)
    let eligibleLeads;
    if (bypassTimeInterval) {
      eligibleLeads = filteredLeads;
    } else {
      eligibleLeads = filteredLeads.filter(lead => {
        const status = getLeadStatus(lead, daysBeforeAssignable);
        return status.label === 'Assegnabile';
      });
    }

    // Take only the requested number of leads
    const leadsToAssign = eligibleLeads.slice(0, numLead);
    const leadIds = leadsToAssign.map(lead => lead.id);

    if (leadIds.length === 0) {
      return {
        canProceed: true,
        alreadyAssignedLeads: [],
        newLeads: [],
        totalLeadsToAssign: 0
      };
    }

    // BATCH CHECK: Instead of N+1 queries, collect all emails/phones and query in batches
    console.log(`🔍 Batch checking previous assignments for ${leadsToAssign.length} leads...`);
    
    const previousAssignments: Record<string, string> = {};

    const normalizeEmail = (email: string | null): string => {
      if (!email) return '';
      return email.toLowerCase().trim();
    };

    const normalizePhone = (phone: string | null): string => {
      if (!phone) return '';
      return phone.replace(/[^0-9+]/g, '');
    };

    try {
      // Collect all unique emails and phones from leads to check
      const emailsToCheck: string[] = [];
      const phonesToCheck: string[] = [];
      const leadEmailMap: Record<string, string[]> = {}; // email -> lead ids
      const leadPhoneMap: Record<string, string[]> = {}; // phone -> lead ids

      for (const lead of leadsToAssign) {
        const email = normalizeEmail(lead.email);
        const phone = normalizePhone(lead.telefono);
        
        if (email) {
          emailsToCheck.push(email);
          if (!leadEmailMap[email]) leadEmailMap[email] = [];
          leadEmailMap[email].push(lead.id);
        }
        if (phone) {
          phonesToCheck.push(phone);
          if (!leadPhoneMap[phone]) leadPhoneMap[phone] = [];
          leadPhoneMap[phone].push(lead.id);
        }
      }

      // Batch query for email matches (in chunks of 200)
      const emailBatchSize = 200;
      for (let i = 0; i < emailsToCheck.length; i += emailBatchSize) {
        const emailBatch = emailsToCheck.slice(i, i + emailBatchSize);
        // Use OR filter to find any assigned lead with matching email
        const emailFilters = emailBatch.map(e => `email.ilike.${e}`).join(',');
        
        const { data: emailMatches } = await supabase
          .from('lead_generation')
          .select('email, venditore')
          .eq('market', market)
          .not('venditore', 'is', null)
          .or(emailFilters)
          .order('data_assegnazione', { ascending: false });

        if (emailMatches) {
          // Build a map of email -> most recent venditore
          const emailVenditoreMap: Record<string, string> = {};
          for (const match of emailMatches) {
            const matchEmail = normalizeEmail(match.email);
            if (matchEmail && !emailVenditoreMap[matchEmail]) {
              emailVenditoreMap[matchEmail] = match.venditore!;
            }
          }
          
          // Map back to lead IDs
          for (const [email, matchVenditore] of Object.entries(emailVenditoreMap)) {
            if (matchVenditore !== venditore && leadEmailMap[email]) {
              for (const leadId of leadEmailMap[email]) {
                if (!previousAssignments[leadId]) {
                  previousAssignments[leadId] = matchVenditore;
                }
              }
            }
          }
        }
      }

      // Batch query for phone matches (only for leads not already found by email)
      const remainingPhones = phonesToCheck.filter(phone => {
        const leadIdsForPhone = leadPhoneMap[phone] || [];
        return leadIdsForPhone.some(id => !previousAssignments[id]);
      });

      for (let i = 0; i < remainingPhones.length; i += emailBatchSize) {
        const phoneBatch = remainingPhones.slice(i, i + emailBatchSize);
        const phoneFilters = phoneBatch.map(p => `telefono.ilike.${p}`).join(',');
        
        const { data: phoneMatches } = await supabase
          .from('lead_generation')
          .select('telefono, venditore')
          .eq('market', market)
          .not('venditore', 'is', null)
          .or(phoneFilters)
          .order('data_assegnazione', { ascending: false });

        if (phoneMatches) {
          const phoneVenditoreMap: Record<string, string> = {};
          for (const match of phoneMatches) {
            const matchPhone = normalizePhone(match.telefono);
            if (matchPhone && !phoneVenditoreMap[matchPhone]) {
              phoneVenditoreMap[matchPhone] = match.venditore!;
            }
          }
          
          for (const [phone, matchVenditore] of Object.entries(phoneVenditoreMap)) {
            if (matchVenditore !== venditore && leadPhoneMap[phone]) {
              for (const leadId of leadPhoneMap[phone]) {
                if (!previousAssignments[leadId]) {
                  previousAssignments[leadId] = matchVenditore;
                }
              }
            }
          }
        }
      }

      const foundCount = Object.keys(previousAssignments).length;
      console.log(`📊 Batch pre-check complete: ${foundCount} leads have previous assignments to different salespeople`);
    } catch (searchError) {
      console.error('Error checking previous assignments:', searchError);
    }

    // Separate leads
    const alreadyAssignedLeads: AlreadyAssignedLeadInfo[] = [];
    const newLeads: any[] = [];

    for (const lead of leadsToAssign) {
      const previousVenditore = previousAssignments[lead.id];
      if (previousVenditore) {
        alreadyAssignedLeads.push({
          id: lead.id,
          nome: lead.nome,
          cognome: lead.cognome,
          email: lead.email,
          venditore: previousVenditore
        });
      } else {
        newLeads.push(lead);
      }
    }

    console.log(`🔍 Pre-check result: ${alreadyAssignedLeads.length} previously assigned, ${newLeads.length} new leads`);

    return {
      canProceed: alreadyAssignedLeads.length === 0,
      alreadyAssignedLeads,
      newLeads,
      totalLeadsToAssign: leadsToAssign.length
    };

  } catch (error) {
    console.error('Pre-assignment check error:', error);
    throw error;
  }
}
