import { expect, test } from "@playwright/test";

test.describe("Production billable class-session contract", () => {
  test("creates a 16-session series with the selected Module and verifies Topic mapping", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseClassSessionRepository } = await import(
        "/src/data/supabase-class-session-repository.ts"
      );
      const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
      const meetings = Array.from({ length: 16 }, (_, index) => ({
        id: index + 1,
        title: `Sesi ${index + 1}`,
        meeting_date: `2026-12-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
        link_url: null,
        notes: null,
        session_count: 16,
        series_id: "series-1",
        session_number: index + 1,
        is_completed: false,
        completion_status: "scheduled",
        teacher_id: "tutor-1",
        module_id: 29,
        topic_id: 146 + index,
        duration_minutes: 60,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        replacement_required: false,
        replacement_session_id: null,
        replacement_for_session_id: null,
        deleted_at: null,
        deleted_by: null,
        created_at: "2026-11-25T00:00:00.000Z",
        updated_at: "2026-11-25T00:00:00.000Z",
        version: 1
      }));
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { role: "admin" }, error: null })
            })
          })
        }),
        rpc: async (name: string, args: Record<string, unknown>) => {
          rpcCalls.push({ name, args });
          return { data: meetings, error: null };
        }
      };
      const repository = createSupabaseClassSessionRepository(client as never);
      const created = await repository.createRecurringSeries({
        studentId: "student-1",
        tutorId: "tutor-1",
        moduleId: 29,
        startDate: "2026-12-01",
        startTime: "16:00",
        weekdays: [2],
        targetCount: 16,
        durationMinutes: 60
      });
      const invalid = await repository.createRecurringSeries({
        studentId: "student-1",
        tutorId: "tutor-1",
        moduleId: 29,
        startDate: "2026-12-01",
        startTime: "16:00",
        weekdays: [2],
        targetCount: 15,
        durationMinutes: 60
      } as never);

      return {
        success: created.success,
        sessionCount: created.success ? created.data.length : 0,
        mappedModuleIds: created.success ? [...new Set(created.data.map((session) => session.moduleId))] : [],
        mappedTopicIds: created.success ? created.data.map((session) => session.topicId) : [],
        rpcCalls,
        invalidError: invalid.success ? null : invalid.error.code
      };
    });

    expect(result.success).toBe(true);
    expect(result.sessionCount).toBe(16);
    expect(result.mappedModuleIds).toEqual([29]);
    expect(result.mappedTopicIds).toEqual(Array.from({ length: 16 }, (_, index) => 146 + index));
    expect(result.rpcCalls).toHaveLength(1);
    expect(result.rpcCalls[0].name).toBe("create_recurring_meeting_series");
    expect(result.rpcCalls[0].args).toMatchObject({ p_module_id: 29 });
    expect(result.rpcCalls[0].args).not.toHaveProperty("p_target_count");
    expect(result.invalidError).toBe("INVALID_SERIES");
  });

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
        { id: "5:student-1", studentId: "student-1", status: "held", attendanceStatus: "late", scheduledStartAt: "2026-10-31T16:00:00.000Z" }
      ];
      repository.listSessions = async () => sessions as never;
      const result = await repository.listBillableSessions("student-1", "2026-11" as never);
      return result.map(session => session.id);
    });

    expect(result).toEqual(["1:student-1", "2:student-1"]);
  });
});
