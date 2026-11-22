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

