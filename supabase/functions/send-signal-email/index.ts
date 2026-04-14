import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignalEmailPayload {
  signal: {
    ticker?: string;
    asset_name?: string;
    event_name?: string;
    event_type?: string;
    sentiment?: string;
    importance_level?: number;
    title_en?: string;
    title_es?: string;
    title_pt?: string;
    body_en?: string;
    body_es?: string;
    body_pt?: string;
  };
  recipients: string[];
  client_name?: string;
  client_email?: string;
  group_name?: string;
}

function buildEmailHtml(signal: SignalEmailPayload["signal"]): string {
  const ticker = signal.ticker || "N/A";
  const assetName = signal.asset_name || ticker;
  const eventName = signal.event_name || signal.event_type || "Trading Signal";
  const sentiment = signal.sentiment || "Neutral";
  const importance = signal.importance_level || 0;
  const stars = "★".repeat(Math.min(importance, 5)) + "☆".repeat(Math.max(0, 5 - importance));

  const sentimentColor =
    sentiment.toLowerCase() === "positive" ? "#10b981" :
    sentiment.toLowerCase() === "negative" ? "#ef4444" : "#f59e0b";

  const titleEs = signal.title_es || signal.title_en || eventName;
  const bodyEs = signal.body_es || signal.body_en || "";
  const titlePt = signal.title_pt || signal.title_en || eventName;
  const bodyPt = signal.body_pt || signal.body_en || "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;">📊 FinanzasMaster — Señal de Trading</h1>
  </td></tr>
  <!-- Ticker + Sentiment -->
  <tr><td style="padding:24px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><span style="font-size:28px;font-weight:bold;color:#f8fafc;">${ticker}</span>
        <span style="color:#94a3b8;font-size:14px;margin-left:8px;">${assetName}</span></td>
      <td align="right">
        <span style="background:${sentimentColor};color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:bold;">${sentiment}</span>
      </td>
    </tr>
    </table>
  </td></tr>
  <!-- Event + Importance -->
  <tr><td style="padding:16px 32px 0;">
    <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Evento</p>
    <p style="margin:0;color:#e2e8f0;font-size:16px;font-weight:600;">${eventName}</p>
    ${importance > 0 ? `<p style="margin:8px 0 0;color:#fbbf24;font-size:16px;">${stars}</p>` : ""}
  </td></tr>
  <!-- Spanish -->
  <tr><td style="padding:20px 32px 0;">
    <div style="background:#0f172a;border-radius:8px;padding:16px;border-left:4px solid #0ea5e9;">
      <p style="margin:0 0 4px;color:#0ea5e9;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Español</p>
      <p style="margin:0 0 8px;color:#f8fafc;font-size:16px;font-weight:bold;">${titleEs}</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.5;">${bodyEs}</p>
    </div>
  </td></tr>
  <!-- Portuguese -->
  <tr><td style="padding:12px 32px 0;">
    <div style="background:#0f172a;border-radius:8px;padding:16px;border-left:4px solid #6366f1;">
      <p style="margin:0 0 4px;color:#6366f1;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Português</p>
      <p style="margin:0 0 8px;color:#f8fafc;font-size:16px;font-weight:bold;">${titlePt}</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.5;">${bodyPt}</p>
    </div>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 32px;border-top:1px solid #334155;margin-top:16px;">
    <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
      Enviado por FinanzasMaster<br>
      <a href="http://168.197.49.169:3002/signals" style="color:#0ea5e9;text-decoration:none;">Ver todas las señales →</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SENDGRID_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SignalEmailPayload = await req.json();
    const { signal, recipients } = payload;

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `📊 ${signal.ticker || "Signal"} — ${signal.event_name || signal.event_type || "Trading Signal"} (${signal.sentiment || "Neutral"})`;
    const html = buildEmailHtml(signal);

    const results = [];
    for (const to of recipients) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: "marketing@venturyfx.com", name: "FinanzasMaster Signals" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      const ok = res.status >= 200 && res.status < 300;
      if (!ok) {
        const errText = await res.text();
        console.error(`SendGrid error for ${to}:`, res.status, errText);
        results.push({ email: to, success: false, status: res.status, error: errText });
      } else {
        await res.text(); // consume body
        console.log(`Email sent to ${to}`);
        results.push({ email: to, success: true });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-signal-email error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
