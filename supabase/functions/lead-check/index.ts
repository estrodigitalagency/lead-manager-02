
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
    
    const attributionWindow = attributionSettings?.value ? parseInt(attributionSettings.value) : 7
    
    // Get days before assignable settings
    const { data: daysBeforeAssignableSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single()
      
    const daysBeforeAssignable = daysBeforeAssignableSettings?.value ? parseInt(daysBeforeAssignableSettings.value) : 7
    
    console.log(`Starting lead check with attribution window of ${attributionWindow} days and ${daysBeforeAssignable} days before assignable`)
    
    // Calculate the cutoff date for assignability based on days_before_assignable
    const assignableCutoffDate = new Date()
    assignableCutoffDate.setDate(assignableCutoffDate.getDate() - daysBeforeAssignable)
    const assignableCutoffISODate = assignableCutoffDate.toISOString()
    
    // Get all leads with their contact info
    const { data: allLeads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('id, email, telefono, created_at, booked_call, assignable')
      .not('email', 'is', null)
      .not('telefono', 'is', null)
    
    if (leadsError) {
      throw leadsError
    }
    
    console.log(`Found ${allLeads?.length || 0} leads to check`)
    
    if (!allLeads || allLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Get all bookings at once to create a lookup map - CORREZIONE: uso OR multipli
    const { data: allBookings, error: bookingsError } = await supabase
      .from('booked_call')
      .select('email, telefono')
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      // Continue without bookings data rather than failing
    }
    
    console.log(`Found ${allBookings?.length || 0} bookings in database`)
    
    // Create lookup sets for faster checking
    const bookedEmails = new Set((allBookings || []).map(b => b.email).filter(e => e && e.trim() !== ''))
    const bookedPhones = new Set((allBookings || []).map(b => b.telefono).filter(p => p && p.trim() !== ''))
    
    console.log(`Booked emails: ${Array.from(bookedEmails).join(', ')}`)
    console.log(`Booked phones: ${Array.from(bookedPhones).join(', ')}`)
    
    // Process leads in batches
    const batchSize = 100
    let totalUpdatedLeads = 0
    
    for (let i = 0; i < allLeads.length; i += batchSize) {
      const batch = allLeads.slice(i, i + batchSize)
      const updates: Array<{ id: string, updates: Record<string, any> }> = []
      
      for (const lead of batch) {
        // CONTROLLO MIGLIORATO PER LE PRENOTAZIONI
        const emailHasBooking = lead.email && lead.email.trim() !== '' && bookedEmails.has(lead.email.trim())
        const phoneHasBooking = lead.telefono && lead.telefono.trim() !== '' && bookedPhones.has(lead.telefono.trim())
        const hasBooking = emailHasBooking || phoneHasBooking
        
        const createdDate = new Date(lead.created_at)
        const enoughDaysPassed = createdDate <= new Date(assignableCutoffISODate)
        
        // Debug per lead specifico
        if (lead.email === 'dora.were1969@gmail.com') {
          console.log(`DEBUG lead dora.were1969@gmail.com:`)
          console.log(`- Email: ${lead.email}`)
          console.log(`- Telefono: ${lead.telefono}`)
          console.log(`- emailHasBooking: ${emailHasBooking}`)
          console.log(`- phoneHasBooking: ${phoneHasBooking}`)
          console.log(`- hasBooking: ${hasBooking}`)
          console.log(`- enoughDaysPassed: ${enoughDaysPassed}`)
          console.log(`- booked_call attuale: ${lead.booked_call}`)
          console.log(`- assignable attuale: ${lead.assignable}`)
        }
        
        let needsUpdate = false
        const updateObj: Record<string, any> = {}
        
        // CONDIZIONI DI ASSEGNABILITÀ CORRETTE:
        // 1. Devono essere passati abbastanza giorni (>= daysBeforeAssignable)
        // 2. Il lead NON deve avere una call prenotata
        const shouldBeAssignable = enoughDaysPassed && !hasBooking
        
        // Aggiorna booked_call status
        if (hasBooking) {
          if (lead.booked_call !== 'SI') {
            updateObj.booked_call = 'SI'
            updateObj.stato = 'prenotato'
            needsUpdate = true
          }
        } else {
          if (lead.booked_call === 'SI') {
            updateObj.booked_call = 'NO'
            needsUpdate = true
          }
        }
        
        // Aggiorna assignable status - SEMPRE in base alle condizioni corrette
        if (lead.assignable !== shouldBeAssignable) {
          updateObj.assignable = shouldBeAssignable
          needsUpdate = true
        }
        
        // Debug finale per lead specifico
        if (lead.email === 'dora.were1969@gmail.com') {
          console.log(`- shouldBeAssignable: ${shouldBeAssignable}`)
          console.log(`- needsUpdate: ${needsUpdate}`)
          console.log(`- updateObj:`, updateObj)
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
    
    console.log(`Lead check completed. Updated ${totalUpdatedLeads} leads out of ${allLeads.length} checked.`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
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
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
