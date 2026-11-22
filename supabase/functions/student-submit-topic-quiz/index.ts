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
      !Array.isArray(payload.answers) || payload.answers.length < 1 || payload.answers.length > 50) {
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

  const { data: enrollment, error: enrollmentError } = await admin
    .from("student_modules")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", topic.module_id)
    .eq("status", "active")
    .maybeSingle();
  if (enrollmentError) return json({ error: "Unable to verify enrollment" }, 500);
  if (!enrollment) return json({ error: "You are not enrolled in this module" }, 403);

  const content = topic.lesson_content && typeof topic.lesson_content === "object"
    ? topic.lesson_content as Record<string, unknown>
    : {};
  const quiz = Array.isArray(content.quiz) ? content.quiz as Array<Record<string, unknown>> : [];
  if (quiz.length === 0 || answers.length !== quiz.length) {
    return json({ error: "Quiz answer count does not match the published quiz" }, 400);
  }

  const seen = new Set<number>();
  let correct = 0;
  const normalizedAnswers: Array<{ question_index: number; selected_index: number }> = [];
  for (const answer of answers) {
    const questionIndex = answer?.questionIndex;
    const selectedIndex = answer?.selectedIndex;
    if (!Number.isSafeInteger(questionIndex) || !Number.isSafeInteger(selectedIndex) ||
        Number(questionIndex) < 0 || Number(questionIndex) >= quiz.length || seen.has(Number(questionIndex))) {
      return json({ error: "Invalid or duplicate question answer" }, 400);
    }
    const question = quiz[Number(questionIndex)];
    const options = Array.isArray(question?.options) ? question.options : [];
    if (!Number.isSafeInteger(selectedIndex) || Number(selectedIndex) < 0 || Number(selectedIndex) >= options.length) {
      return json({ error: "Selected option is invalid" }, 400);
    }
    seen.add(Number(questionIndex));
    if (Number(selectedIndex) === question.answer_index) correct += 1;
    normalizedAnswers.push({
      question_index: Number(questionIndex),
      selected_index: Number(selectedIndex),
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

  const { error: insertError } = await admin.from("topic_quiz_attempts").insert({
    student_id: studentId,
    topic_id: topicId,
    attempt_num: attemptNum,
    score,
    answers: normalizedAnswers,
  });
  if (insertError) {
    if (insertError.code === "23505") return json({ error: "Quiz attempt already submitted. Refresh and try again." }, 409);
    console.error("Quiz attempt insert failed:", insertError.message);
    return json({ error: "Quiz result could not be saved" }, 500);
  }

  return json({ attemptNumber: attemptNum, score, correctCount: correct, totalQuestions: quiz.length });
});
