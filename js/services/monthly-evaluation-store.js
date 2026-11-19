/**
 * Monthly progress evaluations for the local demo.
 * Published evaluations are visible only in the matching student's Parent Hub.
 * This store is not a production authorization boundary.
 */
export const MONTHLY_EVALUATION_STORE_KEY = 'b2b_monthly_evaluations_store';
export const MONTHLY_EVALUATION_STORE_EVENT = 'b2b_monthly_evaluations_change';

const RATINGS = [
  'Sangat baik',
  'Baik',
  'Berkembang sesuai proses',
  'Membutuhkan pendampingan lebih lanjut'
];

function readStore() {
  try {
    const value = JSON.parse(localStorage.getItem(MONTHLY_EVALUATION_STORE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeStore(store, action, evaluationId) {
  try {
    localStorage.setItem(MONTHLY_EVALUATION_STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(MONTHLY_EVALUATION_STORE_EVENT, {
      detail: { action, evaluationId, timestamp: new Date().toISOString() }
    }));
    return true;
  } catch {
    return false;
  }
}

function isValidPeriod(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return false;
  const [year, month] = value.split('-').map(Number);
  return year >= 2020 && year <= 2200 && month >= 1 && month <= 12;
}

export const MonthlyEvaluationStore = {
  getAll() {
    return Object.values(readStore()).sort((a, b) => b.period.localeCompare(a.period));
  },

  getTutorEvaluations(tutorId) {
    if (!tutorId) return [];
    return this.getAll().filter(item => item.tutorId === tutorId);
  },

  getStudentPublished(studentId) {
    if (!studentId) return [];
    return this.getAll().filter(item => item.studentId === studentId && item.status === 'published');
  },

  save(data, status = 'draft') {
    if (!data || typeof data !== 'object' || !['draft', 'published'].includes(status)) {
      return { success: false, error: 'INVALID_DATA', message: 'Data evaluasi tidak valid.' };
    }
    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const tutorId = typeof data.tutorId === 'string' ? data.tutorId.trim() : '';
    const period = typeof data.period === 'string' ? data.period : '';
    const rating = typeof data.rating === 'string' ? data.rating : '';
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    const strengths = typeof data.strengths === 'string' ? data.strengths.trim() : '';
    const nextGoals = typeof data.nextGoals === 'string' ? data.nextGoals.trim() : '';

    if (!studentId || !tutorId || !isValidPeriod(period)) {
      return { success: false, error: 'INVALID_SCOPE', message: 'Siswa, tutor, dan periode bulan wajib valid.' };
    }
    if (status === 'published' && (!RATINGS.includes(rating) || !summary || !strengths || !nextGoals)) {
      return { success: false, error: 'INCOMPLETE', message: 'Lengkapi penilaian, ringkasan, kekuatan, dan target bulan berikutnya sebelum mengirim.' };
    }

    const store = readStore();
    const existing = Object.values(store).find(item =>
      item.studentId === studentId && item.tutorId === tutorId && item.period === period
    );
    const id = existing?.id || data.id || `monthly_${studentId}_${period}_${tutorId}`;
    const now = new Date().toISOString();
    const record = {
      id,
      studentId,
      studentName: String(data.studentName || existing?.studentName || 'Siswa'),
      tutorId,
      tutorName: String(data.tutorName || existing?.tutorName || 'Tutor'),
      period,
      rating: rating || existing?.rating || '',
      summary,
      strengths,
      nextGoals,
      status,
      version: (existing?.version || 0) + 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      publishedAt: status === 'published' ? now : (existing?.publishedAt || null)
    };
    store[id] = record;
    return writeStore(store, status === 'published' ? 'publish' : 'saveDraft', id)
      ? { success: true, evaluation: record }
      : { success: false, error: 'WRITE_FAILED', message: 'Evaluasi gagal disimpan di penyimpanan lokal.' };
  },

  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const custom = event => callback(event.detail);
    const storage = event => {
      if (event.key === MONTHLY_EVALUATION_STORE_KEY) callback({ action: 'storageSync' });
    };
    window.addEventListener(MONTHLY_EVALUATION_STORE_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(MONTHLY_EVALUATION_STORE_EVENT, custom);
      window.removeEventListener('storage', storage);
    };
  },

  get ratings() {
    return [...RATINGS];
  }
};
