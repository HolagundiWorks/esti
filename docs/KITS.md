# Vendored kit packages

ESTI consumes HCW packages vendored inside the monorepo under `vendor/`. They are
pnpm workspace members (`vendor/*` in `pnpm-workspace.yaml`) — **not** sibling
repos on disk. Everything needed to run is inside this repository.

| Package | Vendor path | Role |
|---------|-------------|------|
| `@hcw/ui-kit` | `vendor/hcw-ui-kit/` | HCW-UI-Kit design system (built `dist/` from [hcwux](https://github.com/HolagundiWorks/hcwux)) |
| `@hcw/aorms-ai-kit` | `vendor/hcw-aorms-ai-kit/` | AORMS AI prompts + Ollama SDK (backend) |

> **Retired kits — do not reintroduce.**
> - `@hcw/carbon-agent-kit` was **internalised** (2026-07) as `frontend/scripts/
>   carbon-policy-rules.mjs`, then the whole Carbon policy guard + `@carbon/react`
>   dependency were **removed outright** (2026-07) once the app, portals and
>   landing page all moved to HCW-UI-Kit (`@hcw/ui-kit`) — see
>   [`esti/HCW-UI-KIT.md`](esti/HCW-UI-KIT.md).
> - `@hcw/master-dsr-kit` (Rate Books) and `@hcw/india-compliance-kit` (bylaw engine) were
>   removed in the 2026-06 teardown.

## Local setup

```bash
pnpm install          # links workspace packages + resolves deps
```

Vendored kits ship a pre-built `dist/` (committed) — there is no kit build step
inside esti. All Docker images (dev and prod) copy `vendor/` from the repo-root
build context.

## Dev volume mounts

In `compose.yaml`, `./vendor:/app/esti/vendor` is mounted into the `backend` and
`frontend` containers. Vite's `fs.allow` covers `/app/esti` (incl. `vendor/`), so
kit dist files are served in dev.

## Updating `@hcw/ui-kit`

Canonical source: **github.com/HolagundiWorks/hcwux**. Do not edit
`vendor/hcw-ui-kit/dist/` by hand.

1. In a checkout of `hcwux`: `pnpm install && pnpm build` (emits `dist/` including
   `tokens.json` / `tokens.css`).
2. Replace `vendor/hcw-ui-kit/dist/` with the built `dist/`.
3. Bump `vendor/hcw-ui-kit/package.json` `version` + `exports` to match upstream
   (`./tokens`, `./token-export`, `./tokens.json`, `./tokens.css`,
   `./portal-chrome.scss`).
4. Copy upstream `CHANGELOG.md` into `vendor/hcw-ui-kit/CHANGELOG.md`.
5. Sync guideline docs from hcwux into `docs/hcw-kit/` and `docs/esti/HCW-*.md`
   when the bump changes contracts.
6. `pnpm install` at the repo root to re-link.
7. Typecheck frontend; smoke Studio Intelligence + Appearance (scheme / density / COGA).

Adoption notes (esti-specific vendor path): [ADOPTING-THE-KIT.md](ADOPTING-THE-KIT.md).
UX index: [HCW-UX.md](HCW-UX.md).

## Updating `@hcw/aorms-ai-kit`

1. Build the release in the kit repo and copy it (incl. `dist/`) into
   `vendor/hcw-aorms-ai-kit/` (keep the directory name).
2. Confirm `vendor/hcw-aorms-ai-kit/package.json` shows the new version.
3. `pnpm install` at the repo root to re-link.
4. Rebuild the backend image (compiled SDK).
5. Test in the Podman/Docker dev stack before deploying.

Do **not** publish vendored kits to npm / GitHub Packages — they are distributed
as committed source.

## CI

CI uses a **single checkout** — no sibling kit repos are cloned.

- `pnpm install` resolves workspace packages from `vendor/`.
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks.
- `pnpm --filter @esti/frontend lint` — eslint only (the Carbon policy guard was
  removed with `@carbon/react`, 2026-07).

Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
