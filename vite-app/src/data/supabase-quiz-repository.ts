import { supabase } from "./supabase-client";
import {
  mapTopicQuizAttemptResult,
  validateTopicQuizSubmission,
  type TopicQuizAnswer,
  type TopicQuizAttemptResult
} from "./quiz-contract";

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
