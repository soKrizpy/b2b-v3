# Production Backend Readiness & Security Plan

Status: design document only. No Supabase project, database, Auth configuration, secrets, or production data were accessed or changed.

## 1. Current-state audit

The current application is a local demonstration. Its role checks and business rules run in browser JavaScript, while records are stored in `localStorage`. This is useful for UI prototyping and browser tests, but it is not an authorization boundary: a user can edit browser storage, call client methods directly, or alter requests.

Observed implementation:
- `js/services/auth-service.js`: demo session and a synthetic `demo-token`; no password verification or server-issued session.
- `js/services/identity-store.js`: users and tutor/student assignments stored locally.
- `js/services/access-control.js`: client-side role and relationship checks; legacy parent/teacher compatibility paths remain in this older service.
- `js/services/class-session-store.js`: scheduling, attendance, cancellation, replacement, and billability rules run in the browser.
- `js/services/session-store.js`: session reports stored locally.
- `js/services/monthly-evaluation-store.js`: draft/published monthly evaluations stored locally.
- `js/services/billing-store.js`: manual rates, invoice drafts, issue/payment state, and invoice items stored locally.

**Conclusion:** do not use this build with real student or billing data until identity, authorization, persistence, and audit enforcement move to a trusted backend.

## 2. Product rules to preserve

These are settled product decisions and must not be changed by the migration:

- Supported roles: Admin, Tutor, Student. There is no separate Parent account or role.
- Parent Hub stays inside the signed-in Student Workspace.
- One active tutor per student; assignment history is retained.
- Admin manages assignments and manually sets each student's tariff.
- Tutors can access only students currently assigned to them.
- Students progress sequentially through lessons.
- A session is billable only when it was held and attendance is present or late.
- Absent, cancelled, not-held, and soft-deleted sessions are not billable.
- Tutor cancellation requires a reason and requires an Admin-managed replacement.
- Admin cancellation reason is optional. Soft deletion preserves history and requires replacement.
- Recurring series creation must be atomic; conflicting slots are skipped according to the selected weekday schedule.
- Session report and monthly evaluation are separate records.
- Monthly evaluation levels: Sangat baik; Baik; Berkembang sesuai proses; Membutuhkan pendampingan lebih lanjut.
- Monthly evaluation is visible in Parent Hub only after publication and only to the matching student.
- Invoice tariff is snapshotted when invoice items are created; issued/paid invoice history must remain stable.
- Admin marks invoices paid; no payment method/date fields are required.
- Paid invoices disappear from the student dashboard but remain in Parent Hub history.
- No invoice deletion; preserve audit/history.

## 3. Recommended production components

- **Supabase Auth** for real user authentication and managed sessions.
- **Postgres** as the source of truth for all operational records.
- **Row Level Security (RLS)** on every exposed table.
- **Server-side trusted operations** for privileged workflows such as creating accounts, changing roles, issuing invoices, marking invoices paid, and creating recurring session series.
- Browser client uses only the publishable key. A secret/service-role key must never be shipped to the browser or included in any `VITE_*` variable.
- The frontend must obtain the current user from the authenticated Supabase session; never accept a user ID or role supplied by the page as proof of identity.

No separate Parent account is introduced. A student's authenticated account sees its own Parent Hub content.

## 4. Proposed relational model

All tables use UUID primary keys unless a natural key is explicitly noted. Timestamps are UTC; session display and recurring schedule interpretation use `Asia/Jakarta`.

| Table | Purpose and important fields |
|---|---|
| `profiles` | `id` references `auth.users(id)`; `role` constrained to admin/tutor/student; display name, email mirror, status, grade level, timestamps. Role/status changes are admin-only trusted operations. |
| `tutor_student_assignments` | Tutor, student, active/inactive status, start/end timestamps, created-by; retain ended rows. Partial unique index permits at most one active assignment per student. |
| `class_series` | Recurring series owner/admin, tutor, student, selected weekdays, start time, duration, target count, default meeting URL, status. |
| `class_sessions` | Series, session number, student, tutor, scheduled start, duration, meeting URL override, status, attendance, cancellation reason/actor/time, replacement links, soft-delete metadata, version. |
| `session_reports` | Session reference, student, tutor, draft/submitted status, narrative/report fields, submitted timestamp, version and audit timestamps. Enforce one canonical report per session unless product requirements explicitly change. |
| `monthly_evaluations` | Student, tutor, month, rating enum, summary, strengths, next goals, draft/published status, published timestamp, version. Unique student+tutor+month key; only assigned tutor/admin can create or edit. |
| `student_rates` | Student, amount per session in integer IDR, effective timestamp, admin actor. Keep rate history; never overwrite a rate that has already been snapshotted into an invoice. |
| `invoices` | Student, period (YYYY-MM), status (draft/issued/paid), subtotal/adjustment/total, currency IDR, rate snapshot, issued/paid timestamps and actor IDs, audit timestamps. No hard delete. |
| `invoice_items` | Invoice, session, session number/date snapshot, amount snapshot. Unique session reference prevents one session being billed twice. |
| `audit_events` | Actor, action, entity/table, entity ID, timestamp, structured before/after metadata where appropriate. Append-only for sensitive operations. |

### Data integrity constraints

- Use foreign keys and check constraints for role/status/attendance/rating values.
- At most one active tutor assignment per student (partial unique index).
- Prevent overlapping scheduled intervals for the same tutor or student. Enforce this transactionally in a trusted database operation; do not rely on a browser pre-check. Back-to-back intervals are allowed.
- Recurring series creation validates all proposed sessions and commits all of them or none.
- Attendance can be recorded only by the assigned tutor (or Admin override if explicitly added later); attendance transitions are auditable.
- `held` plus `present` or `late` is the only billable combination.
- Invoice generation locks/claims eligible sessions in a transaction and snapshots amounts. Unique invoice-item session references prevent duplicates under concurrent requests.
- Issued and paid invoices are immutable except for the explicit paid-state transition; corrections use auditable adjustment records rather than silently rewriting history.
- Replacement relationships must point to valid sessions and be linked consistently in both directions.

## 5. Authorization matrix

RLS must enforce these rules at the database boundary. Hiding tabs or filtering data in React/JavaScript is not sufficient.

| Resource | Admin | Tutor | Student |
|---|---|---|---|
| Profiles | Manage all | Read own and assigned students' minimum profile fields | Read own profile |
| Assignments | Manage and view history | Read own active assignments | No direct access needed |
| Class sessions | Manage all | Read assigned sessions; record own attendance; request cancellation with reason | Read own relevant schedule and meeting link |
| Session reports | Read all; administrative correction only with audit | Create/edit reports for assigned students/sessions | Read own submitted reports only |
| Monthly evaluations | Read all; administrative oversight | Create/edit evaluations for assigned students | Read own published evaluations only |
| Student rates | Manage all; retain history | No access | No access |
| Invoices/items | Create, review, issue, mark paid; no delete | No access | Read own issued/paid invoices and history |
| Audit events | Read authorized audit trail | No general access | No access |

Additional rules:
- Do not trust `user_metadata` for role or authorization.
- If JWT `app_metadata` is used for coarse role checks, it must be set only by trusted server/admin operations; account role changes must revoke/refresh sessions so stale claims cannot preserve old access.
- Row ownership checks must include `auth.uid()`; `TO authenticated` by itself is not sufficient.
- UPDATE policies require both `USING` and `WITH CHECK`.
- Any views exposed through the Data API must use invoker security where supported or be kept inaccessible to untrusted roles.
- Avoid `SECURITY DEFINER` by default. If a privileged function is proven necessary, isolate it in a non-exposed schema, pin `search_path`, explicitly check actor identity/authorization, revoke default PUBLIC execution, grant only intended roles, and test it as anon/authenticated/service roles.

## 6. Migration sequence

1. **Freeze the local-demo contract:** retain the working demo and its 24 passing browser tests as the reference behavior.
2. **Create a local Supabase development environment:** no production credentials; pin CLI/client versions and commit lockfiles.
3. **Implement schema and constraints:** profiles, assignments, sessions/series, reports, monthly evaluations, rates, invoices/items, audit events.
4. **Implement Auth/profile provisioning:** trusted admin invitation/provisioning; no public self-selection of role.
5. **Implement RLS and test matrix:** test anon, authenticated student A, student B, assigned tutor, unassigned tutor, and admin. Include IDOR/BOLA attempts and update reassignment attempts.
6. **Move critical transactions server-side:** recurring series, attendance, cancellation/replacement, monthly evaluation publication, invoice generation, issue/payment.
7. **Build repository adapters:** replace localStorage stores behind stable interfaces; preserve current UI and workflows.
8. **Migrate data only after mapping and reconciliation:** do not blindly import demo seeds or browser localStorage. Validate identity ownership and duplicate sessions/invoice items.
9. **Production gate:** backup/restore rehearsal, RLS tests, Supabase security advisors, audit review, and explicit owner approval before any production migration.

## 7. Required security tests before release

- Unauthenticated user cannot read or mutate private records.
- Student A cannot read Student B's profile details, sessions, reports, evaluations, invoices, or invoice items by guessing UUIDs.
- Tutor cannot access unassigned students even by direct API calls.
- Tutor cannot record attendance or cancel sessions assigned to another tutor.
- Student/tutor cannot change their own role or status.
- Client cannot set invoice status, amount, tariff, paid timestamp, or creator identity.
- Concurrent invoice generation cannot bill a session twice.
- Concurrent recurring-series creation cannot create overlapping slots.
- Draft monthly evaluations are never visible to students; published evaluation visibility is scoped to its student.
- A demoted/deactivated user loses access after the defined session-revocation procedure.
- No service-role/secret key appears in built frontend assets, source maps, logs, or browser network requests.

## 8. Explicitly out of scope for this change

- No production Supabase connection or SQL execution.
- No new secrets, API keys, users, or database projects.
- No migration of real student records.
- No separate Parent role/account.
- No deployment or merge to `main`.

## 9. Approval gates

Before the first actual Supabase project/schema change, confirm the target is a **new/local development environment**, not production. Production work requires a separate explicit approval after local schema, RLS, and test evidence have been reviewed.
