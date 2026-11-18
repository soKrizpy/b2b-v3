# Design Direction Preview: Soft Modern Learning Workspace

## Overview

This prototype explores a new design direction for B2B Learning Engine called **"Soft Modern Learning Workspace"** before any changes are applied to the main application.

The design addresses current visual limitations (rigid layout, excessive cards, weak hierarchy, monochromatic structure) by introducing a spacious, breathable, and expressive design language with distinct character for each role-specific dashboard.

**Status**: Exploration & Review. Not yet integrated into the main application.

---

## Quick Start

### Option 1: Python HTTP Server (Built-in)

```bash
cd scratch/design-direction-preview
python -m http.server 8000
```

Then open your browser to: **http://localhost:8000**

### Option 2: NPX Serve (Requires Node.js)

```bash
cd scratch/design-direction-preview
npx serve
```

Follow the on-screen instructions to access the prototype.

---

## Design Differences from Current Application

The prototype implements the following observable changes:

### 1. **Color System & Theme Handling**
- **Light Mode**: Soft neutral canvas (97% lightness) with white surfaces and indigo primary accent
- **Dark Mode**: Layered navy surfaces (10% → 15% → 20% lightness) with increased shadow opacity for depth
- **Smooth Transitions**: 200ms theme switch with CSS custom properties (no jarring color flips)
- **Current App**: Flat color schemes without depth layering; abrupt theme toggles

### 2. **Reduced Card Dependency**
- **New**: Only elevated containers (modals, dropdowns) use full card styling (border + shadow + radius)
- **Section Backgrounds**: Use surface color or transparent with strategic borders and shadows
- **Layout Variation**: Admin uses flat stat blocks, horizontal cards; Tutor uses divider rows; Student/Parent use clean sections
- **Current App**: Every content block is a card with identical styling (monotonous, heavy visual weight)

### 3. **Hierarchy & Typography**
- **Type Scale**: 7-step scale (12px–40px) with ≥2px gaps ensuring visual separation
- **Heading Sizes**: Main titles 24px (h1), section titles 20px (h2), body 14px
- **Weight Variation**: 400/500/600/700 for body/labels/headings/emphasis
- **Quest Map Title**: 40px bold indigo (1.5× larger than body)
- **Current App**: Limited type scale; insufficient contrast between hierarchy levels

### 4. **Composition & Layout Variation**
- **Admin**: 3:1 asymmetric grid (main content + activity sidebar)
- **Tutor**: Centered single column with Next Action panel first
- **Student**: 2:1 asymmetric grid (Quest Map dominant on left, gamification panel on right)
- **Parent**: Centered max-width 640px single column (calm, readable)
- **Current App**: Identical template for all roles; doesn't reflect different user needs

### 5. **Whitespace & Breathing Room**
- **Vertical Spacing**: 32px gaps between major sections (var(--space-8))
- **Horizontal Padding**: 24px–64px depending on viewport and role
- **Card Padding**: 24px internal breathing room (vs. cramped current design)
- **Grid Gaps**: 24px–32px between columns and sections
- **Current App**: Minimal whitespace; content feels compressed and dense

### 6. **Icon Consistency**
- **Font Awesome 6.4.0**: All nav items, action buttons, and UI affordances use consistent iconography
- **Icon Sizes**: Responsive to container (14px–24px range)
- **Semantic**: Icons chosen to reflect role (admin = chart, tutor = board, student = map, parent = person)
- **Current App**: Mixed emoji/text; inconsistent icon sources

---

## Prototype Contents

| File | Purpose |
|------|---------|
| `index.html` | HTML markup — all four dashboard views, preview header, theme toggle |
| `styles.css` | Complete CSS — design tokens, component styles, responsive rules |
| `app.js` | JavaScript — view switching, theme persistence, interactivity |
| `README.md` | This file — overview, usage, design notes |

---

## Features

- ✅ **Four Role-Specific Dashboards**: Admin, Tutor, Student, Parent
- ✅ **Light & Dark Themes**: Smooth CSS-based switching with localStorage persistence
- ✅ **No FOUC** (Flash of Unstyled Content): Synchronous theme read on page load
- ✅ **Responsive**: Tested at 1440px, 1366px, 768px, and 390px viewports
- ✅ **Completely Isolated**: Zero dependencies on main application code
- ✅ **No Build Step**: Plain HTML, CSS, vanilla JavaScript
- ✅ **Font Awesome Integration**: Consistent iconography across all UI elements
- ✅ **Accessibility Ready**: Semantic HTML, ARIA labels, keyboard navigation support

---

## Design Tokens (CSS Custom Properties)

All styling uses design tokens defined in `:root` and `[data-theme="dark"]`:

- **Colors**: Canvas, surface (3 levels), primary (indigo), accents (teal, amber), text (3 levels), semantic (success, warning, danger)
- **Typography**: 7-point scale (12px–40px), 4 font weights (400, 500, 600, 700)
- **Spacing**: 8-step scale, 4px multiples (4px–64px)
- **Shadows**: 3 elevation levels + dark mode 1.6× opacity overrides
- **Border Radius**: 4px–16px range, pill variant

---

## Important Notes

### This is an Exploration, Not Implementation

This prototype is **not yet merged** into the main B2B Learning Engine application. It is a visual direction study for review and feedback.

**No Main Application Files Were Modified**:
- ✓ Original `index.html`, `teacher.html`, `student.html`, `parent.html` are unchanged
- ✓ Original CSS in `css/` directory is not modified
- ✓ Original JavaScript in `js/` directory is not affected
- ✓ No changes to database, Supabase, or backend services
- ✓ No new npm dependencies added

The prototype lives exclusively in `scratch/design-direction-preview/` and can be deleted without affecting the running application.

### LocalStorage Keys

This prototype uses only:
- `proto_theme` — theme preference ("light" or "dark")
- `proto_active_view` — currently active dashboard view (optional)

No other localStorage keys are read or written.

---

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (all recent versions)
- **CSS**: CSS custom properties (`--var-name`), Grid, Flexbox, SVG
- **JavaScript**: ES5+ (vanilla, no transpilation needed)
- **Mobile**: Tested responsive behavior on iOS Safari and Chrome Mobile

---

## Feedback & Next Steps

After reviewing this prototype, consider:

1. **Design Approval**: Does the "Soft Modern Learning Workspace" direction feel right?
2. **Role Differentiation**: Does each dashboard feel distinct and purposeful?
3. **Visual Hierarchy**: Is hierarchy clearer than the current design?
4. **Responsiveness**: Does the layout adapt well to different screen sizes?
5. **Theme Switching**: Is the dark mode readable and visually cohesive?
6. **Icon Choices**: Are Font Awesome icons appropriate for each role?

---

## License & Attribution

This prototype is part of the B2B Learning Engine project. All content is proprietary.

**Design Direction**: "Soft Modern Learning Workspace"  
**Exploration Date**: November 2026  
**Status**: Review Phase
