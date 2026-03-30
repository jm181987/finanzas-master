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

    // Accept Bridgewise format
    const {
      event_id,
      source,
      event_name,
      event_type,
      event_date_utc,
      sentiment,
      importance_level,
      ticker,
      asset_name,
      asset_name_short,
      asset_type,
      currency,
      asset_trigger_price,
      asset_threshold_price,
      asset_change_percent,
      title_en,
      body_en,
      title_es,
      body_es,
      title_pt,
      body_pt,
      has_reasoning,
      reasoning,
    } = body;

    if (!event_type && !event_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_type or event_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const record = {
      event_id: event_id || crypto.randomUUID(),
      source: source || "webhook",
      event_name: event_name || null,
      event_type: event_type || null,
      event_date_utc: event_date_utc || new Date().toISOString(),
      sentiment: sentiment || null,
      importance_level: importance_level != null ? parseInt(String(importance_level)) : null,
      ticker: ticker || null,
      asset_name: asset_name || null,
      asset_name_short: asset_name_short || null,
      asset_type: asset_type || null,
      currency: currency || null,
      asset_trigger_price: asset_trigger_price != null ? parseFloat(String(asset_trigger_price)) : null,
      asset_threshold_price: asset_threshold_price != null ? parseFloat(String(asset_threshold_price)) : null,
      asset_change_percent: asset_change_percent != null ? parseFloat(String(asset_change_percent)) : null,
      title_en: title_en || null,
      title_es: title_es || null,
      title_pt: title_pt || null,
      body_en: body_en || null,
      body_es: body_es || null,
      body_pt: body_pt || null,
      has_reasoning: has_reasoning || false,
      reasoning: reasoning && reasoning.length > 0 ? JSON.stringify(reasoning) : null,
    };

    const { data, error } = await supabase
      .from("trading_signals")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signal received:", data?.event_id);

    return new Response(
      JSON.stringify({ success: true, signal_id: data?.id }),
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
