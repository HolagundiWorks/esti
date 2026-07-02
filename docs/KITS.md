# Vendored kit package

ESTI consumes **one** HCW package, vendored inside the monorepo under `vendor/`. It is a
pnpm workspace member (`vendor/*` in `pnpm-workspace.yaml`) — **not** a sibling repo on
disk. Everything needed to run is inside this repository.

| Package | Vendor path | Role |
|---------|-------------|------|
| `@hcw/aorms-ai-kit` | `vendor/hcw-aorms-ai-kit/` | AORMS AI prompts + Ollama SDK (backend) |

> **Retired kits — do not reintroduce.**
> - `@hcw/carbon-agent-kit` was **internalised** (2026-07): its Pure-Carbon lint policy now
>   lives at `frontend/scripts/carbon-policy-rules.mjs`; design guidance is in
>   [`esti/CARBON-UI-DIRECTION.md`](esti/CARBON-UI-DIRECTION.md).
> - `@hcw/master-dsr-kit` (Rate Books) and `@hcw/india-compliance-kit` (bylaw engine) were
>   removed in the 2026-06 teardown.

## Local setup

```bash
pnpm install          # links the workspace package + resolves deps
```

The vendored AI kit ships a pre-built `dist/` (committed) — there is no build step.
All Docker images (dev and prod) copy `vendor/` from the repo-root build context.

## Dev volume mounts

In `compose.yaml`, `./vendor:/app/esti/vendor` is mounted into the `backend` and `frontend`
containers. Vite's `fs.allow` covers `/app/esti` (incl. `vendor/`), so kit dist files are
served in dev.

## Updating the vendored kit

1. Build the release in the kit repo and copy it (incl. `dist/`) into
   `vendor/hcw-aorms-ai-kit/` (keep the directory name).
2. Confirm `vendor/hcw-aorms-ai-kit/package.json` shows the new version.
3. `pnpm install` at the repo root to re-link.
4. Rebuild the backend image (compiled SDK).
5. Test in the Podman dev stack before deploying.

Do **not** publish the vendored kit to npm / GitHub Packages — it is distributed as
committed source.

## CI

CI uses a **single checkout** — no sibling kit repos are cloned.

- `pnpm install` resolves the workspace package from `vendor/`.
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks.
- `pnpm --filter @esti/frontend lint` — runs `check-carbon.mjs` (internalised Carbon policy)
  and the `carbon-policy.test.ts` vitest guard.

Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
