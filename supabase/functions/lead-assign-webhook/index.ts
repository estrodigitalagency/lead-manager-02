
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { assignmentData, webhookUrl } = body
    
    if (!assignmentData || !assignmentData.leads || !assignmentData.venditore || !webhookUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: 'assignmentData.leads, assignmentData.venditore, and webhookUrl are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    // Enhanced payload with all required data
    const webhookPayload = {
      venditore: assignmentData.venditore,
      venditore_cognome: assignmentData.venditore_cognome || '',
      google_sheets_file_id: assignmentData.google_sheets_file_id,
      google_sheets_tab_name: assignmentData.google_sheets_tab_name,
      campagna: assignmentData.campagna || '',
      leads_count: assignmentData.leads_count,
      timestamp: assignmentData.timestamp,
      leads: assignmentData.leads.map(lead => ({
        id: lead.id,
        nome: lead.nome,
        cognome: lead.cognome || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        fonte: lead.fonte || '',
        note: lead.note || '',
        created_at: lead.created_at,
        assigned_at: lead.assigned_at
      }))
    }
    
    console.log('Sending enhanced lead assignment data to webhook:', webhookUrl)
    console.log('Enhanced payload:', JSON.stringify(webhookPayload, null, 2))
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })
      
      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Webhook error response:', errorBody)
        throw new Error(`Webhook responded with status ${response.status}: ${errorBody}`)
      }
      
      const webhookResponse = await response.json()
      console.log('Webhook response:', webhookResponse)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Enhanced lead assignment data sent to webhook successfully',
          webhookResponse,
          payload: webhookPayload
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } catch (webhookError) {
      console.error('Error sending data to webhook:', webhookError)
      return new Response(
        JSON.stringify({ 
          error: 'Webhook error',
          details: webhookError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
  } catch (error) {
    console.error('Lead assignment webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
