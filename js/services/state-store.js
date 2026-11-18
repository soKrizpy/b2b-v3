/**
 * B2B LEARNING ENGINE - UNIFIED LOCAL MOCK STATE MANAGER
 * Single source of truth for Submissions and Teacher Review Lifecycle.
 * Adheres strictly to Section 4, 5, 10, 15 of PROJECT_RULES.md.
 */

export const SUBMISSION_STORE_KEY = 'b2b_submissions_store';
export const LEGACY_PROGRESS_KEY = 'b2b_student_lesson_progress';
export const STATE_STORE_EVENT = 'b2b_state_store_change';

/**
 * Generate a unique submission ID (UUID v4 based)
 * @returns {string} e.g. "sub_a1b2c3d4-..."
 */
export function generateSubmissionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sub_${crypto.randomUUID()}`;
  }
  // RFC4122 compliant fallback
  return 'sub_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const StateStore = {
  /**
   * Check if localStorage is available and writable
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const testKey = '__b2b_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('StateStore: localStorage tidak tersedia atau dibatasi:', e);
      return false;
    }
  },

  /**
   * Validate if an object conforms to minimum submission schema
   * @param {any} obj
   * @returns {boolean}
   */
  isValidSubmission(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.id !== 'string' || !obj.id.trim()) return false;
    if (typeof obj.studentId !== 'string' || !obj.studentId.trim()) return false;
    if (typeof obj.lessonId !== 'string' || !obj.lessonId.trim()) return false;
    if (typeof obj.status !== 'string' || !['submitted', 'approved', 'revision-required'].includes(obj.status)) {
      return false;
    }
    return true;
  },

  /**
   * Validate if store object is valid
   * @param {any} obj
   * @returns {boolean}
   */
  isValidStore(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  },

  /**
   * Internal safe read from localStorage
   * @returns {Object.<string, Object>} Map of submissionId -> submission
   */
  _readStoreRaw() {
    if (!this.isAvailable()) return {};
    try {
      const raw = localStorage.getItem(SUBMISSION_STORE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (this.isValidStore(parsed)) {
        return parsed;
      }
      console.warn('StateStore: Format store tidak valid, mempertahankan raw data.');
      return {};
    } catch (err) {
      console.error('StateStore: Gagal membaca/parse store JSON:', err);
      return {};
    }
  },

  /**
   * Internal safe write to localStorage
   * @param {Object.<string, Object>} store
   * @param {string} [changeAction='update']
   * @param {Object} [meta=null]
   * @returns {boolean}
   */
  _writeStoreRaw(store, changeAction = 'update', meta = null) {
    if (!this.isAvailable()) return false;
    try {
      localStorage.setItem(SUBMISSION_STORE_KEY, JSON.stringify(store));
      // Dispatch custom event for same-tab reactive updates
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        const event = new CustomEvent(STATE_STORE_EVENT, {
          detail: { action: changeAction, meta, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
      }
      return true;
    } catch (err) {
      console.error('StateStore: Gagal menyimpan data (kemungkinan kuota penuh):', err);
      return false;
    }
  },

  /**
   * Seed store only if empty/uninitialized
   * Never overwrites existing active data!
   * @param {Array<Object>} seedData Array of submissions from JSON mock
   * @returns {boolean} true if seeded, false if already initialized
   */
  seedSubmissionsIfEmpty(seedData) {
    if (!this.isAvailable()) return false;
    const existingRaw = localStorage.getItem(SUBMISSION_STORE_KEY);
    if (existingRaw !== null) {
      // Store already initialized (could be empty object or populated)
      return false;
    }

    if (!Array.isArray(seedData)) {
      console.warn('StateStore: Seed data bukan array.');
      return false;
    }

    const initialStore = {};
    const now = new Date().toISOString();

    seedData.forEach((sub) => {
      if (sub && sub.id) {
        initialStore[sub.id] = {
          id: sub.id,
          studentId: sub.studentId || 'usr_stu_001',
          studentName: sub.studentName || 'Siswa',
          studentGrade: sub.studentGrade || 'Grade 5',
          studentAvatar: sub.studentAvatar || 'S',
          lessonId: sub.lessonId || 'les_scratch_motion_01',
          lessonTitle: sub.lessonTitle || 'Scratch — Basic Motion',
          submittedAt: sub.submittedAt || now,
          projectUrl: sub.projectUrl || '',
          studentNotes: sub.studentNotes || '',
          status: sub.status || 'submitted',
          checkpointsPassed: typeof sub.checkpointsPassed === 'number' ? sub.checkpointsPassed : 4,
          checkpointsTotal: typeof sub.checkpointsTotal === 'number' ? sub.checkpointsTotal : 4,
          quizScore: sub.quizScore || '3/3 (100%)',
          reviewerId: sub.reviewerId || (sub.status === 'approved' ? 'usr_tea_001' : null),
          reviewerName: sub.reviewerName || (sub.status === 'approved' ? 'Kak Sarah' : null),
          reviewedAt: sub.approvedAt || sub.reviewedAt || (sub.status === 'approved' ? now : null),
          teacherFeedback: sub.teacherFeedback || (sub.feedbackHistory && sub.feedbackHistory[0] ? sub.feedbackHistory[0].comment : null),
          feedbackHistory: Array.isArray(sub.feedbackHistory) ? [...sub.feedbackHistory] : [],
          version: typeof sub.version === 'number' ? sub.version : 1,
          createdAt: sub.createdAt || now,
          updatedAt: sub.updatedAt || now
        };
      }
    });

    this._writeStoreRaw(initialStore, 'seed');
    console.log(`📦 StateStore: Store diinisialisasi dengan ${Object.keys(initialStore).length} data awal.`);
    return true;
  },

  /**
   * Get all submissions as an array, sorted by updatedAt descending
   * @returns {Array<Object>}
   */
  getAllSubmissions() {
    const store = this._readStoreRaw();
    return Object.values(store).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.submittedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.submittedAt || 0).getTime();
      return timeB - timeA;
    });
  },

  /**
   * Get single submission by ID
   * @param {string} submissionId
   * @returns {Object|null}
   */
  getSubmission(submissionId) {
    if (!submissionId) return null;
    const store = this._readStoreRaw();
    return store[submissionId] || null;
  },

  /**
   * Get submissions for a specific student
   * @param {string} studentId
   * @returns {Array<Object>}
   */
  getStudentSubmissions(studentId) {
    if (!studentId) return [];
    return this.getAllSubmissions().filter((s) => s.studentId === studentId);
  },

  /**
   * Get active submission for a student on a specific lesson
   * @param {string} studentId
   * @param {string} lessonId
   * @returns {Object|null}
   */
  getStudentLessonSubmission(studentId, lessonId) {
    if (!studentId || !lessonId) return null;
    const list = this.getStudentSubmissions(studentId);
    return list.find((s) => s.lessonId === lessonId) || null;
  },

  /**
   * Save (create or update) a student submission
   * @param {Object} submission
   * @returns {Object|null} Saved submission or null on failure
   */
  saveSubmission(submission) {
    if (!submission || typeof submission !== 'object') return null;

    const store = this._readStoreRaw();
    const now = new Date().toISOString();

    // Check if updating existing by ID or finding existing student + lesson submission
    let id = submission.id;
    let existing = null;

    if (id && store[id]) {
      existing = store[id];
    } else if (submission.studentId && submission.lessonId) {
      existing = Object.values(store).find(
        (s) => s.studentId === submission.studentId && s.lessonId === submission.lessonId
      );
      if (existing) {
        id = existing.id;
      }
    }

    if (!id) {
      id = generateSubmissionId();
    }

    const updated = {
      id,
      studentId: submission.studentId || (existing && existing.studentId) || 'usr_stu_001',
      studentName: submission.studentName || (existing && existing.studentName) || 'Alex Pratama',
      studentGrade: submission.studentGrade || (existing && existing.studentGrade) || 'Grade 5',
      studentAvatar: submission.studentAvatar || (existing && existing.studentAvatar) || 'AP',
      lessonId: submission.lessonId || (existing && existing.lessonId) || 'les_scratch_motion_01',
      lessonTitle: submission.lessonTitle || (existing && existing.lessonTitle) || 'Scratch — Basic Motion',
      projectUrl: submission.projectUrl !== undefined ? submission.projectUrl : (existing ? existing.projectUrl : ''),
      studentNotes: submission.studentNotes !== undefined ? submission.studentNotes : (existing ? existing.studentNotes : ''),
      status: submission.status || 'submitted',
      checkpointsPassed: typeof submission.checkpointsPassed === 'number'
        ? submission.checkpointsPassed
        : (existing ? existing.checkpointsPassed : 4),
      checkpointsTotal: typeof submission.checkpointsTotal === 'number'
        ? submission.checkpointsTotal
        : (existing ? existing.checkpointsTotal : 4),
      quizScore: submission.quizScore || (existing ? existing.quizScore : '3/3 (100%)'),
      reviewerId: existing ? existing.reviewerId : null,
      reviewerName: existing ? existing.reviewerName : null,
      reviewedAt: existing ? existing.reviewedAt : null,
      teacherFeedback: existing ? existing.teacherFeedback : null,
      feedbackHistory: existing && Array.isArray(existing.feedbackHistory) ? [...existing.feedbackHistory] : [],
      version: (existing && typeof existing.version === 'number') ? existing.version + 1 : 1,
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now,
      submittedAt: submission.submittedAt || now
    };

    store[id] = updated;
    const ok = this._writeStoreRaw(store, 'saveSubmission', { submissionId: id });
    return ok ? updated : null;
  },

  /**
   * Teacher evaluation action: update submission status with feedback
   * Strictly enforces optimistic concurrency check via mandatory expectedVersion
   * @param {string} submissionId
   * @param {'approved'|'revision-required'} newStatus
   * @param {Object} teacherData
   * @param {string} teacherData.reviewerId
   * @param {string} teacherData.reviewerName
   * @param {string} [teacherData.teacherFeedback]
   * @param {number} expectedVersion Mandatory expected revision counter to prevent stale concurrent overwrites
   * @returns {Object} Updated submission or error object { success: false, error: '...' }
   */
  updateSubmissionStatus(submissionId, newStatus, teacherData = {}, expectedVersion) {
    if (!submissionId) {
      return { success: false, error: 'INVALID_ID', message: 'submissionId wajib diisi.' };
    }
    if (!['approved', 'revision-required'].includes(newStatus)) {
      console.warn(`StateStore: Status ${newStatus} tidak valid untuk evaluasi guru.`);
      return { success: false, error: 'INVALID_STATUS', message: `Status ${newStatus} tidak valid.` };
    }

    // MANDATORY VERSION PROTECTION: Callers without valid expectedVersion are strictly rejected
    if (typeof expectedVersion !== 'number') {
      console.warn(`StateStore: updateSubmissionStatus mewajibkan expectedVersion (number). Diterima: ${expectedVersion}`);
      return {
        success: false,
        error: 'MISSING_EXPECTED_VERSION',
        message: 'Versi revisi submission (expectedVersion) wajib disertakan untuk mencegah race condition / stale updates.'
      };
    }

    const store = this._readStoreRaw();
    const sub = store[submissionId];
    if (!sub) {
      console.warn(`StateStore: Submission ${submissionId} tidak ditemukan.`);
      return { success: false, error: 'NOT_FOUND', message: `Submission ${submissionId} tidak ditemukan.` };
    }

    // Enforce version check
    const currentVersion = typeof sub.version === 'number' ? sub.version : 1;
    if (currentVersion !== expectedVersion) {
      console.warn(`StateStore: Stale update rejected for submission ${submissionId}! Expected v${expectedVersion}, found v${currentVersion}`);
      return {
        success: false,
        error: 'STALE_UPDATE_CONFLICT',
        message: `Konflik pembaruan data! Submission telah diubah oleh sesi lain (versi saat ini: v${currentVersion}, versi Anda: v${expectedVersion}). Mohon periksa kembali feedback terbaru.`,
        currentVersion,
        submission: sub
      };
    }

    const feedbackText = (teacherData.teacherFeedback || '').trim();

    // Validation: Revision required MUST have written feedback
    if (newStatus === 'revision-required' && !feedbackText) {
      console.warn('StateStore: Minta revisi mewajibkan catatan umpan balik.');
      return null;
    }

    const now = new Date().toISOString();
    const reviewerName = teacherData.reviewerName || 'Kak Sarah';
    const reviewerId = teacherData.reviewerId || 'usr_tea_001';

    // Construct history entry
    const historyItem = {
      reviewerId,
      reviewerName,
      status: newStatus,
      date: now,
      comment: feedbackText || (newStatus === 'approved' ? 'Proyek disetujui memenuhi kriteria!' : '')
    };

    const feedbackHistory = Array.isArray(sub.feedbackHistory) ? [...sub.feedbackHistory] : [];
    if (feedbackText || newStatus === 'approved') {
      feedbackHistory.unshift(historyItem);
    }

    sub.status = newStatus;
    sub.reviewerId = reviewerId;
    sub.reviewerName = reviewerName;
    sub.reviewedAt = now;
    sub.teacherFeedback = feedbackText;
    sub.feedbackHistory = feedbackHistory;
    sub.version = currentVersion + 1;
    sub.updatedAt = now;

    store[submissionId] = sub;
    const ok = this._writeStoreRaw(store, 'updateStatus', {
      submissionId,
      status: newStatus,
      studentId: sub.studentId,
      version: sub.version
    });

    return ok ? sub : null;
  },

  /**
   * Migrate existing legacy progress if found in b2b_student_lesson_progress
   * @param {Object} [currentUser=null] Optional student user object
   * @returns {Object|null} Migrated submission or null
   */
  migrateFromLegacyProgress(currentUser = null) {
    if (!this.isAvailable()) return null;
    try {
      const raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
      if (!raw) return null;

      const progress = JSON.parse(raw);
      if (!progress || typeof progress !== 'object') return null;

      // Check if already migrated
      if (progress.isMigrated && progress.submissionId) {
        return this.getSubmission(progress.submissionId);
      }

      // Check if legacy progress has a submission
      if (!progress.submission || !progress.submission.link) {
        return null;
      }

      const studentId = (currentUser && currentUser.id) || 'usr_stu_001';
      const studentName = (currentUser && currentUser.name) || 'Alex Pratama';
      const lessonId = 'les_scratch_motion_01';

      // Check if record already exists in store
      const store = this._readStoreRaw();
      let existing = Object.values(store).find(
        (s) => s.studentId === studentId && s.lessonId === lessonId
      );

      let subRecord;
      if (existing) {
        subRecord = existing;
      } else {
        subRecord = this.saveSubmission({
          id: 'sub_001', // preserve known default ID for Alex
          studentId,
          studentName,
          lessonId,
          projectUrl: progress.submission.link,
          studentNotes: progress.submission.notes || '',
          submittedAt: progress.submission.submittedAt || new Date().toISOString(),
          status: progress.state === 'approved' ? 'approved' : 'submitted'
        });
      }

      // Mark legacy progress with reference without breaking original fields
      progress.isMigrated = true;
      progress.submissionId = (subRecord && subRecord.id) || 'sub_001';
      localStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify(progress));

      console.log('🔄 StateStore: Migrasi legacy progress berhasil dikaitkan ke submission store.');
      return subRecord;
    } catch (err) {
      console.warn('StateStore: Migrasi legacy progress dilewati/gagal:', err);
      return null;
    }
  },

  /**
   * Subscribe to changes from both other tabs (storage event) and same tab (custom event)
   * @param {Function} callback Callback receiving { action, meta, timestamp }
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof window === 'undefined' || typeof callback !== 'function') {
      return () => {};
    }

    // 1. Cross-tab storage listener
    const handleStorage = (e) => {
      if (e.key === SUBMISSION_STORE_KEY) {
        callback({ action: 'crossTabStorage', key: e.key, newValue: e.newValue });
      }
    };

    // 2. Same-tab custom event listener
    const handleCustom = (e) => {
      callback(e.detail || { action: 'localChange' });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(STATE_STORE_EVENT, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STATE_STORE_EVENT, handleCustom);
    };
  }
};
