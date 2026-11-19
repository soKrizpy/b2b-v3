/**
 * Async repository boundary for class-session operations.
 *
 * The local store remains demo persistence. This adapter is the seam for a
 * future remote implementation; it does not provide production authorization.
 */
import { ClassSessionStore } from './class-session-store.js';

export const ClassSessionRepository = {
  async recordAttendance(sessionId, attendanceStatus, actor) {
    return ClassSessionStore.recordAttendance(sessionId, attendanceStatus, actor);
  }
};
