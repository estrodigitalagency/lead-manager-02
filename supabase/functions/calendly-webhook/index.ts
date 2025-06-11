
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
    console.log('Received calendly webhook payload:', payload)
    
    // Insert the booking data to the booked_call table
    // Important: Use the scheduled_at from the payload for both scheduled_at and data_call
    const { data, error } = await supabase
      .from('booked_call')
      .insert({
        nome: payload.nome || '',
        cognome: payload.cognome || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        fonte: payload.fonte || null,
        scheduled_at: payload.scheduled_at || new Date().toISOString(),
        data_call: payload.data_call || payload.scheduled_at || new Date().toISOString(),
        venditore: payload.venditore || null
      })
      .select()

    if (error) {
      console.error('Error inserting booking data:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Get attribution window settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'booking_attribution_window_days')
      .single()
    
    const attributionWindow = settings?.value ? parseInt(settings.value) : 7 // Default to 7 days if not set
    const attributionWindowDate = new Date()
    attributionWindowDate.setDate(attributionWindowDate.getDate() - attributionWindow)
    
    // Format as ISO string for comparison
    const attributionWindowISODate = attributionWindowDate.toISOString()
    
    console.log(`Attribution window: ${attributionWindow} days, cutoff date: ${attributionWindowISODate}`)
    
    // Update corresponding leads if they exist and are within attribution window
    // IMPORTANTE: Usare query corrette per evitare errori di sintassi
    if (payload.email || payload.telefono) {
      let updateQuery = supabase
        .from('lead_generation')
        .update({ 
          booked_call: 'SI',
          assignable: false,  // CRITICO: Lead con call prenotate NON sono assegnabili
          stato: 'prenotato'
        })
        .gte('created_at', attributionWindowISODate)

      // Applica filtri per email o telefono in modo corretto
      if (payload.email && payload.telefono) {
        updateQuery = updateQuery.or(`email.eq.${payload.email},telefono.eq.${payload.telefono}`)
      } else if (payload.email) {
        updateQuery = updateQuery.eq('email', payload.email)
      } else if (payload.telefono) {
        updateQuery = updateQuery.eq('telefono', payload.telefono)
      }

      console.log(`Searching for leads with email: ${payload.email}, phone: ${payload.telefono}`)
      
      const { data: updatedLeads, error: updateError } = await updateQuery.select()

      if (updateError) {
        console.error('Error updating lead booked_call status:', updateError)
      } else {
        console.log(`Updated ${updatedLeads?.length || 0} leads to booked_call=SI and assignable=false`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data, 
        attributionWindow,
        scheduled_at: payload.scheduled_at || new Date().toISOString(),
        data_call: payload.data_call || payload.scheduled_at || new Date().toISOString()
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
