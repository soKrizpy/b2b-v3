/**
 * B2B LEARNING ENGINE — OPERATIONAL CLASS SESSION STORE
 *
 * This store records whether a scheduled class actually happened and the
 * attendance recorded by its assigned tutor. Session reports remain in
 * SessionStore and are intentionally not used as billing evidence.
 *
 * Local demo storage only. This is not server-side authorization or production
 * persistence. Invoice amounts and payment state belong to a separate module.
 */

export const CLASS_SESSION_STORE_KEY = 'b2b_class_sessions_store';
export const CLASS_SESSION_STORE_EVENT = 'b2b_class_session_store_change';

const SESSION_STATUSES = ['scheduled', 'held', 'not_held', 'cancelled', 'soft_deleted'];
const ATTENDANCE_STATUSES = ['not_recorded', 'present', 'late', 'absent'];

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cls_${crypto.randomUUID()}`;
  }
  return `cls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function validActor(actor, roles) {
  return Boolean(actor && typeof actor.id === 'string' && actor.id.trim() && roles.includes(actor.role));
}

function notify(action, meta = null) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(CLASS_SESSION_STORE_EVENT, {
      detail: { action, meta, timestamp: new Date().toISOString() }
    }));
  }
}

export const ClassSessionStore = {
  _read() {
    try {
      const raw = localStorage.getItem(CLASS_SESSION_STORE_KEY);
      if (!raw) return {};
      const value = JSON.parse(raw);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      console.error('ClassSessionStore: gagal membaca penyimpanan sesi.', error);
      return {};
    }
  },

  _write(records, action, meta = null) {
    try {
      localStorage.setItem(CLASS_SESSION_STORE_KEY, JSON.stringify(records));
      notify(action, meta);
      return true;
    } catch (error) {
      console.error('ClassSessionStore: gagal menyimpan sesi.', error);
      return false;
    }
  },

  getAllSessions() {
    return Object.values(this._read()).sort((a, b) =>
      new Date(b.scheduledStartAt).getTime() - new Date(a.scheduledStartAt).getTime()
    );
  },

  getSession(sessionId) {
    if (!sessionId) return null;
    return this._read()[sessionId] || null;
  },

  getStudentSessions(studentId) {
    if (!studentId) return [];
    return this.getAllSessions().filter(session => session.studentId === studentId);
  },

  _hasScheduleConflict(candidate, records = this._read(), excludeSessionId = null) {
    const candidateStart = new Date(candidate.scheduledStartAt).getTime();
    const candidateEnd = candidateStart + Number(candidate.durationMinutes) * 60000;
    if (!Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd)) return [];

    return Object.values(records).filter(existing => {
      if (!existing || existing.id === excludeSessionId) return false;
      if (!['scheduled', 'held', 'not_held'].includes(existing.status)) return false;
      if (existing.tutorId !== candidate.tutorId && existing.studentId !== candidate.studentId) return false;
      const existingStart = new Date(existing.scheduledStartAt).getTime();
      const existingEnd = existingStart + Number(existing.durationMinutes) * 60000;
      return Number.isFinite(existingStart) && Number.isFinite(existingEnd) &&
        candidateStart < existingEnd && candidateEnd > existingStart;
    }).map(session => ({
      sessionId: session.id,
      studentId: session.studentId,
      tutorId: session.tutorId,
      scheduledStartAt: session.scheduledStartAt,
      durationMinutes: session.durationMinutes,
      conflictType: session.tutorId === candidate.tutorId ? 'tutor' : 'student'
    }));
  },

  findNextAvailableSlot(data, options = {}) {
    if (!data || !data.scheduledStartAt) {
      return { success: false, error: 'INVALID_START', message: 'Waktu mulai untuk pencarian slot wajib diisi.' };
    }
    const start = new Date(data.scheduledStartAt);
    const duration = Number(data.durationMinutes);
    const stepMinutes = Number(options.stepMinutes || 30);
    const maxDays = Number(options.maxDays || 30);
    if (Number.isNaN(start.getTime()) || !Number.isInteger(duration) || duration < 1 ||
        !Number.isInteger(stepMinutes) || stepMinutes < 1 || !Number.isInteger(maxDays) || maxDays < 1) {
      return { success: false, error: 'INVALID_SEARCH', message: 'Parameter pencarian jadwal tidak valid.' };
    }

    const records = this._read();
    const maxAttempts = Math.ceil((maxDays * 24 * 60) / stepMinutes);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const candidateStart = new Date(start.getTime() + attempt * stepMinutes * 60000);
      const candidate = { ...data, scheduledStartAt: candidateStart.toISOString(), durationMinutes: duration };
      if (this._hasScheduleConflict(candidate, records, options.excludeSessionId).length === 0) {
        return { success: true, scheduledStartAt: candidate.scheduledStartAt, checkedSlots: attempt };
      }
    }
    return { success: false, error: 'NO_AVAILABLE_SLOT', message: 'Tidak ditemukan slot kosong dalam rentang pencarian.' };
  },

  createSession(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'INVALID_DATA', message: 'Data sesi tidak valid.' };
    }
    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const tutorId = typeof data.tutorId === 'string' ? data.tutorId.trim() : '';
    const seriesId = typeof data.seriesId === 'string' ? data.seriesId.trim() : '';
    const start = typeof data.scheduledStartAt === 'string' ? new Date(data.scheduledStartAt) : null;
    const duration = Number(data.durationMinutes);
    const sessionNumber = Number(data.sessionNumber);

    if (!studentId || !tutorId || !seriesId) {
      return { success: false, error: 'REQUIRED_FIELDS', message: 'Siswa, tutor, dan seri pertemuan wajib diisi.' };
    }
    if (!start || Number.isNaN(start.getTime())) {
      return { success: false, error: 'INVALID_START', message: 'Waktu mulai sesi tidak valid.' };
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
      return { success: false, error: 'INVALID_DURATION', message: 'Durasi sesi harus 1–480 menit.' };
    }
    if (!Number.isInteger(sessionNumber) || sessionNumber < 1) {
      return { success: false, error: 'INVALID_SESSION_NUMBER', message: 'Nomor sesi harus bilangan bulat positif.' };
    }

    const records = this._read();
    const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : makeId();
    if (records[id]) {
      return { success: false, error: 'DUPLICATE_ID', message: 'ID sesi sudah digunakan.' };
    }

    const candidate = {
      id, studentId, tutorId, seriesId,
      scheduledStartAt: start.toISOString(),
      durationMinutes: duration
    };
    const conflicts = this._hasScheduleConflict(candidate, records);
    if (conflicts.length) {
      const suggestion = this.findNextAvailableSlot(candidate);
      return {
        success: false,
        error: 'SCHEDULE_CONFLICT',
        message: 'Jadwal bentrok dengan sesi lain untuk tutor atau siswa yang sama.',
        conflicts,
        suggestedStartAt: suggestion.success ? suggestion.scheduledStartAt : null
      };
    }

    const now = new Date().toISOString();
    const session = {
      id,
      seriesId,
      sessionNumber,
      studentId,
      tutorId,
      scheduledStartAt: start.toISOString(),
      durationMinutes: duration,
      meetingUrl: typeof data.meetingUrl === 'string' ? data.meetingUrl.trim() : '',
      status: 'scheduled',
      attendanceStatus: 'not_recorded',
      attendanceRecordedBy: null,
      attendanceRecordedAt: null,
      cancellation: null,
      replacementRequired: false,
      replacementSessionId: null,
      replacementForSessionId: data.replacementForSessionId || null,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    records[id] = session;
    return this._write(records, 'create', { sessionId: id })
      ? { success: true, session }
      : { success: false, error: 'WRITE_FAILED', message: 'Sesi gagal disimpan.' };
  },

  createSessionSeries(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.sessions) || data.sessions.length === 0) {
      return { success: false, error: 'INVALID_SERIES', message: 'Seri harus berisi minimal satu jadwal sesi.' };
    }

    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const tutorId = typeof data.tutorId === 'string' ? data.tutorId.trim() : '';
    const seriesId = typeof data.seriesId === 'string' ? data.seriesId.trim() : '';
    const duration = Number(data.durationMinutes);
    if (!studentId || !tutorId || !seriesId) {
      return { success: false, error: 'REQUIRED_FIELDS', message: 'Siswa, tutor, dan seri pertemuan wajib diisi.' };
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
      return { success: false, error: 'INVALID_DURATION', message: 'Durasi sesi harus 1–480 menit.' };
    }

    const records = this._read();
    const draftRecords = { ...records };
    const ids = new Set();
    const sessionNumbers = new Set();
    const sessions = [];
    const conflicts = [];
    const now = new Date().toISOString();

    for (const item of data.sessions) {
      const start = item && typeof item.scheduledStartAt === 'string' ? new Date(item.scheduledStartAt) : null;
      const sessionNumber = Number(item && item.sessionNumber);
      const id = item && typeof item.id === 'string' && item.id.trim() ? item.id.trim() : makeId();

      if (!start || Number.isNaN(start.getTime())) {
        return { success: false, error: 'INVALID_START', message: 'Salah satu waktu mulai sesi tidak valid.' };
      }
      if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumbers.has(sessionNumber)) {
        return { success: false, error: 'INVALID_SESSION_NUMBER', message: 'Nomor sesi harus unik dan berupa bilangan bulat positif.' };
      }
      if (records[id] || ids.has(id)) {
        return { success: false, error: 'DUPLICATE_ID', message: 'ID sesi sudah digunakan.' };
      }

      const session = {
        id, seriesId, sessionNumber, studentId, tutorId,
        scheduledStartAt: start.toISOString(),
        durationMinutes: duration,
        meetingUrl: typeof item.meetingUrl === 'string'
          ? item.meetingUrl.trim()
          : (typeof data.meetingUrl === 'string' ? data.meetingUrl.trim() : ''),
        status: 'scheduled',
        attendanceStatus: 'not_recorded',
        attendanceRecordedBy: null,
        attendanceRecordedAt: null,
        cancellation: null,
        replacementRequired: false,
        replacementSessionId: null,
        replacementForSessionId: null,
        deletedAt: null,
        deletedBy: null,
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      const sessionConflicts = this._hasScheduleConflict(session, draftRecords);
      if (sessionConflicts.length) {
        conflicts.push({ sessionId: id, sessionNumber, conflicts: sessionConflicts });
      }
      ids.add(id);
      sessionNumbers.add(sessionNumber);
      draftRecords[id] = session;
      sessions.push(session);
    }

    if (conflicts.length) {
      return {
        success: false,
        error: 'SCHEDULE_CONFLICT',
        message: 'Seri tidak disimpan karena satu atau lebih jadwal bentrok.',
        conflicts
      };
    }

    return this._write(draftRecords, 'createSeries', { seriesId, sessionIds: sessions.map(session => session.id) })
      ? { success: true, seriesId, sessions }
      : { success: false, error: 'WRITE_FAILED', message: 'Seri sesi gagal disimpan.' };
  },

  createRecurringSessionSeries(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'INVALID_SERIES', message: 'Pengaturan seri pertemuan tidak valid.' };
    }

    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
    const tutorId = typeof data.tutorId === 'string' ? data.tutorId.trim() : '';
    const startDate = typeof data.startDate === 'string' ? data.startDate : '';
    const startTime = typeof data.startTime === 'string' ? data.startTime : '';
    const weekdays = Array.isArray(data.weekdays)
      ? [...new Set(data.weekdays.map(Number))]
      : [];
    const targetCount = Number(data.targetCount);
    const durationMinutes = Number(data.durationMinutes);
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime);

    if (!studentId || !tutorId || !dateMatch || !timeMatch ||
        !weekdays.length || weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      return { success: false, error: 'INVALID_INPUT', message: 'Siswa, tutor, tanggal mulai, jam, dan minimal satu hari harus dipilih.' };
    }
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 100) {
      return { success: false, error: 'INVALID_TARGET_COUNT', message: 'Jumlah pertemuan harus 1–100.' };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
      return { success: false, error: 'INVALID_DURATION', message: 'Durasi sesi harus 1–480 menit.' };
    }

    const [year, month, day] = dateMatch.slice(1).map(Number);
    const firstUtcDate = new Date(Date.UTC(year, month - 1, day));
    if (firstUtcDate.getUTCFullYear() !== year ||
        firstUtcDate.getUTCMonth() !== month - 1 ||
        firstUtcDate.getUTCDate() !== day) {
      return { success: false, error: 'INVALID_START_DATE', message: 'Tanggal mulai tidak valid.' };
    }

    const seriesId = typeof data.seriesId === 'string' && data.seriesId.trim()
      ? data.seriesId.trim()
      : makeId();
    const draftRecords = this._read();
    const sessions = [];
    const skippedSlots = [];
    const now = Date.now();

    // The LMS scheduling calendar uses WIB (Asia/Jakarta). If a selected slot conflicts,
    // the occurrence is skipped and the next selected weekday is considered.
    for (let offset = 0; offset < 365 * 3 && sessions.length < targetCount; offset += 1) {
      const occurrenceDate = new Date(firstUtcDate);
      occurrenceDate.setUTCDate(firstUtcDate.getUTCDate() + offset);
      if (!weekdays.includes(occurrenceDate.getUTCDay())) continue;

      const dateLabel = [
        occurrenceDate.getUTCFullYear(),
        String(occurrenceDate.getUTCMonth() + 1).padStart(2, '0'),
        String(occurrenceDate.getUTCDate()).padStart(2, '0')
      ].join('-');
      const scheduledStart = new Date(dateLabel + 'T' + startTime + ':00+07:00');
      if (scheduledStart.getTime() <= now) {
        skippedSlots.push({ scheduledStartAt: scheduledStart.toISOString(), reason: 'PAST' });
        continue;
      }

      const sessionNumber = sessions.length + 1;
      const candidate = {
        id: makeId(),
        seriesId,
        sessionNumber,
        studentId,
        tutorId,
        scheduledStartAt: scheduledStart.toISOString(),
        durationMinutes,
        status: 'scheduled'
      };
      const conflicts = this._hasScheduleConflict(candidate, draftRecords);
      if (conflicts.length) {
        skippedSlots.push({
          scheduledStartAt: candidate.scheduledStartAt,
          reason: 'CONFLICT',
          conflicts
        });
        continue;
      }

      sessions.push({
        id: candidate.id,
        sessionNumber,
        scheduledStartAt: candidate.scheduledStartAt
      });
      draftRecords[candidate.id] = candidate;
    }

    if (sessions.length !== targetCount) {
      return {
        success: false,
        error: 'INSUFFICIENT_SLOTS',
        message: 'Jumlah slot bebas tidak mencukupi dalam rentang pencarian tiga tahun.',
        requestedCount: targetCount,
        availableCount: sessions.length,
        skippedSlots
      };
    }

    const created = this.createSessionSeries({
      studentId,
      tutorId,
      seriesId,
      durationMinutes,
      meetingUrl: typeof data.meetingUrl === 'string' ? data.meetingUrl : '',
      sessions
    });
    return created.success
      ? { ...created, requestedCount: targetCount, skippedSlots }
      : created;
  },

  recordAttendance(sessionId, attendanceStatus, actor) {
    if (!validActor(actor, ['tutor'])) {
      return { success: false, error: 'FORBIDDEN', message: 'Hanya tutor yang dapat mencatat kehadiran.' };
    }
    if (!ATTENDANCE_STATUSES.filter(status => status !== 'not_recorded').includes(attendanceStatus)) {
      return { success: false, error: 'INVALID_ATTENDANCE', message: 'Status kehadiran tidak valid.' };
    }

    const records = this._read();
    const session = records[sessionId];
    if (!session) return { success: false, error: 'NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    if (session.tutorId !== actor.id) {
      return { success: false, error: 'NOT_ASSIGNED_TUTOR', message: 'Hanya tutor yang ditugaskan pada sesi ini yang dapat mencatat kehadiran.' };
    }
    if (session.status !== 'scheduled') {
      return { success: false, error: 'INVALID_TRANSITION', message: 'Kehadiran hanya dapat dicatat untuk sesi yang masih terjadwal.' };
    }

    const now = new Date().toISOString();
    session.attendanceStatus = attendanceStatus;
    session.status = attendanceStatus === 'absent' ? 'not_held' : 'held';
    session.attendanceRecordedBy = actor.id;
    session.attendanceRecordedAt = now;
    session.updatedAt = now;
    session.version = (session.version || 1) + 1;

    return this._write(records, 'attendanceRecorded', { sessionId, attendanceStatus })
      ? { success: true, session }
      : { success: false, error: 'WRITE_FAILED', message: 'Kehadiran gagal disimpan.' };
  },

  cancelSession(sessionId, actor, reason = '') {
    if (!validActor(actor, ['tutor', 'admin'])) {
      return { success: false, error: 'FORBIDDEN', message: 'Aksi pembatalan tidak diizinkan.' };
    }
    if (actor.role === 'tutor' && !String(reason).trim()) {
      return { success: false, error: 'REASON_REQUIRED', message: 'Tutor wajib mengisi alasan pembatalan.' };
    }

    const records = this._read();
    const session = records[sessionId];
    if (!session) return { success: false, error: 'NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    if (actor.role === 'tutor' && session.tutorId !== actor.id) {
      return { success: false, error: 'NOT_ASSIGNED_TUTOR', message: 'Tutor bukan penanggung jawab sesi ini.' };
    }
    if (session.status !== 'scheduled') {
      return { success: false, error: 'INVALID_TRANSITION', message: 'Hanya sesi terjadwal yang dapat dibatalkan.' };
    }

    const now = new Date().toISOString();
    session.status = 'cancelled';
    session.attendanceStatus = 'not_recorded';
    session.cancellation = {
      actorId: actor.id,
      actorRole: actor.role,
      reason: String(reason).trim(),
      cancelledAt: now
    };
    session.replacementRequired = actor.role === 'tutor';
    session.updatedAt = now;
    session.version = (session.version || 1) + 1;

    return this._write(records, 'cancel', { sessionId, actorRole: actor.role })
      ? { success: true, session }
      : { success: false, error: 'WRITE_FAILED', message: 'Pembatalan gagal disimpan.' };
  },

  softDeleteSession(sessionId, actor) {
    if (!validActor(actor, ['admin'])) {
      return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat menghapus sesi secara administratif.' };
    }
    const records = this._read();
    const session = records[sessionId];
    if (!session) return { success: false, error: 'NOT_FOUND', message: 'Sesi tidak ditemukan.' };
    if (session.status !== 'scheduled') {
      return { success: false, error: 'INVALID_TRANSITION', message: 'Hanya sesi terjadwal yang dapat dihapus secara administratif.' };
    }

    const now = new Date().toISOString();
    session.status = 'soft_deleted';
    session.deletedAt = now;
    session.deletedBy = actor.id;
    session.replacementRequired = true;
    session.updatedAt = now;
    session.version = (session.version || 1) + 1;

    return this._write(records, 'softDelete', { sessionId })
      ? { success: true, session }
      : { success: false, error: 'WRITE_FAILED', message: 'Sesi gagal ditandai sebagai dihapus.' };
  },

  createReplacementSession(originalSessionId, data, actor) {
    if (!validActor(actor, ['admin'])) {
      return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat membuat sesi pengganti.' };
    }
    if (!originalSessionId || !data || typeof data !== 'object') {
      return { success: false, error: 'INVALID_REPLACEMENT', message: 'Data sesi pengganti tidak valid.' };
    }

    const records = this._read();
    const original = records[originalSessionId];
    if (!original) return { success: false, error: 'NOT_FOUND', message: 'Sesi asal tidak ditemukan.' };
    if (!original.replacementRequired || original.replacementSessionId ||
        !['cancelled', 'soft_deleted'].includes(original.status)) {
      return { success: false, error: 'REPLACEMENT_NOT_ALLOWED', message: 'Sesi asal tidak membutuhkan pengganti atau sudah memiliki pengganti.' };
    }

    const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : original.studentId;
    const tutorId = typeof data.tutorId === 'string' ? data.tutorId.trim() : original.tutorId;
    const scheduledStartAt = typeof data.scheduledStartAt === 'string' ? data.scheduledStartAt : '';
    const durationMinutes = data.durationMinutes == null ? original.durationMinutes : Number(data.durationMinutes);
    if (studentId !== original.studentId || !tutorId) {
      return { success: false, error: 'REPLACEMENT_MISMATCH', message: 'Sesi pengganti harus untuk siswa yang sama dan memiliki tutor.' };
    }
    if (!scheduledStartAt || Number.isNaN(new Date(scheduledStartAt).getTime())) {
      return { success: false, error: 'INVALID_START', message: 'Waktu sesi pengganti tidak valid.' };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
      return { success: false, error: 'INVALID_DURATION', message: 'Durasi sesi pengganti harus 1–480 menit.' };
    }

    const sessionId = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : makeId();
    if (records[sessionId]) return { success: false, error: 'DUPLICATE_ID', message: 'ID sesi pengganti sudah digunakan.' };
    const sessionNumber = Number.isInteger(Number(data.sessionNumber)) && Number(data.sessionNumber) > 0
      ? Number(data.sessionNumber)
      : Math.max(0, ...Object.values(records)
          .filter(session => session && session.seriesId === original.seriesId)
          .map(session => Number(session.sessionNumber) || 0)) + 1;

    const created = this.createSession({
      id: sessionId,
      seriesId: original.seriesId,
      sessionNumber,
      studentId: original.studentId,
      tutorId,
      scheduledStartAt,
      durationMinutes,
      meetingUrl: typeof data.meetingUrl === 'string' ? data.meetingUrl : original.meetingUrl,
      replacementForSessionId: originalSessionId
    });
    if (!created.success) return created;

    const linked = this.linkReplacement(originalSessionId, sessionId, actor);
    if (!linked.success) {
      const rollback = this._read();
      delete rollback[sessionId];
      this._write(rollback, 'replacementRollback', { originalSessionId, replacementSessionId: sessionId });
      return { success: false, error: linked.error, message: linked.message };
    }

    return { success: true, original: linked.original, replacement: linked.replacement };
  },

  linkReplacement(originalSessionId, replacementSessionId, actor) {
    if (!validActor(actor, ['admin'])) {
      return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat menghubungkan sesi pengganti.' };
    }
    if (!originalSessionId || !replacementSessionId || originalSessionId === replacementSessionId) {
      return { success: false, error: 'INVALID_REPLACEMENT', message: 'Sesi pengganti tidak valid.' };
    }

    const records = this._read();
    const original = records[originalSessionId];
    const replacement = records[replacementSessionId];
    if (!original || !replacement) {
      return { success: false, error: 'NOT_FOUND', message: 'Sesi asal atau pengganti tidak ditemukan.' };
    }
    if (!original.replacementRequired || original.replacementSessionId) {
      return { success: false, error: 'REPLACEMENT_NOT_ALLOWED', message: 'Sesi ini tidak membutuhkan pengganti atau sudah memiliki pengganti.' };
    }
    if (!['cancelled', 'soft_deleted'].includes(original.status) || replacement.status !== 'scheduled') {
      return { success: false, error: 'INVALID_REPLACEMENT_STATE', message: 'Status sesi asal atau pengganti tidak sesuai.' };
    }
    if (original.studentId !== replacement.studentId || original.seriesId !== replacement.seriesId) {
      return { success: false, error: 'REPLACEMENT_MISMATCH', message: 'Sesi pengganti harus untuk siswa dan seri pertemuan yang sama.' };
    }
    if (replacement.replacementForSessionId && replacement.replacementForSessionId !== originalSessionId) {
      return { success: false, error: 'REPLACEMENT_ALREADY_LINKED', message: 'Sesi ini sudah menjadi pengganti untuk sesi lain.' };
    }

    const now = new Date().toISOString();
    original.replacementSessionId = replacementSessionId;
    original.updatedAt = now;
    original.version = (original.version || 1) + 1;
    replacement.replacementForSessionId = originalSessionId;
    replacement.updatedAt = now;
    replacement.version = (replacement.version || 1) + 1;

    return this._write(records, 'replacementLinked', { originalSessionId, replacementSessionId })
      ? { success: true, original, replacement }
      : { success: false, error: 'WRITE_FAILED', message: 'Relasi sesi pengganti gagal disimpan.' };
  },

  isBillable(sessionOrId) {
    const session = typeof sessionOrId === 'string' ? this.getSession(sessionOrId) : sessionOrId;
    return Boolean(session &&
      session.status === 'held' &&
      ['present', 'late'].includes(session.attendanceStatus) &&
      !session.deletedAt);
  },

  getBillableSessions(studentId = null) {
    return this.getAllSessions().filter(session =>
      (!studentId || session.studentId === studentId) && this.isBillable(session)
    );
  },

  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handleCustom = event => callback(event.detail);
    const handleStorage = event => {
      if (event.key === CLASS_SESSION_STORE_KEY) callback({ action: 'storageSync', key: event.key });
    };
    window.addEventListener(CLASS_SESSION_STORE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CLASS_SESSION_STORE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  },

  get allowedStatuses() {
    return [...SESSION_STATUSES];
  },

  get allowedAttendanceStatuses() {
    return [...ATTENDANCE_STATUSES];
  }
};
