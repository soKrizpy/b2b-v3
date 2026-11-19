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
    await page.locator("#select-rel-tutor").selectOption({ label: /Kak Rina/ });
    await page.locator("#select-rel-student").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Tugaskan" }).click();

    await expect(page.getByRole("alert")).toContainText("masih memiliki tutor aktif: Kak Sarah");
    await expect(page.locator("#admin-tutor-rel-modal")).toHaveClass(/is-open/);

    await page.locator('[data-action="delete-tutor-rel"][data-tutor-id="usr_tea_001"][data-student-id="usr_stu_001"]').click();
    const releasedAssignment = page.locator("#admin-tab-body .card").filter({ hasText: "Tutor: Kak Sarah" }).filter({ hasText: "Siswa: Alex Pratama" });
    await expect(releasedAssignment).toContainText("inactive");

    await page.getByRole("button", { name: /Tambah Penugasan Tutor/ }).click();
    await page.locator("#select-rel-tutor").selectOption({ label: /Kak Rina/ });
    await page.locator("#select-rel-student").selectOption("usr_stu_001");
    await page.getByRole("button", { name: "Tugaskan" }).click();

    const newAssignment = page.locator("#admin-tab-body .card").filter({ hasText: "Tutor: Kak Rina" }).filter({ hasText: "Siswa: Alex Pratama" });
    await expect(newAssignment).toContainText("active");
    await expect(releasedAssignment).toContainText("inactive");
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
