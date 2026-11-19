/**
 * Async repository boundary for billing mutations.
 * The local billing store remains demo persistence, not production authorization.
 */
import { BillingStore } from './billing-store.js';

export { BillingStore };

export const BillingRepository = {
  async setRate(studentId, amountPerSession, actor) {
    return BillingStore.setRate(studentId, amountPerSession, actor);
  },
  async createInvoice(studentId, period, actor) {
    return BillingStore.createInvoice(studentId, period, actor);
  },
  async updateDraftInvoice(invoiceId, changes, actor) {
    return BillingStore.updateDraftInvoice(invoiceId, changes, actor);
  },
  async issueInvoice(invoiceId, actor) {
    return BillingStore.issueInvoice(invoiceId, actor);
  },
  async markPaid(invoiceId, actor) {
    return BillingStore.markPaid(invoiceId, actor);
  }
};
