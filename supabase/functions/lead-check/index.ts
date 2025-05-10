
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

    // Get attribution window settings
    const { data: attributionSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'booking_attribution_window_days')
      .single()
    
    const attributionWindow = attributionSettings?.value ? parseInt(attributionSettings.value) : 7 // Default to 7 days if not set
    
    console.log(`Starting lead check with attribution window of ${attributionWindow} days`)
    
    // Calculate the start date for attribution window
    const attributionWindowDate = new Date()
    attributionWindowDate.setDate(attributionWindowDate.getDate() - attributionWindow)
    const attributionWindowISODate = attributionWindowDate.toISOString()
    
    // Get all leads that aren't marked as having booked a call yet
    const { data: leadsToCheck, error: leadsFetchError } = await supabase
      .from('lead_generation')
      .select('id, email, telefono, created_at')
      .or(`booked_call.is.null,booked_call.eq.NO`)
      .gte('created_at', attributionWindowISODate)
    
    if (leadsFetchError) {
      throw leadsFetchError
    }
    
    console.log(`Found ${leadsToCheck?.length || 0} leads to check for bookings`)
    
    // Track how many leads were updated
    let updatedLeadsCount = 0
    
    // Check each lead for bookings
    if (leadsToCheck && leadsToCheck.length > 0) {
      for (const lead of leadsToCheck) {
        // Only check leads that have either email or phone
        if (!lead.email && !lead.telefono) continue
        
        // Build filters for email and phone
        const filters = []
        if (lead.email) filters.push({ column: 'email', value: lead.email })
        if (lead.telefono) filters.push({ column: 'telefono', value: lead.telefono })
        
        // Query for bookings that match this lead
        const { data: matchingBookings, error: bookingsFetchError } = await supabase
          .from('booked_call')
          .select('id')
          .or(filters.map(f => `${f.column}.eq.${f.value}`).join(','))
          .limit(1)
        
        if (bookingsFetchError) {
          console.error(`Error checking bookings for lead ${lead.id}:`, bookingsFetchError)
          continue
        }
        
        // If we found a matching booking, update the lead
        if (matchingBookings && matchingBookings.length > 0) {
          console.log(`Found booking for lead ${lead.id}, updating status`)
          
          const { error: updateError } = await supabase
            .from('lead_generation')
            .update({
              booked_call: 'SI',
              assignable: true,
              stato: 'prenotato'
            })
            .eq('id', lead.id)
          
          if (updateError) {
            console.error(`Error updating lead ${lead.id}:`, updateError)
          } else {
            updatedLeadsCount++
          }
        }
      }
    }
    
    console.log(`Lead check completed. Updated ${updatedLeadsCount} leads.`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: leadsToCheck?.length || 0,
        updated: updatedLeadsCount 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Lead check processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
