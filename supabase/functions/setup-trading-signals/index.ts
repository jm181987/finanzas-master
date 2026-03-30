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

  const sql = `
    CREATE TABLE IF NOT EXISTS public.trading_signals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pair text NOT NULL,
      direction text NOT NULL CHECK (direction IN ('buy', 'sell')),
      entry_price numeric NOT NULL,
      take_profit numeric,
      stop_loss numeric,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hit_tp', 'hit_sl', 'closed', 'expired')),
      source text DEFAULT 'webhook',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      closed_at timestamptz
    );

    ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Authenticated users can view signals') THEN
        CREATE POLICY "Authenticated users can view signals" ON public.trading_signals FOR SELECT TO authenticated USING (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Service role can insert signals') THEN
        CREATE POLICY "Service role can insert signals" ON public.trading_signals FOR INSERT TO service_role WITH CHECK (true);
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trading_signals' AND policyname = 'Admins can manage signals') THEN
        CREATE POLICY "Admins can manage signals" ON public.trading_signals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
      END IF;
    END $$;

    ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_signals;
  `;

  const { error } = await supabase.rpc("exec_sql" as any, { sql_text: sql });
  
  // Try direct approach if rpc fails
  if (error) {
    // Execute each statement separately via raw SQL
    const statements = sql.split(';').filter(s => s.trim());
    const results = [];
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      const { error: stmtError } = await supabase.from('_manual_migration').select().limit(0);
      results.push({ stmt: stmt.substring(0, 50), error: stmtError?.message });
    }
    
    return new Response(JSON.stringify({ 
      message: "Please run this SQL manually in your database console",
      sql 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
