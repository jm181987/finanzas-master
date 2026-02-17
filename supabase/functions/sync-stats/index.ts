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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Sync current counts using direct queries
    const { data: courses } = await adminClient
      .from("courses")
      .select("id");

    for (const course of courses || []) {
      const { count } = await adminClient
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);

      await adminClient
        .from("courses")
        .update({ total_students: count || 0 })
        .eq("id", course.id);
    }

    return new Response(JSON.stringify({ ok: true, synced: courses?.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
