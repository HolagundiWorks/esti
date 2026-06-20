# External kit packages

ESTI consumes four workspace packages (sibling repos). Canonical source lives outside `esti-aorms`; this monorepo links them via `pnpm-workspace.yaml`.

| Package | Repo | Role |
|---------|------|------|
| `@hcw/carbon-agent-kit` | `../hcw-carbon-agent-kit` | Carbon agent knowledge, patterns, Cursor rules |
| `@hcw/aorms-ai-kit` | `../hcw-aorms-ai-kit` | AORMS AI prompts + Ollama SDK |
| `@hcw/india-compliance-kit` | `../hcw-india-compliance-kit` | Pan-India building compliance engine; BBMP `bbmp-2003` profile in v0.1 |
| `@hcw/master-dsr-kit` | `../hcw-master-dsr-kit` | CPWD + state SSR master DSR catalogs |

## Local setup

```bash
pnpm install          # links workspace packages + runs postinstall (setup-carbon-kit.mjs)
pnpm carbon:index     # refresh Carbon doc index
pnpm carbon:search tile
```

After install, `.carbon-kit/` junction points at `@hcw/carbon-agent-kit` for agent docs.

Kit packages build to `dist/` on install (`prepare` script). Podman dev images run explicit builds for AI, compliance, and DSR kits.

## Compliance jurisdiction model

Rules resolve at the most specific level available:

```text
state → district → taluka → planning zone → authority (e.g. bbmp-2003)
```

esti DB loads rule rows and maps them to `ComplianceRuleCatalog` via [`backend/src/lib/bbmpRules.ts`](../backend/src/lib/bbmpRules.ts) with jurisdiction `{ stateCode: "IN-KA", authorityId: "bbmp-2003" }`.

## DSR source kinds

| Source | Examples |
|--------|----------|
| `CPWD` | Central DAR/SOR building division |
| `STATE` | Karnataka SSR, Maharashtra SSR, … |

`esti_dsr_version` stores `source` and `state_code`. Demo seed uses Karnataka building SSR (`KA`, FY 2026-27).

## Versioning and publish

1. Tag kit repos: `git tag v0.1.0 && git push origin v0.1.0`
2. Publish to GitHub Packages (optional):

```bash
cd ../hcw-india-compliance-kit && npm publish --access restricted
cd ../hcw-master-dsr-kit && npm publish --access restricted
```

3. In esti `package.json`, pin version instead of `workspace:*` when consuming from registry.

**Policy:** bump kit **minor** when compliance profiles or state SSR packs change; esti PR pins new version.

## CI

- `pnpm install` must resolve all four workspace packages
- `pnpm --filter @hcw/india-compliance-kit test` — BBMP profile + jurisdiction resolver
- `pnpm --filter @hcw/master-dsr-kit test` — KA building catalog + CSV import
- `pnpm --filter @hcw/aorms-ai-kit test` — landing AI unit tests
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks
- `pnpm --filter @esti/frontend lint` — `check-carbon.mjs` imports `@hcw/carbon-agent-kit/policy`

## Knowledge Bank seed data

Official catalogues (DSR + compliance) are maintained by HCW in kit repos and are **read-only** in esti.

- **Seed data** tab: activate all or selected city packs (stores lightweight DB refs only)
- **Master DSR**: custom versions support CSV import/export; official HCW versions load rates from `@hcw/master-dsr-kit` at runtime
- **Compliance**: official BBMP packs load rules from `@hcw/india-compliance-kit` at runtime


Rebuild backend after bumping kit versions so compiled SDKs are in the image. Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).
