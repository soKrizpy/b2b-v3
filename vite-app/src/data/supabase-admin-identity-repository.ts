import { supabase } from "./supabase-client";

type AdminAccount = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "tutor" | "student";
  status: "active" | "inactive";
  avatar?: string;
  gradeLevel?: string;
  createdAt: string;
  updatedAt: string;
};

function unavailableMutation() {
  return {
    error: "READ_ONLY",
    message: "Perubahan akun belum diaktifkan. Data akun dibaca langsung dari Supabase.",
  };
}

/**
 * Read-only production identity adapter for the legacy AdminWorkspace UI.
 * It deliberately never seeds localStorage or writes account data.
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
    // Production schema has no persistent tutor-student assignment table yet.
    return [];
  },

  subscribe(_callback: (event?: unknown) => void) {
    // No production identity realtime channel is configured yet.
    return () => undefined;
  },

  async createUser() {
    return unavailableMutation();
  },
  async updateUser() {
    return unavailableMutation();
  },
  async activateUser() {
    return unavailableMutation();
  },
  async deactivateUser() {
    return unavailableMutation();
  },
  async assignStudentToTutor() {
    return { error: "READ_ONLY", message: "Relasi tutor-siswa belum memiliki penyimpanan produksi." };
  },
  async removeTutorStudentAssignment() {
    return false;
  },
};
