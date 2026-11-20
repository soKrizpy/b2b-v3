import type { SessionReport, SessionReportRepository, RepositoryChangeEvent, RepositoryResult } from "./domain-contracts";

type DemoActor = { id: string; role: "admin" | "tutor" | "student" };
type LegacyReport = {
  id: string; studentId: string; studentName?: string; studentGrade?: string; studentAvatar?: string;
  tutorId: string; tutorName?: string; tutorAvatar?: string; sessionDate: string; sessionNumber: number | null;
  topic: string; moduleName?: string; activities: string; achievements: string; difficulties: string;
  solutions: string; parentRecommendations: string; competencies?: Record<string, unknown>;
  status: "draft" | "submitted"; version?: number; createdAt?: string; updatedAt?: string;
  submittedAt?: string | null; history?: unknown[];
};
type LegacyFailure = { success: false; error: string; message?: string; currentVersion?: number };
type LegacySave = { success: true; report: LegacyReport } | LegacyFailure;
type LegacyEvent = { action?: string; meta?: Record<string, unknown> | null; timestamp?: string };
export interface LocalDemoSessionReportStorePort {
  getTutorReports(tutorId: string): LegacyReport[];
  getAllReports(): LegacyReport[];
  getReportById(reportId: string): LegacyReport | null;
  getStudentSubmittedReports(studentId: string): LegacyReport[];
  saveReport(data: Record<string, unknown>, status: "draft" | "submitted", expectedVersion?: number): LegacySave;
  deleteDraft(reportId: string): boolean;
  subscribe(callback: (event: LegacyEvent) => void): () => void;
}
const fail = <T>(code: string, message: string, details?: unknown): RepositoryResult<T> =>
  ({ success: false, error: { code, message, ...(details === undefined ? {} : { details }) } });
const iso = (value?: string | null): string => value && !Number.isNaN(Date.parse(value))
  ? new Date(value).toISOString() : new Date(0).toISOString();
function toReport(value: LegacyReport): SessionReport {
  return {
    id: value.id, studentId: value.studentId,
    ...(value.studentName ? { studentName: value.studentName } : {}),
    ...(value.studentGrade ? { studentGrade: value.studentGrade } : {}),
    ...(value.studentAvatar ? { studentAvatar: value.studentAvatar } : {}),
    tutorId: value.tutorId,
    ...(value.tutorName ? { tutorName: value.tutorName } : {}),
    ...(value.tutorAvatar ? { tutorAvatar: value.tutorAvatar } : {}),
    // The legacy report store has no session foreign key; never infer one from a date or number.
    sessionId: null, sessionDate: value.sessionDate, sessionNumber: value.sessionNumber,
    topic: value.topic, ...(value.moduleName ? { moduleName: value.moduleName } : {}),
    activities: value.activities, achievements: value.achievements, difficulties: value.difficulties,
    solutions: value.solutions, parentRecommendations: value.parentRecommendations,
    competencies: (value.competencies ?? {}) as SessionReport["competencies"],
    status: value.status, version: Number.isInteger(value.version) && Number(value.version) > 0 ? Number(value.version) : 1,
    createdAt: iso(value.createdAt), updatedAt: iso(value.updatedAt),
    submittedAt: value.submittedAt ? iso(value.submittedAt) : null
  };
}
function eventTime(value?: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}
export function createLocalDemoSessionReportRepository(
  store: LocalDemoSessionReportStorePort,
  getActor: () => DemoActor | null,
  isTutorAssigned: (tutorId: string, studentId: string) => boolean = () => false
): SessionReportRepository {
  const actor = () => getActor();
  return {
    async listTutorReports(tutorId) {
      const current = actor();
      if (!current || (current.role !== "admin" && (current.role !== "tutor" || current.id !== tutorId))) return [];
      return store.getTutorReports(tutorId).map(toReport);
    },
    async listStudentSubmittedReports(studentId) {
      const current = actor();
      if (!current || (current.role !== "admin" && (current.role !== "student" || current.id !== studentId))) return [];
      return store.getStudentSubmittedReports(studentId).map(toReport);
    },
    async getReport(reportId) {
      const current = actor();
      if (!current) return null;
      const value = store.getReportById(reportId);
      if (!value) return null;
      const allowed = current.role === "admin" ||
        (current.role === "tutor" && current.id === value.tutorId) ||
        (current.role === "student" && current.id === value.studentId && value.status === "submitted");
      return allowed ? toReport(value) : null;
    },
    async saveReport(input) {
      const current = actor();
      if (!current || current.role !== "tutor") return fail("FORBIDDEN", "Sesi tutor aktif diperlukan untuk menyimpan laporan.");
      if (input.tutorId !== current.id) return fail("ACTOR_MISMATCH", "Laporan hanya dapat disimpan atas nama tutor yang sedang aktif.");
      if (input.sessionId) return fail("SESSION_LINK_UNSUPPORTED", "Penyimpanan laporan demo belum mendukung relasi langsung ke sesi.");
      if (!input.studentId) return fail("INVALID_REPORT", "Siswa wajib dipilih.");
      if (!isTutorAssigned(current.id, input.studentId)) return fail("NOT_ASSIGNED_TUTOR", "Tutor tidak memiliki penugasan aktif untuk siswa ini.");
      if (input.id) {
        const existing = store.getReportById(input.id);
        if (existing && existing.tutorId !== current.id) return fail("FORBIDDEN", "Laporan milik tutor lain tidak dapat diubah.");
        if (existing && input.expectedVersion === undefined) return fail("MISSING_EXPECTED_VERSION", "expectedVersion wajib disertakan saat memperbarui laporan.");
        if (!existing && input.expectedVersion !== undefined) return fail("NOT_FOUND", "Laporan untuk pembaruan tidak ditemukan.");
      }
      const payload: Record<string, unknown> = {
        ...(input.id ? { id: input.id } : {}),
        studentId: input.studentId, studentName: input.studentName, studentGrade: input.studentGrade,
        studentAvatar: input.studentAvatar, tutorId: current.id, tutorName: input.tutorName,
        tutorAvatar: input.tutorAvatar, sessionDate: input.sessionDate, sessionNumber: input.sessionNumber,
        topic: input.topic, moduleName: input.moduleName, activities: input.activities,
        achievements: input.achievements, difficulties: input.difficulties, solutions: input.solutions,
        parentRecommendations: input.parentRecommendations, competencies: input.competencies
      };
      const result = store.saveReport(payload, input.status, input.expectedVersion);
      if (!result.success) return fail(result.error, result.message ?? "Laporan gagal disimpan.", {
        ...(result.currentVersion === undefined ? {} : { currentVersion: result.currentVersion })
      });
      return { success: true, data: toReport(result.report) };
    },
    async deleteDraft(reportId) {
      const current = actor();
      if (!current || current.role !== "admin" && current.role !== "tutor") return fail("FORBIDDEN", "Sesi admin atau tutor diperlukan.");
      const existing = store.getReportById(reportId);
      if (!existing) return fail("NOT_FOUND", "Laporan tidak ditemukan.");
      if (current.role === "tutor" && existing.tutorId !== current.id) return fail("FORBIDDEN", "Laporan milik tutor lain tidak dapat dihapus.");
      return store.deleteDraft(reportId) ? { success: true, data: undefined } : fail("DELETE_FAILED", "Hanya laporan draft yang dapat dihapus.");
    },
    subscribe(listener) {
      return store.subscribe(event => {
        const id = event.meta?.reportId;
        const change: RepositoryChangeEvent = {
          domain: "reports", action: event.action ?? "changed",
          ...(typeof id === "string" ? { entityId: id } : {}), occurredAt: eventTime(event.timestamp)
        };
        listener(change);
      });
    }
  };
}
