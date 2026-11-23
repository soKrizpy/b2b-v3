import { expect, test } from "@playwright/test";

test.describe("Production capability composition", () => {
  test("composes only verified production adapters and does not claim incomplete domains", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { supabaseProductionCapabilities } = await import(
        "/src/data/supabase-production-capabilities.ts"
      );
      const {
        supabaseAuthRepository
      } = await import("/src/data/supabase-auth-repository.ts");
      const {
        supabaseAdminIdentityRepository
      } = await import("/src/data/supabase-admin-identity-repository.ts");
      const {
        supabaseStudentLearningCapabilities
      } = await import("/src/data/supabase-student-learning-capabilities.ts");
      const {
        supabaseTutorScheduleRepository
      } = await import("/src/data/supabase-tutor-schedule-repository.ts");

      return {
        keys: Object.keys(supabaseProductionCapabilities).sort(),
        authIsProductionAdapter: supabaseProductionCapabilities.auth === supabaseAuthRepository,
        adminIdentityIsReadOnlyAdapter: supabaseProductionCapabilities.adminIdentity === supabaseAdminIdentityRepository,
        studentLearningIsScoped: supabaseProductionCapabilities.studentLearning === supabaseStudentLearningCapabilities,
        tutorScheduleIsScoped: supabaseProductionCapabilities.tutorSchedule === supabaseTutorScheduleRepository,
        frozen: Object.isFrozen(supabaseProductionCapabilities),
        hasBilling: "billing" in supabaseProductionCapabilities,
        hasReports: "sessionReports" in supabaseProductionCapabilities,
        hasEvaluations: "monthlyEvaluations" in supabaseProductionCapabilities,
        hasFullClassSessions: "classSessions" in supabaseProductionCapabilities
      };
    });

    expect(result).toEqual({
      keys: ["adminIdentity", "auth", "studentLearning", "tutorSchedule"],
      authIsProductionAdapter: true,
      adminIdentityIsReadOnlyAdapter: true,
      studentLearningIsScoped: true,
      tutorScheduleIsScoped: true,
      frozen: true,
      hasBilling: false,
      hasReports: false,
      hasEvaluations: false,
      hasFullClassSessions: false
    });
  });
});
