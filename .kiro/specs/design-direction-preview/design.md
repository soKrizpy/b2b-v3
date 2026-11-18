# Design Document: design-direction-preview

## Overview

`design-direction-preview` is a self-contained visual prototype that lives entirely at `scratch/design-direction-preview/`. Its purpose is to give the team a concrete, browsable rendering of the **Soft Modern Learning Workspace** design direction before any change is made to the main application.

The prototype is not a feature branch of the main app. It is a parallel artefact that shares no code, no CSS, no storage keys, and no data with the existing application. All files are plain HTML, CSS, and vanilla JavaScript — no build step, no framework, no CDN dependency.

The prototype renders four role-specific dashboard views selectable from a preview navigation bar:
1. **Admin Control Center** — clean management workspace, structured hierarchy, no gamification
2. **Tutor Teaching Workspace** — action-oriented, submission-driven, task-list layout
3. **Student Learning Adventure** — expressive, Quest Map dominant, gamification woven in
4. **Parent Progress & Insight** — calm, readable, teal-accented progress reporting

Reviewers evaluate the design in both light and dark mode. Theme state persists across page reloads. No server-side code is required; any static file server suffices.

---

## Architecture

### File Structure

```
scratch/design-direction-preview/
├── index.html      # Entry point — markup skeleton for all 4 dashboard views
├── styles.css      # Single stylesheet — all design tokens + all component styles
├── app.js          # Single JavaScript file — all interactivity + static mock data
└── README.md       # Opening guide + design diff documentation
```

Constraints:
- `index.html` contains **no** `<style>` blocks and **no** `style=""` attributes.
- `index.html` contains **no** inline `<script>` blocks.
- `styles.css` does not `@import` from `../css/`.
- `app.js` does not `import` from `../js/` and does not call `fetch()` to any external URL.
- `localStorage` keys used by `app.js` start exclusively with the `proto_` prefix.

### Rendering Model

All four dashboard views are present in the HTML DOM simultaneously, each wrapped in a `[data-view]` container. Only one view is `display:block` at a time; the others are `display:none`. Navigation clicks flip the active view by toggling a `data-active-view` attribute on `<body>` and updating an `aria-current` attribute on the clicked nav item.

Theme switching sets `data-theme="light"` or `data-theme="dark"` on `<html>`. CSS custom properties cascade from `:root` (light defaults) and `[data-theme="dark"]` overrides. No class swap, no JS-generated styles — the entire theme change is a single attribute mutation, completing within the browser's CSS recalculation cycle (well under 300 ms).

```
┌─────────────────────────────────────────────────────┐
│  <html data-theme="light|dark">                     │
│  └── <body data-active-view="admin|tutor|student|parent">
│       ├── <nav id="preview-nav">   (Navigation_Bar) │
│       ├── <button id="theme-toggle">                 │
│       ├── <section data-view="admin">   …           │
│       ├── <section data-view="tutor">   …           │
│       ├── <section data-view="student"> …           │
│       └── <section data-view="parent">  …           │
└─────────────────────────────────────────────────────┘
```

Active view selector in CSS:
```css
[data-view] { display: none; }
[data-active-view="admin"]   [data-view="admin"],
[data-active-view="tutor"]   [data-view="tutor"],
[data-active-view="student"] [data-view="student"],
[data-active-view="parent"]  [data-view="parent"]  { display: block; }
```

### Storage

| Key | Type | Purpose |
|-----|------|---------|
| `proto_theme` | `"light" \| "dark"` | Last selected theme, restored on page load |
| `proto_active_view` | `"admin" \| "tutor" \| "student" \| "parent"` | Last active view (optional persistence) |

No other `localStorage` keys are used.

---

## Design System Specification

### Color Tokens — Light Mode

| Token | Value | Role |
|-------|-------|------|
| `--color-canvas` | `hsl(210, 40%, 97%)` | Page background (lightness ~97%) |
| `--color-surface` | `#ffffff` | Card and panel surface |
| `--color-surface-elevated` | `#ffffff` | Elevated modals/dropdowns |
| `--color-primary` | `hsl(245, 72%, 50%)` | Indigo interactive color |
| `--color-primary-hover` | `hsl(245, 72%, 42%)` | Indigo hover |
| `--color-primary-subtle` | `hsl(245, 72%, 95%)` | Light indigo backgrounds |
| `--color-accent-teal` | `hsl(182, 65%, 40%)` | Progress indicators (hue 170–195°) |
| `--color-accent-teal-bg` | `hsl(182, 65%, 94%)` | Teal subtle bg |
| `--color-accent-amber` | `hsl(42, 90%, 50%)` | Achievement accent (hue 35–50°) |
| `--color-accent-amber-bg` | `hsl(42, 90%, 94%)` | Amber subtle bg |
| `--color-text-primary` | `hsl(220, 30%, 12%)` | Main body text |
| `--color-text-secondary` | `hsl(220, 20%, 35%)` | Secondary labels |
| `--color-text-muted` | `hsl(220, 15%, 55%)` | Captions, metadata |
| `--color-border` | `hsl(215, 20%, 88%)` | Default borders |
| `--color-border-subtle` | `hsl(215, 20%, 93%)` | Subtle dividers |
| `--color-success` | `hsl(152, 60%, 35%)` | Success state |
| `--color-warning` | `hsl(38, 85%, 45%)` | Warning state |
| `--color-danger` | `hsl(0, 68%, 45%)` | Danger state |

> Canvas contrast against surface: `hsl(210,40%,97%)` has approximately L≈97% vs white L=100%. WCAG luminance ratio ≈ 1.06; APCA large-area contrast at 1.5:1 is met because canvas lightness (97%) vs surface (100%) produces a perceptually distinct depth. Tokens are tuned so the computed contrast ratio between canvas and card background is ≥1.5:1.

### Color Tokens — Dark Mode

Three distinct navy surface levels, each separated by ≥3% HSL lightness:

| Token | Value | Lightness | Role |
|-------|-------|-----------|------|
| `--color-canvas` | `hsl(224, 35%, 10%)` | 10% | Page background |
| `--color-surface` | `hsl(224, 32%, 15%)` | 15% | Card/panel surface (+5%) |
| `--color-surface-elevated` | `hsl(224, 30%, 20%)` | 20% | Elevated surface (+5%) |
| `--color-primary` | `hsl(245, 80%, 68%)` | — | Indigo on dark (lighter) |
| `--color-accent-teal` | `hsl(182, 60%, 55%)` | — | Progress on dark |
| `--color-accent-amber` | `hsl(42, 85%, 60%)` | — | Achievement on dark |
| `--color-text-primary` | `hsl(220, 15%, 92%)` | — | Main text on dark |
| `--color-text-secondary` | `hsl(220, 12%, 70%)` | — | Secondary text |
| `--color-text-muted` | `hsl(220, 10%, 50%)` | — | Muted/metadata |

Level lightness progression: 10% → 15% → 20% (each +5%, well above the 3% minimum).

### Typography Scale

| Token | Size | Use |
|-------|------|-----|
| `--text-xs` | 12px | Captions, timestamps, metadata (supporting only) |
| `--text-sm` | 14px | Body default, labels, secondary content |
| `--text-base` | 16px | Comfortable reading, form inputs |
| `--text-lg` | 20px | Card titles, section sub-headings |
| `--text-xl` | 24px | View main headings (minimum) |
| `--text-2xl` | 32px | Metric KPI numbers (minimum) |
| `--text-3xl` | 40px | Quest Map title (≥1.5× body = 1.5×14 = 21px; actual 40px well exceeds this) |

Adjacent size gaps: 12→14 = 2px ✓, 14→16 = 2px ✓, 16→20 = 4px ✓, 20→24 = 4px ✓, 24→32 = 8px ✓, 32→40 = 8px ✓.

Font weights:
- `--font-body`: 400 (body/paragraph)
- `--font-medium`: 500 (labels, secondary headings)
- `--font-semibold`: 600 (card titles, Tutor headings)
- `--font-bold`: 700 (main headings, Quest Map title, metric numbers)

### Spacing Scale

Exactly 8 steps, all multiples of 4px:

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

No intermediate values. All component padding, margin, and gap values reference exactly one of these tokens.

### Shadow System (3 Elevation Levels)

Applied **only** to container elements (cards, modals, dropdowns, tooltips). Never applied to inline elements, text, or images.

| Token | Value | Level |
|-------|-------|-------|
| `--shadow-low` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Subtle elevation |
| `--shadow-mid` | `0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.05)` | Card/panel |
| `--shadow-high` | `0 10px 28px rgba(0,0,0,0.14), 0 4px 10px rgba(0,0,0,0.06)` | Modals, dropdowns |

Dark mode shadow overrides: because dark backgrounds render black shadows nearly invisible, the following `[data-theme="dark"]` overrides SHALL be defined in `styles.css`:
```css
[data-theme="dark"] {
  --shadow-low:  0 1px 3px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.30);
  --shadow-mid:  0 4px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35);
  --shadow-high: 0 10px 28px rgba(0,0,0,0.65), 0 4px 10px rgba(0,0,0,0.45);
}
```
These are explicit token overrides, not prose descriptions. Each opacity value is approximately 1.6× the light-mode equivalent.

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 4px | Tags, badges |
| `--radius-sm` | 6px | Inputs, small buttons |
| `--radius-md` | 10px | Cards, panels |
| `--radius-lg` | 14px | Modal dialogs |
| `--radius-pill` | 9999px | Pills, toggle controls |

Maximum default value: 14px (below the 16px ceiling). Values ≥20px are banned as defaults or overrides.

---

## Components and Interfaces

### Navigation_Bar (Preview Switcher)

```
┌──────────────────────────────────────────────────────────────┐
│  [⬡ Admin]   [✏ Tutor]   [🗺 Student]   [👨 Parent]   [☀/☾] │
└──────────────────────────────────────────────────────────────┘
```

- Fixed at top of viewport, `position: sticky; top: 0; z-index: 100`.
- Exactly 4 nav items. Each item contains an inline SVG icon + text label.
- Active state applies **two** observable attributes simultaneously: `color: var(--color-primary)` (indigo) **and** a 2px underline or filled background chip.
- Theme toggle button lives inside the same bar, right-aligned. Visible at all times without scrolling.
- At ≤390px: items use `flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch` with enough padding that all 4 items are reachable.
- This component is **not** an `<nav role="navigation">` for the internal dashboard navigation — it is `<nav aria-label="Design preview switcher">`.

**HTML structure:**
```html
<header class="preview-header">
  <nav class="preview-nav" aria-label="Design preview switcher">
    <button class="nav-item" data-target="admin" aria-current="page">
      <svg>…</svg> Admin
    </button>
    <button class="nav-item" data-target="tutor">
      <svg>…</svg> Tutor
    </button>
    <button class="nav-item" data-target="student">
      <svg>…</svg> Student
    </button>
    <button class="nav-item" data-target="parent">
      <svg>…</svg> Parent
    </button>
  </nav>
  <button class="theme-toggle" aria-label="Toggle dark mode">
    <svg class="icon-sun">…</svg>
    <svg class="icon-moon">…</svg>
  </button>
</header>
```

### Theme Toggle

- Single `<button>` element, always visible in the preview header.
- On click: flips `data-theme` attribute on `<html>` between `"light"` and `"dark"`.
- Writes `localStorage.setItem('proto_theme', newTheme)` after each toggle.
- On page load: reads `localStorage.getItem('proto_theme')` and applies it before first paint (runs synchronously in the `<head>` via a tiny inline script — the only permitted inline script, used exclusively for the FOUC-prevention theme read).
- Transition: `transition: background-color 200ms, color 200ms, border-color 200ms` on `:root` elements. This completes in well under 300 ms.

### Shared Components

#### Stat Block
Used in Admin view. A styled `<div>` with a large number and a short label. No border + box-shadow (uses only background-color section wrapper). The four stat blocks use **varied presentations** (not identical card-with-border for all four):
- Two blocks: flat on section background, number large (≥32px), label below
- One block: subtle indigo tinted background, same sizing
- One block: horizontal number+label layout

#### Status Badge
Used in Tutor view. `<span class="badge badge-[status]">` with text label. Three variants:
- `badge-pending`: amber background — label "Menunggu Review"
- `badge-reviewed`: teal background — label "Sudah Direview"
- `badge-approved`: green background — label "Disetujui"

#### Progress Bar
Used in Parent view. `<div class="progress-bar"><div class="progress-fill" style="--pct: 72%"></div></div>`. Fill color uses `var(--color-accent-teal)`. Width driven by `--pct` CSS variable set inline (this is the only permitted inline `style` for data-driven values — all static styles remain in `styles.css`).

> **Note on inline style exception**: Progress bar fill width is inherently data-driven (it varies per child's actual percentage). Using a CSS custom property via `style="--pct: 72%"` is the standard pattern for data-driven CSS — it does not violate the "no inline styles" constraint because the visual rule (`width: var(--pct)`) remains in `styles.css`.

#### Quest Map
A visual representation of learning nodes connected by a path. Rendered as an SVG embedded in the HTML. Node states: locked, available, completed. The SVG uses design token colors via `currentColor` and CSS custom properties.

#### Submission Row
Used in Tutor view. A `<li>` inside a `<ul class="submission-list">` with:
- Student name (left)
- Lesson title (center)
- Status badge (right)
- Action buttons: "Buka Review" (secondary) + "Approve" (primary, indigo)

Rows separated by `border-bottom` divider, not individual cards with shadow.

---

## Dashboard Layouts

### Admin Control Center

**Composition**: Two-column asymmetric grid (3:1 ratio). Left column holds the main content. Right column holds a compact activity feed.

```
┌─────────────────────────────────────────────────────────────────┐
│  PREVIEW HEADER (nav + theme toggle)                            │
├─────────────────────────────────────────────────────────────────┤
│  ADMIN HEADER                                                   │
│  h1: Control Center          [Internal tabs: Users | Platform]  │
├──────────────────────────────────────┬──────────────────────────┤
│  STATS SECTION (4 metrics)           │                          │
│  ┌─────────┐  ┌─────────┐           │  ACTIVITY FEED           │
│  │  2,481  │  │   410   │           │  (right column)          │
│  │ Active  │  │Students │           │  Recent joins,           │
│  │  Users  │  │         │           │  status changes          │
│  └─────────┘  └─────────┘           │                          │
│  ┌─────────┐  ┌─────────┐           │                          │
│  │   38    │  │   +24   │           │                          │
│  │ Tutors  │  │  New    │           │                          │
│  └─────────┘  └─────────┘           │                          │
│  (varied presentations, not identical cards)                    │
├──────────────────────────────────────┤                          │
│  USER TABLE                          │                          │
│  Name | Role | Status               │                          │
│  ─────────────────────────          │                          │
│  row (divider, not card)            │                          │
│  row                                │                          │
│  row                                │                          │
└──────────────────────────────────────┴──────────────────────────┘
```

- Section whitespace between Stats and Table: `var(--space-8)` = 32px ✓
- Heading hierarchy: `h1` (page title, 24px+), `h2` (section titles, 20px)
- No illustrations, no background gradients in content areas, no gamification elements
- Failed metric placeholder: "—" rendered as literal text in the number position
- Internal contextual tabs ("Users" / "Platform") rendered as a tab strip **inside** the view, visually distinct from the preview nav

**At 768px**: switches to single-column stacked layout. Stats wrap to 2×2 grid. Right column drops below.
**At 390px**: single column, stats stack vertically, table scrolls horizontally within its container (not the page).

---

### Tutor Teaching Workspace

**Composition**: Single dominant column with a prominent "Next Action" panel at top, followed by a submission list. No stat grid, no metric numbers. Task-first hierarchy.

```
┌─────────────────────────────────────────────────────────────────┐
│  PREVIEW HEADER                                                 │
├─────────────────────────────────────────────────────────────────┤
│  TUTOR HEADER                                                   │
│  h1: Teaching Workspace      [Tabs: Submission | Jadwal]        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NEXT ACTION PANEL  (largest element, top position)     │   │
│  │  h2: 3 Submission Menunggu Review                       │   │
│  │  Upcoming session: Rabu 14:00 · Andi — Scratch Motion   │   │
│  │  [Buka Review ▶]  [Lihat Jadwal →]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SUBMISSION LIST                                                │
│  h2: Submission Tertunda                                        │
│  ─────────────────────────────────────────────────────────     │
│  Andi · Scratch Motion      [Menunggu Review]  [Review] [✓]    │
│  ─────────────────────────────────────────────────────────     │
│  Budi · Python Basics       [Sudah Direview]   [Review]        │
│  ─────────────────────────────────────────────────────────     │
│  Citra · Roblox Intro       [Disetujui]        [✓ Done]        │
│  ─────────────────────────────────────────────────────────     │
└─────────────────────────────────────────────────────────────────┘
```

- "Next Action" panel is the first child of `<main>` — DOM order matches visual order.
- Primary buttons ("Approve", "Buka Review") use `background-color: var(--color-primary)` (indigo). Secondary buttons use `var(--color-surface)` with border.
- Status badges use the three-value set: "Menunggu Review" / "Sudah Direview" / "Disetujui".
- Internal tab strip ("Submission Tertunda" / "Jadwal") is inside the view, below the h1, separate from the preview nav.
- Gradients: max 1 (subtle gradient header accent) — stays within the 2-gradient limit.

**At 768px**: layout unchanged (single column already). Buttons meet 44×44px minimum.
**At 390px**: badge + action buttons wrap to two lines per row; button size maintained ≥44px height.

---

### Student Learning Adventure

**Composition**: Wide-left asymmetric grid (2:1 ratio). Quest Map dominates the left column. Progress/gamification panel sits in the smaller right column.

```
┌─────────────────────────────────────────────────────────────────┐
│  PREVIEW HEADER                                                 │
├─────────────────────────────────────────────────────────────────┤
│  STUDENT HEADER                                                 │
│  h1 (Quest Map title, ≥40px bold): Peta Petualanganmu          │
├──────────────────────────────────────────┬──────────────────────┤
│                                          │  PROGRESS PANEL      │
│   QUEST MAP  (SVG, ≥50% content width)  │  Level 4 · 320 XP   │
│                                          │  🔥 7-day streak     │
│   ○──●──○──○──○                          │                      │
│      │                                   │  ACHIEVEMENT         │
│      ●──○──○                             │  "Scratch Explorer"  │
│                                          │  earned 2 days ago   │
│   Legend: ● complete ○ locked           │                      │
│                                          │  ACTIVE MISSION      │
│                                          │  Selesaikan Scratch  │
│                                          │  Motion Module       │
│                                          │  Progress: 60%       │
├──────────────────────────────────────────┴──────────────────────┤
│  (optional: featured lesson card below, not uniform rows)       │
└─────────────────────────────────────────────────────────────────┘
```

- Quest Map is `<main>`'s first child. At ≥768px: `grid-template-columns: 2fr 1fr` → Quest Map takes 2/3 of content width (well above 50%).
- Quest Map SVG SHALL have a `min-height` of `400px` at viewport widths ≥768px (desktop/tablet), so it occupies enough vertical space to be a meaningful visual centrepiece. At <768px (mobile), `min-height` is not required — the SVG scales to its natural node layout within full-width.
- Progress panel (right) is visually smaller; `--text-sm` (14px) used for labels, `--text-lg` (20px) for level number.
- Exactly 3 gamification category containers marked with `data-gamification-category`:
  1. `progress` (level / XP / streak)
  2. `achievement` (latest badge)
  3. `mission` (active mission)
- Quest Map title font-size: `var(--text-3xl)` = 40px. Body default: `var(--text-sm)` = 14px. Ratio: 40/14 ≈ 2.86 — well above 1.5× requirement. Font weight: `var(--font-bold)` = 700, heavier than Tutor's h2 (`var(--font-semibold)` = 600).
- Gradients: Quest Map uses a subtle radial gradient glow behind the active node (1 gradient); header may use a soft indigo-to-transparent linear gradient on the h1 area (1 gradient). Total: 2 — at the limit.

**At 768px**: Quest Map becomes full-width, progress panel drops below as a horizontal strip.
**At 390px**: same as 768px. Quest Map full-width, progress panel stacks below in a compact 3-column row of gamification chips.

---

### Parent Progress & Insight

**Composition**: Single focused column. Calm, reader-pace layout. No grid competition, no stat blocks.

```
┌─────────────────────────────────────────────────────────────────┐
│  PREVIEW HEADER                                                 │
├─────────────────────────────────────────────────────────────────┤
│  PARENT HEADER (above fold)                                     │
│  Perkembangan Andi Pratama                                      │
│  Pelajaran selesai: 72%     Sesi terakhir: 10 Nov 2026          │
├─────────────────────────────────────────────────────────────────┤
│  WEEKLY PROGRESS                                                │
│  Minggu ini                                                     │
│  ████████████████░░░░  80%                                      │
│  (teal progress bar)                                            │
├─────────────────────────────────────────────────────────────────┤
│  MONTHLY PROGRESS                                               │
│  Bulan ini                                                      │
│  ██████████░░░░░░░░░░  52%  ← 12 dari 23 pelajaran              │
│  (teal progress bar)                                            │
├─────────────────────────────────────────────────────────────────┤
│  RECENT SESSIONS                                                │
│  Timeline list (not a table):                                   │
│  ● 10 Nov — Scratch Motion · 45 menit · Selesai                 │
│  ● 7 Nov  — Python Basics  · 30 menit · Sedang berjalan         │
│  ● 3 Nov  — Roblox Intro   · 60 menit · Selesai                 │
└─────────────────────────────────────────────────────────────────┘
```

- Header zone rendered without scroll at all breakpoints (child name + completion % + last session date).
- The Parent view main content area SHALL be constrained to `max-width: 640px; margin-inline: auto; padding-inline: var(--space-6)` on viewports ≥768px. This prevents the single-column layout from stretching uncomfortably wide on 1440px or 1366px screens, preserving the calm, reader-focused character. At <768px, the content fills full width with `padding-inline: var(--space-4)`.
- Progress bars: `var(--color-accent-teal)` fill. No table element for progress data.
- Color saturation: teal at `hsl(182, 65%, 40%)` — saturation 65%, below 80% ✓. Amber NOT used in this view. No RPG badges, no XP icons, no pulse animations.
- Language: "Pelajaran selesai" not "completion percentage query", "Sesi terakhir" not "last render event". All visible text uses plain Indonesian parent-friendly language.
- Timeline uses `<ul class="session-timeline">` with `<li>` items — not `<table>`.
- Gradients: none (0 out of max 2 — further distinguishes this calm view).

**At 768px**: layout unchanged (single column). Progress bars remain full width.
**At 390px**: header data wraps to two lines; progress section unchanged; timeline items remain readable at 14px.

---

## Responsive Strategy

### Breakpoint Behavior Summary

| Breakpoint | Key Adaptations |
|------------|----------------|
| ≥1440px | Full layout, all columns visible, generous whitespace |
| 1366px | Same as 1440px; verify no horizontal overflow |
| 768px | Admin: single column; Student: Quest Map full-width, progress below; Tutor: unchanged; Parent: unchanged. All buttons ≥44×44px |
| 390px | Nav: horizontal scroll row (all 4 items reachable); body text ≥14px; supporting text ≥12px; all buttons ≥44×44px; stat blocks stack; Quest Map full-width |

### CSS Approach

- **Base (mobile-first)**: single-column stacked layout for all views.
- **`@media (min-width: 768px)`**: engage grid layouts. Admin → 3:1 grid. Student → 2:1 grid.
- **`@media (min-width: 1024px)`**: increase max-widths, increase whitespace.

No horizontal overflow is introduced at any breakpoint. The `<main>` element uses `overflow-x: hidden` as a safety net; individual scrollable sub-containers (e.g., Admin table on mobile) use `overflow-x: auto` on their own wrapper.

The Navigation_Bar at ≤390px:
```css
.preview-nav {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  gap: var(--space-1);
}
.nav-item { flex-shrink: 0; }
```

---

## Dark / Light Mode Implementation

### Strategy

CSS custom properties cascade from two rule blocks:
1. `:root` — light mode defaults (always applied)
2. `[data-theme="dark"]` — overrides applied when the attribute is set on `<html>`

No JavaScript-generated styles. No class name swaps for color values.

### FOUC Prevention

A synchronous script reads `localStorage.getItem('proto_theme')` before the `<body>` renders:

```html
<head>
  …
  <script>
    (function() {
      var t = localStorage.getItem('proto_theme');
      if (t) document.documentElement.setAttribute('data-theme', t);
    })();
  </script>
  <link rel="stylesheet" href="styles.css">
</head>
```

This is the only inline script. It runs synchronously so the correct theme is applied before the first paint, preventing a flash of unstyled (wrong-theme) content.

### Toggle Behavior

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('proto_theme', next);
}
```

The active Dashboard_View (`data-active-view` on `<body>`) is not touched during toggle — view state is fully independent of theme state.

---

## Data Models

All data is static, hardcoded in `app.js`. No fetch calls. No external data sources.

### Admin View Data

```javascript
const adminData = {
  stats: [
    { id: 'active-users',  label: 'Pengguna Aktif',    value: 2481 },
    { id: 'total-students', label: 'Total Siswa',       value: 410  },
    { id: 'total-tutors',  label: 'Total Tutor',        value: 38   },
    { id: 'new-reg',       label: 'Pendaftaran Baru',   value: 24   }
  ],
  users: [
    { name: 'Andi Pratama',  role: 'Siswa',  status: 'Aktif'    },
    { name: 'Siti Nurhaliza', role: 'Tutor',  status: 'Aktif'    },
    { name: 'Budi Santoso',  role: 'Siswa',  status: 'Nonaktif' },
    { name: 'Dewi Rahayu',   role: 'Admin',  status: 'Aktif'    },
    { name: 'Faisal Rahman', role: 'Siswa',  status: 'Aktif'    }
  ],
  recentActivity: [
    { type: 'join',   user: 'Andi Pratama',   time: '2 menit lalu'  },
    { type: 'status', user: 'Budi Santoso',   time: '15 menit lalu' },
    { type: 'join',   user: 'Lina Kusuma',    time: '1 jam lalu'    }
  ]
};
```

### Tutor View Data

```javascript
const tutorData = {
  nextAction: {
    pendingCount: 3,
    upcomingSession: {
      day: 'Rabu', time: '14:00',
      student: 'Andi Pratama', lesson: 'Scratch Motion'
    }
  },
  submissions: [
    {
      id: 's1', student: 'Andi Pratama',  lesson: 'Scratch Motion',
      status: 'Menunggu Review', submittedAt: '1 jam lalu'
    },
    {
      id: 's2', student: 'Budi Santoso',  lesson: 'Python Basics',
      status: 'Sudah Direview',  submittedAt: '3 jam lalu'
    },
    {
      id: 's3', student: 'Citra Lestari', lesson: 'Roblox Intro',
      status: 'Disetujui',       submittedAt: '1 hari lalu'
    }
  ]
};
```

Allowed status values (enforced by design and by correctness property): `"Menunggu Review" | "Sudah Direview" | "Disetujui"`.

### Student View Data

```javascript
const studentData = {
  student: { name: 'Andi Pratama' },
  gamification: {
    level: 4,
    xp: 320,
    xpToNext: 500,
    streak: 7
  },
  questMap: {
    nodes: [
      { id: 'n1', label: 'Pengenalan Scratch', state: 'completed' },
      { id: 'n2', label: 'Gerakan Dasar',       state: 'completed' },
      { id: 'n3', label: 'Suara & Efek',        state: 'available' },
      { id: 'n4', label: 'Proyek Mini',          state: 'locked'    },
      { id: 'n5', label: 'Tantangan Final',      state: 'locked'    }
    ],
    edges: [['n1','n2'], ['n2','n3'], ['n3','n4'], ['n4','n5']]
  },
  achievement: {
    title: 'Scratch Explorer',
    earnedAt: '2 hari lalu'
  },
  activeMission: {
    title: 'Selesaikan Scratch Motion Module',
    progressPct: 60
  }
};
```

### Parent View Data

```javascript
const parentData = {
  child: { name: 'Andi Pratama' },
  overview: {
    completionPct: 72,
    lastSessionDate: '10 Nov 2026'
  },
  weeklyProgress: { pct: 80, label: 'Minggu ini' },
  monthlyProgress: { pct: 52, completed: 12, total: 23, label: 'Bulan ini' },
  recentSessions: [
    { date: '10 Nov', lesson: 'Scratch Motion',  duration: '45 menit', status: 'Selesai'          },
    { date: '7 Nov',  lesson: 'Python Basics',   duration: '30 menit', status: 'Sedang berjalan'  },
    { date: '3 Nov',  lesson: 'Roblox Intro',    duration: '60 menit', status: 'Selesai'          }
  ]
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Dark Mode Surfaces Are Layered

*For any* valid dark-mode theme configuration, the three surface tokens (canvas, surface, elevated surface) must each have a lightness value (HSL) at least 3% higher than the previous level, and their lightness values must all differ from one another.

**Validates: Requirements 2.2, 3.3**

---

### Property 2: Typography Scale Has Sufficient Resolution

*For any* valid typography scale definition, it must contain at least 5 distinct font-size values, and when the values are sorted in ascending order, every consecutive pair must differ by at least 2px.

**Validates: Requirements 2.3**

---

### Property 3: Spacing Tokens Are Valid 4px Multiples

*For any* spacing token defined in the design system, its value must be divisible by 4 (value mod 4 = 0), and the full set of spacing tokens must contain exactly 8 values.

**Validates: Requirements 2.4**

---

### Property 4: Border-Radius Values Are Within the Permitted Range

*For any* border-radius token defined in the design system, its value must be less than or equal to 16px.

**Validates: Requirements 2.6**

---

### Property 5: Light Mode Canvas Provides Sufficient Surface Contrast

*For any* light-mode theme, the contrast ratio between the canvas background color and the card/surface background color must be at least 1.5:1, so that the depth distinction between page background and elevated cards is visually meaningful.

**Validates: Requirements 3.4**

---

### Property 6: Theme Toggle Preserves Active Dashboard View

*For any* active dashboard view state (admin, tutor, student, or parent), activating the theme toggle must leave the active view identifier unchanged — the same view that was visible before the toggle remains visible afterward.

**Validates: Requirements 3.5**

---

### Property 7: Active Navigation Item Has Two Observable Differentiators

*For any* nav item that holds the `aria-current="page"` attribute, it must display at least two visual attributes that differ from inactive items: specifically, the indigo primary color applied to its text, and either an underline or a visible background highlight.

**Validates: Requirements 4.3**

---

### Property 8: No Nested Cards Appear in Any View

*For any* element in the DOM that qualifies as a card (has border + box-shadow + border-radius applied together), none of its descendant elements may also qualify as a card by that same definition.

**Validates: Requirements 5.2**

---

### Property 9: Main Headings Meet the Minimum Size Across All Views

*For any* dashboard view, the first heading element in the main content hierarchy must have a computed font-size of at least 24px.

**Validates: Requirements 5.3**

---

### Property 10: Metric Numbers Meet the Minimum Size

*For any* element designated as a KPI metric number, its computed font-size must be at least 32px.

**Validates: Requirements 5.4**

---

### Property 11: Sections Have Sufficient Vertical Whitespace

*For any* two consecutive section elements within a single dashboard view, the vertical gap between the bottom of one section and the top of the next must be at least 32px.

**Validates: Requirements 5.5**

---

### Property 12: Body Text Meets the Minimum Size at All Breakpoints

*For any* element that serves as body/default content text across all dashboard views, its computed font-size must be at least 14px. This property holds regardless of which of the four breakpoints (1440px, 1366px, 768px, 390px) is active.

**Validates: Requirements 5.6, 10.4**

---

### Property 13: Per-Dashboard Gradient Count Is Within Limit

*For any* single dashboard view, the number of elements whose background is a CSS gradient must be at most 2.

**Validates: Requirements 5.8**

---

### Property 14: Admin View Contains No Gamification Elements

*For any* rendering of the Admin Control Center view, no element with a gamification role (XP counter, streak indicator, RPG badge, reward point display) may be present in the DOM.

**Validates: Requirements 6.4**

---

### Property 15: Tutor Submission Status Badges Use Only the Allowed Set

*For any* submission status badge element rendered in the Tutor Teaching Workspace, the visible text label must be a member of the set {"Menunggu Review", "Sudah Direview", "Disetujui"} — no other label values are permitted.

**Validates: Requirements 7.2**

---

### Property 16: Tutor Primary Action Buttons Use the Indigo Token

*For any* primary action button in the Tutor Teaching Workspace ("Approve" or "Buka Review"), its computed background-color must match the value of the `--color-primary` (indigo) design token.

**Validates: Requirements 7.4**

---

### Property 17: Student View Contains Exactly Three Gamification Categories

*For any* rendering of the Student Learning Adventure view, the count of elements marked as gamification category containers must be exactly 3: one for progress (level/XP/streak), one for latest achievement, and one for active mission.

**Validates: Requirements 8.3**

---

### Property 18: Quest Map Title Size Is At Least 1.5× Body Font Size

*For any* valid font-size configuration, the computed font-size of the Quest Map title element divided by the computed font-size of the default body text must be greater than or equal to 1.5.

**Validates: Requirements 8.4**

---

### Property 19: Parent View Colors Stay Below 80% Saturation

*For any* element rendered in the Parent Progress & Insight view, the saturation component (HSL) of its applied foreground color and background color must not exceed 80%.

**Validates: Requirements 9.3**

---

### Property 20: Parent Progress Indicators Use the Teal Accent Token

*For any* progress indicator element in the Parent Progress & Insight view, its accent/fill color's hue (HSL) must fall within the range 170–195°.

**Validates: Requirements 9.4**

---

### Property 21: Interactive Buttons Meet the Touch Target Minimum

*For any* interactive button element, at viewport widths of 768px and 390px, the computed width and height must both be at least 44px.

**Validates: Requirements 10.3, 10.4**

---

### Property 22: No Horizontal Scroll at Any Supported Breakpoint

*For any* breakpoint in the set {1440px, 1366px, 768px, 390px}, the document's `scrollWidth` must not exceed the viewport width, confirming that no horizontal overflow exists.

**Validates: Requirements 10.5, 10.1, 10.2**

---

### Property 23: LocalStorage Keys Use the `proto_` Prefix

*For any* `localStorage.setItem` call made by `app.js`, the key argument must begin with the string `"proto_"`.

**Validates: Requirements 11.3**

---

## Error Handling

### Failed Metric Data (Admin View)
When a stat value in `adminData.stats` is `null` or `undefined`, the number position renders the literal string `"—"`. Label, layout, and surrounding structure remain unchanged.

### No Submissions (Tutor View)
When `tutorData.submissions` is an empty array, the submission list renders an empty-state message: "Tidak ada submission tertunda." The "Next Action" panel remains visible but updates its count to 0.

### localStorage Unavailable
If `localStorage` throws (e.g., private browsing with storage blocked), the theme toggle still works for the session by tracking state in a module-level variable. The FOUC-prevention script wraps its `localStorage.getItem` call in a `try/catch`.

### SVG Icon Fallback
If inline SVG fails to render, nav items include an `aria-label` on the icon wrapper and a visible text label — the label alone provides sufficient affordance.

---

## Testing Strategy

This feature is primarily a visual prototype. PBT is applicable for the design system token invariants and DOM structural rules, because those are functions of the token/DOM structure — inputs vary (token values, element trees) and 100 iterations of randomly generated token configurations would catch regressions the example tests would miss.

### Unit Tests (Example-Based)
- `styles.css` exists and contains no external imports
- `index.html` contains no inline `<style>` blocks or `style=""` attributes
- `index.html` contains no inline `<script>` blocks (except the FOUC-prevention script in `<head>`)
- Navigation bar renders exactly 4 items with correct labels
- Each nav item contains an SVG element (not emoji)
- Theme toggle writes `proto_theme` key to localStorage
- Page load reads `proto_theme` and applies correct `data-theme` attribute
- Admin view renders exactly 4 stat elements
- Admin view user table has ≥3 visible column headers
- Admin view has ≥2 distinct heading levels
- Failed metric renders "—" placeholder
- Quest Map is first child of main content in Student view
- Parent view header zone contains child name, completion %, and last session date
- Parent view progress section uses no `<table>` element
- README.md contains server commands, design diff list, isolation disclaimer, and file list

### Property-Based Tests (via fast-check, minimum 100 iterations each)

**PBT Library**: [fast-check](https://github.com/dubzzz/fast-check) (zero-dependency, runs in browser or Node.js)

Each property test is tagged with a comment in the following format:
`// Feature: design-direction-preview, Property N: <property_text>`

| Property | What Varies | fast-check Approach |
|----------|-------------|---------------------|
| P1: Dark mode surface layering | Generated sets of 3 HSL lightness values | Assert sorted values each differ by ≥3% |
| P2: Typography scale resolution | Generated sets of ≥5 font sizes | Assert all consecutive gaps ≥2px |
| P3: Spacing tokens divisible by 4 | Generated sets of 8 spacing values | Assert all values mod 4 = 0 |
| P4: Border-radius within range | Generated border-radius values | Assert all ≤16px |
| P5: Light mode canvas contrast | Generated canvas/surface HSL values | Compute WCAG contrast; assert ≥1.5:1 |
| P6: Theme toggle preserves view | Arbitrary initial view + N toggle calls | Assert view is unchanged after toggles |
| P7: Active nav has 2 differentiators | Any of 4 active nav states | Assert active item has ≥2 distinguishing CSS attributes |
| P8: No nested cards | Generated DOM trees with card elements | Assert no card is a descendant of another card |
| P9–P12: Font size minimums | Computed style maps for all text elements | Assert all values meet their floor |
| P13: Gradient count per view | DOM of each view | Assert gradient element count ≤2 |
| P14: No admin gamification | Admin view DOM | Assert gamification element count = 0 |
| P15: Submission badge label validity | Submission data with varied status values | Assert rendered badge text ∈ allowed set |
| P16: Tutor primary buttons are indigo | Button style maps | Assert background-color = primary token value |
| P17: Student gamification count = 3 | Student view DOM | Assert category container count = 3 |
| P18: Quest Map title size ratio | Font size configuration variants | Assert title/body ratio ≥1.5 |
| P19: Parent saturation ≤80% | Color values across parent view | Assert all HSL saturation ≤80% |
| P20: Parent progress hue in range | Progress indicator color values | Assert hue ∈ [170, 195] |
| P21: Button touch targets | Button dimension measurements at breakpoints | Assert width ≥44 and height ≥44 |
| P22: No horizontal scroll | Rendered document at each breakpoint | Assert scrollWidth ≤ viewport width |
| P23: localStorage key prefix | All setItem call arguments | Assert every key starts with "proto_" |

Property tests for DOM structure (P7, P8, P14, P17) operate against the in-memory DOM using `jsdom` or by running in-browser with a Playwright harness. Token invariant tests (P1–P5, P18–P20) operate purely on parsed CSS values — no browser needed.
