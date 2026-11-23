import type { TopicQuizAnswer, TopicQuizAttemptResult } from "./supabase-quiz-repository";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateTopicQuizSubmission(topicId: unknown, answers: unknown): {
  topicId: number;
  answers: TopicQuizAnswer[];
} {
  if (!Number.isSafeInteger(topicId) || Number(topicId) <= 0 || !Array.isArray(answers)
      || answers.length < 1 || answers.length > 50) {
    throw new Error("Data jawaban kuis tidak valid.");
  }

  const seen = new Set<number>();
  const normalized = answers.map((answer) => {
    if (!isRecord(answer)
        || !Number.isSafeInteger(answer.questionIndex)
        || !Number.isSafeInteger(answer.selectedIndex)
        || Number(answer.questionIndex) < 0
        || Number(answer.selectedIndex) < 0
        || seen.has(Number(answer.questionIndex))) {
      throw new Error("Data jawaban kuis tidak valid.");
    }
    seen.add(Number(answer.questionIndex));
    return {
      questionIndex: Number(answer.questionIndex),
      selectedIndex: Number(answer.selectedIndex)
    };
  });

  return { topicId: Number(topicId), answers: normalized };
}

export function mapTopicQuizAttemptResult(value: unknown): TopicQuizAttemptResult {
  if (!isRecord(value)) throw new Error("Respons penyimpanan kuis tidak valid.");

  const { attemptNumber, score, correctCount, totalQuestions } = value;
  const valid = Number.isSafeInteger(attemptNumber) && Number(attemptNumber) >= 1 && Number(attemptNumber) <= 2
    && Number.isSafeInteger(score) && Number(score) >= 0 && Number(score) <= 100
    && Number.isSafeInteger(correctCount) && Number(correctCount) >= 0
    && Number.isSafeInteger(totalQuestions) && Number(totalQuestions) >= 1 && Number(totalQuestions) <= 50
    && Number(correctCount) <= Number(totalQuestions)
    && Number(score) === Math.round((Number(correctCount) / Number(totalQuestions)) * 100);

  if (!valid) throw new Error("Respons penyimpanan kuis tidak valid.");

  return {
    attemptNumber: Number(attemptNumber),
    score: Number(score),
    correctCount: Number(correctCount),
    totalQuestions: Number(totalQuestions)
  };
}
