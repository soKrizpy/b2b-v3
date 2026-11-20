import type { ClassSession, ClassSessionRepository, CreateReplacementSessionInput, RecurringSessionSeriesInput, RepositoryChangeEvent, RepositoryResult, AttendanceStatus } from "./domain-contracts";
type DemoActor = { id: string; role: "admin" | "tutor" };
type LegacyFailure = { success: false; error: string; message?: string };
type LegacyMutation<T> = ({ success: true } & T) | LegacyFailure;
type LegacySessionEvent = { action?: string; meta?: Record<string, unknown> | null; timestamp?: string };
export interface LocalDemoClassSessionStorePort {
 getAllSessions(): ClassSession[];
 getSession(id: string): ClassSession | null;
 getBillableSessions(studentId?: string | null): ClassSession[];
 createRecurringSessionSeries(input: RecurringSessionSeriesInput): LegacyMutation<{ sessions: ClassSession[] }>;
 recordAttendance(id: string, status: Exclude<AttendanceStatus, "not_recorded">, actor: DemoActor): LegacyMutation<{ session: ClassSession }>;
 cancelSession(id: string, actor: DemoActor, reason?: string): LegacyMutation<{ session: ClassSession }>;
 softDeleteSession(id: string, actor: DemoActor): LegacyMutation<{ session: ClassSession }>;
 createReplacementSession(id: string, input: CreateReplacementSessionInput, actor: DemoActor): LegacyMutation<{ original: ClassSession; replacement: ClassSession }>;
 subscribe(callback: (event: LegacySessionEvent) => void): () => void;
}
function failure<T>(code: string, message: string): RepositoryResult<T> { return { success: false, error: { code, message } }; }
function legacyFailure<T>(result: LegacyFailure): RepositoryResult<T> { return failure(result.error, result.message ?? "Operasi sesi gagal."); }
function monthInJakarta(value: string): string | null {
 const date = new Date(value); if (Number.isNaN(date.getTime())) return null;
 const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).formatToParts(date);
 const year = parts.find(part => part.type === "year")?.value; const month = parts.find(part => part.type === "month")?.value;
 return year && month ? `${year}-${month}` : null;
}
function eventTime(value?: string): string { return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString(); }
export function createLocalDemoClassSessionRepository(store: LocalDemoClassSessionStorePort, getActor: () => { id: string; role: "admin" | "tutor" | "student" } | null): ClassSessionRepository {
 function actorFor(roles: Array<"admin" | "tutor">): DemoActor | null {
  const current = getActor(); if (!current?.id || !roles.includes(current.role as "admin" | "tutor")) return null;
  return { id: current.id, role: current.role as "admin" | "tutor" };
 }
 return {
  async listSessions(filters) { return store.getAllSessions().filter(s => !filters?.studentId || s.studentId === filters.studentId).filter(s => !filters?.tutorId || s.tutorId === filters.tutorId).filter(s => !filters?.seriesId || s.seriesId === filters.seriesId).filter(s => !filters?.status || s.status === filters.status); },
  async getSession(id) { return id ? store.getSession(id) : null; },
  async createRecurringSeries(input) { if (!actorFor(["admin"])) return failure("FORBIDDEN", "Sesi admin diperlukan untuk membuat seri jadwal."); const result = store.createRecurringSessionSeries(input); return result.success ? { success: true, data: result.sessions } : legacyFailure(result); },
  async recordAttendance(id, status) { const actor = actorFor(["tutor"]); if (!actor) return failure("FORBIDDEN", "Sesi tutor aktif diperlukan untuk mencatat kehadiran."); const result = store.recordAttendance(id, status, actor); return result.success ? { success: true, data: result.session } : legacyFailure(result); },
  async cancelSession(id, reason = "") { const actor = actorFor(["admin", "tutor"]); if (!actor) return failure("FORBIDDEN", "Sesi admin atau tutor aktif diperlukan untuk membatalkan sesi."); const result = store.cancelSession(id, actor, reason); return result.success ? { success: true, data: result.session } : legacyFailure(result); },
  async softDeleteSession(id) { const actor = actorFor(["admin"]); if (!actor) return failure("FORBIDDEN", "Sesi admin aktif diperlukan untuk menghapus sesi."); const result = store.softDeleteSession(id, actor); return result.success ? { success: true, data: result.session } : legacyFailure(result); },
  async createReplacement(originalId, input) { const actor = actorFor(["admin"]); if (!actor) return failure("FORBIDDEN", "Sesi admin aktif diperlukan untuk membuat sesi pengganti."); const result = store.createReplacementSession(originalId, input, actor); return result.success ? { success: true, data: { original: result.original, replacement: result.replacement } } : legacyFailure(result); },
  async listBillableSessions(studentId, period) { return store.getBillableSessions(studentId).filter(s => monthInJakarta(s.scheduledStartAt) === period); },
  subscribe(listener) { return store.subscribe(event => { const value = event.meta?.sessionId ?? event.meta?.seriesId ?? event.meta?.originalSessionId; const change: RepositoryChangeEvent = { domain: "sessions", action: event.action ?? "changed", ...(typeof value === "string" ? { entityId: value } : {}), occurredAt: eventTime(event.timestamp) }; listener(change); }); }
 };
}
