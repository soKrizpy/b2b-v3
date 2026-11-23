import { supabase } from "./supabase-client";

type AdminAccount = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "tutor" | "student";
  status: "active" | "inactive";
  avatar?: string;
  gradeLevel?: string;
  whatsapp?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Production identity adapter for the legacy AdminWorkspace UI.
 * Auth account mutations are delegated to an admin-authorized Edge Function;
 * tutor assignments are protected by database RLS and validation triggers.
 */
export const supabaseAdminIdentityRepository = {
  async initializeDemo() {
    // Compatibility no-op: production must never initialize local demo data.
  },

  async getAllUsers(): Promise<AdminAccount[]> {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { data, error } = await supabase.functions.invoke("admin-list-users", {
      body: {},
    });
    if (error) throw new Error("Data akun Supabase gagal dimuat. Periksa sesi Admin dan akses Edge Function.");
    if (!Array.isArray(data?.accounts)) throw new Error("Respons daftar akun Supabase tidak valid.");
    return data.accounts as AdminAccount[];
  },

  async getAllAssignments() {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    const { data, error } = await supabase
      .from("tutor_student_assignments")
      .select("id,tutor_id,student_id,status,created_at,ended_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Relasi tutor-siswa gagal dimuat dari Supabase.");
    return (data ?? []).map((row) => ({
      id: row.id,
      tutorId: row.tutor_id,
      studentId: row.student_id,
      status: row.status,
      createdAt: row.created_at,
      endedAt: row.ended_at,
    }));
  },

  subscribe(_callback: (event?: unknown) => void) {
    // No production identity realtime channel is configured yet.
    return () => undefined;
  },

  async createUser(input: {
    displayName: string;
    email: string;
    role: "admin" | "tutor" | "student";
    status: "active" | "inactive";
    gradeLevel?: string;
    whatsapp?: string;
    mpin?: string;
  }) {
    if (!supabase) return { error: "CONFIGURATION", message: "Koneksi Supabase belum dikonfigurasi." };
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "create", ...input },
    });
    if (error || !data?.user) return { error: "CREATE_FAILED", message: data?.error ?? error?.message ?? "Akun gagal dibuat." };
    return { user: data.user as AdminAccount };
  },
  async updateUser(userId: string, changes: {
    displayName?: string;
    email?: string;
    role?: "admin" | "tutor" | "student";
    status?: "active" | "inactive";
    gradeLevel?: string;
    whatsapp?: string;
    mpin?: string;
  }) {
    if (!supabase) return { error: "CONFIGURATION", message: "Koneksi Supabase belum dikonfigurasi." };
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "update", userId, ...changes },
    });
    if (error || !data?.user) return { error: "UPDATE_FAILED", message: data?.error ?? error?.message ?? "Akun gagal diperbarui." };
    return { user: data.user as AdminAccount };
  },
  async setAccountStatus(userId: string, status: "active" | "inactive") {
    if (!supabase) return { error: "CONFIGURATION", message: "Koneksi Supabase belum dikonfigurasi." };
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "status", userId, status },
    });
    if (error || !data?.user) return { error: "STATUS_FAILED", message: data?.error ?? error?.message ?? "Status akun gagal diperbarui." };
    return { user: data.user as AdminAccount };
  },
  async activateUser(userId: string) {
    return this.setAccountStatus(userId, "active");
  },
  async deactivateUser(userId: string) {
    return this.setAccountStatus(userId, "inactive");
  },
  async assignStudentToTutor(tutorId: string, studentId: string) {
    if (!supabase) return { error: "CONFIGURATION", message: "Koneksi Supabase belum dikonfigurasi." };
    if (!tutorId || !studentId) return { error: "VALIDATION_ERROR", message: "Tutor dan siswa wajib dipilih." };
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { error: "UNAUTHENTICATED", message: "Sesi Admin tidak valid." };
    const { data, error } = await supabase
      .from("tutor_student_assignments")
      .insert({ tutor_id: tutorId, student_id: studentId, created_by: authData.user.id })
      .select("id,tutor_id,student_id,status,created_at,ended_at")
      .single();
    if (error) {
      const message = error.code === "23505"
        ? "Siswa sudah memiliki tutor aktif. Lepas penugasan lama terlebih dahulu."
        : "Penugasan gagal disimpan. Pastikan akun tutor dan siswa valid.";
      return { error: error.code || "ASSIGNMENT_FAILED", message };
    }
    return {
      assignment: {
        id: data.id,
        tutorId: data.tutor_id,
        studentId: data.student_id,
        status: data.status,
        createdAt: data.created_at,
        endedAt: data.ended_at,
      }
    };
  },
  async removeTutorStudentAssignment(tutorId: string, studentId: string) {
    if (!supabase || !tutorId || !studentId) return false;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return false;
    const { data, error } = await supabase
      .from("tutor_student_assignments")
      .update({ status: "inactive", ended_at: new Date().toISOString() })
      .eq("tutor_id", tutorId)
      .eq("student_id", studentId)
      .eq("status", "active")
      .select("id");
    return !error && (data?.length ?? 0) > 0;
  },
};
