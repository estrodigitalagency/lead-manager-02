
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
    // Parse request body to get market parameter (optional)
    let market = 'IT' // Default market
    try {
      const body = await req.json()
      if (body.market) {
        market = body.market
      }
    } catch {
      // If no body or invalid JSON, use default market
    }
    
    console.log(`Running lead check for market: ${market}`)
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
    
    const attributionWindow = attributionSettings?.value ? parseInt(attributionSettings.value) : 7
    
    // Get days before assignable settings
    const { data: daysBeforeAssignableSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single()
      
    const daysBeforeAssignable = daysBeforeAssignableSettings?.value ? parseInt(daysBeforeAssignableSettings.value) : 7
    
    console.log(`Starting lead check with attribution window of ${attributionWindow} days and ${daysBeforeAssignable} days before assignable`)
    
    // STEP 1: REGOLA ASSOLUTA - TUTTI i lead con booked_call='SI' NON SONO MAI ASSEGNABILI (filtrato per market)
    console.log(`STEP 1: Setting all leads with booked_call='SI' to be NON-assignable for market ${market}`)
    const { error: forceUpdateError } = await supabase
      .from('lead_generation')
      .update({ assignable: false, stato: 'prenotato' })
      .eq('booked_call', 'SI')
      .eq('market', market)
    
    if (forceUpdateError) {
      console.error('Error in force update:', forceUpdateError)
    }
    
    // Calculate the cutoff date for assignability based on days_before_assignable
    const assignableCutoffDate = new Date()
    assignableCutoffDate.setDate(assignableCutoffDate.getDate() - daysBeforeAssignable)
    const assignableCutoffISODate = assignableCutoffDate.toISOString()
    
    // Calculate the cutoff date for attribution window
    const attributionCutoffDate = new Date()
    attributionCutoffDate.setDate(attributionCutoffDate.getDate() - attributionWindow)
    const attributionCutoffISODate = attributionCutoffDate.toISOString()
    
    console.log(`Assignable cutoff date: ${assignableCutoffISODate}`)
    console.log(`Attribution cutoff date: ${attributionCutoffISODate}`)
    
    // Get all leads with their contact info (ESCLUDO già quelli con call prenotate, filtrato per market)
    const { data: allLeads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('id, email, telefono, created_at, booked_call, assignable')
      .not('email', 'is', null)
      .not('telefono', 'is', null)
      .neq('booked_call', 'SI') // EVITO di processare lead con call già prenotate
      .eq('market', market)
    
    if (leadsError) {
      throw leadsError
    }
    
    console.log(`Found ${allLeads?.length || 0} leads to check for market ${market} (excluding already booked)`)
    
    if (!allLeads || allLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, market, checked: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Get all bookings created within the attribution window (filtrato per market)
    const { data: allBookings, error: bookingsError } = await supabase
      .from('booked_call')
      .select('email, telefono, created_at')
      .gte('created_at', attributionCutoffISODate)
      .eq('market', market)
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      // Continue without bookings data rather than failing
    }
    
    console.log(`Found ${allBookings?.length || 0} bookings in attribution window`)
    
    // Helper function to check if booking email matches any lead email
    const checkEmailMatch = (leadEmail: string, bookingEmail: string): boolean => {
      if (!leadEmail || !bookingEmail) return false
      
      // Se l'email del lead contiene virgole, splitta e verifica ogni email
      if (leadEmail.includes(',')) {
        const leadEmails = leadEmail.split(',').map(email => email.trim().toLowerCase())
        return leadEmails.includes(bookingEmail.trim().toLowerCase())
      }
      
      // Altrimenti confronto diretto
      return leadEmail.trim().toLowerCase() === bookingEmail.trim().toLowerCase()
    }
    
    // Process leads in batches
    const batchSize = 100
    let totalUpdatedLeads = 0
    
    for (let i = 0; i < allLeads.length; i += batchSize) {
      const batch = allLeads.slice(i, i + batchSize)
      const updates: Array<{ id: string, updates: Record<string, any> }> = []
      
      for (const lead of batch) {
        const createdDate = new Date(lead.created_at)
        const enoughDaysPassed = createdDate <= new Date(assignableCutoffISODate)
        
        // Check if this lead has a booking within the attribution window
        let hasBookingInWindow = false
        
        if (allBookings) {
          for (const booking of allBookings) {
            const bookingCreatedDate = new Date(booking.created_at)
            const leadCreatedDate = new Date(lead.created_at)
            
            // MATCHING: Email OR telefono devono corrispondere E booking creato dopo lead
            const emailMatch = checkEmailMatch(lead.email, booking.email)
            const phoneMatch = lead.telefono && booking.telefono && 
                              lead.telefono.trim().replace(/\s+/g, '') === booking.telefono.trim().replace(/\s+/g, '')
            
            // Email OR telefono devono corrispondere E booking creato dopo lead
            if ((emailMatch || phoneMatch) && bookingCreatedDate >= leadCreatedDate) {
              hasBookingInWindow = true
              console.log(`MATCH TROVATO per lead ${lead.id}: email=${lead.email}, telefono=${lead.telefono}`)
              break
            }
          }
        }
        
        let needsUpdate = false
        const updateObj: Record<string, any> = {}
        
        // REGOLA PRINCIPALE: Gestione assegnabilità
        if (hasBookingInWindow) {
          // Ha una call prenotata -> booked_call = SI, assignable = false
          updateObj.booked_call = 'SI'
          updateObj.assignable = false
          updateObj.stato = 'prenotato'
          needsUpdate = true
          
          console.log(`Lead ${lead.id} ha call prenotata -> NON assegnabile`)
        } else {
          // NON ha call prenotata -> gestire assegnabilità in base ai giorni
          if (lead.booked_call === 'SI') {
            // Era marcato come SI ma non ha booking -> correggere
            updateObj.booked_call = 'NO'
            needsUpdate = true
          }
          
          // LOGICA ASSEGNABILITÀ: solo se non ha call prenotate E sono passati abbastanza giorni
          const shouldBeAssignable = enoughDaysPassed
          if (lead.assignable !== shouldBeAssignable) {
            updateObj.assignable = shouldBeAssignable
            updateObj.stato = shouldBeAssignable ? 'nuovo' : 'nuovo'
            needsUpdate = true
          }
          
          if (shouldBeAssignable) {
            console.log(`Lead ${lead.id} SENZA call e abbastanza vecchio -> assegnabile`)
          } else {
            console.log(`Lead ${lead.id} SENZA call ma troppo recente -> NON assegnabile`)
          }
        }
        
        if (needsUpdate) {
          updates.push({ id: lead.id, updates: updateObj })
        }
      }
      
      // Execute batch updates
      if (updates.length > 0) {
        for (const { id, updates: updateData } of updates) {
          const { error: updateError } = await supabase
            .from('lead_generation')
            .update(updateData)
            .eq('id', id)
          
          if (updateError) {
            console.error(`Error updating lead ${id}:`, updateError)
          } else {
            totalUpdatedLeads++
          }
        }
      }
      
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allLeads.length/batchSize)}`)
    }
    
    // STEP 2: FINAL SAFETY CHECK - Force update any remaining leads with booked_call='SI' (filtrato per market)
    console.log(`STEP 2: Final safety check for leads with booked_call='SI' for market ${market}`)
    const { error: finalUpdateError } = await supabase
      .from('lead_generation')
      .update({ assignable: false, stato: 'prenotato' })
      .eq('booked_call', 'SI')
      .eq('market', market)
    
    if (finalUpdateError) {
      console.error('Error in final safety update:', finalUpdateError)
    }
    
    console.log(`Lead check completed for market ${market}. Updated ${totalUpdatedLeads} leads out of ${allLeads.length} checked.`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        market,
        checked: allLeads.length,
        updated: totalUpdatedLeads 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Lead check processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
