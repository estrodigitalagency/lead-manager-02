
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

    // Set ultima_fonte equal to fonte (no duplicate checking)
    const ultimaFonte = fonte;
    
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
        (automation.trigger_when === 'duplicate_different_source' && lead.ultima_fonte && lead.ultima_fonte !== lead.fonte);
      
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
          await assignLeadAutomatically(lead, targetSeller, sheetsTabName, automation.nome, supabase);
          return; // Ferma alla prima automazione che matcha
        } else {
          console.log(`No target seller found for automation: ${automation.nome}`);
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
    // Cerca l'ultimo lead simile (stesso email o telefono) che ha un venditore assegnato nello stesso market
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

    if (error) {
      console.error('Error finding previous seller:', error);
      return null;
    }

    if (previousLeads && previousLeads.length > 0) {
      console.log('Found previous seller:', previousLeads[0].venditori);
      return previousLeads[0].venditori;
    }

    return null;
  } catch (error) {
    console.error('Error in findPreviousSeller:', error);
    return null;
  }
}

// Funzione per assegnare automaticamente il lead
async function assignLeadAutomatically(lead: any, seller: any, sheetsTabName: string | null, automationName: string, supabase: any) {
  try {
    console.log(`Assigning lead ${lead.id} to seller ${seller.nome} ${seller.cognome} via automation: ${automationName}`);
    
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
      return;
    }

    // Chiama il webhook di assegnazione se configurato
    try {
      const webhookData = {
        leadId: lead.id,
        nome: lead.nome,
        cognome: lead.cognome || '',
        email: lead.email,
        telefono: lead.telefono,
        fonte: lead.fonte,
        ultima_fonte: lead.ultima_fonte,
        venditore: `${seller.nome} ${seller.cognome}`,
        sheets_file_id: seller.sheets_file_id,
        sheets_tab_name: sheetsTabName || seller.sheets_tab_name,
        campagna: lead.campagna,
        market: lead.market,
        assignedVia: `Automazione: ${automationName}`
      };

      // Invoca il webhook lead-assign-webhook
      const { error: webhookError } = await supabase.functions.invoke('lead-assign-webhook', {
        body: webhookData
      });

      if (webhookError) {
        console.error('Error calling lead-assign-webhook:', webhookError);
      } else {
        console.log('Successfully called lead-assign-webhook for automation assignment');
      }

    } catch (webhookError) {
      console.error('Error in webhook call:', webhookError);
    }

    console.log(`Lead ${lead.id} successfully assigned via automation: ${automationName}`);
    
  } catch (error) {
    console.error('Error in assignLeadAutomatically:', error);
  }
}
