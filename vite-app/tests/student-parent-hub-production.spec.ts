import { expect, test, type Page } from "@playwright/test";

async function mockStudentPortalWithCurriculum(page: Page) {
  const host = "b2b-e2e.supabase.test";
  const userId = "production-student";
  const email = "student@bits2bytes.test";
  const createdAt = "2026-01-01T00:00:00.000Z";
  const appOrigin = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:4173";
  const cors = {
    "access-control-allow-origin": appOrigin,
    "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400"
  };
  const jsonHeaders = { ...cors, "content-type": "application/json" };
  let progressVersion = 0;

  await page.route(`https://${host}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
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
          email: "student@bits2bytes.test",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: createdAt,
          updated_at: createdAt,
          is_anonymous: false
        })
      });
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

    if (url.pathname === "/rest/v1/rpc/list_my_released_topic_ids" && request.method() === "POST") {
      const payload = request.postDataJSON() as { p_module_id: number };
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(payload.p_module_id === 29 ? [{ topic_id: 146 }] : [])
      });
      return;
    }

    if (url.pathname === "/rest/v1/rpc/get_my_topic_stage_progress" && request.method() === "POST") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }

    if (url.pathname === "/rest/v1/rpc/get_my_parent_hub_module" && request.method() === "POST") {
      const payload = request.postDataJSON() as { p_module_id: number };
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(payload.p_module_id === 29 ? {
          topics: [{ id: 146, title: "Topik Pertama", order: 0, lessonState: "in-progress", updatedAt: createdAt,
            stages: { brief: "completed", materials: "completed" },
            quizAttempts: [{ attemptNumber: 1, score: 80, submittedAt: createdAt }],
            projects: [{ id: 31, title: "Animasi Saya", url: "https://scratch.mit.edu/projects/1", status: "pending", submittedAt: createdAt, reviewNote: null }] }],
          finalBoss: null, certificate: null
        } : { topics: [], finalBoss: null, certificate: null })
      });
      return;
    }

    if (url.pathname === "/rest/v1/session_reports" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{
          id: "report-1",
          student_id: userId,
          tutor_id: "tutor-1",
          meeting_id: 11,
          session_date: "2026-11-20",
          session_number: 1,
          topic: "Animasi Scratch",
          activities: "Membuat sprite bergerak",
          achievements: "Berhasil membuat animasi",
          difficulties: "",
          solutions: "",
          parent_recommendations: "Latihan 10 menit",
          competencies: {},
          status: "submitted",
          version: 1,
          created_at: createdAt,
          updated_at: createdAt,
          submitted_at: createdAt
        }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/monthly_evaluations" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{
          id: "evaluation-1",
          student_id: userId,
          tutor_id: "tutor-1",
          period: "2026-11",
          rating: "Baik",
          summary: "Kemajuan konsisten",
          strengths: "Kreatif",
          next_goals: "Latihan logika",
          status: "published",
          version: 1,
          created_at: createdAt,
          updated_at: createdAt,
          published_at: createdAt
        }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/invoices" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify([{
          id: "invoice-1",
          student_id: userId,
          month_year: "2026-10",
          total_meetings: 1,
          attended_meetings: 1,
          price_per_meeting: 50000,
          total_amount: 50000,
          status: "sent",
          currency: "IDR",
          discount_amount: 0,
          additional_charges: 0,
          adjustment_note: "",
          created_at: createdAt,
          updated_at: createdAt,
          invoice_items: [{
            id: "item-1",
            meeting_id: 11,
            session_number: 1,
            session_date: "2026-10-20T09:00:00.000Z",
            description: "Pertemuan Scratch",
            amount: 50000
          }],
          invoice_payments: []
        }])
      });
      return;
    }

    if (url.pathname === "/rest/v1/student_lesson_progress" && request.method() === "GET") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }

    if (url.pathname === "/rest/v1/rpc/get_student_challenge_submission" && request.method() === "POST") {
      await route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" });
      return;
    }

    if (url.pathname === "/rest/v1/rpc/submit_student_challenge" && request.method() === "POST") {
      const payload = request.postDataJSON() as {
        p_topic_id: number;
        p_submission_url: string;
        p_submission_note: string | null;
      };
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: 31,
          challenge_id: 13,
          student_id: userId,
          submission_url: payload.p_submission_url,
          submission_note: payload.p_submission_note,
          status: "pending",
          review_note: null,
          reviewed_by: null,
          reviewed_at: null,
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      });
      return;
    }

    if (url.pathname === "/rest/v1/rpc/save_student_lesson_progress" && request.method() === "POST") {
      const payload = request.postDataJSON() as {
        p_state: string;
        p_checkpoints: Record<string, boolean>;
        p_submission_draft: { link?: string; notes?: string } | null;
        p_slide_index: number;
      };
      progressVersion += 1;
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          id: 12,
          student_id: userId,
          topic_id: 146,
          state: payload.p_state,
          checkpoints: payload.p_checkpoints,
          submission_draft: payload.p_submission_draft,
          slide_index: payload.p_slide_index,
          version: progressVersion,
          updated_at: new Date().toISOString()
        })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: jsonHeaders,
      body: JSON.stringify({ message: `Unexpected request: ${request.method()} ${url.pathname}` })
    });
  });
}

test("production student Parent Hub reads only submitted Supabase records and issued invoices", async ({ page }) => {
  await mockStudentPortalWithCurriculum(page);
  await page.goto("/");
  await page.getByLabel("Nomor WhatsApp").fill("081234567890");
  await page.getByLabel("MPIN (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByRole("heading", { name: "Ruang Belajarku" })).toBeVisible();
  await expect(page.locator(".hero-xp-container, .hero-stat-pills, .mission-progress-box")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Gamifikasi" })).toBeVisible();
  await expect(page.getByText(/Tidak ada akun orang tua terpisah/)).toBeVisible();
  await expect(page.locator(".parent-hub-entry-card").getByText("Lihat laporan belajar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Buka Ruang Ayah\/Bunda/ }).click();
  await expect(page.getByRole("heading", { name: "Laporan Belajar Siswa E2E" })).toBeVisible();
  await expect(page.getByText("Topik diselesaikan", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Progres Topik" }).click();
  await expect(page.getByText("Topik Pertama", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Portofolio Karya" }).click();
  await expect(page.getByText("Animasi Saya", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Laporan Sesi" }).click();
  await expect(page.getByText("Animasi Scratch", { exact: true })).toBeVisible();
  await expect(page.getByText("Membuat sprite bergerak", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Perkembangan Bulanan" }).click();
  await expect(page.getByText("Kemajuan konsisten", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Riwayat Tagihan" }).click();
  await expect(page.getByText("Tagihan Oktober 2026", { exact: true })).toBeVisible();
  await expect(page.locator("[data-parent-invoice-id]").first()).toContainText("50.000");
  await page.getByRole("button", { name: /Kembali ke Ruang Belajar/ }).click();
});
