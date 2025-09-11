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
          // Find previous seller
          const { data: previousLeads, error } = await supabase
            .from('lead_generation')
            .select(`
              venditore,
              venditori!inner(id, nome, cognome, sheets_file_id, sheets_tab_name, market)
            `)
            .or(`email.eq.${lead.email},telefono.eq.${lead.telefono}`)
            .eq('market', lead.market)
            .not('venditore', 'is', null)
            .order('data_assegnazione', { ascending: false })
            .limit(1)

          if (!error && previousLeads && previousLeads.length > 0) {
            targetSeller = previousLeads[0].venditori
            sheetsTabName = automation.sheets_tab_name
            console.log('Found previous seller:', targetSeller?.nome)
          } else {
            console.log('No previous seller found')
          }
        }

        if (targetSeller) {
          console.log(`Assigning lead ${lead.id} to seller ${targetSeller.nome} ${targetSeller.cognome}`)
          
          // Update the lead
          const { error: updateError } = await supabase
            .from('lead_generation')
            .update({
              venditore: `${targetSeller.nome} ${targetSeller.cognome}`,
              stato: 'assegnato',
              data_assegnazione: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', lead.id)

          if (updateError) {
            console.error('Error updating lead:', updateError)
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
            
            // Call webhook if needed
            try {
              const webhookData = {
                leadId: lead.id,
                nome: lead.nome,
                cognome: lead.cognome || '',
                email: lead.email,
                telefono: lead.telefono,
                fonte: lead.fonte,
                ultima_fonte: lead.ultima_fonte,
                venditore: `${targetSeller.nome} ${targetSeller.cognome}`,
                sheets_file_id: targetSeller.sheets_file_id,
                sheets_tab_name: sheetsTabName || targetSeller.sheets_tab_name,
                campagna: lead.campagna,
                market: lead.market,
                assignedVia: `Processamento automatico: ${automation.nome}`
              }

              const { error: webhookError } = await supabase.functions.invoke('lead-assign-webhook', {
                body: webhookData
              })

              if (webhookError) {
                console.error('Error calling webhook:', webhookError)
              }
            } catch (webhookError) {
              console.error('Error in webhook call:', webhookError)
            }
            
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