import { expect, test } from "@playwright/test";

test.describe("Production student-learning capability composition", () => {
  test("exposes only the verified curriculum and lesson-runtime capabilities", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseStudentLearningCapabilities } = await import(
        "/src/data/supabase-student-learning-capabilities.ts"
      );
      const curriculum = {
        listModules: async () => [],
        getModule: async () => null,
        listTopics: async () => [],
        getTopic: async () => null
      };
      const createLessonBridge = () => ({ marker: "production-lesson-bridge" });
      const capabilities = createSupabaseStudentLearningCapabilities({
        curriculum,
        createLessonBridge
      });

      return {
        keys: Object.keys(capabilities).sort(),
        usesInjectedCurriculum: capabilities.curriculum === curriculum,
        usesInjectedBridgeFactory: capabilities.createLessonBridge === createLessonBridge,
        bridgeMarker: capabilities.createLessonBridge().marker,
        frozen: Object.isFrozen(capabilities)
      };
    });

    expect(result).toEqual({
      keys: ["createLessonBridge", "curriculum"],
      usesInjectedCurriculum: true,
      usesInjectedBridgeFactory: true,
      bridgeMarker: "production-lesson-bridge",
      frozen: true
    });
  });

  test("does not advertise submission review or unrelated domain repositories", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { supabaseStudentLearningCapabilities } = await import(
        "/src/data/supabase-student-learning-capabilities.ts"
      );
      return {
        keys: Object.keys(supabaseStudentLearningCapabilities).sort(),
        hasSubmissionRepository: "submissions" in supabaseStudentLearningCapabilities,
        hasBillingRepository: "billing" in supabaseStudentLearningCapabilities,
        hasClassSessionRepository: "classSessions" in supabaseStudentLearningCapabilities
      };
    });

    expect(result.keys).toEqual(["createLessonBridge", "curriculum"]);
    expect(result.hasSubmissionRepository).toBe(false);
    expect(result.hasBillingRepository).toBe(false);
    expect(result.hasClassSessionRepository).toBe(false);
  });
});
