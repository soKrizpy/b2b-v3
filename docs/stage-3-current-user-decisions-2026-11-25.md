# Bits2Bytes — Current User Decisions and Stage 3 Continuation

Date: 2026-11-25
Branch: preview
Status: decision record; Stage 3 remains in progress.

## Current curriculum standard

This record supersedes the earlier 12-meeting/12-topic rule recorded in the Stage 3 audit. The user has now explicitly corrected the latest standard to **16 Topics per Module**.

- One Island represents one Module.
- One Module contains 16 published Topics.
- One Topic corresponds to one scheduled meeting and one main project.
- A complete Module series therefore contains 16 meetings.
- Meeting 1 maps automatically to the first Topic by curriculum order; meeting 16 maps to Topic 16.
- Admin selects one Module for the student’s series. Admin does not select Topics individually.
- Each Topic contains 10–20 Nodes.
- Lesson stages: Brief → Materials → Practice → Check → Challenge → Submission.
- Topic Quiz: 5 questions, 4 answer options each; formative, not a gate to the next Topic.
- Challenge is optional. Submitted work becomes portfolio material and can appear in Parent Hub.
- Final Boss: 20 questions; its unlock and certificate flow must be enforced by trusted server/database logic, not client-only visibility.
- Preserve existing Topic IDs and content. Never truncate, duplicate, or invent curriculum mappings.
- Existing meetings with missing Module/Topic references must not be backfilled using guesses.

## Live production catalog verification (read-only, 2026-11-25)

The active Supabase project `enfqoofluceqrlcjemfu` was queried with independent aggregates (no cross-join count inflation). All 8 active Modules currently have exactly 16 published Topics:

| Module ID | Module title | Published Topics |
|---:|---|---:|
| 10 | BASIC VISUAL WEB — HTML & Struktur Halaman | 16 |
| 11 | Begin to Scratch | 16 |
| 20 | Scratch Visual Block Coding & Games | 16 |
| 27 | 3D Design Beginner | 16 |
| 28 | ScratchJr — Petualangan Pemrograman Visual | 16 |
| 29 | Scratch Beginner — 16 Topik | 16 |
| 30 | Tinkercad 3D Beginner — 16 Topik | 16 |
| 31 | BASIC VISUAL WEB — CSS & JavaScript | 16 |

Meetings currently carrying a Module reference: Module 10 = 1, Module 27 = 12, Module 29 = 1. All 14 of those rows also carry a Topic reference. This is not a complete schedule history: meetings without a Module reference are not represented in that grouped result. Do not infer mappings for them.

## Stage 3 implementation gaps confirmed in source

1. `RecurringSessionSeriesInput` currently has no `moduleId`.
2. The production class-session repository RPC call does not send a Module ID.
3. The current recurring-series SQL function accepts no Module ID and inserts meetings without `module_id` or `topic_id`.
4. The Admin recurring-series form needs one Module selector, restricted to the selected student’s active Module assignments; Topic selection remains automatic.
5. Server-side creation must validate the student’s active Module assignment and exactly 16 published Topics, then atomically map each generated meeting’s `session_number` to the corresponding Topic by curriculum order.
6. The old RPC signature must not remain an alternate way to create unmapped series after the new contract is introduced.
7. Student Topic availability, whole-Topic completion, and Final Boss unlock still require server-authoritative validation. Client UI visibility alone is not authorization.
8. Do not backfill historical meetings without a verified source of truth.

## Safety and workflow gates

- Work only on `preview`; do not create branches or modify `main`.
- Preserve all existing local/uncommitted work.
- Production Supabase remains read-only. No production schema changes, migrations, RLS changes, row writes, user changes, or Edge Function deployments without separate explicit approval.
- A migration file must be created through `supabase migration new <name>` using the Supabase CLI; do not invent a timestamped migration filename or apply a migration to production.
- Do not begin Stage 4 until Stage 3 passes its audit and the user explicitly approves the next gate.
- Do not claim implementation or test success until source changes and tests have actually been run and verified.

## Current repository checkpoint

At the time of this record, `preview` is at `c9db982e002333bcba2d4eb6b6bbf917e695dcb2`. This record itself does not change application source or production data.


## Additional live ordering audit (read-only, 2026-11-25)

All 8 active Modules have 16 published Topic rows and 16 distinct, non-null `order_index` values. The catalog mixes indexing conventions:
- Modules 10, 11, 27, and 31 use order_index 1–16.
- Modules 20, 28, 29, and 30 use order_index 0–15.

Therefore, implementation must not assume `order_index = session_number`. It must rank published Topics within each Module by `order_index` (with a stable Topic ID tie-breaker) and map meeting session numbers 1–16 to ranked positions 1–16. The server must reject duplicate/missing ordering positions or a published Topic count other than 16 before creating any meeting.
