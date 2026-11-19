# Frontend–Backend Repository Contract

Status: design-only contract for the B2B v3 migration. This document does not add a Supabase client, execute SQL, create credentials, or change the local-demo behavior.

## 1. Purpose

The React workspace must not depend directly on `localStorage` stores once the production backend is introduced. Each feature should call a small repository interface. The current local stores remain the demo implementation; a future Supabase-backed implementation must satisfy the same interface while enforcing authorization and business rules on the server/database.

This is an architectural seam, not a claim that browser-side checks become secure. The backend remains authoritative.

## 2. Non-negotiable boundaries

- Roles remain Admin, Tutor, Student. Parent Hub is a Student Workspace view, not a fourth account type.
- The authenticated identity comes from the Supabase Auth session. Never accept a caller-supplied `actor`, role, or user ID as proof of authority.
- Frontend code may use only the Supabase publishable key. Secret/service-role keys stay in trusted server environments.
- RLS is required on every exposed table. Every query must be safe even if the UI filters are removed.
- Privileged operations are server/database transactions: account provisioning and role changes, assignment changes, recurring-series creation, attendance/cancellation/replacement, invoice generation/issue/payment, and evaluation publication where publication rules require it.
- The frontend may perform early validation for user experience, but server validation is repeated and authoritative.
- Keep the local-demo implementation available until the Supabase implementation passes the same behavioral suite plus the security matrix.
- Do not silently import demo seed accounts or localStorage records into a real environment.

## 3. Repository interface shape

Use asynchronous methods in the production-facing contract, even where the current local demo methods are synchronous. This avoids a second UI rewrite when the backend is introduced.

Illustrative TypeScript only; these are proposed contracts, not implemented exports:

```ts
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string };

interface AuthRepository {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Result<Session>>;
  signOut(): Promise<void>;
}

interface IdentityRepository {
  getCurrentProfile(): Promise<Profile | null>;
  listUsers(filter?: UserFilter): Promise<Profile[]>;
  createAccount(input: CreateAccountInput): Promise<Result<Profile>>;
  updateAccount(userId: string, changes: AdminProfileChanges): Promise<Result<Profile>>;
  setTutorAssignment(input: AssignmentInput): Promise<Result<Assignment>>;
  listAssignments(filter?: AssignmentFilter): Promise<Assignment[]>;
}

interface ClassSessionRepository {
  listSessions(filter: SessionFilter): Promise<ClassSession[]>;
  createRecurringSeries(input: RecurringSeriesInput): Promise<Result<ClassSeries>>;
  recordAttendance(sessionId: string, status: AttendanceStatus): Promise<Result<ClassSession>>;
  requestTutorCancellation(sessionId: string, reason: string): Promise<Result<ClassSession>>;
  cancelByAdmin(sessionId: string, reason?: string): Promise<Result<ClassSession>>;
  softDeleteByAdmin(sessionId: string): Promise<Result<ClassSession>>;
  createReplacement(originalSessionId: string, input: ReplacementInput): Promise<Result<ClassSession>>;
}

interface SessionReportRepository {
  listForStudent(studentId: string): Promise<SessionReport[]>;
  listForTutor(): Promise<SessionReport[]>;
  saveDraft(input: ReportDraftInput): Promise<Result<SessionReport>>;
  submit(reportId: string): Promise<Result<SessionReport>>;
}

interface MonthlyEvaluationRepository {
  listForTutor(month?: string): Promise<MonthlyEvaluation[]>;
  listPublishedForCurrentStudent(): Promise<MonthlyEvaluation[]>;
  saveDraft(input: EvaluationInput): Promise<Result<MonthlyEvaluation>>;
  publish(evaluationId: string): Promise<Result<MonthlyEvaluation>>;
}

interface BillingRepository {
  getRate(studentId: string): Promise<StudentRate | null>;
  setRate(studentId: string, amountPerSession: number): Promise<Result<StudentRate>>;
  listAdminInvoices(filter?: InvoiceFilter): Promise<Invoice[]>;
  listCurrentStudentInvoices(): Promise<Invoice[]>;
  createDraft(studentId: string, period: string): Promise<Result<Invoice>>;
  updateDraft(invoiceId: string, changes: DraftInvoiceChanges): Promise<Result<Invoice>>;
  issue(invoiceId: string): Promise<Result<Invoice>>;
  markPaid(invoiceId: string): Promise<Result<Invoice>>;
}
```

Important: production methods intentionally omit `actor`, `tutorId`, and `studentId` parameters when those values can be derived from the verified session. A requested target student ID can be supplied as an input, but authorization must be derived from the authenticated server context and checked again in RLS/transaction logic.

## 4. Mapping from current demo stores

| Current demo module | Existing operations | Future repository boundary |
|---|---|---|
| `AuthService` | `getCurrentSession`, `signInDemo`, `signOut`, `subscribe` | `AuthRepository` |
| `IdentityStore` | user CRUD, active tutor/student assignments | `IdentityRepository` |
| `ClassSessionStore` | list/read sessions, recurring series, attendance, cancellation, soft delete, replacement, billability | `ClassSessionRepository` |
| `SessionStore` | list/read reports, save draft/submit, delete draft | `SessionReportRepository` |
| `MonthlyEvaluationStore` | tutor list, student published list, save draft/publish | `MonthlyEvaluationRepository` |
| `BillingStore` | rates, invoice draft, edit draft, issue, mark paid | `BillingRepository` |

The adapter must preserve current UI behavior and product rules, not every internal helper or localStorage key. The UI should not call `localStorage`, Supabase tables, or Supabase RPCs directly.

## 5. Operation ownership and transaction requirements

| Operation | Allowed caller | Trusted enforcement |
|---|---|---|
| Create/deactivate account, change role | Admin | Server-side Auth Admin API + profile transaction + audit |
| Assign/reassign tutor | Admin | Transaction; one active tutor per student; retain history |
| Create recurring series | Admin | One transaction; validate all slots and conflicts; all-or-nothing |
| Record attendance | Assigned Tutor; Admin only if explicitly authorized as override | Verify assignment and session ownership in transaction; append audit event |
| Tutor cancellation | Assigned Tutor | Non-empty reason; mark replacement required |
| Admin cancellation / soft delete | Admin | Apply lifecycle rules; preserve history; replacement where required |
| Save/submit session report | Assigned Tutor | Verify session and assignment; student reads only submitted own report |
| Save/publish monthly evaluation | Assigned Tutor | Verify assignment; student reads only published own evaluation |
| Set student rate | Admin | Validate positive integer IDR; retain effective history |
| Create invoice draft | Admin | Derive billable sessions from canonical session records; snapshot amount; prevent duplicate session billing |
| Issue invoice / mark paid | Admin | Explicit state transition; immutable issued/paid financial snapshot; audit actor and timestamp |

Do not expose a generic client-side `update(table, id, patch)` method for privileged entities. Use named operations with narrow inputs and explicit state transitions.

## 6. Data and query rules

- Derive the current user's ID from the verified Auth session on the server/database side.
- Tutor queries must be scoped to active assignments. Student queries must be scoped to the current student, not a student ID trusted from the browser.
- Parent Hub reads through the current student's identity and returns only that student's submitted reports, published evaluations, and issued/paid invoice history.
- Admin list endpoints may accept filters, pagination, and sorting, but must validate them and never return secrets or unnecessary personal data.
- Use stable UUIDs for production records. Demo IDs such as `usr_stu_001` are not production identifiers.
- Store timestamps in UTC; interpret recurring schedule choices and display times in `Asia/Jakarta`.
- Preserve the billability rule: a session is billable only when status is `held` and attendance is `present` or `late`.
- Do not use session reports as evidence that a class was held; operational session status and attendance are the billing source.
- Invoice item/session uniqueness must be enforced by a database constraint, not only by a pre-query.

## 7. Error contract

Map backend errors to stable domain codes rather than leaking raw SQL/PostgREST messages into the UI. At minimum handle:

- `UNAUTHENTICATED`: no valid session.
- `FORBIDDEN`: authenticated but not authorized for the target.
- `NOT_FOUND`: record absent or intentionally hidden by row-level access.
- `VALIDATION_ERROR`: invalid input or illegal state transition.
- `SCHEDULE_CONFLICT`: tutor/student overlap.
- `ASSIGNMENT_REQUIRED`: tutor is not currently assigned.
- `DUPLICATE_BILLING`: one or more sessions already belong to another invoice.
- `INVOICE_LOCKED`: invoice has been issued and is immutable.
- `CONFLICT`: stale version or concurrent update.
- `UNAVAILABLE`: network or temporary service failure.

Never treat a zero-row update as success. For update operations, verify the returned record and expected state transition.

## 8. Migration sequence

1. [x] Add the initial typed repository interfaces and a local-demo adapter for portal authentication and active account listing; the React portal now consumes this adapter without changing the login flow.
2. [ ] Extend the adapter boundary to the remaining domain stores (sessions, reports, evaluations, billing) and move each workspace incrementally. Existing Playwright coverage is running against this first extraction.
3. Start a local/development Supabase instance only after the user confirms the local environment is ready.
4. Implement schema and constraints through the Supabase CLI workflow; use the CLI to create migration files, not hand-invented filenames.
5. Implement RLS and privileged transactions; run tests as anonymous, Student A, Student B, assigned Tutor, unassigned Tutor, and Admin.
6. Implement the Supabase repository adapter and run the same contract tests against it.
7. Run end-to-end tests, security tests, Supabase advisors, and a no-secret-in-client-build check.
8. Only after explicit approval, plan a separate production rollout with backup/restore and data migration rehearsal.

## 9. Current status and next gate

- The repository contract is design guidance; the first code slice now exists in `vite-app/src/data/repositories.ts` and `vite-app/src/data/local-demo-repositories.ts`.
- `vite-app/src/App.tsx` consumes the local-demo auth/identity adapter; other workspace controllers still use their legacy store imports.
- No Supabase project, database, Auth user, credential, or production data has been accessed or changed.
- No migration SQL has been generated or executed.
- The TypeScript production build passed for the first adapter extraction; Playwright browser QA is tracked in GitHub Actions run 44514917685.
- Next implementation step is repository-interface extraction in the existing `preview` branch, after reviewing the affected UI imports and tests. Actual Supabase adapter work waits for a confirmed local/development environment.
