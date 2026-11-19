/**
 * Async repository boundary for class-session operations.
 *
 * The local store remains demo persistence. This adapter is the seam for a
 * future remote implementation; it does not provide production authorization.
 */
import { ClassSessionStore } from './class-session-store.js';

export { ClassSessionStore };

export const ClassSessionRepository = {
  async recordAttendance(sessionId, attendanceStatus, actor) {
    return ClassSessionStore.recordAttendance(sessionId, attendanceStatus, actor);
  },

  async cancelSession(sessionId, actor, reason = '') {
    return ClassSessionStore.cancelSession(sessionId, actor, reason);
  },

  async createRecurringSessionSeries(data) {
    return ClassSessionStore.createRecurringSessionSeries(data);
  },

  async softDeleteSession(sessionId, actor) {
    return ClassSessionStore.softDeleteSession(sessionId, actor);
  },

  async createReplacementSession(originalSessionId, data, actor) {
    return ClassSessionStore.createReplacementSession(originalSessionId, data, actor);
  }
};
