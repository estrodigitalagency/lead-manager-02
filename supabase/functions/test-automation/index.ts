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

    const { leadId } = await req.json()
    console.log('Testing automation for lead:', leadId)

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError) {
      console.error('Error fetching lead:', leadError)
      throw leadError
    }

    console.log('Lead data:', lead)

    // Get active automations
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
      console.error('Error fetching automations:', automationsError)
      throw automationsError
    }

    console.log('Found automations:', automations)

    // Test each automation
    const results = []
    for (const automation of automations) {
      console.log(`Testing automation: ${automation.nome}`)
      
      // Check trigger condition
      const shouldTrigger = automation.trigger_when === 'new_lead' || 
        (automation.trigger_when === 'duplicate_different_source' && lead.ultima_fonte && lead.ultima_fonte.trim() !== '');
      
      console.log('Should trigger:', shouldTrigger)
      
      if (!shouldTrigger) {
        results.push({ automation: automation.nome, result: 'trigger_condition_not_met' })
        continue;
      }
      
      // Check field condition - condition_value is an ARRAY
      const fieldValue = lead[automation.trigger_field] || '';
      const field = fieldValue.toLowerCase();
      const conditionValues = automation.condition_value || [];
      
      console.log(`Checking condition: ${field} ${automation.condition_type} [${conditionValues.join(', ')}]`)
      
      let conditionMet = false;
      switch (automation.condition_type) {
        case 'contains':
          // TRUE se il campo contiene ALMENO UNO dei valori
          conditionMet = conditionValues.some(val => field.includes(val.toLowerCase()));
          break;
        case 'equals':
          // TRUE se il campo è UGUALE ad ALMENO UNO dei valori
          conditionMet = conditionValues.some(val => field === val.toLowerCase());
          break;
        case 'starts_with':
          // TRUE se il campo inizia con ALMENO UNO dei valori
          conditionMet = conditionValues.some(val => field.startsWith(val.toLowerCase()));
          break;
        case 'ends_with':
          // TRUE se il campo finisce con ALMENO UNO dei valori
          conditionMet = conditionValues.some(val => field.endsWith(val.toLowerCase()));
          break;
        case 'not_contains':
          // TRUE se il campo NON contiene NESSUNO dei valori (TUTTI devono non matchare)
          conditionMet = conditionValues.every(val => !field.includes(val.toLowerCase()));
          break;
        default:
          conditionMet = false;
      }
      
      console.log('Condition met:', conditionMet)
      
      if (!conditionMet) {
        results.push({ automation: automation.nome, result: 'condition_not_met' })
        continue;
      }
      
      // Check action type
      if (automation.action_type === 'assign_to_previous_seller') {
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
          .limit(1);

        console.log('Previous leads query result:', previousLeads, error)
        
        if (error) {
          results.push({ automation: automation.nome, result: 'error_finding_previous_seller', error })
          continue;
        }
        
        if (!previousLeads || previousLeads.length === 0) {
          results.push({ automation: automation.nome, result: 'no_previous_seller_found' })
          continue;
        }
        
        results.push({ 
          automation: automation.nome, 
          result: 'would_assign_to_previous_seller',
          seller: previousLeads[0].venditore,
          seller_details: previousLeads[0].venditori
        })
      } else {
        results.push({ automation: automation.nome, result: 'direct_assignment', seller: automation.venditori })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      lead,
      automations,
      test_results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in test-automation:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});