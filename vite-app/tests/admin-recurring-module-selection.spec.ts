import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const adminWorkspaceUrl = `/@fs/${resolve(process.cwd(), "../js/admin/admin-workspace.js").replace(/\\/g, "/")}`;

test("Admin recurring schedule offers only the selected student's active Modules and fixes the series at 16 sessions", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async (moduleUrl) => {
    const { AdminWorkspace } = await import(moduleUrl);
    const container = document.createElement("div");
    container.className = "admin-workspace-host";
    document.body.append(container);

    let capturedInput: Record<string, unknown> | null = null;
    const workspace = new AdminWorkspace(container, { id: "admin-1", role: "admin" }, {
      classSessions: {
        createRecurringSeries: async (input: Record<string, unknown>) => {
          capturedInput = input;
          return { success: false, error: { code: "TEST_STOP", message: "Test stops before persistence." } };
        }
      }
    });
    workspace.activeTab = "schedule";
    workspace.users = [
      { id: "student-1", displayName: "Siswa Satu", role: "student", status: "active" },
      { id: "student-2", displayName: "Siswa Dua", role: "student", status: "active" },
      { id: "tutor-1", displayName: "Tutor", role: "tutor", status: "active" }
    ] as never;
    workspace.modules = [
      { id: 10, title: "Modul A", isPublished: true },
      { id: 11, title: "Modul B", isPublished: true },
      { id: 12, title: "Modul Tidak Aktif", isPublished: false },
      { id: 20, title: "Modul C", isPublished: true }
    ] as never;
    workspace.moduleAssignments = [
      { studentId: "student-1", moduleId: 10, status: "active" },
      { studentId: "student-1", moduleId: 11, status: "paused" },
      { studentId: "student-1", moduleId: 12, status: "active" },
      { studentId: "student-2", moduleId: 20, status: "active" }
    ] as never;
    workspace.render();
    workspace.refreshData = async () => {};
    (window as Window & { __adminWorkspaceFixture?: { getInput: () => Record<string, unknown> | null } })
      .__adminWorkspaceFixture = { getInput: () => capturedInput };
  }, adminWorkspaceUrl);

  const form = page.locator("#admin-create-series-form");
  const student = form.locator('[name="studentId"]');
  const moduleSelect = form.locator('[name="moduleId"]');

  await student.selectOption("student-1");
  await expect(moduleSelect.locator("option")).toHaveCount(2);
  await expect(moduleSelect.locator("option").nth(1)).toHaveText("Modul A");
  await student.selectOption("student-2");
  await expect(moduleSelect.locator("option")).toHaveCount(2);
  await expect(moduleSelect.locator("option").nth(1)).toHaveText("Modul C");
  await moduleSelect.selectOption("20");

  await form.locator('[name="tutorId"]').selectOption("tutor-1");
  await form.locator('[name="startDate"]').fill("2026-12-01");
  await form.locator('[name="startTime"]').fill("10:00");
  await form.locator('[name="durationMinutes"]').fill("60");
  await form.locator('[name="weekdays"][value="2"]').check();
  await form.getByRole("button", { name: "Buat seri jadwal" }).click();

  const request = await page.evaluate(() =>
    (window as Window & { __adminWorkspaceFixture?: { getInput: () => Record<string, unknown> | null } })
      .__adminWorkspaceFixture?.getInput()
  );
  expect(request).toMatchObject({
    studentId: "student-2",
    tutorId: "tutor-1",
    moduleId: 20,
    targetCount: 16,
    weekdays: [2]
  });
  expect(form.locator('[name="targetCount"]')).toHaveCount(0);
});
