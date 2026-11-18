# Implementation Plan: design-direction-preview

## Overview

Build a self-contained visual prototype at `scratch/design-direction-preview/` using plain HTML, CSS, and vanilla JavaScript. The prototype renders four role-specific dashboards (Admin, Tutor, Student, Parent) with light/dark theme switching. No build step, no framework, no external CDN. The prototype shares no files, CSS, JS, or storage keys with the main application.

## Tasks

- [x] 1. Scaffold the prototype directory and create four empty files
  - Create directory `scratch/design-direction-preview/`
  - Create `scratch/design-direction-preview/index.html` with the HTML5 boilerplate (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
  - Create `scratch/design-direction-preview/styles.css` as an empty file (linked via `<link rel="stylesheet">` in `<head>`)
  - Create `scratch/design-direction-preview/app.js` as an empty file (linked via `<script src="app.js" defer>` before `</body>`)
  - Create `scratch/design-direction-preview/README.md` as an empty file
  - Verify: `index.html` has zero `<style>` blocks, zero `style=""` attributes, and zero `<script>` blocks in `<body>`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.4, 11.6_

- [x] 2. Define the Design System in `styles.css`
  - [x] 2.1 Write light-mode color tokens on `:root`
    - Define all tokens from the Light Mode color table: `--color-canvas`, `--color-surface`, `--color-surface-elevated`, `--color-primary`, `--color-primary-hover`, `--color-primary-subtle`, `--color-accent-teal`, `--color-accent-teal-bg`, `--color-accent-amber`, `--color-accent-amber-bg`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-border-subtle`, `--color-success`, `--color-warning`, `--color-danger`
    - Canvas: `hsl(210, 40%, 97%)`, surface: `#ffffff`, primary: `hsl(245, 72%, 50%)`, teal: `hsl(182, 65%, 40%)`, amber: `hsl(42, 90%, 50%)`
    - _Requirements: 2.1, 2.7_

  - [ ]* 2.2 Write property test for light-mode color tokens (Property 5)
    - **Property 5: Light Mode Canvas Provides Sufficient Surface Contrast**
    - Generate pairs of (canvas HSL, surface HSL) values via fast-check; compute WCAG luminance ratio; assert ≥1.5:1
    - **Validates: Requirements 3.4**

  - [x] 2.3 Write dark-mode color token overrides on `[data-theme="dark"]`
    - Define the three layered navy surface tokens: canvas `hsl(224, 35%, 10%)`, surface `hsl(224, 32%, 15%)`, elevated `hsl(224, 30%, 20%)`
    - Define lighter accent/text overrides for dark mode (primary, teal, amber, text levels)
    - _Requirements: 2.2, 3.3_

  - [ ]* 2.4 Write property test for dark-mode surface layering (Property 1)
    - **Property 1: Dark Mode Surfaces Are Layered**
    - Generate sets of three lightness values via fast-check; assert each is ≥3% higher than the previous and all three are distinct
    - **Validates: Requirements 2.2, 3.3**

  - [x] 2.5 Write typography scale tokens on `:root`
    - Define `--text-xs` through `--text-3xl` (12, 14, 16, 20, 24, 32, 40px) and font-weight tokens `--font-body` (400), `--font-medium` (500), `--font-semibold` (600), `--font-bold` (700)
    - _Requirements: 2.3_

  - [ ]* 2.6 Write property tests for typography scale (Properties 2 and 12)
    - **Property 2: Typography Scale Has Sufficient Resolution** — generate scale arrays via fast-check; assert ≥5 values and all consecutive gaps ≥2px
    - **Property 12: Body Text Meets the Minimum Size** — assert default body font-size ≥14px across all views
    - **Validates: Requirements 2.3, 5.6, 10.4**

  - [x] 2.7 Write spacing scale tokens on `:root`
    - Define exactly 8 tokens: `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-6` (24px), `--space-8` (32px), `--space-12` (48px), `--space-16` (64px)
    - _Requirements: 2.4_

  - [ ]* 2.8 Write property test for spacing tokens (Property 3)
    - **Property 3: Spacing Tokens Are Valid 4px Multiples**
    - Generate sets of 8 spacing values via fast-check; assert each value mod 4 = 0 and the set has exactly 8 elements
    - **Validates: Requirements 2.4**

  - [x] 2.9 Write shadow and border-radius tokens on `:root`, plus dark-mode shadow overrides
    - Define `--shadow-low`, `--shadow-mid`, `--shadow-high` (3 elevation levels)
    - Add `[data-theme="dark"]` shadow overrides with ~1.6× opacity values
    - Define `--radius-xs` (4px), `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-pill` (9999px)
    - _Requirements: 2.5, 2.6_

  - [ ]* 2.10 Write property test for border-radius tokens (Property 4)
    - **Property 4: Border-Radius Values Are Within the Permitted Range**
    - Generate border-radius values via fast-check; assert all ≤16px (excluding pill)
    - **Validates: Requirements 2.6**

- [x] 3. Checkpoint — Design system tokens complete
  - Ensure all CSS custom properties are defined on `:root` and `[data-theme="dark"]`. Ask the user if any token values need adjustment before proceeding.

- [x] 4. Build the preview header markup in `index.html` and its CSS in `styles.css`
  - [x] 4.1 Write the `<header class="preview-header">` structure in `index.html`
    - Add `<nav class="preview-nav" aria-label="Design preview switcher">` containing four `<button class="nav-item" data-target="[view]">` elements: Admin, Tutor, Student, Parent
    - Each button contains an inline SVG icon and a text label; use distinct SVGs (not emoji)
    - Set `aria-current="page"` on the Admin button as the default active state
    - Add `<button class="theme-toggle" aria-label="Toggle dark mode">` with two inline SVGs (sun and moon icons)
    - _Requirements: 4.1, 4.4, 4.6, 4.7_

  - [x] 4.2 Write CSS for `.preview-header`, `.preview-nav`, `.nav-item`, and `.theme-toggle`
    - `position: sticky; top: 0; z-index: 100` on `.preview-header`
    - Apply `--color-surface`, `--shadow-low`, and `--color-border` border-bottom to the header
    - Active nav item rule: `[aria-current="page"]` → `color: var(--color-primary)` + underline or filled background chip (two observable differentiators)
    - Theme toggle: always visible, right-aligned; sun icon visible in light mode, moon icon visible in dark mode via `[data-theme="dark"]` rule
    - 44×44px minimum for all nav buttons and theme toggle
    - _Requirements: 4.2, 4.3, 10.3_

  - [ ]* 4.3 Write property test for active nav item differentiators (Property 7)
    - **Property 7: Active Navigation Item Has Two Observable Differentiators**
    - For each of the four possible active states, assert the active button has `color: var(--color-primary)` AND either an underline or a background highlight
    - **Validates: Requirements 4.3**

- [x] 5. Build the four `[data-view]` section skeletons in `index.html` and the view-switching CSS
  - Add `<body data-active-view="admin">` with four child sections: `<section data-view="admin">`, `<section data-view="tutor">`, `<section data-view="student">`, `<section data-view="parent">`
  - Write the view-switching CSS rule:
    ```css
    [data-view] { display: none; }
    [data-active-view="admin"]   [data-view="admin"],
    [data-active-view="tutor"]   [data-view="tutor"],
    [data-active-view="student"] [data-view="student"],
    [data-active-view="parent"]  [data-view="parent"] { display: block; }
    ```
  - Add `<main>` wrapper inside each `[data-view]` section for content
  - _Requirements: 1.3, 4.2_

- [x] 6. Build the Admin Control Center view
  - [x] 6.1 Write Admin view HTML markup in `index.html`
    - `<h1>Control Center</h1>` inside `[data-view="admin"]`
    - Internal tab strip: two `<button>` elements labeled "Users" and "Platform" (purely presentational in the prototype)
    - Stats section: four metric elements using varied presentation — two flat-on-background blocks, one indigo-tinted block, one horizontal layout block; each has a `<span class="stat-number">` (≥32px) and a short label; wrap in `<div class="stats-section">`
    - User table: `<table>` with `<thead>` (Name, Role, Status columns) and `<tbody>` with 5 rows; rows separated by `border-bottom` divider, not individual cards
    - Activity feed: `<aside class="activity-feed">` with 3 recent activity items as `<li>` inside `<ul>`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Write Admin view CSS in `styles.css`
    - Two-column asymmetric grid `grid-template-columns: 3fr 1fr` for the main + aside
    - Stats section: 2×2 grid with varied presentations per the design spec
    - `.stat-number` font-size: `var(--text-2xl)` = 32px minimum
    - Heading hierarchy: `h1` uses `var(--text-xl)`, section `h2` uses `var(--text-lg)`
    - Whitespace between Stats section and User table: `margin-top: var(--space-8)` (32px)
    - No gradient rules in this view (0 gradients)
    - _Requirements: 5.3, 5.4, 5.5, 5.7, 5.8, 6.3_

  - [ ]* 6.3 Write property test for Admin view — no gamification elements (Property 14)
    - **Property 14: Admin View Contains No Gamification Elements**
    - Inspect the Admin view DOM; assert zero elements with gamification roles (XP counter, streak, RPG badge, reward points)
    - **Validates: Requirements 6.4**

- [x] 7. Build the Tutor Teaching Workspace view
  - [x] 7.1 Write Tutor view HTML markup in `index.html`
    - `<h1>Teaching Workspace</h1>` inside `[data-view="tutor"]`
    - Internal tab strip: two `<button>` elements labeled "Submission Tertunda" and "Jadwal"
    - Next Action panel: `<div class="next-action-panel">` as first child of `<main>`; contains `<h2>3 Submission Menunggu Review</h2>`, upcoming session text, two buttons ("Buka Review" primary, "Lihat Jadwal" secondary)
    - Submission list: `<ul class="submission-list">` with 3 `<li>` items; each item has student name, lesson title, a `<span class="badge badge-[status]">`, and action buttons ("Buka Review" secondary + "Approve" primary)
    - Allowed badge labels: "Menunggu Review", "Sudah Direview", "Disetujui"
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 Write Tutor view CSS in `styles.css`
    - Single dominant column layout
    - `.next-action-panel`: `background-color: var(--color-primary-subtle)`, `border-radius: var(--radius-md)`, `padding: var(--space-6)`, `box-shadow: var(--shadow-mid)`; heading `var(--font-semibold)`, size `var(--text-lg)`
    - Primary buttons (`background: var(--color-primary)`, `color: #fff`, `border-radius: var(--radius-sm)`)
    - Secondary buttons (`background: var(--color-surface)`, `border: 1px solid var(--color-border)`)
    - `.badge-pending`: `background: var(--color-accent-amber-bg)`, `.badge-reviewed`: `background: var(--color-accent-teal-bg)`, `.badge-approved`: `background: var(--color-success)` with appropriate text colors
    - Submission rows: `border-bottom: 1px solid var(--color-border)`, no box-shadow on rows
    - Whitespace between Next Action panel and Submission list: `margin-top: var(--space-8)`
    - Maximum 1 gradient in this view (optional subtle header accent)
    - _Requirements: 5.5, 5.8, 7.3, 7.4_

  - [ ]* 7.3 Write property tests for Tutor view badge labels and primary button color (Properties 15 and 16)
    - **Property 15: Tutor Submission Status Badges Use Only the Allowed Set** — assert all badge text values ∈ {"Menunggu Review", "Sudah Direview", "Disetujui"}
    - **Property 16: Tutor Primary Action Buttons Use the Indigo Token** — assert computed background-color of "Approve" and "Buka Review" primary buttons matches `--color-primary`
    - **Validates: Requirements 7.2, 7.4**

- [x] 8. Build the Student Learning Adventure view
  - [x] 8.1 Write Student view HTML markup in `index.html` — header and gamification panel
    - `<h1 class="quest-map-title">Peta Petualanganmu</h1>` using `var(--text-3xl)` and `var(--font-bold)` via CSS class
    - Two-column asymmetric layout wrapper: `<div class="student-layout">`
    - Right column progress panel: `<aside class="progress-panel">` containing exactly three `data-gamification-category` containers:
      1. `<div data-gamification-category="progress">` — level 4, 320 XP, 7-day streak
      2. `<div data-gamification-category="achievement">` — "Scratch Explorer" badge text
      3. `<div data-gamification-category="mission">` — active mission title + progress bar `<div class="progress-bar"><div class="progress-fill" style="--pct: 60%"></div></div>`
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Write Quest Map SVG in `index.html` as first child of the left column
    - Inline `<svg class="quest-map">` with `min-height="400"` attribute and `viewBox` set appropriately
    - 5 node `<circle>` or `<g>` elements with `data-node-id` and `data-node-state` attributes ("completed", "completed", "available", "locked", "locked")
    - 4 `<line>` or `<path>` edge elements connecting n1→n2, n2→n3, n3→n4, n4→n5
    - Node labels via `<text>` elements inside the SVG
    - Use `currentColor` and CSS custom properties for node colors: completed = `var(--color-primary)`, available = `var(--color-accent-teal)`, locked = `var(--color-border)`
    - _Requirements: 8.1_

  - [x] 8.3 Write Student view CSS in `styles.css`
    - `grid-template-columns: 2fr 1fr` on `.student-layout` for ≥768px
    - Quest Map SVG: `min-height: 400px` at ≥768px
    - `.quest-map-title`: `font-size: var(--text-3xl)`, `font-weight: var(--font-bold)` (40px ÷ 14px body ≈ 2.86 — well above 1.5× requirement)
    - `.progress-panel` labels: `font-size: var(--text-sm)`, level number `font-size: var(--text-lg)`
    - `.progress-fill`: `width: var(--pct)`, `background: var(--color-accent-teal)`, `height: 8px`, `border-radius: var(--radius-pill)`
    - Maximum 2 gradients: one radial glow behind active Quest Map node, one optional soft linear gradient on h1 area
    - _Requirements: 5.7, 5.8, 8.1, 8.4_

  - [ ]* 8.4 Write property tests for Student view — gamification count and Quest Map title size ratio (Properties 17 and 18)
    - **Property 17: Student View Contains Exactly Three Gamification Categories** — assert count of `[data-gamification-category]` elements = 3
    - **Property 18: Quest Map Title Size Is At Least 1.5× Body Font Size** — generate font-size configuration variants via fast-check; assert title/body ratio ≥1.5
    - **Validates: Requirements 8.3, 8.4**

- [x] 9. Build the Parent Progress & Insight view
  - [x] 9.1 Write Parent view HTML markup in `index.html`
    - `<h1>Perkembangan Andi Pratama</h1>` with child name, completion %, and last session date in the header zone (all above fold)
    - `<section class="weekly-progress">`: heading "Minggu ini", progress bar `<div class="progress-bar"><div class="progress-fill" style="--pct: 80%"></div></div>`, percentage label "80%"
    - `<section class="monthly-progress">`: heading "Bulan ini", progress bar `<div class="progress-bar"><div class="progress-fill" style="--pct: 52%"></div></div>`, "52% ← 12 dari 23 pelajaran"
    - `<section class="recent-sessions">`: `<ul class="session-timeline">` with 3 `<li>` items — date, lesson name, duration, status; NO `<table>` element in this view
    - Use plain Indonesian (no technical terms visible to user)
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [x] 9.2 Write Parent view CSS in `styles.css`
    - Single focused column; on ≥768px: `max-width: 640px; margin-inline: auto; padding-inline: var(--space-6)`; on <768px: `padding-inline: var(--space-4)`
    - Teal accent for all `.progress-fill` in this view: `background: var(--color-accent-teal)` (hue 170–195° confirmed by token)
    - All foreground and background color HSL saturation values ≤80% — verify teal at 65% ✓, no amber in this view
    - Zero gradients in this view
    - Whitespace between sections: `margin-top: var(--space-8)` (32px)
    - _Requirements: 5.5, 5.8, 9.3, 9.4_

  - [ ]* 9.3 Write property tests for Parent view — saturation limit and teal accent (Properties 19 and 20)
    - **Property 19: Parent View Colors Stay Below 80% Saturation** — inspect all color values applied in the Parent view DOM; assert all HSL saturation ≤80%
    - **Property 20: Parent Progress Indicators Use the Teal Accent Token** — assert all `.progress-fill` elements in the Parent view have a hue in [170, 195]
    - **Validates: Requirements 9.3, 9.4**

- [x] 10. Checkpoint — All four view layouts and CSS complete
  - Open the prototype in a browser with `python -m http.server` to visually confirm all four views render without broken layout. Ask the user if any visual adjustments are needed before writing the responsive CSS.

- [x] 11. Write responsive CSS (`@media` queries) in `styles.css`
  - [x] 11.1 Write `@media (min-width: 768px)` rules
    - Admin: engage `grid-template-columns: 3fr 1fr` for main+aside; stats 2×2 grid
    - Student: engage `grid-template-columns: 2fr 1fr` for `.student-layout`; Quest Map `min-height: 400px`
    - Parent: apply `max-width: 640px; margin-inline: auto; padding-inline: var(--space-6)`
    - All interactive buttons: enforce `min-width: 44px; min-height: 44px`
    - Set `font-size: var(--text-sm)` (14px) as the default body font-size on `<body>` or `:root html` — this ensures body text ≥14px across ALL breakpoints including mobile; supporting text elements (`.caption`, `.meta`, `.timestamp`) may use `var(--text-xs)` (12px) but must be explicitly scoped to those classes, never as a global default
    - _Requirements: 10.1, 10.2, 10.3, 5.6, 5.7_

  - [x] 11.2 Write mobile-first base styles and `@media (max-width: 767px)` overrides
    - Base (mobile-first): single-column stacked layout for all views
    - Admin: stats stack to 2×2 grid; table gets `overflow-x: auto` on its wrapper; aside drops below
    - Student: Quest Map full-width; progress panel drops below as compact 3-column gamification chip row
    - Navigation: `.preview-nav { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }` and `.nav-item { flex-shrink: 0; }` to keep all 4 items reachable
    - `<main>` element: `overflow-x: hidden` as safety net
    - _Requirements: 4.5, 10.4, 10.5_

  - [ ]* 11.3 Write property test for no horizontal scroll at all breakpoints (Property 22)
    - **Property 22: No Horizontal Scroll at Any Supported Breakpoint**
    - At each of {1440, 1366, 768, 390}px viewport widths, assert `document.documentElement.scrollWidth <= window.innerWidth`
    - **Validates: Requirements 10.5, 10.1, 10.2**

  - [ ]* 11.4 Write property test for touch target sizes (Property 21)
    - **Property 21: Interactive Buttons Meet the Touch Target Minimum**
    - At 768px and 390px viewports, assert every `<button>` element has `offsetWidth ≥ 44` and `offsetHeight ≥ 44`
    - **Validates: Requirements 10.3, 10.4**

- [x] 12. Write `app.js` — static data and all interactivity
  - [x] 12.1 Write the four static data constants at the top of `app.js`
    - `const adminData` — stats array (4 items), users array (5 items), recentActivity array (3 items), all matching the design spec exactly
    - `const tutorData` — nextAction object, submissions array (3 items with status values from the allowed set)
    - `const studentData` — student name, gamification object, questMap nodes+edges, achievement, activeMission
    - `const parentData` — child name, overview, weeklyProgress, monthlyProgress, recentSessions (3 items)
    - _Requirements: 11.1, 11.5_

  - [x] 12.2 Write the DOM-rendering functions for each dashboard view
    - `renderAdmin()` — populate stat numbers from `adminData.stats`; render user table rows from `adminData.users`; render activity feed items from `adminData.recentActivity`; handle `null`/`undefined` stat values by rendering `"—"` placeholder
    - `renderTutor()` — populate Next Action panel count and upcoming session from `tutorData.nextAction`; render submission list rows from `tutorData.submissions`; handle empty submissions array with "Tidak ada submission tertunda." empty state
    - `renderStudent()` — populate level/XP/streak from `studentData.gamification`; populate achievement and mission from `studentData.achievement` and `studentData.activeMission`; set Quest Map node visual states via `data-node-state` attributes
    - `renderParent()` — populate child name, completion %, last session date in header; set `--pct` custom property on weekly and monthly progress fill elements; render session timeline items
    - _Requirements: 6.1, 6.5, 7.1, 7.2, 8.1, 9.1_

  - [x] 12.3 Write the view-switching logic in `app.js`
    - Add a click event listener on `.preview-nav` (event delegation)
    - On click of a `.nav-item` button: set `document.body.dataset.activeView` to the button's `data-target` value; update `aria-current="page"` on the clicked button and remove it from the others; optionally persist to `localStorage.setItem('proto_active_view', view)` using the `proto_` prefix
    - _Requirements: 4.2, 11.3_

  - [x] 12.4 Write the theme toggle logic in `app.js`
    - Add a click event listener on `.theme-toggle`
    - On click: read current `document.documentElement.getAttribute('data-theme') || 'light'`; set next theme; call `document.documentElement.setAttribute('data-theme', next)`; call `localStorage.setItem('proto_theme', next)` — wrap in `try/catch` to handle private browsing; fall back to module-level variable if localStorage throws
    - _Requirements: 3.1, 3.2, 3.5, 11.3_

  - [ ]* 12.5 Write property test for theme toggle preserving active view (Property 6)
    - **Property 6: Theme Toggle Preserves Active Dashboard View**
    - For each of the 4 initial active views, simulate N arbitrary toggle calls via fast-check; assert `body.dataset.activeView` is unchanged after every toggle sequence
    - **Validates: Requirements 3.5**

  - [ ]* 12.6 Write property test for localStorage key prefix (Property 23)
    - **Property 23: LocalStorage Keys Use the `proto_` Prefix**
    - Intercept all `localStorage.setItem` calls during app execution; assert every key argument starts with `"proto_"`
    - **Validates: Requirements 11.3**

  - [x] 12.7 Write the `DOMContentLoaded` initialization block in `app.js`
    - Call all four render functions to populate dynamic data into the DOM on page load
    - Restore `proto_active_view` from localStorage (if set) by updating `body.dataset.activeView` and `aria-current`
    - Restore `proto_theme` handled separately by the FOUC-prevention script; `app.js` only needs to sync the toggle button icon state to the current theme on load
    - _Requirements: 3.6_

- [x] 13. Add the FOUC-prevention inline script to `index.html`
  - Note: `index.html` already exists from Task 1. This task ADDS the inline script into the existing `<head>` section — it does not recreate the file. The FOUC script must be placed before the `<link rel="stylesheet">` tag that was added in Task 1 so it runs synchronously before CSS is parsed.
  - In `<head>`, after the meta tags and before `<link rel="stylesheet">`, add the single permitted inline `<script>` block:
    ```html
    <script>
      (function() {
        try {
          var t = localStorage.getItem('proto_theme');
          if (t) document.documentElement.setAttribute('data-theme', t);
        } catch(e) {}
      })();
    </script>
    ```
  - This is the ONLY inline `<script>` block; it must run synchronously before the stylesheet is parsed to prevent FOUC
  - Add `transition: background-color 200ms, color 200ms, border-color 200ms` to `:root` in `styles.css` for smooth theme transitions
  - _Requirements: 1.4, 3.2, 3.6_

- [x] 14. Checkpoint — Interactivity complete
  - Verify view switching and theme toggle work in a browser. Verify localStorage keys appear as `proto_theme` and `proto_active_view`. Ask the user if any behavior needs adjustment.

- [x] 15. Write `README.md`
  - Provide at minimum two static server commands with their local URLs:
    - `python -m http.server 8080` → open `http://localhost:8080`
    - `npx serve .` → open `http://localhost:3000`
  - List at least four design differences from the current app, one per category: (a) color palette changes, (b) layout approach changes, (c) reduced card usage, (d) typography hierarchy changes
  - Include an explicit statement that the prototype is a visual exploration only and has not been applied to the main application codebase
  - List all four browsable files/pages with one-sentence descriptions: `index.html` (the prototype), `styles.css` (all tokens and component styles), `app.js` (all interactivity and static data), `README.md` (this guide)
  - _Requirements: 1.5, 12.1, 12.2, 12.3, 12.4_

- [x] 16. Take screenshots of all four dashboards in both themes
  - Open `scratch/design-direction-preview/index.html` via `python -m http.server` at viewport 1440×900
  - For each of the four Dashboard_View (Admin, Tutor, Student, Parent) in **Light Mode**, take a full-page screenshot and save to `scratch/design-direction-preview/screenshots/`:
    - `admin-light.png`
    - `tutor-light.png`
    - `student-light.png`
    - `parent-light.png`
  - Switch to **Dark Mode** via the theme toggle and repeat for all four views:
    - `admin-dark.png`
    - `tutor-dark.png`
    - `student-dark.png`
    - `parent-dark.png`
  - Resize browser to 390px width; take one screenshot per theme showing the navigation bar and first viewport of content:
    - `mobile-light.png`
    - `mobile-dark.png`
  - Verify all 10 screenshots are saved inside `scratch/design-direction-preview/screenshots/` — not anywhere outside that directory
  - _Requirements: 1.1, 3.2, 3.5_

- [x] 17. Final verification pass
  - [x] 17.1 Run isolation check
    - Execute `git diff --name-only` from the workspace root; assert no path outside `scratch/design-direction-preview/` appears in the output
    - Verify `styles.css` contains no `@import url(../css/...)` statements
    - Verify `app.js` contains no `import` statements and no `fetch()` calls
    - _Requirements: 11.1, 11.2, 11.4, 11.6_

  - [ ]* 17.2 Write property tests for DOM structural rules — no nested cards (Property 8)
    - **Property 8: No Nested Cards Appear in Any View**
    - Generate DOM trees with card elements (border + box-shadow + border-radius) via fast-check; assert no card element is a descendant of another card element
    - **Validates: Requirements 5.1, 5.2_**

  - [ ]* 17.3 Write property tests for heading and metric size minimums (Properties 9 and 10)
    - **Property 9: Main Headings Meet the Minimum Size Across All Views** — for each view, assert the first heading's computed font-size ≥24px
    - **Property 10: Metric Numbers Meet the Minimum Size** — assert all `.stat-number` elements have computed font-size ≥32px
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 17.4 Write property test for section whitespace (Property 11)
    - **Property 11: Sections Have Sufficient Vertical Whitespace**
    - For each view, assert the gap between consecutive `<section>` elements is ≥32px
    - **Validates: Requirements 5.5**

  - [ ]* 17.5 Write property test for per-view gradient count (Property 13)
    - **Property 13: Per-Dashboard Gradient Count Is Within Limit**
    - For each view DOM, count elements whose background is a CSS gradient; assert count ≤2 per view
    - **Validates: Requirements 5.8**

- [x] 18. Final checkpoint — Prototype complete
  - Ensure all tests pass. Open the prototype at all four breakpoints (390px, 768px, 1366px, 1440px) to confirm no horizontal scroll and no layout breakage. Ask the user if any refinement is needed.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- The FOUC-prevention `<script>` in `<head>` is the only inline script permitted — all other JS must be in `app.js`
- Progress bar fill width (`style="--pct: N%"`) is the only permitted inline `style` attribute — it passes a data-driven value to a CSS rule that remains in `styles.css`
- All localStorage keys used by the prototype must start with `proto_` — never use `b2b_`, `session_`, `user_`, or `state_` prefixes
- Property tests (marked with `*`) use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations each; each test file includes a comment `// Feature: design-direction-preview, Property N: <property_text>`
- DOM structure tests (P7, P8, P14, P17) can run against the in-memory DOM using jsdom or a Playwright harness; token invariant tests (P1–P5, P18–P20) operate on parsed CSS values only
- Property tests marked with `*` that use fast-check DOM assertions (P7, P8, P14, P17) require Node.js with jsdom or a Playwright browser harness to run — they cannot run in the browser directly. Token invariant tests (P1–P5, P18–P20) operate on plain JS values and can run in any environment including the browser console. The prototype itself has no Node.js or npm dependency.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.5", "2.7", "2.9"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.6", "2.8", "2.10"] },
    { "id": 3, "tasks": ["2.4", "4.1", "5"] },
    { "id": 4, "tasks": ["4.2", "6.1", "7.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["4.3", "6.2", "7.2", "8.2", "9.2"] },
    { "id": 6, "tasks": ["6.3", "7.3", "8.3", "9.3"] },
    { "id": 7, "tasks": ["8.4", "11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3", "11.4", "12.1"] },
    { "id": 9, "tasks": ["12.2", "12.3", "12.4"] },
    { "id": 10, "tasks": ["12.5", "12.6", "12.7"] },
    { "id": 11, "tasks": ["13", "15"] },
    { "id": 12, "tasks": ["16"] },
    { "id": 13, "tasks": ["17.1"] },
    { "id": 14, "tasks": ["17.2", "17.3", "17.4", "17.5"] }
  ]
}
```
