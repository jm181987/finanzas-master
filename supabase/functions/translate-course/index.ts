import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function translateText(text: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional Spanish-to-Portuguese (Brazilian Portuguese) translator for financial education content. Translate the given text accurately, maintaining the original tone, formatting (including line breaks, bullet points, numbered lists), and any technical financial terms. Do NOT add any explanation, just return the translated text. If the text contains markdown or HTML formatting, preserve it exactly.",
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI translation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), { status: 400, headers: corsHeaders });
    }

    // 1. Translate course fields
    const { data: course } = await adminClient.from("courses").select("title, short_description, description").eq("id", course_id).single();
    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), { status: 404, headers: corsHeaders });
    }

    console.log("Translating course:", course_id);

    const courseUpdates: Record<string, string> = {};
    if (course.title) courseUpdates.title_pt = await translateText(course.title, lovableApiKey);
    if (course.short_description) courseUpdates.short_description_pt = await translateText(course.short_description, lovableApiKey);
    if (course.description) courseUpdates.description_pt = await translateText(course.description, lovableApiKey);

    await adminClient.from("courses").update(courseUpdates).eq("id", course_id);
    console.log("Course fields translated");

    // 2. Translate modules
    const { data: modules } = await adminClient.from("modules").select("id, title, description").eq("course_id", course_id).order("sort_order");

    for (const mod of modules || []) {
      const modUpdates: Record<string, string> = {};
      if (mod.title) modUpdates.title_pt = await translateText(mod.title, lovableApiKey);
      if (mod.description) modUpdates.description_pt = await translateText(mod.description, lovableApiKey);
      await adminClient.from("modules").update(modUpdates).eq("id", mod.id);
      console.log("Module translated:", mod.id);

      // 3. Translate lessons in this module
      const { data: lessons } = await adminClient.from("lessons").select("id, title, content_text").eq("module_id", mod.id).order("sort_order");

      for (const lesson of lessons || []) {
        const lessonUpdates: Record<string, string> = {};
        if (lesson.title) lessonUpdates.title_pt = await translateText(lesson.title, lovableApiKey);
        if (lesson.content_text) lessonUpdates.content_text_pt = await translateText(lesson.content_text, lovableApiKey);
        await adminClient.from("lessons").update(lessonUpdates).eq("id", lesson.id);
        console.log("Lesson translated:", lesson.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Translation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
