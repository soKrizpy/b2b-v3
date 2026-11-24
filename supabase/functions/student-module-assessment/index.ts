import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readKey(value: string | undefined): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.default === "string" ? parsed.default : "";
  } catch {
    return value;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\\s+/i, "").trim();
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = readKey(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const publishableKey = readKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return json({ error: "Server configuration unavailable" }, 500);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
  const studentId = authData.user.id;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", studentId)
    .maybeSingle();
  if (profileError) return json({ error: "Unable to verify account" }, 500);
  if (profile?.role !== "student") return json({ error: "Forbidden" }, 403);

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 32_768) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const payload = body as {
    action?: unknown;
    assessmentId?: unknown;
    answers?: unknown;
  };
  if (!Number.isSafeInteger(payload?.assessmentId) || Number(payload.assessmentId) <= 0 ||
      (payload.action !== "load" && payload.action !== "submit")) {
    return json({ error: "Invalid assessment request" }, 400);
  }

  const assessmentId = Number(payload.assessmentId);
  const { data: assessment, error: assessmentError } = await admin
    .from("module_assessments")
    .select("id, module_id, title")
    .eq("id", assessmentId)
    .maybeSingle();
  if (assessmentError) return json({ error: "Unable to load assessment" }, 500);
  if (!assessment) return json({ error: "Assessment unavailable" }, 404);

  const { data: moduleRow, error: moduleError } = await admin
    .from("modules")
    .select("is_active")
    .eq("id", assessment.module_id)
    .maybeSingle();
  if (moduleError) return json({ error: "Unable to verify module" }, 500);
  if (!moduleRow?.is_active) return json({ error: "Module unavailable" }, 404);

  const { data: enrollment, error: enrollmentError } = await admin
    .from("student_modules")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", assessment.module_id)
    .eq("status", "active")
    .maybeSingle();
  if (enrollmentError) return json({ error: "Unable to verify enrollment" }, 500);
  if (!enrollment) return json({ error: "You are not enrolled in this module" }, 403);

  const { data: questions, error: questionsError } = await admin
    .from("module_assessment_questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });
  if (questionsError) return json({ error: "Unable to load assessment questions" }, 500);
  if (!questions?.length) return json({ error: "Assessment has no questions" }, 404);

  const { data: priorAttempts, error: attemptsError } = await admin
    .from("module_assessment_attempts")
    .select("attempt_number, score, best_score, submitted_at")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .order("attempt_number", { ascending: true });
  if (attemptsError) return json({ error: "Unable to load assessment history" }, 500);

  if (payload.action === "load") {
    return json({
      assessment: { id: assessment.id, title: assessment.title, moduleId: assessment.module_id },
      questions: questions.map((question) => ({
        id: question.id,
        questionText: question.question_text,
        options: {
          A: question.option_a,
          B: question.option_b,
          C: question.option_c,
          D: question.option_d,
        },
      })),
      attempts: priorAttempts ?? [],
      attemptsRemaining: Math.max(0, 2 - (priorAttempts?.length ?? 0)),
    });
  }

  if (!Array.isArray(payload.answers) || payload.answers.length !== questions.length) {
    return json({ error: "Answer count does not match the assessment" }, 400);
  }
  const answerById = new Map<number, OptionKey>();
  for (const rawAnswer of payload.answers as Array<{ questionId?: unknown; selectedOption?: unknown }>) {
    const questionId = rawAnswer?.questionId;
    const selectedOption = rawAnswer?.selectedOption;
    if (!Number.isSafeInteger(questionId) || !OPTION_KEYS.includes(selectedOption as OptionKey) ||
        answerById.has(Number(questionId))) {
      return json({ error: "Invalid or duplicate answer" }, 400);
    }
    answerById.set(Number(questionId), selectedOption as OptionKey);
  }

  let correctCount = 0;
  const answerSnapshot = [];
  for (const question of questions) {
    const selectedOption = answerById.get(question.id);
    if (!selectedOption) return json({ error: "Every question must be answered" }, 400);
    if (!OPTION_KEYS.includes(question.correct_option as OptionKey)) {
      return json({ error: "Assessment contains an invalid answer key" }, 422);
    }
    const isCorrect = selectedOption === question.correct_option;
    if (isCorrect) correctCount += 1;
    answerSnapshot.push({
      question_id: question.id,
      question_text: question.question_text,
      options: {
        A: question.option_a,
        B: question.option_b,
        C: question.option_c,
        D: question.option_d,
      },
      selected_option: selectedOption,
      correct_option: question.correct_option,
      is_correct: isCorrect,
    });
  }

  const attemptNumber = (priorAttempts?.length ?? 0) + 1;
  if (attemptNumber > 2) return json({ error: "All assessment attempts have been used" }, 409);
  const score = Math.round((correctCount / questions.length) * 100);
  const bestScore = Math.max(score, ...(priorAttempts ?? []).map((attempt) => Number(attempt.best_score ?? attempt.score ?? 0)));

  const { data: savedAttempt, error: saveError } = await admin
    .from("module_assessment_attempts")
    .insert({
      student_id: studentId,
      assessment_id: assessmentId,
      attempt_number: attemptNumber,
      score,
      best_score: bestScore,
      total_questions: questions.length,
      correct_count: correctCount,
      answers: answerSnapshot,
    })
    .select("attempt_number, score, best_score, total_questions, correct_count, submitted_at")
    .single();

  if (saveError) {
    if (saveError.code === "23505") return json({ error: "Assessment attempt already submitted. Refresh and try again." }, 409);
    console.error("Assessment attempt insert failed:", saveError.message);
    return json({ error: "Assessment result could not be saved" }, 500);
  }

  return json({
    result: {
      attemptNumber: savedAttempt.attempt_number,
      score: savedAttempt.score,
      bestScore: savedAttempt.best_score,
      correctCount: savedAttempt.correct_count,
      totalQuestions: savedAttempt.total_questions,
      submittedAt: savedAttempt.submitted_at,
    },
    attemptsRemaining: Math.max(0, 2 - attemptNumber),
  });
});
