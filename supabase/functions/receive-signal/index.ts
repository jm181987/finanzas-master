import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
};

const firstBoolean = (...values: unknown[]): boolean => {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
  }
  return false;
};

const normalizeReasoning = (value: unknown): string | null => {

const extractTickerFromBody = (body: string | null): string | null => {
  if (!body) return null;
  // Pattern: "Veja TICKER para mais" or "See TICKER for more"
  const match = body.match(/(?:Veja|Vea|See)\s+([A-Z][A-Z0-9.]{0,9})\s+(?:para|for)/i);
  if (match) return match[1].toUpperCase();
  // Pattern: ticker-like word in parentheses e.g. (AAPL)
  const paren = body.match(/\(([A-Z][A-Z0-9.]{0,9})\)/);
  if (paren) return paren[1];
  return null;
};

  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

    const payload = asRecord(body);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payloadData = asRecord(payload.data);
    const nestedPayload = asRecord(payload.payload);
    const signal = asRecord(payload.signal);

    const titleGroup =
      asRecord(payload.title) ??
      asRecord(payloadData?.title) ??
      asRecord(nestedPayload?.title) ??
      asRecord(signal?.title);

    const bodyGroup =
      asRecord(payload.body) ??
      asRecord(payloadData?.body) ??
      asRecord(nestedPayload?.body) ??
      asRecord(signal?.body);

    const messageGroup =
      asRecord(payload.message) ??
      asRecord(payloadData?.message) ??
      asRecord(nestedPayload?.message) ??
      asRecord(signal?.message);

    const descriptionGroup =
      asRecord(payload.description) ??
      asRecord(payloadData?.description) ??
      asRecord(nestedPayload?.description) ??
      asRecord(signal?.description);

    const contentGroup =
      asRecord(payload.content) ??
      asRecord(payloadData?.content) ??
      asRecord(nestedPayload?.content) ??
      asRecord(signal?.content);

    const summaryGroup =
      asRecord(payload.summary) ??
      asRecord(payloadData?.summary) ??
      asRecord(nestedPayload?.summary) ??
      asRecord(signal?.summary);

    const reasoning = payload.reasoning ?? payloadData?.reasoning ?? nestedPayload?.reasoning ?? signal?.reasoning;

    const title_en = firstString(
      payload.title_en,
      payloadData?.title_en,
      nestedPayload?.title_en,
      signal?.title_en,
      payload.headline_en,
      payloadData?.headline_en,
      titleGroup?.en,
      titleGroup?.english,
      payload.title,
      payloadData?.title,
      nestedPayload?.title,
      signal?.title,
      payload.headline,
      payloadData?.headline,
      payload.event_name,
      payload.event_type,
      payload.asset_name,
      payload.ticker,
    );

    const title_es = firstString(
      payload.title_es,
      payloadData?.title_es,
      nestedPayload?.title_es,
      signal?.title_es,
      payload.headline_es,
      payloadData?.headline_es,
      titleGroup?.es,
      titleGroup?.spanish,
      payload.title,
      payloadData?.title,
      nestedPayload?.title,
      signal?.title,
      payload.headline,
      payloadData?.headline,
      payload.event_name,
      payload.event_type,
      payload.asset_name,
      payload.ticker,
    );

    const title_pt = firstString(
      payload.title_pt,
      payload.title_pt_br,
      payloadData?.title_pt,
      payloadData?.title_pt_br,
      nestedPayload?.title_pt,
      signal?.title_pt,
      payload.headline_pt,
      payloadData?.headline_pt,
      titleGroup?.pt,
      titleGroup?.pt_br,
      titleGroup?.portuguese,
      payload.title,
      payloadData?.title,
      nestedPayload?.title,
      signal?.title,
      payload.headline,
      payloadData?.headline,
      payload.event_name,
      payload.event_type,
      payload.asset_name,
      payload.ticker,
    );

    const body_en = firstString(
      payload.body_en,
      payload.message_en,
      payload.description_en,
      payload.summary_en,
      payload.content_en,
      payloadData?.body_en,
      payloadData?.message_en,
      payloadData?.description_en,
      nestedPayload?.body_en,
      signal?.body_en,
      bodyGroup?.en,
      messageGroup?.en,
      descriptionGroup?.en,
      contentGroup?.en,
      summaryGroup?.en,
      payload.body,
      payload.message,
      payload.description,
      payload.summary,
      payload.content,
      payloadData?.body,
      payloadData?.message,
      payloadData?.description,
      payloadData?.summary,
      payloadData?.content,
      typeof reasoning === "string" ? reasoning : null,
    );

    const body_es = firstString(
      payload.body_es,
      payload.message_es,
      payload.description_es,
      payload.summary_es,
      payload.content_es,
      payloadData?.body_es,
      payloadData?.message_es,
      payloadData?.description_es,
      nestedPayload?.body_es,
      signal?.body_es,
      bodyGroup?.es,
      messageGroup?.es,
      descriptionGroup?.es,
      contentGroup?.es,
      summaryGroup?.es,
      payload.body,
      payload.message,
      payload.description,
      payload.summary,
      payload.content,
      payloadData?.body,
      payloadData?.message,
      payloadData?.description,
      payloadData?.summary,
      payloadData?.content,
      typeof reasoning === "string" ? reasoning : null,
    );

    const body_pt = firstString(
      payload.body_pt,
      payload.body_pt_br,
      payload.message_pt,
      payload.description_pt,
      payload.summary_pt,
      payload.content_pt,
      payloadData?.body_pt,
      payloadData?.body_pt_br,
      payloadData?.message_pt,
      payloadData?.description_pt,
      nestedPayload?.body_pt,
      signal?.body_pt,
      bodyGroup?.pt,
      bodyGroup?.pt_br,
      messageGroup?.pt,
      descriptionGroup?.pt,
      contentGroup?.pt,
      summaryGroup?.pt,
      payload.body,
      payload.message,
      payload.description,
      payload.summary,
      payload.content,
      payloadData?.body,
      payloadData?.message,
      payloadData?.description,
      payloadData?.summary,
      payloadData?.content,
      typeof reasoning === "string" ? reasoning : null,
    );

    // No required fields — accept any valid JSON payload

    console.log("Signal payload keys:", Object.keys(payload));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const record = {
      event_id: firstString(payload.event_id, payloadData?.event_id, nestedPayload?.event_id, signal?.event_id, payload.id) || crypto.randomUUID(),
      source: firstString(payload.source, payloadData?.source, nestedPayload?.source, signal?.source) || "webhook",
      event_name: firstString(payload.event_name, payloadData?.event_name, nestedPayload?.event_name, signal?.event_name, payload.name, payloadData?.name) || null,
      event_type: firstString(payload.event_type, payloadData?.event_type, nestedPayload?.event_type, signal?.event_type, payload.type, payloadData?.type) || null,
      event_date_utc: firstString(payload.event_date_utc, payloadData?.event_date_utc, nestedPayload?.event_date_utc, signal?.event_date_utc, payload.timestamp, payloadData?.timestamp) || new Date().toISOString(),
      sentiment: firstString(payload.sentiment, payloadData?.sentiment, nestedPayload?.sentiment, signal?.sentiment, payload.signal_sentiment) || null,
      importance_level: firstNumber(payload.importance_level, payloadData?.importance_level, nestedPayload?.importance_level, signal?.importance_level, payload.priority, payloadData?.priority),
      ticker: firstString(payload.ticker, payloadData?.ticker, nestedPayload?.ticker, signal?.ticker, payload.symbol, payloadData?.symbol, payload.asset_symbol) || null,
      asset_name: firstString(payload.asset_name, payloadData?.asset_name, nestedPayload?.asset_name, signal?.asset_name, payload.instrument_name, payloadData?.instrument_name) || null,
      asset_name_short: firstString(payload.asset_name_short, payloadData?.asset_name_short, nestedPayload?.asset_name_short, signal?.asset_name_short, payload.instrument_short_name) || null,
      asset_type: firstString(payload.asset_type, payloadData?.asset_type, nestedPayload?.asset_type, signal?.asset_type, payload.instrument_type) || null,
      currency: firstString(payload.currency, payloadData?.currency, nestedPayload?.currency, signal?.currency) || null,
      asset_trigger_price: firstNumber(payload.asset_trigger_price, payloadData?.asset_trigger_price, nestedPayload?.asset_trigger_price, signal?.asset_trigger_price, payload.trigger_price),
      asset_threshold_price: firstNumber(payload.asset_threshold_price, payloadData?.asset_threshold_price, nestedPayload?.asset_threshold_price, signal?.asset_threshold_price, payload.threshold_price),
      asset_change_percent: firstNumber(payload.asset_change_percent, payloadData?.asset_change_percent, nestedPayload?.asset_change_percent, signal?.asset_change_percent, payload.change_percent),
      title_en,
      title_es,
      title_pt,
      body_en,
      body_es,
      body_pt,
      has_reasoning: firstBoolean(payload.has_reasoning, payloadData?.has_reasoning, nestedPayload?.has_reasoning, signal?.has_reasoning, reasoning),
      reasoning: normalizeReasoning(reasoning),
    };

    // If ticker is missing or "UNKNOWN", try to extract from body text
    if (!record.ticker || record.ticker.toUpperCase() === "UNKNOWN") {
      const extracted = extractTickerFromBody(body_en) || extractTickerFromBody(body_es) || extractTickerFromBody(body_pt);
      if (extracted) record.ticker = extracted;
    }

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
