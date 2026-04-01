import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teacher_id } = await req.json();
    if (!teacher_id) {
      return new Response(JSON.stringify({ error: "teacher_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Delete all exam data belonging to this teacher
    const { data: teacherExams } = await adminClient
      .from("exams")
      .select("id")
      .eq("teacher_id", teacher_id);

    if (teacherExams?.length) {
      const examIds = teacherExams.map((e: any) => e.id);

      // Get all sessions for these exams
      const { data: sessions } = await adminClient
        .from("exam_sessions")
        .select("id")
        .in("exam_id", examIds);

      if (sessions?.length) {
        const sessionIds = sessions.map((s: any) => s.id);
        // Delete answers and cheat logs
        await adminClient.from("student_answers").delete().in("session_id", sessionIds);
        await adminClient.from("cheat_logs").delete().in("session_id", sessionIds);
        await adminClient.from("exam_sessions").delete().in("exam_id", examIds);
      }

      // Delete questions and exams
      await adminClient.from("questions").delete().in("exam_id", examIds);
      await adminClient.from("exams").delete().eq("teacher_id", teacher_id);
    }

    // 2. Delete user_roles
    await adminClient.from("user_roles").delete().eq("user_id", teacher_id);

    // 3. Delete profile
    await adminClient.from("profiles").delete().eq("id", teacher_id);

    // 4. Delete from auth (requires service role)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(teacher_id);
    if (authDeleteError) {
      // Auth deletion failed — log but don't fail the whole operation
      // Profile and roles are already gone so they can't log in
      console.error("Auth delete failed:", authDeleteError.message);
      return new Response(
        JSON.stringify({ success: true, warning: `Auth user not deleted: ${authDeleteError.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("delete-teacher error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
