import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readKey(value: string | undefined): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return value;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRole(value: unknown): "admin" | "teacher" | "student" | null {
  if (value === "tutor" || value === "teacher") return "teacher";
  if (value === "admin" || value === "student") return value;
  return null;
}

function accountView(profile: Record<string, unknown>, status: "active" | "inactive") {
  const fullName = String(profile.full_name ?? "Pengguna Bits2Bytes").trim();
  const dbRole = String(profile.role ?? "student");
  return {
    id: profile.id,
    email: profile.email ?? "",
    displayName: fullName || "Pengguna Bits2Bytes",
    role: dbRole === "teacher" ? "tutor" : dbRole,
    status,
    avatar: fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    gradeLevel: profile.grade ?? undefined,
    createdAt: profile.created_at ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const publishableKey = readKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (!supabaseUrl || !secretKey || !publishableKey) return json({ error: "Server configuration unavailable" }, 500);

  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await publicClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: actor, error: actorError } = await adminClient
    .from("profiles").select("id,role").eq("id", authData.user.id).maybeSingle();
  if (actorError || actor?.role !== "admin") return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const action = body.action;
  if (action === "create") {
    const displayName = String(body.displayName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = normalizeRole(body.role);
    const status = body.status === "inactive" ? "inactive" : "active";
    const grade = String(body.gradeLevel ?? "").trim();
    if (!displayName || displayName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role) {
      return json({ error: "Nama, email, atau role tidak valid" }, 400);
    }

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: displayName },
    });
    if (inviteError || !invited.user) {
      return json({ error: inviteError?.message ?? "Undangan akun gagal dibuat" }, 400);
    }

    const userId = invited.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({ id: userId, full_name: displayName, email, role }, { onConflict: "id" })
      .select("id,full_name,email,role,created_at")
      .single();

    if (profileError || !profile) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: "Profil akun gagal dibuat; akun undangan dibatalkan" }, 500);
    }

    if (role === "student") {
      const { error: studentError } = await adminClient
        .from("students")
        .upsert({ id: userId, full_name: displayName, grade: grade || null }, { onConflict: "id" });
      if (studentError) {
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: "Profil siswa gagal dibuat; akun undangan dibatalkan" }, 500);
      }
    }

    if (status === "inactive") {
      const { error: banError } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (banError) return json({ error: "Akun dibuat tetapi status nonaktif gagal diterapkan" }, 500);
    }
    return json({ user: accountView({ ...profile, grade }, status), source: "supabase" }, 201);
  }

  const userId = String(body.userId ?? "").trim();
  if (!userId) return json({ error: "userId wajib diisi" }, 400);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles").select("id,full_name,email,role,created_at").eq("id", userId).maybeSingle();
  if (profileError || !profile) return json({ error: "Akun tidak ditemukan" }, 404);

  if (action === "status") {
    const status = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : null;
    if (!status) return json({ error: "Status akun tidak valid" }, 400);
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: status === "inactive" ? "876000h" : "none",
    });
    if (error) return json({ error: "Status akun gagal diperbarui" }, 500);
    return json({ user: accountView(profile, status), source: "supabase" });
  }

  if (action === "update") {
    const requestedRole = body.role == null ? profile.role : normalizeRole(body.role);
    const currentRole = profile.role;
    if (!requestedRole || requestedRole !== currentRole) {
      return json({ error: "Perubahan role ditolak. Buat akun baru dengan role yang benar agar relasi dan histori tetap konsisten." }, 409);
    }
    const displayName = String(body.displayName ?? profile.full_name ?? "").trim();
    const email = String(body.email ?? profile.email ?? "").trim().toLowerCase();
    const grade = String(body.gradeLevel ?? "").trim();
    if (!displayName || displayName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Nama atau email tidak valid" }, 400);
    }

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      email,
      email_confirm: email === profile.email ? undefined : false,
      user_metadata: { full_name: displayName },
    });
    if (authUpdateError) return json({ error: "Data Auth gagal diperbarui" }, 400);

    const { data: updated, error: updateError } = await adminClient
      .from("profiles")
      .update({ full_name: displayName, email })
      .eq("id", userId)
      .select("id,full_name,email,role,created_at")
      .single();
    if (updateError || !updated) return json({ error: "Profil akun gagal diperbarui" }, 500);

    if (currentRole === "student") {
      const { error: studentError } = await adminClient
        .from("students").update({ full_name: displayName, grade: grade || null }).eq("id", userId);
      if (studentError) return json({ error: "Profil siswa gagal diperbarui" }, 500);
    }

    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    const bannedUntil = authUser.user?.banned_until ?? null;
    const status = bannedUntil && Date.parse(bannedUntil) > Date.now() ? "inactive" : "active";
    return json({ user: accountView({ ...updated, grade }, status), source: "supabase" });
  }

  return json({ error: "Unsupported action" }, 400);
});
