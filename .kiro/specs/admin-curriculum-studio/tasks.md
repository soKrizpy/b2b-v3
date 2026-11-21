# Implementation Plan: Admin Curriculum Studio

## Overview

The Admin Curriculum Studio is implemented as a new section within the existing Admin Workspace, adding a `curriculum` tab that delegates to a dedicated `CurriculumStudio` controller. It does not replace user management. The studio manages the full curriculum hierarchy — Curriculum → Module (one Island; 12–16 Topics) → Topic/Node → Lesson (10–20 slides across the six existing stages) + formative Quiz → scheduled Topic progression → Final Boss → Certificate, with flexible positive achievements — plus the Draft/Review/Published/Archived lifecycle and a versioning system that keeps student progress bound to the version a learner started on.

Implementation is organized into ten incremental phases. Phase 1 builds the Curriculum Store and RBAC foundation; Phase 2 integrates navigation into the Admin Workspace; Phases 3–6 layer in CRUD views, lesson/slide authoring, topic quiz authoring, and Final Boss/certificate authoring; Phase 7 adds lifecycle and versioning; Phase 8 adds preview mode; Phase 9 adds mock data seeding; Phase 10 verifies the result. Each phase builds on the previous one and references the existing files involved.

The approach preserves all existing work: the Student, Tutor, and Parent dashboards, the seven GAS Island illustrations, the design tokens, the app shell, the existing user-management admin views, and the Content_Renderer are consumed unchanged so authored content renders identically to the student experience. No phase introduces a backend or deployment. Repository changes stay on the existing `preview` branch; do not create branches or modify `main`. Open decisions (passing scores, attempt limits, retake rules, module repetition, certificate validity, tutor authoring rights, multiple-module assignment) remain unresolved and are left configurable/blank until user approval.

## Tasks

Implementation order follows PROJECT_RULES Section 16 (inspect → identify affected files → identify regressions → preserve checkpoint → scoped change → verify → report) and Section 19 (incremental, working flows first). Each phase builds on the previous one and references the existing files involved. No phase introduces a backend or deployment. Repository changes stay on the existing `preview` branch; do not create branches or modify `main`.

### Phase 1 — Curriculum Store and RBAC Foundation

- [ ] 1.1 Add `canManageCurriculum(user)` to `js/services/access-control.js` returning true only when `user.role === 'admin'` (Requirement 1.3).
- [ ] 1.2 Create `js/services/curriculum-store.js` mirroring the `state-store.js` pattern: dedicated localStorage key, `_readStoreRaw`/`_writeStoreRaw`, `isAvailable`, `subscribe` (custom event + storage event), and `seedIfEmpty` (Requirement 13.1–13.3).
- [ ] 1.3 Define entity schemas in `curriculum-store.js`: Curriculum, Module, Topic, Lesson, Slide, Quiz/Question, Final_Boss, CertificateTemplate, IssuedCertificate, Curriculum_Version (Design §4.2).
- [ ] 1.4 Implement CRUD + list/get for Curriculum and Module, with `createdAt`/`updatedAt` tracking (Requirements 3.1–3.3, 4.1).
- [ ] 1.5 Implement JSON serialize/deserialize round-trip helpers and a malformed-JSON guard that never discards existing data (Requirement 12.1–12.3).
- [ ] 1.6 Define extensible `AchievementDefinition` and `AchievementAward` records in the curriculum/learning domain without hardcoding badge tiers or thresholds.
- [ ] 1.7 Implement an idempotent achievement evaluator that can award badges from positive learning and attendance events.

### Phase 2 — Curriculum Studio Navigation Integration

- [ ] 2.1 Add a `curriculum` tab to `js/admin/admin-workspace.js` tab navigation (`data-admin-tab="curriculum"`) alongside users/tutor-relations/parent-relations, preserving the existing tabs (Requirement 2.1).
- [ ] 2.2 In `renderActiveTabContent()`, when `curriculum` is active, render a mount point and delegate to a `CurriculumStudio` instance; keep user-management rendering unchanged (Requirement 2.2, 2.5).
- [ ] 2.3 Gate the curriculum tab with `AccessControl.canManageCurriculum(currentUser)`; show the existing access-denied notice for non-admins (Requirement 1.2).
- [ ] 2.4 Verify the studio renders inside the existing `#admin-container` with no change to `index.html` and no new stylesheet; layout uses existing tokens / inline-token pattern (Requirements 2.3–2.4, 14.1).

### Phase 3 — Curriculum, Module, Topic CRUD Views

- [ ] 3.1 Create `js/admin/curriculum-studio.js` exporting a `CurriculumStudio` controller class with `init()` and `render()` mirroring `AdminWorkspace` composition (Design §2.1).
- [ ] 3.2 Build the master–detail layout: collapsible Content Tree (left) + Detail Panel (right) using existing tokens (Design §3).
- [ ] 3.3 Implement Curriculum list + create/edit metadata using the existing Modal component; reject empty titles (Requirements 3.1–3.4).
- [ ] 3.4 Implement Module editor with the 7-island picker rendering the existing `illustrations.js` SVG thumbnails as read-only previews; store only the island key; reject unknown keys (Requirements 4.1–4.4, Design §4.3).
- [ ] 3.5 Model Beginner/Intermediate/Advanced as independent Modules with no enforced prerequisite among them (Requirement 4.3).
- [ ] 3.6 Implement Topic editor with order index and reorder controls; each Topic links one Lesson and one Quiz (Requirements 5.1–5.2).
- [ ] 3.7 Implement Topic release according to the student's next scheduled class meeting; Quiz result, score, or completion must never gate Topic availability (Requirement 5.3).
- [ ] 3.8 Validate the 12–16 Topic target per Module without inventing, deleting, or renumbering existing Topic IDs; report any existing Module outside the target range for review.

### Phase 4 — Lesson and Slide Authoring

- [ ] 4.1 Implement the Lesson editor showing a 10–20 slide list inside the `materials` stage, preserving all six stages (`brief`, `materials`, `practice`, `check`, `challenge`, `submission`) with reorder and add/remove (Requirements 6.1, 6.3).
- [ ] 4.2 Implement the Slide editor in the existing Drawer component, offering only the Content_Block types `content-renderer.js` supports (`text`, `callout`, `image`, `diagram`, `scratch-block`, `code-stack`, `copyable-prompt`, `ai-prompt`, `comparison-table`, `video-embed`, `checklist-summary`, `interactive-quiz`) (Requirement 6.2).
- [ ] 4.3 Persist Slide content blocks using the exact shape the Content_Renderer expects, so storage and render share one schema (Requirement 6.4, 12.1).
- [ ] 4.4 Wire the round-trip check: save → reload → verify structural equivalence (Requirement 12.2).

### Phase 5 — Topic Quiz Authoring

- [ ] 5.1 Implement the Quiz editor supporting `mcq`, `true-false`, and `prediction` questions, consistent with `content-renderer.js` `renderQuiz` (Requirement 7.1).
- [ ] 5.2 Allow each option to carry an explanation and an optional hint, matching Content_Renderer behavior (Requirement 7.3).
- [ ] 5.3 Record Quiz completion, answers, score/result, and timestamp for learning history and Parent Hub reporting; Quiz results do not affect Topic release (Requirement 7.2).
- [ ] 5.4 Keep any attempt-limit policy configurable and unset until approved; attempt limits must not be used to block the next scheduled Topic (Requirement 7.4).

### Phase 6 — Final Boss and Certificate

- [ ] 6.1 Implement the Final_Boss editor accepting exactly 20 multiple-choice questions (Requirement 8.1).
- [ ] 6.2 Add the publish guard: block publishing a Module whose Final_Boss has fewer than 20 MCQ, with a validation error (Requirement 8.2).
- [ ] 6.3 Implement Final_Boss availability logic: available when all Topics in the Module are completed; unavailable otherwise (Requirements 8.3–8.4).
- [ ] 6.4 Implement Certificate template editor (Module title, student identity, issue date, Curriculum_Version reference) (Requirements 9.1–9.2).
- [ ] 6.5 Add a validity-policy field referencing Open Decision 5 without hardcoding a value (Requirement 9.3).

### Phase 7 — Lifecycle and Versioning

- [ ] 7.1 Implement lifecycle state assignment (`draft`, `review`, `published`, `archived`) on Curriculum and Module (Requirement 10.1).
- [ ] 7.2 Implement allowed transitions and block `archived → published` without an explicit review step (Requirements 10.2–10.3).
- [ ] 7.3 Implement version snapshotting: editing content in a `published` Module creates a new `Curriculum_Version` instead of mutating the live version (Requirement 11.1).
- [ ] 7.4 Bind student progress records to the Curriculum_Version in use at start; preserve superseded versions (Requirements 11.2–11.3).
- [ ] 7.5 Implement the Module version history list, reverse-chronological, read-only snapshot view (Requirement 11.4).
- [ ] 7.6 Enforce that a `published` Module in use by students is never silently overwritten (Requirement 10.4).
- [ ] 7.7 Add flexible achievement catalogue CRUD/configuration for positive actions and milestones (Quiz, Challenge, Final Boss, attendance, creativity, persistence, consistency).
- [ ] 7.8 Record student badge awards with criterion/reason and timestamp; prevent duplicate awards for the same milestone.
- [ ] 7.9 Surface earned badges and their positive context in the Student experience and Parent Hub.
- [ ] 7.10 Preserve earned badges permanently in achievement history; prohibit deficit/shaming badges and public student rankings.

### Phase 8 — Preview Mode

- [ ] 8.1 Implement a Preview action for Lesson/Quiz/Final_Boss that renders via `renderContentBlocks`/`renderQuiz`/`attachInteractions` from `content-renderer.js` so preview == student view (Requirement 6.4).
- [ ] 8.2 Ensure preview reflects authored slide order and content blocks without a separate runtime (Design §6.3).

### Phase 9 — Mock Data Seeding

- [ ] 9.1 Create `data/mock/curriculum/*.json` seed files for at least one Curriculum with one Module bound to `island-scratch-forest`, its Topics, a Lesson (10–20 slides using existing block types), a Quiz, a 20-question Final_Boss, and a Certificate template (Requirement 13.3).
- [ ] 9.2 Have `seedIfEmpty` load the seed files without overwriting existing stored data (Requirement 13.3, mirrors `state-store.js` seed guard).

### Phase 10 — Testing and Verification

Follow PROJECT_RULES Section 17. Never report an untested feature as tested.

- [ ] 10.1 Admin flow: open curriculum management, create a Curriculum, add a Module bound to an island, add Topics, author a Lesson with reordered Slides, preview it, publish (Requirement coverage + Section 17 admin scenarios).
- [ ] 10.2 Verify light mode and dark mode render correctly (Section 12, 18).
- [ ] 10.3 Verify responsive behavior at tablet width (master–detail collapse) (Requirement 14.4).
- [ ] 10.4 Verify keyboard navigation through the tree and editors and visible focus indicators (Section 13).
- [ ] 10.5 Verify empty, loading, error, and success states exist where relevant (Section 18).
- [ ] 10.6 Verify no new console errors are introduced (Section 18).
- [ ] 10.7 Verify existing user-management admin views, Student dashboard/quest map, Teacher workspace, and Parent hub are unbroken (Requirements 2.5, 14.5).
- [ ] 10.8 Verify round-trip: edit → save → reload → content identical (Requirement 12.2).
- [ ] 10.9 Verify versioning: edit a published Module → new version created → prior version preserved → progress still bound to prior version (Requirements 11.1–11.3).
- [ ] 10.10 Verify Final Boss publish guard blocks under-20-MCQ publish (Requirement 8.2).
- [ ] 10.11 Verify Quiz completion/reporting does not gate the next Topic and the next Topic is released with the next scheduled class meeting.
- [ ] 10.12 Verify positive achievement rules are configurable, idempotent, student-scoped, visible in Parent Hub, and never revoke previously earned badges.

## Notes

- Tasks are organized into ten phases following PROJECT_RULES Section 16 (inspect → identify affected files → identify regressions → preserve checkpoint → scoped change → verify → report) and Section 19 (incremental, working flows first).
- Each task references specific requirements (and Design sections where relevant) for traceability.
- Phases build incrementally; each phase validates core functionality before the next begins.
- The implementation preserves the existing Student, Tutor, and Parent dashboards, the seven GAS Island illustrations, the design tokens, and the app shell; no existing view's behavior is altered.
- Lessons, quizzes, and previews reuse the existing Content_Renderer block vocabulary so authored content renders identically to the student experience.
- The new Curriculum_Store mirrors the established IdentityStore/StateStore localStorage pattern; localStorage is treated as ephemeral scratch storage, not permanent production storage (PROJECT_RULES Section 15).
- Open decisions remain unresolved and must be approved before encoding any value; the implementation leaves the affected fields configurable/blank until decided.

## Open Decisions to Resolve Before/During Implementation

These must be approved before encoding any value (see requirements.md). The implementation leaves them configurable/blank until decided:

- Open Decision 1 — Final Boss passing score (Topic Quizzes are formative and report observed results)
- Open Decision 2 — Maximum attempt limits
- Open Decision 3 — Retake rules
- Open Decision 4 — Module repetition policy
- Open Decision 5 — Certificate validity period
- Open Decision 6 — Whether Tutors may modify official material (design assumes Admin-only)
- Open Decision 7 — Rules for assigning multiple Modules to a student
- Open Decision 8 — Topic Quiz length (only Final Boss is fixed at 20)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "9.1"] },
    { "id": 1, "tasks": ["1.3", "2.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["1.5", "3.1"] },
    { "id": 4, "tasks": ["3.2", "7.1", "2.2"] },
    { "id": 5, "tasks": ["3.3", "7.2", "2.4"] },
    { "id": 6, "tasks": ["3.4", "7.3"] },
    { "id": 7, "tasks": ["3.6", "7.4"] },
    { "id": 8, "tasks": ["3.5", "7.6"] },
    { "id": 9, "tasks": ["3.7", "9.2"] },
    { "id": 10, "tasks": ["5.1"] },
    { "id": 11, "tasks": ["5.2"] },
    { "id": 12, "tasks": ["5.3"] },
    { "id": 13, "tasks": ["5.4"] },
    { "id": 14, "tasks": ["6.1"] },
    { "id": 15, "tasks": ["6.2"] },
    { "id": 16, "tasks": ["6.3"] },
    { "id": 17, "tasks": ["6.4"] },
    { "id": 18, "tasks": ["6.5"] },
    { "id": 19, "tasks": ["7.5"] },
    { "id": 20, "tasks": ["4.1"] },
    { "id": 21, "tasks": ["4.2"] },
    { "id": 22, "tasks": ["4.3"] },
    { "id": 23, "tasks": ["8.1"] },
    { "id": 24, "tasks": ["8.2"] },
    { "id": 25, "tasks": ["4.4"] },
    { "id": 26, "tasks": ["10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.9", "10.10"] },
    { "id": 27, "tasks": ["10.1", "10.8"] },
    { "id": 28, "tasks": ["1.6", "1.7"] },
    { "id": 29, "tasks": ["3.7", "3.8", "5.3", "7.7", "7.8", "7.9", "7.10", "10.11", "10.12"] }
  ]
}
```
