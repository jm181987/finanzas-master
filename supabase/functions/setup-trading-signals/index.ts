import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "DB URL not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
  const sql = postgres(dbUrl);

  try {
    // Drop old table and recreate with Bridgewise schema
    await sql`DROP TABLE IF EXISTS public.trading_signals CASCADE`;

    await sql`
      CREATE TABLE public.trading_signals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id text UNIQUE,
        source text DEFAULT 'webhook',
        event_name text,
        event_type text,
        event_date_utc timestamptz,
        sentiment text,
        importance_level integer,
        ticker text,
        asset_name text,
        asset_name_short text,
        asset_type text,
        currency text,
        asset_trigger_price numeric,
        asset_threshold_price numeric,
        asset_change_percent numeric,
        title_en text,
        title_es text,
        title_pt text,
        body_en text,
        body_es text,
        body_pt text,
        has_reasoning boolean DEFAULT false,
        reasoning text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY`;

    await sql.unsafe(`
      CREATE POLICY "Authenticated users can view signals"
        ON public.trading_signals FOR SELECT TO authenticated USING (true)
    `);

    await sql.unsafe(`
      CREATE POLICY "Service role can insert signals"
        ON public.trading_signals FOR INSERT TO service_role WITH CHECK (true)
    `);

    await sql.unsafe(`
      CREATE POLICY "Admins can manage signals"
        ON public.trading_signals FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'))
    `);

    await sql.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals`).catch(() => {});

    await sql.end();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await sql.end();
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
