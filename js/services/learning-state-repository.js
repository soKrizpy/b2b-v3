/**
 * Async repository boundary for student submissions, lesson progress,
 * and tutor review state. Local stores remain demo persistence only.
 */
import { StateStore } from './state-store.js';
import { LessonProgressRepository } from './lesson-progress-repository.js';

export { StateStore, LessonProgressRepository };

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
  async getLessonProgress(studentId, lessonKey) {
    return LessonProgressRepository.getProgress(studentId, lessonKey);
  },
  async saveLessonProgress(studentId, lessonKey, updates) {
    return LessonProgressRepository.saveProgress(studentId, lessonKey, updates);
  },
  // Legacy progress migration is intentionally not called automatically:
  // the old global record has no trustworthy student owner.
  subscribe(callback) {
    const unsubscribeSubmissions = StateStore.subscribe(callback);
    const unsubscribeProgress = LessonProgressRepository.subscribe(callback);
    return () => {
      unsubscribeSubmissions();
      unsubscribeProgress();
    };
  }
};
