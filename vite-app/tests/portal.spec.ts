import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const classSessionStoreSource = readFileSync(resolve(process.cwd(), "../js/services/class-session-store.js"), "utf8");

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
        scheduledStartAt: "2026-11-25T09:00:00+07:00", durationMinutes: 60
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
