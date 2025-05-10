
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the assignability window setting
    const { data: settingData, error: settingError } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_assignability_window_days')
      .single();

    if (settingError) {
      console.error("Error fetching assignability window setting:", settingError);
      return new Response(JSON.stringify({ error: "Error fetching settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Parse the window days value
    const windowDays = settingData ? parseInt(settingData.value) : 0;
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    
    console.log(`Checking leads with cutoff date: ${cutoffDate.toISOString()}`);

    // Update leads that meet criteria
    const { data, error } = await supabaseClient
      .from('lead_generation')
      .update({ assegnabile: true })
      .lte('created_at', cutoffDate.toISOString())
      .eq('booked_call', 'NO')
      .eq('assegnabile', false);

    if (error) {
      console.error("Error updating leads:", error);
      return new Response(JSON.stringify({ error: "Error updating leads" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Lead assignability check completed",
      updated: data || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
