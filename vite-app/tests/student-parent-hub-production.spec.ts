import { expect, test, type Page } from "@playwright/test";

async function mockStudentPortalWithCurriculum(page: Page) {
  const host = "b2b-e2e.supabase.test";
  const userId = "production-student";
  const email = "student@bits2bytes.test";
  const createdAt = "2026-01-01T00:00:00.000Z";
  const cors = {
    "access-control-allow-origin": "http://127.0.0.1:4173",
    "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400"
  };
  const jsonHeaders = { ...cors, "content-type": "application/json" };

  await page.route(`https://${host}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
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
            refresh_token: "student-refresh-token",
            user: {
              id: userId,
              email,
              app_metadata: { provider: "email", providers: ["email"] },
              user_metadata: { role: "admin" },
              created_at: createdAt
            }
          }
        })
      });
      return;
    }

    if (url.pathname === "/auth/v1/user" && request.method === "GET") {
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

    if (url.pathname === "/auth/v1/token" && request.method === "POST") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          access_token: "student-access-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "student-refresh-token",
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
      await route.fulfill({ status: 204, headers: cors });
      return;
    }

    if (url.pathname === "/rest/v1/profiles" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: userId,
          full_name: "Siswa E2E",
          role: "student",
          email,
          created_at: createdAt
        })
      });
      return;
    }

    if (url.pathname === "/rest/v1/students" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ grade: "4" }) });
      return;
    }

    if (url.pathname === "/rest/v1/student_modules" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{ module_id: 29, status: "active" }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/modules" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{
          id: 29,
          title: "Scratch Beginner",
          description: "Kurikulum produksi",
          is_active: true
        }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/topics" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{
          id: 146,
          module_id: 29,
          title: "Topik Pertama",
          description: "Materi produksi",
          order_index: 0,
          lesson_content: {
            learningPath: [{ id: "slide-1", order: 1, title: "Mulai", content: "Materi pertama" }],
            quiz: [],
            challenge: []
          },
          status: "published"
        }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/student_lesson_progress" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ message: `Unexpected request: ${request.method()} ${url.pathname}` })
    });
  });
}

test("production student dashboard never opens the local-demo Parent Hub", async ({ page }) => {
  await mockStudentPortalWithCurriculum(page);
  await page.goto("/");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  await page.getByLabel("MPIN (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Ruang Belajarku" })).toBeVisible();
  await expect(page.locator(".parent-hub-entry-card").getByText("Belum tersedia", { exact: true })).toBeVisible();
  await expect(page.getByText(/tidak menampilkan data contoh pada akun asli/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Lanjutkan Misi/ }).click();
  for (let stage = 0; stage < 5; stage += 1) {
    await page.locator("#btn-stage-next").click();
  }
  await expect(page.getByText("Pengumpulan belum tersedia", { exact: true })).toBeVisible();
  await expect(page.locator("#btn-submit-project")).toHaveCount(0);
});
