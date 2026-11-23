import { expect, test, type Page } from "@playwright/test";

const supabaseHost = "b2b-e2e.supabase.test";
const supabaseOrigin = `https://${supabaseHost}`;

async function mockSupabaseAuth(page: Page, role: "admin" | "teacher" | "student") {
  const userId = `e2e-${role}-user`;
  const email = `${role}@bits2bytes.test`;
  const createdAt = "2026-01-01T00:00:00.000Z";
  const accounts: Array<Record<string, unknown>> = [{
    id: "e2e-admin-user",
    email: "admin@bits2bytes.test",
    displayName: "E2E Admin",
    role: "admin",
    status: "active",
    avatar: "EA",
    createdAt,
    updatedAt: createdAt
  }, {
    id: "e2e-student-user",
    email: "student@bits2bytes.test",
    displayName: "E2E Student",
    role: "student",
    status: "active",
    avatar: "ES",
    createdAt,
    updatedAt: createdAt
  }];
  const studentModuleRows: Array<Record<string, unknown>> = [];
  const corsHeaders = {
    "access-control-allow-origin": "http://127.0.0.1:4173",
    "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400"
  };

  await page.route(`https://${supabaseHost}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const jsonHeaders = { ...corsHeaders, "content-type": "application/json" };

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname === "/functions/v1/admin-list-users" && request.method() === "POST") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ source: "supabase", accounts }) });
      return;
    }

    if (url.pathname === "/functions/v1/admin-manage-user" && request.method() === "POST") {
      const payload = request.postDataJSON() as {
        action: string; displayName?: string; email?: string; role?: string; status?: string;
        gradeLevel?: string; whatsapp?: string;
      };
      const account = {
        id: "e2e-created-student",
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
        status: payload.status ?? "active",
        avatar: "ES",
        gradeLevel: payload.gradeLevel,
        whatsapp: payload.whatsapp,
        createdAt,
        updatedAt: createdAt
      };
      accounts.push(account);
      await route.fulfill({ status: 201, headers: jsonHeaders, body: JSON.stringify({ user: account, source: "supabase" }) });
      return;
    }

    if (url.pathname === "/rest/v1/meetings" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }
    if (url.pathname === "/rest/v1/modules" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{ id: 29, title: "Scratch Beginner", description: "Kurikulum awal", is_active: true }])
      });
      return;
    }
    if (url.pathname === "/rest/v1/student_modules" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(studentModuleRows) });
      return;
    }
    if (url.pathname === "/rest/v1/student_modules" && request.method() === "POST") {
      const payload = request.postDataJSON() as { student_id: string; module_id: number; status: string };
      const existing = studentModuleRows.find(row => row.student_id === payload.student_id && row.module_id === payload.module_id);
      const row = existing ?? {
        id: studentModuleRows.length + 1,
        student_id: payload.student_id,
        module_id: payload.module_id,
        created_at: createdAt
      };
      row.status = payload.status;
      if (!existing) studentModuleRows.push(row);
      await route.fulfill({ status: 201, headers: jsonHeaders, body: JSON.stringify(row) });
      return;
    }
    if (url.pathname === "/rest/v1/student_modules" && request.method() === "PATCH") {
      const studentId = url.searchParams.get("student_id")?.replace(/^eq\\./, "");
      const moduleId = Number(url.searchParams.get("module_id")?.replace(/^eq\\./, ""));
      const payload = request.postDataJSON() as { status: string };
      const row = studentModuleRows.find(item => item.student_id === studentId && item.module_id === moduleId);
      if (row) row.status = payload.status;
      await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(row ? [row] : []) });
      return;
    }

    if (url.pathname === "/rest/v1/meeting_students" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }
    if (url.pathname === "/rest/v1/tutor_student_assignments" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }
    if (url.pathname === "/rest/v1/invoices" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }
    if (url.pathname === "/rest/v1/student_tariffs" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }

    if (url.pathname === "/functions/v1/student-mpin-login" && request.method() === "POST") {
      const payload = Buffer.from(JSON.stringify({
        sub: userId,
        aud: "authenticated",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
        email
      })).toString("base64url");
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          session: {
            access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.ZDJlLXNpZ25hdHVyZQ`,
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "e2e-student-refresh-token",
            user: { id: userId, email, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { role: "admin" }, created_at: createdAt }
          }
        })
      });
      return;
    }

    if (url.pathname === "/auth/v1/user" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email,
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: { role: "admin" },
          created_at: createdAt,
          updated_at: createdAt,
          is_anonymous: false
        })
      });
      return;
    }

    if (url.pathname === "/auth/v1/token" && request.method() === "POST") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          access_token: "e2e-access-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "e2e-refresh-token",
          user: {
            id: userId,
            aud: "authenticated",
            role: "authenticated",
            email,
            app_metadata: { provider: "email", providers: ["email"] },
            user_metadata: { role: "admin" },
            created_at: createdAt,
            updated_at: createdAt,
            is_anonymous: false
          }
        })
      });
      return;
    }

    if (url.pathname === "/auth/v1/logout" && request.method() === "POST") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname === "/rest/v1/profiles" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: userId,
          full_name: `E2E ${role}`,
          role,
          email,
          created_at: createdAt
        })
      });
      return;
    }

    if (url.pathname === "/rest/v1/students" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ grade: "4" })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ message: `Unexpected Supabase request: ${request.method()} ${url.pathname}` })
    });
  });
}

test.describe("Supabase Auth portal", () => {
  test("shows WhatsApp/MPIN student login by default and no demo-account selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Selamat datang di Bits2Bytes!" })).toBeVisible();
    await expect(page.getByLabel("Nomor WhatsApp")).toBeVisible();
    await expect(page.getByLabel("MPIN (6 digit)")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.locator("#demo-account")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Pilih ruang/ })).toHaveCount(0);
  });

  for (const role of ["admin", "teacher", "student"] as const) {
    test(`authenticates a real ${role} profile and resolves its trusted database role`, async ({ page }) => {
      await mockSupabaseAuth(page, role);
      await page.goto("/");
      await page.getByRole("button", { name: "Guru / Admin" }).click();
      await page.getByLabel("Email").fill(`${role}@bits2bytes.test`);
      await page.getByLabel("Password").fill("valid-e2e-password");
      await page.getByRole("button", { name: "Masuk" }).click();

      const expectedTitle = role === "teacher"
        ? "Ruang Tutor"
        : role === "student"
          ? "Ruang Belajarku"
          : "Ruang Admin";

      await expect(page.getByRole("heading", { name: expectedTitle })).toBeVisible();
      await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
      await expect(page.locator("#demo-account")).toHaveCount(0);
    });
  }

  test("authenticates a student with WhatsApp and six-digit MPIN through the server function", async ({ page }) => {
    await mockSupabaseAuth(page, "student");
    await page.goto("/");
    await page.getByLabel("Nomor WhatsApp").fill("081234567890");
    await page.getByLabel("MPIN (6 digit)").fill("123456");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("heading", { name: "Ruang Belajarku" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
  });

  test("admin production workspace assigns curriculum modules to a student", async ({ page }) => {
    await mockSupabaseAuth(page, "admin");
    await page.goto("/");
    await page.getByRole("button", { name: "Guru / Admin" }).click();
    await page.getByLabel("Email").fill("admin@bits2bytes.test");
    await page.getByLabel("Password").fill("valid-e2e-password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("heading", { name: "Ruang Admin" })).toBeVisible();
    await page.getByRole("button", { name: /Akses Kurikulum/ }).click();
    await expect(page.getByRole("heading", { name: "Akses Kurikulum Siswa" })).toBeVisible();
    await page.getByLabel("Siswa").selectOption("e2e-student-user");
    await page.getByLabel("Modul").selectOption("29");
    await page.getByRole("button", { name: "Aktifkan Modul" }).click();

    const assignmentCard = page.locator("[data-student-module-card]").filter({ hasText: "Scratch Beginner" });
    await expect(assignmentCard).toContainText("E2E Student");
    await expect(assignmentCard).toContainText("Aktif");
  });

  test("admin production workspace creates a real student account with WhatsApp and MPIN fields", async ({ page }) => {
    await mockSupabaseAuth(page, "admin");
    await page.goto("/");
    await page.getByRole("button", { name: "Guru / Admin" }).click();
    await page.getByLabel("Email").fill("admin@bits2bytes.test");
    await page.getByLabel("Password").fill("valid-e2e-password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("heading", { name: "Ruang Admin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tambah Akun" })).toBeVisible();
    await page.getByRole("button", { name: "Tambah Akun" }).click();
    await page.locator("#admin-input-name").fill("Siswa E2E Baru");
    await page.locator("#admin-input-email").fill("siswa-baru@bits2bytes.test");
    await page.locator("#admin-select-role").selectOption("student");
    await page.locator("#admin-input-grade").fill("Grade 5");
    await page.locator("#admin-input-whatsapp").fill("081234567890");
    await page.locator("#admin-input-mpin").fill("654321");
    await page.getByRole("button", { name: "Buat Akun" }).click();
    await expect(page.getByText("Siswa E2E Baru", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Penugasan Tutor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tarif & Tagihan" })).toBeVisible();
  });

  test("restores the Supabase session after reload and clears it on sign-out", async ({ page }) => {
    await mockSupabaseAuth(page, "teacher");
    await page.goto("/");
    await page.getByRole("button", { name: "Guru / Admin" }).click();
    await page.getByLabel("Email").fill("teacher@bits2bytes.test");
    await page.getByLabel("Password").fill("valid-e2e-password");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("heading", { name: "Ruang Tutor" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ruang Tutor" })).toBeVisible();

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("heading", { name: "Selamat datang di Bits2Bytes!" })).toBeVisible();
  });

  for (const role of ["admin", "teacher", "student"] as const) {
    test(`${role} authenticated workspace remains responsive in light and dark themes`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await mockSupabaseAuth(page, role);
      await page.goto("/");

      if (role === "student") {
        await page.getByLabel("Nomor WhatsApp").fill("081234567890");
        await page.getByLabel("MPIN (6 digit)").fill("123456");
      } else {
        await page.getByRole("button", { name: "Guru / Admin" }).click();
        await page.getByLabel("Email").fill(`${role}@bits2bytes.test`);
        await page.getByLabel("Password").fill("valid-e2e-password");
      }
      await page.getByRole("button", { name: "Masuk" }).click();

      const expectedTitle = role === "teacher"
        ? "Ruang Tutor"
        : role === "student"
          ? "Ruang Belajarku"
          : "Ruang Admin";
      await expect(page.getByRole("heading", { name: expectedTitle })).toBeVisible();

      const assertNoHorizontalOverflow = async () => {
        const metrics = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth
        }));
        expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
        expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
      };

      for (const width of [320, 360, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 800 });
        await assertNoHorizontalOverflow();
      }

      await page.getByRole("button", { name: "Ganti ke tampilan gelap" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      for (const width of [320, 360, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 800 });
        await assertNoHorizontalOverflow();
      }
    });
  }

});
