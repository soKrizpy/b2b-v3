import { expect, test } from "@playwright/test";

test.describe("Student curriculum access contract", () => {
  test("exposes only unique, valid module IDs with an active assignment", async ({ page }) => {
    await page.goto("/");
    const moduleIds = await page.evaluate(async () => {
      const { resolveActiveStudentModuleIds } =
        await import("/src/data/curriculum-access-contract.ts");

      return resolveActiveStudentModuleIds([
        { module_id: 12, status: "active" },
        { module_id: 12, status: "active" },
        { module_id: 18, status: "paused" },
        { module_id: 21, status: "inactive" },
        { module_id: 0, status: "active" },
        { module_id: -4, status: "active" },
        { module_id: Number.NaN, status: "active" },
        { module_id: Number.POSITIVE_INFINITY, status: "active" },
        { module_id: 25, status: null }
      ]);
    });

    expect(moduleIds).toEqual([12]);
  });

  test("returns no accessible modules when there are no active assignments", async ({ page }) => {
    await page.goto("/");
    const moduleIds = await page.evaluate(async () => {
      const { resolveActiveStudentModuleIds } =
        await import("/src/data/curriculum-access-contract.ts");

      return resolveActiveStudentModuleIds([
        { module_id: 18, status: "paused" },
        { module_id: 21, status: "inactive" }
      ]);
    });

    expect(moduleIds).toEqual([]);
  });
});
