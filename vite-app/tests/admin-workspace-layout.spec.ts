import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const adminWorkspaceUrl = `/@fs/${resolve(process.cwd(), "../js/admin/admin-workspace.js").replace(/\\/g, "/")}`;

async function mountAdminWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(async (moduleUrl) => {
    const { AdminWorkspace } = await import(moduleUrl);
    const container = document.createElement("div");
    container.className = "admin-workspace-host";
    document.body.append(container);

    const workspace = new AdminWorkspace(container, { role: "admin" });
    workspace.activeTab = "schedule";
    workspace.sessions = Array.from({ length: 30 }, (_, index) => ({
      id: `session-${index + 1}`,
      sessionNumber: index + 1,
      studentId: `student-${index + 1}`,
      tutorId: `tutor-${index + 1}`,
      scheduledStartAt: new Date(Date.UTC(2026, 0, 30 - index)).toISOString(),
      durationMinutes: 60,
      status: "held"
    }));
    workspace.render();
    (window as Window & { __adminWorkspaceLayoutFixture?: typeof workspace }).__adminWorkspaceLayoutFixture = workspace;
  }, adminWorkspaceUrl);
}

test.describe("Admin workspace layout", () => {
  test("mobile tab navigation wraps all tabs without horizontal clipping", async ({ page }) => {
    await mountAdminWorkspace(page);

    const navigation = page.locator('.admin-workspace-host nav[aria-label="Navigasi Manajemen Admin"]');
    await expect(navigation.getByRole("button")).toHaveCount(5);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const metrics = await navigation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const tabs = Array.from(element.querySelectorAll("button")).map((button) => {
          const tabBounds = button.getBoundingClientRect();
          return {
            left: tabBounds.left,
            right: tabBounds.right,
            top: tabBounds.top,
            bottom: tabBounds.bottom
          };
        });
        return {
          display: getComputedStyle(element).display,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          bounds: { left: bounds.left, right: bounds.right },
          tabs
        };
      });

      expect(metrics.display).toBe("grid");
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
      expect(metrics.tabs.every((tab) =>
        tab.left >= metrics.bounds.left && tab.right <= metrics.bounds.right && tab.bottom > tab.top
      )).toBe(true);
    }
  });

  test("schedule pagination renders one page at a time without changing repository data", async ({ page }) => {
    await mountAdminWorkspace(page);
    const rows = page.locator(".admin-workspace-host [data-session-row]");
    const topPagination = page.locator('[data-schedule-pagination="top"]');

    await expect(rows).toHaveCount(25);
    await expect(topPagination).toContainText("Menampilkan 1-25 dari 30 sesi");
    await expect(rows.first()).toContainText("Sesi ke-30");

    await page.getByRole("button", { name: "Berikutnya" }).first().click();
    await expect(rows).toHaveCount(5);
    await expect(topPagination).toContainText("Menampilkan 26-30 dari 30 sesi");
    await expect(rows.first()).toContainText("Sesi ke-5");

    await page.getByRole("button", { name: "Sebelumnya" }).first().click();
    await expect(rows).toHaveCount(25);
    const storedOrder = await page.evaluate(() =>
      (window as Window & { __adminWorkspaceLayoutFixture?: { sessions: Array<{ sessionNumber: number }> } })
        .__adminWorkspaceLayoutFixture?.sessions.map((session) => session.sessionNumber)
    );
    expect(storedOrder).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  test("draft invoice correction forms stay available inside collapsed details", async ({ page }) => {
    await mountAdminWorkspace(page);
    await page.evaluate(() => {
      const workspace = (window as Window & { __adminWorkspaceLayoutFixture?: {
        activeTab: string;
        users: Array<{ id: string; displayName: string; role: string; status: string }>;
        invoices: Array<Record<string, unknown>>;
        render: () => void;
      } }).__adminWorkspaceLayoutFixture;
      if (!workspace) throw new Error("Admin workspace fixture was not mounted.");
      workspace.activeTab = "billing";
      workspace.users = [{ id: "student-1", displayName: "Siswa", role: "student", status: "active" }];
      workspace.invoices = [{
        id: "draft-1",
        studentId: "student-1",
        period: "2026-10",
        status: "draft",
        totalSessions: 1,
        rateSnapshot: 75000,
        totalAmount: 75000,
        items: [{ sessionId: "session-1", sessionNumber: 1, sessionDate: "2026-10-01", amount: 75000 }]
      }];
      workspace.render();
    });

    const details = page.locator(".admin-invoice-correction");
    await expect(details).toHaveCount(1);
    await expect(details).not.toHaveAttribute("open", "");
    await expect(details.locator('form[data-draft-form]')).toHaveCount(1);
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator('form[data-draft-form]')).toBeVisible();
    await expect(details.getByRole("button", { name: "Simpan koreksi" })).toBeVisible();
  });
});
