import { expect, test } from "@playwright/test";

test.describe("Production billable class-session contract", () => {
  test("includes held sessions with present or late attendance, but excludes absent and non-held sessions", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseClassSessionRepository } = await import(
        "/src/data/supabase-class-session-repository.ts"
      );
      const repository = createSupabaseClassSessionRepository(null);
      const sessions = [
        { id: "1:student-1", studentId: "student-1", status: "held", attendanceStatus: "present", scheduledStartAt: "2026-11-03T03:00:00.000Z" },
        { id: "2:student-1", studentId: "student-1", status: "held", attendanceStatus: "late", scheduledStartAt: "2026-11-04T03:00:00.000Z" },
        { id: "3:student-1", studentId: "student-1", status: "held", attendanceStatus: "absent", scheduledStartAt: "2026-11-05T03:00:00.000Z" },
        { id: "4:student-1", studentId: "student-1", status: "not_held", attendanceStatus: "present", scheduledStartAt: "2026-11-06T03:00:00.000Z" },
        { id: "5:student-1", studentId: "student-1", status: "held", attendanceStatus: "late", scheduledStartAt: "2026-10-31T17:00:00.000Z" }
      ];
      repository.listSessions = async () => sessions as never;
      const result = await repository.listBillableSessions("student-1", "2026-11" as never);
      return result.map(session => session.id);
    });

    expect(result).toEqual(["1:student-1", "2:student-1"]);
  });
});
