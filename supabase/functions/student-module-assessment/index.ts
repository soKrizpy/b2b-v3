import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { corsHeaders as supabaseCorsHeaders } from "npm:@supabase/supabase-js@2.119.0/cors";

const corsHeaders = {
  ...supabaseCorsHeaders,
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

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
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
    moduleId?: unknown;
    answers?: unknown;
  };
  if (!Number.isSafeInteger(payload?.moduleId) || Number(payload.moduleId) <= 0 ||
      (payload.action !== "load" && payload.action !== "submit")) {
    return json({ error: "Invalid assessment request" }, 400);
  }

  const moduleId = Number(payload.moduleId);

  const { data: moduleRow, error: moduleError } = await admin
    .from("modules")
    .select("is_active")
    .eq("id", moduleId)
    .maybeSingle();
  if (moduleError) return json({ error: "Unable to verify module" }, 500);
  if (!moduleRow?.is_active) return json({ error: "Module unavailable" }, 404);

  const { data: enrollment, error: enrollmentError } = await admin
    .from("student_modules")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .eq("status", "active")
    .maybeSingle();
  if (enrollmentError) return json({ error: "Unable to verify enrollment" }, 500);
  if (!enrollment) return json({ error: "You are not enrolled in this module" }, 403);

  const { data: completion, error: completionError } = await admin.rpc("student_module_topic_completion", {
    p_student_id: studentId,
    p_module_id: moduleId
  });
  if (completionError) {
    console.error("Module topic completion check failed:", completionError.message);
    return json({ error: "Unable to verify Topic completion" }, 500);
  }
  const completionRow = Array.isArray(completion) ? completion[0] : completion;
  if (completionRow?.total_topics !== 16) {
    return json({ error: "Final Boss requires exactly 16 published Topics in this module" }, 409);
  }
  if (completionRow.completed_topics !== 16) {
    return json({ error: "Complete all 16 Topics before starting the Final Boss" }, 403);
  }

  const { data: assessments, error: assessmentError } = await admin
    .from("module_assessments")
    .select("id, module_id, title")
    .eq("module_id", moduleId);
  if (assessmentError) return json({ error: "Unable to load module assessment" }, 500);
  if (!assessments?.length) return json({ error: "No Final Boss is configured for this module" }, 404);
  if (assessments.length !== 1) {
    return json({ error: "This module has an ambiguous Final Boss configuration" }, 409);
  }
  const assessment = assessments[0];
  const assessmentId = assessment.id;

  const { data: questions, error: questionsError } = await admin
    .from("module_assessment_questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, order_index")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });
  if (questionsError) return json({ error: "Unable to load assessment questions" }, 500);
  if (questions?.length !== 20) {
    return json({ error: "Final Boss must contain exactly 20 questions" }, 409);
  }
  if (questions.some((question) =>
    !question.question_text?.trim()
    || !question.option_a?.trim()
    || !question.option_b?.trim()
    || !question.option_c?.trim()
    || !question.option_d?.trim()
    || !OPTION_KEYS.includes(question.correct_option as OptionKey)
  )) {
    return json({ error: "Final Boss contains an invalid question or answer key" }, 422);
  }

  const { data: priorAttempts, error: attemptsError } = await admin
    .from("module_assessment_attempts")
    .select("attempt_number, score, best_score, submitted_at")
    .eq("student_id", studentId)
    .eq("assessment_id", assessmentId)
    .order("attempt_number", { ascending: true });
  if (attemptsError) return json({ error: "Unable to load assessment history" }, 500);

  const { data: certificate, error: certificateError } = await admin
    .from("certificates")
    .select("student_id, module_id, score, tier, certificate_number, issued_at, verification_token")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (certificateError) return json({ error: "Unable to load certificate" }, 500);

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
      attemptsRemaining: Math.max(0, 1 - (priorAttempts?.length ?? 0)),
      certificate: certificate ? {
        studentId: certificate.student_id,
        moduleId: certificate.module_id,
        score: certificate.score,
        tier: certificate.tier,
        certificateNumber: certificate.certificate_number,
        issuedAt: certificate.issued_at,
        verificationToken: certificate.verification_token,
      } : null,
    });
  }

  if (!Array.isArray(payload.answers) || payload.answers.length > questions.length) {
    return json({ error: "Answer count exceeds the assessment question count" }, 400);
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
    if (!OPTION_KEYS.includes(question.correct_option as OptionKey)) {
      return json({ error: "Assessment contains an invalid answer key" }, 422);
    }
    // Omitted answers are intentionally retained in the immutable snapshot and
    // scored as incorrect. A client must never be able to turn an unanswered
    // question into a validation error that preserves the only Final Boss try.
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
      selected_option: selectedOption ?? null,
      correct_option: question.correct_option,
      is_correct: isCorrect,
    });
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const { data: savedAttempts, error: saveError } = await admin.rpc("record_student_module_assessment_attempt", {
    p_student_id: studentId,
    p_assessment_id: assessmentId,
    p_score: score,
    p_correct_count: correctCount,
    p_total_questions: questions.length,
    p_answers: answerSnapshot
  });

  if (saveError) {
    if (saveError.code === "55000" || saveError.code === "23505") {
      return json({ error: saveError.message || "Assessment attempt cannot be submitted" }, 409);
    }
    if (saveError.code === "42501") return json({ error: saveError.message }, 403);
    if (saveError.code === "22023") return json({ error: saveError.message }, 422);
    console.error("Assessment attempt insert failed:", saveError.message);
    return json({ error: "Assessment result could not be saved" }, 500);
  }

  const savedAttempt = Array.isArray(savedAttempts) ? savedAttempts[0] : savedAttempts;
  if (!savedAttempt) {
    console.error("Assessment attempt RPC returned no saved row");
    return json({ error: "Assessment result could not be confirmed" }, 500);
  }

  const { data: issuedCertificate, error: issuedCertificateError } = await admin
    .from("certificates")
    .select("student_id, module_id, score, tier, certificate_number, issued_at, verification_token")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (issuedCertificateError || !issuedCertificate) {
    console.error("Certificate read after assessment failed:", issuedCertificateError?.message);
    return json({ error: "Assessment was saved but its certificate could not be confirmed" }, 500);
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
    attemptsRemaining: Math.max(0, 1 - savedAttempt.attempt_number),
    certificate: {
      studentId: issuedCertificate.student_id,
      moduleId: issuedCertificate.module_id,
      score: issuedCertificate.score,
      tier: issuedCertificate.tier,
      certificateNumber: issuedCertificate.certificate_number,
      issuedAt: issuedCertificate.issued_at,
      verificationToken: issuedCertificate.verification_token,
    },
  });
});
