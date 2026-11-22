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

Before starting the app, copy `.env.example` to `.env.local` and set the existing Bits2Bytes Supabase project URL and its browser-safe publishable key. Never put a Supabase secret or `service_role` key in a `VITE_` variable.

## Available scripts

- `npm run dev` — start the Vite development server.
- `npm run typecheck` — run TypeScript checks.
- `npm run build` — type-check and create a production build.
- `npm run preview` — preview the production build locally.

## Migration rules

- The root-level Vanilla application remains unchanged and is the visual/behavioral reference.
- Existing design-token and component CSS files are imported from the legacy project.
- The React portal uses the existing Bits2Bytes Supabase Auth accounts. The authenticated profile role determines whether Admin, Tutor, or Student Workspace opens.
- Admin, Tutor, and Student are the only top-level workspaces. Parent Hub belongs inside Student Workspace and will provide a dedicated parent-facing area for per-session reports, monthly evaluations, and invoice history. It is not a separate parent login or role. Workspaces are not considered migrated until their actual workflows, data behavior, access controls, accessibility, and responsive states are ported and tested.
- Supabase Auth is configured through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; no privileged key is shipped to the browser.
- Workspace domain data is still being migrated incrementally from local-demo repositories. A successful Supabase login does not mean all workspace data has moved to production storage.
