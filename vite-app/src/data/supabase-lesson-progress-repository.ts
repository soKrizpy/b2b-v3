import { supabase } from "./supabase-client";

export type StudentLessonProgressState =
  | "not-started"
  | "in-progress"
  | "practice-completed";

export type StudentLessonProgress = {
  id: number;
  studentId: string;
  topicId: number;
  state: StudentLessonProgressState;
  checkpoints: Record<string, boolean>;
  submissionDraft: { link?: string; notes?: string } | null;
  slideIndex: number;
  version: number;
  updatedAt: string;
};

type ProgressRow = {
  id: number;
  student_id: string;
  topic_id: number;
  state: StudentLessonProgressState;
  checkpoints: Record<string, boolean>;
  submission_draft: { link?: string; notes?: string } | null;
  slide_index: number;
  version: number;
  updated_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  return supabase;
}

function mapProgress(row: ProgressRow): StudentLessonProgress {
  return {
    id: row.id,
    studentId: row.student_id,
    topicId: row.topic_id,
    state: row.state,
    checkpoints: row.checkpoints ?? {},
    submissionDraft: row.submission_draft ?? null,
    slideIndex: row.slide_index,
    version: row.version,
    updatedAt: row.updated_at
  };
}

/** Read the current student's progress; RLS restricts the row to auth.uid(). */
export async function getStudentLessonProgress(topicId: number): Promise<StudentLessonProgress | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi siswa tidak valid.");

  const { data, error } = await client
    .from("student_lesson_progress")
    .select("id, student_id, topic_id, state, checkpoints, submission_draft, slide_index, version, updated_at")
    .eq("student_id", userData.user.id)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (error) throw new Error("Progres belajar tidak dapat dimuat.");
  return data ? mapProgress(data as ProgressRow) : null;
}

/** Writes through the SECURITY DEFINER RPC; students receive no direct table write grants. */
export async function saveStudentLessonProgress(input: {
  topicId: number;
  state: StudentLessonProgressState;
  checkpoints: Record<string, boolean>;
  submissionDraft: { link?: string; notes?: string } | null;
  slideIndex: number;
  expectedVersion: number;
}): Promise<StudentLessonProgress> {
  const client = requireClient();
  const { data, error } = await client.rpc("save_student_lesson_progress", {
    p_topic_id: input.topicId,
    p_state: input.state,
    p_checkpoints: input.checkpoints,
    p_submission_draft: input.submissionDraft,
    p_slide_index: input.slideIndex,
    p_expected_version: input.expectedVersion
  });

  if (error || !data) {
    if (error?.code === "40001") {
      throw new Error("Progres berubah di perangkat lain. Muat ulang materi sebelum menyimpan lagi.");
    }
    throw new Error(error?.message || "Progres belajar gagal disimpan.");
  }
  return mapProgress(data as ProgressRow);
}
