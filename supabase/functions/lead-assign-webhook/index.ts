
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
    // Parse the request body
    const body = await req.json()
    const { assignmentData, webhookUrl } = body
    
    // Validate the required parameters
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
    
    console.log('Sending lead assignment data to webhook:', webhookUrl)
    console.log('Assignment data:', JSON.stringify(assignmentData))
    
    // Send the data to the specified webhook
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData)
      })
      
      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Webhook error response:', errorBody)
        throw new Error(`Webhook responded with status ${response.status}: ${errorBody}`)
      }
      
      // Return the webhook response
      const webhookResponse = await response.json()
      console.log('Webhook response:', webhookResponse)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead assignment data sent to webhook successfully',
          webhookResponse
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
