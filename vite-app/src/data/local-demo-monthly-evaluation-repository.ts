import type { MonthlyEvaluation, MonthlyEvaluationRepository, RepositoryChangeEvent, RepositoryResult } from "./domain-contracts";

type DemoActor = { id: string; role: "admin" | "tutor" | "student" };
type LegacyEvaluation = {
  id: string; studentId: string; studentName?: string; tutorId: string; tutorName?: string;
  period: `${number}-${string}`; rating: string; summary: string; strengths: string; nextGoals: string;
  status: "draft" | "published"; version?: number; createdAt?: string; updatedAt?: string; publishedAt?: string | null;
};
type LegacySave = { success: true; evaluation: LegacyEvaluation } | { success: false; error: string; message?: string };
type LegacyEvent = { action?: string; evaluationId?: string; timestamp?: string };
export interface LocalDemoMonthlyEvaluationStorePort {
  getAll(): LegacyEvaluation[];
  getTutorEvaluations(tutorId: string): LegacyEvaluation[];
  getStudentPublished(studentId: string): LegacyEvaluation[];
  save(data: Record<string, unknown>, status: "draft" | "published"): LegacySave;
  subscribe(callback: (event: LegacyEvent) => void): () => void;
}
const fail = <T>(code: string, message: string): RepositoryResult<T> => ({ success: false, error: { code, message } });
const ratings = new Set(["Sangat baik", "Baik", "Berkembang sesuai proses", "Membutuhkan pendampingan lebih lanjut"]);
const iso = (value?: string | null): string => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date(0).toISOString();
function toEvaluation(value: LegacyEvaluation): MonthlyEvaluation {
  return {
    id: value.id, studentId: value.studentId, ...(value.studentName ? { studentName: value.studentName } : {}),
    tutorId: value.tutorId, ...(value.tutorName ? { tutorName: value.tutorName } : {}),
    period: value.period as MonthlyEvaluation["period"],
    rating: ratings.has(value.rating) ? value.rating as MonthlyEvaluation["rating"] : null,
    summary: value.summary ?? "", strengths: value.strengths ?? "", nextGoals: value.nextGoals ?? "",
    status: value.status, version: Number.isInteger(value.version) && Number(value.version) > 0 ? Number(value.version) : 1,
    createdAt: iso(value.createdAt), updatedAt: iso(value.updatedAt),
    publishedAt: value.publishedAt ? iso(value.publishedAt) : null
  };
}
function eventTime(value?: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}
export function createLocalDemoMonthlyEvaluationRepository(
  store: LocalDemoMonthlyEvaluationStorePort,
  getActor: () => DemoActor | null
): MonthlyEvaluationRepository {
  return {
    async listTutorEvaluations(tutorId) {
      const current = getActor();
      if (!current || (current.role !== "admin" && (current.role !== "tutor" || current.id !== tutorId))) return [];
      return store.getTutorEvaluations(tutorId).map(toEvaluation);
    },
    async listStudentPublished(studentId) {
      const current = getActor();
      if (!current || (current.role !== "admin" && (current.role !== "student" || current.id !== studentId))) return [];
      return store.getStudentPublished(studentId).map(toEvaluation);
    },
    async saveEvaluation(input) {
      const current = getActor();
      if (!current || current.role !== "tutor") return fail("FORBIDDEN", "Sesi tutor aktif diperlukan untuk menyimpan evaluasi.");
      if (input.tutorId !== current.id) return fail("ACTOR_MISMATCH", "Evaluasi hanya dapat disimpan atas nama tutor yang sedang aktif.");
      if (input.rating !== null && !ratings.has(input.rating)) return fail("INVALID_RATING", "Kategori penilaian tidak valid.");
      const existing = store.getAll().find(item => item.studentId === input.studentId && item.tutorId === current.id && item.period === input.period);
      if (input.id && existing && existing.id !== input.id) return fail("ID_MISMATCH", "ID evaluasi tidak cocok dengan siswa, tutor, dan periode.");
      if (input.id && !existing) return fail("NOT_FOUND", "Evaluasi untuk pembaruan tidak ditemukan.");
      const payload: Record<string, unknown> = {
        ...(input.id ? { id: input.id } : {}), studentId: input.studentId, studentName: input.studentName,
        tutorId: current.id, tutorName: input.tutorName, period: input.period, rating: input.rating ?? "",
        summary: input.summary, strengths: input.strengths, nextGoals: input.nextGoals
      };
      const result = store.save(payload, input.status);
      return result.success ? { success: true, data: toEvaluation(result.evaluation) } : fail(result.error, result.message ?? "Evaluasi gagal disimpan.");
    },
    subscribe(listener) {
      return store.subscribe(event => {
        const change: RepositoryChangeEvent = {
          domain: "evaluations", action: event.action ?? "changed",
          ...(event.evaluationId ? { entityId: event.evaluationId } : {}), occurredAt: eventTime(event.timestamp)
        };
        listener(change);
      });
    }
  };
}
