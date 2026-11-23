import { supabase } from "./supabase-client";

export type TutorPendingSubmission = {
  id: number;
  studentId: string;
  studentName: string;
  studentGrade: string | null;
  topicId: number;
  topicTitle: string;
  challengeTitle: string;
  projectUrl: string;
  studentNotes: string;
  submittedAt: string;
};

async function requireTutor(expectedTutorId: string) {
  if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || auth.user.id !== expectedTutorId) {
    throw new Error("Sesi tutor tidak cocok. Silakan masuk kembali.");
  }
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (error || profile?.role !== "teacher") throw new Error("Fitur review hanya tersedia untuk akun tutor.");
  return auth.user.id;
}

export const supabaseChallengeSubmissionRepository = {
  async listPendingForCurrentTutor(expectedTutorId: string): Promise<TutorPendingSubmission[]> {
    await requireTutor(expectedTutorId);
    const { data, error } = await supabase!.rpc("list_my_tutor_pending_submissions");
    if (error) throw new Error("Daftar proyek yang menunggu review gagal dimuat.");
    return (data ?? []).map((row: {
      submission_id: number;
      student_id: string;
      student_name: string | null;
      student_grade: string | null;
      topic_id: number;
      topic_title: string;
      challenge_title: string;
      submission_url: string | null;
      submission_note: string | null;
      submitted_at: string;
    }) => ({
      id: row.submission_id,
      studentId: row.student_id,
      studentName: row.student_name ?? "Siswa",
      studentGrade: row.student_grade,
      topicId: row.topic_id,
      topicTitle: row.topic_title,
      challengeTitle: row.challenge_title,
      projectUrl: row.submission_url ?? "",
      studentNotes: row.submission_note ?? "",
      submittedAt: row.submitted_at,
    }));
  },

  async reviewSubmission(
    expectedTutorId: string,
    submissionId: number,
    status: "approved" | "needs_revision",
    reviewNote: string
  ) {
    try {
      await requireTutor(expectedTutorId);
      if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
        return { success: false, message: "ID pengumpulan tidak valid." };
      }
      if (status === "needs_revision" && !reviewNote.trim()) {
        return { success: false, message: "Catatan revisi wajib diisi." };
      }
      const { data, error } = await supabase!
        .from("challenge_submissions")
        .update({
          status,
          review_note: reviewNote.trim() || null,
        })
        .eq("id", submissionId)
        .eq("status", "pending")
        .select("id,status,review_note,reviewed_at")
        .maybeSingle();
      if (error || !data) {
        return { success: false, message: "Review gagal disimpan. Pastikan siswa masih ditugaskan kepada tutor ini dan pengumpulan belum direview." };
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Review gagal disimpan." };
    }
  },
};
