# External kit packages

ESTI consumes four HCW workspace packages vendored inside the monorepo under
`vendor/`. They are pnpm workspace members (`vendor/*` in `pnpm-workspace.yaml`)
and are **not** sibling repos on disk — everything needed to run is inside this
repository.

| Package | Vendor path | Role |
|---------|-------------|------|
| `@hcw/carbon-agent-kit` | `vendor/hcw-carbon-agent-kit/` | Carbon agent knowledge, patterns, Cursor rules |
| `@hcw/aorms-ai-kit` | `vendor/hcw-aorms-ai-kit/` | AORMS AI prompts + Ollama SDK |
| `@hcw/india-compliance-kit` | `vendor/hcw-india-compliance-kit/` | Pan-India building compliance engine; BBMP `bbmp-2003` profile in v0.1 |
| `@hcw/master-dsr-kit` | `vendor/hcw-master-dsr-kit/` | CPWD + state SSR master DSR catalogs |

## Local setup

```bash
pnpm install          # links workspace packages + runs postinstall (setup-carbon-kit.mjs)
pnpm carbon:index     # refresh Carbon doc index
pnpm carbon:search tile
```

After install, `.carbon-kit/` is a junction/symlink pointing at
`vendor/hcw-carbon-agent-kit/` for agent docs.

Kit packages build to `dist/` on install (`prepare` script). Podman dev images
run explicit builds for AI, compliance, and DSR kits.

## Dev volume mounts

In `compose.yaml`, `./vendor:/app/esti/vendor` is mounted into both the
`backend` and `frontend` containers. Vite's `fs.allow` covers `estiRoot`
(`/app/esti`) which includes `vendor/`, so kit dist files are served correctly
in dev.

## Compliance jurisdiction model

Rules resolve at the most specific level available:

```text
state → district → taluka → planning zone → authority (e.g. bbmp-2003)
```

esti DB loads rule rows and maps them to `ComplianceRuleCatalog` via
[`backend/src/lib/bbmpRules.ts`](../backend/src/lib/bbmpRules.ts) with
jurisdiction `{ stateCode: "IN-KA", authorityId: "bbmp-2003" }`.

## DSR source kinds

| Source | Examples |
|--------|----------|
| `CPWD` | Central DAR/SOR building division |
| `STATE` | Karnataka SSR, Maharashtra SSR, … |

`esti_dsr_version` stores `source` and `state_code`. Demo seed uses Karnataka
building SSR (`KA`, FY 2026-27).

## Updating a vendored kit

When HCW releases a new kit version:

1. Copy the new release into the relevant `vendor/hcw-<kit>/` directory,
   replacing the existing files (keep the directory name unchanged).
2. Confirm `vendor/hcw-<kit>/package.json` shows the new version.
3. Run `pnpm install` at the repo root so pnpm re-links workspace packages.
4. Rebuild backend and/or frontend images as needed:
   - AI kit (`@hcw/aorms-ai-kit`) → rebuild backend image.
   - Compliance/DSR kits → rebuild backend image (and frontend if Vite aliases
     reference new dist paths).
   - Carbon kit → run `pnpm carbon:index` to refresh agent docs.
5. Test that the affected feature works in the Podman dev stack before deploying.

Do **not** publish vendored kits to npm or GitHub Packages — they are
internal HCW packages distributed as committed source.

## CI

- `pnpm install` must resolve all four workspace packages from `vendor/`
- `pnpm --filter @hcw/india-compliance-kit test` — BBMP profile + jurisdiction resolver
- `pnpm --filter @hcw/master-dsr-kit test` — KA building catalog + CSV import
- `pnpm --filter @hcw/aorms-ai-kit test` — landing AI unit tests
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks
- `pnpm --filter @esti/frontend lint` — `check-carbon.mjs` imports `@hcw/carbon-agent-kit/policy`

## Knowledge Bank seed data

Official catalogues (DSR + compliance) are maintained by HCW in kit repos and
are **read-only** in esti.

- **Seed data** tab: activate all or selected city packs (stores lightweight DB refs only)
- **Master DSR**: custom versions support CSV import/export; official HCW versions load rates from `@hcw/master-dsr-kit` at runtime
- **Compliance**: official BBMP packs load rules from `@hcw/india-compliance-kit` at runtime

Rebuild backend after updating kit versions so compiled SDKs are in the image.
Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
