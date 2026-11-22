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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const publishableKey = readKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return json({ error: "Server configuration unavailable" }, 500);
  }

  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await publicClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: actor, error: actorError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (actorError || actor?.role !== "admin") return json({ error: "Forbidden" }, 403);

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, role, email, created_at")
    .order("created_at", { ascending: true });

  if (profilesError) return json({ error: "Unable to load accounts" }, 500);

  const studentIds = (profiles ?? [])
    .filter((profile) => profile.role === "student")
    .map((profile) => profile.id);

  const { data: students, error: studentsError } = studentIds.length
    ? await adminClient.from("students").select("id, grade").in("id", studentIds)
    : { data: [], error: null };

  if (studentsError) return json({ error: "Unable to load student details" }, 500);

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const accounts = await Promise.all((profiles ?? []).map(async (profile) => {
    const { data: authResult } = await adminClient.auth.admin.getUserById(profile.id);
    const bannedUntil = authResult?.user?.banned_until ?? null;
    const isBanned = Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now());
    const student = studentsById.get(profile.id);

    return {
      id: profile.id,
      email: profile.email ?? authResult?.user?.email ?? "",
      displayName: profile.full_name?.trim() || "Pengguna Bits2Bytes",
      role: profile.role === "teacher" ? "tutor" : profile.role,
      status: isBanned ? "inactive" : "active",
      avatar: (profile.full_name ?? "U").trim().split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
      gradeLevel: student?.grade ?? undefined,
      createdAt: profile.created_at ?? authResult?.user?.created_at ?? new Date(0).toISOString(),
      updatedAt: profile.created_at ?? authResult?.user?.created_at ?? new Date(0).toISOString(),
    };
  }));

  return json({ accounts, source: "supabase" });
});
