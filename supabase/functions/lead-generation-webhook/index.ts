
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
    
    // Check for existing leads with same email, phone, or name+surname within the specified time interval
    const { data: existingLeads, error: checkError } = await supabase
      .from('lead_generation')
      .select('*')
      .gte('created_at', duplicateCheckInterval)
      .or(`email.eq.${payload.email || 'NULL'},telefono.eq.${payload.telefono || 'NULL'},and(nome.eq.${payload.nome || 'NULL'},cognome.eq.${payload.cognome || 'NULL'})`)

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
    } else if (existingLeads && existingLeads.length > 0) {
      // NUOVA LOGICA: Controlla se esiste un lead con la stessa fonte
      const sameSourceLead = existingLeads.find(lead => lead.fonte === payload.fonte);
      
      if (sameSourceLead) {
        // Found a duplicate lead with the same source - return existing lead
        console.log(`Duplicate lead with same source found! Returning existing lead with ID: ${sameSourceLead.id}`);
        console.log(`Existing lead: ${sameSourceLead.nome} ${sameSourceLead.cognome} - ${sameSourceLead.email} - ${sameSourceLead.telefono} - Source: ${sameSourceLead.fonte}`);
        console.log(`New payload would have been: ${payload.nome} ${payload.cognome} - ${payload.email} - ${payload.telefono} - Source: ${payload.fonte}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: [sameSourceLead],
            duplicate: true,
            message: 'Lead già esistente con la stessa fonte, restituito lead esistente'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      } else {
        // Lead exists but with different source - proceed to create new lead
        const existingLead = existingLeads[0];
        console.log(`Lead exists with different source. Existing: ${existingLead.fonte}, New: ${payload.fonte}`);
        console.log(`Proceeding to create new lead with different source`);
        // Continue to lead insertion below
      }
    }
    
    console.log('No duplicates found or different source detected, proceeding with lead insertion');
    
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
