# Changelog - B2B Learning Engine

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.4] - Phase 1 Cleanup & Phase 2: Parent Hub MVP - 2026-11-15

### Added
- **Phase 1 Cleanup (A1: Focus Restoration on Detached Trigger)**:
  - Hardened `Drawer.close()` in `js/components/drawer.js` with fallback selector target (`.queue-table [data-open-review]`, `#queue-heading`, or `#page-heading`) when trigger row is detached upon approval.
  - Added `restoreFocusAfterReview()` in `js/teacher-workspace.js` preventing focus loss to `document.body`.
  - Passed verification in `scratch/test-phase1-cleanup.cjs` (7/7 PASS).
- **Phase 1 Cleanup (A2: Stale Update / Versioning Protection)**:
  - Added optimistic concurrency `version` integer counter to each submission record in `js/services/state-store.js`.
  - Added `expectedVersion` parameter to `updateSubmissionStatus()`. If current version does not match expected version, update is aborted with `{ error: 'STALE_UPDATE_CONFLICT' }`.
  - Integrated conflict handling toast in `TeacherWorkspace` warning tutor and reloading latest data automatically.
  - Backward compatible when `expectedVersion` is omitted.
- **Phase 2: Parent Hub MVP (`student.html`, `js/student/parent-hub.js`, `css/parent-hub.css`)**:
  - Read-only parental transparency hub integrated directly into the Student Experience.
  - 4 Interactive Sub-views:
    * **Ringkasan (Overview)**: Student profile card (Alex Pratama, Grade 5 SD, Scratch Starter), completed sessions (4/8), attendance (100%), XP points (450 XP), roadmap progress, and live reactive submission status & teacher feedback card connected to `StateStore`.
    * **Laporan Sesi (Session Reports)**: Chronological reports for Sessions 1–4 with dates, topics, activities, achievements, difficulties & resolution, and actionable home recommendations for parents.
    * **Kemajuan Mingguan (Weekly Progress)**: Weekly summary cards with module progress bar (50%), observed learning strengths, areas to practice, and warm tutor notes for parents.
    * **Evaluasi Bulanan (Monthly Evaluation)**: Comprehensive evaluation distinctly separating **Penyelesaian Tugas (Task Completion: 100%)** from **Penguasaan Konsep (Conceptual Mastery: 85%)**; explains 4 core competencies (Logika & Algoritma, Kreativitas Modifikasi, Pemecahan Masalah/Debugging, Kegigihan & Komunikasi) with progress meters, tutor summary, and next month targets.
  - Strictly READ-ONLY for parents: Zero edit inputs or submission buttons.
  - Mock datasets: `data/mock/parent-hub/session-reports.json`, `data/mock/parent-hub/weekly-progress.json`, `data/mock/parent-hub/monthly-evaluations.json`.
  - Service abstraction in `MockService` with safe offline fallbacks.
  - 100% Semantic Design Tokens in `css/parent-hub.css` (0 raw hex, 0 raw rgb); full Light and Dark Mode support.
  - Responsive layout verified on tablet (768px, zero horizontal overflow).
- **Verification Suites & Screenshots (`scratch/`)**:
  - `scratch/test-phase1-cleanup.cjs`: 7/7 PASS (A1 focus restoration, A2 stale conflict rejection).
  - `scratch/test-parent-hub.cjs`: 15/15 PASS (navigation, 4 tabs, read-only safety, StateStore reactive binding).
  - `scratch/parent-hub-report/`: Captured high-res screenshots for all 4 views in Light & Dark Mode and 768px tablet responsive view.

---

## [0.3.3] - Phase 1: End-to-End Learning Cycle & Unified Local Mock State Manager - 2026-11-15

### Added
- **Unified Local Mock State Manager (`js/services/state-store.js`)**:
  - Single Source of Truth for Submissions and Teacher Review Lifecycle using `b2b_submissions_store`.
  - Non-destructive initial seed (`seedSubmissionsIfEmpty`) protecting active store data from re-seed overwrites.
  - CRUD operations: `getAllSubmissions()`, `getSubmission()`, `getStudentLessonSubmission()`, `saveSubmission()`, `updateSubmissionStatus()`.
  - Collision-free UUID-based ID generation (`generateSubmissionId()`).
  - Seamless migration from legacy `b2b_student_lesson_progress` preserving all checkpoint, slide, and notes data with `isMigrated` marker.
  - Cross-tab reactive updates via `window.addEventListener('storage')` and same-tab updates via CustomEvent `b2b_state_store_change`.
  - Graceful corruption handling and quota limits fallback.
- **Teacher Review Workflow Activation (`js/teacher-workspace.js`, `js/teacher/teacher-app.js`)**:
  - Activated "Setujui Proyek" (Approve) button saving persistent evaluation to unified store with reviewer info and feedback history.
  - Activated "Minta Revisi" (Request Revision) button requiring mandatory written feedback before state transition to `revision-required`.
  - Real-time recalculation of summary metric cards (`Pending` and `Approved`) from active store records.
  - Dynamic approved projects history row rendering in Teacher Workspace.
- **Student Feedback UI (`js/lesson-workspace.js`, `css/lesson.css`)**:
  - Extended Stage 6 (Project Submission) with responsive feedback cards matching Remembero visual tokens:
    * *Submitted*: In-queue confirmation notice.
    * *Approved*: Elevated success card with trophy icon, congratulation message, reviewer name, and tutor feedback box.
    * *Revision Required*: Elevated warning card with alert icon, revision instructions, and re-enabled submission form allowing student to update URL/notes and resubmit ("Kirim Ulang Hasil Revisi →").
  - 100% semantic CSS design tokens; zero hardcoded color leaks across Light and Dark Mode.
- **Comprehensive Verification Suites (`scratch/`)**:
  - `scratch/test-state-store.cjs`: 9/9 PASS (store creation, single-seed, uuid, evaluation mutations, corruption resilience).
  - `scratch/test-teacher-phase33.cjs`: 13/13 PASS (active review workflow, metric recalculation, feedback validation).
  - `scratch/test-end-to-end-cycle.cjs`: 14/14 PASS (full end-to-end cycle: submit -> teacher approve -> student view feedback -> teacher revision -> student re-submit).
  - Generated visual audit screenshots in `scratch/feedback-ui-report/`.

---

## [0.3.2] - Multi-Page Migration (Stage 3: Standalone Teacher Experience) - 2026-11-14

### Added
- **Multi-Page Architecture — Standalone Teacher Experience (`teacher.html`, `js/teacher/teacher-app.js`)**:
  - Independent HTML shell `teacher.html` dedicated exclusively to the Teacher Experience.
  - Dedicated JavaScript entrypoint `js/teacher/teacher-app.js` importing only teacher modules (`TeacherWorkspace`, `Drawer`, `Modal`, `Theme`, `showToast`, `MockService`).
  - Zero asset over-fetching: `lesson.css`, `lesson-workspace.js`, and `content-renderer.js` are completely excluded from `teacher.html`.
  - DOM isolation: `#student-container` and `#view-student` removed from `teacher.html`, keeping the DOM clean and purpose-built.
  - Teacher sidebar navigation: "Dashboard Guru", "Manajemen Siswa (Tahap 3.2)", "Antrean Submission (Tahap 3.3)", and cross-page links back to "Portal Utama" and "Ruang Siswa" (`student.html`).
  - Full preservation of all Phase 3.1 features:
    * 4 Elevated Summary Metric Cards (Total: 6, Aktif: 4, Pending: 2, Disetujui: 1).
    * Activity Feed with 5 real-time student activity items.
    * Submission Queue table with 2 pending submissions (Alex Pratama, Budi Santoso) and checkpoint/quiz metadata.
    * Contextual Review Drawer with Stage 1 fixes retained (rAF focus management, Tab/Shift+Tab focus trap, Escape closure, trigger focus restoration, `visibility: visible` CSS fix).
    * Approve and Request Revision buttons remain preview-only toast simulation (no premature state mutation).
    * Light/Dark theme toggle and persistence (`localStorage`).
    * Full responsive layout for Desktop (1440px) and Tablet (768px stacked layout).
    * 100% test pass: 27/27 standalone suite, 7/7 tablet suite, 13/13 asset isolation suite.

### Added (Earlier in 0.3.2 - Stage 2: Standalone Student Experience)
- **Multi-Page Architecture — Standalone Student Experience (`student.html`, `js/student/student-app.js`)**:
  - Independent HTML shell `student.html` dedicated exclusively to the Student Experience.
  - Dedicated JavaScript entrypoint `js/student/student-app.js` importing only student modules (`LessonWorkspace`, `content-renderer.js`, `theme.js`, `toast.js`, `modal.js`, `mock-service.js`).
  - Zero asset over-fetching: `teacher.css` and `teacher-workspace.js` are completely excluded from `student.html`.
  - DOM isolation: `#teacher-container` and `#sample-drawer` removed from `student.html`, keeping the DOM clean and role-specific.
  - Student sidebar navigation with deep links: "Dashboard & Quest", "Misi: Scratch Motion", and cross-page links back to "Portal Utama".
  - Full preservation of all Phase 2 features:
    * Student Dashboard with Byte mascot, 4 RPG stat pills, active mission card, and 4 coding realm items.
    * 2D RPG Archipelago Quest Map with 3 island node overlays and animated active pulse.
    * 6-stage continuous Lesson Workspace (Brief, Learning Materials with 10 slides, Guided Practice with 4 checkpoints, Comprehension Check with 3 interactive quiz questions, Project Challenge, and Project Submission).
    * `localStorage` progress persistence (`b2b_student_lesson_progress`) and theme persistence (`b2b_theme_preference`).
    * Full responsive adaptation for Desktop (1440px) and Tablet (768px stacked layout).
    * 100% test pass: 29/29 standalone suite, 6/6 tablet suite, 44/44 Phase 2 regression suite.

### Added (Earlier in 0.3.2 - Phase 3.1)
- **Teacher Workspace Architecture (`js/teacher-workspace.js`, `css/teacher.css`)**:
  - Class `TeacherWorkspace` ES Module rendering the full Teacher Experience shell.
  - Dedicated Teacher design tokens and styling in `css/teacher.css` adhering strictly to Remembero visual benchmarks with 100% semantic CSS custom properties (zero hardcoded color leaks).
- **Teacher Header Banner & Sub-Navigation**:
  - Personalized greeting ("Halo, Kak Sarah! 👋"), teacher avatar initials ("KS"), active semester pill ("SDIT Al-Hikmah • Kelas Scratch Starter").
  - Sub-navigation pills with status counters: "Dashboard Guru (Utama)", "Manajemen Siswa (Tahap 3.2 - 6 Siswa)", and "Antrean Submission (Tahap 3.3 - 2 Menunggu)".
  - Transparent placeholder notice banners for Tahap 3.2 and 3.3 preventing premature feature clutter.
- **4 Remembero-Inspired Elevated Summary Metric Cards**:
  - *Total Siswa*: 6 terdaftar di kelas (ikon perisai/badge).
  - *Siswa Aktif*: 4 siswa aktif belajar minggu ini (ikon target).
  - *Menunggu Review*: 2 submission menunggu evaluasi guru (ikon bintang).
  - *Proyek Disetujui*: 1 proyek disetujui memenuhi kriteria (ikon piala).
- **Two-Column Dashboard Grid Layout**:
  - Left column: Submission Queue Preview table displaying pending submissions (Alex Pratama, Budi Santoso) with student avatar, lesson title, submission timestamp, checkpoint verification status (4/4), and action button "Review Submission →".
  - Right column: Real-time Student Activity Stream displaying 5 chronological event items with avatars, timestamps, and contextual badges (`.badge-submitted`, `.badge-in-progress`, `.badge-practice-completed`, `.badge-approved`).
- **Contextual Review Drawer Integration**:
  - Clicking "Review Submission →" opens the accessible right-side slide-in drawer (`#sample-drawer`).
  - Populates dynamic student metadata (Scratch project URL, reflection notes, 4/4 checkpoint status, concept quiz score).
  - Approval action dynamically transitions submission state and updates dashboard metric counters while preserving queue scroll position (`preventScroll: true`).
- **Consistent 6-Student Mock Dataset (`data/mock/`)**:
  - `data/mock/students.json`: Exactly 6 students (Alex, Budi, Citra, Doni, Eva, Fajar) with individual progress metrics.
  - `data/mock/submissions.json`: 3 realistic submissions (2 pending review, 1 approved history).
  - `data/mock/class-summary.json`: Unified class summary metrics and recent activity feed.
  - `js/services/mock-service.js`: Added `fetchStudents()`, `fetchSubmissions()`, and `fetchClassSummary()`.

---

## [0.3.1] - Visual Quality Improvement (Remembero & Canarie Visual Benchmark + 2D RPG Island Map) - 2026-11-14

### Added
- **Vector Illustrated Assets Library (`js/illustrations.js`)**:
  - Custom SVG mascot "Byte the Robot Coder" integrated in the Student Hero Profile card.
  - 4 detailed 2D island realm illustrations: *Scratch Forest Island*, *Roblox Kingdom Castle Island*, *Python Laboratory Island*, and *Game Development Realm Island*.
  - Rich inline SVG icons replacing all emojis: Scratch Cat badge, lock, treasure chest, XP star, achievement trophy, fire streak, target goal, and verified shield checkmarks.
- **Illustrated 2D RPG Island Quest Map (`js/illustrations.js`, `js/lesson-workspace.js`, `css/lesson.css`)**:
  - Full-width panoramic illustrated archipelago with gradient ocean, waves, lush islands, castle towers, and floating cloud layers.
  - Interactive quest node pins overlaid directly on island coordinates with pulsing aura for active quests and clean locks for gated zones.
  - Curved dotted navigation trajectories matching the benchmark RPG quest style.
- **Card Hierarchy & Spacing Refinements (`css/lesson.css`)**:
  - Hero profile and active mission cards enhanced with proportional typography, pill badges, and elevated multi-layer shadows.
  - Zero hardcoded colors; all custom SVGs and card borders respect design tokens across Light and Dark Mode.
  - Responsive layout verified for mobile, tablet, and desktop viewports.

---

## [0.3.0] - Official Visual Redesign (Remembero Benchmark + Bright RPG Quest Map) - 2026-11-14

### Added
- **Remembero-inspired Visual Identity (`css/design-tokens.css`)**:
  - Sky-blue background canvas token (`--color-bg-canvas: #ebf5fb;` in Light Mode, deep twilight `#0a1326;` in Dark Mode).
  - Elevated white cards with soft rounded corners (`--radius-xl: 20px`, `--radius-2xl: 24px`, `--radius-pill: 9999px`) and multi-layer colorful shadows (`--shadow-card`, `--shadow-card-hover`).
  - Bright RPG adventure palette: Turquoise/Sky (`#0ea5e9`), Emerald (`#10b981`), Amber/Gold (`#f59e0b`), Coral Orange (`#f97316`), and Purple (`#8b5cf6`).
  - Tactile pill buttons and badge tokens (`badge-xp`, `badge-streak`, `badge-level`, `badge-scratch`).
- **Student Dashboard Redesign (`js/lesson-workspace.js`, `css/lesson.css`)**:
  - Explorer Hero Profile card with student avatar, level indicator (Lv.3), greeting, and interactive XP bar (450 / 600 XP).
  - Gamification quick stat counters (5-Day Streak 🔥, 450 Total XP ⭐, 1/2 Daily Goals 🎯, 4 Unlocked Badges 🏆).
  - Featured Active Mission card for *"Scratch — Basic Motion"* with pulsing circular icon, step highlights, duration badge, and prominent CTA button.
  - Remembero Daily Learning Goal widget with task checklist and XP rewards.
  - Learning Realms overview featuring 4 worlds (Scratch Forest, Roblox Kingdom, Python Laboratory, Game Development Realm).
  - Hall of Achievements showcase displaying unlocked and locked badges.
- **Bright RPG Adventure Quest Map (`js/lesson-workspace.js`, `css/lesson.css`)**:
  - Atmospheric RPG Map Canvas with floating decorative clouds and region indicator tabs.
  - Curved SVG connecting dotted paths (`stroke-dasharray="8 8"`) linking quest islands.
  - Quest Nodes with dynamic state styling: Active quest with pulsing glow, locked quests with soft cloud badges and unlock requirements, and bonus treasure chest checkpoint for 100% quiz score.
- **Lesson Workspace Visual Polish (`css/lesson.css`)**:
  - Elevated floating stage stepper with rounded pill navigation and status checkmarks.
  - Enhanced slide presenter, checkpoints, quiz question cards, and rubric table matching the bright, friendly Remembero aesthetic.
  - 100% semantic design token adherence with 0 hardcoded color leaks across Light and Dark modes.

---

## [0.2.0] - Phase 2 Student Experience - 2026-11-14

### Added
- **Student Dashboard & Quest Map (`js/lesson-workspace.js`, `css/lesson.css`)**:
  - Student Welcome header with current learning track ("Scratch Starter Adventure") and visual progress bar.
  - Interactive Quest Map with progressive module nodes (active mission, locked missions, estimated duration, status badge).
  - Seamless navigation between Quest Map and continuous Lesson Workspace without page reloads.
- **Continuous Lesson Workspace (`js/lesson-workspace.js`, `css/lesson.css`)**:
  - 6-stage continuous workspace with persistent stage stepper: Brief, Learning Materials, Guided Practice, Comprehension Check, Project Challenge, Project Submission.
  - Stage-level navigation bar with completed stage indicators (`✓`) and active stage indicator.
  - Slide presenter for Learning Materials with slide counter, progress dots, prev/next buttons, visited tracker, and smooth transition ($\le 200$ ms).
  - Guided Practice checkpoints with interactive checklist toggles, expected result boxes, and direct link to official Scratch 3.0 Web Editor.
  - Comprehension Check with immediate validation, explanations for wrong answers, and toggleable hints.
  - Project Challenge mission brief with story, checklist requirements, bonus mission, and evaluation rubric table.
  - Project Submission form with public Scratch URL field, reflection notes, draft saving, and submission status update.
- **Content Block Renderer (`js/content-renderer.js`)**:
  - Pure JSON-to-HTML content block renderer separating content from presentation logic.
  - Supported blocks: `heading`, `text`, `callout` (info/warning/success), `image` (with accessible placeholder fallback), `diagram` (rendered Scratch coordinate grid with X/Y axes and center origin), `scratch-block` (authentic block styling for events, motion, looks, control, sensing), `code-stack`, `copyable-prompt` (with working clipboard API and toast feedback), `comparison-table`, `video-embed` (video placeholder with duration), `checklist-summary`, and `interactive-quiz`.
- **Progress Tracking State Machine**:
  - Distinct student states (Section 9): `Not Started` $\rightarrow$ `In Progress` $\rightarrow$ `Practice Completed` (upon completing all practice checkpoints) $\rightarrow$ `Submitted` (upon sending project).
  - Mock progress persistence via `localStorage` allowing state to reflect accurately on Quest Map.
- **Design Tokens Extension (`css/design-tokens.css`)**:
  - Added authentic external tool tokens for Scratch 3.0 blocks (`--color-scratch-motion`, `--color-scratch-looks`, `--color-scratch-sound`, `--color-scratch-events`, `--color-scratch-control`, `--color-scratch-sensing`, `--color-scratch-dark-text`).
  - Zero hardcoded colors across all CSS, HTML, and JS files verified via automated audit.
- **Curriculum Content (`data/mock/lesson-scratch-motion.json`)**:
  - Enriched *"Scratch — Basic Motion: Membuat Karakter Bergerak"* with 10 slides, 4 guided practice checkpoints, 3 concept quiz questions, and project challenge.

---

## [0.1.0] - Phase 1 Foundation - 2026-11-10

### Fixed
- **Design Tokens**: Eliminated hardcoded `#ffffff` colors in `css/components.css` (`.btn-danger`) and `css/views.css` (`.brand-badge`, `.avatar-circle`), mapping them to the semantic token `var(--color-text-inverse)` across Light and Dark modes.

### Added
- **Project Structure**: Folder structure initialized (`css/`, `js/`, `js/components/`, `js/services/`, `data/mock/`).
- **Design Tokens (`css/design-tokens.css`)**:
  - Full system of tokens for colors (primary, neutral, surface, text, border, success, warning, danger, info).
  - Explicit Light and Dark mode variables via `[data-theme="light"]` and `[data-theme="dark"]`.
  - Typography scale, fluid layout sizing, spacing scale (4px grid), border radii, elevation/shadows, and transition timing tokens.
- **Base CSS (`css/base.css`)**:
  - Modern CSS reset and desktop-first layout with tablet responsiveness.
  - Custom themed scrollbars, accessible outline states (`:focus-visible`), and typography standards.
- **Shared Components (`css/components.css`)**:
  - Buttons (`btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`) with hover, active, focus, disabled states.
  - Cards, form inputs, selects, badges (status badges), and tooltips.
  - Accessible Modal dialog shell with keyboard trap (`Esc` close).
  - Contextual Review Drawer with smooth slide-in, backdrop, and state preservation.
  - Toast notification container and styling (success, warning, error, info).
- **Shell Layout & Navigation (`css/views.css`, `index.html`)**:
  - Persistent sidebar navigation with collapsible state on tablet.
  - Top header with theme toggle (auto-persists to `localStorage`), active role indicator (Student / Teacher / Admin), and user avatar.
  - Responsive content container designed for seamless switching between stages without full-page reloads.
- **Core JavaScript**:
  - `js/theme.js`: Manages light/dark theme preference and system preference sync.
  - `js/components/toast.js`: Standalone lightweight toast system.
  - `js/components/modal.js`: Accessible modal trigger and lifecycle management.
  - `js/components/drawer.js`: Contextual drawer manager preserving scroll position and backdrop click.
  - `js/services/mock-service.js`: Asynchronous mock data service mimicking future Supabase SDK query patterns.
  - `js/app.js`: Main shell coordinator, active nav link handler, and shared component showcase/verification.
- **Mock Data**:
  - `data/mock/user.json`: Sample user profiles for Student, Teacher, and Admin roles.
  - `data/mock/lesson-scratch-motion.json`: Seed structure for the upcoming Phase 2 "Scratch — Basic Motion" lesson.
- **Documentation**:
  - `PROJECT_RULES.md` verified and aligned.
  - `README.md` updated with architecture, preview instructions, and phase roadmap.

