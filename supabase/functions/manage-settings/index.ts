import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function ensureTable(adminClient: any) {
  // Check if table exists by trying to query it
  const { error } = await adminClient.from("app_settings").select("key").limit(1);
  if (error && (error.code === "42P01" || error.message?.includes("not find"))) {
    // Table doesn't exist - create it using the DB URL
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) throw new Error("SUPABASE_DB_URL not configured");

    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
    const sql = postgres(dbUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS public.app_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key text UNIQUE NOT NULL,
        value text NOT NULL,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY`;
    
    // RLS policies
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage settings' AND tablename = 'app_settings') THEN
          CREATE POLICY "Admins can manage settings"
            ON public.app_settings FOR ALL TO authenticated
            USING (has_role(auth.uid(), 'admin'::app_role))
            WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
        END IF;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'app_settings') THEN
          CREATE POLICY "Service role full access"
            ON public.app_settings FOR ALL TO service_role
            USING (true) WITH CHECK (true);
        END IF;
      END $$
    `;

    await sql.end();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.slice("Bearer ".length).trim();
    const {
      data: claimsData,
      error: claimsError,
    } = await adminClient.auth.getClaims(token);

    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure table exists
    await ensureTable(adminClient);

    const { action, key, value } = await req.json();

    if (action === "get") {
      const { data, error } = await adminClient
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ ok: true, value: data?.value ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set") {
      if (!key || value === undefined) {
        return new Response(JSON.stringify({ error: "key and value required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient
        .from("app_settings")
        .upsert(
          { key, value, updated_by: user.id },
          { onConflict: "key" }
        );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
