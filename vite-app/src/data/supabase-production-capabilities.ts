import { supabaseAuthRepository } from "./supabase-auth-repository";
import { supabaseAdminIdentityRepository } from "./supabase-admin-identity-repository";
import { supabaseStudentLearningCapabilities } from "./supabase-student-learning-capabilities";
import { supabaseTutorScheduleRepository } from "./supabase-tutor-schedule-repository";
import { supabaseAdminBillingRepository } from "./supabase-admin-billing-repository";
import { supabaseSessionReportRepository, supabaseMonthlyEvaluationRepository } from "./supabase-stage3-report-repositories";
import type { StudentLearningCapabilities } from "./supabase-student-learning-capabilities";
import type { TutorScheduleRepository } from "./supabase-tutor-schedule-repository";

/**
 * Explicit production capability boundary for the active Vite portal.
 *
 * This is intentionally not DomainRepositories: account mutations, tutor
 * assignments, full class-session lifecycle, submissions/reviews, reports,
 * evaluations, and billing do not yet have complete production adapters.
 * Keeping the partial boundary explicit prevents demo/no-op repositories
 * from being mistaken for production implementations.
 */
export interface SupabaseProductionCapabilities {
  auth: typeof supabaseAuthRepository;
  adminIdentity: typeof supabaseAdminIdentityRepository;
  studentLearning: StudentLearningCapabilities;
  tutorSchedule: TutorScheduleRepository;
  adminBilling: typeof supabaseAdminBillingRepository;
  sessionReports: typeof supabaseSessionReportRepository;
  monthlyEvaluations: typeof supabaseMonthlyEvaluationRepository;
}

export const supabaseProductionCapabilities: SupabaseProductionCapabilities =
  Object.freeze({
    auth: supabaseAuthRepository,
    adminIdentity: supabaseAdminIdentityRepository,
    studentLearning: supabaseStudentLearningCapabilities,
    tutorSchedule: supabaseTutorScheduleRepository,
    adminBilling: supabaseAdminBillingRepository,
    sessionReports: supabaseSessionReportRepository,
    monthlyEvaluations: supabaseMonthlyEvaluationRepository
  });
