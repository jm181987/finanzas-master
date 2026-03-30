import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Validate required fields
    const { pair, direction, entry_price, take_profit, stop_loss } = body;

    if (!pair || !direction || entry_price == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: pair, direction, entry_price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["buy", "sell"].includes(direction.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "direction must be 'buy' or 'sell'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.from("trading_signals").insert({
      pair: pair.toUpperCase(),
      direction: direction.toLowerCase(),
      entry_price: parseFloat(entry_price),
      take_profit: take_profit != null ? parseFloat(take_profit) : null,
      stop_loss: stop_loss != null ? parseFloat(stop_loss) : null,
      status: "active",
      source: body.source || "webhook",
      notes: body.notes || null,
    }).select().single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signal received:", data);

    return new Response(
      JSON.stringify({ success: true, signal: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
