import { supabase } from "./supabase-client";
import {
  mapStudentLessonProgressRow,
  resolveStudentLessonProgressRpc,
  type StudentLessonProgress,
  type StudentLessonProgressState
} from "./lesson-progress-rpc-contract";

export type { StudentLessonProgress, StudentLessonProgressState } from "./lesson-progress-rpc-contract";

function requireClient() {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  return supabase;
}

/** Read the current student's progress; RLS restricts the row to auth.uid(). */
export async function getStudentLessonProgress(topicId: number): Promise<StudentLessonProgress | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi siswa tidak valid.");

  const { data, error } = await client
    .from("student_lesson_progress")
    .select("id, student_id, topic_id, state, checkpoints, submission_draft, slide_index, max_slide_index, version, updated_at")
    .eq("student_id", userData.user.id)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (error) throw new Error("Progres belajar tidak dapat dimuat.");
  return data ? mapStudentLessonProgressRow(data) : null;
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

  return resolveStudentLessonProgressRpc(data, error);
}
