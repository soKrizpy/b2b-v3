import type { Session as SupabaseSession, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase-client";
import type { AppRole, AuthSession, RepositoryResult, Unsubscribe } from "./domain-contracts";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  created_at: string | null;
};

type StudentRow = {
  grade: string | null;
};

function mapRole(databaseRole: string): AppRole {
  if (databaseRole === "teacher") return "tutor";
  if (databaseRole === "admin" || databaseRole === "student") return databaseRole;
  throw new Error("Peran akun tidak dikenali. Hubungi administrator Bits2Bytes.");
}

async function mapSession(authSession: SupabaseSession): Promise<AuthSession> {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");

  const authUser: SupabaseUser = authSession.user;
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, email, created_at")
    .eq("id", authUser.id)
    .maybeSingle();
  const profile = profileData as ProfileRow | null;

  if (profileError) throw new Error("Profil akun tidak dapat dibaca. Periksa kebijakan akses Supabase.");
  if (!profile) throw new Error("Akun berhasil diautentikasi, tetapi profil Bits2Bytes tidak ditemukan.");

  const role = mapRole(profile.role);
  let gradeLevel: string | null = null;

  if (role === "student") {
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("grade")
      .eq("id", authUser.id)
      .maybeSingle();
    const student = studentData as StudentRow | null;

    if (studentError) throw new Error("Data siswa tidak dapat dibaca. Periksa kebijakan akses Supabase.");
    gradeLevel = student?.grade ?? null;
  }

  const createdAt = profile.created_at ?? authUser.created_at ?? new Date(0).toISOString();

  return {
    user: {
      id: profile.id,
      email: profile.email ?? authUser.email ?? "",
      displayName: profile.full_name?.trim() || authUser.email?.split("@")[0] || "Pengguna Bits2Bytes",
      role,
      // The production profiles table has no status column. A valid Auth session
      // plus a matching profile is treated as active; Auth bans remain enforced by Supabase.
      status: "active",
      gradeLevel,
      createdAt,
      updatedAt: createdAt
    }
  };
}

function failure(code: string, message: string): RepositoryResult<AuthSession> {
  return { success: false, error: { code, message } };
}

export const supabaseAuthRepository = {
  isConfigured: isSupabaseConfigured,

  async getSession(): Promise<AuthSession | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;

    try {
      return await mapSession(data.session);
    } catch (error) {
      console.error("Profil sesi Supabase tidak valid:", error);
      await supabase.auth.signOut({ scope: "local" });
      return null;
    }
  },

  async signIn(credentials: { email: string; password: string }): Promise<RepositoryResult<AuthSession>> {
    if (!supabase) return failure("SUPABASE_NOT_CONFIGURED", "Konfigurasi Supabase belum tersedia.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) return failure(error.code ?? "AUTH_FAILED", "Email atau password tidak sesuai, atau akun belum dapat digunakan.");
    if (!data.session) return failure("AUTH_SESSION_MISSING", "Supabase tidak mengembalikan sesi login.");

    try {
      return { success: true, data: await mapSession(data.session) };
    } catch (profileError) {
      await supabase.auth.signOut({ scope: "local" });
      return failure("PROFILE_RESOLUTION_FAILED", profileError instanceof Error ? profileError.message : "Profil akun tidak dapat diverifikasi.");
    }
  },

  async signInStudent(credentials: { phone: string; mpin: string }): Promise<RepositoryResult<AuthSession>> {
    if (!supabase) return failure("SUPABASE_NOT_CONFIGURED", "Konfigurasi Supabase belum tersedia.");

    const { data, error } = await supabase.functions.invoke("student-mpin-login", {
      body: { phone: credentials.phone, mpin: credentials.mpin }
    });

    if (error || !data?.session?.access_token || !data?.session?.refresh_token) {
      return failure("STUDENT_LOGIN_FAILED", "Nomor WhatsApp atau MPIN tidak sesuai, atau layanan login sedang dibatasi.");
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError || !sessionData.session) {
      return failure("STUDENT_SESSION_FAILED", "Sesi siswa tidak dapat dibuat. Silakan coba lagi.");
    }

    try {
      return { success: true, data: await mapSession(sessionData.session) };
    } catch (profileError) {
      await supabase.auth.signOut({ scope: "local" });
      return failure("PROFILE_RESOLUTION_FAILED", profileError instanceof Error ? profileError.message : "Profil akun tidak dapat diverifikasi.");
    }
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  subscribe(listener: (session: AuthSession | null) => void): Unsubscribe {
    if (!supabase) {
      listener(null);
      return () => undefined;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession) {
        listener(null);
        return;
      }

      // Resolve the profile after the Auth callback releases its internal lock.
      queueMicrotask(() => {
        void mapSession(authSession)
          .then(listener)
          .catch((error: unknown) => {
            console.error("Profil sesi Supabase gagal dimuat:", error);
            listener(null);
          });
      });
    });

    return () => data.subscription.unsubscribe();
  }
};
