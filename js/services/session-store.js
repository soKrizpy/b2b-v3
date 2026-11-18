/**
 * B2B LEARNING ENGINE - SESSION REPORTS STORE (PHASE 3)
 * Centralized localStorage manager for Tutor Session Reports & Parent Hub transparency.
 * Adheres strictly to Section 4, 5, 12, 13, 14 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

export const SESSION_STORE_KEY = 'b2b_session_reports_store';
export const SESSION_STORE_EVENT = 'b2b_session_store_change';

/**
 * Generate a unique session report ID
 * @returns {string} e.g. "ses_rep_uuid..."
 */
export function generateSessionReportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ses_rep_${crypto.randomUUID()}`;
  }
  return 'ses_rep_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const SessionStore = {
  /**
   * Check if localStorage is available
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const testKey = '__b2b_session_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Internal read from storage
   * @returns {Object.<string, Object>} Map of reportId -> sessionReport
   */
  _readStoreRaw() {
    if (!this.isAvailable()) return {};
    try {
      const raw = localStorage.getItem(SESSION_STORE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch (err) {
      console.error('SessionStore: Gagal membaca JSON store:', err);
      return {};
    }
  },

  /**
   * Internal write to storage with event dispatch
   * @param {Object.<string, Object>} store
   * @param {string} action
   * @param {Object} [meta=null]
   * @returns {boolean}
   */
  _writeStoreRaw(store, action = 'update', meta = null) {
    if (!this.isAvailable()) return false;
    try {
      localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(store));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        const evt = new CustomEvent(SESSION_STORE_EVENT, {
          detail: { action, meta, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(evt);
      }
      return true;
    } catch (err) {
      console.error('SessionStore: Gagal menyimpan data:', err);
      return false;
    }
  },

  /**
   * Get all session reports sorted by sessionDate / updatedAt descending
   * @returns {Array<Object>}
   */
  getAllReports() {
    const store = this._readStoreRaw();
    return Object.values(store).sort((a, b) => {
      const timeA = new Date(a.sessionDate || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.sessionDate || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  },

  /**
   * Get single report by ID
   * @param {string} reportId
   * @returns {Object|null}
   */
  getReport(reportId) {
    if (!reportId) return null;
    const store = this._readStoreRaw();
    return store[reportId] || null;
  },

  /**
   * Alias for getReport(reportId)
   * @param {string} reportId
   * @returns {Object|null}
   */
  getReportById(reportId) {
    return this.getReport(reportId);
  },

  /**
   * Get all reports for a specific student (Tutor view sees draft + submitted)
   * @param {string} studentId
   * @returns {Array<Object>}
   */
  getStudentReports(studentId) {
    if (!studentId) return [];
    return this.getAllReports().filter((r) => r.studentId === studentId);
  },

  /**
   * Get only SUBMITTED reports for a specific student (Parent Hub & Student view)
   * Drafts are strictly filtered out from parent/student view
   * @param {string} studentId
   * @returns {Array<Object>}
   */
  getStudentSubmittedReports(studentId) {
    if (!studentId) return [];
    return this.getAllReports().filter((r) => r.studentId === studentId && r.status === 'submitted');
  },

  /**
   * Get reports created by a specific tutor
   * @param {string} tutorId
   * @returns {Array<Object>}
   */
  getTutorReports(tutorId) {
    if (!tutorId) return [];
    return this.getAllReports().filter((r) => r.tutorId === tutorId);
  },

  /**
   * Save or update a session report
   * @param {Object} reportData
   * @param {'draft'|'submitted'} [status='draft']
   * @param {number} [expectedVersion] Optional for new drafts, required for updating existing
   * @returns {Object} Saved report or { success: false, error: '...' }
   */
  saveReport(reportData, status = 'draft', expectedVersion = undefined) {
    if (!reportData || typeof reportData !== 'object') {
      return { success: false, error: 'INVALID_DATA', message: 'Data laporan tidak valid.' };
    }

    if (!['draft', 'submitted'].includes(status)) {
      return { success: false, error: 'INVALID_STATUS', message: 'Status laporan harus "draft" atau "submitted".' };
    }

    const store = this._readStoreRaw();
    const now = new Date().toISOString();

    let id = reportData.id;
    let existing = (id && store[id]) ? store[id] : null;

    // Concurrency / Stale update check when updating existing record
    if (existing) {
      const currentVersion = typeof existing.version === 'number' ? existing.version : 1;
      if (typeof expectedVersion === 'number' && expectedVersion !== currentVersion) {
        return {
          success: false,
          error: 'STALE_UPDATE_CONFLICT',
          message: `Konflik pembaruan: Laporan ini telah diubah di sesi lain (versi saat ini: v${currentVersion}, versi Anda: v${expectedVersion}).`,
          currentVersion,
          report: existing
        };
      }
    }

    // Required fields validation for submitted reports (checks merged data if updating existing)
    if (status === 'submitted') {
      const studentId = reportData.studentId || (existing && existing.studentId) || '';
      const sessionDate = reportData.sessionDate || (existing && existing.sessionDate) || '';
      const topic = reportData.topic !== undefined ? reportData.topic : (existing && existing.topic) || '';
      const activities = reportData.activities !== undefined ? reportData.activities : (existing && existing.activities) || '';
      const achievements = reportData.achievements !== undefined ? reportData.achievements : (existing && existing.achievements) || '';

      if (!studentId.trim()) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Pilih siswa terlebih dahulu.' };
      }
      if (!sessionDate.trim()) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Tanggal sesi wajib diisi.' };
      }
      if (!topic.trim()) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Topik/materi pembelajaran wajib diisi.' };
      }
      if (!activities.trim()) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Aktivitas pembelajaran wajib diisi.' };
      }
      if (!achievements.trim()) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Pencapaian siswa wajib diisi.' };
      }
    }

    if (!id) {
      id = generateSessionReportId();
    }

    const currentVersion = (existing && typeof existing.version === 'number') ? existing.version : 1;
    const nextVersion = existing ? currentVersion + 1 : 1;

    // Build competencies record
    const competencies = reportData.competencies || (existing && existing.competencies) || {};

    // Keep history if modifying an already submitted report
    const history = (existing && Array.isArray(existing.history)) ? [...existing.history] : [];
    if (existing && existing.status === 'submitted') {
      history.push({
        version: existing.version || 1,
        savedAt: existing.updatedAt || now,
        status: existing.status,
        topic: existing.topic,
        tutorName: existing.tutorName
      });
    }

    const record = {
      id,
      studentId: reportData.studentId || (existing && existing.studentId) || '',
      studentName: reportData.studentName || (existing && existing.studentName) || 'Siswa',
      studentGrade: reportData.studentGrade || (existing && existing.studentGrade) || 'Grade 5 SD',
      studentAvatar: reportData.studentAvatar || (existing && existing.studentAvatar) || 'S',
      tutorId: reportData.tutorId || (existing && existing.tutorId) || 'usr_tea_001',
      tutorName: reportData.tutorName || (existing && existing.tutorName) || 'Kak Sarah',
      tutorAvatar: reportData.tutorAvatar || (existing && existing.tutorAvatar) || 'KS',
      sessionDate: reportData.sessionDate || (existing && existing.sessionDate) || now.slice(0, 10),
      sessionNumber: typeof reportData.sessionNumber === 'number'
        ? reportData.sessionNumber
        : (existing && typeof existing.sessionNumber === 'number' ? existing.sessionNumber : null),
      topic: (reportData.topic !== undefined ? reportData.topic : (existing && existing.topic)) || '',
      moduleName: reportData.moduleName || (existing && existing.moduleName) || 'Scratch Starter Adventure',
      activities: (reportData.activities !== undefined ? reportData.activities : (existing && existing.activities)) || '',
      achievements: (reportData.achievements !== undefined ? reportData.achievements : (existing && existing.achievements)) || '',
      difficulties: (reportData.difficulties !== undefined ? reportData.difficulties : (existing && existing.difficulties)) || '',
      solutions: (reportData.solutions !== undefined ? reportData.solutions : (existing && existing.solutions)) || '',
      parentRecommendations: (reportData.parentRecommendations !== undefined ? reportData.parentRecommendations : (existing && existing.parentRecommendations)) || '',
      competencies,
      status,
      version: nextVersion,
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now,
      submittedAt: status === 'submitted' ? (existing && existing.submittedAt ? existing.submittedAt : now) : null,
      history
    };

    store[id] = record;
    const ok = this._writeStoreRaw(store, status === 'submitted' ? 'submitReport' : 'saveDraft', {
      reportId: id,
      studentId: record.studentId,
      status
    });

    return ok ? { success: true, report: record } : { success: false, error: 'WRITE_FAILED', message: 'Gagal menulis ke penyimpanan lokal.' };
  },

  /**
   * Delete a draft report
   * @param {string} reportId
   * @returns {boolean}
   */
  deleteDraft(reportId) {
    if (!reportId) return false;
    const store = this._readStoreRaw();
    const existing = store[reportId];
    if (!existing) return false;

    // Safety: submitted reports cannot be deleted directly
    if (existing.status !== 'draft') {
      console.warn('SessionStore: Hanya laporan berstatus Draft yang dapat dihapus.');
      return false;
    }

    delete store[reportId];
    return this._writeStoreRaw(store, 'deleteDraft', { reportId });
  },

  /**
   * Subscribe to store mutations (cross-tab & same-tab)
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};

    const handleCustom = (e) => {
      try { callback(e.detail); } catch (err) { console.error(err); }
    };

    const handleStorage = (e) => {
      if (e.key === SESSION_STORE_KEY) {
        try { callback({ action: 'storageSync', key: e.key }); } catch (err) { console.error(err); }
      }
    };

    window.addEventListener(SESSION_STORE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SESSION_STORE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }
};
