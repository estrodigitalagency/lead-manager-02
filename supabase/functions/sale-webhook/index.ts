import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaleWebhookPayload {
  email?: string;
  telefono?: string;
  importo: number;
  percorso_venduto: string;
  note?: string;
  data_chiusura?: string;
  market?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: SaleWebhookPayload = await req.json();
    console.log('Sale webhook received:', JSON.stringify(payload));

    // Validazione
    if (!payload.email && !payload.telefono) {
      console.error('Missing email or telefono');
      return new Response(
        JSON.stringify({ error: 'È richiesta almeno una email o un telefono' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.importo || !payload.percorso_venduto) {
      console.error('Missing importo or percorso_venduto');
      return new Response(
        JSON.stringify({ error: 'Importo e percorso venduto sono obbligatori' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dataChiusura = payload.data_chiusura ? new Date(payload.data_chiusura) : new Date();
    console.log('Data chiusura:', dataChiusura.toISOString());

    // Step 1: Cerca la booked_call più recente per email/telefono
    let bookedCallQuery = supabase
      .from('booked_call')
      .select('id, fonte, venditore, email, telefono, scheduled_at')
      .order('scheduled_at', { ascending: false })
      .limit(1);

    if (payload.email && payload.telefono) {
      bookedCallQuery = bookedCallQuery.or(`email.eq.${payload.email},telefono.eq.${payload.telefono}`);
    } else if (payload.email) {
      bookedCallQuery = bookedCallQuery.eq('email', payload.email);
    } else if (payload.telefono) {
      bookedCallQuery = bookedCallQuery.eq('telefono', payload.telefono);
    }

    if (payload.market) {
      bookedCallQuery = bookedCallQuery.eq('market', payload.market);
    }

    const { data: bookedCalls, error: bookedCallError } = await bookedCallQuery;

    if (bookedCallError) {
      console.error('Error fetching booked_call:', bookedCallError);
    }

    const bookedCall = bookedCalls?.[0];
    const fonteCall = bookedCall?.fonte || null;
    console.log('Booked call found:', bookedCall ? `ID: ${bookedCall.id}, fonte: ${fonteCall}` : 'None');

    // Step 2: Cerca tutti i lead per email/telefono
    let leadsQuery = supabase
      .from('lead_generation')
      .select('id, email, telefono, nome, cognome, ultima_fonte, created_at, market')
      .order('created_at', { ascending: false });

    if (payload.email && payload.telefono) {
      leadsQuery = leadsQuery.or(`email.eq.${payload.email},telefono.eq.${payload.telefono}`);
    } else if (payload.email) {
      leadsQuery = leadsQuery.eq('email', payload.email);
    } else if (payload.telefono) {
      leadsQuery = leadsQuery.eq('telefono', payload.telefono);
    }

    if (payload.market) {
      leadsQuery = leadsQuery.eq('market', payload.market);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Errore nella ricerca dei lead', details: leadsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!leads || leads.length === 0) {
      console.log('No leads found for email/telefono');
      return new Response(
        JSON.stringify({ error: 'Nessun lead trovato per questa email/telefono' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${leads.length} leads`);

    // Step 3: Trova il lead corretto
    let selectedLead = null;
    let matchReason = '';

    // CASO A: Se abbiamo fonte_call, cerchiamo un lead con ultima_fonte = fonte_call
    if (fonteCall) {
      const matchingLead = leads.find(lead => lead.ultima_fonte === fonteCall);
      if (matchingLead) {
        selectedLead = matchingLead;
        matchReason = `Matching ultima_fonte = fonte_call (${fonteCall})`;
        console.log(`Found lead with matching ultima_fonte: ${matchingLead.id}`);
      }
    }

    // CASO B: Nessun match con fonte_call, prendi il lead con created_at più vicino a data_chiusura
    if (!selectedLead) {
      // Trova il lead la cui created_at è più vicina a data_chiusura (ma prima)
      const leadsBeforeChiusura = leads.filter(lead => new Date(lead.created_at) <= dataChiusura);
      
      if (leadsBeforeChiusura.length > 0) {
        // Il primo è già quello più recente (ordinato DESC)
        selectedLead = leadsBeforeChiusura[0];
        matchReason = `Closest created_at before data_chiusura (${selectedLead.created_at})`;
      } else {
        // Se tutti i lead sono dopo data_chiusura, prendi il più vecchio (creato per primo dopo la vendita)
        selectedLead = leads[leads.length - 1];
        matchReason = `Fallback to oldest lead (all created after data_chiusura)`;
      }
      console.log(`Selected lead by date proximity: ${selectedLead.id}, reason: ${matchReason}`);
    }

    // Step 4: Aggiorna il lead selezionato
    const { data: updatedLead, error: updateError } = await supabase
      .from('lead_generation')
      .update({
        vendita_chiusa: true,
        data_chiusura: dataChiusura.toISOString(),
        importo_vendita: payload.importo,
        percorso_venduto: payload.percorso_venduto,
        fonte_vendita: fonteCall,
        note_vendita: payload.note || null,
      })
      .eq('id', selectedLead.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return new Response(
        JSON.stringify({ error: 'Errore nell\'aggiornamento del lead', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead updated successfully:', updatedLead.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vendita registrata con successo',
        lead: {
          id: updatedLead.id,
          nome: updatedLead.nome,
          cognome: updatedLead.cognome,
          email: updatedLead.email,
          telefono: updatedLead.telefono,
          fonte_vendita: fonteCall,
          importo_vendita: payload.importo,
          percorso_venduto: payload.percorso_venduto,
        },
        matching: {
          reason: matchReason,
          booked_call_found: !!bookedCall,
          leads_found: leads.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sale webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
