/**
 * Async repository boundary for identity and tutor/student assignments.
 * The local IdentityStore remains demo persistence, not production authorization.
 */
import { IdentityStore } from './identity-store.js';

export { IdentityStore };

export const IdentityRepository = {
  async getAllUsers(filters = {}) { return IdentityStore.getAllUsers(filters); },
  async listActiveAccounts(role) { return IdentityStore.getAllUsers({ role, status: 'active' }); },
  async getUserById(userId) { return IdentityStore.getUserById(userId); },
  async getTutorStudents(tutorId) { return IdentityStore.getTutorStudents(tutorId); },
  async getAllAssignments() { return IdentityStore.getAllAssignments(); },
  async createUser(data) { return IdentityStore.createUser(data); },
  async updateUser(userId, changes) { return IdentityStore.updateUser(userId, changes); },
  async activateUser(userId) { return IdentityStore.activateUser(userId); },
  async deactivateUser(userId) { return IdentityStore.deactivateUser(userId); },
  async assignStudentToTutor(tutorId, studentId) { return IdentityStore.assignStudentToTutor(tutorId, studentId); },
  async removeTutorStudentAssignment(tutorId, studentId) { return IdentityStore.removeTutorStudentAssignment(tutorId, studentId); },
  async initializeDemo() { return IdentityStore.seedIfEmpty(); },
  subscribe(callback) { return IdentityStore.subscribe(callback); }
};
