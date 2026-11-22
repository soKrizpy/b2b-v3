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
- Do not access or write to production Supabase. No SQL/migrations/RLS changes in Stage 3.
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

**Decision:** no auth code change is justified in this audit. The current demo port is explicitly separate and the canonical email/password contract is not implemented by it. Do not add a fake `AuthRepository` adapter, ignore a password argument, or infer credentials from an account ID. A future canonical adapter requires an approved credential provider, verified session semantics, and dedicated tests for invalid credentials, inactive accounts, session restoration, sign-out, and subscription updates.

**Runtime verification:** existing portal browser tests exercise account-ID demo login for Admin, Tutor, and Student. These tests validate demo navigation only; they do not establish production credential authentication or security.

No auth behavior, Supabase configuration/data, database schema, or `main` branch was changed by this audit.
