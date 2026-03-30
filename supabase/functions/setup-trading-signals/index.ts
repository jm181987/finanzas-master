import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Use service role to execute DDL
  const res = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
    }
  );

  // Execute raw SQL via the management API
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "DB URL not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use postgres module
  const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
  const sql = postgres(dbUrl);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.trading_signals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pair text NOT NULL,
        direction text NOT NULL,
        entry_price numeric NOT NULL,
        take_profit numeric,
        stop_loss numeric,
        status text NOT NULL DEFAULT 'active',
        source text DEFAULT 'webhook',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        closed_at timestamptz
      )
    `;

    await sql`ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY`;

    // Create policies
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Authenticated users can view signals') THEN
          CREATE POLICY "Authenticated users can view signals" ON public.trading_signals FOR SELECT TO authenticated USING (true);
        END IF;
      END $$
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Service role can insert signals') THEN
          CREATE POLICY "Service role can insert signals" ON public.trading_signals FOR INSERT TO service_role WITH CHECK (true);
        END IF;
      END $$
    `);

    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Admins can manage signals') THEN
          CREATE POLICY "Admins can manage signals" ON public.trading_signals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
        END IF;
      END $$
    `);

    await sql.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals`).catch(() => {});

    await sql.end();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await sql.end();
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
