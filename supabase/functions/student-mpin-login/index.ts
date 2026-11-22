import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response(405, { error: "Metode tidak diizinkan." });

  try {
    const { phone, mpin } = await req.json();
    if (typeof phone !== "string" || typeof mpin !== "string" ||
        !/^[0-9+()\s.-]{10,24}$/.test(phone) || !/^\d{6}$/.test(mpin)) {
      return response(400, { error: "Nomor WhatsApp atau MPIN tidak valid." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
    const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    if (!supabaseUrl || !secretKeysRaw || !publishableKeysRaw) {
      console.error("Supabase function environment is incomplete.");
      return response(503, { error: "Layanan login belum siap. Silakan hubungi administrator." });
    }

    const secretKeys = JSON.parse(secretKeysRaw);
    const publishableKeys = JSON.parse(publishableKeysRaw);
    const serviceKey = secretKeys.default;
    const publishableKey = publishableKeys.default;
    if (!serviceKey || !publishableKey) {
      return response(503, { error: "Layanan login belum siap. Silakan hubungi administrator." });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const publicAuth = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: studentId, error: verifyError } = await admin.rpc("verify_student_mpin", {
      p_phone: phone,
      p_mpin: mpin,
    });

    if (verifyError) {
      console.error("Student MPIN verification failed:", verifyError.message);
      return response(503, { error: "Login siswa sementara tidak tersedia." });
    }
    if (!studentId) {
      return response(401, { error: "Nomor WhatsApp atau MPIN tidak sesuai, atau login sedang dibatasi." });
    }

    const { data: authData, error: userError } = await admin.auth.admin.getUserById(studentId);
    if (userError || !authData.user?.email) {
      console.error("Student Auth identity could not be resolved:", userError?.message);
      return response(403, { error: "Identitas akun siswa belum siap. Hubungi administrator." });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authData.user.email,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error("Student session token could not be generated:", linkError?.message);
      return response(503, { error: "Sesi login tidak dapat dibuat. Silakan coba lagi." });
    }

    const { data: verified, error: sessionError } = await publicAuth.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (sessionError || !verified.session) {
      console.error("Student session exchange failed:", sessionError?.message);
      return response(503, { error: "Sesi login tidak dapat dibuat. Silakan coba lagi." });
    }

    return response(200, { session: verified.session });
  } catch (error) {
    console.error("Student MPIN login error:", error);
    return response(400, { error: "Permintaan login tidak dapat diproses." });
  }
});
