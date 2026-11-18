/**
 * B2B LEARNING ENGINE - ACCESS CONTROL & RBAC ENGINE (PHASE 4)
 * Strict Role-Based Access Control and Relational Authorization.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - Admin: Full governance across users, classes, and assignments.
 * - Tutor: Assigned students only; can review and create session reports.
 * - Student: Own learning experience only; cannot review or manage accounts.
 * - Parent: Linked children only (read-only Parent Hub); cannot submit reports.
 */

import { IdentityStore } from './identity-store.js';

export const AccessControl = {
  /**
   * Check if a user has administrative privileges
   * @param {Object} user
   * @returns {boolean}
   */
  canManageUsers(user) {
    if (!user || typeof user !== 'object') return false;
    return user.role === 'admin';
  },

  /**
   * Check if user has permission for a specific role context
   * @param {Object} user
   * @param {string} targetRole
   * @returns {boolean}
   */
  canAccessRole(user, targetRole) {
    if (!user || !targetRole) return false;
    if (user.role === 'admin') return true;
    const normUserRole = user.role === 'teacher' ? 'tutor' : user.role;
    const normTargetRole = targetRole === 'teacher' ? 'tutor' : targetRole;
    return normUserRole === normTargetRole;
  },

  /**
   * Check if tutor has legitimate assignment to access a specific student
   * @param {string|Object} tutorOrId
   * @param {string} studentId
   * @returns {boolean}
   */
  canAccessStudent(tutorOrId, studentId) {
    if (!tutorOrId || !studentId) return false;

    const tutorId = typeof tutorOrId === 'object' ? tutorOrId.id : tutorOrId;
    const userRole = typeof tutorOrId === 'object' ? tutorOrId.role : null;

    // Admin has global oversight
    if (userRole === 'admin') return true;
    const userObj = IdentityStore.getUserById(tutorId);
    if (userObj && userObj.role === 'admin') return true;

    // Must be assigned tutor
    const assignedStudents = IdentityStore.getTutorStudents(tutorId);
    return assignedStudents.some((s) => s.id === studentId);
  },

  /**
   * Check if parent has legitimate active link to access a specific child
   * @param {string|Object} parentOrId
   * @param {string} studentId
   * @returns {boolean}
   */
  canAccessChild(parentOrId, studentId) {
    if (!parentOrId || !studentId) return false;

    const parentId = typeof parentOrId === 'object' ? parentOrId.id : parentOrId;
    const userRole = typeof parentOrId === 'object' ? parentOrId.role : null;

    // Admin has global oversight
    if (userRole === 'admin') return true;
    const userObj = IdentityStore.getUserById(parentId);
    if (userObj && userObj.role === 'admin') return true;

    // Must be linked parent
    const linkedChildren = IdentityStore.getParentStudents(parentId);
    return linkedChildren.some((s) => s.id === studentId);
  },

  /**
   * Check if user can review student submissions
   * @param {Object} user
   * @returns {boolean}
   */
  canReviewSubmission(user) {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'tutor' || user.role === 'teacher';
  },

  /**
   * Check if user can create or edit session reports
   * @param {Object} user
   * @param {string} studentId
   * @returns {boolean}
   */
  canCreateSessionReport(user, studentId) {
    if (!user || !studentId) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'tutor' || user.role === 'teacher') {
      return this.canAccessStudent(user.id, studentId);
    }
    return false;
  },

  /**
   * Get allowed navigation routes / modules per role
   * @param {string} role
   * @returns {Array<string>}
   */
  getAllowedNavigation(role) {
    const normRole = role === 'teacher' ? 'tutor' : (role || 'student');
    switch (normRole) {
      case 'admin':
        return ['admin-accounts', 'admin-relations', 'dashboard', 'submissions', 'session-reports'];
      case 'tutor':
        return ['dashboard', 'submissions', 'session-reports', 'students'];
      case 'parent':
        return ['parent-hub'];
      case 'student':
      default:
        return ['dashboard', 'mission', 'parent-hub'];
    }
  },

  /**
   * Validate if user can view a specific application page / section
   * @param {Object} user
   * @param {string} view
   * @returns {{allowed: boolean, reason?: string}}
   */
  canAccessView(user, view) {
    if (!user) {
      return { allowed: false, reason: 'Sesi pengguna tidak aktif. Harap pilih akun demo.' };
    }

    if (user.role === 'admin') {
      return { allowed: true };
    }

    if (view === 'view-admin') {
      return { allowed: false, reason: 'Akses Ditolak: Hanya Administrator yang dapat mengakses manajemen akun.' };
    }

    if (view === 'teacher.html' || view === 'view-teacher') {
      if (user.role !== 'tutor' && user.role !== 'teacher') {
        return { allowed: false, reason: 'Akses Ditolak: Halaman guru hanya dapat diakses oleh Tutor.' };
      }
    }

    if (view === 'parent.html' || view === 'view-parent') {
      if (user.role !== 'parent' && user.role !== 'admin') {
        return { allowed: false, reason: 'Akses Ditolak: Halaman Parent Hub hanya dapat diakses oleh Orang Tua.' };
      }
    }

    if (view === 'student.html' || view === 'view-student') {
      if (user.role === 'parent') {
        // Parents can access student.html#parent-hub for backward compatibility
        return { allowed: true };
      }
      if (user.role !== 'student') {
        return { allowed: false, reason: 'Akses Ditolak: Halaman belajar ini khusus untuk Siswa.' };
      }
    }

    return { allowed: true };
  }
};
