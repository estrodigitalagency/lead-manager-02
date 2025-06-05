
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
    // Important: Use the scheduled_at from the payload instead of now()
    const { data, error } = await supabase
      .from('booked_call')
      .insert({
        nome: payload.nome || '',
        cognome: payload.cognome || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        fonte: payload.fonte || null,
        scheduled_at: payload.scheduled_at || new Date().toISOString(), // Use provided scheduled_at or fallback to now()
        note: payload.note || null
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
    
    // Update corresponding leads if they exist and are within attribution window
    if (payload.email || payload.telefono) {
      // Build the filter condition
      const emailCondition = payload.email ? `email.eq.${payload.email}` : ''
      const phoneCondition = payload.telefono ? `telefono.eq.${payload.telefono}` : ''
      const timeCondition = `created_at.gte.${attributionWindowISODate}`
      
      // Combine conditions with OR for email/phone and AND for time
      let filterCondition = ''
      if (emailCondition && phoneCondition) {
        filterCondition = `(${emailCondition},${phoneCondition}),${timeCondition}`
      } else if (emailCondition) {
        filterCondition = `${emailCondition},${timeCondition}`
      } else if (phoneCondition) {
        filterCondition = `${phoneCondition},${timeCondition}`
      }
      
      if (filterCondition) {
        const { error: updateError } = await supabase
          .from('lead_generation')
          .update({ 
            booked_call: 'SI',
            assignable: false,
            stato: 'prenotato'
          })
          .or(filterCondition)

        if (updateError) {
          console.error('Error updating lead booked_call status:', updateError)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data, 
        attributionWindow,
        scheduled_at: payload.scheduled_at || new Date().toISOString() // Include scheduled_at in response for debugging
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
