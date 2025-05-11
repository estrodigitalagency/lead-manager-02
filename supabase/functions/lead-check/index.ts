
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
    
    // Get days before assignable settings
    const { data: daysBeforeAssignableSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single()
      
    const daysBeforeAssignable = daysBeforeAssignableSettings?.value ? parseInt(daysBeforeAssignableSettings.value) : 7
    
    console.log(`Starting lead check with attribution window of ${attributionWindow} days and ${daysBeforeAssignable} days before assignable`)
    
    // Calculate the start date for attribution window
    const attributionWindowDate = new Date()
    attributionWindowDate.setDate(attributionWindowDate.getDate() - attributionWindow)
    const attributionWindowISODate = attributionWindowDate.toISOString()
    
    // First, check ALL leads for assignability based on days since creation
    // This ensures that even if a booked call is deleted, we'll update the lead status
    const { data: leadsToCheck, error: leadsError } = await supabase
      .from('lead_generation')
      .select('id, email, telefono, created_at, booked_call, assignable')
    
    if (leadsError) {
      throw leadsError
    }
    
    console.log(`Found ${leadsToCheck?.length || 0} total leads to check for assignability`)
    
    // Track how many leads were updated
    let updatedLeadsCount = 0
    
    // Check each lead for bookings and update assignability
    if (leadsToCheck && leadsToCheck.length > 0) {
      for (const lead of leadsToCheck) {
        // Only process leads with either email or phone
        if (!lead.email && !lead.telefono) continue
        
        // Check if lead has any matching bookings
        const { data: matchingBookings, error: bookingsFetchError } = await supabase
          .from('booked_call')
          .select('id')
          .or(`email.eq.${lead.email},telefono.eq.${lead.telefono}`)
          .limit(1)
        
        if (bookingsFetchError) {
          console.error(`Error checking bookings for lead ${lead.id}:`, bookingsFetchError)
          continue
        }
        
        // Calculate days since creation
        const createdDate = new Date(lead.created_at)
        const today = new Date()
        const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Lead has matching booking - mark as booked and not assignable
        if (matchingBookings && matchingBookings.length > 0) {
          // Need to update booked_call status AND assignable status
          const needsUpdate = lead.booked_call !== 'SI' || lead.assignable !== false
          
          if (needsUpdate) {
            console.log(`Found booking for lead ${lead.id}, updating status to booked and not assignable`)
            
            const { error: updateError } = await supabase
              .from('lead_generation')
              .update({
                booked_call: 'SI',
                assignable: false,
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
        // No booking found - check if should be assignable based on "booked_call" status and days since creation
        else {
          // CORRECTED LOGIC:
          // A lead is assignable ONLY when:
          // 1. No booking found (already confirmed by this branch)
          // 2. booked_call is "NO"
          // 3. Days since creation >= daysBeforeAssignable setting (can now be 0)
          
          // First, ensure booked_call status is accurate (if no booking exists, set to "NO")
          let updateNeeded = false
          const updates: Record<string, any> = {}
          
          // If booked_call is "SI" but no booking exists, update it to "NO"
          if (lead.booked_call === 'SI') {
            updates.booked_call = 'NO'
            updateNeeded = true
          }
          
          // Check if days since creation is sufficient - allowing for 0 days
          const enoughDaysPassed = daysSinceCreation >= daysBeforeAssignable
          
          // Determine assignability - ONLY assignable if both conditions are met:
          // 1. booked_call is "NO" (or will be updated to "NO")
          // 2. Enough days have passed (can now be immediate if daysBeforeAssignable = 0)
          const shouldBeAssignable = (lead.booked_call === 'NO' || updates.booked_call === 'NO') && enoughDaysPassed
          
          // If assignability needs to change, update it
          if (lead.assignable !== shouldBeAssignable) {
            updates.assignable = shouldBeAssignable
            updateNeeded = true
          }
          
          if (updateNeeded) {
            console.log(`Updating lead ${lead.id}: booked_call=${updates.booked_call || lead.booked_call}, assignable=${shouldBeAssignable} (days since creation: ${daysSinceCreation})`)
            
            const { error: updateError } = await supabase
              .from('lead_generation')
              .update(updates)
              .eq('id', lead.id)
              
            if (updateError) {
              console.error(`Error updating lead ${lead.id}:`, updateError)
            } else {
              updatedLeadsCount++
            }
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
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
