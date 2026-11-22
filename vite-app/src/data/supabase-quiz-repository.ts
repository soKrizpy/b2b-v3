import { supabase } from "./supabase-client";

export type TopicQuizAnswer = {
  questionIndex: number;
  selectedIndex: number;
};

export type TopicQuizAttemptResult = {
  attemptNumber: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
};

export async function submitStudentTopicQuiz(
  topicId: number,
  answers: TopicQuizAnswer[]
): Promise<TopicQuizAttemptResult> {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  if (!Number.isSafeInteger(topicId) || topicId <= 0 || answers.length === 0) {
    throw new Error("Data jawaban kuis tidak valid.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");

  const { data, error } = await supabase.functions.invoke("student-submit-topic-quiz", {
    body: { topicId, answers }
  });
  if (error) throw new Error(error.message || "Hasil kuis gagal dikirim.");
  if (!data || typeof data.score !== "number" || typeof data.attemptNumber !== "number") {
    throw new Error("Respons penyimpanan kuis tidak valid.");
  }
  return data as TopicQuizAttemptResult;
}
