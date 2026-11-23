export type StudentModuleAssignment = {
  module_id: number;
  status: string | null;
};

/**
 * Resolve module IDs from assignment rows without trusting the query filter
 * alone. Only explicitly active, positive integer IDs are exposed.
 */
export function resolveActiveStudentModuleIds(
  assignments: readonly StudentModuleAssignment[]
): number[] {
  const ids = new Set<number>();

  for (const assignment of assignments) {
    const moduleId = Number(assignment.module_id);
    if (assignment.status !== "active") continue;
    if (!Number.isSafeInteger(moduleId) || moduleId <= 0) continue;
    ids.add(moduleId);
  }

  return [...ids];
}
