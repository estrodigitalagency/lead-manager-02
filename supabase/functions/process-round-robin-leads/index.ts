import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  market: string;
  leadIds: string[];
  sendWebhook: boolean;
  campagna: string | null;
  notes: string | null;
}

interface ProcessResult {
  lead_id: string;
  nome: string;
  email: string | null;
  previous_venditore: string;
  status: 'success' | 'error';
  error?: string;
  webhook_sent?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { market = 'IT', leadIds, sendWebhook = false, campagna = null, notes = null }: ProcessRequest = await req.json();

    if (!leadIds || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No lead IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing', leadIds.length, 'Round Robin leads for market:', market);
    console.log('Campagna:', campagna, 'Send webhook:', sendWebhook, 'Notes:', notes);

    const results: ProcessResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Get lead data
    const { data: leads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('*')
      .in('id', leadIds);

    if (leadsError) {
      throw leadsError;
    }

    for (const lead of leads || []) {
      try {
        // Find previous seller
        const previousSeller = await findPreviousSeller(supabase, lead, market);

        if (!previousSeller) {
          results.push({
            lead_id: lead.id,
            nome: lead.nome,
            email: lead.email,
            previous_venditore: 'N/A',
            status: 'error',
            error: 'No previous seller found',
          });
          errorCount++;
          continue;
        }

        const now = new Date().toISOString();

        // Update the lead
        const { error: updateError } = await supabase
          .from('lead_generation')
          .update({
            venditore: previousSeller.venditore,
            data_assegnazione: now,
            stato: 'assegnato',
            campagna: campagna,
            assignable: false,
          })
          .eq('id', lead.id);

        if (updateError) {
          throw updateError;
        }

        // Log the action
        await supabase
          .from('lead_actions_log')
          .insert({
            action_type: 'bulk_round_robin_fix',
            lead_ids: [lead.id],
            leads_count: 1,
            previous_venditore: 'Round Robin',
            new_venditore: previousSeller.venditore,
            performed_by: 'user',
            notes: notes || `Riassegnato a venditore precedente (precedente assegnazione: ${previousSeller.data_assegnazione})`,
            market: market,
          });

        // Create assignment history record
        await supabase
          .from('assignment_history')
          .insert({
            venditore: previousSeller.venditore,
            leads_count: 1,
            campagna: campagna,
            lead_ids: [lead.id],
            assignment_type: 'bulk_round_robin_fix',
            market: market,
          });

        let webhookSent = false;

        // Send webhook if enabled
        if (sendWebhook) {
          try {
            // Get seller webhook URL
            const { data: sellerData } = await supabase
              .from('venditori')
              .select('webhook_url')
              .eq('market', market)
              .or(`nome.ilike.${previousSeller.venditore.split(' ')[0]}%`)
              .limit(1);

            if (sellerData && sellerData.length > 0 && sellerData[0].webhook_url) {
              const webhookPayload = {
                lead_id: lead.id,
                nome: lead.nome,
                cognome: lead.cognome,
                email: lead.email,
                telefono: lead.telefono,
                fonte: lead.fonte,
                campagna: campagna,
                venditore: previousSeller.venditore,
                data_assegnazione: now,
                assignment_type: 'bulk_round_robin_fix',
              };

              const webhookResponse = await fetch(sellerData[0].webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
              });

              webhookSent = webhookResponse.ok;
              console.log('Webhook sent for lead', lead.id, '- success:', webhookSent);
            }
          } catch (webhookError) {
            console.error('Webhook error for lead', lead.id, ':', webhookError);
          }
        }

        results.push({
          lead_id: lead.id,
          nome: lead.nome,
          email: lead.email,
          previous_venditore: previousSeller.venditore,
          status: 'success',
          webhook_sent: webhookSent,
        });
        successCount++;

      } catch (error) {
        console.error('Error processing lead', lead.id, ':', error);
        results.push({
          lead_id: lead.id,
          nome: lead.nome,
          email: lead.email,
          previous_venditore: 'N/A',
          status: 'error',
          error: error.message || 'Unknown error',
        });
        errorCount++;
      }
    }

    const response = {
      processed: leadIds.length,
      success: successCount,
      failed: errorCount,
      results: results,
    };

    console.log('Processing complete:', response.processed, 'processed,', response.success, 'success,', response.failed, 'failed');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-round-robin-leads:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function findPreviousSeller(
  supabase: any, 
  lead: any, 
  market: string
): Promise<{ venditore: string; data_assegnazione: string } | null> {
  // Try by email first
  if (lead.email) {
    const { data: emailMatches } = await supabase
      .from('lead_generation')
      .select('venditore, data_assegnazione')
      .eq('email', lead.email)
      .eq('market', market)
      .neq('venditore', 'Round Robin')
      .not('venditore', 'is', null)
      .not('data_assegnazione', 'is', null)
      .order('data_assegnazione', { ascending: false })
      .limit(1);

    if (emailMatches && emailMatches.length > 0) {
      return {
        venditore: emailMatches[0].venditore,
        data_assegnazione: emailMatches[0].data_assegnazione,
      };
    }
  }

  // Try by phone
  if (lead.telefono) {
    const { data: phoneMatches } = await supabase
      .from('lead_generation')
      .select('venditore, data_assegnazione')
      .eq('telefono', lead.telefono)
      .eq('market', market)
      .neq('venditore', 'Round Robin')
      .not('venditore', 'is', null)
      .not('data_assegnazione', 'is', null)
      .order('data_assegnazione', { ascending: false })
      .limit(1);

    if (phoneMatches && phoneMatches.length > 0) {
      return {
        venditore: phoneMatches[0].venditore,
        data_assegnazione: phoneMatches[0].data_assegnazione,
      };
    }
  }

  return null;
}
