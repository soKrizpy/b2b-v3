# Design Document — Admin Curriculum Studio

## Overview

The Admin Curriculum Studio is a content-authoring surface added to the existing Admin Workspace. It does not replace user management; it adds a new tab that the Admin Workspace delegates to a dedicated `CurriculumStudio` controller. The studio manages the full curriculum hierarchy — Curriculum → Module → Topic → Lesson (+Slides) → Quiz → Final Boss → Certificate — plus the Draft/Review/Published/Archived lifecycle and the versioning system that keeps student progress bound to the version a learner started on.

The design follows three hard constraints from the project rules and the user request:

1. **Preserve existing work.** The Student, Tutor, and Parent dashboards, the seven GAS Island illustrations, the design tokens, the app shell, and the existing user-management admin views are untouched.
2. **Reuse, do not rebuild.** Lessons are authored with the existing Content_Renderer block vocabulary so that admin preview and student playback use the same renderer. Components (Modal, Drawer, Toast) are reused. No new stylesheet is introduced unless proven necessary; layout uses existing tokens and the inline-token pattern already used in `admin-workspace.js`.
3. **Spec only.** Nothing is implemented in this phase.

## Architecture

### Navigation and Integration

#### Where the Studio plugs in

The existing `AdminWorkspace` (`js/admin/admin-workspace.js`) renders into `#admin-container` and uses a tab pattern: `this.activeTab` is one of `users`, `tutor-relations`, `parent-relations`, switched via `data-admin-tab` buttons in `bindTabEvents()`. A fourth tab is added:

```
Admin Workspace tabs
├── users            (existing — unchanged)
├── tutor-relations  (existing — unchanged)
├── parent-relations (existing — unchanged)
└── curriculum       (NEW — delegates to CurriculumStudio)
```

When the `curriculum` tab is active, `AdminWorkspace.renderActiveTabContent()` returns a mount point and the workspace instantiates (or reuses) a `CurriculumStudio` instance bound to that mount point, the same way `App` delegates to `AdminWorkspace`. This keeps `AdminWorkspace` thin: it owns only the tab chrome and the access guard; `CurriculumStudio` owns the deeply nested content editor.

Access is gated by `AccessControl.canManageCurriculum(user)` (a new method, admin-only), checked by `AdminWorkspace` before rendering the curriculum tab — mirroring the existing `canManageUsers` guard.

No change to `index.html` is required: the studio renders inside the existing `#admin-container`, exactly as the current admin views do.

#### App shell (unchanged)

The studio reuses the existing shell from `index.html`:

- Persistent sidebar (`#app-sidebar`)
- Persistent header (`#app-header`) with theme toggle, user badge, demo switcher
- Main viewport (`#main-content` → `#view-admin` → `#admin-container`)

The page heading updates to reflect the active studio context (e.g. "Admin Workspace • Curriculum Studio").

### View Layout

The studio uses a **master–detail** layout so the administrator keeps context while editing deep content, consistent with PROJECT_RULES Section 5 (preserve user context, minimize page transitions).

```
┌─────────────────────────────────────────────────────────────┐
│ Studio header bar                                           │
│ [Curriculum selector]  [lifecycle badge]  [Publish ▾]      │
├───────────────┬─────────────────────────────────────────────┤
│ Content Tree  │ Detail / Editor Panel                        │
│ (master)      │ (detail)                                     │
│               │                                              │
│ ▾ Curriculum A│  Selected entity editor                      │
│   ▾ Module    │  (Curriculum / Module / Topic /              │
│     ▾ Topic   │   Lesson / Slide / Quiz / FinalBoss /        │
│       Lesson  │   Certificate / Version history)             │
│       Quiz    │                                              │
│     ◇ Final   │                                              │
│     ★ Cert    │                                              │
│   ▾ Module B  │                                              │
│               │                                              │
│ [+ Curriculum]│                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Footer actions (Save draft / Preview / Cancel)              │
└─────────────────────────────────────────────────────────────┘
```

- **Content Tree (left)**: a collapsible tree mirroring the hierarchy. Each node shows title, lifecycle badge, and a small status icon. Leaf actions (add, edit, delete) appear inline on hover/focus. This mirrors the stage-nav and quest-node patterns already used in `lesson-workspace.js`.
- **Detail Panel (right)**: renders the editor for the selected node. Editing a slide's content blocks opens in the existing **Drawer** component so the slide list stays visible (context preservation, Section 5.13).
- **Studio header bar**: curriculum selector, current lifecycle badge, and the lifecycle action menu (Send to Review / Publish / Archive / New Version).

#### Studio sub-views

| Sub-view | Purpose | Component reuse |
|---|---|---|
| Curriculum list & metadata | Create/edit Curriculum, set description | Modal for create; inline form for edit |
| Module editor | Title, description, island binding, lifecycle | Modal; island picker (7 existing keys) |
| Topic editor | Title, order, links lesson+quiz | Inline form; reorder controls |
| Lesson editor | Slide list (10–20), slide reorder | Inline list; Drawer for slide content blocks |
| Slide editor | Content block palette + per-block fields | Drawer; reuses Content_Block vocabulary |
| Quiz editor | Question list (mcq/true-false/prediction) | Inline list; Drawer per question |
| Final Boss editor | Exactly 20 MCQ; publish guard | Inline list with count validation |
| Certificate template | Fields shown on issuance | Inline form |
| Preview | Render lesson/quiz/FinalBoss as student sees | Content_Renderer (real render) |
| Version history | List of Curriculum_Versions, reverse-chronological | Inline list; read-only snapshot view |

### Interaction Flows

#### Author a new module end-to-end

1. Admin opens Admin Workspace → selects **Curriculum** tab.
2. Selects/creates a Curriculum (Modal for create).
3. Adds a Module: enters title/description, picks an island key from the 7 thumbnails.
4. Adds Topics in order; each Topic auto-creates one empty Lesson and one empty Quiz.
5. Opens Lesson → adds 10–20 Slides → edits each Slide's content blocks in the Drawer using the existing block palette.
6. Opens Quiz → adds questions (mcq/true-false/prediction) with options + explanations.
7. Authors the Final Boss (exactly 20 MCQ).
8. Configures the Certificate template.
9. Sends the Module to Review → Publishes. Publishing creates Curriculum_Version 1.

#### Edit published content (versioning)

1. Admin opens a **published** Module and edits a Slide.
2. The studio detects `lifecycleState === published` and, on save, creates a **new Curriculum_Version** draft instead of mutating the live version.
3. The draft goes through Review → Publish, producing a new version number; the prior version is preserved and marked superseded.
4. Students already on the prior version keep their bound version; their progress remains valid.

#### Preview

1. Admin selects a Lesson/Quiz/Final Boss and chooses **Preview**.
2. The detail panel renders the entity through `Content_Renderer` exactly as the Student Lesson Workspace would, so visual parity is guaranteed without a separate preview runtime.

#### Lifecycle state machine

```
        ┌──────────┐  send to   ┌──────────┐  publish  ┌───────────┐
        │  Draft   │ ─────────▶ │  Review  │ ────────▶ │ Published │
        └──────────┘            └──────────┘           └───────────┘
            ▲                        │                      │ edit
            │ reject                 │                      ▼
            └────────────────────────┘              ┌─────────────────┐
                                                 │ New Version Draft │
                                                 └─────────────────┘
        Published ──archive──▶ Archived
        Archived  ──restore──▶ Review (explicit review step required; no direct Archived→Published)
```

### Lifecycle and Versioning Rules

- Each Curriculum and each Module carries its own `lifecycleState` and `version`.
- A direct `archived → published` transition is blocked; restore routes through `review` (Requirement 10.3).
- Editing content in a `published` Module produces a new Curriculum_Version snapshot (Requirement 11.1).
- Student progress is bound to the Curriculum_Version in use at start; superseded versions are preserved (Requirement 11.2–11.3).
- The Final Boss publish guard blocks publishing a Module whose Final Boss has fewer than 20 MCQ (Requirement 8.2).

### Progress and Certificate Rules

- Topic availability follows the student's scheduled class progression: the next Topic becomes available with the next scheduled class meeting. Quiz completion, score, or failure never gates Topic availability.
- The Final Boss becomes available only when all Topics in a Module are completed (Requirement 8.3–8.4).
- Passing the Final Boss issues a Certificate bound to the student and the active Curriculum_Version (Requirement 9.1).
- The specific **passing scores, attempt limits, retake rules, module repetition, and certificate validity** are Open Decisions 1–5 and are intentionally not encoded in this design.


### Positive Achievement System

Achievement definitions are extensible catalogue records, not hardcoded UI cases. Each definition may describe an event or milestone criterion, tier, display name, description, and presentation asset. Examples include completing a Quiz or Challenge, attempting/completing a Final Boss, attending at least eight class meetings in a calendar month, showing creativity, persistence, or consistent participation.

Achievement awards are student-scoped, idempotent, and include the earned time and reason. The student and Parent Hub can view earned badges. Previously earned badges remain in history. The system must not issue humiliating/deficit badges, punish missed targets, or rely on public student rankings.

### File Impact

#### Existing files modified (minimal, scoped)

| File | Change | Rationale |
|---|---|---|
| `js/services/access-control.js` | Add `canManageCurriculum(user)` (admin-only) | Requirement 1.3 |
| `js/admin/admin-workspace.js` | Add `curriculum` tab + delegate to `CurriculumStudio` when active | Requirement 2.1–2.2 |
| `data/mock/` | Add curriculum mock JSON under `data/mock/curriculum/` | Requirement 13.3 seeding |

#### New files (kept minimal, following existing conventions)

| File | Purpose |
|---|---|
| `js/admin/curriculum-studio.js` | `CurriculumStudio` controller (mirrors `AdminWorkspace` composition pattern) |
| `js/services/curriculum-store.js` | `Curriculum_Store` localStorage store (mirrors `state-store.js`) |
| `data/mock/curriculum/*.json` | Seed curriculum/module/topic/lesson/quiz/finalboss data |

#### Explicitly NOT changed

- `index.html` app shell (studio renders inside existing `#admin-container`)
- `js/lesson-workspace.js` (student dashboard/quest map) and the seven island SVGs in `js/illustrations.js`
- `js/teacher-workspace.js`, `js/student/*`, `js/parent/*`
- `css/*` stylesheets (reused; no new stylesheet unless a proven need arises)
- `js/content-renderer.js` (consumed as-is for preview parity)
- Any production backend, Supabase, Vercel, or Git state (out of scope per rules)

### Design System Compliance

- **Tokens**: all colors, spacing, radii, typography from `design-tokens.css`; no hardcoded values (Requirement 14.1, mirrors `admin-workspace.js` 100%-token rule).
- **Themes**: light and dark verified; studio relies on token-driven styles so both modes render correctly (Requirement 14.2).
- **States**: default/hover/focus/active/disabled/error/success for all controls, consistent with PROJECT_RULES Section 12.
- **Accessibility**: keyboard navigation through the tree and editors; visible focus indicators; semantic HTML; reduced-motion respected (Section 13).
- **Responsive**: master–detail collapses gracefully on tablet width; no mobile-only assumptions beyond the existing responsive behavior (Requirement 14.4).

## Components and Interfaces

| Need | Reused existing component | Notes |
|---|---|---|
| Short focused create/edit (entity metadata) | `js/components/modal.js` | Same pattern as AdminWorkspace user modal |
| Contextual slide/question editing | `js/components/drawer.js` | Keeps tree/list visible (Section 5.13) |
| Save / publish / error feedback | `js/components/toast.js` | Consistent with all existing views |
| Lesson & quiz preview | `js/content-renderer.js` (`renderContentBlocks`, `renderQuiz`, `attachInteractions`) | Guarantees preview == student view |
| RBAC | `js/services/access-control.js` (+ new `canManageCurriculum`) | Admin-only |
| Session/user | `js/services/auth-service.js`, `js/services/identity-store.js` | For author attribution and guards |
| Persistence pattern | new `js/services/curriculum-store.js` | Mirrors `state-store.js` subscribe + seed pattern |
| Styling | `css/design-tokens.css`, `css/components.css`, `css/views.css` | No new stylesheet; inline-token style for layout as in `admin-workspace.js` |

### Key interfaces

- **`AccessControl.canManageCurriculum(user)`** — returns `true` only when `user.role === 'admin'` (Requirement 1.3). Consumed by `AdminWorkspace` to guard the curriculum tab.
- **`CurriculumStudio` controller** — instantiated by `AdminWorkspace` against a mount point; owns the content tree, detail panel, and lifecycle/versioning actions. Mirrors `AdminWorkspace` composition: thin shell + dedicated controller.
- **`Curriculum_Store`** — localStorage-backed store mirroring `StateStore`/`IdentityStore`: `list()`, `get(id)`, `create(entity)`, `update(id, patch)`, `subscribe(listener)`, `seedIfEmpty()`. Entities are serialized as JSON (Requirement 12.1). All mutations notify subscribers (Requirement 13.2).
- **`Content_Renderer`** — consumed read-only for preview parity; exposes `renderContentBlocks(blocks, container)`, `renderQuiz(quiz, container)`, `attachInteractions(container)`. The studio never introduces block types outside this vocabulary.

## Data Models

Entities are normalized and stored by the new `Curriculum_Store` (a localStorage-backed store mirroring `IdentityStore`/`StateStore`). The model composes the **existing** lesson/slide/content-block structure for actual content, adding only the higher-level hierarchy above it.

### Entity relationships

```
Curriculum
  └─ modules[]  ────────────────────────────────────┐
                                                     ▼
Module ──binds──▶ GAS_Island (one of 7 existing keys, reference only)
  ├─ topics[]
  │    Topic
  │      ├─ Lesson ── slides[] ── content[] (Content_Blocks)
  │      └─ Quiz   ── questions[] (mcq | true-false | prediction)
  ├─ finalBoss  ── questions[] (exactly 20 mcq)
  └─ certificateTemplate
```

### Entity schemas

**Curriculum**
```
{ id, title, description, lifecycleState, version,
  moduleIds: [], createdAt, updatedAt }
```

**Module**
```
{ id, curriculumId, title, description, islandKey,
  lifecycleState, version, order,
  topicIds: [], finalBossId, certificateTemplateId,
  createdAt, updatedAt }
```

**Topic**
```
{ id, moduleId, title, order, lessonId, quizId }
```

**Lesson** — matches the existing `lesson-scratch-motion.json` lesson/stage model; the studio focuses on the `materials` slides plus practice/check/challenge/submission stage references.
```
{ id, title, slides: [] }
```

**Slide** — content blocks use the exact vocabulary the Content_Renderer already supports (`text`, `callout`, `image`, `diagram`, `scratch-block`, `code-stack`, `copyable-prompt`, `ai-prompt`, `comparison-table`, `video-embed`, `checklist-summary`, `interactive-quiz`).
```
{ id, title, type, content: [Content_Block, ...] }
```

**Quiz (formative assessment)**
```
{ id, title, questions: [
  { id, type: 'mcq'|'true-false'|'prediction',
    question, options: [{id, text, correct, explanation}], hint? }
] }
```

**Final_Boss**
```
{ id, moduleId, questions: [ ...exactly 20 mcq... ] }
```

**Certificate template & issued certificate**
```
CertificateTemplate { id, moduleId, title, description, templateFields }
IssuedCertificate { id, moduleId, studentId, versionId, issuedAt, validityPolicy }
```

**Curriculum_Version** — immutable snapshot of a Module's content tree at a point in time.
```
{ id, moduleId, versionNumber, snapshot: <deep clone>,
  createdBy, createdAt, supersedesId? }
```

### Island binding (no artwork recreation)

Modules reference an island by its existing key. The seven keys are the `id` attributes already in `illustrations.js`:

| Key | Existing SVG export | Adventure map role |
|---|---|---|
| `island-scratch-forest` | `SVG_GAS_ISLAND_SCRATCH_FOREST` | Scratch Forest |
| `island-logic-maze` | `SVG_GAS_ISLAND_LOGIC_MAZE` | Logic Maze |
| `island-creative-coding` | `SVG_GAS_ISLAND_CREATIVE_CODING` | Creative Coding |
| `island-app-development` | `SVG_GAS_ISLAND_APP_DEVELOPMENT` | App Development |
| `island-python-ice-kingdom` | `SVG_GAS_ISLAND_PYTHON_ICE_KINGDOM` | Python Ice Kingdom |
| `island-web-harbor` | `SVG_GAS_ISLAND_WEB_HARBOR` | Web Harbor |
| `island-roblox-obby` | `SVG_GAS_ISLAND_ROBLOX_OBBY` | Roblox Obby |

The island picker renders the existing SVG previews as read-only thumbnails. The studio stores only the key string; it never modifies or regenerates SVG markup. This preserves the Student Adventure Map's visual structure exactly.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature contains a pure serialization/storage layer and well-defined business-logic invariants (versioning, gating, lifecycle transitions, validation). Property-based testing is therefore appropriate; the properties below target the store and logic layers, not the UI rendering or external infrastructure, which are covered by example/integration/smoke tests in the Testing Strategy.

### Property 1: Admin-only curriculum access

*For any* user, `AccessControl.canManageCurriculum(user)` SHALL return `true` if and only if `user.role === 'admin'`, and the studio access decision (permit vs. deny with access-denied notice) SHALL match that result.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Curriculum creation produces a valid draft record

*For any* valid curriculum metadata, creating a Curriculum SHALL persist a record with a stable ID, the given title and description, and `lifecycleState === 'draft'`; a subsequent retrieve-by-ID SHALL return an equivalent object.

**Validates: Requirements 3.1, 3.3**

### Property 3: Empty or whitespace-only titles are rejected

*For any* title composed entirely of whitespace (including the empty string), saving a Curriculum SHALL be rejected, no record SHALL be persisted, and the store state SHALL be unchanged.

**Validates: Requirements 3.4**

### Property 4: Module island binding is restricted to the seven existing keys

*For any* Module creation, the offered binding set SHALL equal exactly the seven existing GAS_Island keys; any created Module SHALL be bound to exactly one of those keys; and any binding to a key outside that set SHALL be rejected without persisting the Module.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 5: Topic creation links one lesson and one formative quiz; progression follows the class schedule

*For any* Topic created within a Module, the persisted record SHALL link to exactly one Lesson and exactly one Quiz; Topic availability SHALL follow the student's next scheduled class meeting and SHALL be independent of all Quiz results.

**Validates: Requirements 5.1, 5.3**

### Property 6: Reordering is a content-preserving permutation

*For any* ordered list of Topics or Slides, applying a reordering SHALL preserve the multiset of items and each item's contained content (e.g. each Slide's content blocks); only the order changes.

**Validates: Requirements 5.2, 6.3**

### Property 7: Content block vocabulary is a subset of the renderer's

*For any* Content_Block offered or stored by the studio, its type SHALL be a member of the set the Content_Renderer supports, and the studio SHALL NOT introduce a type outside that set.

**Validates: Requirements 6.2**

### Property 8: Quiz question structure is valid

*For any* Quiz question, its type SHALL be one of `mcq`, `true-false`, or `prediction`, and each option SHALL carry an explanation field.

**Validates: Requirements 7.1, 7.3**

### Property 9: Assessment passing follows the configured threshold

*For any* configured passing threshold (Open Decision 1) and any student score, the Final_Boss SHALL be marked passed if and only if the score is greater than or equal to its configured threshold; Topic Quizzes remain formative and do not gate progression. The threshold value itself is not fixed by this design.

**Validates: Requirements 7.2, 8.5**

### Property 10: Attempt-limit rule triggers only when exceeded

*For any* configured maximum attempt limit (Open Decision 2) and any attempt count, the attempt-limit rule SHALL apply if and only if the attempt count exceeds the limit. The limit value itself is not fixed by this design.

**Validates: Requirements 7.4**

### Property 11: Final Boss invariant — exactly twenty multiple-choice questions

*For any* Final_Boss authored for a Module, the question count SHALL equal 20 and every question type SHALL be `mcq`.

**Validates: Requirements 8.1**

### Property 12: Final Boss publish guard blocks under-twenty questions

*For any* Module, publishing SHALL be blocked if and only if its Final_Boss contains fewer than 20 multiple-choice questions, and a validation error SHALL be displayed.

**Validates: Requirements 8.2**

### Property 13: Final Boss availability equals all topics complete

*For any* Module, the Final_Boss SHALL be available to the student if and only if all Topics in the Module are completed; while any Topic remains incomplete, the Final_Boss SHALL remain unavailable.

**Validates: Requirements 8.3, 8.4**

### Property 14: Certificate issuance is bound to student and version with required fields

*For any* student who passes a Module's Final_Boss, the Certificate_Issuer SHALL generate a Certificate bound to that student and the Curriculum_Version in use, referencing the Module title, student identity, issue date, and Curriculum_Version identifier; the certificate SHALL record the configured validity policy (Open Decision 5).

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 15: Lifecycle state validity and transition guard

*For any* Curriculum or Module, its `lifecycleState` SHALL be one of `draft`, `review`, `published`, `archived`; and a direct transition from `archived` to `published` SHALL be rejected (restore SHALL route through `review`).

**Validates: Requirements 10.1, 10.3**

### Property 16: Editing published content creates a new version and preserves the original

*For any* edit to content within a `published` Module, the Curriculum_Store SHALL create a new Curriculum_Version snapshot rather than mutating the published version in place; the published content SHALL remain unchanged, and any superseded version SHALL remain retrievable.

**Validates: Requirements 10.4, 11.1, 11.3**

### Property 17: Student progress is bound to the version at module start

*For any* student beginning a Module, that student's progress record SHALL be bound to the Curriculum_Version identifier in use at start; a later supersession SHALL NOT change the bound version of existing progress.

**Validates: Requirements 11.2**

### Property 18: Version history is reverse-chronological

*For any* Module, the listed Curriculum_Versions SHALL be ordered by creation time in descending (reverse-chronological) order.

**Validates: Requirements 11.4**

### Property 19: Curriculum entity serialization round-trips

*For any* valid curriculum entity, serializing then deserializing then serializing again SHALL produce an equivalent JSON structure to the original serialization (round-trip property).

**Validates: Requirements 12.1, 12.2**

### Property 20: Malformed JSON does not discard existing data

*For any* malformed JSON encountered during deserialization, the Curriculum_Store SHALL return a descriptive error and SHALL leave any existing stored data unchanged.

**Validates: Requirements 12.3**

### Property 21: Store seeding is idempotent and non-destructive

*For any* initial store state, seeding SHALL occur only when the store is empty; when existing data is present, seeding SHALL NOT overwrite it.

**Validates: Requirements 13.3**

## Error Handling

The studio distinguishes three classes of failure and handles each consistently, surfacing feedback through the existing Toast component (and Modal/Drawer for validation in context):

- **Validation errors (user-correctable input).** Rejected at save time with a descriptive, in-context message; the store is left unchanged.
  - Empty or whitespace-only Curriculum title → save rejected (Requirement 3.4).
  - Module binding to an unknown island key → binding rejected (Requirement 4.4).
  - Final_Boss with fewer than 20 MCQ at publish time → publish blocked with a validation error (Requirement 8.2).
  - Slide counts outside the 10–20 guidance → surfaced as guidance, keeping slide count flexible (Requirement 6.1).
- **Lifecycle/transition errors (illegal state moves).** Blocked with a message; the entity remains in its prior state.
  - Direct `archived → published` transition → rejected; restore routes through `review` (Requirement 10.3).
  - Editing a `published` Module in place → prevented; the studio routes to a new version draft instead of mutating live content (Requirement 10.4, 11.1).
- **Storage errors (corruption/IO).** Defensive and non-destructive: existing data is never discarded.
  - Malformed JSON on deserialization → a descriptive error is returned and existing stored data is preserved (Requirement 12.3).
  - localStorage treated as ephemeral scratch storage, not permanent production storage (Requirement 13.4, PROJECT_RULES Section 15); the store degrades gracefully if storage is unavailable.

Access denial is handled by the existing admin access guard: non-admin users attempting to open the Curriculum Studio receive an access-denied notice consistent with the existing pattern (Requirement 1.2). No partial or leaked editor state is rendered for unauthorized users.

## Testing Strategy

### Dual testing approach

The feature uses both property-based tests (for the store and logic layers) and example-based/integration/smoke tests (for UI, wiring, and infrastructure), complementing each other for comprehensive coverage.

**Property-based tests (PBT):** A property-based testing library for the target language SHALL be used (not implemented from scratch). Each property in the Correctness Properties section above is implemented as a single property-based test, configured to run a minimum of 100 iterations per property. Each test references its design property with a tag comment of the form `**Feature: admin-curriculum-studio, Property {number}: {property_text}**`. Generators cover the input space for entities, metadata, roles, scores, attempt counts, version chains, and malformed JSON, including edge cases (empty/whitespace strings, boundary slide counts of 10 and 20, exactly-20 and fewer-than-20 Final Boss questions, archived state). External dependencies (localStorage, the Content_Renderer render output) are mocked so the pure logic of the store, validators, versioning, gating, and lifecycle transition guard is tested in isolation.

**Example-based unit tests** focus on:
- Specific examples demonstrating correct behavior (e.g. an end-to-end module authoring flow, a preview rendering through Content_Renderer).
- Integration points between components (AdminWorkspace delegating to CurriculumStudio; Curriculum_Store ↔ subscribe listeners).
- Edge cases and error conditions not economical to express as properties (e.g. boundary slide counts, a representative malformed-JSON input).
Property-based tests handle broad input coverage, so unit tests avoid redundant exhaustive example sets.

**Integration tests (1–3 examples each)** cover wiring that does not vary meaningfully with input:
- The curriculum tab renders inside `#admin-container` and user-management views remain untouched (Requirement 2.x).
- Preview output matches student-render output for a representative lesson/quiz/Final Boss (Requirement 6.4).
- Subscribe listeners are notified on a store change (Requirement 13.2).
- Lifecycle transitions are exercisable through the studio UI for a representative path (Requirement 10.2).

**Smoke tests (single execution)** cover one-time setup/configuration:
- The Curriculum_Store persists under a dedicated localStorage key following the IdentityStore/StateStore pattern (Requirement 13.1).

**Not tested as properties (and why):**
- UI rendering, layout, theme parity, and responsiveness (Requirement 14.x) — verified via example/snapshot tests; behavior does not vary meaningfully with input.
- Open-decision surfacing in the spec (Requirement 15.x) — a documentation requirement, not a runtime behavior.
- "localStorage is not permanent production storage" (Requirement 13.4) — an architectural attitude, enforced by code review rather than a runtime property.

### Open decisions carried forward

These remain unresolved and must not be assigned values during implementation without user approval (see requirements.md "Open Decisions"). Tests that depend on them (Properties 9, 10, 14) parameterize over the undecided value rather than assuming one.

1. Assessment passing scores (Quiz & Final Boss)
2. Maximum attempt limits
3. Retake rules
4. Module repetition policy
5. Certificate validity period
6. Whether Tutors may modify official material (design assumes Admin-only until decided)
7. Rules for assigning multiple Modules to a student
8. Topic Quiz length (only Final Boss is fixed at 20)
