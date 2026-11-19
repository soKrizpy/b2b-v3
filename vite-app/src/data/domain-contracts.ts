/**
 * Canonical domain repository contracts for Bits2Bytes v3.
 *
 * These contracts describe the application boundary, not Supabase row shapes.
 * Local-demo adapters are not a production security boundary. Remote adapters
 * must derive the authenticated actor from the verified server session and
 * enforce authorization in trusted server/database code.
 *
 * Schema mapping notes:
 * - auth.users + profiles + students: identity (DB teacher maps to app tutor).
 * - modules + topics: curriculum; topics.lesson_content is JSONB.
 * - quiz_attempts and related tables: assessment/progress.
 * - meetings + meeting_students: schedule and attendance.
 * - invoices: billing snapshots; no dedicated tariff table currently exists.
 * - No persistent tutor assignment, monthly evaluation, or separate session
 *   report table was found in the audited production schema.
 * - Parent Hub is a read-only student-workspace view, not a separate role.
 */

export type UUID = string;
export type ModuleId = number;
export type TopicId = number;
export type LessonKey = string;
export type ISODateTime = string;
export type YearMonth = `${number}-${string}`;

export type AppRole = "admin" | "tutor" | "student";
export type AccountStatus = "active" | "inactive";

export interface AppUser {
  id: UUID;
  email: string;
  displayName: string;
  role: AppRole;
  status: AccountStatus;
  avatar?: string | null;
  gradeLevel?: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AuthSession {
  user: AppUser;
}

export interface ActorMetadata {
  /** Audit metadata only; never proof of authorization. */
  actorId: UUID;
}

export interface RepositoryError {
  code: string;
  message: string;
  details?: unknown;
}

export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: RepositoryError };

export type Unsubscribe = () => void;

export type RepositoryDomain =
  | "auth"
  | "identity"
  | "curriculum"
  | "learning"
  | "sessions"
  | "reports"
  | "evaluations"
  | "billing";

export interface RepositoryChangeEvent {
  domain: RepositoryDomain;
  action: string;
  entityId?: string;
  occurredAt: ISODateTime;
}

export type RepositoryListener = (event: RepositoryChangeEvent) => void;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface TutorStudentAssignment {
  id: UUID;
  tutorId: UUID;
  studentId: UUID;
  status: "active" | "inactive";
  createdAt: ISODateTime;
  endedAt: ISODateTime | null;
}

export interface CurriculumModule {
  id: ModuleId;
  title: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface CurriculumTopic {
  id: TopicId;
  moduleId: ModuleId;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonContent: JsonValue;
}

export type LessonProgressState =
  | "not-started"
  | "in-progress"
  | "practice-completed"
  | "submitted"
  | "revision-required"
  | "approved";

export interface LessonProgress {
  studentId: UUID;
  lessonKey: LessonKey;
  topicId: TopicId | null;
  state: LessonProgressState;
  checkpoints: Record<string, boolean>;
  submissionDraft: { link: string; notes: string } | null;
  slideIndex: number;
  updatedAt: ISODateTime;
  version: number;
}

export type SubmissionStatus = "submitted" | "approved" | "revision-required";

export interface StudentSubmission {
  id: UUID;
  studentId: UUID;
  lessonKey: LessonKey;
  projectUrl: string;
  studentNotes: string;
  status: SubmissionStatus;
  checkpointsPassed: number;
  checkpointsTotal: number;
  quizScore: string | null;
  reviewerId: UUID | null;
  reviewerName: string | null;
  reviewedAt: ISODateTime | null;
  teacherFeedback: string | null;
  version: number;
  submittedAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ClassSessionStatus =
  | "scheduled"
  | "held"
  | "not_held"
  | "cancelled"
  | "soft_deleted";

export type AttendanceStatus = "not_recorded" | "present" | "late" | "absent";

export interface ClassSession {
  id: UUID;
  seriesId: UUID;
  sessionNumber: number;
  studentId: UUID;
  tutorId: UUID;
  scheduledStartAt: ISODateTime;
  durationMinutes: number;
  meetingUrl: string | null;
  status: ClassSessionStatus;
  attendanceStatus: AttendanceStatus;
  attendanceRecordedBy: UUID | null;
  attendanceRecordedAt: ISODateTime | null;
  cancellation: {
    actorId: UUID;
    actorRole: "admin" | "tutor";
    reason: string;
    cancelledAt: ISODateTime;
  } | null;
  replacementRequired: boolean;
  replacementSessionId: UUID | null;
  replacementForSessionId: UUID | null;
  deletedAt: ISODateTime | null;
  deletedBy: UUID | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  version: number;
}

export interface RecurringSessionSeriesInput {
  studentId: UUID;
  tutorId: UUID;
  startDate: string;
  startTime: string;
  weekdays: number[];
  targetCount: number;
  durationMinutes: number;
  meetingUrl?: string | null;
}

export interface CreateReplacementSessionInput {
  scheduledStartAt: ISODateTime;
  durationMinutes?: number;
  tutorId?: UUID;
  meetingUrl?: string | null;
}

export interface SessionReport {
  id: UUID;
  studentId: UUID;
  tutorId: UUID;
  sessionId: UUID | null;
  sessionDate: string;
  sessionNumber: number | null;
  topic: string;
  activities: string;
  achievements: string;
  difficulties: string;
  solutions: string;
  parentRecommendations: string;
  competencies: Record<string, JsonValue>;
  status: "draft" | "submitted";
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  submittedAt: ISODateTime | null;
}

export type MonthlyRating =
  | "Sangat baik"
  | "Baik"
  | "Berkembang sesuai proses"
  | "Membutuhkan pendampingan lebih lanjut";

export interface MonthlyEvaluation {
  id: UUID;
  studentId: UUID;
  tutorId: UUID;
  period: YearMonth;
  rating: MonthlyRating | null;
  summary: string;
  strengths: string;
  nextGoals: string;
  status: "draft" | "published";
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  publishedAt: ISODateTime | null;
}

export interface StudentTariff {
  studentId: UUID;
  amountPerSession: number;
  currency: "IDR";
  updatedAt: ISODateTime;
  updatedBy: UUID;
}

export interface InvoiceLine {
  sessionId: UUID;
  sessionNumber: number;
  sessionDate: ISODateTime;
  amount: number;
}

export interface Invoice {
  id: UUID;
  studentId: UUID;
  period: YearMonth;
  status: "draft" | "unpaid" | "paid";
  currency: "IDR";
  rateSnapshot: number;
  items: InvoiceLine[];
  totalSessions: number;
  subtotalAmount: number;
  discountAmount: number;
  additionalCharges: number;
  totalAmount: number;
  adjustmentNote: string;
  createdAt: ISODateTime;
  createdBy: UUID;
  updatedAt: ISODateTime;
  updatedBy: UUID;
  issuedAt: ISODateTime | null;
  issuedBy: UUID | null;
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(credentials: { email: string; password: string }): Promise<RepositoryResult<AuthSession>>;
  signOut(): Promise<void>;
  subscribe(listener: (session: AuthSession | null) => void): Unsubscribe;
}

export interface IdentityRepository {
  listUsers(filters?: { role?: AppRole; status?: AccountStatus }): Promise<AppUser[]>;
  getUser(userId: UUID): Promise<AppUser | null>;
  createUser(input: Omit<AppUser, "id" | "createdAt" | "updatedAt">): Promise<RepositoryResult<AppUser>>;
  updateUser(userId: UUID, changes: Partial<Pick<AppUser, "displayName" | "email" | "avatar" | "gradeLevel">>): Promise<RepositoryResult<AppUser>>;
  setAccountStatus(userId: UUID, status: AccountStatus): Promise<RepositoryResult<AppUser>>;
  listAssignments(filters?: { tutorId?: UUID; studentId?: UUID; status?: "active" | "inactive" }): Promise<TutorStudentAssignment[]>;
  assignStudent(tutorId: UUID, studentId: UUID): Promise<RepositoryResult<TutorStudentAssignment>>;
  endAssignment(tutorId: UUID, studentId: UUID): Promise<RepositoryResult<TutorStudentAssignment>>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface CurriculumRepository {
  listModules(): Promise<CurriculumModule[]>;
  getModule(moduleId: ModuleId): Promise<CurriculumModule | null>;
  listTopics(moduleId: ModuleId): Promise<CurriculumTopic[]>;
  getTopic(topicId: TopicId): Promise<CurriculumTopic | null>;
}

export interface LearningRepository {
  getLessonProgress(studentId: UUID, lessonKey: LessonKey): Promise<LessonProgress | null>;
  saveLessonProgress(progress: LessonProgress): Promise<RepositoryResult<LessonProgress>>;
  listSubmissions(filters?: { studentId?: UUID; status?: SubmissionStatus }): Promise<StudentSubmission[]>;
  getSubmission(submissionId: UUID): Promise<StudentSubmission | null>;
  saveSubmission(input: Omit<StudentSubmission, "id" | "version" | "updatedAt"> & { id?: UUID; expectedVersion?: number }): Promise<RepositoryResult<StudentSubmission>>;
  reviewSubmission(submissionId: UUID, status: "approved" | "revision-required", feedback: string, expectedVersion: number): Promise<RepositoryResult<StudentSubmission>>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface ClassSessionRepository {
  listSessions(filters?: { studentId?: UUID; tutorId?: UUID; seriesId?: UUID; status?: ClassSessionStatus }): Promise<ClassSession[]>;
  getSession(sessionId: UUID): Promise<ClassSession | null>;
  createRecurringSeries(input: RecurringSessionSeriesInput): Promise<RepositoryResult<ClassSession[]>>;
  recordAttendance(sessionId: UUID, status: Exclude<AttendanceStatus, "not_recorded">): Promise<RepositoryResult<ClassSession>>;
  cancelSession(sessionId: UUID, reason?: string): Promise<RepositoryResult<ClassSession>>;
  softDeleteSession(sessionId: UUID): Promise<RepositoryResult<ClassSession>>;
  createReplacement(originalSessionId: UUID, input: CreateReplacementSessionInput): Promise<RepositoryResult<{ original: ClassSession; replacement: ClassSession }>>;
  listBillableSessions(studentId: UUID, period: YearMonth): Promise<ClassSession[]>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface SessionReportRepository {
  listTutorReports(tutorId: UUID): Promise<SessionReport[]>;
  listStudentSubmittedReports(studentId: UUID): Promise<SessionReport[]>;
  getReport(reportId: UUID): Promise<SessionReport | null>;
  saveReport(input: Omit<SessionReport, "id" | "version" | "createdAt" | "updatedAt"> & { id?: UUID; expectedVersion?: number }): Promise<RepositoryResult<SessionReport>>;
  deleteDraft(reportId: UUID): Promise<RepositoryResult<void>>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface MonthlyEvaluationRepository {
  listTutorEvaluations(tutorId: UUID): Promise<MonthlyEvaluation[]>;
  listStudentPublished(studentId: UUID): Promise<MonthlyEvaluation[]>;
  saveEvaluation(input: Omit<MonthlyEvaluation, "id" | "version" | "createdAt" | "updatedAt"> & { id?: UUID }): Promise<RepositoryResult<MonthlyEvaluation>>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface BillingRepository {
  getStudentTariff(studentId: UUID): Promise<StudentTariff | null>;
  setStudentTariff(studentId: UUID, amountPerSession: number): Promise<RepositoryResult<StudentTariff>>;
  listInvoices(filters?: { studentId?: UUID; status?: Invoice["status"] }): Promise<Invoice[]>;
  getStudentInvoices(studentId: UUID): Promise<Invoice[]>;
  createDraftInvoice(studentId: UUID, period: YearMonth): Promise<RepositoryResult<Invoice>>;
  updateDraftInvoice(invoiceId: UUID, changes: Partial<Pick<Invoice, "discountAmount" | "additionalCharges" | "totalAmount" | "adjustmentNote">> & { sessionIds?: UUID[] }): Promise<RepositoryResult<Invoice>>;
  issueInvoice(invoiceId: UUID): Promise<RepositoryResult<Invoice>>;
  markInvoicePaid(invoiceId: UUID): Promise<RepositoryResult<Invoice>>;
  subscribe(listener: RepositoryListener): Unsubscribe;
}

export interface DomainRepositories {
  identity: IdentityRepository;
  curriculum: CurriculumRepository;
  learning: LearningRepository;
  classSessions: ClassSessionRepository;
  sessionReports: SessionReportRepository;
  monthlyEvaluations: MonthlyEvaluationRepository;
  billing: BillingRepository;
}

/**
 * Parent Hub deliberately has no independent repository or parent identity.
 * It composes read-only student-scoped methods from sessionReports,
 * monthlyEvaluations, and billing using the authenticated student's identity.
 */
