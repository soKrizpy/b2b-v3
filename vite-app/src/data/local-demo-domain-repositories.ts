/**
 * Async repository adapters for the existing local-demo domain stores.
 *
 * The wrapped stores remain the source of demo behavior for now. This adapter
 * creates the async boundary expected by future remote repositories without
 * changing localStorage keys, event names, validation, or lifecycle rules.
 *
 * IMPORTANT: this is demo persistence only, not production authorization.
 */

// @ts-ignore - Legacy JavaScript store remains in place during migration.
import { ClassSessionStore } from "../../../js/services/class-session-store.js";
// @ts-ignore - Shared async boundary is implemented beside the legacy store.
import { ClassSessionRepository } from "../../../js/services/class-session-repository.js";
// @ts-ignore - Shared async learning-record boundary remains beside legacy stores.
import { SessionReportRepository, MonthlyEvaluationRepository } from "../../../js/services/learning-record-repository.js";
// @ts-ignore - Shared async billing boundary remains beside the legacy store.
import { BillingRepository } from "../../../js/services/billing-repository.js";

export { ClassSessionStore, ClassSessionRepository, SessionReportRepository, MonthlyEvaluationRepository, BillingRepository };
// @ts-ignore - Legacy JavaScript store remains in place during migration.
import { SessionStore } from "../../../js/services/session-store.js";
// @ts-ignore - Legacy JavaScript store remains in place during migration.
import { MonthlyEvaluationStore } from "../../../js/services/monthly-evaluation-store.js";
// @ts-ignore - Legacy JavaScript store remains in place during migration.
import { BillingStore } from "../../../js/services/billing-store.js";

type StoreFunction = (...args: any[]) => any;
type StoreShape = Record<string, any>;
type AsyncStoreAdapter<T extends StoreShape> = {
  [K in keyof T]: T[K] extends StoreFunction
    ? K extends "subscribe" | "isBillable"
      ? T[K]
      : (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : T[K];
};

function createAsyncStoreAdapter<T extends StoreShape>(
  store: T
): AsyncStoreAdapter<T> {
  return new Proxy({} as AsyncStoreAdapter<T>, {
    get(_target, property) {
      const value = Reflect.get(store, property, store);
      if (typeof value !== "function") return value;

      const callable = value as (...args: unknown[]) => unknown;
      const method = String(property);
      if (method === "subscribe" || method === "isBillable") {
        return callable.bind(store);
      }

      return async (...args: unknown[]) => callable.apply(store, args);
    }
  });
}

export interface LocalDemoDomainRepositories {
  classSessions: AsyncStoreAdapter<typeof ClassSessionStore>;
  sessionReports: AsyncStoreAdapter<typeof SessionStore>;
  monthlyEvaluations: AsyncStoreAdapter<typeof MonthlyEvaluationStore>;
  billing: AsyncStoreAdapter<typeof BillingStore>;
}

export const localDemoDomainRepositories: LocalDemoDomainRepositories = {
  classSessions: Object.assign(createAsyncStoreAdapter(ClassSessionStore), {
    recordAttendance: ClassSessionRepository.recordAttendance,
    cancelSession: ClassSessionRepository.cancelSession,
    createRecurringSessionSeries: ClassSessionRepository.createRecurringSessionSeries,
    softDeleteSession: ClassSessionRepository.softDeleteSession,
    createReplacementSession: ClassSessionRepository.createReplacementSession
  }),
  sessionReports: Object.assign(createAsyncStoreAdapter(SessionStore), {
    saveReport: SessionReportRepository.saveReport,
    deleteDraft: SessionReportRepository.deleteDraft
  }),
  monthlyEvaluations: Object.assign(createAsyncStoreAdapter(MonthlyEvaluationStore), {
    save: MonthlyEvaluationRepository.save
  }),
  billing: Object.assign(createAsyncStoreAdapter(BillingStore), {
    setRate: BillingRepository.setRate,
    createInvoice: BillingRepository.createInvoice,
    updateDraftInvoice: BillingRepository.updateDraftInvoice,
    issueInvoice: BillingRepository.issueInvoice,
    markPaid: BillingRepository.markPaid
  })
};
