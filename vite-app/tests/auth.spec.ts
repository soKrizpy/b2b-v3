import { expect, test, type Page } from "@playwright/test";

const supabaseHost = "b2b-e2e.supabase.test";
const supabaseOrigin = `https://${supabaseHost}`;
const appOrigin = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:4173";
const assessmentCorsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-max-age": "86400"
};

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
    "access-control-allow-origin": appOrigin,
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
    if (url.pathname === "/rest/v1/rpc/list_tutor_assigned_students" && request.method() === "POST") {
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

async function signInE2eStudent(page: Page) {
  await mockSupabaseAuth(page, "student");
  await page.goto("/");
  await page.getByRole("button", { name: "Guru / Admin" }).click();
  await page.getByLabel("Email").fill("student@bits2bytes.test");
  await page.getByLabel("Password").fill("valid-e2e-password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("heading", { name: "Ruang Belajarku" })).toBeVisible();
}

async function mountFinalBoss(page: Page, moduleId: number) {
  await page.evaluate(async (id) => {
    const [reactModule, reactDomModule, { default: ModuleFinalBoss }] = await Promise.all([
      import("/node_modules/.vite/deps/react.js"),
      import("/node_modules/.vite/deps/react-dom_client.js"),
      import("/src/ModuleFinalBoss.tsx")
    ]);
    const createElement = reactModule.createElement ?? reactModule.default?.createElement;
    const createRoot = reactDomModule.createRoot ?? reactDomModule.default?.createRoot;
    if (typeof createElement !== "function" || typeof createRoot !== "function") {
      throw new Error("Unable to resolve React DOM client exports for Final Boss test");
    }
    const mount = document.createElement("div");
    mount.id = "final-boss-component-test";
    document.body.append(mount);
    createRoot(mount).render(createElement(ModuleFinalBoss, { moduleId: id }));
  }, moduleId);
}

test.describe("Supabase Auth portal", () => {
  test("shows WhatsApp/MPIN student login by default and no demo-account selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Selamat datang di Bits2Bytes!" })).toBeVisible();
    await expect(page.getByLabel("Nomor WhatsApp")).toBeVisible();
    await expect(page.getByLabel("MPIN (6 digit)")).toBeVisible();
    await expect(page.getByText(/Hubungi Admin Bits2Bytes/)).toBeVisible();
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
      if (role === "teacher") {
        const navigation = page.getByRole("navigation", { name: "Bagian halaman" });
        await expect(navigation).toBeVisible();
        await expect(navigation.getByRole("link", { name: "Jadwal" })).toHaveAttribute("href", "#tutor-schedule");
        await expect(navigation.getByRole("link", { name: "Catatan belajar" })).toHaveAttribute("href", "#tutor-learning-records");
      }
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
    await expect(page.getByRole("button", { name: /Akses Kurikulum/ })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: /Akses Kurikulum/ }).click();
    await expect(page.getByRole("button", { name: /Akses Kurikulum/ })).toHaveAttribute("aria-pressed", "true");
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
        const metrics = await page.evaluate(() => {
          const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return {
                tag: element.tagName.toLowerCase(),
                id: element.id,
                className: typeof element.className === "string" ? element.className : "",
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                minWidth: style.minWidth,
                position: style.position,
                overflowX: style.overflowX
              };
            })
            .filter((item) => item.width > 0 && item.right > window.innerWidth + 1)
            .sort((a, b) => b.right - a.right)
            .slice(0, 15);
          const layoutSelectors = [".app-shell", ".app-sidebar", ".app-container", ".app-header", ".app-main", ".header-left", ".header-right"];
          const layout = layoutSelectors.map((selector) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) return { selector, missing: true };
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              selector,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              flex: style.flex,
              flexShrink: style.flexShrink,
              widthStyle: style.width,
              minWidth: style.minWidth,
              position: style.position
            };
          });
          return {
            viewport: window.innerWidth,
            scrollX: window.scrollX,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            layout,
            offenders
          };
        });
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

  test("student Final Boss renders questions, submits answers, and refreshes attempt history", async ({ page }) => {
    await signInE2eStudent(page);

    let submittedAnswers: Array<{ questionId: number; selectedOption: string }> = [];
    let submitRequestCount = 0;
    let submitted = false;
    const questions = Array.from({ length: 20 }, (_, index) => ({
      id: 101 + index,
      questionText: index === 0 ? "Apa fungsi HTML?" : index === 1 ? "Atribut untuk tujuan tautan adalah?" : `Pertanyaan ${index + 1}`,
      options: {
        A: "Pilihan A",
        B: index === 0 ? "Menyusun struktur halaman" : "Pilihan B",
        C: index === 1 ? "href" : "Pilihan C",
        D: "Pilihan D"
      }
    }));
    await page.route(`https://${supabaseHost}/functions/v1/student-module-assessment`, async (route) => {
      const request = route.request();
      const headers = {
        ...assessmentCorsHeaders,
        "content-type": "application/json"
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: assessmentCorsHeaders });
        return;
      }
      const payload = request.postDataJSON() as {
        action: "load" | "submit";
        moduleId: number;
        answers?: Array<{ questionId: number; selectedOption: string }>;
      };
      if (payload.moduleId !== 10) {
        await route.fulfill({ status: 404, headers, body: JSON.stringify({ error: "Assessment unavailable" }) });
        return;
      }
      if (payload.action === "load") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            assessment: { id: 1, title: "Ujian Basic Visual Web", moduleId: 10 },
            questions,
            attempts: submitted ? [{
              attempt_number: 1,
              score: 50,
              best_score: 50,
              submitted_at: "2026-11-24T05:00:00.000Z"
            }] : [],
            attemptsRemaining: submitted ? 0 : 1
          })
        });
        return;
      }
      submitRequestCount += 1;
      submittedAnswers = payload.answers ?? [];
      await new Promise((resolve) => setTimeout(resolve, 150));
      submitted = true;
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          result: {
            attemptNumber: 1,
            score: 50,
            bestScore: 50,
            correctCount: 10,
            totalQuestions: 20,
            submittedAt: "2026-11-24T05:00:00.000Z"
          },
          attemptsRemaining: 0
        })
      });
    });

    await mountFinalBoss(page, 10);

    await expect(page.getByRole("heading", { name: "Ujian Basic Visual Web" })).toBeVisible();
    await expect(page.getByText("20 soal")).toBeVisible();
    await expect(page.getByText("Apa fungsi HTML?")).toBeVisible();
    await expect(page.getByText("Atribut untuk tujuan tautan adalah?")).toHaveCount(0);
    await expect(page.getByText("Soal 1 dari 20")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
    const nextQuestion = page.getByRole("button", { name: "Soal Berikutnya" });
    await expect(nextQuestion).toBeDisabled();
    await expect(page.getByRole("button", { name: "Kirim jawaban Final Boss" })).toHaveCount(0);
    await page.locator('input[name="assessment-question-101"][value="B"]').check();
    await expect(nextQuestion).toBeEnabled();
    await nextQuestion.click();
    await expect(page.getByText("Apa fungsi HTML?")).toHaveCount(0);
    await expect(page.getByText("Atribut untuk tujuan tautan adalah?")).toBeVisible();
    await expect(page.getByText("Soal 2 dari 20")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
    await expect(page.locator(".module-final-boss__meta")).toContainText("Terjawab: 1 dari 20");
    await page.locator('input[name="assessment-question-102"][value="C"]').check();
    await page.getByRole("button", { name: "Soal Berikutnya" }).click();
    for (let questionIndex = 2; questionIndex < 19; questionIndex += 1) {
      await page.locator(`input[name="assessment-question-${101 + questionIndex}"][value="A"]`).check();
      await page.getByRole("button", { name: "Soal Berikutnya" }).click();
    }
    await expect(page.getByText("Soal 20 dari 20")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByRole("button", { name: "Soal Berikutnya" })).toHaveCount(0);
    const submitButton = page.getByRole("button", { name: "Kirim jawaban Final Boss" });
    await expect(submitButton).toBeEnabled();
    await page.locator('input[name="assessment-question-120"][value="D"]').check();
    await expect(submitButton).toBeEnabled();
    await submitButton.dblclick();

    await expect(page.getByText("Percobaan 1 selesai — nilai 50/100")).toBeVisible();
    await expect(page.getByText("Percobaan 1: 50/100")).toBeVisible();
    await expect(page.getByText("Sisa percobaan:").locator("..")).toContainText("0 dari 1");
    expect(submitRequestCount).toBe(1);
    expect(submittedAnswers).toEqual([
      { questionId: 101, selectedOption: "B" },
      { questionId: 102, selectedOption: "C" },
      ...Array.from({ length: 17 }, (_, index) => ({ questionId: 103 + index, selectedOption: "A" })),
      { questionId: 120, selectedOption: "D" }
    ]);
  });

  test("student Final Boss renders the empty-assessment state", async ({ page }) => {
    await signInE2eStudent(page);
    await page.route(`${supabaseOrigin}/functions/v1/student-module-assessment`, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: assessmentCorsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: { ...assessmentCorsHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          assessment: { id: 2, title: "Ujian Kosong", moduleId: 10 },
          questions: [],
          attempts: [],
          attemptsRemaining: 1
        })
      });
    });
    await mountFinalBoss(page, 10);

    await expect(page.getByText("Final Boss harus memiliki tepat 20 soal valid.")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Soal Berikutnya" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Kirim jawaban Final Boss" })).toHaveCount(0);
  });

  test("student Final Boss reports an assessment-load error", async ({ page }) => {
    await signInE2eStudent(page);
    await page.route(`${supabaseOrigin}/functions/v1/student-module-assessment`, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: assessmentCorsHeaders });
        return;
      }
      await route.fulfill({
        status: 503,
        headers: { ...assessmentCorsHeaders, "content-type": "application/json" },
        body: JSON.stringify({ error: "Ujian sedang tidak dapat dimuat." })
      });
    });
    await mountFinalBoss(page, 10);

    await expect(page.locator(".module-final-boss__error")).toContainText("Ujian sedang tidak dapat dimuat.");
    await expect(page.getByRole("button", { name: "Soal Berikutnya" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Kirim jawaban Final Boss" })).toHaveCount(0);
  });

});
