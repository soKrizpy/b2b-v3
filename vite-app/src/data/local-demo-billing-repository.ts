import type { BillingRepository, Invoice, RepositoryChangeEvent, RepositoryResult, StudentTariff } from "./domain-contracts";

type DemoActor = { id: string; role: "admin" | "tutor" | "student" };
type LegacyFailure = { success: false; error: string; message?: string };
type LegacyMutation<T, K extends string> = ({ success: true } & Record<K, T>) | LegacyFailure;
type LegacyRate = StudentTariff;
type LegacyInvoice = Invoice;
type LegacyEvent = { action?: string; meta?: Record<string, unknown> | null; timestamp?: string };
export interface LocalDemoBillingStorePort {
  getRate(studentId: string): LegacyRate | null;
  getInvoices(): LegacyInvoice[];
  getStudentInvoices(studentId: string): LegacyInvoice[];
  getUnpaidStudentInvoices(studentId: string): LegacyInvoice[];
  setRate(studentId: string, amountPerSession: number, actor: DemoActor): LegacyMutation<LegacyRate, "rate">;
  createInvoice(studentId: string, period: string, actor: DemoActor): LegacyMutation<LegacyInvoice, "invoice">;
  updateDraftInvoice(invoiceId: string, changes: Record<string, unknown>, actor: DemoActor): LegacyMutation<LegacyInvoice, "invoice">;
  issueInvoice(invoiceId: string, actor: DemoActor): LegacyMutation<LegacyInvoice, "invoice">;
  markPaid(invoiceId: string, actor: DemoActor): LegacyMutation<LegacyInvoice, "invoice">;
  subscribe(callback: (event: LegacyEvent) => void): () => void;
}
const fail = <T>(code: string, message: string): RepositoryResult<T> => ({ success: false, error: { code, message } });
function mutation<T, K extends "invoice" | "rate">(result: LegacyMutation<T, K>, key: K): RepositoryResult<T> {
  if (!result.success) return fail(result.error, result.message ?? "Operasi tagihan gagal.");
  return { success: true, data: result[key] };
}
function eventTime(value?: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}
export function createLocalDemoBillingRepository(
  store: LocalDemoBillingStorePort,
  getActor: () => DemoActor | null
): BillingRepository {
  const adminActor = (): DemoActor | null => {
    const current = getActor();
    return current?.id && current.role === "admin" ? current : null;
  };
  const canReadStudent = (studentId: string): boolean => {
    const current = getActor();
    return Boolean(current && (current.role === "admin" || current.role === "student" && current.id === studentId));
  };
  return {
    async getStudentTariff(studentId) {
      if (!canReadStudent(studentId)) return null;
      return store.getRate(studentId);
    },
    async setStudentTariff(studentId, amountPerSession) {
      const actor = adminActor();
      return actor ? mutation(store.setRate(studentId, amountPerSession, actor), "rate") : fail("FORBIDDEN", "Sesi admin diperlukan untuk mengatur tarif.");
    },
    async listInvoices(filters) {
      if (!adminActor()) return [];
      return store.getInvoices()
        .filter(invoice => !filters?.studentId || invoice.studentId === filters.studentId)
        .filter(invoice => !filters?.status || invoice.status === filters.status);
    },
    async getStudentInvoices(studentId) {
      return canReadStudent(studentId) ? store.getUnpaidStudentInvoices(studentId) : [];
    },
    async getStudentInvoiceHistory(studentId) {
      return canReadStudent(studentId) ? store.getStudentInvoices(studentId) : [];
    },
    async createDraftInvoice(studentId, period) {
      const actor = adminActor();
      return actor ? mutation(store.createInvoice(studentId, period, actor), "invoice") : fail("FORBIDDEN", "Sesi admin diperlukan untuk membuat draft tagihan.");
    },
    async updateDraftInvoice(invoiceId, changes) {
      const actor = adminActor();
      if (!actor) return fail("FORBIDDEN", "Sesi admin diperlukan untuk mengubah draft tagihan.");
      return mutation(store.updateDraftInvoice(invoiceId, changes, actor), "invoice");
    },
    async issueInvoice(invoiceId) {
      const actor = adminActor();
      return actor ? mutation(store.issueInvoice(invoiceId, actor), "invoice") : fail("FORBIDDEN", "Sesi admin diperlukan untuk menerbitkan tagihan.");
    },
    async markInvoicePaid(invoiceId) {
      const actor = adminActor();
      return actor ? mutation(store.markPaid(invoiceId, actor), "invoice") : fail("FORBIDDEN", "Sesi admin diperlukan untuk menandai tagihan lunas.");
    },
    subscribe(listener) {
      return store.subscribe(event => {
        const entityId = event.meta?.invoiceId ?? event.meta?.studentId;
        const change: RepositoryChangeEvent = {
          domain: "billing", action: event.action ?? "changed",
          ...(typeof entityId === "string" ? { entityId } : {}), occurredAt: eventTime(event.timestamp)
        };
        listener(change);
      });
    }
  };
}
