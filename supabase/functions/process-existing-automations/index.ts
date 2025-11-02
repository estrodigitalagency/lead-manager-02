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

    const { market = 'IT', limit = 100 } = await req.json()

    console.log('Processing existing leads for automations in market:', market)

    // Get unassigned leads
    const { data: leads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('market', market)
      .is('venditore', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      throw leadsError
    }

    console.log(`Found ${leads.length} unassigned leads`)

    // Get active automations
    const { data: automations, error: automationsError } = await supabase
      .from('lead_assignment_automations')
      .select(`
        *,
        venditori!target_seller_id(nome, cognome, sheets_file_id, sheets_tab_name, market)
      `)
      .eq('attivo', true)
      .eq('market', market)
      .order('priority', { ascending: true });

    if (automationsError) {
      console.error('Error fetching automations:', automationsError)
      throw automationsError
    }

    console.log(`Found ${automations.length} active automations`)

    const results = []

    // Process each lead
    for (const lead of leads) {
      console.log(`Processing lead: ${lead.nome} (${lead.email})`)
      
      let assigned = false
      
      // Check each automation in priority order
      for (const automation of automations) {
        if (assigned) break
        
        console.log(`Checking automation: ${automation.nome}`)
        
        // Check trigger condition
        let shouldTrigger = false
        if (automation.trigger_when === 'new_lead') {
          shouldTrigger = true
        } else if (automation.trigger_when === 'duplicate_different_source') {
          // For existing leads, check if ultima_fonte is not empty and different from fonte
          shouldTrigger = lead.ultima_fonte && lead.ultima_fonte.trim() !== '' && lead.ultima_fonte !== lead.fonte
        }
        
        if (!shouldTrigger) {
          console.log(`Automation ${automation.nome} skipped - trigger condition not met`)
          continue
        }
        
        // Check field condition
        const fieldValue = lead[automation.trigger_field] || ''
        const conditionValue = automation.condition_value.toLowerCase()
        const field = fieldValue.toLowerCase()
        
        console.log(`Checking condition: "${field}" ${automation.condition_type} "${conditionValue}"`)
        
        let conditionMet = false
        switch (automation.condition_type) {
          case 'contains':
            conditionMet = field.includes(conditionValue)
            break
          case 'equals':
            conditionMet = field === conditionValue
            break
          case 'starts_with':
            conditionMet = field.startsWith(conditionValue)
            break
          case 'ends_with':
            conditionMet = field.endsWith(conditionValue)
            break
          case 'not_contains':
            conditionMet = !field.includes(conditionValue)
            break
          default:
            conditionMet = false
        }
        
        if (!conditionMet) {
          console.log(`Automation ${automation.nome} - condition not met`)
          continue
        }
        
        console.log(`Automation ${automation.nome} - condition matched!`)
        
        let targetSeller = null
        let sheetsTabName = null

        if (automation.action_type === 'assign_to_seller' && automation.target_seller_id) {
          targetSeller = automation.venditori
          sheetsTabName = automation.sheets_tab_name || automation.venditori?.sheets_tab_name
        } else if (automation.action_type === 'assign_to_previous_seller') {
          // Find previous seller using the corrected logic
          targetSeller = await findPreviousSeller(lead, supabase)
          
          // Controlla se il venditore precedente è nella lista esclusi
          if (targetSeller && automation.excluded_sellers && automation.excluded_sellers.length > 0) {
            const previousSellerName = `${targetSeller.nome} ${targetSeller.cognome}`.trim();
            
            if (automation.excluded_sellers.includes(previousSellerName)) {
              console.log(`Previous seller ${previousSellerName} is excluded from automation: ${automation.nome}`);
              await logAutomationExecution(lead, automation, null, 'seller_excluded', `Previous seller ${previousSellerName} is in excluded list`, executionSource, supabase);
              continue; // Passa alla prossima automazione
            }
          }
          
          sheetsTabName = automation.sheets_tab_name
          if (targetSeller) {
            console.log('Found previous seller:', targetSeller.nome)
          } else {
            console.log('No previous seller found')
          }
        }

        if (targetSeller) {
          console.log(`Assigning lead ${lead.id} to seller ${targetSeller.nome} ${targetSeller.cognome}`)
          
          // Update the lead
          const updateData = {
            venditore: `${targetSeller.nome} ${targetSeller.cognome}`,
            stato: 'assegnato',
            data_assegnazione: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Usa campagna dall'automazione se fornita, altrimenti dal sheets_tab_name per retrocompatibilità
          if (automation.campagna) {
            updateData.campagna = automation.campagna;
          } else if (sheetsTabName) {
            updateData.campagna = sheetsTabName;
          }
          
          const { error: updateError } = await supabase
            .from('lead_generation')
            .update(updateData)
            .eq('id', lead.id)

          if (updateError) {
            console.error('Error updating lead:', updateError)
            // Log error
            await logAutomationExecution(lead, automation, targetSeller, 'error', updateError.message, 'manual_processing', supabase);
            
            results.push({
              lead_id: lead.id,
              lead_name: lead.nome,
              automation: automation.nome,
              result: 'error',
              error: updateError.message
            })
          } else {
            console.log(`Successfully assigned lead ${lead.id}`)
            assigned = true
            
            // Call webhook if automation has webhook enabled
            if (automation.webhook_enabled) {
              try {
                // Get webhook URL from system settings
                const { data: webhookSettings, error: webhookSettingsError } = await supabase
                  .from('system_settings')
                  .select('value')
                  .eq('key', 'lead_assign_webhook_url')
                  .single();

                if (webhookSettingsError || !webhookSettings?.value) {
                  console.error('Webhook URL not configured in system settings');
                } else {
                  const webhookUrl = webhookSettings.value;
                  
                  // Format payload as expected by lead-assign-webhook
                  const assignmentData = {
                    venditore: targetSeller.nome,
                    venditore_cognome: targetSeller.cognome,
                    venditore_email: '',
                    venditore_telefono: '',
                    google_sheets_file_id: targetSeller.sheets_file_id || '',
                    google_sheets_tab_name: sheetsTabName || targetSeller.sheets_tab_name || '',
                    campagna: automation.campagna || sheetsTabName || lead.campagna || '',
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

                  const { error: webhookError } = await supabase.functions.invoke('lead-assign-webhook', {
                    body: {
                      assignmentData,
                      webhookUrl
                    }
                  })

                  if (webhookError) {
                    console.error('Error calling webhook:', webhookError)
                  } else {
                    console.log('Successfully called lead-assign-webhook for automation')
                  }
                }
              } catch (webhookError) {
                console.error('Error in webhook call:', webhookError)
              }
            } else {
              console.log('Webhook disabled for automation:', automation.nome)
            }
            
            // Log successful execution
            await logAutomationExecution(lead, automation, targetSeller, 'success', null, 'manual_processing', supabase);
            
            results.push({
              lead_id: lead.id,
              lead_name: lead.nome,
              lead_email: lead.email,
              automation: automation.nome,
              seller: `${targetSeller.nome} ${targetSeller.cognome}`,
              result: 'assigned'
            })
          }
        } else {
          // Log no target seller found
          await logAutomationExecution(lead, automation, null, 'no_seller_found', 'No target seller found', 'manual_processing', supabase);
          
          results.push({
            lead_id: lead.id,
            lead_name: lead.nome,
            automation: automation.nome,
            result: 'no_target_seller'
          })
        }
      }
      
      if (!assigned) {
        results.push({
          lead_id: lead.id,
          lead_name: lead.nome,
          result: 'no_automation_matched'
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_leads: leads.length,
      results: results,
      summary: {
        assigned: results.filter(r => r.result === 'assigned').length,
        errors: results.filter(r => r.result === 'error').length,
        no_match: results.filter(r => r.result === 'no_automation_matched').length,
        no_seller: results.filter(r => r.result === 'no_target_seller').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in process-existing-automations:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Funzione per trovare il venditore precedente - SENZA LIMITI
async function findPreviousSeller(lead: any, supabase: any) {
  try {
    console.log(`Finding previous seller for lead: ${lead.email} / ${lead.telefono} in market: ${lead.market}`);
    
    // STEP 1: Cerca per EMAIL (più affidabile) - SENZA LIMITE
    if (lead.email) {
      const { data: emailMatches, error: emailError } = await supabase
        .from('lead_generation')
        .select('venditore, data_assegnazione, id')
        .eq('market', lead.market)
        .ilike('email', lead.email)
        .not('venditore', 'is', null)
        .order('data_assegnazione', { ascending: false })
        .limit(1);
      
      if (emailError) {
        console.error('Error searching by email:', emailError);
      } else if (emailMatches && emailMatches.length > 0) {
        console.log(`✅ Found previous seller by EMAIL: ${emailMatches[0].venditore} (assigned: ${emailMatches[0].data_assegnazione})`);
        return await fetchSellerDetailsByName(emailMatches[0].venditore, lead.market, supabase);
      }
    }
    
    // STEP 2: Se non trova per email, cerca per TELEFONO - SENZA LIMITE
    if (lead.telefono) {
      const { data: phoneMatches, error: phoneError } = await supabase
        .from('lead_generation')
        .select('venditore, data_assegnazione, id')
        .eq('market', lead.market)
        .ilike('telefono', lead.telefono)
        .not('venditore', 'is', null)
        .order('data_assegnazione', { ascending: false })
        .limit(1);
      
      if (phoneError) {
        console.error('Error searching by phone:', phoneError);
      } else if (phoneMatches && phoneMatches.length > 0) {
        console.log(`✅ Found previous seller by PHONE: ${phoneMatches[0].venditore} (assigned: ${phoneMatches[0].data_assegnazione})`);
        return await fetchSellerDetailsByName(phoneMatches[0].venditore, lead.market, supabase);
      }
    }
    
    console.log('❌ No previous assignment found');
    return null;

  } catch (error) {
    console.error('Error in findPreviousSeller:', error);
    return null;
  }
}

// Helper function per fetch dei dettagli venditore
async function fetchSellerDetailsByName(sellerName: string, market: string, supabase: any) {
  try {
    const { data: sellers, error: sellersError } = await supabase
      .from('venditori')
      .select('id, nome, cognome, sheets_file_id, sheets_tab_name, market, stato')
      .eq('market', market)
      .eq('stato', 'attivo');

    if (sellersError) {
      console.error('Error fetching sellers:', sellersError);
      return null;
    }

    if (!sellers || sellers.length === 0) {
      console.log('No active sellers found in market');
      return null;
    }

    // Cerca il venditore che corrisponde al nome
    const targetSeller = sellers.find(seller => {
      const fullName = `${seller.nome} ${seller.cognome}`.trim();
      const normalizedTarget = sellerName.toLowerCase().trim();
      const normalizedSeller = fullName.toLowerCase().trim();
      
      return normalizedSeller === normalizedTarget;
    });

    if (targetSeller) {
      console.log(`✅ Matched seller details:`, targetSeller);
      return targetSeller;
    } else {
      console.log(`❌ No matching seller found for name: ${sellerName}`);
      return null;
    }

  } catch (error) {
    console.error('Error in fetchSellerDetailsByName:', error);
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
    }
  } catch (error) {
    console.error('Error in logAutomationExecution:', error);
  }
}