# Frontend–Backend Repository Contract

Status: design and migration contract for B2B v3. The local-demo repository adapters exist for portal auth/identity and the four domain stores. No Supabase client, SQL, credentials, or production data have been used or changed.

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

The proposed feature interfaces are `AuthRepository`, `IdentityRepository`, `ClassSessionRepository`, `SessionReportRepository`, `MonthlyEvaluationRepository`, and `BillingRepository`. Their operations are described in the sections below and mapped to current stores. The implemented local adapters are intentionally compatibility adapters, not final production interfaces.

Important: production methods intentionally omit `actor`, `tutorId`, and `studentId` parameters when those values can be derived from the verified session. A requested target student ID can be supplied as an input, but authorization must be derived from the authenticated server context and checked again in RLS/transaction logic.

## 4. Mapping from current demo stores

| Current demo module | Existing operations | Repository boundary |
|---|---|---|
| `AuthService` | `getCurrentSession`, `signInDemo`, `signOut`, `subscribe` | `AuthRepository` |
| `IdentityStore` | user CRUD, active tutor/student assignments | `IdentityRepository` |
| `ClassSessionStore` | list/read sessions, recurring series, attendance, cancellation, soft delete, replacement, billability | `ClassSessionRepository` |
| `SessionStore` | list/read reports, save draft/submit, delete draft | `SessionReportRepository` |
| `MonthlyEvaluationStore` | tutor list, student published list, save draft/publish | `MonthlyEvaluationRepository` |
| `BillingStore` | rates, invoice draft, edit draft, issue, mark paid | `BillingRepository` |

Implemented files:

- `vite-app/src/data/repositories.ts`: typed portal auth/identity contracts.
- `vite-app/src/data/local-demo-repositories.ts`: local demo implementation for portal auth and active account listing; consumed by `App.tsx`.
- `vite-app/src/data/local-demo-domain-repositories.ts`: async compatibility adapters for class sessions, session reports, monthly evaluations, and billing. Synchronous subscription disposers and the pure `isBillable` helper remain synchronous; getters remain values.

The domain adapters wrap the existing stores without changing localStorage keys, event names, validation, or business rules. `StudentExperience.tsx` now re-reads the active session through `localDemoRepositories.auth.getSession()` before mounting the legacy learning controller. The learning controller's domain data operations remain on their existing stores; this is a first narrow consumer migration, not a full Student Workspace migration. Existing Playwright coverage for student sign-in/dashboard verifies the user-visible path.

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
2. [x] Add async compatibility adapters for class sessions, reports, monthly evaluations, and billing. The existing workspace controllers still use their legacy imports; migration into each workspace is the next task.
3. [x] Migrate Student Workspace session validation to `AuthRepository`; retain the legacy learning controller and data stores.
4. [x] Migrate Tutor Workspace session validation to `AuthRepository`; retain the legacy tutor controller and domain stores.
5. [x] Migrate Admin Workspace session validation and demo identity initialization to `AuthRepository`/`IdentityRepository`; retain the legacy admin controller and domain stores.
6. [x] Add browser coverage for the async attendance repository boundary and Tutor cancellation (required reason, assigned-tutor ownership, cancelled state, and replacement flag); migrate domain operations one use case at a time, preserving existing behavior.
7. Start a local/development Supabase instance only after the user confirms the local environment is ready.
8. Implement schema and constraints through the Supabase CLI workflow; use the CLI to create migration files, not hand-invented filenames.
9. Implement RLS and privileged transactions; run tests as anonymous, Student A, Student B, assigned Tutor, unassigned Tutor, and Admin.
10. Implement the Supabase repository adapter and run the same contract tests against it.
11. Run end-to-end tests, security tests, Supabase advisors, and a no-secret-in-client-build check.
12. Only after explicit approval, plan a separate production rollout with backup/restore and data migration rehearsal.

## 9. Current status and next gate

- The portal auth/identity adapter is consumed by `vite-app/src/App.tsx`; `StudentExperience.tsx` and `TutorExperience.tsx` re-read the active session before mounting their legacy controllers, while `AdminExperience.tsx` initializes demo identity and checks the active Admin session through the repositories.
- The domain adapter exposes the four existing domain stores through asynchronous methods while preserving synchronous subscriptions and pure helpers. Tutor attendance and Tutor cancellation now use the shared async `ClassSessionRepository`; the demo store remains the persistence layer. `ClassSessionRepository` now owns the Tutor attendance and cancellation operations; the Tutor workspace awaits both operations and reports failures without claiming success.
- The domain adapter baseline completed successfully in [GitHub Actions run #86](https://github.com/soKrizpy/b2b-v3/actions/runs/44516887468). The Student session-gate change and subsequent Tutor/Admin session-gate changes are verified by [GitHub Actions run #87](https://github.com/soKrizpy/b2b-v3/actions/runs/44518750410) and the latest follow-up run will verify the Tutor/Admin migration.
- All three workspace boundaries use the repository layer to re-check the active demo session before mounting. The first two Tutor domain operations—attendance and cancellation—now cross the async class-session repository boundary. Other Tutor operations and Admin/Student domain operations still use legacy stores.
- No Supabase project, database, Auth user, credential, or production data has been accessed or changed.
- No migration SQL has been generated or executed.
- Actual Supabase adapter work waits for a confirmed local/development environment.
