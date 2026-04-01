import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing required environment variables");
    }

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - missing auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: `Unauthorized - ${userError?.message || 'no user'}` }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles, error: roleCheckError } = await adminClient
      .from("user_roles").select("role").eq("user_id", caller.id);
    
    if (roleCheckError) {
      throw new Error(`Role check failed: ${roleCheckError.message}`);
    }
    
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    const { email, password, full_name } = requestBody;
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "email and password are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating teacher with email: ${email}`);

    // Create user via Admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name?.trim() || "" },
    });
    
    if (createError) {
      console.error("User creation error:", createError);
      throw new Error(`User creation failed: ${createError.message}`);
    }
    
    if (!newUser.user) {
      throw new Error("User creation returned no user data");
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // The trigger automatically creates profile and assigns teacher role
    // Let's just verify the role was assigned correctly
    const { data: roleCheck, error: roleCheckError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", newUser.user.id)
      .eq("role", "teacher")
      .single();
    
    if (roleCheckError || !roleCheck) {
      console.error("Role verification failed:", roleCheckError);
      // The trigger should have handled this, but if it failed, clean up
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Teacher role assignment verification failed");
    }

    console.log(`Role verified for user: ${newUser.user.id}`);

    // Update the profile with the provided full_name if different from metadata
    if (full_name?.trim()) {
      const { error: profileUpdateError } = await adminClient.from("profiles").update({
        full_name: full_name.trim(),
      }).eq("id", newUser.user.id);

      if (profileUpdateError) {
        console.error("Profile update error:", profileUpdateError);
        // Don't fail the entire operation for profile update errors
        console.log("Profile update failed but continuing...");
      }
    }

    console.log(`Teacher created successfully: ${email}`);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-teacher error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
