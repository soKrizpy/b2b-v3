/**
 * Composition root for repository operations used by the active application.
 *
 * All adapters here currently use local-demo persistence. This gateway is not
 * production authentication, persistence, or an authorization boundary.
 */
import { AuthService } from './auth-service.js';
import { IdentityRepository } from './identity-repository.js';
import { LearningStateRepository } from './learning-state-repository.js';
import { ClassSessionRepository } from './class-session-repository.js';
import { SessionReportRepository, MonthlyEvaluationRepository } from './learning-record-repository.js';
import { BillingRepository } from './billing-repository.js';

export const DemoAuthRepository = Object.freeze({
  async getSession() {
    return AuthService.getCurrentSession();
  },
  async signIn(accountId) {
    return AuthService.signInDemo(accountId);
  },
  async signOut() {
    return AuthService.signOut();
  },
  subscribe(callback) {
    return AuthService.subscribe(callback);
  }
});

export {
  IdentityRepository,
  LearningStateRepository,
  ClassSessionRepository,
  SessionReportRepository,
  MonthlyEvaluationRepository,
  BillingRepository
};

const defaultWorkspaceRepositories = Object.freeze({
  auth: DemoAuthRepository,
  identity: IdentityRepository,
  learning: LearningStateRepository,
  classSessions: ClassSessionRepository,
  sessionReports: SessionReportRepository,
  monthlyEvaluations: MonthlyEvaluationRepository,
  billing: BillingRepository
});

/**
 * Resolve dependencies once at construction time. Partial overrides support
 * isolated adapters in tests without changing workspace business logic.
 */
export function createWorkspaceRepositories(overrides = {}) {
  return Object.freeze({
    ...defaultWorkspaceRepositories,
    ...overrides
  });
}

export const WorkspaceRepositories = createWorkspaceRepositories();
