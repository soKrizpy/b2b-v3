import type {
  AccountStatus,
  AppUser,
  AppRole,
  IdentityRepository,
  RepositoryChangeEvent,
  RepositoryResult,
  TutorStudentAssignment
} from "./domain-contracts";

type LegacyUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | "teacher";
  status: AccountStatus;
  avatar?: string;
  gradeLevel?: string;
  createdAt: string;
  updatedAt: string;
};

type LegacyAssignment = {
  id: string;
  tutorId: string;
  studentId: string;
  status: "active" | "inactive";
  createdAt: string;
  endedAt?: string;
};

type LegacyUserMutation =
  | { user: LegacyUser }
  | { error: string; message: string };

type LegacyAssignmentMutation =
  | { assignment: LegacyAssignment }
  | { error: string; message: string };

type LegacyIdentityEvent = {
  action?: string;
  meta?: Record<string, unknown> | null;
  timestamp?: string;
};

export interface LocalDemoIdentityStorePort {
  getAllUsers(filters?: { role?: AppRole; status?: AccountStatus }): LegacyUser[];
  getUserById(userId: string): LegacyUser | null;
  getAllAssignments(): LegacyAssignment[];
  createUser(input: Record<string, unknown>): LegacyUserMutation;
  updateUser(userId: string, changes: Record<string, unknown>): LegacyUserMutation;
  activateUser(userId: string): LegacyUserMutation;
  deactivateUser(userId: string): LegacyUserMutation;
  assignStudentToTutor(tutorId: string, studentId: string): LegacyAssignmentMutation;
  removeTutorStudentAssignment(tutorId: string, studentId: string): boolean;
  subscribe(callback: (event: LegacyIdentityEvent) => void): () => void;
}

function toAppUser(user: LegacyUser): AppUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role === "teacher" ? "tutor" : user.role,
    status: user.status,
    avatar: user.avatar ?? null,
    gradeLevel: user.gradeLevel ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function toAssignment(assignment: LegacyAssignment): TutorStudentAssignment {
  return {
    id: assignment.id,
    tutorId: assignment.tutorId,
    studentId: assignment.studentId,
    status: assignment.status,
    createdAt: assignment.createdAt,
    endedAt: assignment.endedAt ?? null
  };
}

function failure<T>(error: string, message: string): RepositoryResult<T> {
  return { success: false, error: { code: error, message } };
}

function userMutationResult(result: LegacyUserMutation): RepositoryResult<AppUser> {
  if ("error" in result) return failure(result.error, result.message);
  return { success: true, data: toAppUser(result.user) };
}

export function createLocalDemoIdentityRepository(
  store: LocalDemoIdentityStorePort
): IdentityRepository {
  return {
    async listUsers(filters) {
      return store.getAllUsers(filters).map(toAppUser);
    },

    async getUser(userId) {
      const user = store.getUserById(userId);
      return user ? toAppUser(user) : null;
    },

    async createUser(input) {
      return userMutationResult(store.createUser({ ...input }));
    },

    async updateUser(userId, changes) {
      return userMutationResult(store.updateUser(userId, { ...changes }));
    },

    async setAccountStatus(userId, status) {
      const result = status === "active"
        ? store.activateUser(userId)
        : store.deactivateUser(userId);
      return userMutationResult(result);
    },

    async listAssignments(filters) {
      return store.getAllAssignments()
        .filter(item => !filters?.tutorId || item.tutorId === filters.tutorId)
        .filter(item => !filters?.studentId || item.studentId === filters.studentId)
        .filter(item => !filters?.status || item.status === filters.status)
        .map(toAssignment);
    },

    async assignStudent(tutorId, studentId) {
      const result = store.assignStudentToTutor(tutorId, studentId);
      if ("error" in result) return failure(result.error, result.message);
      return { success: true, data: toAssignment(result.assignment) };
    },

    async endAssignment(tutorId, studentId) {
      const ended = store.removeTutorStudentAssignment(tutorId, studentId);
      if (!ended) return failure("ASSIGNMENT_NOT_FOUND", "Penugasan aktif tidak ditemukan.");
      const assignment = store.getAllAssignments().find(item =>
        item.tutorId === tutorId &&
        item.studentId === studentId &&
        item.status === "inactive"
      );
      if (!assignment) {
        return failure("ASSIGNMENT_NOT_FOUND", "Penugasan yang diakhiri tidak dapat dibaca kembali.");
      }
      return { success: true, data: toAssignment(assignment) };
    },

    subscribe(listener) {
      return store.subscribe(event => {
        const occurredAt = event.timestamp && !Number.isNaN(Date.parse(event.timestamp))
          ? event.timestamp
          : new Date().toISOString();
        const entityIdValue = event.meta?.userId ?? event.meta?.tutorId ?? event.meta?.studentId;
        const change: RepositoryChangeEvent = {
          domain: "identity",
          action: event.action ?? "changed",
          ...(typeof entityIdValue === "string" ? { entityId: entityIdValue } : {}),
          occurredAt
        };
        listener(change);
      });
    }
  };
}
