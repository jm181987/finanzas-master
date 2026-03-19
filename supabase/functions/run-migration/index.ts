import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

    // Use postgres connection directly to run DDL
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
    const sql = postgres(dbUrl, { ssl: "require" });

    // 1. Create table
    await sql`
      CREATE TABLE IF NOT EXISTS public.course_collaborators (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        added_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (course_id, user_id)
      )
    `;
    console.log("Table created");

    // 2. Enable RLS
    await sql`ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY`;
    console.log("RLS enabled");

    // 3. Create helper function
    await sql`
      CREATE OR REPLACE FUNCTION public.is_course_collaborator(_user_id uuid, _course_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
        SELECT EXISTS (
          SELECT 1 FROM public.course_collaborators
          WHERE user_id = _user_id AND course_id = _course_id
        )
      $fn$
    `;
    console.log("Function created");

    // 4. RLS Policies
    const policies = [
      {
        name: "Admins can manage collaborators",
        sql: sql`CREATE POLICY "Admins can manage collaborators" ON public.course_collaborators FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role))`
      },
      {
        name: "Authors can view collaborators",
        sql: sql`CREATE POLICY "Authors can view collaborators" ON public.course_collaborators FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_collaborators.course_id AND courses.author_id = auth.uid()))`
      },
      {
        name: "Authors can add collaborators",
        sql: sql`CREATE POLICY "Authors can add collaborators" ON public.course_collaborators FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_collaborators.course_id AND courses.author_id = auth.uid()))`
      },
      {
        name: "Authors can delete collaborators",
        sql: sql`CREATE POLICY "Authors can delete collaborators" ON public.course_collaborators FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_collaborators.course_id AND courses.author_id = auth.uid()))`
      },
      {
        name: "Collaborators can view own entries",
        sql: sql`CREATE POLICY "Collaborators can view own entries" ON public.course_collaborators FOR SELECT TO authenticated USING (user_id = auth.uid())`
      },
      {
        name: "Collaborators can manage modules",
        sql: sql`CREATE POLICY "Collaborators can manage modules" ON public.modules FOR ALL TO authenticated USING (is_course_collaborator(auth.uid(), course_id)) WITH CHECK (is_course_collaborator(auth.uid(), course_id))`
      },
      {
        name: "Collaborators can manage lessons",
        sql: sql`CREATE POLICY "Collaborators can manage lessons" ON public.lessons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = lessons.module_id AND is_course_collaborator(auth.uid(), m.course_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = lessons.module_id AND is_course_collaborator(auth.uid(), m.course_id)))`
      },
      {
        name: "Collaborators can view collaborated courses",
        sql: sql`CREATE POLICY "Collaborators can view collaborated courses" ON public.courses FOR SELECT TO authenticated USING (is_course_collaborator(auth.uid(), id))`
      },
      {
        name: "Collaborators can update collaborated courses",
        sql: sql`CREATE POLICY "Collaborators can update collaborated courses" ON public.courses FOR UPDATE TO authenticated USING (is_course_collaborator(auth.uid(), id)) WITH CHECK (is_course_collaborator(auth.uid(), id))`
      },
    ];

    for (const p of policies) {
      try {
        await p.sql;
        console.log(`Policy created: ${p.name}`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          console.log(`Policy already exists: ${p.name}`);
        } else {
          console.error(`Policy error (${p.name}):`, e.message);
        }
      }
    }

    await sql.end();

    return new Response(JSON.stringify({ success: true, message: "Migration completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
