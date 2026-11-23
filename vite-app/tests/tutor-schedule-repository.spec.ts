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
        { meeting_id: 11, student_id: "student-a", attendance_status: "hadir", attendance_recorded_at: "2026-11-20T10:00:00.000Z" },
        { meeting_id: 11, student_id: "student-a", attendance_status: "hadir", attendance_recorded_at: "2026-11-20T10:00:00.000Z" },
        { meeting_id: 11, student_id: "student-b", attendance_status: "absen", attendance_recorded_at: null },
        { meeting_id: 22, student_id: "student-c", attendance_status: "telat", attendance_recorded_at: "2026-11-23T11:00:00.000Z" },
        { meeting_id: 22, student_id: "", attendance_status: "absen", attendance_recorded_at: null },
        { meeting_id: -1, student_id: "student-x", attendance_status: "absen", attendance_recorded_at: null }
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
    expect(result.snapshot.meetingStudents).toEqual([
      { meetingId: 11, studentId: "student-a", attendanceStatus: "hadir", attendanceRecordedAt: "2026-11-20T10:00:00.000Z" },
      { meetingId: 11, studentId: "student-b", attendanceStatus: "absen", attendanceRecordedAt: null },
      { meetingId: 22, studentId: "student-c", attendanceStatus: "telat", attendanceRecordedAt: "2026-11-23T11:00:00.000Z" }
    ]);
    expect(result.calls).toContainEqual({ table: "meetings", method: "eq", args: ["teacher_id", "tutor-1"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "limit", args: [100] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "gte", args: ["meeting_date", "2026-11-23T00:00:00.000Z"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "lt", args: ["meeting_date", "2026-11-23T00:00:00.000Z"] });
    expect(result.calls).toContainEqual({ table: "meetings", method: "limit", args: [20] });

    expect(result.calls).toContainEqual({ table: "meeting_students", method: "select", args: ["meeting_id,student_id,attendance_status,attendance_recorded_at"] });
    expect(result.calls).toContainEqual({ table: "meeting_students", method: "in", args: ["meeting_id", [11, 22]] });
  });

  test("records attendance only for the authenticated tutor's linked meeting student", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseTutorScheduleRepository } = await import("/src/data/supabase-tutor-schedule-repository.ts");
      const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "tutor-1" } }, error: null }) },
        from: (table: string) => {
          const builder: Record<string, unknown> = {};
          for (const method of ["eq", "select"]) builder[method] = (...args: unknown[]) => {
            calls.push({ table, method, args });
            return builder;
          };
          builder.update = (...args: unknown[]) => {
            calls.push({ table, method: "update", args });
            return builder;
          };
          builder.maybeSingle = async () => ({ data: { meeting_id: 11 }, error: null });
          return builder;
        }
      };
      const repository = createSupabaseTutorScheduleRepository(client as never);
      const saved = await repository.recordAttendance("tutor-1", 11, "student-1", "telat");
      return { saved, calls };
    });
    expect(result.saved.success).toBe(true);
    expect(result.calls).toContainEqual({ table: "meeting_students", method: "update", args: [{ attendance_status: "telat" }] });
    expect(result.calls).toContainEqual({ table: "meeting_students", method: "eq", args: ["meeting_id", 11] });
    expect(result.calls).toContainEqual({ table: "meeting_students", method: "eq", args: ["student_id", "student-1"] });
  });

  test("rejects a mismatched tutor before attendance writes", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseTutorScheduleRepository } = await import("/src/data/supabase-tutor-schedule-repository.ts");
      let writes = 0;
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "tutor-real" } }, error: null }) },
        from: () => { writes += 1; throw new Error("Must not write."); }
      };
      const repository = createSupabaseTutorScheduleRepository(client as never);
      const result = await repository.recordAttendance("tutor-spoofed", 11, "student-1", "hadir");
      return { result, writes };
    });
    expect(result.result.success).toBe(false);
    expect(result.result.message).toContain("Sesi tutor tidak cocok");
    expect(result.writes).toBe(0);
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

    expect(result.snapshot).toEqual({ meetings: [], studentCounts: {}, meetingStudents: [] });
    expect(result.queriedTables).toEqual(["meetings"]);
  });
});
