/**
 * Async repository boundaries for tutor learning records.
 * Local demo persistence remains in use; this is not production authorization.
 */
import { SessionStore } from './session-store.js';
import { MonthlyEvaluationStore } from './monthly-evaluation-store.js';

export { SessionStore, MonthlyEvaluationStore };

export const SessionReportRepository = {
  async getTutorReports(tutorId) { return SessionStore.getTutorReports(tutorId); },
  async getAllReports() { return SessionStore.getAllReports(); },
  async getReportById(reportId) { return SessionStore.getReportById(reportId); },
  async getStudentSubmittedReports(studentId) { return SessionStore.getStudentSubmittedReports(studentId); },
  async saveReport(data, status, expectedVersion = null) {
    return SessionStore.saveReport(data, status, expectedVersion);
  },
  async deleteDraft(reportId) {
    return SessionStore.deleteDraft(reportId);
  },
  subscribe(callback) { return SessionStore.subscribe(callback); }
};

export const MonthlyEvaluationRepository = {
  getRatings() { return [...MonthlyEvaluationStore.ratings]; },
  async getTutorEvaluations(tutorId) { return MonthlyEvaluationStore.getTutorEvaluations(tutorId); },
  async getStudentPublished(studentId) { return MonthlyEvaluationStore.getStudentPublished(studentId); },
  async save(data, status = 'draft') {
    return MonthlyEvaluationStore.save(data, status);
  },
  subscribe(callback) { return MonthlyEvaluationStore.subscribe(callback); }
};
