import { expect, test } from "@playwright/test";

test.describe("Production capability composition", () => {
  test("registers verified production adapters without demo fallbacks", async ({ page }) => {
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
      const {
        supabaseCurriculumRepository
      } = await import("/src/data/supabase-curriculum-repository.ts");
      const {
        supabaseAdminStudentModuleRepository
      } = await import("/src/data/supabase-admin-student-module-repository.ts");

      return {
        keys: Object.keys(supabaseProductionCapabilities).sort(),
        authIsProductionAdapter: supabaseProductionCapabilities.auth === supabaseAuthRepository,
        adminIdentityIsProductionAdapter: supabaseProductionCapabilities.adminIdentity === supabaseAdminIdentityRepository,
        studentLearningIsScoped: supabaseProductionCapabilities.studentLearning === supabaseStudentLearningCapabilities,
        tutorScheduleIsScoped: supabaseProductionCapabilities.tutorSchedule === supabaseTutorScheduleRepository,
        curriculumIsProductionAdapter: supabaseProductionCapabilities.curriculum === supabaseCurriculumRepository,
        adminStudentModulesIsProductionAdapter: supabaseProductionCapabilities.adminStudentModules === supabaseAdminStudentModuleRepository,
        frozen: Object.isFrozen(supabaseProductionCapabilities),
        hasBilling: "adminBilling" in supabaseProductionCapabilities,
        hasReports: "sessionReports" in supabaseProductionCapabilities,
        hasEvaluations: "monthlyEvaluations" in supabaseProductionCapabilities,
        hasFullClassSessions: "classSessions" in supabaseProductionCapabilities,
        hasChallengeSubmissions: "challengeSubmissions" in supabaseProductionCapabilities,
        hasCurriculum: "curriculum" in supabaseProductionCapabilities,
        hasAdminStudentModules: "adminStudentModules" in supabaseProductionCapabilities
      };
    });

    expect(result).toEqual({
      keys: ["adminBilling", "adminIdentity", "adminStudentModules", "auth", "challengeSubmissions", "classSessions", "curriculum", "monthlyEvaluations", "sessionReports", "studentLearning", "tutorSchedule"],
      authIsProductionAdapter: true,
      adminIdentityIsProductionAdapter: true,
      studentLearningIsScoped: true,
      tutorScheduleIsScoped: true,
      curriculumIsProductionAdapter: true,
      adminStudentModulesIsProductionAdapter: true,
      frozen: true,
      hasBilling: true,
      hasReports: true,
      hasEvaluations: true,
      hasFullClassSessions: true,
      hasChallengeSubmissions: true,
      hasCurriculum: true,
      hasAdminStudentModules: true
    });
  });
});
