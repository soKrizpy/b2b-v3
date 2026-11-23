# Stage 3 — Canonical Repository Contract Gap Audit

Status: in progress. This document supersedes any broad statement elsewhere that the canonical TypeScript `DomainRepositories` runtime adapter is complete. The legacy workspace gateway and compatibility adapters exist, but they are not yet a complete implementation of `domain-contracts.ts`.

Audit baseline: branch `preview`, latest implementation checkpoint `89633b46e14ed52ed27022948bf8c6f08a3d27e3` (2026-11-22).
Scope: repository contract/store audit plus local-demo adapter implementation and tests. No database schema, production Supabase data, `main`, or user application data was changed.

## Findings by domain

| Domain | Canonical contract | Existing local implementation | Gap / decision |
|---|---|---|---|
| Auth | email/password sign-in; `AuthSession`; async session and subscription | Demo auth accepts an account ID and returns the legacy demo-session shape | Not substitutable. Keep explicitly demo-only; implement a separate canonical demo adapter and do not pretend account-ID login implements credential auth. |
| Identity | `listUsers`, `getUser`, CRUD/status, filtered assignments, structured results | `IdentityStore` + `IdentityRepository`; partial typed adapter `createLocalDemoIdentityRepository` | Adapter covers much of the contract, but port types use broad `Record<string, unknown>` for mutations; runtime gateway/controllers still use legacy shape. Verify mutation DTO validation, assignment-history selection, and actor semantics before wiring as canonical. |
| Curriculum | modules/topics and JSON lesson content | Student imports one static mock JSON lesson; no curriculum runtime repository/store was found | No honest mapping for module/topic methods, publish state, ordering, or content retrieval. Must define a local-demo curriculum source and explicit validation/schema before implementing. Do not fabricate module/topic IDs from lesson keys. |
| Learning | typed progress, submission CRUD/review, optimistic version, typed change events | Student-scoped progress store; submission `StateStore`; `LearningStateRepository` | Progress save currently returns a legacy record or throws; contract expects `RepositoryResult`. Submission data uses legacy `lessonId`, relative/human timestamps and feedback history; contract uses `lessonKey`, ISO timestamps, reviewer fields, and version. Mapping needs explicit normalization and error conversion. |
| Class sessions | filtered list, typed session, recurring series, attendance, cancellation, soft delete, replacement, period-specific billability | `ClassSessionStore` and `ClassSessionRepository` with actor-bearing mutation calls | Contract omits actor parameters, but legacy mutations require actor objects. A demo adapter may derive actor only from the active demo session; never accept caller-provided actor as authorization. Recurring-series input/return shape and period filtering also need a documented adapter. |
| Session reports | typed report DTO, optimistic version, structured save/delete results | `SessionStore` and `SessionReportRepository` | Legacy save takes `(data, status, expectedVersion)`; contract accepts one input DTO. Existing records and UI fields must be mapped explicitly. Actor/ownership must come from trusted session context in remote implementation. |
| Monthly evaluations | typed evaluation DTO and result | `MonthlyEvaluationStore` and repository save(data, status) | Contract combines status in the input and expects structured result; legacy save takes separate status. Confirm date/period, publish state, rating validation and version behavior before adapting. |
| Billing | tariff, invoice lifecycle, item/session IDs, immutable snapshots, structured results | `BillingStore` and repository methods setRate/createInvoice/update/issue/markPaid with actor | Contract omits actor, while legacy calls require it. Legacy invoice DTO and period handling must be compared field-by-field. Tariff history is not currently modeled as effective-dated history. Contract's `updateDraftInvoice` permits `totalAmount` edits; business rules should decide whether this is derived-only rather than caller-controlled. |

## Cross-cutting mismatches to resolve

1. **Result normalization:** legacy stores variously return records, `{success, ...}`, `{user}`, `{error, message}`, booleans, null, or throw. Canonical mutations must consistently return `RepositoryResult<T>`; adapters must preserve stable error codes and never convert a failed write into success.
2. **DTO normalization:** legacy IDs and field names differ (`lessonId` vs `lessonKey`); timestamps include display strings in mock submissions; optional metadata and nested feedback histories do not align with canonical DTOs. Use dedicated mapping functions and reject malformed records.
3. **Actor boundary:** canonical interfaces intentionally omit caller-supplied actor metadata. Demo adapters can read the active demo session internally for compatibility; production adapters must derive actor from verified server auth and enforce authorization server-side/RLS/transactions.
4. **Subscriptions:** legacy events are domain-specific and differ in payload. Normalize to `RepositoryChangeEvent` with stable domain/action/entity ID/time; do not fabricate entity IDs when unavailable.
5. **Optimistic concurrency:** contracts expose versions on several DTOs, but each legacy store's enforcement must be verified operation-by-operation. Do not claim concurrency safety solely because a version field exists.
6. **Curriculum is a blocker:** there is no complete module/topic source in the current runtime. The single mock lesson is content fixture data, not a curriculum repository.

## Required implementation sequence inside Stage 3

1. Define explicit legacy port interfaces per domain, replacing broad `Record<string, unknown>` mutation ports where possible.
2. Implement and test the canonical local-demo curriculum adapter only after identifying the real content schema and stable lesson/module/topic mapping. If the current product intentionally has only lesson JSON, revise the canonical contract rather than inventing module/topic data.
3. Implement canonical Learning adapter with student-scoped progress, submission DTO mapping, ISO timestamp rules, structured errors, and version conflict tests.
4. Implement canonical Class Session adapter with internally resolved demo actor, recurring-series normalization, date/period billability, and all lifecycle transitions tested.
5. Implement canonical Session Report and Monthly Evaluation adapters with DTO mapping, draft/publish semantics, ownership filters, and optimistic concurrency tests.
6. Implement canonical Billing adapter with tariff/invoice mapping, actor resolution, billable-session filtering, duplicate billing protection, and immutable issued/paid states.
7. Compose a single `DomainRepositories` factory with explicit injection; keep legacy controller gateway and production Supabase adapter separate until consumers are migrated.
8. Add contract tests that run against each adapter, including malformed legacy data, write failures, subscription normalization, student isolation, role/ownership, and stale versions.
9. Audit active workspace imports/direct store access and reconcile repository docs with actual consumers.
10. Re-run CI and verify browser tests before closing Stage 3.

## Safety and gate

- Continue only on branch `preview`; do not create branches.
- Do not modify `main`.
- Use the existing production Supabase project `bits2bytes` (`enfqoofluceqrlcjemfu`) as the authoritative data/auth target. Read-only schema and aggregate-data inspection is allowed. Do not create/delete users, alter schema, apply migrations, change RLS/policies, or write production rows without a separately scoped and explicit user instruction.
- Do not begin Stage 4 until Stage 3 is complete and the user explicitly approves the next gate.

## Learning adapter implementation checkpoint

Added `vite-app/src/data/local-demo-learning-repository.ts` implementing the canonical `LearningRepository` shape. It maps legacy `lessonId` to `lessonKey`, normalizes timestamps and optional fields, filters submissions, converts write failures to `RepositoryResult`, keeps progress keyed by student + lesson, and delegates review version checks to the legacy store. Tests cover student isolation, DTO mapping, stale update rejection, reviewer requirement, and review conflict.

Limitations: local demo only, not an authorization boundary. The reviewer callback must be wired from the active demo session; default rejects reviews. Legacy submission save has no atomic compare-and-swap, so its expectedVersion check is read-then-write and is not safe against concurrent tabs. Production must use atomic version predicates/transactions. Legacy progress save also has no compare-and-swap. Feedback history remains outside the canonical DTO.


## Implementation checkpoint — 2026-11-20

The following updates supersede the earlier "existing local implementation" notes above where they differ. All adapters remain local-demo compatibility code and are not production security boundaries.

| Domain | New canonical work | Current limitation |
|---|---|---|
| Identity | `createLocalDemoIdentityRepository` now derives the actor internally. Admin can list/manage users and assignments; tutors see only themselves and actively assigned students; students see only themselves and their own assignments. | Legacy mutation port still accepts broad records internally. Runtime workspace has not been migrated to this canonical adapter. |
| Learning | `createLocalDemoLearningRepository` now scopes student progress/submissions, allows tutor review only when an injected active-assignment check succeeds, and derives reviewer identity from the active actor. | Legacy submission update pre-read is not atomic. Progress has no compare-and-swap. Composition must supply current actor and active-assignment lookup. |
| Class sessions | `createLocalDemoClassSessionRepository` now scopes list/get reads to admin, the active tutor, or the active student; mutations derive actor internally. | Replacement creation still consists of create + link + rollback in localStorage; it is not a cross-tab transaction. Tutor cancellation is intentionally fulfilled by Admin, and the Admin UI already exposes a pending-replacement form. |
| Session reports | Canonical adapter maps legacy records, scopes tutor/student reads, derives tutor identity, and requires `expectedVersion` for updates. | Legacy report store has no `sessionId` relation. Adapter returns null for that field and rejects non-null session links rather than dropping them. |
| Monthly evaluations | Canonical adapter maps rating/period/status, scopes reads and derives tutor identity; updates require an expected version. | Version check is read-then-write because the local store has no atomic compare-and-swap. Production must use a transaction/version predicate. |
| Billing | Canonical adapter maps tariffs/invoices and derives Admin for writes. Student dashboard reads unpaid invoices; Parent Hub history includes unpaid and paid issued invoices. | Current tariff is overwritten; each invoice snapshots the rate. No effective-dated tariff history exists. |

### CI checkpoints

- `1a09a12`: canonical report/evaluation adapters — typecheck, production build, Chromium browser QA all passed (run `44664145003`).
- `24eec1d`: canonical billing adapter and separate Parent Hub invoice history contract — typecheck, production build, Chromium browser QA all passed (run `44664376440`).
- `b6d13ad`: session read scoping — CI passed (run `44664574556`).
- `b4b92e1`: session + learning read scoping and learning write/review actor checks — CI passed (run `44664690828`).
- `3c65c36`: identity actor scoping — typecheck, production build, and Chromium browser QA all passed (run `44664797419`).
- `37a28ef`: report/evaluation optimistic-version requirement — typecheck, production build, and Chromium browser QA all passed (run `44664961723`).

### Confirmed curriculum blocker

The repository tree contains one student lesson fixture (`data/mock/lesson-scratch-motion.json`) and the Admin Curriculum Studio Kiro documents. Those documents explicitly state that the Studio spec is not implemented. There is no Curriculum Store, canonical module/topic dataset, or stable module/topic ID source. The existing lesson JSON is a content fixture, not proof of a full curriculum. Therefore the canonical `CurriculumRepository` must remain unimplemented until the product's actual curriculum source/schema is decided; do not fabricate module/topic IDs or pretend the single lesson is a complete curriculum.

### Remaining Stage 3 work

1. Resolve the curriculum source/schema gap without inventing content; keep Stage 3 open until a valid mapping or an explicitly revised contract exists.
2. Keep the account-ID `DemoAuthRepository` isolated from the canonical email/password `AuthRepository`; implement a real credential adapter only when a verified credential provider and session lifecycle are approved.
3. Add canonical adapters to one typed composition factory only after all required domains (including curriculum/auth) have real implementations.
4. Audit remaining active workspace direct-store imports and decide migration boundaries; keep the legacy UI/controller gateway intact until a tested replacement exists.
5. Run complete contract/browser regression and close Stage 3 only after all domains and consumers are verified.

The Stage 4 gate remains closed. No Supabase setup, migrations, RLS changes, or production writes are authorized by this checkpoint.


### Additional guardrails and runtime migration notes

- `7e86bb1`: learning/report/evaluation adapters now require an active tutor-student assignment for tutor writes/reviews; student submission writes can only use `submitted`, and approved submissions cannot be resubmitted. Typecheck, production build, and Chromium browser QA all passed (run `44665212697`).
- The React login intentionally uses `DemoAuthRepository` with account-ID selection. `AuthService` explicitly does not store or verify passwords. Keep this demo port separate from canonical email/password `AuthRepository`; never adapt it by ignoring credentials.
- Active Admin, Tutor, Student, and embedded Parent Hub controllers still use the legacy `WorkspaceRepositories` gateway. The new canonical adapters are not yet wired into active runtime controllers. This is deliberate until the missing domains and a typed composition boundary are resolved.
- The embedded Parent Hub currently calls legacy `billing.getStudentInvoices()`, which returns all issued invoices including paid ones. During canonical consumer migration, its history tab must switch to `getStudentInvoiceHistory()`; the student-facing current-invoice view must use `getStudentInvoices()` (unpaid only).
- Local invoice creation has a read-then-write duplicate-session check. Production billing must enforce unique invoice-line/session ownership transactionally (e.g. unique constraint plus transaction), not rely on the demo check.

## Curriculum decision update — 2026-11-21

The product rules below are now confirmed by the user and supersede the earlier Admin Curriculum Studio spec language wherever it describes a Quiz as a Topic gate:

- One Island represents one Module.
- A Module targets 12–16 Topics/Nodes. Existing IDs and published content must be preserved; actual per-Module counts still require verification before any cleanup.
- Beginner, Intermediate, and Advanced are independent learning levels. No mandatory level prerequisite is enforced.
- Each Topic contains one Lesson and one formative Quiz.
- The Lesson Workspace preserves exactly six stages: `brief`, `materials`, `practice`, `check`, `challenge`, and `submission`. The Materials stage normally contains 10–20 slides per Topic; the count remains flexible.
- Topic Quiz records understanding, answers/results, and completion history for Parent Hub reporting. It does not gate, delay, or unlock the next Topic.
- The next Topic becomes available in alignment with the student's next scheduled class meeting.
- Completing all Topics makes the module's Final Boss available. Final Boss contains exactly 20 multiple-choice questions; passing it grants the module certificate. The passing threshold and attempt/retake policies remain undecided.
- Achievements are flexible and positive. Configurable criteria may reward Quiz/Challenge/Final Boss activity, attendance (including at least 8 meetings in a calendar month), creativity, persistence, and consistency. Awards are student-scoped, idempotent, retained once earned, and never used to shame or publicly rank students.

The existing source inventory previously inspected contains 7 Modules, 100 Topics, 33 Quizzes, and 30 Quiz questions; all 7 existing Modules were recorded as Beginner. The aggregate average is not a substitute for verifying each Module's Topic count. The current repository still contains only one Lesson fixture, not a complete local curriculum catalogue. Do not fabricate the missing module/topic mapping or IDs.

Stage 3 must preserve the existing stable `lessonKey` and progress relationship (`studentId + lessonKey`). Production Supabase remains out of scope; no database reads/writes, migrations, RLS changes, or Stage 4 work are authorized by this update. The remaining curriculum implementation must use verified local/exported source data or wait for the separately approved backend stage.


## Implementation checkpoint — 2026-11-22

- Commit `89633b4` (`fix(learning): preserve unknown checkpoint counts`) changed canonical checkpoint totals to `number | null` and preserved unknown legacy values as `null` instead of coercing them to zero.
- Added regression coverage for fully unknown, partially known, and fully known checkpoint counts.
- GitHub Actions run [44974291786](https://github.com/soKrizpy/b2b-v3/actions/runs/44974291786) completed successfully: TypeScript check, production build, and Chromium browser QA all passed; browser QA reported 54 tests passed, 0 failed.
- Build emitted a bundle-size warning (main JavaScript bundle approximately 539 KB, above the 500 KB warning threshold). This is a non-blocking optimization item, not a test failure.
- The Admin Curriculum Studio requirement wording was corrected so the Topic Quiz is explicitly formative and does not gate progression. The matching acceptance criteria and product decision update already prohibit Quiz-based gating.
- No curriculum IDs, module/topic mappings, lesson fixtures, auth behavior, database schema, Supabase data, or `main` branch were changed.

The next safe implementation task remains an evidence-based curriculum source inventory and schema decision. The repository currently has one lesson fixture and no authoritative Module–Topic–Lesson ID mapping; do not construct a CurriculumRepository until that source is available or the canonical contract is deliberately revised.

## Auth audit decision — 2026-11-22

The auth boundary was inspected in the current `preview` tree:

- `vite-app/src/data/domain-contracts.ts` defines canonical `AuthRepository.signIn({ email, password })` and `AuthSession`.
- `vite-app/src/data/repositories.ts` separately defines `DemoAuthRepository.signIn(accountId)` and the legacy `DemoSession` shape. This is the correct boundary for the current React demo portal.
- `vite-app/src/App.tsx` selects a role and active demo account, validates the selected account against the role/status list, then calls the demo repository with the account ID. The UI explicitly tells users that no password or production authentication is used.
- `vite-app/src/data/local-demo-repositories.ts` adapts the React demo port to `WorkspaceRepositories.auth`; it does not claim to implement the canonical credential contract.
- `js/services/auth-service.js` labels itself a local demo session manager, exposes `signInDemo(userId)`, checks account status through `IdentityStore`, and explicitly does not store or verify passwords.

**Decision:** the intended authentication provider is the existing real Supabase Auth project `bits2bytes` (`enfqoofluceqrlcjemfu`), using the already-created teacher/student identities. A read-only profile aggregate query on 2026-11-22 confirmed 1 admin, 2 teacher, and 12 student profiles. Preserve the existing Auth user UUIDs and `auth.users → public.profiles → public.students` relationships; do not recreate accounts or alter UUIDs. The demo account-ID port is only a temporary prototype path and must be replaced in the active portal by real Supabase email/password sign-in, session restoration, sign-out, and profile/role resolution. Never infer a production role from user-editable `user_metadata`; use the trusted profile row / server-side authorization and existing RLS.

**Runtime verification:** existing portal browser tests exercise account-ID demo login for Admin, Tutor, and Student. These tests validate demo navigation only; they do not establish production credential authentication or security. The actual Supabase project and profile role counts were verified read-only. No auth behavior, Supabase configuration/data, database schema, or `main` branch was changed by this audit.


## Supabase target correction — 2026-11-22

The user reconfirmed that B2B v3 must use the existing/original Supabase project and the dummy teacher/student accounts already created there. This supersedes earlier audit wording that treated production Supabase as out of scope for even read-only inspection.

- Confirmed project: `bits2bytes`, ref `enfqoofluceqrlcjemfu`, region `ap-northeast-1`, status `ACTIVE_HEALTHY`.
- A separate project named `bits2bytes-v3` is inactive; it is not the selected target. Do not switch to it.
- Read-only schema inspection confirmed `profiles` (15 rows), `students` (12), `modules` (7), `topics` (100), `quizzes` (33), and `quiz_questions` (30). The inspected public tables have RLS enabled.
- Read-only role aggregate: 1 admin, 2 teacher, 12 student profiles.
- Existing identity relationship is `auth.users → public.profiles → public.students`; preserve the existing identities and UUIDs.
- No users were created/deleted, no data rows were changed, no DDL/migrations/RLS policies were changed, and no secrets or credentials were read.

**Updated implementation direction:** replace the temporary demo login in the active Vite portal with Supabase Auth against this existing project; resolve the signed-in user's role/profile from trusted database records; then compose canonical repositories against the existing schema. Keep `service_role` out of browser code. Continue read-only schema/RLS inspection before any writes. Any production data mutation, schema migration, or policy change still requires its own explicit scope and safety review.

## Supabase Auth implementation update — 2026-11-22

The active Vite portal has now been switched from the role/account demo selector to credential-based Supabase Auth.

- Added the pinned browser dependency `@supabase/supabase-js@2.119.0`.
- Added a browser client configured only with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; no service-role or secret key is included in frontend code.
- Added an AuthRepository adapter using `signInWithPassword`, session restoration, `onAuthStateChange`, and `signOut`.
- Profile resolution reads only the signed-in user's `profiles` row. Database role `teacher` maps to application role `tutor`; admin/student retain their names. Student grade is read from that same user's `students` row.
- The inspected production policies permit a signed-in user to select only their own `profiles` and `students` rows. This supports self-profile hydration without widening RLS.
- The inspected production schema has no account-status column in `profiles`; the adapter marks a successfully authenticated account with a matching profile as active. Supabase Auth remains responsible for credential and banned-user enforcement.
- Student, Tutor, and Admin workspace entry checks now revalidate the Supabase session. Existing workspace controllers and local-demo domain repositories remain in place during the separate data-migration workstream.

### Remaining validation and limits

- Configure the Vercel Preview and Production environment variables for the Vite project using the existing project URL and its browser-safe publishable key. The Vercel integration currently exposes no `b2b-v3` project in the connected team, so this session has not changed Vercel environment variables or claimed a successful deployment.
- Sign in with the already-provisioned teacher and student accounts in the deployed preview to verify credentials, profile hydration, role routing, session persistence, and sign-out. Do not create or reset accounts for this test.
- Verify admin login in the same way.
- Domain data inside the existing workspaces is still served by local-demo repositories/controllers. Supabase Auth integration does not make those data workflows production-ready; canonical remote repositories, RLS coverage, and workspace-specific authorization remain outstanding.
- No production Supabase rows, schema, Auth users, grants, or RLS policies were changed as part of this implementation.

## Production curriculum source inspection — 2026-11-22

Read-only inspection confirms that the selected production database already contains the canonical curriculum data. Do not replace it with a new local fixture or create duplicate quiz rows.

### Existing catalog

The seven active beginner modules currently contain 100 topics in total:

| Module ID | Module | Topics |
|---:|---|---:|
| 10 | BASIC VISUAL WEB | 30 |
| 11 | Begin to Scratch | 10 |
| 20 | Scratch Visual Block Coding & Games | 12 |
| 27 | 3D Design Beginner | 12 |
| 28 | ScratchJr — Petualangan Pemrograman Visual | 12 |
| 29 | Scratch Beginner — 12 Topik | 12 |
| 30 | Tinkercad 3D Beginner — 12 Topik | 12 |

The module records expose `level`, `is_active`, and `gamification_type`. Topic records expose `order_index`, `status`, `published_at`, `engine_topic_id`, and JSONB `lesson_content`.

### Scratch Beginner — Module 29

The exact target module already exists in production:

- Module ID: `29`; title: `Scratch Beginner — 12 Topik`; level: `beginner`; active.
- Topic IDs: `146–157`; all 12 topics are published and ordered 0–11.
- Every topic has `lesson_content` JSONB with 11 `learningPath` steps, one `challenge`, five embedded `quiz` questions, and one active challenge ID.
- The module description embeds `FINAL_ASSESSMENT` JSON containing exactly 20 questions.
- No topic in this module currently has an `engine_topic_id`.
- The separate `quizzes` table has no quiz rows for Module 29. The formative questions are already embedded in `topics.lesson_content`; do not insert duplicate quiz records just to satisfy a table-level count.

### Content validation performed read-only

- 12/12 topics have the expected lesson/challenge/quiz array counts.
- 60/60 embedded formative questions have a non-empty question and explanation, four options, and an answer index in the range 0–3.
- 20/20 final-assessment questions have the same required question structure.
- No invalid formative or final-assessment question objects were found by these structural checks.

This verifies structural completeness only; it does not replace pedagogical review of wording, difficulty progression, answer correctness, or age/grade alignment.

### Other catalog quiz-table gaps

The other modules do not share one uniform quiz storage pattern. For example, some have quiz rows with no linked question rows, while others have no quiz rows at all. The runtime curriculum adapter must inspect the JSONB lesson content and the separate quiz tables without assuming that a missing row in `quizzes` means the topic has no quiz. A module-specific mapping audit is required before consolidating assessment data.

No production curriculum rows, module descriptions, topics, quizzes, or question records were modified during this inspection.



## Active production runtime reconciliation — 2026-11-23

This checkpoint supersedes older runtime statements above wherever they describe the active Vite portal as demo-authenticated or as using only local-demo curriculum data. The older local-demo adapter findings remain valid for those adapters themselves, but they do not describe the current active runtime.

### Verified active runtime paths on `preview` at `7970bb84402935788925982ffa168873795cd03e`

| Area | Active implementation | Verified limitation |
|---|---|---|
| Authentication | `App.tsx` uses `supabaseAuthRepository`; staff uses Supabase email/password; student uses the `student-mpin-login` Edge Function with WhatsApp + six-digit MPIN; session restore/subscription/sign-out are implemented. | This is a production auth adapter, but it is not yet composed into a complete `DomainRepositories` factory. |
| Identity/Admin | `AdminExperience.tsx` injects `supabaseAdminIdentityRepository`; account list is fetched from `admin-list-users`. | Read-only. Account CRUD and tutor-student assignment writes are deliberately unavailable; assignments return an empty list because no production assignment table is mapped. |
| Curriculum | `StudentExperience.tsx` reads active modules/topics through `supabaseCurriculumRepository`; published topic JSONB is adapted by `supabase-lesson-adapter.ts` into the six-stage lesson renderer. | This is a direct production repository path, not a canonical `DomainRepositories` composition. Curriculum visibility depends on `student_modules` for student actors. |
| Student learning progress | `createSupabaseLegacyLearningBridge()` verifies the current Auth user against the student ID, reads/writes `student_lesson_progress`, and uses the versioned `save_student_lesson_progress` RPC. | This is a focused compatibility bridge, not the full canonical `LearningRepository`. Submission read/write/review remains disabled pending a secure production review path. |
| Topic quiz | `supabase-quiz-repository.ts` submits attempts through `student-submit-topic-quiz`. | Separate formative quiz data and legacy assessment records still require module-by-module mapping; do not assume every module stores quiz data identically. |
| Tutor schedule | `TutorExperience.tsx` reads `meetings` filtered by the authenticated tutor ID and reads linked `meeting_students`. | Direct Supabase queries remain outside a canonical `ClassSessionRepository`; no claim is made that all session lifecycle operations are implemented. |
| Reports/evaluations/billing | No complete active production repository/controller path was verified in the current React runtime files. | Canonical local-demo adapters are not production implementations. Keep these domains open. |

### Composition decision

- `local-demo-domain-repositories.ts` is a legacy compatibility composition over JavaScript stores. Its own comments explicitly say it is not the canonical runtime repository boundary or a production authorization boundary.
- `local-demo-repositories.ts` is the demo account-ID gateway and must remain isolated from production authentication.
- Do not satisfy the full `DomainRepositories` interface with placeholder methods, no-op writes, or local-demo fallbacks in production.
- The next implementation should define an explicitly partial, capability-scoped production composition for the repositories that genuinely exist, or complete the missing production repositories first. A full `DomainRepositories` factory is only valid when all eight required domains have honest implementations and tested consumers.
- The canonical `CurriculumRepository` is now backed by a real Supabase repository in the active student runtime; the older claim that no production curriculum source exists is superseded. The remaining gap is canonical composition and validation of schema/content variants, not absence of production curriculum data.

### Latest verification checkpoint

- Branch: `preview`; commit: `7970bb84402935788925982ffa168873795cd03e`.
- GitHub Actions Preview Build completed successfully.
- Vite App CI / Browser QA completed successfully on the latest commit. The job reported 40 passed and 21 skipped, 0 failed. Skipped legacy/demo tests are not evidence of production end-to-end coverage.
- Vercel reported a successful check for the commit, but this checkpoint does not claim that a live production browser sign-in was performed.
- No Supabase schema, RLS policies, production rows, Auth users, or `main` branch were changed.

### Revised immediate work order

1. Add focused tests for the active Supabase repositories and adapters: auth/profile mapping, curriculum access scoping and JSONB validation, lesson adaptation, progress version conflicts, and quiz function request/response validation.
2. Define a capability-scoped production composition root for currently implemented auth, identity-read, curriculum, student-progress, and quiz capabilities without pretending reports/evaluations/billing are ready.
3. Migrate consumers only behind tested adapters; retain current legacy UI/controller boundaries where functionality is not yet covered.
4. Specify secure production contracts for project submission/review, session lifecycle, reports, evaluations, and billing before implementation.
5. Recalculate Stage 3 completion only from explicit acceptance criteria and verified test evidence; do not infer completion from CI success alone.


## Student progress validation and access audit — 2026-11-23

### Progress write contract

- Added `lesson-progress-validation.ts` to validate the UI payload before the Supabase RPC: supported state values, boolean-only checkpoint maps, nullable object drafts with text-only fields, and a safe integer slide index in the database-supported range 0–200.
- `supabase-legacy-learning-bridge.ts` now rejects malformed progress instead of silently replacing an invalid slide index with zero.
- Browser test coverage includes valid payloads and invalid checkpoint values, negative/fractional/out-of-range slide indexes, malformed drafts, and unsupported states.
- The production RPC independently validates the authenticated student role, published topic, active parent module, active `student_modules` assignment, state, slide index, JSONB types/sizes, and optimistic version. It derives `student_id` from `auth.uid()`; callers cannot choose another student's identity.
- `student_lesson_progress` has a self-only SELECT policy. Authenticated users have no direct INSERT/UPDATE/DELETE table privileges; writes go through the guarded versioned RPC. The RPC's `SECURITY DEFINER` status is intentional for this write path and is compensated by explicit actor, role, topic, assignment, and payload checks. The Supabase advisor warning about authenticated execution should not be “fixed” by revoking the app's required RPC permission without designing a replacement.

### Assignment and curriculum access interpretation

- Read-only audit of `student_modules` found 15 active assignment rows across 12 students and 4 modules, plus 3 paused rows across 2 students. No rows referenced missing modules or inactive modules.
- RLS on `student_modules` permits students to read their own assignments and admins to read/manage assignments. Student UI uses those rows to filter its module selector.
- The broad authenticated SELECT policy on active modules and published topics is explicitly documented in migration `20261122120000_allow_authenticated_curriculum_read.sql` as shared curriculum content. Treat this as an intentional product decision, not an accidental RLS regression. Student progress writes remain separately restricted to active assignments by the RPC.
- If curriculum content later becomes confidential by enrollment, replace the shared-read policy with an assignment-aware policy and test teacher/admin access before deploying. No such policy change was made in this checkpoint.

### Advisor review

- Security advisor reports leaked-password protection disabled; this is an Auth configuration follow-up, not changed automatically.
- The no-policy finding for `private.student_login_attempts` is expected for a private server-only table; do not add broad client policies merely to silence the advisor.
- The advisor warns that authenticated users can execute the `SECURITY DEFINER` progress RPC. This is required by the current student app and guarded internally as described above.
- Performance advisor reports 18 unindexed foreign keys, two duplicate-index pairs, and an RLS initplan warning on `engine_progress`. These are separate database-performance tasks; no indexes or policies were changed during this read-only audit.

### Latest verification

- Branch: `preview`; latest code commit at this checkpoint: `00061e926bc8f79fd6d35c22b3c48821e22a72ee`.
- Preview Build / TypeScript and Vite production build completed successfully for that commit.
- Vite App CI completed dependency installation, typecheck/build, Playwright setup, and Chromium installation; Browser QA was still running at the time of this checkpoint. Do not mark the latest browser test green until the workflow reports completion.
- No production Supabase schema, rows, Auth users, grants, or RLS policies were modified. `main` remains untouched.


## Root-level continuation checkpoint — 2026-11-23

Current branch: `preview`. Current implementation checkpoint: `f99323cc617060e37c6950f565a9e389288a4435`. No new branch was created; `main` was not changed.

### Verified code changes since the prior audit

- Progress RPC response validation now rejects version `0`; the production table constraint requires `version > 0`. A regression test covers this impossible row state.
- Curriculum assignment parsing no longer coerces string IDs into numbers. Only positive safe-integer numeric IDs with exact `active` status are accepted.
- `supabaseCurriculumRepository` is now created through an injectable factory. Browser QA exercises the repository query contract: student identity filter, active assignment filter, active module filter, published topic filter, and rejection of a topic from an unassigned module.
- Added `supabaseTutorScheduleRepository`. It verifies the requested tutor ID against `auth.getUser()`, filters meetings by the authenticated `teacher_id`, reads linked meeting IDs, deduplicates student links, and returns a typed schedule snapshot. The Tutor UI no longer contains direct Supabase queries.
- Added `supabaseProductionCapabilities` as a deliberately partial composition root for Auth, read-only Admin identity, student learning, and tutor schedule. It does not pretend to implement the full `DomainRepositories` contract.
- Auth browser tests now deliberately include a conflicting user-editable `user_metadata.role` value and verify session restoration after reload and sign-out. The trusted role still comes from `profiles.role`.

### Read-only production schema facts relevant to the remaining work

- The active project remains `enfqoofluceqrlcjemfu` and was reported `ACTIVE_HEALTHY`; no production rows, schema, grants, policies, Auth users, or Edge Functions were changed in this checkpoint.
- The database has 532 meeting rows; 531 have a teacher ID, but only 14 have both module and topic references. There are 542 student-meeting links across 9 students. Therefore the confirmed product rule that topic availability follows the student's next scheduled class cannot be applied safely to all legacy meetings yet. A rule for legacy rows and a controlled data-mapping/backfill plan are needed before enforcing that gate.
- There is no dedicated monthly-evaluation table and no dedicated session-report table. `meetings.progress_report` is a text field, not the full canonical `SessionReport` DTO.
- The existing `invoices` table is a legacy summary (month, meeting counts, rate, total, bank account, status); it does not represent canonical invoice line items, draft/issue/paid lifecycle, or immutable per-session snapshots.
- No persistent tutor-student assignment table was found. Existing `meeting_students` links prove access only in the context of meetings.
- `challenge_submissions` exists, but authenticated users have a student-only SELECT policy; INSERT/UPDATE are service-role-only. Submission and tutor review require a verified server-side authorization path. Do not write directly from the browser or widen RLS casually.
- The active React Student workspace still does not mount the legacy Parent Hub. The legacy Parent Hub explicitly uses local-demo repositories.

### Seven remaining workstreams — root causes and exit gates

| Workstream | Current verified state | Root cause / exit gate |
|---|---|---|
| 3.2 Auth & Identity | Supabase staff password login and student WhatsApp/MPIN login exist; profile role mapping is trusted; Admin list is read-only. | Complete real-account browser verification on Preview; decide and implement secure account CRUD/status/assignment flows only with approved server-side operations. |
| 3.3 Repository composition | Partial typed production capability root exists. | Full `DomainRepositories` remains incomplete because several domains have no production data model or adapter. Do not add no-op or demo fallbacks to satisfy the interface. |
| 3.4 Student runtime | Assigned curriculum, six-stage lesson adapter, versioned progress RPC, and formative quiz Edge Function exist. | Project submission/review is not wired; topic schedule gating lacks sufficient meeting-topic coverage; final-assessment/certificate runtime still needs its own end-to-end verification. |
| 3.5 Tutor runtime | Typed, actor-checked read-only schedule capability is wired. | Attendance mutations, report authoring, submission review, and full session lifecycle are not implemented against verified production contracts. |
| 3.6 Admin & Parent Hub | Admin account list reads production Supabase; Parent Hub remains legacy local-demo code. | Admin account CRUD and tutor assignment persistence are unavailable; monthly evaluation storage is absent; Parent Hub has no production-scoped integration. |
| 3.7 Legacy cleanup & contract tests | Production capability boundaries and additional adapter tests have been added. | Legacy controllers and demo stores remain in active or legacy page paths. Remove/migrate only after replacement consumers and regression coverage are proven. |
| 3.8 Regression & closing audit | Earlier Preview Build and CI checkpoints passed; latest run for `f99323c` was queued at this checkpoint. | Wait for current TypeScript/build/browser QA results, review skipped tests, and perform real Preview account smoke tests. A mocked browser test is not a live Supabase sign-in. |

### Verification status at this checkpoint

- Preview Build for `0ebe8cfd` and `5e45473b` completed successfully.
- Preview Build for `f6276ed8` completed successfully; its Vite App CI was still running at the time of the last poll.
- CI and Preview Build for current HEAD `f99323c` were queued; do not mark them green until completed.
- No production deployment, real-account browser login, production row mutation, schema migration, RLS change, or `main` branch update is claimed.

Stage 3 remains open. The next work should continue with secure student submission/review design and the production-backed tutor/admin capabilities, while keeping schema and production mutations behind a separate explicit approval.


## Production fallback isolation checkpoint — 2026-11-23

Current branch HEAD at the time of this note: `f19c7729dca98e4637c923e99d56e0106a43a84f` (`preview`).

Additional root-level fixes:

- Added `createScopedWorkspaceRepositories()`. Unlike the legacy demo composition, it accepts only explicitly supplied repositories and throws when a required capability is missing; it never fills production gaps from local-demo stores.
- Active React Student runtime now uses the scoped production composition with only its verified learning bridge. The active Admin runtime uses only the Supabase-backed, read-only identity capability. Both are explicitly marked production mode.
- The legacy lesson controller now supports a fail-closed production repository mode. Its local-demo default composition remains available only to legacy/demo callers.
- The Parent Hub entry remains visible as a transparent unavailable state in production; its local-demo repositories cannot be opened from the production student flow.
- The production student lesson flow now disables project submission until a secure server-side submit/review path exists. It no longer presents a submit action that is guaranteed to fail or route data to a demo store.
- The Admin workspace now explicitly labels its production account list as read-only; account creation, status changes, and tutor assignments are not represented as working production actions.
- Tutor schedule reads are isolated behind the actor-checked repository described above.

### Latest CI / deployment observations

- The Vite App CI production build step for `f19c7729` completed successfully; browser QA was still running at the last poll.
- The Preview Build for `f19c7729` completed its production build successfully.
- Vercel account discovery did not find a Git-linked `b2b-v3` project for this repository/commit in the selected team; the team project listing only returned `b2b-v2`. Therefore no new Preview deployment URL is claimed from this checkpoint. Do not create or relink a Vercel project as part of this audit without an explicit request.

The seven workstreams remain open where their production contracts or data models are absent. The new isolation behavior is intentional: unsupported operations must remain unavailable rather than silently falling back to demo data.


## Production schema integration and data reconciliation — 2026-11-23 (latest checkpoint)

The explicit approval to apply production schema changes was received. The active Supabase project is `enfqoofluceqrlcjemfu`; migrations below are applied there and mirrored in `supabase/migrations/` on branch `preview`. No destructive table/row changes were made.

### Applied database work

- The Stage 3 domain schema is now present: `tutor_student_assignments`, `session_reports`, `monthly_evaluations`, `student_tariffs`, `invoice_items`, and `invoice_payments`, plus invoice lifecycle, challenge submission, tutor attendance, meeting lifecycle, RLS, grants, and supporting indexes/RPCs.
- Seven active tutor-student assignments were backfilled only from pairs with future, non-cancelled meetings. Preflight found seven such pairs, each with one valid teacher and one valid student profile. Historical-only pairs were intentionally not promoted. Tutor RPC verification returns exactly seven assigned students.
- Historical invoice line items were backfilled only for invoices where the current completed/attended meeting count exactly matches the stored `attended_meetings`. Result: 43 line items across 14 of 20 invoices. Six mismatching invoices were left untouched; invoice totals/statuses and payment history were not rewritten, and no payment rows were fabricated.
- Student project submission is mediated by a private actor-derived RPC. Tutor review reads only pending submissions for active assigned students. Challenge catalogue check: 100 challenge rows for 100 topics; 99 topics are published and 99 published topics carry a JSONB challenge key.
- Attendance audit columns `attendance_recorded_by` and `attendance_recorded_at` are no longer writable by authenticated clients. A transaction-level test as an authenticated tutor confirmed the trigger still stamps actor and timestamp while the client updates only attendance status.
- Recurring schedule creation now rejects null/empty/invalid configuration and serializes checks by tutor and student using transaction advisory locks. Replacement scheduling uses the same stable resource-locking strategy.

### Production runtime and adapter alignment

- Student runtime now uses Supabase-backed lesson progress, quiz, project submission, Parent Hub reports/evaluations, and issued invoice history. No local-demo fallback is used by the production composition.
- Parent Hub now calls the canonical `listStudentSubmittedReports` and `listStudentPublished` repository methods. A browser test caught and fixed the prior method-name mismatch.
- Legacy invoice display preserves the stored totals for historical invoices whose session-level evidence cannot be reconciled. It explicitly states when line-item details could not be verified rather than inventing sessions.
- Tutor dashboard maps database completion values `selesai` and `terlewat` to the correct visible status labels.
- Admin production workspace is wired to Supabase-backed identity, billing, and class-session capabilities; account operations are delegated to the admin-authorized Edge Function, and assignments are admin-only under RLS.

### Remaining production data realities

- `session_reports`, `monthly_evaluations`, and `challenge_submissions` are structurally ready but currently contain no student/tutor-authored rows. Parent Hub and tutor history will show honest empty states until real work is submitted.
- `invoice_payments` has no historical rows. Existing invoice paid/unpaid status was preserved; the payment ledger starts recording new payments through the audited RPC.
- Six legacy invoices were not given synthetic line items because their stored attendance counts did not match verifiable completed sessions.
- Five students with no future active tutor-linked meeting were not auto-assigned; the two historical-only tutor/student pairs remain unpromoted. Admin can create the correct current assignment when confirmed.
- Auth leaked-password protection remains disabled in project Auth settings (configuration follow-up). The `private.student_login_attempts` no-policy advisor is intentional for a server-only private table. Unused-index notices are informational and were not "fixed" by dropping potentially useful indexes.

### Latest verification boundary

- Database schema and migration history were verified on the active project.
- RLS/privilege checks and tutor assignment RPC were exercised using transaction-scoped authenticated-role simulations; the attendance trigger was verified after column-grant tightening.
- GitHub TypeScript/production build and browser QA are being rerun after the Parent Hub and tutor status fixes. Do not mark Stage 3 complete until the latest `preview` CI and browser QA finish green.
- Production Vercel deployment was not independently verified in this checkpoint; do not claim a deployment URL or production browser sign-in.

This checkpoint supersedes earlier notes in this document that described Parent Hub/submissions as disabled or the Admin workspace as read-only. The active production paths are now wired to the newly applied schema; their real data will remain empty until actual tutor/admin actions create records.


## Final hardening pass — 2026-11-23

Additional root-level controls applied after the production schema checkpoint:

- Invoice writes are now RPC-only for authenticated clients. Direct INSERT/UPDATE/DELETE on `invoices`, `invoice_items`, and `invoice_payments` are revoked; the four admin-checked invoice RPCs run as SECURITY DEFINER with a fixed empty search path. Admin authorization remains checked inside each RPC.
- Session report and monthly evaluation versions, update timestamps, submitted/published timestamps are now database-owned. Triggers increment versions atomically and stamp lifecycle times. Authenticated clients receive only the content/status column grants needed by the repositories; the app no longer sends audit/version fields.
- Challenge review audit fields are trigger-owned. Tutors/admins can update only status and review note; the trigger derives `reviewed_by` from `auth.uid()` and stamps `reviewed_at`.
- Production billing rate adapter now returns the `StudentTariff` object shape expected by the existing Admin workspace, avoiding a runtime `.amountPerSession` mismatch.
- Tutor completion status mapping is extracted and tested against database values `selesai`, `terlewat`, `cancelled`, and `soft_deleted`.

### Transactional verification

Using transaction-scoped authenticated role and JWT subject simulation, followed by rollback:

- Student challenge submission → assigned tutor pending list → tutor approval; review actor/time were trigger-stamped.
- Tutor report draft → submitted; version advanced 1 → 2 and submitted time was trigger-stamped.
- Monthly evaluation draft → published; version advanced 1 → 2 and published time was trigger-stamped.
- Student visibility of submitted report and published evaluation was confirmed through RLS.
- Admin tariff → invoice draft → draft update → issue → payment; invoice status transitioned draft → sent → paid and exactly one payment row carried the authenticated admin actor. The entire QA transaction was rolled back.
- After revoking attendance audit-column update privileges, an authenticated tutor could still record attendance while the trigger stamped actor/time. Direct update privileges for those audit columns are false.
- Authenticated direct write privileges for invoice tables and challenge submission insert/update are false; the corresponding audited RPC paths remain available.

### Latest CI boundary

- Commit `3278650f3093492dba57e6d70a1425e6813c47d2` completed TypeScript and Vite production build successfully.
- Playwright browser QA and the preview build workflow were still running at the time of this note. The previous failed runs were traced to test-only issues (localized Rupiah assertion, Playwright importing a Vite module directly, and unused locals); fixes are on `preview`.
- No claim of complete Stage 3 or production deployment is made until the latest browser QA completes green and Vercel deployment is independently verified.


## Migration reproducibility and final security boundary — 2026-11-23

- Supabase's applied migration versions for the Nov 22–23 auth/domain work are now mirrored exactly by the filenames in `supabase/migrations/`. The earlier mismatch between filenames and remote migration history was corrected on `preview`; the Stage 3 migration chain is ordered by its actual applied versions, so the final write-guard migration runs after the domain workflow migrations.
- Recovered the two applied Nov 22 migration files that were absent from the repository: Postgres default-privilege hardening and failed-MPIN-attempt-only lockout logic.
- The four invoice mutation SECURITY DEFINER implementations were moved into the non-exposed `private` schema. Public PostgREST functions are now SECURITY INVOKER wrappers; internal authorization checks remain in the private functions. The Supabase security advisor no longer reports these four invoice functions as exposed SECURITY DEFINER warnings.
- Final authenticated privilege audit: direct invoice INSERT/UPDATE/DELETE, attendance audit-field updates, report/evaluation version updates, and challenge review-audit updates are all denied. The corresponding approved RPC/trigger paths remain functional.
- Security advisor now reports only the intentional server-only `private.student_login_attempts` no-policy informational finding and Auth leaked-password protection being disabled. The latter is an Auth dashboard setting, not a SQL migration, and remains a follow-up.
- Current tariff table has no rows. The admin billing UI supports setting per-student tariffs, but no current tariff was inferred from old invoice snapshots. Admin must set each active student's current rate before creating new invoices.
- Legacy baseline migration files from the older 2025/early-2026 history are still not all present in this repository. The Nov 22–23 Stage 3 chain is aligned; a fully clean-slate database rebuild still requires recovery of those older baseline migrations or an approved schema snapshot.

### Latest CI state

- Commit `e961d909aea7bb31716ff91b4096b6348bda5b51` passed TypeScript, Vite production build, and Playwright browser QA (66 passed, 21 skipped).
- The latest migration-alignment commit `d99d0c6c6320c03e9a73d4b1ed8195da8ca835a0` has passed TypeScript and production build; browser QA was still running at this note.


## Final QA result — 2026-11-23

- Latest app-source checkpoint `d99d0c6c6320c03e9a73d4b1ed8195da8ca835a0`: TypeScript and Vite production build passed; Playwright browser QA passed with **67 passed, 21 skipped, 0 failed**.
- The invoice SECURITY DEFINER bodies now live in the non-exposed `private` schema. Public RPC names used by the app remain available as SECURITY INVOKER wrappers. A transactional admin invoice lifecycle test passed after this move and rolled back all QA rows.
- All Nov 22–23 migration versions now have exact filename matches in the repository and the active Supabase migration history; no missing or extra versions remain for that period.
- Current branch HEAD after documentation update: `4a2221f31e178320325a7f30defc25bbd95e51ee` (`preview`). No new branch was created and `main` was not changed.


## Admin curriculum assignment closure — 2026-11-23

- Added a dedicated Admin capability/repository for `student_modules`. Every list/upsert/status change verifies the authenticated profile role is `admin`; database RLS remains the enforcement boundary.
- Admin now has an **Akses Kurikulum** tab to activate, pause, and reactivate a student's module access. This closes the previous gap where a newly created student account could authenticate but had no Admin UI to grant curriculum access.
- Student module assignments remain historical rows: pausing access does not delete the assignment. Reactivation uses the unique `(student_id,module_id)` key.
- Transactional SQL verification confirmed Admin can assign a module and the student can read only their own assignment through RLS; QA changes were rolled back.
- Browser coverage now includes the Admin assignment flow plus repository authorization tests.


## Admin module assignment QA result — 2026-11-23

- Latest application commit `9c006953c723902cfc9c6b07530dcc5130680de4` passed TypeScript, Vite production build, and browser QA: **70 passed, 21 skipped, 0 failed**.
- Browser QA now exercises Admin sign-in, module assignment activation, and the resulting student-module assignment card. Repository tests verify non-admin rejection.
- The GitHub Preview Build for the same commit completed successfully.


## Admin Identity mutation consistency audit — 2026-11-23

A follow-up source audit of `vite-app/src/data/supabase-admin-identity-repository.ts` and `supabase/functions/admin-manage-user/index.ts` confirms that the active Admin UI is wired to real Supabase account operations; this supersedes older read-only Admin notes.

### Verified behavior

- `admin-list-users` and `admin-manage-user` independently validate the bearer token and require the caller's `profiles.role = 'admin'`.
- Student creation requires a valid email identity, WhatsApp number, and six-digit MPIN. The student login flow verifies WhatsApp + MPIN, then exchanges a server-generated magic-link token for a Supabase Auth session; the email remains the underlying Auth identity.
- Role changes are deliberately rejected rather than silently rewriting profile relationships.
- Deactivation protects the current admin from self-deactivation and prevents deactivation of the last active admin.
- Tutor/student assignment writes use the authenticated client and database RLS; duplicate active assignment errors are surfaced.

### Remaining consistency risk — not yet fixed

The `update` action in `admin-manage-user` performs multiple independent writes across Supabase Auth, `profiles`, `students`, and the MPIN RPC. These operations are not one transaction. For example, Auth/email and `profiles` can be updated before a later student-row read/update or MPIN update fails. In that case the function can return an error while earlier changes remain committed. The inverse risk also exists if a later compensation attempt fails during account creation cleanup.

This is a source-level consistency risk, not a claim that a production account is currently inconsistent. No account was modified during this audit.

### Required closure

1. Read and validate all current student profile state and all requested fields before the first write.
2. Move the related `profiles` + `students` + MPIN changes into one admin-authorized database transaction/RPC with explicit row-count checks.
3. Treat the Auth email update as a separate external step: define a safe ordering and compensating action, and return a distinct partial-failure code if compensation cannot be confirmed.
4. Add tests for failures at every boundary (Auth update, profile transaction, student row missing, MPIN RPC, compensation), asserting that no false success is returned and that the final state is either fully applied or explicitly reported as requiring repair.
5. Keep secrets and MPIN values out of logs and responses.

Do not attempt a superficial client-side retry: it cannot make the cross-service operation atomic. This finding remains open for Stage 3 and does not authorize production data changes.

### Verification boundary

- Branch: `preview`; no new branch and no `main` changes.
- The latest application CI checkpoint `9c006953c723902cfc9c6b07530dcc5130680de4` passed TypeScript, production build, and Playwright browser QA (**70 passed, 21 skipped, 0 failed**). The Preview Build for that checkpoint also passed.
- The current branch tip has a subsequent documentation-only commit `8c94c0c9e0d5d8675ced2fec94c64966b9335d31`; the application workflows were not rerun for that documentation-only commit.


## Admin Identity update compensation hardening — 2026-11-23

The `admin-manage-user` Edge Function update path was hardened on `preview`:

- It now preflights the Auth identity and, for students, the existing student row before the first write.
- Input validation for WhatsApp and MPIN occurs before Auth mutation.
- The Auth change is applied first; profile and student updates follow; the existing transactional WhatsApp/MPIN RPC is deliberately last.
- If a later database step fails, the function attempts to restore the changed student/profile rows and the original Auth email, user metadata, and ban state.
- The response distinguishes a confirmed rollback (`IDENTITY_UPDATE_ROLLED_BACK`) from a failed compensation requiring manual reconciliation (`IDENTITY_UPDATE_REPAIR_REQUIRED`). A successful write followed by a failed result read is reported as saved/refresh-required, not falsely described as rolled back.
- MPIN plaintext and hashes are not logged or returned. The prior stored phone fallback (`email_or_phone`) is retained when only the MPIN is changed and `whatsapp` is null.

This is compensating consistency, not a distributed transaction: Supabase Auth and Postgres cannot be committed atomically through the current Edge Function. If compensation itself fails, the endpoint explicitly signals a repair-required state. No production account was modified and no database migration was applied.

### Verification

- Code commit with the main hardening: `67d8d8436ff96c4630b7bc0c1f75993a54c2985f`.
- Follow-up compatibility fix for legacy phone fallback: `5a0cc8bc098929eadc48453ac0d060ecae685ec6`.
- Vite App CI was triggered for the first code commit and is still being monitored. The final branch tip is the follow-up commit; do not claim its CI passed until a run for that exact SHA is confirmed.
- Branch remains `preview`; `main` and production Supabase data/schema were not changed.
