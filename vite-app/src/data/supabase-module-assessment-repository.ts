import { supabase } from "./supabase-client";

export type AssessmentOptionKey = "A" | "B" | "C" | "D";

export type StudentAssessmentQuestion = {
  id: number;
  questionText: string;
  options: Record<AssessmentOptionKey, string>;
};

export type StudentAssessmentAttempt = {
  attempt_number: number;
  score: number;
  best_score: number;
  submitted_at: string;
};

export type StudentModuleAssessment = {
  assessment: { id: number; title: string; moduleId: number };
  questions: StudentAssessmentQuestion[];
  attempts: StudentAssessmentAttempt[];
  attemptsRemaining: number;
  certificate: StudentCertificate | null;
};

export type StudentCertificate = {
  studentId: string;
  moduleId: number;
  score: number;
  tier: "excellent" | "achievement" | "participant";
  certificateNumber: string;
  issuedAt: string;
  verificationToken: string;
};

export type StudentAssessmentResult = {
  result: {
    attemptNumber: number;
    score: number;
    bestScore: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: string;
  };
  attemptsRemaining: number;
  certificate: StudentCertificate;
};

async function invokeAssessment<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
  }
  const { data, error } = await supabase.functions.invoke("student-module-assessment", { body });
  if (error) {
    const context = error.context;
    if (context && typeof context.json === "function") {
      try {
        const payload = await context.json();
        if (typeof payload?.error === "string") throw new Error(payload.error);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== "Unexpected end of JSON input") throw parseError;
      }
    }
    throw new Error(error.message || "Permintaan ujian gagal diproses.");
  }
  return data as T;
}

export async function loadStudentModuleAssessment(moduleId: number) {
  const assessment = await invokeAssessment<StudentModuleAssessment>({ action: "load", moduleId });
  if (
    !assessment
    || !Number.isSafeInteger(assessment.assessment?.id)
    || assessment.assessment.moduleId !== moduleId
    || !Array.isArray(assessment.questions)
    || assessment.questions.length !== 20
    || new Set(assessment.questions.map((question) => question?.id)).size !== 20
    || assessment.questions.some((question) =>
      !question
      || !Number.isSafeInteger(question.id)
      || typeof question.questionText !== "string"
      || !question.questionText.trim()
      || !question.options
      || !["A", "B", "C", "D"].every((key) => typeof question.options[key as AssessmentOptionKey] === "string" && question.options[key as AssessmentOptionKey].trim())
    )
  ) {
    throw new Error("Final Boss harus memiliki tepat 20 soal valid.");
  }
  return assessment;
}

export function submitStudentModuleAssessment(
  moduleId: number,
  answers: Array<{ questionId: number; selectedOption: AssessmentOptionKey }>
) {
  return invokeAssessment<StudentAssessmentResult>({ action: "submit", moduleId, answers });
}
