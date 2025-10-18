
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
    
    // Get venditore name from calendly_url if provided
    let venditoreNome = payload.venditore || null
    
    // If we have a calendly_url in the payload, try to find the venditore from venditori_calendly
    if (payload.calendly_url) {
      console.log(`Looking up venditore for Calendly URL: ${payload.calendly_url}`)
      
      const { data: venditoreData, error: venditoreError } = await supabase
        .from('venditori_calendly')
        .select('nome_venditore')
        .eq('calendly_url', payload.calendly_url)
        .eq('market', finalMarket)
        .eq('attivo', true)
        .single()
      
      if (venditoreError) {
        console.error('Error finding venditore from calendly_url:', venditoreError)
      } else if (venditoreData) {
        venditoreNome = venditoreData.nome_venditore
        console.log(`Found venditore from Calendly URL: ${venditoreNome}`)
        
        // CRITICAL: Update the booked_call record with the venditore we just found
        if (data && data.length > 0 && venditoreNome) {
          const { error: updateBookingError } = await supabase
            .from('booked_call')
            .update({ venditore: venditoreNome })
            .eq('id', data[0].id)
          
          if (updateBookingError) {
            console.error('Error updating booked_call with venditore:', updateBookingError)
          } else {
            console.log(`Updated booked_call ${data[0].id} with venditore: ${venditoreNome}`)
          }
        }
      }
    }
    
    // LOGICA CORRETTA: Update corresponding leads if they exist and are within attribution window
    if (payload.email || payload.telefono) {
      let query = supabase
        .from('lead_generation')
        .select('id, email, telefono, created_at, fonte')
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
        
        // Se abbiamo trovato un venditore tramite calendly_url, normalizziamolo dalla tabella venditori
        let normalizedVenditore = venditoreNome
        if (venditoreNome) {
          const { data: venditoriMatch, error: venditoriError } = await supabase
            .from('venditori')
            .select('nome, cognome')
            .eq('market', finalMarket)
            .eq('stato', 'attivo')
          
          if (!venditoriError && venditoriMatch && venditoriMatch.length > 0) {
            // Cerca match case-insensitive
            const venditoreFound = venditoriMatch.find(v => {
              const fullName = `${v.nome} ${v.cognome}`.toLowerCase()
              const firstNameOnly = v.nome.toLowerCase()
              const venditoreLower = venditoreNome.toLowerCase().trim()
              
              return fullName === venditoreLower || firstNameOnly === venditoreLower
            })
            
            if (venditoreFound) {
              normalizedVenditore = `${venditoreFound.nome} ${venditoreFound.cognome}`
              console.log(`Normalized venditore from "${venditoreNome}" to "${normalizedVenditore}"`)
            } else {
              console.warn(`Venditore "${venditoreNome}" not found in venditori table`)
            }
          }
        }
        
        // Prendi la fonte dal primo lead trovato se non è presente nel payload
        const fonteToUse = payload.fonte || matchingLeads[0]?.fonte || null
        
        // Aggiorna booked_call con la fonte copiata dal lead se necessario
        if (data && data.length > 0 && fonteToUse && !payload.fonte) {
          const { error: updateBookingFonteError } = await supabase
            .from('booked_call')
            .update({ fonte: fonteToUse })
            .eq('id', data[0].id)
          
          if (updateBookingFonteError) {
            console.error('Error updating booked_call with fonte from lead:', updateBookingFonteError)
          } else {
            console.log(`Updated booked_call ${data[0].id} with fonte from lead: ${fonteToUse}`)
          }
        }
        
        // Prepare update object
        const updateData: any = {
          booked_call: 'SI',
          assignable: false,  // CRITICO: Lead con call prenotate NON sono MAI assegnabili
          stato: 'prenotato'
        }
        
        // Add normalized venditore if we found one
        if (normalizedVenditore) {
          updateData.venditore = normalizedVenditore
          console.log(`Assigning normalized venditore: ${normalizedVenditore}`)
        }
        
        // Update all matching leads
        const { error: updateError } = await supabase
          .from('lead_generation')
          .update(updateData)
          .in('id', matchingLeads.map(lead => lead.id))

        if (updateError) {
          console.error('Error updating lead booked_call status:', updateError)
        } else {
          console.log(`Updated ${matchingLeads.length} leads to booked_call=SI, assignable=false${normalizedVenditore ? `, venditore=${normalizedVenditore}` : ''}`)
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
