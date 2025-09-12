
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { nome, cognome, email, telefono, fonte, campagna, notes, lead_score, venditore, stato, market } = await req.json()

    // Default market to 'IT' for backward compatibility
    const finalMarket = market || 'IT'

    console.log('Received lead data:', { nome, cognome, email, telefono, fonte, campagna, notes, lead_score, venditore, stato, market: finalMarket })

    // Calculate ultima_fonte based on existing leads
    const ultimaFonte = await calculateUltimaFonte(email, telefono, fonte, finalMarket, supabase);
    
    // Determine assignable status and data_assegnazione based on provided data
    const isAssigned = venditore && venditore.trim() !== '';
    const finalStato = stato || 'nuovo';
    const finalAssignable = isAssigned ? true : false;
    const dataAssegnazione = isAssigned ? new Date().toISOString() : null;
    
    const { data: newLead, error: insertError } = await supabase
      .from('lead_generation')
      .insert({
        nome,
        cognome,
        email,
        telefono,
        fonte,
        campagna,
        notes,
        lead_score,
        venditore: venditore || null,
        stato: finalStato,
        assignable: finalAssignable,
        booked_call: 'NO',
        data_assegnazione: dataAssegnazione,
        ultima_fonte: ultimaFonte,
        market: finalMarket
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      throw insertError
    }

    console.log('Successfully created new lead:', newLead);
    
    // Controlla automazioni basate sulla configurazione
    console.log('Checking automations for new lead:', newLead.id);
    await checkAndApplyAutomations(newLead, supabase);
    
    return new Response(JSON.stringify({
      success: true,
      lead: newLead,
      action: 'created_new'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in lead-generation-webhook:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Function to calculate ultima_fonte based on existing leads
async function calculateUltimaFonte(email: string, telefono: string, newFonte: string, market: string, supabase: any): Promise<string> {
  try {
    console.log('Calculating ultima_fonte for:', { email, telefono, newFonte, market });
    
    // Find the most recent lead with same email or phone in the same market
    const { data: existingLeads, error } = await supabase
      .from('lead_generation')
      .select('fonte, created_at')
      .or(`email.eq.${email},telefono.eq.${telefono}`)
      .eq('market', market)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching existing leads:', error);
      return newFonte; // fallback to new fonte
    }

    // If no existing lead found, return the new fonte as ultima_fonte
    if (!existingLeads || existingLeads.length === 0) {
      console.log('No existing lead found, setting ultima_fonte = fonte');
      return newFonte;
    }

    const existingLead = existingLeads[0];
    const previousFonte = existingLead.fonte || '';
    
    console.log('Found existing lead with fonte:', previousFonte);
    console.log('New fonte:', newFonte);
    
    // Calculate the difference between new fonte and previous fonte
    const ultimaFonte = computeFonteDiff(previousFonte, newFonte);
    
    console.log('Calculated ultima_fonte:', ultimaFonte);
    return ultimaFonte;
    
  } catch (error) {
    console.error('Error in calculateUltimaFonte:', error);
    return newFonte; // fallback to new fonte
  }
}

// Function to compute the difference between fonte values
function computeFonteDiff(previousFonte: string, newFonte: string): string {
  if (!previousFonte || !newFonte) {
    return newFonte || '';
  }
  
  // Normalize and split fonte values
  const previousSources = previousFonte.split(',').map(s => s.trim()).filter(s => s);
  const newSources = newFonte.split(',').map(s => s.trim()).filter(s => s);
  
  // Find sources that are in newFonte but not in previousFonte
  const diff = newSources.filter(source => !previousSources.includes(source));
  
  // If no difference, return the new fonte (not empty)
  if (diff.length === 0) {
    return newFonte;
  }
  
  return diff.join(', ');
}

// Funzione per controllare e applicare automazioni
async function checkAndApplyAutomations(lead: any, supabase: any) {
  try {
    console.log('Fetching active automations...');
    
    // Recupera tutte le automazioni attive ordinate per priorità, filtrate per market
    const { data: automations, error: automationsError } = await supabase
      .from('lead_assignment_automations')
      .select(`
        *,
        venditori!target_seller_id(nome, cognome, sheets_file_id, sheets_tab_name, market)
      `)
      .eq('attivo', true)
      .eq('market', lead.market)
      .order('priority', { ascending: true });

    if (automationsError) {
      console.error('Error fetching automations:', automationsError);
      return;
    }

    if (!automations || automations.length === 0) {
      console.log('No active automations found');
      return;
    }

    console.log(`Found ${automations.length} active automations`);

    // Controlla ogni automazione nell'ordine di priorità
    for (const automation of automations) {
      console.log(`Checking automation: ${automation.nome}`);
      
      // Controlla se questa automazione dovrebbe scattare per questo tipo di lead
      const shouldTrigger = automation.trigger_when === 'new_lead' || 
        (automation.trigger_when === 'duplicate_different_source' && lead.ultima_fonte && lead.ultima_fonte.trim() !== '');
      
      if (!shouldTrigger) {
        console.log(`Automation ${automation.nome} skipped - trigger condition not met`);
        continue;
      }
      
      if (checkCondition(lead, automation.trigger_field, automation.condition_type, automation.condition_value)) {
        console.log(`Automation condition matched: ${automation.nome}`);
        
        let targetSeller = null;
        let sheetsTabName = null;

        if (automation.action_type === 'assign_to_seller' && automation.target_seller_id) {
          // Assegna al venditore specificato
          targetSeller = automation.venditori;
          sheetsTabName = automation.sheets_tab_name || automation.venditori?.sheets_tab_name;
          
        } else if (automation.action_type === 'assign_to_previous_seller') {
          // Trova l'ultimo venditore assegnato per lead simili
          targetSeller = await findPreviousSeller(lead, supabase);
          sheetsTabName = automation.sheets_tab_name;
        }

        if (targetSeller) {
          await assignLeadAutomatically(lead, targetSeller, sheetsTabName, automation, supabase);
          return; // Ferma alla prima automazione che matcha
        } else {
          console.log(`No target seller found for automation: ${automation.nome}`);
          await logAutomationExecution(lead, automation, null, 'no_seller_found', 'No target seller found', 'webhook', supabase);
        }
      }
    }

    console.log('No automation conditions matched');
    
  } catch (error) {
    console.error('Error in checkAndApplyAutomations:', error);
  }
}

// Funzione per controllare se una condizione è soddisfatta
function checkCondition(lead: any, triggerField: string, conditionType: string, conditionValue: string): boolean {
  if (!conditionValue) return false;
  
  // Estrai il valore del campo specificato dal lead
  let fieldValue = '';
  switch (triggerField) {
    case 'ultima_fonte':
      fieldValue = lead.ultima_fonte || '';
      break;
    case 'fonte':
      fieldValue = lead.fonte || '';
      break;
    case 'nome':
      fieldValue = lead.nome || '';
      break;
    case 'email':
      fieldValue = lead.email || '';
      break;
    case 'telefono':
      fieldValue = lead.telefono || '';
      break;
    case 'campagna':
      fieldValue = lead.campagna || '';
      break;
    case 'lead_score':
      fieldValue = lead.lead_score || '';
      break;
    case 'created_at':
      fieldValue = lead.created_at || '';
      break;
    default:
      return false;
  }
  
  const field = fieldValue.toLowerCase();
  const value = conditionValue.toLowerCase();
  
  switch (conditionType) {
    case 'contains':
      return field.includes(value);
    case 'equals':
      return field === value;
    case 'starts_with':
      return field.startsWith(value);
    case 'ends_with':
      return field.endsWith(value);
    case 'not_contains':
      return !field.includes(value);
    default:
      return false;
  }
}

// Funzione per trovare il venditore precedente
async function findPreviousSeller(lead: any, supabase: any) {
  try {
    console.log(`Finding previous seller for lead: ${lead.email} / ${lead.telefono} in market: ${lead.market}`);
    
    // Prima query: trova il nome del venditore precedente dai lead storici
    const { data: previousLeads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('venditore, data_assegnazione, created_at')
      .or(`email.eq.${lead.email},telefono.eq.${lead.telefono}`)
      .eq('market', lead.market)
      .not('venditore', 'is', null)
      .order('data_assegnazione', { ascending: false })
      .limit(1);

    if (leadsError) {
      console.error('Error finding previous leads:', leadsError);
      return null;
    }

    if (!previousLeads || previousLeads.length === 0) {
      console.log('No previous leads found with assigned seller');
      return null;
    }

    const previousSellerName = previousLeads[0].venditore;
    console.log(`Found previous seller name: ${previousSellerName}`);

    // Seconda query: cerca i dettagli del venditore nella tabella venditori
    // Gestisce sia "Nome Cognome" che "nome cognome" (case insensitive)
    const { data: sellers, error: sellersError } = await supabase
      .from('venditori')
      .select('id, nome, cognome, sheets_file_id, sheets_tab_name, market, stato')
      .eq('market', lead.market)
      .eq('stato', 'attivo');

    if (sellersError) {
      console.error('Error fetching sellers:', sellersError);
      return null;
    }

    if (!sellers || sellers.length === 0) {
      console.log('No active sellers found in market');
      return null;
    }

    // Cerca il venditore che corrisponde al nome (case insensitive e tollerante agli spazi)
    const targetSeller = sellers.find(seller => {
      const fullName = `${seller.nome} ${seller.cognome}`.trim();
      const normalizedTarget = previousSellerName.toLowerCase().trim();
      const normalizedSeller = fullName.toLowerCase().trim();
      
      return normalizedSeller === normalizedTarget;
    });

    if (targetSeller) {
      console.log(`Found matching seller:`, targetSeller);
      return targetSeller;
    } else {
      console.log(`No matching seller found for name: ${previousSellerName}`);
      console.log('Available sellers:', sellers.map(s => `${s.nome} ${s.cognome}`));
      return null;
    }

  } catch (error) {
    console.error('Error in findPreviousSeller:', error);
    return null;
  }
}

// Funzione per registrare l'esecuzione dell'automazione
async function logAutomationExecution(
  lead: any, 
  automation: any, 
  seller: any | null, 
  result: string, 
  errorMessage: string | null, 
  executionSource: string,
  supabase: any
) {
  try {
    const logData = {
      automation_id: automation.id,
      automation_name: automation.nome,
      lead_id: lead.id,
      lead_email: lead.email,
      lead_name: `${lead.nome} ${lead.cognome || ''}`.trim(),
      trigger_field: automation.trigger_field,
      trigger_value: lead[automation.trigger_field] || '',
      action_taken: automation.action_type,
      seller_assigned: seller ? `${seller.nome} ${seller.cognome}` : null,
      seller_id: seller?.id || null,
      webhook_sent: automation.webhook_enabled && result === 'success',
      webhook_success: automation.webhook_enabled && result === 'success',
      result: result,
      error_message: errorMessage,
      execution_source: executionSource,
      market: lead.market
    };

    const { error: logError } = await supabase
      .from('automation_executions')
      .insert(logData);

    if (logError) {
      console.error('Error logging automation execution:', logError);
    } else {
      console.log('Automation execution logged successfully');
    }
  } catch (error) {
    console.error('Error in logAutomationExecution:', error);
  }
}

// Funzione per assegnare automaticamente il lead
async function assignLeadAutomatically(lead: any, seller: any, sheetsTabName: string | null, automation: any, supabase: any) {
  try {
    console.log(`Assigning lead ${lead.id} to seller ${seller.nome} ${seller.cognome} via automation: ${automation.nome}`);
    
    // Aggiorna il lead nel database
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({
        venditore: `${seller.nome} ${seller.cognome}`,
        stato: 'assegnato',
        data_assegnazione: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('Error updating lead:', updateError);
      await logAutomationExecution(lead, automation, seller, 'error', updateError.message, 'webhook', supabase);
      return;
    }

    let webhookSuccess = true;
    let webhookError = null;

    // Call webhook if automation has webhook enabled
    if (automation.webhook_enabled) {
      try {
        // Get webhook URL from system settings
        const { data: webhookSettings, error: webhookError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'lead_assign_webhook_url')
          .single();

        if (webhookError || !webhookSettings?.value) {
          console.error('Webhook URL not configured in system settings');
          webhookSuccess = false;
          webhookError = 'Webhook URL not configured';
        } else {
          const webhookUrl = webhookSettings.value;
          
          // Format payload as expected by lead-assign-webhook
          const assignmentData = {
            venditore: seller.nome,
            venditore_cognome: seller.cognome,
            venditore_email: '',
            venditore_telefono: '',
            google_sheets_file_id: seller.sheets_file_id || '',
            google_sheets_tab_name: sheetsTabName || seller.sheets_tab_name || '',
            campagna: lead.campagna || '',
            market: lead.market,
            leads_count: 1,
            timestamp: new Date().toISOString(),
            leads: [{
              id: lead.id,
              nome: lead.nome,
              cognome: lead.cognome || '',
              email: lead.email,
              telefono: lead.telefono,
              fonte: lead.fonte,
              market: lead.market,
              created_at: lead.created_at,
              assigned_at: new Date().toISOString()
            }]
          };

          const { error: webhookCallError } = await supabase.functions.invoke('lead-assign-webhook', {
            body: {
              assignmentData,
              webhookUrl
            }
          });

          if (webhookCallError) {
            console.error('Error calling lead-assign-webhook:', webhookCallError);
            webhookSuccess = false;
            webhookError = webhookCallError.message;
          } else {
            console.log('Successfully called lead-assign-webhook for automation assignment');
          }
        }
      } catch (error) {
        console.error('Error in webhook call:', error);
        webhookSuccess = false;
        webhookError = error.message;
      }
    } else {
      console.log('Webhook disabled for automation:', automation.nome);
    }

    // Log successful execution
    await logAutomationExecution(lead, automation, seller, 'success', webhookError, 'webhook', supabase);

    console.log(`Lead ${lead.id} successfully assigned via automation: ${automation.nome}`);
    
  } catch (error) {
    console.error('Error in assignLeadAutomatically:', error);
    await logAutomationExecution(lead, automation, seller, 'error', error.message, 'webhook', supabase);
  }
}
