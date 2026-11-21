# Requirements Document

## Introduction

The Admin Curriculum Studio is the central content-authoring hub for the Bits2Bytes Learning Engine. It enables Administrators to build and govern the official learning program: Curricula, Modules, Topics, Lessons, Slides, formative topic Quizzes, flexible positive achievements, per-module Final Boss assessments, and Certificates — together with the curriculum lifecycle (Draft, Review, Published, Archived) and a versioning system that keeps student progress bound to the version a learner started on.

The Studio integrates into the existing Admin Workspace as an additional section alongside the current user-management views. It reuses the existing Bright Adventure design system, design tokens, components (modal, drawer, toast), and the existing Content_Renderer block vocabulary so that authored lessons render identically to the student experience. The seven existing GAS Island illustrations are preserved verbatim; Modules are linked to islands by reference rather than by recreating artwork.

This phase is SPEC ONLY. No implementation is performed. Open decisions that require explicit user approval (passing scores, attempt limits, retake rules, certificate validity, tutor authoring rights, multiple-module assignment, etc.) are listed and left unresolved. No requirement in this document assigns a value to any open decision.

## Glossary

- **Admin_Curriculum_Studio**: The new admin section that manages curriculum content, accessed from the existing Admin Workspace navigation.
- **Curriculum**: The top-level learning program container that groups one or more Modules (e.g. "Scratch Starter Adventure").
- **Module**: A major learning unit bound to exactly one GAS_Island. Each Module targets 12–16 Topics. Beginner, Intermediate, and Advanced are independent learning levels with no enforced prerequisite ordering; each level can be assigned according to student needs.
- **Topic / Node**: A learning unit within a Module that contains exactly one Lesson and exactly one Quiz. A Topic becomes available according to the student's next scheduled class meeting, not according to a Quiz result.
- **Lesson**: A sequence of 10–20 Slides plus guided-practice and project-challenge stages, structured to match the existing lesson JSON model used by the Student Lesson Workspace.
- **Slide**: A single learning screen composed of one or more Content_Blocks.
- **Content_Block**: A typed renderable unit (text, callout, image, diagram, scratch-block, code-stack, copyable-prompt, ai-prompt, comparison-table, video-embed, checklist-summary, interactive-quiz) reused by the existing Content_Renderer.
- **Quiz**: A formative understanding check associated with a Topic, composed of questions (mcq, true-false, prediction). Results and completion history are recorded for learning analytics and Parent Hub reporting. A Quiz never gates or delays the next Topic.
- **Final_Boss**: A 20-question multiple-choice assessment that becomes available after all Topics in a Module are completed.
- **Certificate**: A completion credential issued for a Module when the student passes the Final_Boss.
- **Curriculum_Version**: An immutable snapshot of curriculum content identified by a version number; student progress is bound to the Curriculum_Version in use when the learner began.
- **Curriculum_Lifecycle_State**: One of Draft, Review, Published, or Archived, as defined in PROJECT_RULES Section 6.
- **GAS_Island**: One of the seven existing illustrated low-poly island SVG assets (Scratch Forest, Logic Maze, Creative Coding, App Development, Python Ice Kingdom, Web Harbor, Roblox Obby) that represent Modules on the Student Adventure Map.
- **Content_Renderer**: The existing module `js/content-renderer.js` that renders Content_Blocks and Quizzes into HTML.
- **Curriculum_Store**: A new client-side, localStorage-backed store for curriculum entities, following the established pattern of IdentityStore and StateStore.
- **Admin**: A user whose role is `admin`, as defined in IdentityStore.
- **Access_Control**: The existing RBAC module `js/services/access-control.js`.
- **Admin_Workspace**: The existing admin controller `js/admin/admin-workspace.js` that currently manages user accounts, tutor relations, and parent links.

## Requirements

### Requirement 1: Admin-Only Access to the Curriculum Studio

**User Story:** As an Administrator, I want the Curriculum Studio to be accessible only to admin accounts, so that official learning content cannot be modified by unauthorized roles.

#### Acceptance Criteria

1. WHEN a user with role `admin` opens the Curriculum Studio view, THE Access_Control SHALL permit access and render the studio.
2. WHEN a user whose role is not `admin` attempts to open the Curriculum Studio view, THE Access_Control SHALL deny access and display an access-denied notice consistent with the existing admin access guard.
3. THE Access_Control SHALL expose a `canManageCurriculum(user)` method that returns true only when the user role is `admin`.

### Requirement 2: Curriculum Studio Navigation Integration

**User Story:** As an Administrator, I want the Curriculum Studio to appear as a section within the existing Admin Workspace, so that I manage accounts and curriculum in one place without a separate application.

#### Acceptance Criteria

1. THE Admin_Workspace SHALL add a Curriculum Studio navigation entry alongside the existing user-management entries.
2. WHEN the Curriculum Studio entry is selected, THE Admin_Workspace SHALL render the Curriculum Studio inside the existing admin container without replacing or removing the user-management functionality.
3. THE Curriculum_Studio SHALL reuse the existing app shell, sidebar, header, theme toggle, and design tokens.
4. THE Curriculum_Studio SHALL integrate within the existing application shell and dashboard, using only existing stylesheets.
5. WHERE the existing Admin_Workspace user-management views are active, THE Curriculum_Studio SHALL remain inactive and SHALL leave the user-management views untouched.

### Requirement 3: Curriculum Entity Management

**User Story:** As an Administrator, I want to create and edit Curricula that group Modules, so that I can organize the official learning program.

#### Acceptance Criteria

1. WHEN the Admin creates a new Curriculum, THE Curriculum_Store SHALL persist a Curriculum record with a stable ID, title, description, and an initial Curriculum_Lifecycle_State of `draft`.
2. WHEN the Admin edits an existing Curriculum's metadata, THE Curriculum_Store SHALL update the record and SHALL record an `updatedAt` timestamp.
3. THE Curriculum_Store SHALL support listing all Curricula and retrieving a single Curriculum by ID.
4. WHEN the Admin attempts to save a Curriculum with an empty title, THE Curriculum_Studio SHALL reject the save and SHALL display a validation error.

### Requirement 4: Module Management and Island Binding

**User Story:** As an Administrator, I want to create Modules and bind each to one of the existing islands, so that modules appear on the Student Adventure Map without recreating artwork.

#### Acceptance Criteria

1. WHEN the Admin creates a Module, THE Curriculum_Store SHALL persist a Module record with a stable ID, title, description, and a binding to exactly one GAS_Island key.
2. THE Curriculum_Studio SHALL offer the seven existing GAS_Island keys as binding options and SHALL NOT allow defining new islands or altering the existing island SVG artwork.
3. WHERE the Beginner, Intermediate, and Advanced Modules exist, THE Curriculum_Studio SHALL model them as independent Modules and SHALL NOT enforce a completion prerequisite among them.
4. WHEN the Admin attempts to bind a Module to an unknown island key, THE Curriculum_Studio SHALL reject the binding and SHALL display a validation error.

### Requirement 5: Topic Management

**User Story:** As an Administrator, I want to create Topics within a Module, so that each topic carries one lesson and one gate quiz.

#### Acceptance Criteria

1. WHEN the Admin creates a Topic within a Module, THE Curriculum_Store SHALL persist a Topic record with a stable ID, title, an order index, and links to exactly one Lesson and exactly one Quiz.
2. THE Curriculum_Studio SHALL allow the Admin to reorder Topics within a Module.
3. THE learning progression SHALL make the next Topic available in alignment with the student's next scheduled class meeting. Quiz completion, score, or failure SHALL NOT block, delay, or unlock a Topic.

### Requirement 6: Lesson and Slide Authoring

**User Story:** As an Administrator, I want to author lessons composed of slides using the existing content blocks, so that authored content renders identically to the student experience.

#### Acceptance Criteria

1. WHEN the Admin creates a Lesson, THE Curriculum_Studio SHALL allow the Admin to add between 10 and 20 Slides, while keeping the slide count flexible.
2. THE Curriculum_Studio SHALL offer the Content_Block types supported by the Content_Renderer and SHALL NOT introduce content block types that the Content_Renderer cannot render.
3. WHEN the Admin reorders Slides, THE Curriculum_Studio SHALL persist the new order and SHALL preserve each Slide's content blocks.
4. WHEN the Admin previews a Lesson, THE Curriculum_Studio SHALL render the Lesson using the Content_Renderer so that the preview matches the student view.

### Requirement 7: Topic Quiz Authoring

**User Story:** As an Administrator, I want to author a formative Quiz for each Topic, so that the student's understanding can be observed, recorded, and shared with parents without turning assessment into a barrier to learning.

#### Acceptance Criteria

1. WHEN the Admin authors a Quiz, THE Curriculum_Studio SHALL support question types `mcq`, `true-false`, and `prediction`, consistent with the Content_Renderer quiz vocabulary.
2. WHEN a student completes a Quiz, THE assessment service SHALL record the completion, answers, score/result, and completion time for learning-history and Parent Hub reporting. Quiz results SHALL NOT control Topic availability.
3. THE Curriculum_Studio SHALL allow each Quiz option to carry an explanation shown after answering, consistent with the existing Content_Renderer behavior.
4. WHERE an attempt policy is configured (Open Decision 2), THE assessment service SHALL apply it to Quiz attempts without changing the rule that Topic availability follows the class schedule.

### Requirement 8: Final Boss Authoring

**User Story:** As an Administrator, I want to author a 20-question Final Boss per module that unlocks after all topics are complete, so that module mastery can be assessed.

#### Acceptance Criteria

1. WHEN the Admin authors a Final_Boss for a Module, THE Curriculum_Studio SHALL accept exactly 20 multiple-choice questions.
2. WHEN the Admin attempts to publish a Module while its Final_Boss contains fewer than 20 multiple-choice questions, THE Curriculum_Studio SHALL block the publish and SHALL display a validation error.
3. WHEN all Topics in a Module are completed, THE Final_Boss SHALL become available to the student.
4. WHILE any Topic in a Module remains incomplete, THE Final_Boss SHALL remain unavailable to the student.
5. WHERE a passing threshold is configured (Open Decision 1), THE Final_Boss_Evaluator SHALL mark the Final_Boss as passed when the student score meets or exceeds the configured threshold.

### Requirement 9: Certificate Issuance

**User Story:** As an Administrator, I want a certificate to be produced when a student passes the Final Boss, so that module completion is formally recognized.

#### Acceptance Criteria

1. WHEN a student passes the Final_Boss for a Module, THE Certificate_Issuer SHALL generate a Certificate for that Module bound to the student and the Curriculum_Version in use.
2. THE Certificate SHALL reference the Module title, the student identity, the issue date, and the Curriculum_Version identifier.
3. WHERE a certificate validity period is configured (Open Decision 5), THE Certificate SHALL record the configured validity policy; the validity value itself remains an open decision.

### Requirement 10: Curriculum Lifecycle

**User Story:** As an Administrator, I want a draft-review-publish-archive lifecycle, so that content changes are governed and published content is not silently overwritten while students use it.

#### Acceptance Criteria

1. THE Curriculum_Store SHALL assign each Curriculum and each Module one Curriculum_Lifecycle_State from the set `draft`, `review`, `published`, `archived`.
2. THE Curriculum_Studio SHALL allow transitions among lifecycle states.
3. THE Curriculum_Studio SHALL prevent a direct transition from `archived` back to `published` without an explicit review step.
4. WHILE a Module is `published` and in use by students, THE Curriculum_Store SHALL preserve the published content; changes SHALL produce a new Curriculum_Version.

### Requirement 11: Versioning and Progress Binding

**User Story:** As an Administrator, I want changes to published material to create a new version, so that students keep learning the version they started with.

#### Acceptance Criteria

1. WHEN the Admin edits content within a `published` Module, THE Curriculum_Store SHALL create a new Curriculum_Version snapshot rather than mutating the published version in place.
2. THE Curriculum_Store SHALL bind each student's progress record to the Curriculum_Version identifier in use when the learner began the Module.
3. WHEN a Curriculum_Version is superseded by a newer version, THE Curriculum_Store SHALL preserve the superseded version so that bound student progress remains valid.
4. WHEN the Admin views a Module's history, THE Curriculum_Studio SHALL list all Curriculum_Versions of that Module in reverse-chronological order.

### Requirement 12: Curriculum Content Serialization and Round-Trip

**User Story:** As an Administrator, I want curriculum content to round-trip safely through storage, so that no authored content is lost or corrupted on save and reload.

#### Acceptance Criteria

1. WHEN curriculum entities are persisted to the Curriculum_Store, THE Curriculum_Store SHALL serialize them as JSON and SHALL deserialize them back into structurally equivalent objects.
2. FOR ALL valid curriculum entities, serializing then deserializing then serializing again SHALL produce an equivalent JSON structure (round-trip property).
3. WHEN deserialization encounters malformed JSON, THE Curriculum_Store SHALL return a descriptive error and SHALL NOT discard existing stored data.

### Requirement 13: Curriculum Store Persistence and Reactivity

**User Story:** As an Administrator, I want curriculum data stored locally and kept in sync across views, so that changes are immediately reflected.

#### Acceptance Criteria

1. THE Curriculum_Store SHALL persist curriculum entities in the browser's localStorage using a dedicated key, following the pattern of IdentityStore and StateStore.
2. THE Curriculum_Store SHALL expose a subscribe mechanism that notifies registered listeners on any change, consistent with the existing store subscription pattern.
3. WHEN the Curriculum_Store is empty on first load, THE Curriculum_Store SHALL seed initial mock curriculum data from local JSON without overwriting existing stored data.
4. THE Curriculum_Store SHALL NOT treat localStorage as permanent production storage, consistent with PROJECT_RULES Section 15.

### Requirement 14: Design System and Component Integration

**User Story:** As an Administrator, I want the Curriculum Studio to look and behave like the rest of the application, so that the experience is consistent.

#### Acceptance Criteria

1. THE Curriculum_Studio SHALL use the existing design tokens exclusively and SHALL NOT introduce hardcoded colors.
2. THE Curriculum_Studio SHALL render correctly in both light and dark mode.
3. THE Curriculum_Studio SHALL use the existing Modal component for short focused tasks, the existing Drawer component for contextual editing, and the existing Toast component for feedback, consistent with PROJECT_RULES Section 5.
4. WHERE the viewport is tablet-sized, THE Curriculum_Studio SHALL remain usable and responsive.
5. THE Curriculum_Studio SHALL preserve existing Student, Tutor, and Parent dashboards and SHALL NOT alter their behavior.

### Requirement 15: Open Decisions Surfacing

**User Story:** As a stakeholder, I want unresolved policy decisions surfaced in the spec, so that they can be approved before implementation.

#### Acceptance Criteria

1. THE Requirements_Document SHALL list the open decisions without assigning values: quiz passing score, Final_Boss passing score, maximum attempt limits, retake rules, module repetition policy, certificate validity period, whether Tutors may modify official material, and rules for assigning multiple Modules to students.
2. WHERE any requirement depends on an open decision, THE Requirements_Document SHALL reference the open decision by identifier rather than assuming a value.


### Requirement 16: Flexible, Positive Achievement System

**User Story:** As a student, I want my positive effort and progress to be recognized in different ways, so that I feel encouraged to keep learning rather than judged against other students.

#### Acceptance Criteria

1. THE Achievement_System SHALL support an extensible catalogue of badge definitions and configurable criteria; new positive achievements SHALL be addable without changing the core application code.
2. THE Achievement_System SHALL support event-based and milestone-based criteria, including (but not limited to) completing a Quiz, completing a Challenge, attempting or completing a Final_Boss, attending at least 8 class meetings in a calendar month, demonstrating creativity, persistence, and consistent participation.
3. WHEN a student earns a badge, THE Achievement_System SHALL record the student, badge, reason/criterion, and earned timestamp, and SHALL make the achievement visible in the student experience and Parent Hub.
4. THE Achievement_System SHALL prevent duplicate grants for the same student and achievement milestone.
5. EARNED badges SHALL remain in the student's achievement history; later inactivity SHALL NOT revoke a previously earned badge.
6. THE Achievement_System SHALL NOT use humiliating or deficit labels, punish students for missed milestones, or require public student rankings/comparisons.
7. Badge tiers and thresholds MAY be configured flexibly; no universal badge count or tier threshold is hardcoded by this requirement.

## Open Decisions

The following decisions are intentionally unresolved and require explicit user approval before implementation. No requirement in this document assigns a value to any of them.

- **Open Decision 1 — Final Boss Passing Score**: The passing score threshold for the Final_Boss is undecided. Topic Quiz results are formative and must be reported as observed results; they do not require a pass threshold to unlock learning.
- **Open Decision 2 — Maximum Attempt Limits**: The maximum number of attempts a student may take on a Quiz or Final_Boss is undecided. Requirement 7 references this decision.
- **Open Decision 3 — Retake Rules**: The rules governing retakes (cool-down period, question reshuffling, feedback visibility) are undecided.
- **Open Decision 4 — Module Repetition Policy**: Whether a student may repeat a completed Module, and what happens to an existing Certificate on repetition, is undecided.
- **Open Decision 5 — Certificate Validity Period**: Whether a Certificate has an expiry and for how long is undecided. Requirement 9 references this decision.
- **Open Decision 6 — Tutor Authoring Permissions**: Whether Tutors may create or modify official curriculum material is undecided. This spec assumes Admin-only authoring until decided otherwise.
- **Open Decision 7 — Multiple Module Assignment Rules**: The rules for assigning more than one Module to a student at a time are undecided.
- **Open Decision 8 — Topic Quiz Length**: The number of questions per topic Quiz is undecided; only the Final_Boss is fixed at 20.
