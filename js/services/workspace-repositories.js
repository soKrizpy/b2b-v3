/**
 * Composition root for repository operations used by active workspaces.
 *
 * Keep store-specific adapters behind this module so workspace controllers
 * have one stable import boundary. These repositories still use local-demo
 * persistence; this gateway is not a production authorization boundary.
 */
import { IdentityRepository } from './identity-repository.js';
import { LearningStateRepository } from './learning-state-repository.js';
import { ClassSessionRepository } from './class-session-repository.js';
import { SessionReportRepository, MonthlyEvaluationRepository } from './learning-record-repository.js';
import { BillingRepository } from './billing-repository.js';

export {
  IdentityRepository,
  LearningStateRepository,
  ClassSessionRepository,
  SessionReportRepository,
  MonthlyEvaluationRepository,
  BillingRepository
};

const defaultWorkspaceRepositories = Object.freeze({
  identity: IdentityRepository,
  learning: LearningStateRepository,
  classSessions: ClassSessionRepository,
  sessionReports: SessionReportRepository,
  monthlyEvaluations: MonthlyEvaluationRepository,
  billing: BillingRepository
});


/**
 * Resolve workspace dependencies once at construction time.
 * Partial overrides allow tests and future adapters to replace one domain
 * without changing controller business logic.
 */
export function createWorkspaceRepositories(overrides = {}) {
  return Object.freeze({
    ...defaultWorkspaceRepositories,
    ...overrides
  });
}

export const WorkspaceRepositories = createWorkspaceRepositories();
