# Stage 3 — Canonical Repository Contract Gap Audit

Status: in progress. This document supersedes any broad statement elsewhere that the canonical TypeScript `DomainRepositories` runtime adapter is complete. The legacy workspace gateway and compatibility adapters exist, but they are not yet a complete implementation of `domain-contracts.ts`.

Audit baseline: branch `preview`, commit `e02f31b09843ee465d38027c2f9d83b1252a81a0`.
Scope: read-only inspection of repository contracts, local-demo stores/adapters, and mock curriculum/submission data. No database or application data was changed.

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
