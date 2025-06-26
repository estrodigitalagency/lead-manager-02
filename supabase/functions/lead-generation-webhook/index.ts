
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { nome, cognome, email, telefono, fonte, campagna, notes } = await req.json()

    console.log('Received lead data:', { nome, cognome, email, telefono, fonte, campagna, notes })

    // Get duplicate check settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['duplicate_check_value', 'duplicate_check_unit'])

    if (settingsError) {
      console.log('Error fetching settings, using defaults:', settingsError)
    }

    let duplicateCheckMinutes = 5; // Default fallback
    
    if (settings && settings.length > 0) {
      const valueRow = settings.find(s => s.key === 'duplicate_check_value');
      const unitRow = settings.find(s => s.key === 'duplicate_check_unit');
      
      const value = valueRow ? parseInt(valueRow.value) : 5;
      const unit = unitRow ? unitRow.value : 'minutes';
      
      duplicateCheckMinutes = unit === 'hours' ? value * 60 : value;
    }

    console.log('Using duplicate check interval:', duplicateCheckMinutes, 'minutes')

    // Check for potential duplicates in the configured time window
    const cutoffTime = new Date(Date.now() - (duplicateCheckMinutes * 60 * 1000)).toISOString()
    
    const { data: existingLeads, error: searchError } = await supabase
      .from('lead_generation')
      .select('*')
      .gte('created_at', cutoffTime)
      .or(`email.eq.${email},telefono.eq.${telefono},and(nome.eq.${nome},cognome.eq.${cognome})`)

    if (searchError) {
      console.error('Error searching for duplicates:', searchError)
      throw searchError
    }

    console.log('Found potential duplicates:', existingLeads?.length || 0)

    if (existingLeads && existingLeads.length > 0) {
      for (const lead of existingLeads) {
        console.log('Checking potential duplicate:', lead)
        
        // Check if it's a true duplicate (same source)
        if (lead.fonte === fonte) {
          console.log('Found duplicate with same source, returning existing lead')
          return new Response(
            JSON.stringify({
              success: true,
              duplicate: true,
              lead: lead,
              message: `Lead duplicato trovato (stessa fonte: ${fonte})`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
      }
      
      // Potential duplicate but different source - insert new lead
      console.log('Potential duplicate found but different source, creating new lead')
    }

    // No duplicates found or different source - insert new lead
    const { data: newLead, error: insertError } = await supabase
      .from('lead_generation')
      .insert({
        nome,
        cognome,
        email,
        telefono,
        fonte,
        campagna,
        notes,
        stato: 'nuovo',
        assignable: false,
        booked_call: 'NO'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      throw insertError
    }

    console.log('Successfully created new lead:', newLead)

    return new Response(
      JSON.stringify({
        success: true,
        duplicate: false,
        lead: newLead,
        message: 'Lead inserito con successo'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error processing lead:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
