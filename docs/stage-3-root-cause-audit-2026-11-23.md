# Stage 3 — Root-Cause Audit (23 November 2026)

**Repository:** `soKrizpy/b2b-v3`  
**Working branch:** `preview`  
**Audited commit:** `0fa841fed8b62401bf7efb75ecbb51b6ccf960de`  
**Supabase project:** active project `enfqoofluceqrlcjemfu`  
**Scope:** source contracts, production schema/RLS/functions, aggregate production data, transaction-level QA with rollback, CI/browser QA.

This is an audit record, not a declaration that Stage 3 is complete. No branch was created, `main` was not changed, no Vercel production deployment was performed, and no real student/tutor records were edited by QA. Database migrations below were applied to the active Supabase project; QA fixtures were created inside rollback-only subtransactions and verified absent afterward.

## 1. Root causes fixed and verified

### 1.1 Responsive overflow at 1024 px

The sidebar retained the mobile `width: 100%` behavior during a resize transition at the tablet breakpoint. The targeted CSS change disables that transition at the 1024 px breakpoint. The subsequent authenticated-workspace tests passed for Admin, Tutor, and Student at 320, 360, 390, 768, and 1024 px in light and dark themes. The latest successful full run before this audit commit reported 80 passed, 21 skipped, 0 failed.

### 1.2 Billing contract mismatch

- Student dashboard reads now select only `sent` invoices (still unpaid).
- Parent Hub history selects `sent` and `paid` invoices.
- The class-session adapter now treats both `hadir` and `telat` as billable when the meeting is completed.
- The database invoice create/update functions now use the same `hadir` + `telat` rule.

A transaction-level Supabase test created one QA late-attendance meeting, generated and updated a draft invoice, verified one billable line and the expected amount, then rolled back. No QA invoice, meeting, or tariff remained.

### 1.3 Meeting lifecycle and direct-write bypass

Before the fix, the client checked that every student had attendance recorded, but the database did not enforce that invariant. Authenticated users also had direct insert/delete access to meeting roster rows and broad update access to meeting columns. That allowed a caller to bypass the guarded scheduling RPCs or attempt to mutate ownership/audit fields directly.

The database now:
- Rejects completion unless the meeting has at least one linked student and every linked student has `attendance_recorded_at`.
- Locks the parent meeting row while attendance changes occur, serializing attendance edits against completion.
- Rejects attendance changes after a meeting is finalized.
- Prevents terminal states (`selesai`, `terlewat`, `cancelled`, `soft_deleted`) from being reopened or changed.
- Keeps cancellation reason and lifecycle audit fields server-owned.
- Revokes direct authenticated inserts to `meetings`, direct roster inserts/deletes, and broad meeting updates. Authenticated clients can update only `completion_status` and `cancellation_reason`.
- Moves the privileged scheduling implementations into `private` SECURITY DEFINER functions with explicit actor/assignment/conflict checks. The exposed `public` RPCs are now SECURITY INVOKER wrappers.

The Tutor UI disables attendance controls for finalized sessions. Transaction-level QA verified: incomplete attendance blocks completion; complete attendance permits completion; post-completion attendance edits are rejected; recurring scheduling rejects a conflicting slot; replacement scheduling preserves the original roster. All fixtures were rolled back.

### 1.4 Concurrent duplicate project submissions

The challenge submission function previously checked the latest status and inserted a pending row without serializing concurrent requests. Two simultaneous requests could both pass the check. It now takes a transaction advisory lock per student/challenge pair and has a partial unique index enforcing one pending submission per pair. A rollback-only test verified that a second pending submission is rejected.

### 1.5 Migrations applied to the active project

| Version | Migration |
|---|---|
| `20261123154109` | `include_late_attendance_in_invoice_billing` |
| `20261123154517` | `enforce_attendance_before_meeting_completion` |
| `20261123154840` | `restrict_direct_meeting_writes` |
| `20261123155212` | `serialize_student_challenge_submissions` |
| `20261123155354` | `lock_attendance_after_session_finalization` |
| `20261123155725` | `move_schedule_definers_to_private_schema` |

Each version has a matching SQL file under `supabase/migrations/`.

## 2. Production data audit

Aggregate queries only; no student names, contact details, credentials, or individual learning records were exported.

### Curriculum and assessments

- 7 modules, 100 topics; 99 topics are published.
- All 100 topics have quiz content and a challenge.
- Topic counts per module: 30, 10, and five modules with 12 topics each.
- This violates the agreed 12–16 topics-per-module range for the 30-topic and 10-topic modules.
- All seven current modules have level `beginner`; there is no populated intermediate/advanced catalog yet.
- There are 2 module-assessment records but 0 assessment questions and 0 attempts. There are 3 unlock records and 2 certificate records. The required 20-question Final Boss is therefore not ready.
- The Final Boss pass threshold and retry policy remain undecided; this audit does not invent them.

### Schedule-to-curriculum mapping

- 532 meetings exist.
- Only 14 have both `module_id` and `topic_id`; 518 are missing at least one association.
- The Student runtime currently exposes published topics from an assigned module; it does not gate the next topic against the next scheduled class.
- Automatic backfill would be guesswork where old meetings have no reliable module/topic association. Do not bulk-map these records without an approved mapping rule.

### Tutor learning records and gamification

- 7 active tutor–student assignments.
- 0 session reports, 0 monthly evaluations, and 0 challenge submissions currently exist in production.
- 17 `student_badges` rows exist, but the active Student UI explicitly says gamification is not available; no complete production badge catalog/event-awarding flow is wired.
- Parent Hub and Tutor learning-record components are connected to production repositories, but their live data flows have not yet been exercised with real report/evaluation records.

### Billing

- 20 invoices: 7 drafts, 8 sent, 5 paid.
- 43 invoice items; all currently have meeting links.
- 6 invoices have no line items and 6 totals do not reconcile to item totals without an adjustment note. These historical mismatches were intentionally left untouched; do not auto-correct them.
- `student_tariffs` currently has 0 rows. Admin must configure a rate for each student before new draft invoices can be generated.

## 3. Security and migration audit

### Verified good

- All 38 tables in the exposed `public` schema have RLS enabled.
- No public SECURITY DEFINER function is currently executable by `authenticated`.
- The schedule API uses SECURITY INVOKER wrappers; privileged implementations live in `private` and validate actor/assignment before writes.
- The security advisor no longer reports the two schedule RPCs as exposed authenticated SECURITY DEFINER functions.

### Remaining security actions

1. `private.admin_deactivation_lock` still has RLS disabled. Current grants show no direct table access for `anon` or `authenticated`; lock operations are performed through restricted server-side functions. Defense-in-depth SQL to apply after review:
   `ALTER TABLE private.admin_deactivation_lock ENABLE ROW LEVEL SECURITY;`
   Do not add a client policy. The SECURITY DEFINER owner functions should continue to work while FORCE ROW LEVEL SECURITY remains off. This change was deliberately not applied automatically.
2. Supabase Auth leaked-password protection is disabled. Enable it in the Auth password-security settings.
3. The `private.student_login_attempts` table has RLS enabled with no policies; this is intentional because it is server-only.
4. The performance advisor reports 36 unused indexes. No indexes were dropped; usage needs workload observation before removal.

### Migration source gap

- Active Supabase migration history: 63 versions.
- Repository migration files: 48.
- 15 historical source files are missing from the repository:
  - `20250601_001_phase_a_authoring_foundation`
  - `20250602_001_topic_progress_columns`
  - `20250603_001_parent_links`
  - `20250604_001_add_student_modules_status`
  - `20250605_001_engine_progress`
  - `20250606_001_student_avatars_and_titles`
  - `20250607_001_module_assessments`
  - `20250610_001_student_badges`
  - `20260923_001_quiz_engine_source`
  - `20261025110018_0018_meeting_module_association`
  - `20261025112555_0019_allow_legacy_series_module_assignment`
  - `20261030095522_add_meeting_topic_association`
  - `20261107091536_admin_assessment_overrides`
  - `20261107114124_certificate_verification_tokens`
  - `20261107152916_certificate_learning_record`

The live database is functioning, but a clean environment cannot reproduce the full historical schema from the repository alone. Do not fabricate these migrations or use `migration repair` to conceal the gap. Recover the original SQL or produce a reviewed schema baseline/dump using the Supabase CLI workflow before claiming reproducible database setup.

## 4. Stage 3 completion matrix

| Sub-stage | Audit status | Remaining root work |
|---|---|---|
| 3.1 Curriculum contract | Partial | Reconcile 30/10 topic counts, complete level catalog, map meetings to topics, define schedule-based unlock behavior. |
| 3.2 Auth & identity | Mostly implemented | Real-account smoke test remains unverified; enable leaked-password protection; add RLS defense-in-depth to admin lock table. |
| 3.3 Domain repositories | Partial | Capability-scoped production repositories are wired, but legacy JS workspace bridges remain; finish one canonical contract and remove duplicate paths. |
| 3.4 Student runtime | Partial | Schedule gating, 20-question Final Boss content/runtime, and production gamification/badge awards remain. |
| 3.5 Tutor runtime | Core flows wired | Schedule, attendance, completion, review, reports and evaluations are wired; live report/evaluation/submission records are still zero. |
| 3.6 Admin & Parent Hub | Core flows wired | Configure student tariffs; reconcile historical invoice exceptions only with explicit review; validate Parent Hub with real published records. |
| 3.7 Legacy cleanup | Incomplete | Remove or isolate obsolete JS/demo adapters after canonical paths and regression coverage are complete. |
| 3.8 Regression & browser QA | Passing, with skips | Active responsive tests pass; 21 legacy portal tests remain skipped; real Supabase account smoke test is not covered by mocked-auth Playwright tests. |

## 5. Verification boundaries

- Browser E2E uses mocked Supabase Auth and fixtures. It validates UI/contracts, not successful sign-in against a real dummy account.
- Latest completed full CI at `0fa841fed8b62401bf7efb75ecbb51b6ccf960de`: 80 passed, 21 skipped, 0 failed; TypeScript, production build, Deno Edge Function typecheck, and admin deactivation security invariants passed.
- Preview Build passed at `ed77dc26e5caf8f0bcb20e4245c74fd01ea71708`; application source was unchanged in the subsequent migration-file commit.
- The audit document commit is documentation-only; no additional build was triggered for it.
- No Vercel production deployment or Edge Function deployment was performed.
- GitHub currently exposes only the `preview` branch for this repository. No `main` branch exists there, and none was created.
