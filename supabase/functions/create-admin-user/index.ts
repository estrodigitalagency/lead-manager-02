
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("Starting admin user creation process...");

    // Prima verifica se l'utente esiste già
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Error checking existing users: " + listError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Current users count:", existingUsers.users.length);
    
    const existingUser = existingUsers.users.find(user => user.email === "me@matteonebbioso.com");
    
    if (existingUser) {
      console.log("User already exists, deleting...");
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      
      if (deleteError) {
        console.error("Error deleting existing user:", deleteError);
        return new Response(
          JSON.stringify({ error: "Error deleting existing user: " + deleteError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log("Existing user deleted successfully");
      // Aspetta un momento per assicurarsi che la cancellazione sia completata
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Ora crea l'utente admin
    console.log("Creating new admin user...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "me@matteonebbioso.com",
      password: "Booster2025!",
      email_confirm: true,
      user_metadata: {
        first_name: "Matteo Nicola",
        last_name: "Nebbioso",
        role: "admin"
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Error creating user: " + authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("User created successfully with ID:", authData.user.id);

    // Aspetta un momento e poi verifica il profilo
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: profileData, error: profileSelectError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileSelectError && profileSelectError.code === "PGRST116") {
      // Profilo non esiste, crealo manualmente
      console.log("Profile not found, creating manually...");
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: "me@matteonebbioso.com",
          first_name: "Matteo Nicola",
          last_name: "Nebbioso",
          role: "admin"
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return new Response(
          JSON.stringify({ error: "Error creating profile: " + profileError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log("Profile created manually");
    } else if (profileSelectError) {
      console.error("Error checking profile:", profileSelectError);
    } else {
      console.log("Profile already exists:", profileData);
    }

    console.log("Admin user setup completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user creato con successo! Ora puoi fare il login con me@matteonebbioso.com e password Booster2025!",
        user_id: authData.user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Errore inaspettato: " + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
