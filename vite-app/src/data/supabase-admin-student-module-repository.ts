import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";

export interface AdminStudentModuleAssignment {
  id: number;
  studentId: string;
  moduleId: number;
  status: "active" | "paused";
  createdAt: string;
}

async function requireAdmin(client: SupabaseClient) {
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new Error("Sesi Admin Supabase tidak ditemukan.");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") {
    throw new Error("Hanya Admin yang dapat mengelola akses modul siswa.");
  }
  return authData.user.id;
}

function mapAssignment(row: {
  id: number;
  student_id: string;
  module_id: number;
  status: string;
  created_at: string;
}): AdminStudentModuleAssignment {
  return {
    id: Number(row.id),
    studentId: row.student_id,
    moduleId: Number(row.module_id),
    status: row.status === "paused" ? "paused" : "active",
    createdAt: row.created_at
  };
}

export function createSupabaseAdminStudentModuleRepository(
  client: SupabaseClient | null = supabase
) {
  return {
    async listAssignments(): Promise<AdminStudentModuleAssignment[]> {
      if (!client) throw new Error("Koneksi Supabase belum dikonfigurasi.");
      await requireAdmin(client);
      const { data, error } = await client
        .from("student_modules")
        .select("id,student_id,module_id,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error("Penugasan modul siswa gagal dimuat.");
      return ((data ?? []) as Array<{
        id: number;
        student_id: string;
        module_id: number;
        status: string;
        created_at: string;
      }>).map(mapAssignment);
    },

    async assignStudentModule(studentId: string, moduleId: number) {
      if (!client) throw new Error("Koneksi Supabase belum dikonfigurasi.");
      await requireAdmin(client);
      if (!studentId.trim() || !Number.isSafeInteger(moduleId) || moduleId <= 0) {
        throw new Error("Siswa dan modul yang valid wajib dipilih.");
      }
      const { data, error } = await client
        .from("student_modules")
        .upsert(
          { student_id: studentId, module_id: moduleId, status: "active" },
          { onConflict: "student_id,module_id" }
        )
        .select("id,student_id,module_id,status,created_at")
        .single();
      if (error || !data) throw new Error("Akses modul siswa gagal disimpan. Periksa siswa, modul, dan kebijakan Admin.");
      return mapAssignment(data as {
        id: number;
        student_id: string;
        module_id: number;
        status: string;
        created_at: string;
      });
    },

    async setAssignmentStatus(studentId: string, moduleId: number, status: "active" | "paused") {
      if (!client) throw new Error("Koneksi Supabase belum dikonfigurasi.");
      await requireAdmin(client);
      if (!studentId.trim() || !Number.isSafeInteger(moduleId) || moduleId <= 0 ||
          (status !== "active" && status !== "paused")) {
        throw new Error("Perubahan akses modul tidak valid.");
      }
      const { data, error } = await client
        .from("student_modules")
        .update({ status })
        .eq("student_id", studentId)
        .eq("module_id", moduleId)
        .select("id")
        .maybeSingle();
      if (error) throw new Error("Status akses modul gagal diperbarui.");
      return Boolean(data?.id);
    }
  };
}

export const supabaseAdminStudentModuleRepository =
  createSupabaseAdminStudentModuleRepository();
