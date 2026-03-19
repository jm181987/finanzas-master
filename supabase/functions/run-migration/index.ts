import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create table
    const { error: tableError } = await adminClient.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.course_collaborators (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
          user_id uuid NOT NULL,
          added_by uuid,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (course_id, user_id)
        );
        ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY;
      `
    });

    if (tableError) {
      console.error("Table creation error:", tableError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
