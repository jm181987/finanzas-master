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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Get the user from their JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), { status: 400, headers: corsHeaders });
    }

    // Use admin client to bypass RLS for this trusted operation
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify that all lessons are actually completed before marking course as done
    const { data: modules } = await adminClient
      .from("modules")
      .select("id")
      .eq("course_id", course_id);

    if (!modules || modules.length === 0) {
      return new Response(JSON.stringify({ error: "Course has no modules" }), { status: 400, headers: corsHeaders });
    }

    const moduleIds = modules.map((m) => m.id);

    const { data: lessons } = await adminClient
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds);

    const totalLessons = lessons?.length || 0;
    const lessonIds = (lessons || []).map((l) => l.id);

    const { data: progress } = await adminClient
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("completed", true)
      .in("lesson_id", lessonIds);

    const completedCount = progress?.length || 0;

    if (completedCount < totalLessons) {
      return new Response(
        JSON.stringify({ error: "Not all lessons completed", completed: completedCount, total: totalLessons }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Mark enrollment as completed
    const { data, error } = await adminClient
      .from("enrollments")
      .update({ completed_at: new Date().toISOString() })
      .eq("course_id", course_id)
      .eq("user_id", user.id)
      .is("completed_at", null)
      .select()
      .maybeSingle();

    return new Response(JSON.stringify({ data, error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
