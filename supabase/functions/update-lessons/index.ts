import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { updates } = await req.json();
  const results = [];

  for (const u of updates) {
    const { data, error } = await supabase
      .from("lessons")
      .update({ content_text: u.content_text })
      .eq("module_id", u.module_id)
      .eq("sort_order", u.sort_order);
    results.push({ module_id: u.module_id, sort_order: u.sort_order, error: error?.message || null });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
