import { expect, test } from "@playwright/test";

test.describe("Bits2Bytes demo portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
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
