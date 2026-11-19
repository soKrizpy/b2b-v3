/**
 * Student-scoped lesson progress repository for the local demo.
 *
 * New progress is isolated by student + lesson. The old unscoped
 * b2b_student_lesson_progress key is intentionally left untouched: it has no
 * reliable owner and must not be silently attributed to the current user.
 * This adapter is demo persistence, not production authorization.
 */
const STORAGE_PREFIX = 'b2b_student_lesson_progress:v2:';
const CHANGE_EVENT = 'b2b_lesson_progress_change';

function storageKey(studentId) {
  return `${STORAGE_PREFIX}${encodeURIComponent(studentId)}`;
}

function readStudentProgress(studentId) {
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return {};
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    console.error('LessonProgressRepository: gagal membaca progres.', error);
    return {};
  }
}

export const LessonProgressRepository = {
  async getProgress(studentId, lessonKey) {
    if (!studentId || !lessonKey) return null;
    return readStudentProgress(studentId)[lessonKey] || null;
  },

  async saveProgress(studentId, lessonKey, updates) {
    if (!studentId || !lessonKey || !updates || typeof updates !== 'object') {
      throw new Error('studentId, lessonKey, dan data progres wajib diisi.');
    }

    const records = readStudentProgress(studentId);
    const existing = records[lessonKey] || {};
    const progress = {
      ...existing,
      ...updates,
      studentId,
      lessonKey,
      topicId: updates.topicId ?? existing.topicId ?? null,
      checkpoints: updates.checkpoints ?? existing.checkpoints ?? {},
      submissionDraft: updates.submissionDraft ?? existing.submissionDraft ?? null,
      slideIndex: Number.isInteger(updates.slideIndex)
        ? updates.slideIndex
        : (Number.isInteger(existing.slideIndex) ? existing.slideIndex : 0),
      updatedAt: new Date().toISOString(),
      version: (Number(existing.version) || 0) + 1
    };

    records[lessonKey] = progress;
    try {
      localStorage.setItem(storageKey(studentId), JSON.stringify(records));
      const detail = { studentId, lessonKey, action: 'save', timestamp: progress.updatedAt };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail }));
      }
      return progress;
    } catch (error) {
      console.error('LessonProgressRepository: gagal menyimpan progres.', error);
      throw new Error('Progres belajar belum berhasil disimpan.');
    }
  },

  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const custom = event => callback(event.detail);
    const storage = event => {
      if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
        callback({ action: 'storageSync', key: event.key });
      }
    };
    window.addEventListener(CHANGE_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, custom);
      window.removeEventListener('storage', storage);
    };
  }
};
