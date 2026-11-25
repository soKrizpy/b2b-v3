import { supabase } from "./supabase-client";
import { validateLessonProgressUpdate } from "./lesson-progress-validation";
import { getStudentTopicQuizAttempts, submitStudentTopicQuiz, type TopicQuizAnswer } from "./supabase-quiz-repository";
import {
  getStudentLessonProgress,
  saveStudentLessonProgress,
  type StudentLessonProgress
} from "./supabase-lesson-progress-repository";

type LegacyProgress = {
  state: "not-started" | "in-progress" | "practice-completed";
  checkpoints: Record<string, boolean>;
  submissionDraft: { link: string; notes: string } | null;
  slideIndex: number;
  maxSlideIndex: number;
  topicId: number;
  version: number;
  updatedAt: string;
};

function parseTopicId(lessonKey: string): number {
  const match = /^topic-(\d+)$/.exec(lessonKey);
  const topicId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(topicId) || topicId <= 0) {
    throw new Error("ID topik kurikulum tidak valid.");
  }
  return topicId;
}


type ChallengeSubmissionRow = {
  id: number;
  student_id: string;
  challenge_id: number;
  submission_url: string | null;
  submission_note: string | null;
  status: "pending" | "approved" | "needs_revision";
  review_note: string | null;
  reviewed_by: string | null;
  submitted_at: string;
};

function mapChallengeSubmission(row: ChallengeSubmissionRow) {
  return {
    id: String(row.id),
    studentId: row.student_id,
    projectUrl: row.submission_url ?? "",
    studentNotes: row.submission_note ?? "",
    status: row.status === "pending" ? "submitted" : row.status === "needs_revision" ? "revision-required" : "approved",
    teacherFeedback: row.review_note ?? "",
    submittedAt: row.submitted_at,
    version: 1,
  };
}

function mapLegacyProgress(row: StudentLessonProgress): LegacyProgress {
  return {
    state: row.state,
    checkpoints: row.checkpoints,
    submissionDraft: row.submissionDraft
      ? { link: row.submissionDraft.link ?? "", notes: row.submissionDraft.notes ?? "" }
      : null,
    slideIndex: row.slideIndex,
    maxSlideIndex: row.maxSlideIndex,
    topicId: row.topicId,
    version: row.version,
    updatedAt: row.updatedAt
  };
}

/**
 * Adapter for the existing JavaScript lesson engine.
 * Every write is serialized and uses the server version to prevent lost updates.
 */
export function createSupabaseLegacyLearningBridge() {
  let writeQueue: Promise<unknown> = Promise.resolve();
  let serverVersion = 0;

  return {
    async getTopicStageProgress(studentId: string, lessonKey: string) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user || authData.user.id !== studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }

      const { data, error } = await client.rpc("get_my_topic_stage_progress", {
        p_topic_id: parseTopicId(lessonKey)
      });
      if (error) throw new Error("Status tahapan belajar gagal dimuat.");
      if (!Array.isArray(data)) throw new Error("Respons tahapan belajar dari server tidak valid.");
      return data.map((row: { stage_key?: unknown; status?: unknown; completed_at?: unknown }) => {
        if (
          typeof row.stage_key !== "string"
          || !["brief", "materials", "practice", "check", "challenge", "submission"].includes(row.stage_key)
          || (row.status !== "completed" && row.status !== "skipped")
          || typeof row.completed_at !== "string"
        ) {
          throw new Error("Respons tahapan belajar dari server tidak valid.");
        }
        return { stageKey: row.stage_key, status: row.status };
      });
    },

    completeTopicStage(studentId: string, lessonKey: string, stageKey: string, status = "completed") {
      const operation = writeQueue.then(async () => {
        const client = supabase;
        if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
        const { data: authData, error: authError } = await client.auth.getUser();
        if (!authData.user || authError || authData.user.id !== studentId) {
          throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
        }

        const { data, error } = await client.rpc("complete_student_topic_stage", {
          p_topic_id: parseTopicId(lessonKey),
          p_stage_key: stageKey,
          p_status: status
        });
        if (error || !data) throw new Error(error?.message || "Tahapan belajar gagal disimpan.");
        return data;
      });
      writeQueue = operation.catch(() => undefined);
      return operation;
    },

    async getLessonProgress(studentId: string, lessonKey: string) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user || data.user.id !== studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }
      const row = await getStudentLessonProgress(parseTopicId(lessonKey));
      serverVersion = row?.version ?? 0;
      return row ? mapLegacyProgress(row) : null;
    },

    async getStudentLessonSubmission(studentId: string, lessonKey: string) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user || data.user.id !== studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }
      const { data: rows, error: submissionError } = await client.rpc("get_student_challenge_submission", {
        p_topic_id: parseTopicId(lessonKey)
      });
      if (submissionError) throw new Error("Status pengumpulan proyek gagal dimuat.");
      const row = Array.isArray(rows) ? rows[0] : rows;
      return row ? mapChallengeSubmission(row as ChallengeSubmissionRow) : null;
    },

    saveLessonProgress(studentId: string, lessonKey: string, updates: Record<string, unknown>) {
      const operation = writeQueue.then(async () => {
        const client = supabase;
        if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
        const { data, error } = await client.auth.getUser();
        if (error || !data.user || data.user.id !== studentId) {
          throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
        }

        const validated = validateLessonProgressUpdate({
          state: updates.state,
          checkpoints: updates.checkpoints,
          submissionDraft: updates.submissionDraft,
          slideIndex: updates.slideIndex
        });

        const saved = await saveStudentLessonProgress({
          topicId: parseTopicId(lessonKey),
          ...validated,
          expectedVersion: serverVersion
        });
        serverVersion = saved.version;
        return mapLegacyProgress(saved);
      });

      writeQueue = operation.catch(() => undefined);
      return operation;
    },

    async getTopicQuizAttempts(studentId: string, lessonKey: string) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user || data.user.id !== studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }
      return getStudentTopicQuizAttempts(parseTopicId(lessonKey));
    },

    async submitTopicQuizAttempt(topicId: number, answers: TopicQuizAnswer[]) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw new Error("Sesi siswa tidak valid.");
      return submitStudentTopicQuiz(topicId, answers);
    },

    async saveSubmission(input: {
      studentId: string;
      lessonId: string;
      projectUrl: string;
      studentNotes?: string;
    }) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user || authData.user.id !== input.studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }
      const { data, error } = await client.rpc("submit_student_challenge", {
        p_topic_id: parseTopicId(input.lessonId),
        p_submission_url: input.projectUrl,
        p_submission_note: input.studentNotes ?? null,
      });
      if (error || !data) throw new Error(error?.message || "Pengumpulan proyek gagal disimpan.");
      return mapChallengeSubmission(data as ChallengeSubmissionRow);
    },

    subscribe() {
      return () => undefined;
    }
  };
}
