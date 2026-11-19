/**
 * B2B LEARNING ENGINE — LOCAL DEMO BILLING STORE
 *
 * Admin-managed per-student session rates and invoice snapshots.
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

  getStudentInvoices(studentId) {
    if (!studentId) return [];
    return this.getInvoices().filter(invoice => invoice.studentId === studentId);
  },

  getUnpaidStudentInvoices(studentId) {
    return this.getStudentInvoices(studentId).filter(invoice => invoice.status === 'unpaid');
  },

  createInvoice(studentId, period, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat membuat tagihan.' };
    if (typeof studentId !== 'string' || !studentId.trim() || !/^\\d{4}-\\d{2}$/.test(period || '') ||
        Number(period.slice(5, 7)) < 1 || Number(period.slice(5, 7)) > 12) {
      return { success: false, error: 'INVALID_INPUT', message: 'Siswa dan periode tagihan harus valid.' };
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
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    if (!Number.isSafeInteger(totalAmount)) {
      return { success: false, error: 'AMOUNT_OVERFLOW', message: 'Total tagihan melebihi batas angka yang didukung.' };
    }

    const now = new Date().toISOString();
    const invoice = {
      id: makeId(),
      studentId,
      period,
      status: 'unpaid',
      currency: 'IDR',
      rateSnapshot: rate.amountPerSession,
      items,
      totalSessions: items.length,
      totalAmount,
      createdAt: now,
      createdBy: actor.id,
      paidAt: null,
      paidBy: null
    };
    data.invoices[invoice.id] = invoice;
    return this._write(data, 'invoiceCreated', { invoiceId: invoice.id, studentId, period })
      ? { success: true, invoice }
      : { success: false, error: 'WRITE_FAILED', message: 'Tagihan gagal disimpan.' };
  },

  markPaid(invoiceId, actor) {
    if (!isAdmin(actor)) return { success: false, error: 'FORBIDDEN', message: 'Hanya admin yang dapat menandai tagihan lunas.' };
    const data = this._read();
    const invoice = data.invoices[invoiceId];
    if (!invoice) return { success: false, error: 'NOT_FOUND', message: 'Tagihan tidak ditemukan.' };
    if (invoice.status !== 'unpaid') return { success: false, error: 'INVALID_STATUS', message: 'Tagihan ini bukan tagihan yang belum dibayar.' };
    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    invoice.paidBy = actor.id;
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
