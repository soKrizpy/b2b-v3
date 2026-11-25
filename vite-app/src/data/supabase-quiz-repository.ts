import { supabase } from "./supabase-client";
import {
  mapTopicQuizAttemptResult,
  validateTopicQuizSubmission,
  type TopicQuizAnswer,
  type TopicQuizAttemptResult
} from "./quiz-contract";

export type { TopicQuizAnswer, TopicQuizAttemptResult } from "./quiz-contract";

export type TopicQuizAttemptSummary = {
  attemptNumber: number;
  score: number;
  submittedAt: string;
};

export async function getStudentTopicQuizAttempts(topicId: number): Promise<TopicQuizAttemptSummary[]> {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  if (!Number.isSafeInteger(topicId) || topicId <= 0) throw new Error("ID topik kuis tidak valid.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");

  const { data, error } = await supabase
    .from("topic_quiz_attempts")
    .select("attempt_num, score, submitted_at")
    .eq("student_id", userData.user.id)
    .eq("topic_id", topicId)
    .order("attempt_num", { ascending: true });

  if (error) throw new Error("Riwayat kuis tidak dapat dimuat.");
  return (data ?? []).map((row) => {
    if (!Number.isInteger(row.attempt_num) || row.attempt_num < 1
        || !Number.isInteger(row.score) || row.score < 0 || row.score > 100
        || typeof row.submitted_at !== "string") {
      throw new Error("Data riwayat kuis dari server tidak valid.");
    }
    return {
      attemptNumber: row.attempt_num,
      score: row.score,
      submittedAt: row.submitted_at
    };
  });
}

export async function submitStudentTopicQuiz(
  topicId: number,
  answers: TopicQuizAnswer[]
): Promise<TopicQuizAttemptResult> {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  const submission = validateTopicQuizSubmission(topicId, answers);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");

  const { data, error } = await supabase.functions.invoke("student-submit-topic-quiz", {
    body: submission
  });
  if (error) throw new Error(error.message || "Hasil kuis gagal dikirim.");
  return mapTopicQuizAttemptResult(data);
}
