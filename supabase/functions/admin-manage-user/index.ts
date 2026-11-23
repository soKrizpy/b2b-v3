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
    whatsapp: profile.whatsapp ?? undefined,
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
    const whatsapp = String(body.whatsapp ?? "").trim();
    const mpin = String(body.mpin ?? "").trim();
    if (!displayName || displayName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !role ||
        (role === "student" && (!whatsapp || !/^\d{6}$/.test(mpin)))) {
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
      const { error: mpinError } = await adminClient.rpc("admin_set_student_mpin", {
        p_student_id: userId,
        p_phone: whatsapp,
        p_mpin: mpin,
      });
      if (mpinError) {
        await adminClient.from("students").delete().eq("id", userId);
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: "Nomor WhatsApp atau MPIN siswa gagal disimpan; akun undangan dibatalkan" }, 400);
      }
    }

    if (status === "inactive") {
      const { error: banError } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (banError) {
        if (role === "student") await adminClient.from("students").delete().eq("id", userId);
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: "Status nonaktif gagal diterapkan; akun undangan dibatalkan" }, 500);
      }
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
    if (status === "inactive" && profile.role === "admin") {
      if (userId === actor.id) return json({ error: "Admin tidak dapat menonaktifkan akunnya sendiri" }, 409);
      const { data: admins, error: adminsError } = await adminClient
        .from("profiles").select("id").eq("role", "admin");
      if (adminsError) return json({ error: "Daftar admin aktif tidak dapat diverifikasi" }, 500);
      let activeAdminCount = 0;
      for (const admin of admins ?? []) {
        const { data: adminAuth } = await adminClient.auth.admin.getUserById(admin.id);
        const bannedUntil = adminAuth.user?.banned_until;
        if (!bannedUntil || new Date(bannedUntil).getTime() <= Date.now()) activeAdminCount += 1;
      }
      if (activeAdminCount <= 1) return json({ error: "Admin aktif terakhir tidak dapat dinonaktifkan" }, 409);
    }
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
    const whatsappInput = body.whatsapp == null ? null : String(body.whatsapp).trim();
    const mpin = String(body.mpin ?? "").trim();
    if (!displayName || displayName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Nama atau email tidak valid" }, 400);
    }
    if (currentRole === "student" &&
        ((whatsappInput !== null && !/^[0-9+()\s.-]{10,24}$/.test(whatsappInput)) ||
         (mpin && !/^\d{6}$/.test(mpin)))) {
      return json({ error: "Nomor WhatsApp atau MPIN siswa tidak valid" }, 400);
    }

    // Complete all reads/validation before the first mutation. Never include MPIN
    // hashes or submitted MPIN values in logs, responses, or compensation data.
    const { data: authBeforeData, error: authBeforeError } = await adminClient.auth.admin.getUserById(userId);
    const authBefore = authBeforeData?.user;
    if (authBeforeError || !authBefore) return json({ error: "Identitas Auth akun tidak dapat diverifikasi" }, 500);

    let studentBefore: { full_name: string | null; grade: string | null; whatsapp: string | null; email_or_phone: string | null } | null = null;
    if (currentRole === "student") {
      const { data, error } = await adminClient
        .from("students")
        .select("full_name,grade,whatsapp,email_or_phone")
        .eq("id", userId)
        .maybeSingle();
      if (error || !data) return json({ error: "Profil siswa tidak dapat dibaca; tidak ada perubahan yang dilakukan" }, 500);
      studentBefore = data;
      if (whatsappInput !== null && !whatsappInput) return json({ error: "Nomor WhatsApp siswa wajib diisi" }, 400);
    }

    const requestedStatus = body.status === "inactive" ? "inactive" : body.status === "active" ? "active" : null;
    const authUpdates: Record<string, unknown> = {
      email,
      user_metadata: { ...(authBefore.user_metadata ?? {}), full_name: displayName },
    };
    if (email !== (authBefore.email ?? profile.email)) authUpdates.email_confirm = false;
    if (requestedStatus) authUpdates.ban_duration = requestedStatus === "inactive" ? "876000h" : "none";

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authUpdates);
    if (authUpdateError) return json({ error: "Data Auth gagal diperbarui; data profil belum diubah" }, 400);

    let profileChanged = false;
    let studentChanged = false;
    let failureMessage: string | null = null;

    const { error: profileWriteError } = await adminClient
      .from("profiles")
      .update({ full_name: displayName, email })
      .eq("id", userId)
      .select("id")
      .single();
    if (profileWriteError) {
      failureMessage = "Profil akun gagal diperbarui";
    } else {
      profileChanged = true;
    }

    if (!failureMessage && currentRole === "student" && studentBefore) {
      const { error } = await adminClient
        .from("students")
        .update({ full_name: displayName, grade: grade || null })
        .eq("id", userId)
        .select("id")
        .single();
      if (error) {
        failureMessage = "Profil siswa gagal diperbarui";
      } else {
        studentChanged = true;
      }
    }

    // This RPC is transactional for WhatsApp + MPIN. It is deliberately last:
    // if it fails, its own changes roll back and the earlier writes can be compensated.
    if (!failureMessage && currentRole === "student" && studentBefore &&
        (whatsappInput !== null || mpin)) {
      const { error } = await adminClient.rpc("admin_set_student_mpin", {
        p_student_id: userId,
        p_phone: whatsappInput ?? studentBefore.whatsapp ?? studentBefore.email_or_phone ?? "",
        p_mpin: mpin || null,
      });
      if (error) failureMessage = "Nomor WhatsApp atau MPIN gagal diperbarui";
    }

    if (failureMessage) {
      let compensationFailed = false;

      if (studentChanged && studentBefore) {
        const { error } = await adminClient.from("students")
          .update({
            full_name: studentBefore.full_name,
            grade: studentBefore.grade,
            whatsapp: studentBefore.whatsapp,
          })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) compensationFailed = true;
      }

      if (profileChanged) {
        const { error } = await adminClient.from("profiles")
          .update({ full_name: profile.full_name, email: profile.email })
          .eq("id", userId)
          .select("id")
          .single();
        if (error) compensationFailed = true;
      }

      const authRollback: Record<string, unknown> = {
        email: authBefore.email,
        user_metadata: authBefore.user_metadata ?? {},
        ban_duration: authBefore.banned_until && Date.parse(authBefore.banned_until) > Date.now()
          ? "876000h"
          : "none",
      };
      const { error: authRollbackError } = await adminClient.auth.admin.updateUserById(userId, authRollback);
      if (authRollbackError) compensationFailed = true;

      if (compensationFailed) {
        console.error("Admin identity update compensation requires repair", {
          userId,
          profileChanged,
          studentChanged,
          authRollbackFailed: Boolean(authRollbackError),
        });
        return json({
          error: "Perubahan akun tidak selesai dan pemulihan otomatis tidak dapat dipastikan. Admin perlu memeriksa akun ini sebelum mengulang perubahan.",
          code: "IDENTITY_UPDATE_REPAIR_REQUIRED",
        }, 502);
      }

      return json({
        error: `${failureMessage}; perubahan sebelumnya berhasil dipulihkan`,
        code: "IDENTITY_UPDATE_ROLLED_BACK",
      }, 500);
    }

    const { data: updated, error: updatedReadError } = await adminClient
      .from("profiles").select("id,full_name,email,role,created_at").eq("id", userId).single();
    if (updatedReadError || !updated) {
      // The writes have completed; a read failure must not be misreported as a
      // rolled-back mutation. Return an explicit reconciliation response.
      return json({
        error: "Perubahan akun tersimpan, tetapi data hasil tidak dapat dibaca. Muat ulang daftar akun sebelum melakukan perubahan berikutnya.",
        code: "IDENTITY_UPDATE_SAVED_REFRESH_REQUIRED",
      }, 200);
    }

    const status = requestedStatus ?? (
      authBefore.banned_until && Date.parse(authBefore.banned_until) > Date.now() ? "inactive" : "active"
    );
    return json({
      user: accountView({
        ...updated,
        grade: currentRole === "student" ? (grade || null) : undefined,
        whatsapp: currentRole === "student" ? (whatsappInput ?? studentBefore?.whatsapp) : undefined,
      }, status),
      source: "supabase",
    });
  }

  return json({ error: "Unsupported action" }, 400);
});
