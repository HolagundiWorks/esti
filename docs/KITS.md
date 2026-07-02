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

The AI kit builds to `dist/` on install. The Podman dev backend image runs an explicit
`pnpm --filter @hcw/aorms-ai-kit build`.

## Dev volume mounts

In `compose.yaml`, `./vendor:/app/esti/vendor` is mounted into the `backend` and `frontend`
containers. Vite's `fs.allow` covers `/app/esti` (incl. `vendor/`), so kit dist files are
served in dev.

## Updating the vendored kit

1. Copy the new release into `vendor/hcw-aorms-ai-kit/` (keep the directory name).
2. Confirm `vendor/hcw-aorms-ai-kit/package.json` shows the new version.
3. `pnpm install` at the repo root to re-link.
4. Rebuild the backend image (compiled SDK).
5. Test in the Podman dev stack before deploying.

Do **not** publish the vendored kit to npm / GitHub Packages — it is distributed as
committed source.

## CI

- `pnpm install` resolves the workspace package from `vendor/` (non-frozen).
- `pnpm --filter @hcw/aorms-ai-kit test` — landing AI unit tests.
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks.
- `pnpm --filter @esti/frontend lint` — runs `check-carbon.mjs` (internalised Carbon policy)
  and the `carbon-policy.test.ts` vitest guard.

Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
