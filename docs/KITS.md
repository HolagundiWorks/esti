# External kit packages

ESTI consumes two workspace packages (sibling repos). Canonical source lives outside `esti-aorms`; this monorepo links them via `pnpm-workspace.yaml`.

| Package | Repo | Role |
|---------|------|------|
| `@hcw/carbon-agent-kit` | `../hcw-carbon-agent-kit` | Carbon agent knowledge, patterns, Cursor rules |
| `@hcw/aorms-ai-kit` | `../hcw-aorms-ai-kit` | AORMS AI prompts + Ollama SDK |

## Local setup

```bash
pnpm install          # links workspace packages + runs postinstall (setup-carbon-kit.mjs)
pnpm carbon:index     # refresh Carbon doc index
pnpm carbon:search tile
```

After install, `.carbon-kit/` junction points at `@hcw/carbon-agent-kit` for agent docs.

## Versioning and publish

1. Tag kit repos: `git tag v0.1.0 && git push origin v0.1.0`
2. Publish to GitHub Packages (optional):

```bash
cd ../hcw-carbon-agent-kit && npm publish --access restricted
cd ../hcw-aorms-ai-kit && npm publish --access restricted
```

3. In esti `package.json`, pin version instead of `workspace:*` when consuming from registry:

```json
"@hcw/carbon-agent-kit": "^0.1.0",
"@hcw/aorms-ai-kit": "^0.1.0"
```

Or interim git dependency:

```json
"@hcw/aorms-ai-kit": "github:HolagundiWorks/hcw-aorms-ai-kit#v0.1.0"
```

**Policy:** bump kit **minor** when prompts or Carbon patterns change; esti PR pins new version.

## CI

- `pnpm install` must resolve both workspace packages
- `pnpm --filter @hcw/aorms-ai-kit test` — landing AI unit tests
- `pnpm --filter @esti/backend test` — includes `marketing.askEsti` mocks
- `pnpm --filter @esti/frontend lint` — `check-carbon.mjs` imports `@hcw/carbon-agent-kit/policy`

## AORMS AI kit — sync docs from esti

From `hcw-aorms-ai-kit`:

```bash
node scripts/sync-docs.mjs ../esti
```

Edit prompts in `knowledge/prompts/*.md`, then `pnpm build-prompts` (runs automatically on `pnpm build`).

Canonical product docs remain in `docs/esti/`; the kit holds copies for prompt maintenance.

## Production

Ollama requirement for landing AI unchanged — see [PRODUCTION-OPS.md](esti/PRODUCTION-OPS.md).

Rebuild backend after bumping `@hcw/aorms-ai-kit` so prompts are in the image.
