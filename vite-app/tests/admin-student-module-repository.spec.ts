import { expect, test } from "@playwright/test";

test.describe("Admin student curriculum access repository", () => {
  test("lists, assigns, and pauses student modules through admin-scoped Supabase queries", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseAdminStudentModuleRepository } = await import(
        "/src/data/supabase-admin-student-module-repository.ts"
      );
      const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
      const assignment = {
        id: 51,
        student_id: "student-1",
        module_id: 29,
        status: "active",
        created_at: "2026-11-23T10:00:00.000Z"
      };
      const builder: Record<string, unknown> = {};
      let table = "";
      for (const method of ["select", "eq", "order", "limit", "upsert", "update"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        };
      }
      builder.maybeSingle = async () => ({
        data: table === "profiles" ? { role: "admin" } : { id: 51 },
        error: null
      });
      builder.single = async () => ({ data: assignment, error: null });
      builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [assignment], error: null }).then(resolve, reject);
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
        from: (nextTable: string) => {
          table = nextTable;
          return builder;
        }
      };
      const repository = createSupabaseAdminStudentModuleRepository(client as never);
      const listed = await repository.listAssignments();
      const assigned = await repository.assignStudentModule("student-1", 29);
      const paused = await repository.setAssignmentStatus("student-1", 17, "paused");
      return { listed, assigned, paused, calls };
    });

    expect(result.listed).toEqual([{
      id: 51,
      studentId: "student-1",
      moduleId: 29,
      status: "active",
      createdAt: "2026-11-23T10:00:00.000Z"
    }]);
    expect(result.assigned.moduleId).toBe(17);
    expect(result.paused).toBe(true);
    expect(result.calls).toContainEqual({
      table: "student_modules",
      method: "upsert",
      args: [{ student_id: "student-1", module_id: 29, status: "active" }, { onConflict: "student_id,module_id" }]
    });
    expect(result.calls).toContainEqual({
      table: "student_modules",
      method: "update",
      args: [{ status: "paused" }]
    });
  });

  test("rejects a non-admin before reading student module assignments", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseAdminStudentModuleRepository } = await import(
        "/src/data/supabase-admin-student-module-repository.ts"
      );
      const queriedTables: string[] = [];
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "tutor-1" } }, error: null }) },
        from: (table: string) => {
          queriedTables.push(table);
          const builder: Record<string, unknown> = {
            select: () => builder,
            eq: () => builder,
            maybeSingle: async () => ({ data: { role: "teacher" }, error: null })
          };
          return builder;
        }
      };
      const repository = createSupabaseAdminStudentModuleRepository(client as never);
      let message = "";
      try {
        await repository.listAssignments();
      } catch (error) {
        message = error instanceof Error ? error.message : "";
      }
      return { message, queriedTables };
    });

    expect(result.message).toContain("Hanya Admin");
    expect(result.queriedTables).toEqual(["profiles"]);
  });
});
