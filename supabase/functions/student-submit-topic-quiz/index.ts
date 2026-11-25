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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
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
    if (raw.length > 16_384) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const payload = body as { topicId?: unknown; answers?: unknown };
  if (!Number.isSafeInteger(payload?.topicId) || Number(payload.topicId) <= 0 ||
      !Array.isArray(payload.answers) || payload.answers.length !== 5) {
    return json({ error: "Invalid quiz submission" }, 400);
  }

  const topicId = Number(payload.topicId);
  const answers = payload.answers as Array<{ questionIndex?: unknown; selectedIndex?: unknown }>;
  const { data: topic, error: topicError } = await admin
    .from("topics")
    .select("id, module_id, status, lesson_content")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError) return json({ error: "Unable to load quiz" }, 500);
  if (!topic || topic.status !== "published") return json({ error: "Quiz unavailable" }, 404);

  const { data: moduleRow, error: moduleError } = await admin
    .from("modules")
    .select("is_active")
    .eq("id", topic.module_id)
    .maybeSingle();
  if (moduleError) return json({ error: "Unable to verify module" }, 500);
  if (!moduleRow || moduleRow.is_active !== true) return json({ error: "Module unavailable" }, 404);

  const { data: enrollment, error: enrollmentError } = await admin
    .from("student_modules")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", topic.module_id)
    .eq("status", "active")
    .maybeSingle();
  if (enrollmentError) return json({ error: "Unable to verify enrollment" }, 500);
  if (!enrollment) return json({ error: "You are not enrolled in this module" }, 403);

  const { data: released, error: releaseError } = await admin.rpc("student_topic_is_released", {
    p_student_id: studentId,
    p_topic_id: topicId
  });
  if (releaseError) {
    console.error("Topic schedule access check failed:", releaseError.message);
    return json({ error: "Unable to verify Topic schedule access" }, 500);
  }
  if (released !== true) return json({ error: "This Topic is not released by the class schedule" }, 403);

  const { data: stageRows, error: stageError } = await admin
    .from("student_topic_stage_progress")
    .select("stage_key, status")
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .in("stage_key", ["brief", "materials", "practice"])
    .eq("status", "completed");
  if (stageError) return json({ error: "Unable to verify learning stage progress" }, 500);
  const completedStages = new Set((stageRows ?? []).map((row) => row.stage_key));
  if (!["brief", "materials", "practice"].every((stage) => completedStages.has(stage))) {
    return json({ error: "Complete Brief, Materials, and Practice before submitting the Topic Check" }, 403);
  }

  const content = topic.lesson_content && typeof topic.lesson_content === "object"
    ? topic.lesson_content as Record<string, unknown>
    : {};
  const quiz = Array.isArray(content.quiz) ? content.quiz as Array<Record<string, unknown>> : [];
  if (quiz.length !== 5 || answers.length !== quiz.length) {
    return json({ error: "Quiz answer count does not match the published quiz" }, 400);
  }

  const quizVersionValue = content.quizVersion;
  const quizVersion = Number.isSafeInteger(quizVersionValue) && Number(quizVersionValue) > 0
    ? Number(quizVersionValue)
    : 1;
  const seen = new Set<number>();
  let correct = 0;
  const normalizedAnswers: Array<{ question_index: number; selected_index: number }> = [];
  const quizSnapshot: Array<{
    question_index: number;
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }> = [];
  for (const answer of answers) {
    const questionIndex = answer?.questionIndex;
    const selectedIndex = answer?.selectedIndex;
    if (!Number.isSafeInteger(questionIndex) || !Number.isSafeInteger(selectedIndex) ||
        Number(questionIndex) < 0 || Number(questionIndex) >= quiz.length || seen.has(Number(questionIndex))) {
      return json({ error: "Invalid or duplicate question answer" }, 400);
    }
    const question = quiz[Number(questionIndex)];
    const options = Array.isArray(question?.options) ? question.options : [];
    const answerIndex = Number(question?.answer_index);
    if (typeof question?.question !== "string" || !question.question.trim() ||
      options.length !== 4 ||
        !options.every((option) => typeof option === "string" && option.trim().length > 0) ||
        !Number.isSafeInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
      return json({ error: "Published quiz contains an invalid question or answer key" }, 422);
    }
    if (!Number.isSafeInteger(selectedIndex) || Number(selectedIndex) < 0 || Number(selectedIndex) >= options.length) {
      return json({ error: "Selected option is invalid" }, 400);
    }
    seen.add(Number(questionIndex));
    if (Number(selectedIndex) === answerIndex) correct += 1;
    normalizedAnswers.push({
      question_index: Number(questionIndex),
      selected_index: Number(selectedIndex),
    });
    quizSnapshot.push({
      question_index: Number(questionIndex),
      question: question.question,
      options: options as string[],
      correct_index: answerIndex,
      explanation: typeof question.explanation === "string" ? question.explanation : "",
    });
  }

  const score = Math.round((correct / quiz.length) * 100);
  const { data: priorAttempts, error: attemptsError } = await admin
    .from("topic_quiz_attempts")
    .select("attempt_num")
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .order("attempt_num", { ascending: true });
  if (attemptsError) return json({ error: "Unable to load previous attempts" }, 500);

  const attemptNum = (priorAttempts?.length ?? 0) + 1;
  if (attemptNum > 2) return json({ error: "All quiz attempts have been used" }, 409);

  const { data: savedAttemptId, error: insertError } = await admin.rpc(
    "save_topic_quiz_attempt_with_snapshot",
    {
      p_student_id: studentId,
      p_topic_id: topicId,
      p_attempt_num: attemptNum,
      p_score: score,
      p_answers: normalizedAnswers,
      p_quiz_version: quizVersion,
      p_quiz_snapshot: quizSnapshot,
    },
  );
  if (insertError) {
    if (["23505", "55000", "40001"].includes(insertError.code ?? "")) {
      return json({ error: insertError.message || "Quiz attempt already submitted. Refresh and try again." }, 409);
    }
    console.error("Quiz attempt insert failed:", insertError.message);
    return json({ error: "Quiz result could not be saved" }, 500);
  }
  if (!Number.isSafeInteger(savedAttemptId) || Number(savedAttemptId) <= 0) {
    console.error("Quiz attempt transaction returned an invalid attempt ID.");
    return json({ error: "Quiz result could not be confirmed" }, 500);
  }

  return json({ attemptNumber: attemptNum, score, correctCount: correct, totalQuestions: quiz.length });
});
