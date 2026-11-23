import { supabase } from "./supabase-client";
import { validateLessonProgressUpdate } from "./lesson-progress-validation";
import { submitStudentTopicQuiz, type TopicQuizAnswer } from "./supabase-quiz-repository";
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

function mapLegacyProgress(row: StudentLessonProgress): LegacyProgress {
  return {
    state: row.state,
    checkpoints: row.checkpoints,
    submissionDraft: row.submissionDraft
      ? { link: row.submissionDraft.link ?? "", notes: row.submissionDraft.notes ?? "" }
      : null,
    slideIndex: row.slideIndex,
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

    async getStudentLessonSubmission(studentId: string) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user || data.user.id !== studentId) {
        throw new Error("Identitas siswa tidak cocok dengan sesi aktif.");
      }
      // Submission persistence is deliberately disabled until the secure
      // teacher-review write path is implemented against challenge_submissions.
      return null;
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

    async submitTopicQuizAttempt(topicId: number, answers: TopicQuizAnswer[]) {
      const client = supabase;
      if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw new Error("Sesi siswa tidak valid.");
      return submitStudentTopicQuiz(topicId, answers);
    },

    async saveSubmission() {
      throw new Error("Pengumpulan proyek belum diaktifkan. Jalur review guru di Supabase harus diselesaikan terlebih dahulu.");
    },

    subscribe() {
      return () => undefined;
    }
  };
}
