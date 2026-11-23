import { supabaseAuthRepository } from "./supabase-auth-repository";
import { supabaseAdminIdentityRepository } from "./supabase-admin-identity-repository";
import { supabaseStudentLearningCapabilities } from "./supabase-student-learning-capabilities";
import { supabaseTutorScheduleRepository } from "./supabase-tutor-schedule-repository";
import { supabaseAdminBillingRepository } from "./supabase-admin-billing-repository";
import { supabaseSessionReportRepository, supabaseMonthlyEvaluationRepository } from "./supabase-stage3-report-repositories";
import { supabaseChallengeSubmissionRepository } from "./supabase-challenge-submission-repository";
import { supabaseClassSessionRepository } from "./supabase-class-session-repository";
import type { StudentLearningCapabilities } from "./supabase-student-learning-capabilities";
import type { TutorScheduleRepository } from "./supabase-tutor-schedule-repository";

/**
 * Explicit production capability boundary for the active Vite portal.
 *
 * The active portal now has explicit Supabase-backed adapters for account
 * administration, tutor assignments, curriculum/progress/quiz, submissions
 * and reviews, tutor attendance and class-session lifecycle, reports,
 * monthly evaluations, and billing.
 *
 * This remains capability-scoped rather than DomainRepositories because
 * several legacy UI contracts still differ from the canonical repository
 * interfaces. Production entry points must pass these capabilities explicitly;
 * they must never inherit demo/local-store fallbacks.
 */
export interface SupabaseProductionCapabilities {
  auth: typeof supabaseAuthRepository;
  adminIdentity: typeof supabaseAdminIdentityRepository;
  studentLearning: StudentLearningCapabilities;
  tutorSchedule: TutorScheduleRepository;
  adminBilling: typeof supabaseAdminBillingRepository;
  sessionReports: typeof supabaseSessionReportRepository;
  monthlyEvaluations: typeof supabaseMonthlyEvaluationRepository;
  challengeSubmissions: typeof supabaseChallengeSubmissionRepository;
  classSessions: typeof supabaseClassSessionRepository;
}

export const supabaseProductionCapabilities: SupabaseProductionCapabilities =
  Object.freeze({
    auth: supabaseAuthRepository,
    adminIdentity: supabaseAdminIdentityRepository,
    studentLearning: supabaseStudentLearningCapabilities,
    tutorSchedule: supabaseTutorScheduleRepository,
    adminBilling: supabaseAdminBillingRepository,
    sessionReports: supabaseSessionReportRepository,
    monthlyEvaluations: supabaseMonthlyEvaluationRepository,
    challengeSubmissions: supabaseChallengeSubmissionRepository,
    classSessions: supabaseClassSessionRepository
  });
