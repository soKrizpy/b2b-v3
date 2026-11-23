import type { CurriculumRepository } from "./domain-contracts";
import { supabaseCurriculumRepository } from "./supabase-curriculum-repository";
import { createSupabaseLegacyLearningBridge } from "./supabase-legacy-learning-bridge";

export type StudentLessonBridge = ReturnType<typeof createSupabaseLegacyLearningBridge>;

export interface StudentLearningCapabilities {
  /** Published curriculum visible to the authenticated student. */
  curriculum: CurriculumRepository;
  /** Progress and quiz operations currently supported by the production lesson runtime. */
  createLessonBridge: () => StudentLessonBridge;
}

export interface StudentLearningCapabilityDependencies {
  curriculum: CurriculumRepository;
  createLessonBridge: () => StudentLessonBridge;
}

/**
 * Compose the student lesson capabilities that have production-backed
 * implementations. Student project submission is persisted through the
 * actor-derived private RPC exposed by the lesson bridge. Tutor review remains
 * a separate capability in supabaseChallengeSubmissionRepository, so this
 * factory is intentionally not a full DomainRepositories factory.
 */
export function createSupabaseStudentLearningCapabilities(
  dependencies: StudentLearningCapabilityDependencies = {
    curriculum: supabaseCurriculumRepository,
    createLessonBridge: createSupabaseLegacyLearningBridge
  }
): StudentLearningCapabilities {
  return Object.freeze({
    curriculum: dependencies.curriculum,
    createLessonBridge: dependencies.createLessonBridge
  });
}

export const supabaseStudentLearningCapabilities =
  createSupabaseStudentLearningCapabilities();
