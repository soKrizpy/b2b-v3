/**
 * B2B LEARNING ENGINE — LOCAL DEMO BILLING STORE
 *
 * Admin-managed per-student rates and reviewable monthly invoice drafts.
 * Only held sessions with present/late attendance are invoice-eligible.
 * LocalStorage is demo persistence only; this is not production authorization.
 */

import { ClassSessionStore } from './class-session-store.js';

export const BILLING_STORE_KEY = 'b2b_billing_store';
export const BILLING_STORE_EVENT = 'b2b_billing_store_change';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `inv_${crypto.randomUUID()}`;
  }
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isAdmin(actor) {
  return Boolean(actor && actor.role === 'admin' && typeof actor.id === 'string' && actor.id.trim());
}

function notify(action, meta = null) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(BILLING_STORE_EVENT, {
      detail: { action, meta, timestamp: new Date().toISOString() }
    }));
  }
}

function monthInJakarta(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit'
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}

function currentJakartaMonth() {
  return monthInJakarta(new Date());
}

function validMoney(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

export const BillingStore = {
  _read() {
    try {
      const raw = localStorage.getItem(BILLING_STORE_KEY);
      if (!raw) return { rates: {}, invoices: {} };
      const value = JSON.parse(raw);
      return {
        rates: value && value.rates && typeof value.rates === 'object' ? value.rates : {},
        invoices: value && value.invoices && typeof value.invoices === 'object' ? value.invoices : {}
      };
    } catch (error) {
      console.error('BillingStore: gagal membaca penyimpanan tagihan.', error);
      return { rates: {}, invoices: {} };
    }
  },

  _write(data, action, meta = null) {
    try {
      localStorage.setItem(BILLING_STORE_KEY, JSON.stringify(data));
      notify(action, meta);
      return true;
    } catch (error) {
      console.error('BillingStore: gagal menyimpan tagihan.', error);
      return false;
    }
  },

  getRate(studentId) {
    if (!studentId) return null;
    return this._read().rates[studentId] || null;
  },

  getAllRates() {
    return Object.values(this._read().rates).sort((a, b) => a.studentId.localeCompare(b.studentId));
  },

  setRate(studentId, amountPerSession, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat mengatur tarif.' };
    if (typeof studentId !== 'string' || !studentId.trim()) {
      return { success: false, error: 'INVALID_STUDENT', message: 'Siswa wajib dipilih.' };
    }
    const amount = Number(amountPerSession);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      return { success: false, error: 'INVALID_RATE', message: 'Tarif harus berupa bilangan rupiah positif.' };
    }

    const data = this._read();
    const now = new Date().toISOString();
    const rate = {
      studentId: studentId.trim(),
      amountPerSession: amount,
      currency: 'IDR',
      updatedAt: now,
      updatedBy: actor.id
    };
    data.rates[studentId.trim()] = rate;
    return this._write(data, 'rateUpdated', { studentId: studentId.trim() })
      ? { success: true, rate }
      : { success: false, error: 'WRITE_FAILED', message: 'Tarif gagal disimpan.' };
  },

  getInvoices() {
    return Object.values(this._read().invoices).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Parent Hub only sees invoices that admin has issued; drafts remain admin-only.
  getStudentInvoices(studentId) {
    if (!studentId) return [];
    return this.getInvoices().filter(invoice =>
      invoice.studentId === studentId && invoice.status !== 'draft'
    );
  },

  getUnpaidStudentInvoices(studentId) {
    return this.getStudentInvoices(studentId).filter(invoice => invoice.status === 'unpaid');
  },

  createInvoice(studentId, period, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat membuat tagihan.' };
    if (typeof studentId !== 'string' || !studentId.trim() || !/^[0-9]{4}-[0-9]{2}$/.test(period || '') ||
        Number(period.slice(5, 7)) < 1 || Number(period.slice(5, 7)) > 12) {
      return { success: false, error: 'INVALID_INPUT', message: 'Siswa dan periode tagihan harus valid.' };
    }
    if (period >= currentJakartaMonth()) {
      return { success: false, error: 'PERIOD_NOT_CLOSED', message: 'Tagihan hanya dapat dibuat setelah bulan periode berakhir.' };
    }

    const data = this._read();
    const rate = data.rates[studentId];
    if (!rate) return { success: false, error: 'RATE_NOT_SET', message: 'Tarif siswa belum ditentukan admin.' };

    const alreadyInvoiced = new Set(Object.values(data.invoices).flatMap(invoice =>
      (invoice.items || []).map(item => item.sessionId)
    ));
    const sessions = ClassSessionStore.getBillableSessions(studentId)
      .filter(session => monthInJakarta(session.scheduledStartAt) === period && !alreadyInvoiced.has(session.id))
      .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt));

    if (sessions.length === 0) {
      return { success: false, error: 'NO_BILLABLE_SESSIONS', message: 'Belum ada pertemuan hadir/terlambat yang dapat ditagihkan pada periode ini.' };
    }

    const items = sessions.map(session => ({
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      sessionDate: session.scheduledStartAt,
      amount: rate.amountPerSession
    }));
    const subtotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    if (!Number.isSafeInteger(subtotalAmount)) {
      return { success: false, error: 'AMOUNT_OVERFLOW', message: 'Total tagihan melebihi batas angka yang didukung.' };
    }

    const now = new Date().toISOString();
    const invoice = {
      id: makeId(),
      studentId,
      period,
      status: 'draft',
      currency: 'IDR',
      rateSnapshot: rate.amountPerSession,
      items,
      totalSessions: items.length,
      subtotalAmount,
      discountAmount: 0,
      additionalCharges: 0,
      totalAmount: subtotalAmount,
      adjustmentNote: '',
      createdAt: now,
      createdBy: actor.id,
      updatedAt: now,
      updatedBy: actor.id,
      issuedAt: null,
      issuedBy: null
    };
    data.invoices[invoice.id] = invoice;
    return this._write(data, 'invoiceDraftCreated', { invoiceId: invoice.id, studentId, period })
      ? { success: true, invoice }
      : { success: false, error: 'WRITE_FAILED', message: 'Draft tagihan gagal disimpan.' };
  },

  updateDraftInvoice(invoiceId, changes, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat mengoreksi draft tagihan.' };
    if (!changes || typeof changes !== 'object') {
      return { success: false, error: 'INVALID_INPUT', message: 'Perubahan draft tidak valid.' };
    }
    const data = this._read();
    const invoice = data.invoices[invoiceId];
    if (!invoice) return { success: false, error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan.' };
    if (invoice.status !== 'draft') {
      return { success: false, error: 'DRAFT_LOCKED', message: 'Tagihan yang sudah diterbitkan tidak dapat dikoreksi.' };
    }

    const eligible = new Map(ClassSessionStore.getBillableSessions(invoice.studentId)
      .filter(session => monthInJakarta(session.scheduledStartAt) === invoice.period)
      .map(session => [session.id, session]));
    const otherInvoiceSessionIds = new Set(Object.values(data.invoices)
      .filter(item => item.id !== invoiceId)
      .flatMap(item => (item.items || []).map(line => line.sessionId)));
    const requestedIds = Array.isArray(changes.sessionIds)
      ? [...new Set(changes.sessionIds.map(String))]
      : (invoice.items || []).map(item => item.sessionId);

    if (!requestedIds.length) {
      return { success: false, error: 'EMPTY_INVOICE', message: 'Draft harus memuat minimal satu pertemuan.' };
    }
    if (requestedIds.some(id => !eligible.has(id) || otherInvoiceSessionIds.has(id))) {
      return { success: false, error: 'INVALID_SESSION_SELECTION', message: 'Pertemuan yang dipilih tidak lagi memenuhi syarat atau sudah masuk tagihan lain.' };
    }

    const items = requestedIds.map(id => {
      const session = eligible.get(id);
      return {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        sessionDate: session.scheduledStartAt,
        amount: invoice.rateSnapshot
      };
    });
    const subtotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = changes.discountAmount === undefined ? Number(invoice.discountAmount || 0) : Number(changes.discountAmount);
    const additionalCharges = changes.additionalCharges === undefined ? Number(invoice.additionalCharges || 0) : Number(changes.additionalCharges);
    if (!validMoney(discountAmount) || !validMoney(additionalCharges) || discountAmount > subtotalAmount) {
      return { success: false, error: 'INVALID_ADJUSTMENT', message: 'Diskon dan biaya tambahan harus berupa nominal rupiah valid; diskon tidak boleh melebihi subtotal.' };
    }

    const calculatedTotal = subtotalAmount - discountAmount + additionalCharges;
    const totalAmount = changes.totalAmount === undefined ? calculatedTotal : Number(changes.totalAmount);
    const adjustmentNote = typeof changes.adjustmentNote === 'string'
      ? changes.adjustmentNote.trim()
      : String(invoice.adjustmentNote || '');
    if (!validMoney(totalAmount)) {
      return { success: false, error: 'INVALID_TOTAL', message: 'Total tagihan harus berupa nominal rupiah positif atau nol.' };
    }
    if (totalAmount !== calculatedTotal && !adjustmentNote) {
      return { success: false, error: 'ADJUSTMENT_NOTE_REQUIRED', message: 'Catatan wajib diisi jika total tagihan dikoreksi manual.' };
    }

    const now = new Date().toISOString();
    invoice.items = items;
    invoice.totalSessions = items.length;
    invoice.subtotalAmount = subtotalAmount;
    invoice.discountAmount = discountAmount;
    invoice.additionalCharges = additionalCharges;
    invoice.totalAmount = totalAmount;
    invoice.adjustmentNote = adjustmentNote;
    invoice.updatedAt = now;
    invoice.updatedBy = actor.id;

    return this._write(data, 'invoiceDraftUpdated', { invoiceId })
      ? { success: true, invoice }
      : { success: false, error: 'WRITE_FAILED', message: 'Koreksi draft gagal disimpan.' };
  },

  issueInvoice(invoiceId, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat menerbitkan tagihan.' };
    const data = this._read();
    const invoice = data.invoices[invoiceId];
    if (!invoice) return { success: false, error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan.' };
    if (invoice.status !== 'draft') return { success: false, error: 'INVALID_STATUS', message: 'Hanya draft yang dapat diterbitkan.' };
    if (!Array.isArray(invoice.items) || invoice.items.length === 0 || !validMoney(invoice.totalAmount)) {
      return { success: false, error: 'INVALID_DRAFT', message: 'Draft tagihan belum memiliki rincian yang valid.' };
    }
    invoice.status = 'unpaid';
    invoice.issuedAt = new Date().toISOString();
    invoice.issuedBy = actor.id;
    invoice.updatedAt = invoice.issuedAt;
    invoice.updatedBy = actor.id;
    return this._write(data, 'invoiceIssued', { invoiceId })
      ? { success: true, invoice }
      : { success: false, error: 'WRITE_FAILED', message: 'Tagihan gagal diterbitkan.' };
  },

  markPaid(invoiceId, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat menandai tagihan lunas.' };
    const data = this._read();
    const invoice = data.invoices[invoiceId];
    if (!invoice) return { success: false, error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan.' };
    if (invoice.status !== 'unpaid') return { success: false, error: 'INVALID_STATUS', message: 'Hanya tagihan yang sudah diterbitkan dan belum dibayar yang dapat ditandai lunas.' };
    invoice.status = 'paid';
    return this._write(data, 'invoicePaid', { invoiceId })
      ? { success: true, invoice }
      : { success: false, error: 'WRITE_FAILED', message: 'Status pembayaran gagal disimpan.' };
  },

  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handleCustom = event => callback(event.detail);
    const handleStorage = event => {
      if (event.key === BILLING_STORE_KEY) callback({ action: 'storageSync', key: event.key });
    };
    window.addEventListener(BILLING_STORE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(BILLING_STORE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }
};
