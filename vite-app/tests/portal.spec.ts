import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const classSessionStoreSource = readFileSync(resolve(process.cwd(), "../js/services/class-session-store.js"), "utf8");
const billingStoreSource = readFileSync(resolve(process.cwd(), "../js/services/billing-store.js"), "utf8");

test.describe("Bits2Bytes demo portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("class session ledger only marks held sessions with present or late attendance as billable", async ({ page }) => {
    const result = await page.evaluate(async (moduleSource) => {
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      localStorage.removeItem("b2b_class_sessions_store");
      const tutor = { id: "tutor-1", role: "tutor" };
      const create = (id: string, sessionNumber: number) => ClassSessionStore.createSession({
        id, seriesId: "series-1", sessionNumber, studentId: "student-1", tutorId: tutor.id,
        scheduledStartAt: `2026-11-${String(20 + sessionNumber).padStart(2, "0")}T09:00:00+07:00`,
        durationMinutes: 60
      });

      create("session-present", 1);
      create("session-late", 2);
      create("session-absent", 3);
      create("session-pending", 4);

      const unauthorized = ClassSessionStore.recordAttendance("session-present", "present", { id: "other-tutor", role: "tutor" });
      const present = ClassSessionStore.recordAttendance("session-present", "present", tutor);
      const late = ClassSessionStore.recordAttendance("session-late", "late", tutor);
      const absent = ClassSessionStore.recordAttendance("session-absent", "absent", tutor);

      return {
        unauthorized: unauthorized.error,
        present: present.success,
        late: late.success,
        absent: absent.success,
        billableIds: ClassSessionStore.getBillableSessions("student-1").map((session: { id: string }) => session.id).sort(),
        pendingStatus: ClassSessionStore.getSession("session-pending")?.status
      };
    }, classSessionStoreSource);

    expect(result.unauthorized).toBe("NOT_ASSIGNED_TUTOR");
    expect(result.present).toBe(true);
    expect(result.late).toBe(true);
    expect(result.absent).toBe(true);
    expect(result.billableIds).toEqual(["session-late", "session-present"]);
    expect(result.pendingStatus).toBe("scheduled");
  });

  test("class session cancellation and soft deletion preserve history and require replacement links", async ({ page }) => {
    const result = await page.evaluate(async (moduleSource) => {
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      localStorage.removeItem("b2b_class_sessions_store");
      const tutor = { id: "tutor-1", role: "tutor" };
      const admin = { id: "admin-1", role: "admin" };
      const create = (id: string, sessionNumber: number) => ClassSessionStore.createSession({
        id, seriesId: "series-1", sessionNumber, studentId: "student-1", tutorId: tutor.id,
        scheduledStartAt: `2026-11-25T${String(8 + sessionNumber).padStart(2, "0")}:00:00+07:00`, durationMinutes: 60
      });

      create("teacher-cancelled", 1);
      create("admin-cancelled", 2);
      create("soft-deleted", 3);
      const missingReason = ClassSessionStore.cancelSession("teacher-cancelled", tutor);
      const teacherCancel = ClassSessionStore.cancelSession("teacher-cancelled", tutor, "Tutor berhalangan");
      const adminCancel = ClassSessionStore.cancelSession("admin-cancelled", admin);
      const softDelete = ClassSessionStore.softDeleteSession("soft-deleted", admin);
      create("replacement", 4);
      const linked = ClassSessionStore.linkReplacement("teacher-cancelled", "replacement", admin);

      return {
        missingReason: missingReason.error,
        teacherCancel: teacherCancel.success,
        adminCancel: adminCancel.success,
        softDelete: softDelete.success,
        replacementId: ClassSessionStore.getSession("teacher-cancelled")?.replacementSessionId,
        replacementFor: ClassSessionStore.getSession("replacement")?.replacementForSessionId,
        retainedStatuses: ["teacher-cancelled", "admin-cancelled", "soft-deleted"].map(id => ClassSessionStore.getSession(id)?.status),
        billableCount: ClassSessionStore.getBillableSessions().length,
        linked: linked.success
      };
    }, classSessionStoreSource);

    expect(result.missingReason).toBe("REASON_REQUIRED");
    expect(result.teacherCancel).toBe(true);
    expect(result.adminCancel).toBe(true);
    expect(result.softDelete).toBe(true);
    expect(result.linked).toBe(true);
    expect(result.replacementId).toBe("replacement");
    expect(result.replacementFor).toBe("teacher-cancelled");
    expect(result.retainedStatuses).toEqual(["cancelled", "cancelled", "soft_deleted"]);
    expect(result.billableCount).toBe(0);
  });

  test("class session scheduling rejects tutor and student overlaps and suggests the next free slot", async ({ page }) => {
    const result = await page.evaluate(async (moduleSource) => {
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      localStorage.removeItem("b2b_class_sessions_store");

      const base = ClassSessionStore.createSession({
        id: "base-session", seriesId: "series-1", sessionNumber: 1,
        studentId: "student-1", tutorId: "tutor-1",
        scheduledStartAt: "2026-11-25T10:00:00+07:00", durationMinutes: 60
      });
      const tutorConflict = ClassSessionStore.createSession({
        id: "tutor-conflict", seriesId: "series-2", sessionNumber: 1,
        studentId: "student-2", tutorId: "tutor-1",
        scheduledStartAt: "2026-11-25T10:30:00+07:00", durationMinutes: 60
      });
      const studentConflict = ClassSessionStore.createSession({
        id: "student-conflict", seriesId: "series-3", sessionNumber: 1,
        studentId: "student-1", tutorId: "tutor-2",
        scheduledStartAt: "2026-11-25T10:45:00+07:00", durationMinutes: 60
      });
      const adjacent = ClassSessionStore.createSession({
        id: "adjacent-session", seriesId: "series-4", sessionNumber: 1,
        studentId: "student-2", tutorId: "tutor-1",
        scheduledStartAt: "2026-11-25T11:00:00+07:00", durationMinutes: 60
      });
      const cancelled = ClassSessionStore.cancelSession("adjacent-session", { id: "admin-1", role: "admin" });
      const reusedSlot = ClassSessionStore.createSession({
        id: "reused-slot", seriesId: "series-5", sessionNumber: 1,
        studentId: "student-3", tutorId: "tutor-1",
        scheduledStartAt: "2026-11-25T11:00:00+07:00", durationMinutes: 60
      });

      return {
        base: base.success,
        tutorError: tutorConflict.error,
        tutorConflictType: tutorConflict.conflicts?.[0]?.conflictType,
        tutorSuggestion: tutorConflict.suggestedStartAt,
        studentError: studentConflict.error,
        studentConflictType: studentConflict.conflicts?.[0]?.conflictType,
        adjacent: adjacent.success,
        cancelled: cancelled.success,
        reusedSlot: reusedSlot.success
      };
    }, classSessionStoreSource);

    expect(result.base).toBe(true);
    expect(result.tutorError).toBe("SCHEDULE_CONFLICT");
    expect(result.tutorConflictType).toBe("tutor");
    expect(result.tutorSuggestion).toBe("2026-11-25T04:00:00.000Z");
    expect(result.studentError).toBe("SCHEDULE_CONFLICT");
    expect(result.studentConflictType).toBe("student");
    expect(result.adjacent).toBe(true);
    expect(result.cancelled).toBe(true);
    expect(result.reusedSlot).toBe(true);
  });

  test("class session series is created atomically with shared defaults and per-session meeting link overrides", async ({ page }) => {
    const result = await page.evaluate(async (moduleSource) => {
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      localStorage.removeItem("b2b_class_sessions_store");

      const existing = ClassSessionStore.createSession({
        id: "existing-session", seriesId: "existing-series", sessionNumber: 1,
        studentId: "student-other", tutorId: "tutor-1",
        scheduledStartAt: "2026-12-02T10:00:00+07:00", durationMinutes: 60
      });
      const failed = ClassSessionStore.createSessionSeries({
        seriesId: "failed-series", studentId: "student-1", tutorId: "tutor-1",
        durationMinutes: 60, meetingUrl: "https://meet.example/main",
        sessions: [
          { id: "would-have-been-created", sessionNumber: 1, scheduledStartAt: "2026-12-01T10:00:00+07:00" },
          { id: "conflicting-session", sessionNumber: 2, scheduledStartAt: "2026-12-02T10:30:00+07:00" }
        ]
      });
      const failedSeriesSessions = ClassSessionStore.getAllSessions().filter((session: { seriesId: string }) => session.seriesId === "failed-series");

      const created = ClassSessionStore.createSessionSeries({
        seriesId: "valid-series", studentId: "student-1", tutorId: "tutor-1",
        durationMinutes: 60, meetingUrl: "https://meet.example/main",
        sessions: [
          { id: "series-session-1", sessionNumber: 1, scheduledStartAt: "2026-12-03T09:00:00+07:00" },
          { id: "series-session-2", sessionNumber: 2, scheduledStartAt: "2026-12-04T09:00:00+07:00", meetingUrl: "https://meet.example/override" },
          { id: "series-session-3", sessionNumber: 3, scheduledStartAt: "2026-12-05T09:00:00+07:00" }
        ]
      });

      return {
        existing: existing.success,
        failedError: failed.error,
        failedSeriesCount: failedSeriesSessions.length,
        failedFirstSessionExists: Boolean(ClassSessionStore.getSession("would-have-been-created")),
        created: created.success,
        createdCount: created.sessions?.length || 0,
        seriesIds: created.sessions?.map((session: { seriesId: string }) => session.seriesId),
        durations: created.sessions?.map((session: { durationMinutes: number }) => session.durationMinutes),
        meetingUrls: created.sessions?.map((session: { meetingUrl: string }) => session.meetingUrl)
      };
    }, classSessionStoreSource);

    expect(result.existing).toBe(true);
    expect(result.failedError).toBe("SCHEDULE_CONFLICT");
    expect(result.failedSeriesCount).toBe(0);
    expect(result.failedFirstSessionExists).toBe(false);
    expect(result.created).toBe(true);
    expect(result.createdCount).toBe(3);
    expect(result.seriesIds).toEqual(["valid-series", "valid-series", "valid-series"]);
    expect(result.durations).toEqual([60, 60, 60]);
    expect(result.meetingUrls).toEqual([
      "https://meet.example/main",
      "https://meet.example/override",
      "https://meet.example/main"
    ]);
  });

  test("admin can create a conflict-free replacement and link it to the original session", async ({ page }) => {
    const result = await page.evaluate(async (moduleSource) => {
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(moduleUrl);
      URL.revokeObjectURL(moduleUrl);
      localStorage.removeItem("b2b_class_sessions_store");

      const admin = { id: "admin-1", role: "admin" };
      const tutor = { id: "tutor-1", role: "tutor" };
      const original = ClassSessionStore.createSession({
        id: "original-session", seriesId: "series-1", sessionNumber: 2,
        studentId: "student-1", tutorId: "tutor-1",
        scheduledStartAt: "2026-12-10T09:00:00+07:00", durationMinutes: 60,
        meetingUrl: "https://meet.example/original"
      });
      const cancelled = ClassSessionStore.cancelSession("original-session", tutor, "Tutor berhalangan");
      const blocker = ClassSessionStore.createSession({
        id: "blocker-session", seriesId: "series-2", sessionNumber: 1,
        studentId: "student-1", tutorId: "tutor-2",
        scheduledStartAt: "2026-12-11T09:00:00+07:00", durationMinutes: 60
      });
      const conflict = ClassSessionStore.createReplacementSession("original-session", {
        id: "conflicting-replacement", scheduledStartAt: "2026-12-11T09:30:00+07:00"
      }, admin);
      const remainsUnlinked = ClassSessionStore.getSession("original-session")?.replacementSessionId === null;

      const forbidden = ClassSessionStore.createReplacementSession("original-session", {
        id: "forbidden-replacement", scheduledStartAt: "2026-12-12T09:00:00+07:00"
      }, tutor);
      const success = ClassSessionStore.createReplacementSession("original-session", {
        id: "replacement-session", scheduledStartAt: "2026-12-12T09:00:00+07:00",
        meetingUrl: "https://meet.example/replacement"
      }, admin);

      return {
        original: original.success,
        cancelled: cancelled.success,
        blocker: blocker.success,
        conflictError: conflict.error,
        remainsUnlinked,
        forbiddenError: forbidden.error,
        success: success.success,
        originalLinkedId: success.original?.replacementSessionId,
        replacementOriginalId: success.replacement?.replacementForSessionId,
        replacementStudent: success.replacement?.studentId,
        replacementSeries: success.replacement?.seriesId,
        replacementNumber: success.replacement?.sessionNumber,
        replacementMeetingUrl: success.replacement?.meetingUrl,
        originalStatus: ClassSessionStore.getSession("original-session")?.status
      };
    }, classSessionStoreSource);

    expect(result.original).toBe(true);
    expect(result.cancelled).toBe(true);
    expect(result.blocker).toBe(true);
    expect(result.conflictError).toBe("SCHEDULE_CONFLICT");
    expect(result.remainsUnlinked).toBe(true);
    expect(result.forbiddenError).toBe("FORBIDDEN");
    expect(result.success).toBe(true);
    expect(result.originalLinkedId).toBe("replacement-session");
    expect(result.replacementOriginalId).toBe("original-session");
    expect(result.replacementStudent).toBe("student-1");
    expect(result.replacementSeries).toBe("series-1");
    expect(result.replacementNumber).toBe(3);
    expect(result.replacementMeetingUrl).toBe("https://meet.example/replacement");
    expect(result.originalStatus).toBe("cancelled");
  });

  test("admin can sign in and see identity management", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();
    await expect(page.getByRole("heading", { name: "Manajemen Identitas & Hak Akses Pengguna" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Daftar Pengguna/ })).toBeVisible();
  });

  test("tutor can sign in and see tutor workspace", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(1).click();
    await page.locator("#demo-account").selectOption("usr_tea_001");
    await page.getByRole("button", { name: "Masuk sebagai Tutor" }).click();
    await expect(page.getByRole("heading", { name: /Halo, Kak Sarah/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Manajemen Siswa/ })).toBeVisible();
  });

  test("tutor only sees students assigned to the signed-in tutor", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(1).click();
    await page.locator("#demo-account").selectOption("usr_tea_001");
    await page.getByRole("button", { name: "Masuk sebagai Tutor" }).click();
    await page.getByRole("button", { name: /Manajemen Siswa/ }).click();

    const studentPanel = page.locator(".placeholder-desc");
    await expect(studentPanel).toContainText("4 siswa yang ditugaskan");
    await expect(studentPanel).toContainText("Alex Pratama");
    await expect(studentPanel).toContainText("Budi Santoso");
    await expect(studentPanel).toContainText("Citra Lestari");
    await expect(studentPanel).toContainText("Doni Wijaya");
    await expect(studentPanel).not.toContainText("Eva Rahma");
    await expect(studentPanel).not.toContainText("Fajar Ramadhan");
  });

  test("admin can create a student account and assign the student to a tutor", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();

    await page.getByRole("button", { name: /Tambah Akun Demo/ }).click();
    await page.locator("#admin-input-name").fill("Nadia Test");
    await page.locator("#admin-input-email").fill("nadia.test@example.edu");
    await page.locator("#admin-input-grade").fill("Grade 4");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.locator("#admin-tab-body")).toContainText("Nadia Test");

    await page.getByRole("button", { name: /Relasi Tutor & Siswa/ }).click();
    await page.getByRole("button", { name: /Tambah Penugasan Tutor/ }).click();
    await page.locator("#select-rel-tutor").selectOption("usr_tea_001");
    const studentOption = page.locator("#select-rel-student option").filter({ hasText: "Nadia Test" });
    const studentId = await studentOption.getAttribute("value");
    expect(studentId).toBeTruthy();
    await page.locator("#select-rel-student").selectOption(studentId!);
    await page.getByRole("button", { name: "Tugaskan" }).click();

    const assignment = page.locator("#admin-tab-body .card").filter({ hasText: "Nadia Test" });
    await expect(assignment).toContainText("Kak Sarah");
    await expect(assignment).toContainText("active");
  });

  test("admin can create a parent account and link it to a student", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();

    await page.getByRole("button", { name: /Tambah Akun Demo/ }).click();
    await page.locator("#admin-input-name").fill("Wali Nadia");
    await page.locator("#admin-input-email").fill("wali.nadia@example.com");
    await page.locator("#admin-select-role").selectOption("parent");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.locator("#admin-tab-body")).toContainText("Wali Nadia");

    await page.getByRole("button", { name: /Relasi Orang Tua & Anak/ }).click();
    await page.getByRole("button", { name: /Tambah Tautan Orang Tua/ }).click();
    await page.locator("#select-rel-parent").selectOption({ label: "Wali Nadia (wali.nadia@example.com)" });
    await page.locator("#select-rel-child").selectOption("usr_stu_005");
    await page.locator("#select-rel-type").selectOption("Wali");
    await page.getByRole("button", { name: "Tautkan" }).click();

    const parentLink = page.locator("#admin-tab-body .card").filter({ hasText: "Wali Nadia" }).filter({ hasText: "Eva Rahma" });
    await expect(parentLink).toContainText("Wali");
    await expect(parentLink).toContainText("active");

    await parentLink.getByRole("button", { name: /Putus Tautan/ }).click();
    await expect(parentLink).toContainText("inactive");

    await page.getByRole("button", { name: /Tambah Tautan Orang Tua/ }).click();
    await page.locator("#select-rel-parent").selectOption({ label: "Wali Nadia (wali.nadia@example.com)" });
    await page.locator("#select-rel-child").selectOption("usr_stu_005");
    await page.locator("#select-rel-type").selectOption("Wali");
    await page.getByRole("button", { name: "Tautkan" }).click();
    await expect(parentLink).toContainText("active");
    await expect(page.locator("#admin-tab-body .card").filter({ hasText: "Wali Nadia" }).filter({ hasText: "Eva Rahma" })).toHaveCount(1);
  });

  test("admin cannot link inactive parent or student accounts", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();

    await page.getByRole("button", { name: /Tambah Akun Demo/ }).click();
    await page.locator("#admin-input-name").fill("Orang Tua Nonaktif");
    await page.locator("#admin-input-email").fill("inactive.parent@example.com");
    await page.locator("#admin-select-role").selectOption("parent");
    await page.locator("#admin-select-status").selectOption("inactive");
    await page.getByRole("button", { name: "Buat Akun" }).click();

    await page.getByRole("button", { name: /Relasi Orang Tua & Anak/ }).click();
    await page.getByRole("button", { name: /Tambah Tautan Orang Tua/ }).click();
    await page.locator("#select-rel-parent").selectOption({ label: "Orang Tua Nonaktif (inactive.parent@example.com)" });
    await page.locator("#select-rel-child").selectOption("usr_stu_005");
    await page.getByRole("button", { name: "Tautkan" }).click();
    await expect(page.getByRole("alert")).toContainText("Akun orang tua harus aktif");
    await page.locator("#btn-cancel-parent-rel-modal").click();

    await page.getByRole("button", { name: /Daftar Pengguna/ }).click();
    await page.getByRole("button", { name: /Tambah Akun Demo/ }).click();
    await page.locator("#admin-input-name").fill("Siswa Nonaktif");
    await page.locator("#admin-input-email").fill("inactive.student@example.edu");
    await page.locator("#admin-select-role").selectOption("student");
    await page.locator("#admin-select-status").selectOption("inactive");
    await page.getByRole("button", { name: "Buat Akun" }).click();

    await page.getByRole("button", { name: /Relasi Orang Tua & Anak/ }).click();
    await page.getByRole("button", { name: /Tambah Tautan Orang Tua/ }).click();
    await page.locator("#select-rel-parent").selectOption("usr_par_001");
    const inactiveStudent = page.locator("#select-rel-child option").filter({ hasText: "Siswa Nonaktif" });
    const inactiveStudentId = await inactiveStudent.getAttribute("value");
    expect(inactiveStudentId).toBeTruthy();
    await page.locator("#select-rel-child").selectOption(inactiveStudentId!);
    await page.getByRole("button", { name: "Tautkan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Akun siswa harus aktif" })).toBeVisible();
  });

  test("admin prevents multiple active tutors and preserves released assignment history", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();

    await page.getByRole("button", { name: /Tambah Akun Demo/ }).click();
    await page.locator("#admin-input-name").fill("Kak Rina");
    await page.locator("#admin-input-email").fill("rina.tutor@example.edu");
    await page.locator("#admin-select-role").selectOption("tutor");
    await page.getByRole("button", { name: "Buat Akun" }).click();

    await page.getByRole("button", { name: /Relasi Tutor & Siswa/ }).click();
    await page.getByRole("button", { name: /Tambah Penugasan Tutor/ }).click();
    await page.locator("#select-rel-tutor").selectOption({ label: "Kak Rina (rina.tutor@example.edu)" });
    await page.locator("#select-rel-student").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Tugaskan" }).click();

    await expect(page.getByRole("alert")).toContainText("masih memiliki tutor aktif: Kak Sarah");
    await expect(page.locator("#admin-tutor-rel-modal")).toHaveClass(/is-open/);
    await page.locator("#btn-cancel-tutor-rel-modal").click();
    await expect(page.locator("#admin-tutor-rel-modal")).not.toHaveClass(/is-open/);

    await page.locator('[data-action="delete-tutor-rel"][data-tutor-id="usr_tea_001"][data-student-id="usr_stu_001"]').click();
    const releasedAssignment = page.locator("#admin-tab-body .card").filter({ hasText: "Tutor: Kak Sarah" }).filter({ hasText: "Siswa: Alex Pratama" });
    await expect(releasedAssignment).toContainText("inactive");

    await page.getByRole("button", { name: /Tambah Penugasan Tutor/ }).click();
    await page.locator("#select-rel-tutor").selectOption({ label: "Kak Rina (rina.tutor@example.edu)" });
    await page.locator("#select-rel-student").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Tugaskan" }).click();

    const newAssignment = page.locator("#admin-tab-body .card").filter({ hasText: "Tutor: Kak Rina" }).filter({ hasText: "Siswa: Alex Pratama" });
    await expect(newAssignment).toContainText("active");
    await expect(releasedAssignment).toContainText("inactive");
  });

  test("Parent Hub remains inside Student Workspace without a separate parent portal", async ({ page }) => {
    const roleCards = page.locator(".b2b-vite-role-card");
    await expect(roleCards).toHaveCount(3);
    await expect(page.getByText("Orang Tua", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: /Pilih ruang/ }).nth(2).click();
    await page.locator("#demo-account").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Masuk sebagai Siswa" }).click();

    await expect(page.getByRole("heading", { name: "Ruang Khusus Ayah/Bunda" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ })).toBeVisible();
    await page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ }).click();
    await expect(page.getByRole("heading", { name: "Laporan Belajar Alex Pratama" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kembali ke Ruang Belajar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Perkembangan Bulanan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Riwayat Tagihan" })).toBeVisible();
    await expect(page.getByText("Belum ada laporan sesi")).toBeVisible();
    await page.getByRole("button", { name: "Perkembangan Bulanan" }).click();
    await expect(page.getByText("Belum ada evaluasi bulanan")).toBeVisible();
    await page.getByRole("button", { name: "Riwayat Tagihan" }).click();
    await expect(page.getByText("Belum ada riwayat tagihan")).toBeVisible();
    await page.getByRole("button", { name: "Kembali ke Ruang Belajar" }).click();
    await expect(page.getByRole("heading", { name: "Ruang Khusus Ayah/Bunda" })).toBeVisible();
  });

  test("Parent Hub only displays submitted reports belonging to the signed-in student", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(2).click();
    await page.locator("#demo-account").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Masuk sebagai Siswa" }).click();

    await page.evaluate(() => {
      localStorage.setItem("b2b_session_reports_store", JSON.stringify({
        own_report: {
          id: "own_report", studentId: "usr_stu_001", studentName: "Alex Pratama",
          sessionDate: "2026-11-18", sessionNumber: 5, topic: "Laporan khusus Alex",
          activities: "Membuat animasi Scratch", achievements: "Berhasil membuat gerakan",
          tutorId: "usr_tea_001", tutorName: "Kak Sarah", status: "submitted"
        },
        other_report: {
          id: "other_report", studentId: "usr_stu_002", studentName: "Budi Santoso",
          sessionDate: "2026-11-18", sessionNumber: 5, topic: "Laporan milik Budi",
          activities: "Data siswa lain", achievements: "Data siswa lain",
          tutorId: "usr_tea_001", tutorName: "Kak Sarah", status: "submitted"
        },
        own_draft: {
          id: "own_draft", studentId: "usr_stu_001", studentName: "Alex Pratama",
          sessionDate: "2026-11-19", topic: "Draft yang belum dikirim",
          activities: "Draft", achievements: "Draft",
          tutorId: "usr_tea_001", tutorName: "Kak Sarah", status: "draft"
        }
      }));
    });

    await page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ }).click();
    await expect(page.getByRole("heading", { name: "Laporan khusus Alex" })).toBeVisible();
    await expect(page.getByText("Laporan milik Budi")).toHaveCount(0);
    await expect(page.getByText("Draft yang belum dikirim")).toHaveCount(0);
  });

  test("billing creates reviewable month-closed drafts with manual rates, adjustments, deduplication and payment history", async ({ page }) => {
    const result = await page.evaluate(async ({ classSource, billingSource }) => {
      localStorage.removeItem("b2b_class_sessions_store");
      localStorage.removeItem("b2b_billing_store");
      const classUrl = URL.createObjectURL(new Blob([classSource], { type: "text/javascript" }));
      const billingModuleSource = billingSource.replace("./class-session-store.js", classUrl);
      const billingUrl = URL.createObjectURL(new Blob([billingModuleSource], { type: "text/javascript" }));
      const { ClassSessionStore } = await import(classUrl);
      const { BillingStore } = await import(billingUrl);
      URL.revokeObjectURL(classUrl);
      URL.revokeObjectURL(billingUrl);
      const admin = { id: "admin-1", role: "admin" };
      const tutor = { id: "tutor-1", role: "tutor" };
      const makeSession = (id: string, number: number) => ClassSessionStore.createSession({
        id, seriesId: "series-bill", sessionNumber: number, studentId: "student-bill",
        tutorId: "tutor-1", scheduledStartAt: "2026-10-" + String(10 + number).padStart(2, "0") + "T09:00:00+07:00",
        durationMinutes: 60
      });
      makeSession("bill-present", 1);
      makeSession("bill-late", 2);
      makeSession("bill-absent", 3);
      makeSession("bill-pending", 4);
      ClassSessionStore.recordAttendance("bill-present", "present", tutor);
      ClassSessionStore.recordAttendance("bill-late", "late", tutor);
      ClassSessionStore.recordAttendance("bill-absent", "absent", tutor);

      const forbiddenRate = BillingStore.setRate("student-bill", 80000, tutor);
      const invalidRate = BillingStore.setRate("student-bill", 0, admin);
      const rate = BillingStore.setRate("student-bill", 75000, admin);
      const premature = BillingStore.createInvoice("student-bill", "2026-11", admin);
      const draft = BillingStore.createInvoice("student-bill", "2026-10", admin);
      const duplicate = BillingStore.createInvoice("student-bill", "2026-10", admin);
      const parentBeforeIssue = BillingStore.getStudentInvoices("student-bill").length;
      const unpaidBeforeIssue = BillingStore.getUnpaidStudentInvoices("student-bill").length;
      const correction = BillingStore.updateDraftInvoice(draft.invoice.id, {
        sessionIds: ["bill-present", "bill-late"],
        discountAmount: 5000,
        additionalCharges: 10000,
        totalAmount: 154000,
        adjustmentNote: "Penyesuaian khusus admin"
      }, admin);
      const issued = BillingStore.issueInvoice(draft.invoice.id, admin);
      const changedRate = BillingStore.setRate("student-bill", 90000, admin);
      const markPaid = BillingStore.markPaid(draft.invoice.id, admin);
      const unpaidAfter = BillingStore.getUnpaidStudentInvoices("student-bill").length;
      const history = BillingStore.getStudentInvoices("student-bill");

      return {
        forbiddenRate: forbiddenRate.error,
        invalidRate: invalidRate.error,
        rate: rate.success,
        premature: premature.error,
        draft: draft.success,
        draftStatus: draft.invoice?.status,
        invoiceCount: draft.invoice?.totalSessions,
        invoiceTotal: draft.invoice?.totalAmount,
        snapshotRate: draft.invoice?.rateSnapshot,
        itemIds: draft.invoice?.items.map((item: { sessionId: string }) => item.sessionId),
        duplicate: duplicate.error,
        parentBeforeIssue,
        unpaidBeforeIssue,
        correction: correction.success,
        correctedTotal: correction.invoice?.totalAmount,
        discountAmount: correction.invoice?.discountAmount,
        additionalCharges: correction.invoice?.additionalCharges,
        adjustmentNote: correction.invoice?.adjustmentNote,
        issued: issued.success,
        issuedStatus: issued.invoice?.status,
        changedRate: changedRate.success,
        markPaid: markPaid.success,
        unpaidAfter,
        historyCount: history.length,
        historyStatus: history[0]?.status,
        historySnapshotRate: history[0]?.rateSnapshot,
        hasPaidAt: Object.prototype.hasOwnProperty.call(history[0] || {}, "paidAt"),
        hasPaidBy: Object.prototype.hasOwnProperty.call(history[0] || {}, "paidBy")
      };
    }, { classSource: classSessionStoreSource, billingSource: billingStoreSource });

    expect(result.forbiddenRate).toBe("FORBIDDEN");
    expect(result.invalidRate).toBe("INVALID_RATE");
    expect(result.rate).toBe(true);
    expect(result.premature).toBe("PERIOD_NOT_CLOSED");
    expect(result.draft).toBe(true);
    expect(result.draftStatus).toBe("draft");
    expect(result.invoiceCount).toBe(2);
    expect(result.invoiceTotal).toBe(150000);
    expect(result.snapshotRate).toBe(75000);
    expect(result.itemIds).toEqual(["bill-present", "bill-late"]);
    expect(result.duplicate).toBe("NO_BILLABLE_SESSIONS");
    expect(result.parentBeforeIssue).toBe(0);
    expect(result.unpaidBeforeIssue).toBe(0);
    expect(result.correction).toBe(true);
    expect(result.correctedTotal).toBe(154000);
    expect(result.discountAmount).toBe(5000);
    expect(result.additionalCharges).toBe(10000);
    expect(result.adjustmentNote).toBe("Penyesuaian khusus admin");
    expect(result.issued).toBe(true);
    expect(result.issuedStatus).toBe("unpaid");
    expect(result.changedRate).toBe(true);
    expect(result.markPaid).toBe(true);
    expect(result.unpaidAfter).toBe(0);
    expect(result.historyCount).toBe(1);
    expect(result.historyStatus).toBe("paid");
    expect(result.historySnapshotRate).toBe(75000);
    expect(result.hasPaidAt).toBe(false);
    expect(result.hasPaidBy).toBe(false);
  });

  test("admin can set a manual student rate, review a monthly draft and issue it", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("b2b_class_sessions_store", JSON.stringify({
        "ui-billable-session": {
          id: "ui-billable-session", seriesId: "ui-billing-series", sessionNumber: 3,
          studentId: "usr_stu_001", tutorId: "usr_tea_001",
          scheduledStartAt: "2026-10-10T09:00:00+07:00", durationMinutes: 60,
          status: "held", attendanceStatus: "present", replacementRequired: false
        }
      }));
    });
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();
    await page.getByRole("button", { name: /Tarif & Tagihan/ }).click();

    await expect(page.getByRole("heading", { name: "Tarif per siswa" })).toBeVisible();
    await page.locator("#rate-usr_stu_001").fill("85000");
    await page.locator('[data-rate-form="usr_stu_001"] button[type="submit"]').click();
    await expect(page.getByText(/Tarif saat ini: Rp\s?85\.000/)).toBeVisible();

    await page.locator("#invoice-student").selectOption("usr_stu_001");
    await page.locator("#invoice-period").fill("2026-10");
    await page.getByRole("button", { name: "Buat draft" }).click();
    const draft = page.locator('[data-draft-form]');
    await expect(draft).toBeVisible();
    await expect(draft).toContainText("Sesi ke-3");
    await draft.locator('[name="discountAmount"]').fill("5000");
    await draft.locator('[name="additionalCharges"]').fill("10000");
    await draft.locator('[name="totalAmount"]').fill("90000");
    await draft.getByRole("button", { name: "Simpan koreksi" }).click();
    await expect(page.locator('[data-draft-form] [name="totalAmount"]')).toHaveValue("90000");
    await draft.getByRole("button", { name: "Terbitkan tagihan" }).click();
    await expect(page.getByText("Belum dibayar")).toBeVisible();
    await expect(page.locator('[data-draft-form]')).toHaveCount(0);
  });

  test("Parent Hub invoice history is scoped to the signed-in student and includes paid invoices", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(2).click();
    await page.locator("#demo-account").selectOption("usr_stu_001");
    await page.evaluate(() => {
      localStorage.setItem("b2b_billing_store", JSON.stringify({
        rates: {},
        invoices: {
          alex_invoice: {
            id: "alex_invoice", studentId: "usr_stu_001", period: "2026-11",
            status: "paid", rateSnapshot: 75000, totalSessions: 2, subtotalAmount: 150000,
            discountAmount: 5000, additionalCharges: 10000, totalAmount: 155000,
            adjustmentNote: "Biaya proyek khusus", items: [{ sessionId: "alex-s1", sessionNumber: 1, sessionDate: "2026-11-10T09:00:00+07:00", amount: 75000 }],
            createdAt: "2026-11-19T08:00:00.000Z"
          },
          alex_draft: {
            id: "alex_draft", studentId: "usr_stu_001", period: "2026-11",
            status: "draft", rateSnapshot: 75000, totalSessions: 1, totalAmount: 75000,
            items: [{ sessionId: "alex-draft-s1", sessionNumber: 3, sessionDate: "2026-11-12T09:00:00+07:00", amount: 75000 }],
            createdAt: "2026-11-19T08:00:00.000Z"
          },
          budi_invoice: {
            id: "budi_invoice", studentId: "usr_stu_002", period: "2026-11",
            status: "unpaid", rateSnapshot: 90000, totalSessions: 1, totalAmount: 90000,
            items: [{ sessionId: "budi-s1", sessionNumber: 1, sessionDate: "2026-11-11T09:00:00+07:00", amount: 90000 }],
            createdAt: "2026-11-19T08:00:00.000Z", paidAt: null, paidBy: null
          }
        }
      }));
    });
    await page.getByRole("button", { name: "Masuk sebagai Siswa" }).click();
    await page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ }).click();
    await page.getByRole("button", { name: "Riwayat Tagihan" }).click();

    await expect(page.getByText("Tagihan November 2026")).toBeVisible();
    await expect(page.locator('[data-parent-invoice-id="alex_invoice"]')).toContainText("155.000");
    await expect(page.locator('[data-parent-invoice-id="alex_invoice"]')).toContainText("Diskon khusus");
    await expect(page.locator('[data-parent-invoice-id="alex_invoice"]')).toContainText("Biaya tambahan");
    await expect(page.locator('[data-parent-invoice-id="alex_invoice"]')).toContainText("Biaya proyek khusus");
    await expect(page.getByText("Lunas")).toBeVisible();
    await expect(page.getByText("Tagihan milik Budi")).toHaveCount(0);
    await expect(page.locator('[data-parent-invoice-id="alex_invoice"]')).toBeVisible();
    await expect(page.locator('[data-parent-invoice-id="budi_invoice"]')).toHaveCount(0);
    await expect(page.locator('[data-parent-invoice-id="alex_draft"]')).toHaveCount(0);
  });

  test("student can sign in and see the learning dashboard", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(2).click();
    await page.locator("#demo-account").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Masuk sebagai Siswa" }).click();
    await expect(page.getByRole("heading", { name: /Halo, Alex/ })).toBeVisible();
    await expect(page.getByText("Poin menuju level berikutnya", { exact: false })).toBeVisible();
  });

  test("inactive student account is not offered for demo sign-in", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(2).click();
    const options = await page.locator("#demo-account option").allTextContents();
    expect(options.some((option) => option.includes("Fajar Nugraha"))).toBe(false);
  });

  test("session survives reload and logout returns to role selection", async ({ page }) => {
    await page.getByRole("button", { name: /Pilih ruang/ }).nth(0).click();
    await page.locator("#demo-account").selectOption("usr_adm_001");
    await page.getByRole("button", { name: "Masuk sebagai Admin" }).click();
    await expect(page.getByRole("heading", { name: "Manajemen Identitas & Hak Akses Pengguna" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Manajemen Identitas & Hak Akses Pengguna" })).toBeVisible();
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("heading", { name: "Selamat datang di Bits2Bytes!" })).toBeVisible();
  });
});
