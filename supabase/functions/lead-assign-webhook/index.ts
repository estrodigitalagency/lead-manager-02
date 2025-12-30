
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
    console.log('Lead assignment webhook called');
    const body = await req.json()
    const { assignmentData, webhookUrl } = body
    
    console.log('Received assignment data:', JSON.stringify(assignmentData, null, 2));
    console.log('Target webhook URL:', webhookUrl);
    
    if (!assignmentData || !assignmentData.leads || !assignmentData.venditore || !webhookUrl) {
      console.error('Missing required parameters:', { 
        hasAssignmentData: !!assignmentData,
        hasLeads: !!assignmentData?.leads,
        hasVenditore: !!assignmentData?.venditore,
        hasWebhookUrl: !!webhookUrl
      });
      
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
    
    // Payload completo per webhook esterno - PASS-THROUGH di tutti i campi lead
    const webhookPayload = {
      venditore: assignmentData.venditore,
      venditore_cognome: assignmentData.venditore_cognome || '',
      venditore_email: assignmentData.venditore_email || '',
      venditore_telefono: assignmentData.venditore_telefono || '',
      google_sheets_file_id: assignmentData.google_sheets_file_id || '',
      google_sheets_tab_name: assignmentData.google_sheets_tab_name || '',
      campagna: assignmentData.campagna || '',
      market: assignmentData.market || 'IT',
      leads_count: assignmentData.leads_count,
      timestamp: assignmentData.timestamp,
      leads: assignmentData.leads.map(lead => ({
        // Pass-through ALL fields from upstream, with defaults for essential ones
        ...lead,
        id: lead.id,
        nome: lead.nome || '',
        cognome: lead.cognome || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        fonte: lead.fonte || '',
        lead_score: lead.lead_score || null,
        stato_del_lead: lead.stato_del_lead || '',
        stato: lead.stato || '',
        ultima_fonte: lead.ultima_fonte || '',
        note: lead.note || '',
        market: lead.market || 'IT',
        campagna: lead.campagna || '',
        booked_call: lead.booked_call || '',
        assignable: lead.assignable ?? false,
        manually_not_assignable: lead.manually_not_assignable ?? false,
        venditore: lead.venditore || '',
        created_at: lead.created_at,
        updated_at: lead.updated_at || '',
        data_assegnazione: lead.data_assegnazione || '',
        assigned_at: lead.assigned_at
      }))
    }
    
    console.log('Sending complete lead assignment data to webhook:', webhookUrl)
    console.log('Payload details:', JSON.stringify({
      venditore: webhookPayload.venditore,
      leads_count: webhookPayload.leads_count,
      has_google_sheets_info: !!(webhookPayload.google_sheets_file_id && webhookPayload.google_sheets_tab_name)
    }));
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })
      
      console.log('Webhook response status:', response.status);
      console.log('Webhook response ok:', response.ok);
      
      // Make spesso restituisce status 200 o 202 anche quando non c'è JSON
      if (response.ok) {
        console.log('Webhook call successful');
        
        let responseData = null;
        try {
          const responseText = await response.text();
          console.log('Webhook response text:', responseText);
          
          // Prova a parsare come JSON, ma non fallire se non è JSON
          if (responseText && responseText.trim()) {
            try {
              responseData = JSON.parse(responseText);
            } catch (parseError) {
              console.log('Response is not JSON, treating as success');
              responseData = { message: responseText || 'Success' };
            }
          } else {
            responseData = { message: 'Success - empty response' };
          }
        } catch (textError) {
          console.log('Could not read response text, treating as success');
          responseData = { message: 'Success - no response body' };
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Lead assignment data sent to webhook successfully',
            webhookResponse: responseData,
            status: response.status
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        const errorText = await response.text()
        console.error('Webhook error response:', errorText)
        throw new Error(`Webhook responded with status ${response.status}: ${errorText}`)
      }
    } catch (webhookError) {
      console.error('Error sending data to webhook:', webhookError)
      return new Response(
        JSON.stringify({ 
          error: 'Webhook error',
          details: webhookError.message,
          webhookUrl
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
