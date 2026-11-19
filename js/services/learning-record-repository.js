/**
 * Async repository boundaries for tutor learning records.
 * Local demo persistence remains in use; this is not production authorization.
 */
import { SessionStore } from './session-store.js';
import { MonthlyEvaluationStore } from './monthly-evaluation-store.js';

export { SessionStore, MonthlyEvaluationStore };

export const SessionReportRepository = {
  async saveReport(data, status, expectedVersion = null) {
    return SessionStore.saveReport(data, status, expectedVersion);
  },
  async deleteDraft(reportId) {
    return SessionStore.deleteDraft(reportId);
  }
};

export const MonthlyEvaluationRepository = {
  async save(data, status = 'draft') {
    return MonthlyEvaluationStore.save(data, status);
  }
};
