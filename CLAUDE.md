# ESTI — agent instructions

ESTI is an Architectural Office Resource Management System (AORMS) for Indian
architecture practices, by Holagundi Consulting Works.

Monorepo (pnpm workspaces): `packages/contracts`, `backend` (Fastify + tRPC +
Drizzle), `frontend` (React + Vite), plus a Python `worker`. Services run via
podman (`compose.yaml`).

## UI / design system — PURE CARBON ONLY

**The frontend must use ONLY the IBM Carbon Design System. No custom UI
elements.**

- Build every screen from `@carbon/react` components (`Grid`, `Column`,
  `Tile`/`ClickableTile`, `Tag`, `ProgressBar`, `Stack`, `Tabs`, `Modal`,
  `Select`, `DataTable`, `Button`, etc.), `@carbon/icons-react`, and
  `@carbon/pictograms-react`.
- Use Carbon's **2x Grid** (`Grid` + `Column`, 16 / 8 / 4 columns) for layout.
- Use Carbon design tokens (`--cds-*`) for any colour — never hard-coded hex.
- **Do not** write custom CSS classes, custom keyframe animations, bespoke
  colour palettes, hand-rolled bars/cards, or inline decorative styling
  (font-size, colours, shadows, gradients). For progress/quantities use Carbon
  `ProgressBar`; for status use `Tag`; for spacing use `Stack`.
- The only permitted non-Carbon CSS is **structural and colourless** — e.g.
  `.esti-fill { height: 100% }` so a Tile fills its Grid Column. No visual
  styling in custom CSS.
- Prefer semantic HTML (`h1`–`h4`, `p`) inside Carbon containers over styled
  `div`s. Let Carbon/Plex typography apply.
- Keep `styles.scss` minimal: the `@carbon/react` import (with the IBM Plex CDN
  `$font-path`), the viewport min-height fix, the drawing-viewer SVG rule, and
  the colourless structural helpers only.

When in doubt, reach for an existing Carbon component before inventing markup.

## Dev / verify loop

- Source for `backend` is bind-mounted but `tsx watch` does not reload across
  the VM mount — `podman restart esti-backend` after backend changes.
- `frontend` runs in the `esti-frontend` container (Vite at
  `http://localhost:5173`); typecheck/lint inside it:
  `podman exec esti-frontend sh -lc "cd /app/frontend && pnpm exec tsc -p tsconfig.json --noEmit"`
  and `pnpm exec eslint <files>`.
- After editing `packages/contracts`, rebuild it in the relevant container
  (`cd /app/packages/contracts && pnpm build`).
- Quick render check: `GET http://localhost:5173/src/<path>` should return 200.
- Migrations live in `backend/drizzle/`; generate with drizzle-kit, copy the
  `.sql` + `meta/` into the container, applied on boot by `runMigrations()`.

## Conventions

- Money is stored/handled in integer **paise**; format with `formatINR` /
  `formatINRShort`.
- Permissions/capabilities live in `packages/contracts/src/permissions.ts`
  (`can(role, capability)`); procedure tiers in `backend/src/trpc/trpc.ts`.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Two files have ongoing parallel WIP — avoid editing `frontend/src/routes/
  Projects.tsx` and `frontend/src/routes/Clients.tsx` unless asked.
