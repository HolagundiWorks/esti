# External kit packages

ESTI consumes three HCW workspace packages vendored inside the monorepo under
`vendor/`. They are pnpm workspace members (`vendor/*` in `pnpm-workspace.yaml`)
and are **not** sibling repos on disk — everything needed to run is inside this
repository.

| Package | Vendor path | Role |
|---------|-------------|------|
| `@hcw/carbon-agent-kit` | `vendor/hcw-carbon-agent-kit/` | Carbon agent knowledge, patterns, Cursor rules |
| `@hcw/aorms-ai-kit` | `vendor/hcw-aorms-ai-kit/` | AORMS AI prompts + Ollama SDK |
| `@hcw/master-dsr-kit` | `vendor/hcw-master-dsr-kit/` | CPWD + state SSR Rate Book catalogs |

> The former `@hcw/india-compliance-kit` (pan-India building-bylaw compliance
> engine) was **removed** in the 2026-06 cleanup along with the in-product
> RIE/compliance engine and BBMP bylaw calculator. There is no `bbmpRules` lib.

## Local setup

```bash
pnpm install          # links workspace packages + runs postinstall (setup-carbon-kit.mjs)
pnpm carbon:index     # refresh Carbon doc index
pnpm carbon:search tile
```

After install, `.carbon-kit/` is a junction/symlink pointing at
`vendor/hcw-carbon-agent-kit/` for agent docs.

Kit packages build to `dist/` on install (`prepare` script). Podman dev images
run explicit builds for the AI and Rate Book kits.

## Dev volume mounts

In `compose.yaml`, `./vendor:/app/esti/vendor` is mounted into both the
`backend` and `frontend` containers. Vite's `fs.allow` covers `estiRoot`
(`/app/esti`) which includes `vendor/`, so kit dist files are served correctly
in dev.

## Rate Book source kinds

| Source | Examples |
|--------|----------|
| `CPWD` | Central DAR/SOR building division |
| `STATE` | Karnataka SSR, Maharashtra SSR, … |

`esti_dsr_version` stores `source` and `state_code` (the `dsr` namespace and
table names are kept as code identifiers; the product surfaces them as "Rate
Books"). Demo seed uses Karnataka building SSR (`KA`, FY 2026-27).

## Updating a vendored kit

When HCW releases a new kit version:

1. Copy the new release into the relevant `vendor/hcw-<kit>/` directory,
   replacing the existing files (keep the directory name unchanged).
2. Confirm `vendor/hcw-<kit>/package.json` shows the new version.
3. Run `pnpm install` at the repo root so pnpm re-links workspace packages.
4. Rebuild backend and/or frontend images as needed:
   - AI kit (`@hcw/aorms-ai-kit`) → rebuild backend image.
   - Rate Book kit (`@hcw/master-dsr-kit`) → rebuild backend image (and frontend
     if Vite aliases reference new dist paths).
   - Carbon kit → run `pnpm carbon:index` to refresh agent docs.
5. Test that the affected feature works in the Podman dev stack before deploying.

Do **not** publish vendored kits to npm or GitHub Packages — they are
internal HCW packages distributed as committed source.

## CI

- `pnpm install` must resolve all three workspace packages from `vendor/`
- `pnpm --filter @hcw/master-dsr-kit test` — KA building catalog + CSV import
- `pnpm --filter @hcw/aorms-ai-kit test` — landing AI unit tests
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks
- `pnpm --filter @esti/frontend lint` — `check-carbon.mjs` imports `@hcw/carbon-agent-kit/policy`

## Knowledge Bank seed data

Official Rate Book catalogues are maintained by HCW in the kit repo and are
**read-only** in esti.

- **Seed data** tab: activate all or selected city packs (stores lightweight DB refs only)
- **Rate Books**: custom versions support CSV import/export; official HCW versions load rates from `@hcw/master-dsr-kit` at runtime

Rebuild backend after updating kit versions so compiled SDKs are in the image.
Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
