# Frontend–Backend Repository Contract

Status: frontend repository-boundary migration is implemented for portal auth, identity, submissions/review, class sessions, session reports, monthly evaluations, and billing. Local-demo repositories still use browser storage. No Supabase client, SQL, credentials, or production data have been used or changed.

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

## 3. Repository contract

Use asynchronous methods in the production-facing contract, even where the current local demo methods are synchronous. This avoids a second UI rewrite when the backend is introduced.

The feature boundaries are `AuthRepository`, `IdentityRepository`, `LearningStateRepository`, `ClassSessionRepository`, `SessionReportRepository`, `MonthlyEvaluationRepository`, and `BillingRepository`. Their operations are mapped to the current stores. The implemented local adapters are intentionally compatibility adapters, not final production interfaces.

Important: production methods intentionally omit `actor`, `tutorId`, and `studentId` parameters when those values can be derived from the verified session. A requested target student ID can be supplied as an input, but authorization must be derived from the authenticated server context and checked again in RLS/transaction logic.

## 4. Mapping from current demo stores

| Current demo module | Existing operations | Repository boundary |
|---|---|---|
| `AuthService` | `getCurrentSession`, `signInDemo`, `signOut`, `subscribe` | `AuthRepository` |
| `IdentityStore` | user CRUD, active tutor/student assignments | `IdentityRepository` |
| `StateStore` | submission reads/writes, student lesson submission lookup, tutor review status changes | `LearningStateRepository` |
| `ClassSessionStore` | list/read sessions, recurring series, attendance, cancellation, soft delete, replacement, billability | `ClassSessionRepository` |
| `SessionStore` | list/read reports, save draft/submit, delete draft | `SessionReportRepository` |
| `MonthlyEvaluationStore` | tutor list, student published list, save draft/publish | `MonthlyEvaluationRepository` |
| `BillingStore` | rates, invoice draft, edit draft, issue, mark paid | `BillingRepository` |

Implemented files:

- `vite-app/src/data/repositories.ts`: typed portal auth/identity contracts.
- `vite-app/src/data/local-demo-repositories.ts`: local demo implementation for portal auth and active account listing; consumed by `App.tsx`.
- `js/services/identity-repository.js`: async identity and assignment reads/mutations; synchronous subscription disposer.
- `js/services/learning-state-repository.js`: async submission reads/writes, legacy-progress migration, and tutor review status updates; synchronous subscription disposer.
- `js/services/class-session-repository.js`, `learning-record-repository.js`, and `billing-repository.js`: async reads and mutations for their respective domains.
- `vite-app/src/data/local-demo-domain-repositories.ts`: typed async compatibility adapters for the four operational domain stores. All exposed store methods return Promises except synchronous `subscribe` disposers and the pure `isBillable` helper. Non-function data properties (for example, evaluation rating definitions) remain synchronous values. Explicit mutation methods take precedence over legacy store methods in the adapter Proxy.

The workspace controllers now consume these boundaries for domain reads and writes: Student lesson submissions and Parent Hub reports/evaluations/invoices; Tutor assigned schedules, reports, evaluations, attendance/cancellation, and submission review; Admin identity/assignment management, schedules, rates, and invoices. Store subscriptions remain synchronous so the local demo can refresh views after writes. The lesson checkpoint/progress draft still uses the existing localStorage progress key and is not yet a remote persistence implementation.

The UI should not call `localStorage`, Supabase tables, or Supabase RPCs directly.

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

1. [x] Add typed portal auth/identity contracts and a local-demo adapter; the React portal consumes it without changing the login flow.
2. [x] Add async compatibility adapters for identity, learning submissions/review, class sessions, reports, monthly evaluations, and billing.
3. [x] Migrate Student Workspace session validation and lesson submission reads/writes; move Parent Hub reads to async repositories.
4. [x] Migrate Tutor Workspace session validation, assigned schedule/report/evaluation reads, attendance/cancellation, and submission review to repositories.
5. [x] Migrate Admin Workspace identity/assignment CRUD and schedule/billing reads/writes to repositories.
6. [x] Add and retain browser coverage for async adapter reads/writes and the affected Student/Tutor/Admin workflows.
7. Start a local/development Supabase instance only after the user confirms the local environment is ready.
8. Implement schema and constraints through the Supabase CLI workflow; use the CLI to create migration files, not hand-invented filenames.
9. Implement RLS and privileged transactions; run tests as anonymous, Student A, Student B, assigned Tutor, unassigned Tutor, and Admin.
10. Implement the Supabase repository adapter and run the same contract tests against it.
11. Run end-to-end tests, security tests, Supabase advisors, and a no-secret-in-client-build check.
12. Only after explicit approval, plan a separate production rollout with backup/restore and data migration rehearsal.

## 9. Current status and next gate

- The portal auth/identity adapter is consumed by `vite-app/src/App.tsx`; `StudentExperience.tsx` and `TutorExperience.tsx` re-read the active session before mounting their legacy controllers, while `AdminExperience.tsx` initializes demo identity and checks the active Admin session through the repositories.
- The domain adapter exposes the four existing domain stores through asynchronous methods while preserving synchronous subscriptions and pure helpers. `ClassSessionRepository` owns Tutor attendance/cancellation and Admin recurring-series creation, cancellation, soft deletion, and replacement creation. `SessionReportRepository` owns report save/delete mutations, `MonthlyEvaluationRepository` owns evaluation saves, and `BillingRepository` owns Admin billing mutations. Tutor and Admin handlers await these operations and handle failures; local demo storage remains the persistence layer.
- The domain adapter baseline completed successfully in [GitHub Actions run #86](https://github.com/soKrizpy/b2b-v3/actions/runs/44516887468). Student/Tutor/Admin session-gate migrations passed in [run #91](https://github.com/soKrizpy/b2b-v3/actions/runs/44525472227), Tutor attendance/cancellation passed in [run #103](https://github.com/soKrizpy/b2b-v3/actions/runs/44530128020), and the combined schedule, learning-record, and billing repository coverage passed all 32 browser tests plus production build in [run #119](https://github.com/soKrizpy/b2b-v3/actions/runs/44531956130).
- All three workspace boundaries re-check the active demo session before mounting. Student lesson submission reads/writes and Parent Hub reads use `LearningStateRepository`, `SessionReportRepository`, `MonthlyEvaluationRepository`, and `BillingRepository`. Tutor schedule, report, evaluation, and submission-review reads/writes use the async repositories; Admin identity/assignment, schedule, rate, and invoice reads/writes use the async repositories. Tutor attendance/cancellation and Admin recurring-series creation, cancellation, soft deletion, and replacement creation remain on `ClassSessionRepository`. This completes the frontend domain-operation repository-boundary migration for the current local-demo stores. Lesson checkpoint/progress draft storage still uses the legacy localStorage key. This does not mean the remote Supabase backend is ready or production-secure.
- No Supabase project, database, Auth user, credential, or production data has been accessed or changed.
- No migration SQL has been generated or executed.
- Actual Supabase adapter work waits for a confirmed local/development environment.
