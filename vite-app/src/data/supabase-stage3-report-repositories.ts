import { supabase } from "./supabase-client";
import type {
  MonthlyEvaluation,
  MonthlyEvaluationRepository,
  SessionReport,
  SessionReportRepository,
  UUID,
  YearMonth,
} from "./domain-contracts";

type Row = Record<string, any>;

async function currentActor() {
  if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sesi tidak valid. Silakan masuk kembali.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (profileError || !profile) throw new Error("Profil akun tidak dapat diverifikasi.");
  return { id: auth.user.id, role: profile.role as string };
}

function mapSessionReport(row: Row): SessionReport {
  return {
    id: row.id,
    studentId: row.student_id,
    tutorId: row.tutor_id,
    sessionId: row.meeting_id == null ? null : String(row.meeting_id),
    sessionDate: row.session_date,
    sessionNumber: row.session_number,
    topic: row.topic,
    moduleName: row.module_name ?? undefined,
    activities: row.activities,
    achievements: row.achievements,
    difficulties: row.difficulties,
    solutions: row.solutions,
    parentRecommendations: row.parent_recommendations,
    competencies: row.competencies ?? {},
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
  };
}

function mapEvaluation(row: Row): MonthlyEvaluation {
  return {
    id: row.id,
    studentId: row.student_id,
    tutorId: row.tutor_id,
    period: row.period as YearMonth,
    rating: row.rating,
    summary: row.summary,
    strengths: row.strengths,
    nextGoals: row.next_goals,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function createSupabaseSessionReportRepository(): SessionReportRepository {
  return {
    async listTutorReports(tutorId: UUID) {
      const actor = await currentActor();
      if (actor.role !== "admin" && (actor.role !== "teacher" || actor.id !== tutorId)) {
        throw new Error("Akses laporan tutor ditolak.");
      }
      const { data, error } = await supabase!
        .from("session_reports")
        .select("*")
        .eq("tutor_id", tutorId)
        .order("session_date", { ascending: false });
      if (error) throw new Error("Laporan sesi gagal dimuat dari Supabase.");
      return (data ?? []).map((row) => mapSessionReport(row as Row));
    },

    async listStudentSubmittedReports(studentId: UUID) {
      const actor = await currentActor();
      if (actor.role !== "admin" && (actor.role !== "student" || actor.id !== studentId)) {
        throw new Error("Akses laporan siswa ditolak.");
      }
      const { data, error } = await supabase!
        .from("session_reports")
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "submitted")
        .order("session_date", { ascending: false });
      if (error) throw new Error("Laporan siswa gagal dimuat dari Supabase.");
      return (data ?? []).map((row) => mapSessionReport(row as Row));
    },

    async getReport(reportId: UUID) {
      const { data, error } = await supabase!
        .from("session_reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      if (error) throw new Error("Laporan sesi gagal dibaca.");
      return data ? mapSessionReport(data as Row) : null;
    },

    async saveReport(input) {
      try {
        const actor = await currentActor();
        if (actor.role !== "admin" && (actor.role !== "teacher" || actor.id !== input.tutorId)) {
          return { success: false, error: { code: "FORBIDDEN", message: "Tutor hanya dapat menyimpan laporan miliknya." } };
        }
        const meetingId = input.sessionId && /^[0-9]+$/.test(input.sessionId) ? Number(input.sessionId) : null;
        if (!meetingId) {
          return { success: false, error: { code: "SESSION_REQUIRED", message: "Laporan harus terhubung ke sesi Supabase yang valid." } };
        }
        const values = {
          student_id: input.studentId,
          tutor_id: input.tutorId,
          meeting_id: meetingId,
          session_date: input.sessionDate,
          session_number: input.sessionNumber,
          topic: input.topic,
          module_name: input.moduleName ?? null,
          activities: input.activities,
          achievements: input.achievements,
          difficulties: input.difficulties,
          solutions: input.solutions,
          parent_recommendations: input.parentRecommendations,
          competencies: input.competencies,
          status: input.status,

        };
        let query;
        if (input.id) {
          if (!input.expectedVersion) {
            return { success: false, error: { code: "VERSION_REQUIRED", message: "Versi laporan diperlukan untuk mencegah perubahan tertimpa." } };
          }
          query = supabase!
            .from("session_reports")
            .update(values)
            .eq("id", input.id)
            .eq("version", input.expectedVersion)
            .select("*")
            .maybeSingle();
        } else {
          query = supabase!
            .from("session_reports")
            .insert(values)
            .select("*")
            .single();
        }
        const { data, error } = await query;
        if (error || !data) {
          return { success: false, error: { code: error?.code ?? "CONFLICT", message: "Laporan tidak tersimpan. Periksa akses sesi atau muat ulang versi terbaru." } };
        }
        return { success: true, data: mapSessionReport(data as Row) };
      } catch (error) {
        return { success: false, error: { code: "REPORT_SAVE_FAILED", message: error instanceof Error ? error.message : "Laporan gagal disimpan." } };
      }
    },

    async deleteDraft(reportId: UUID) {
      const actor = await currentActor();
      if (actor.role !== "admin" && actor.role !== "teacher") {
        return { success: false, error: { code: "FORBIDDEN", message: "Hanya tutor atau admin yang dapat menghapus draft." } };
      }
      const { data, error } = await supabase!
        .from("session_reports")
        .delete()
        .eq("id", reportId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      if (error || !data) return { success: false, error: { code: error?.code ?? "NOT_FOUND", message: "Draft tidak ditemukan atau tidak dapat dihapus." } };
      return { success: true, data: undefined };
    },

    subscribe() {
      return () => undefined;
    },
  };
}

export function createSupabaseMonthlyEvaluationRepository(): MonthlyEvaluationRepository {
  return {
    async listTutorEvaluations(tutorId: UUID) {
      const actor = await currentActor();
      if (actor.role !== "admin" && (actor.role !== "teacher" || actor.id !== tutorId)) {
        throw new Error("Akses evaluasi tutor ditolak.");
      }
      const { data, error } = await supabase!
        .from("monthly_evaluations")
        .select("*")
        .eq("tutor_id", tutorId)
        .order("period", { ascending: false });
      if (error) throw new Error("Evaluasi bulanan gagal dimuat.");
      return (data ?? []).map((row) => mapEvaluation(row as Row));
    },

    async listStudentPublished(studentId: UUID) {
      const actor = await currentActor();
      if (actor.role !== "admin" && (actor.role !== "student" || actor.id !== studentId)) {
        throw new Error("Akses evaluasi siswa ditolak.");
      }
      const { data, error } = await supabase!
        .from("monthly_evaluations")
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "published")
        .order("period", { ascending: false });
      if (error) throw new Error("Evaluasi yang dipublikasikan gagal dimuat.");
      return (data ?? []).map((row) => mapEvaluation(row as Row));
    },

    async saveEvaluation(input) {
      try {
        const actor = await currentActor();
        if (actor.role !== "admin" && (actor.role !== "teacher" || actor.id !== input.tutorId)) {
          return { success: false, error: { code: "FORBIDDEN", message: "Tutor hanya dapat menyimpan evaluasi miliknya." } };
        }
        if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(input.period)) {
          return { success: false, error: { code: "INVALID_PERIOD", message: "Periode evaluasi harus berformat YYYY-MM." } };
        }
        const values = {
          student_id: input.studentId,
          tutor_id: input.tutorId,
          period: input.period,
          rating: input.rating,
          summary: input.summary,
          strengths: input.strengths,
          next_goals: input.nextGoals,
          status: input.status,

        };
        let query;
        if (input.id) {
          if (!input.expectedVersion) return { success: false, error: { code: "VERSION_REQUIRED", message: "Versi evaluasi diperlukan." } };
          query = supabase!
            .from("monthly_evaluations")
            .update({ ...values, version: input.expectedVersion + 1 })
            .eq("id", input.id)
            .eq("version", input.expectedVersion)
            .select("*")
            .maybeSingle();
        } else {
          query = supabase!
            .from("monthly_evaluations")
            .insert({ ...values, version: 1 })
            .select("*")
            .single();
        }
        const { data, error } = await query;
        if (error || !data) return { success: false, error: { code: error?.code ?? "CONFLICT", message: "Evaluasi tidak tersimpan. Periksa penugasan tutor dan versi terbaru." } };
        return { success: true, data: mapEvaluation(data as Row) };
      } catch (error) {
        return { success: false, error: { code: "EVALUATION_SAVE_FAILED", message: error instanceof Error ? error.message : "Evaluasi gagal disimpan." } };
      }
    },

    subscribe() {
      return () => undefined;
    },
  };
}

export const supabaseSessionReportRepository = createSupabaseSessionReportRepository();
export const supabaseMonthlyEvaluationRepository = createSupabaseMonthlyEvaluationRepository();
