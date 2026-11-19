export type RoleId = "admin" | "tutor" | "student";

export type DemoUser = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  gradeLevel?: string;
};

export type DemoSession = { user: DemoUser; role: string } | null;

export interface AuthRepository {
  getSession(): Promise<DemoSession>;
  signIn(accountId: string): Promise<
    | { success: true; session: DemoSession }
    | { success: false; error?: string; message?: string }
  >;
  signOut(): Promise<void>;
  subscribe(callback: (session: DemoSession) => void): () => void;
}

export interface IdentityRepository {
  initializeDemo(): Promise<void>;
  listActiveAccounts(role: RoleId): Promise<DemoUser[]>;
}

export interface AppRepositories {
  auth: AuthRepository;
  identity: IdentityRepository;
}
