import { expect, test } from "@playwright/test";

test.describe("Production invoice read scopes", () => {
  test("student dashboard excludes paid invoices while Parent Hub history includes them", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseAdminBillingRepository } = await import(
        "/src/data/supabase-admin-billing-repository.ts"
      );
      const rows = [
        { id: "draft-1", student_id: "student-1", status: "draft", month_year: "2026-10", invoice_items: [], invoice_payments: [] },
        { id: "sent-1", student_id: "student-1", status: "sent", month_year: "2026-11", invoice_items: [], invoice_payments: [] },
        { id: "paid-1", student_id: "student-1", status: "paid", month_year: "2026-09", invoice_items: [], invoice_payments: [] },
        { id: "other-student", student_id: "student-2", status: "sent", month_year: "2026-11", invoice_items: [], invoice_payments: [] }
      ];
      const queries: Array<{ table: string; method: string; args: unknown[] }> = [];
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "student-1" } }, error: null }) },
        from: (table: string) => {
          let studentId: string | null = null;
          let statuses: string[] | null = null;
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "order", "eq", "in"]) {
            builder[method] = (...args: unknown[]) => {
              queries.push({ table, method, args });
              if (method === "eq" && args[0] === "student_id") studentId = String(args[1]);
              if (method === "in" && args[0] === "status") statuses = args[1] as string[];
              return builder;
            };
          }
          builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
            const filtered = rows.filter(row =>
              (!studentId || row.student_id === studentId) &&
              (!statuses || statuses.includes(row.status))
            );
            return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
          };
          return builder;
        }
      };
      const repository = createSupabaseAdminBillingRepository(client as never);
      const unpaid = await repository.getStudentInvoices("student-1");
      const history = await repository.getStudentInvoiceHistory("student-1");
      return {
        unpaid: unpaid.map(invoice => ({ id: invoice.id, status: invoice.status })),
        history: history.map(invoice => ({ id: invoice.id, status: invoice.status })),
        statusFilters: queries.filter(call => call.method === "in").map(call => call.args[1])
      };
    });

    expect(result.unpaid).toEqual([{ id: "sent-1", status: "unpaid" }]);
    expect(result.history).toEqual([
      { id: "sent-1", status: "unpaid" },
      { id: "paid-1", status: "paid" }
    ]);
    expect(result.statusFilters).toEqual([["sent"], ["sent", "paid"]]);
  });

  test("student invoice reads reject a different student's ID before querying invoices", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseAdminBillingRepository } = await import(
        "/src/data/supabase-admin-billing-repository.ts"
      );
      const queriedTables: string[] = [];
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "student-1" } }, error: null }) },
        from: (table: string) => {
          queriedTables.push(table);
          throw new Error("Invoice query should not run for another student");
        }
      };
      const repository = createSupabaseAdminBillingRepository(client as never);
      let message = "";
      try {
        await repository.getStudentInvoiceHistory("student-2");
      } catch (error) {
        message = error instanceof Error ? error.message : "";
      }
      return { message, queriedTables };
    });

    expect(result.message).toContain("Akses riwayat tagihan siswa ditolak");
    expect(result.queriedTables).toEqual([]);
  });
});
