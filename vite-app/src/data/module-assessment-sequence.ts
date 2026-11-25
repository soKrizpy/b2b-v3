import type { StudentAssessmentQuestion } from "./supabase-module-assessment-repository";

/**
 * Returns only the question that should be visible in the student assessment.
 * Keeping this selection in one place prevents the UI from rendering the full list.
 */
export function getCurrentAssessmentQuestion<T extends StudentAssessmentQuestion>(
  questions: readonly T[],
  currentIndex: number
): T | null {
  if (questions.length === 0) return null;
  const safeIndex = Number.isFinite(currentIndex)
    ? Math.min(Math.max(Math.trunc(currentIndex), 0), questions.length - 1)
    : 0;
  return questions[safeIndex] ?? null;
}
