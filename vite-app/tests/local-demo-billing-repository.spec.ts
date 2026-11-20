import { expect, test } from "@playwright/test";

test.describe("Canonical local-demo billing adapter", () => {
  test("separates student unpaid invoices from Parent Hub history", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoBillingRepository } = await import("/src/data/local-demo-billing-repository.ts");
      const unpaid = { id:"invoice-unpaid", studentId:"student-1", period:"2026-10" as const, status:"unpaid" as const, currency:"IDR" as const, rateSnapshot:100000, items:[], totalSessions:0, subtotalAmount:0, discountAmount:0, additionalCharges:0, totalAmount:0, adjustmentNote:"", createdAt:"2026-11-01T00:00:00Z", createdBy:"admin-1", updatedAt:"2026-11-01T00:00:00Z", updatedBy:"admin-1", issuedAt:"2026-11-01T00:00:00Z", issuedBy:"admin-1" };
      const paid = { ...unpaid, id:"invoice-paid", status:"paid" as const };
      const store = {
        getRate: () => ({ studentId:"student-1", amountPerSession:100000, currency:"IDR" as const, updatedAt:"2026-11-01T00:00:00Z", updatedBy:"admin-1" }),
        getInvoices: () => [unpaid, paid],
        getStudentInvoices: () => [unpaid, paid],
        getUnpaidStudentInvoices: () => [unpaid],
        setRate: () => ({ success:true as const, rate:{ studentId:"student-1", amountPerSession:100000, currency:"IDR" as const, updatedAt:"2026-11-01T00:00:00Z", updatedBy:"admin-1" } }),
        createInvoice: () => ({ success:true as const, invoice:unpaid }),
        updateDraftInvoice: () => ({ success:true as const, invoice:unpaid }),
        issueInvoice: () => ({ success:true as const, invoice:unpaid }),
        markPaid: () => ({ success:true as const, invoice:paid }),
        subscribe: () => () => {}
      };
      const student = createLocalDemoBillingRepository(store, () => ({ id:"student-1", role:"student" }));
      const otherStudent = createLocalDemoBillingRepository(store, () => ({ id:"student-2", role:"student" }));
      const admin = createLocalDemoBillingRepository(store, () => ({ id:"admin-1", role:"admin" }));
      return {
        dashboard:(await student.getStudentInvoices("student-1")).map(item => item.id),
        history:(await student.getStudentInvoiceHistory("student-1")).map(item => item.id),
        foreignHistory:(await otherStudent.getStudentInvoiceHistory("student-1")).length,
        adminAll:(await admin.listInvoices()).length,
        adminTariff:(await admin.setStudentTariff("student-1", 120000)).success
      };
    });
    expect(result.dashboard).toEqual(["invoice-unpaid"]);
    expect(result.history).toEqual(["invoice-unpaid", "invoice-paid"]);
    expect(result.foreignHistory).toBe(0);
    expect(result.adminAll).toBe(2);
    expect(result.adminTariff).toBe(true);
  });

  test("blocks student billing mutations and normalizes admin store errors", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoBillingRepository } = await import("/src/data/local-demo-billing-repository.ts");
      const store = {
        getRate: () => null, getInvoices: () => [], getStudentInvoices: () => [], getUnpaidStudentInvoices: () => [],
        setRate: () => ({ success:false as const, error:"INVALID_RATE", message:"Tarif tidak valid." }),
        createInvoice: () => ({ success:false as const, error:"NO_BILLABLE_SESSIONS", message:"Tidak ada sesi." }),
        updateDraftInvoice: () => ({ success:false as const, error:"DRAFT_LOCKED" }),
        issueInvoice: () => ({ success:false as const, error:"INVALID_STATUS" }),
        markPaid: () => ({ success:false as const, error:"INVALID_STATUS" }),
        subscribe: () => () => {}
      };
      const student = createLocalDemoBillingRepository(store, () => ({ id:"student-1", role:"student" }));
      const admin = createLocalDemoBillingRepository(store, () => ({ id:"admin-1", role:"admin" }));
      const blocked = await student.createDraftInvoice("student-1", "2026-10");
      const denied = await admin.createDraftInvoice("student-1", "2026-10");
      return { blockedCode:blocked.success ? null : blocked.error.code, deniedCode:denied.success ? null : denied.error.code };
    });
    expect(result.blockedCode).toBe("FORBIDDEN");
    expect(result.deniedCode).toBe("NO_BILLABLE_SESSIONS");
  });
});
