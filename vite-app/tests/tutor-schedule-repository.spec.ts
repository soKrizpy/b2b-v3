import { expect, test } from "@playwright/test";

test.describe("Production tutor schedule repository", () => {
  test("derives tutor identity from Auth, scopes meetings, sorts dates, and deduplicates student links", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseTutorScheduleRepository } = await import(
        "/src/data/supabase-tutor-schedule-repository.ts"
      );
      const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
      const meetingRows = [
        {
          id: 22,
          title: "Kelas kedua",
          meeting_date: "2026-11-25T09:00:00.000Z",
          link_url: null,
          notes: null,
          session_count: 12,
          session_number: 2,
          completion_status: "scheduled",
          is_completed: false
        },
        {
          id: 11,
          title: "Kelas pertama",
          meeting_date: "2026-11-20T09:00:00.000Z",
          link_url: "https://meet.example.test/1",
          notes: "Catatan",
          session_count: 12,
          session_number: 1,
          completion_status: "completed",
          is_completed: true
        }
      ];
      const linkRows = [
        { meeting_id: 11, student_id: "student-a" },
        { meeting_id: 11, student_id: "student-a" },
        { meeting_id: 11, student_id: "student-b" },
        { meeting_id: 22, student_id: "student-c" },
        { meeting_id: 22, student_id: "" },
        { meeting_id: -1, student_id: "student-x" }
      ];
      const client = {
        auth: {
          getUser: async () => ({ data: { user: { id: "tutor-1" } }, error: null })
        },
        from: (table: string) => {
          const rows = table === "meetings" ? meetingRows : linkRows;
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "gte", "lt", "order", "limit", "in"]) {
            builder[method] = (...args: unknown[]) => {
              calls.push({ table, method, args });
              return builder;
            };
          }
          builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          return builder;
        }
      };

      const repository = createSupabaseTutorScheduleRepository(client as never, () => new Date("2026-11-23T00:00:00.000Z"));
      const snapshot = await repository.listForCurrentTutor("tutor-1");
      return { snapshot, calls };
    });

    expect(result.snapshot.meetings.map((meeting) => meeting.id)).toEqual([11, 22]);
    expect(result.snapshot.studentCounts).toEqual({ 11: 2, 22: 1 });
    expect(result.calls).toContainEqual({ table: "meetings", method: "eq", args: ["teacher_id", "tutor-1"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "limit", args: [100] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "gte", args: ["meeting_date", "2026-11-23T00:00:00.000Z"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "lt", args: ["meeting_date", "2026-11-23T00:00:00.000Z"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "limit", args: [20] });

    expect(result.calls).toContainEqual({ table: "meeting_students", method: "in", args: ["meeting_id", [11, 22]] });
  });

  test("rejects a caller whose ID does not match the authenticated tutor before querying data", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseTutorScheduleRepository } = await import(
        "/src/data/supabase-tutor-schedule-repository.ts"
      );
      let queryCount = 0;
      const client = {
        auth: {
          getUser: async () => ({ data: { user: { id: "tutor-real" } }, error: null })
        },
        from: () => {
          queryCount += 1;
          throw new Error("Data query must not run for a mismatched actor.");
        }
      };
      const repository = createSupabaseTutorScheduleRepository(client as never, () => new Date("2026-11-23T00:00:00.000Z"));
      let message = "";
      try {
        await repository.listForCurrentTutor("tutor-spoofed");
      } catch (error) {
        message = error instanceof Error ? error.message : "";
      }
      return { message, queryCount };
    });

    expect(result.message).toContain("Sesi tutor tidak cocok");
    expect(result.queryCount).toBe(0);
  });

  test("does not query meeting links when the tutor has no meetings", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseTutorScheduleRepository } = await import(
        "/src/data/supabase-tutor-schedule-repository.ts"
      );
      const queriedTables: string[] = [];
      const client = {
        auth: {
          getUser: async () => ({ data: { user: { id: "tutor-empty" } }, error: null })
        },
        from: (table: string) => {
          queriedTables.push(table);
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "gte", "lt", "order", "limit", "in"]) {
            builder[method] = () => builder;
          }
          builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(resolve, reject);
          return builder;
        }
      };
      const repository = createSupabaseTutorScheduleRepository(client as never, () => new Date("2026-11-23T00:00:00.000Z"));
      const snapshot = await repository.listForCurrentTutor("tutor-empty");
      return { snapshot, queriedTables };
    });

    expect(result.snapshot).toEqual({ meetings: [], studentCounts: {} });
    expect(result.queriedTables).toEqual(["meetings"]);
  });
});
