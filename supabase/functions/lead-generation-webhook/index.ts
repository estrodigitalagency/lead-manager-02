
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Set up CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse webhook payload
    const payload = await req.json()
    console.log('Received lead generation webhook payload:', payload)
    
    // Determine if booked_call is true, converting any string representation to proper format
    const isBooked = typeof payload.booked_call === 'string'
      ? payload.booked_call.toUpperCase() === 'SI' || payload.booked_call === 'true'
      : !!payload.booked_call
    
    // Use provided created_at date or default to now
    const createdAt = payload.created_at ? new Date(payload.created_at).toISOString() : new Date().toISOString();
    
    // Get duplicate check interval from environment variable (default 5 minutes)
    const duplicateCheckMinutes = parseInt(Deno.env.get('DUPLICATE_CHECK_MINUTES') || '5');
    const duplicateCheckInterval = new Date(Date.now() - duplicateCheckMinutes * 60 * 1000).toISOString();
    
    console.log(`Checking for duplicates within the last ${duplicateCheckMinutes} minutes (since ${duplicateCheckInterval})`);
    
    // Check for existing leads with EXACTLY the same nome, cognome, email, telefono AND fonte within the specified time interval
    let duplicateQuery = supabase
      .from('lead_generation')
      .select('*')
      .gte('created_at', duplicateCheckInterval);

    // Build the AND conditions for exact match on all fields
    const conditions = [];
    
    if (payload.nome) {
      conditions.push(`nome.eq.${payload.nome}`);
    } else {
      conditions.push('nome.is.null');
    }
    
    if (payload.cognome) {
      conditions.push(`cognome.eq.${payload.cognome}`);
    } else {
      conditions.push('cognome.is.null');
    }
    
    if (payload.email) {
      conditions.push(`email.eq.${payload.email}`);
    } else {
      conditions.push('email.is.null');
    }
    
    if (payload.telefono) {
      conditions.push(`telefono.eq.${payload.telefono}`);
    } else {
      conditions.push('telefono.is.null');
    }
    
    if (payload.fonte) {
      conditions.push(`fonte.eq.${payload.fonte}`);
    } else {
      conditions.push('fonte.is.null');
    }

    // Apply all conditions with AND logic
    if (conditions.length > 0) {
      duplicateQuery = duplicateQuery.and(conditions.join(','));
    }

    const { data: existingLeads, error: checkError } = await duplicateQuery;

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
    } else if (existingLeads && existingLeads.length > 0) {
      // Found an exact duplicate (all fields including fonte are identical)
      const existingLead = existingLeads[0];
      console.log(`Exact duplicate found! Returning existing lead with ID: ${existingLead.id}`);
      console.log(`Existing lead: ${existingLead.nome} ${existingLead.cognome} - ${existingLead.email} - ${existingLead.telefono} - Source: ${existingLead.fonte}`);
      console.log(`New payload would have been: ${payload.nome} ${payload.cognome} - ${payload.email} - ${payload.telefono} - Source: ${payload.fonte}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [existingLead],
          duplicate: true,
          message: 'Lead già esistente con tutti i campi identici, restituito lead esistente'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    console.log('No exact duplicates found, proceeding with lead insertion');
    
    // Insert the lead data to the lead_generation table
    const { data, error } = await supabase
      .from('lead_generation')
      .insert({
        nome: payload.nome || '',
        cognome: payload.cognome || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        campagna: payload.campagna || null,
        fonte: payload.fonte || null,
        booked_call: isBooked ? 'SI' : 'NO',
        assignable: isBooked,
        stato: isBooked ? 'prenotato' : 'nuovo',
        created_at: createdAt
      })
      .select()

    if (error) {
      console.error('Error inserting lead data:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log('Lead successfully inserted:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        duplicate: false,
        message: 'Nuovo lead inserito con successo'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
