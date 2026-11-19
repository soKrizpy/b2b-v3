import type { AccountStatus, AppRole } from "./domain-contracts";

/**
 * The React login selector is still backed by demo accounts. Keep its
 * deliberately limited contract separate from the production-facing domain
 * contracts exported below; it is not a credential-authentication boundary.
 */
export type RoleId = AppRole;

export type DemoUser = {
  id: string;
  displayName: string;
  email: string;
  role: RoleId;
  status: AccountStatus;
  avatar?: string;
  gradeLevel?: string;
};

export type DemoSession = { user: DemoUser; role: RoleId } | null;

export interface DemoAuthRepository {
  getSession(): Promise<DemoSession>;
  signIn(accountId: string): Promise<
    | { success: true; session: DemoSession }
    | { success: false; error?: string; message?: string }
  >;
  signOut(): Promise<void>;
  subscribe(callback: (session: DemoSession) => void): () => void;
}

export interface DemoIdentityRepository {
  initializeDemo(): Promise<void>;
  listActiveAccounts(role: RoleId): Promise<DemoUser[]>;
}

export interface AppRepositories {
  auth: DemoAuthRepository;
  identity: DemoIdentityRepository;
}

export type {
  AppUser,
  AuthRepository,
  AuthSession,
  BillingRepository,
  ClassSessionRepository,
  CurriculumRepository,
  DomainRepositories,
  IdentityRepository,
  LearningRepository,
  MonthlyEvaluationRepository,
  RepositoryChangeEvent,
  RepositoryError,
  RepositoryResult,
  SessionReportRepository,
  Unsubscribe
} from "./domain-contracts";
