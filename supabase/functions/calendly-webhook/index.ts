
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
    
    // Default market to 'IT' for backward compatibility
    const finalMarket = payload.market || 'IT'
    
    console.log('Received calendly webhook payload:', { ...payload, market: finalMarket })
    
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
        venditore: payload.venditore || null,
        market: finalMarket
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
    
    // LOGICA CORRETTA: Update corresponding leads if they exist and are within attribution window
    if (payload.email || payload.telefono) {
      let query = supabase
        .from('lead_generation')
        .select('id, email, telefono, created_at')
        .gte('created_at', attributionWindowISODate)
        .eq('market', finalMarket)

      // Apply filters for email or telefono
      if (payload.email && payload.telefono) {
        query = query.or(`email.eq.${payload.email},telefono.eq.${payload.telefono}`)
      } else if (payload.email) {
        query = query.eq('email', payload.email)
      } else if (payload.telefono) {
        query = query.eq('telefono', payload.telefono)
      }

      const { data: matchingLeads, error: searchError } = await query

      if (searchError) {
        console.error('Error searching for matching leads:', searchError)
      } else if (matchingLeads && matchingLeads.length > 0) {
        console.log(`Found ${matchingLeads.length} matching leads to update`)
        
        // Update all matching leads
        const { error: updateError } = await supabase
          .from('lead_generation')
          .update({ 
            booked_call: 'SI',
            assignable: false,  // CRITICO: Lead con call prenotate NON sono MAI assegnabili
            stato: 'prenotato'
          })
          .in('id', matchingLeads.map(lead => lead.id))

        if (updateError) {
          console.error('Error updating lead booked_call status:', updateError)
        } else {
          console.log(`Updated ${matchingLeads.length} leads to booked_call=SI and assignable=false`)
        }
      } else {
        console.log('No matching leads found within attribution window')
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
