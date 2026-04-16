import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const payload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if webhook is enabled
    const { data: enabledSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "webhook_signal_email_enabled")
      .maybeSingle();

    if (enabledSetting?.value === "false") {
      return new Response(
        JSON.stringify({ error: "Webhook is disabled", disabled: true }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Determine recipients
    let emailRecipients: string[] = [];

    if (Array.isArray(payload.recipients) && payload.recipients.length > 0) {
      emailRecipients = payload.recipients.filter(
        (r: unknown) => typeof r === "string" && r.includes("@"),
      );
    } else {
      const allUsers: string[] = [];
      let page = 1;
      const perPage = 1000;

      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) {
          console.error("listUsers error:", error);
          break;
        }
        for (const u of data.users) {
          if (u.email) allUsers.push(u.email);
        }
        if (data.users.length < perPage) break;
        page++;
      }

      emailRecipients = allUsers;
    }

    if (emailRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailRes = await fetch(
      `${supabaseUrl}/functions/v1/send-signal-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          signal: {
            ticker: payload.ticker || null,
            asset_name: payload.asset_name || null,
            event_name: payload.event_name || null,
            event_type: payload.event_type || null,
            sentiment: payload.sentiment || null,
            importance_level: payload.importance_level || null,
            title_en: payload.title_en || null,
            title_es: payload.title_es || null,
            title_pt: payload.title_pt || null,
            body_en: payload.body_en || null,
            body_es: payload.body_es || null,
            body_pt: payload.body_pt || null,
          },
          recipients: emailRecipients,
        }),
      },
    );

    const emailResult = await emailRes.json();
    console.log("webhook-signal-email result:", JSON.stringify(emailResult));

    return new Response(
      JSON.stringify({
        success: true,
        total_recipients: emailRecipients.length,
        broadcast: !Array.isArray(payload.recipients) ||
          payload.recipients.length === 0,
        results: emailResult.results || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("webhook-signal-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
