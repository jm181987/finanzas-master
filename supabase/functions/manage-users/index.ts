import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const signalsApiKey = Deno.env.get("SIGNALS_API_KEY");
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("Authorization");

    let authorized = false;

    // Option 1: Fixed API key
    if (apiKey && signalsApiKey && apiKey === signalsApiKey) {
      authorized = true;
    }

    // Option 2: Admin/developer session token
    if (!authorized && authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (!userError && user) {
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { data: callerRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (callerRole && ["admin", "developer"].includes(callerRole.role)) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, userId, email, password, fullName, role, bio } = body;

    // LIST ALL EMAILS
    if (action === "list-emails") {
      const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      // Join with profiles and roles
      const userList = [];
      for (const u of users) {
        const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", u.id).single();
        const { data: profile } = await adminClient.from("profiles").select("full_name").eq("id", u.id).single();
        userList.push({
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || "",
          role: roleData?.role || "user",
          created_at: u.created_at,
        });
      }
      return new Response(JSON.stringify({ ok: true, users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET USER (email)
    if (action === "get-user") {
      if (!userId) return new Response(JSON.stringify({ error: "userId requerido" }), { status: 400, headers: corsHeaders });
      const { data: userData, error: getUserErr } = await adminClient.auth.admin.getUserById(userId);
      if (getUserErr) return new Response(JSON.stringify({ error: getUserErr.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true, email: userData.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    if (action === "create") {
      if (!email || !password || !fullName) {
        return new Response(JSON.stringify({ error: "email, password y fullName son requeridos" }), { status: 400, headers: corsHeaders });
      }
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });

      // Update profile (trigger creates it, then we update)
      await adminClient.from("profiles").upsert({ id: newUser.user.id, full_name: fullName, bio: bio || null });

      // Set role
      if (role && role !== "user") {
        await adminClient.from("user_roles").update({ role }).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ ok: true, user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // EDIT USER
    if (action === "edit") {
      if (!userId) return new Response(JSON.stringify({ error: "userId requerido" }), { status: 400, headers: corsHeaders });

      // Update profile
      const profileUpdate: Record<string, any> = {};
      if (fullName !== undefined) profileUpdate.full_name = fullName;
      if (bio !== undefined) profileUpdate.bio = bio;
      if (Object.keys(profileUpdate).length > 0) {
        await adminClient.from("profiles").update(profileUpdate).eq("id", userId);
      }

      // Update email/password if provided
      const authUpdate: Record<string, any> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      if (Object.keys(authUpdate).length > 0) {
        await adminClient.auth.admin.updateUserById(userId, authUpdate);
      }

      // Update role
      if (role) {
        await adminClient.from("user_roles").update({ role }).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
