
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
    
    // Get all bookings at once to create a lookup map
    const emails = allLeads.map(lead => lead.email).filter(email => email)
    const phones = allLeads.map(lead => lead.telefono).filter(phone => phone)
    
    const { data: allBookings, error: bookingsError } = await supabase
      .from('booked_call')
      .select('email, telefono')
      .or(`email.in.(${emails.join(',')}),telefono.in.(${phones.join(',')})`)
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      // Continue without bookings data rather than failing
    }
    
    // Create lookup sets for faster checking
    const bookedEmails = new Set((allBookings || []).map(b => b.email).filter(e => e))
    const bookedPhones = new Set((allBookings || []).map(b => b.telefono).filter(p => p))
    
    // Process leads in batches
    const batchSize = 100
    let totalUpdatedLeads = 0
    
    for (let i = 0; i < allLeads.length; i += batchSize) {
      const batch = allLeads.slice(i, i + batchSize)
      const updates: Array<{ id: string, updates: Record<string, any> }> = []
      
      for (const lead of batch) {
        const hasBooking = (lead.email && bookedEmails.has(lead.email)) || 
                          (lead.telefono && bookedPhones.has(lead.telefono))
        
        const createdDate = new Date(lead.created_at)
        const enoughDaysPassed = createdDate <= new Date(assignableCutoffISODate)
        
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
        
        // Aggiorna assignable status in base alle condizioni corrette
        if (lead.assignable !== shouldBeAssignable) {
          updateObj.assignable = shouldBeAssignable
          needsUpdate = true
        }
        
        // Se ha una call prenotata, deve essere NON assegnabile
        if (hasBooking && lead.assignable !== false) {
          updateObj.assignable = false
          needsUpdate = true
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
