import { expect, test } from "@playwright/test";

test.describe("Admin identity Edge Function error handling", () => {
  test("preserves structured rollback code and message from non-2xx response", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { readFunctionFailure } = await import(
        "/src/data/supabase-admin-identity-repository.ts"
      );
      const response = new Response(JSON.stringify({
        code: "CREATE_ROLLBACK_REPAIR_REQUIRED",
        error: "Pembersihan otomatis tidak dapat dipastikan."
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
      const edgeError = Object.assign(
        new Error("Edge Function returned a non-2xx status code"),
        { context: response }
      );
      return await readFunctionFailure(
        null,
        edgeError,
        "CREATE_FAILED",
        "Akun gagal dibuat."
      );
    });

    expect(result).toEqual({
      code: "CREATE_ROLLBACK_REPAIR_REQUIRED",
      message: "Pembersihan otomatis tidak dapat dipastikan."
    });
  });

  test("preserves saved-refresh code from successful HTTP response without user payload", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { readFunctionFailure } = await import(
        "/src/data/supabase-admin-identity-repository.ts"
      );
      return await readFunctionFailure({
        code: "IDENTITY_UPDATE_SAVED_REFRESH_REQUIRED",
        error: "Perubahan akun tersimpan, tetapi data hasil tidak dapat dibaca."
      }, null, "UPDATE_FAILED", "Akun gagal diperbarui.");
    });

    expect(result.code).toBe("IDENTITY_UPDATE_SAVED_REFRESH_REQUIRED");
    expect(result.message).toContain("Perubahan akun tersimpan");
  });

  test("uses stable fallback when response body is not structured JSON", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { readFunctionFailure } = await import(
        "/src/data/supabase-admin-identity-repository.ts"
      );
      return await readFunctionFailure(
        null,
        new Error("Network unavailable"),
        "UPDATE_FAILED",
        "Akun gagal diperbarui."
      );
    });

    expect(result).toEqual({
      code: "UPDATE_FAILED",
      message: "Network unavailable"
    });
  });
});
