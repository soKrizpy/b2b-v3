/**
 * Async repository boundary for student submissions and tutor review state.
 * The local StateStore remains demo persistence, not production authorization.
 */
import { StateStore } from './state-store.js';

export { StateStore };

export const LearningStateRepository = {
  async seedSubmissionsIfEmpty(seedData) { return StateStore.seedSubmissionsIfEmpty(seedData); },
  async getAllSubmissions() { return StateStore.getAllSubmissions(); },
  async getSubmission(submissionId) { return StateStore.getSubmission(submissionId); },
  async getStudentSubmissions(studentId) { return StateStore.getStudentSubmissions(studentId); },
  async getStudentLessonSubmission(studentId, lessonId) { return StateStore.getStudentLessonSubmission(studentId, lessonId); },
  async saveSubmission(submission) { return StateStore.saveSubmission(submission); },
  async updateSubmissionStatus(submissionId, status, teacherData, expectedVersion) {
    return StateStore.updateSubmissionStatus(submissionId, status, teacherData, expectedVersion);
  },
  async migrateFromLegacyProgress(currentUser) { return StateStore.migrateFromLegacyProgress(currentUser); },
  subscribe(callback) { return StateStore.subscribe(callback); }
};
