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
 * Compose only the student-learning capabilities that have production-backed
 * implementations. This is intentionally not a DomainRepositories factory:
 * submission persistence/review and other domains remain unavailable.
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
