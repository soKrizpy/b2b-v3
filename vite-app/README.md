# Bits2Bytes — Vite + React + TypeScript

This is the new React-based frontend track for Bits2Bytes Learning Engine.

## Run locally

Requirements: Node.js 20 or newer.

```bash
cd vite-app
npm install
npm run dev
```

Open http://localhost:5173.

## Available scripts

- `npm run dev` — start the Vite development server.
- `npm run typecheck` — run TypeScript checks.
- `npm run build` — type-check and create a production build.
- `npm run preview` — preview the production build locally.

## Migration rules

- The root-level Vanilla application remains unchanged and is the visual/behavioral reference.
- Existing design-token and component CSS files are imported from the legacy project.
- This app currently contains the first React vertical slice: the role-selection portal and theme toggle.
- Role workspaces are not considered migrated until their actual workflows, data behavior, accessibility, and responsive states are ported and tested.
- No production Supabase connection is configured.
