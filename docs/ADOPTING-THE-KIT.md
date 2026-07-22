# Adopting `@hcw/ui-kit`

How a consuming app pulls the kit from [hcwux](https://github.com/HolagundiWorks/hcwux).

> **AORMS-Studio (`esti`) note:** this monorepo vendors a **built** copy at
> `vendor/hcw-ui-kit/` (`"@hcw/ui-kit": "workspace:*"`). Re-vendor steps live in
> [`KITS.md`](KITS.md) — do not switch esti to a live git dependency without an
> explicit ops decision. The git-dependency flow below is for sibling apps.

## Install

Pin a commit SHA for reproducibility (a moving `#main` re-resolves on every install):

```json
// package.json
"dependencies": {
  "@hcw/ui-kit": "github:HolagundiWorks/hcwux#<commit-sha>"
}
```

On install, the kit's `prepare` script runs `tsc` and emits `dist/` (compiled JS +
`.d.ts`) plus `portal-chrome.scss`. Consumers therefore get a **built package** — no
bundler configuration is required; Vite/webpack/tsc treat it like any published
dependency.

### Peer dependencies

The consuming app must provide these (the kit does not bundle them):

`react`, `react-dom`, `@mui/material`, `@mui/x-data-grid`, `@mui/x-date-pickers`,
`@emotion/react`, `@emotion/styled`, `dayjs`.

### App entry

```ts
import "@fontsource/urbanist/400.css";
import "@fontsource/urbanist/500.css";
import "@fontsource/urbanist/600.css";
import "@fontsource/urbanist/700.css";
import "@hcw/ui-kit/portal-chrome.scss";
```

## Migrating an existing workspace consumer

For an app that previously consumed the kit as an in-repo workspace package
(`"@hcw/ui-kit": "workspace:*"` with the source under `packages/hcw-ui-kit/`):

1. **Swap the dependency** in the app's `package.json`:
   `"@hcw/ui-kit": "workspace:*"` → `"github:HolagundiWorks/hcwux#<sha>"`.
2. **Remove the package from the workspace** — delete `packages/hcw-ui-kit/` and its
   entry from `pnpm-workspace.yaml` (if listed explicitly).
3. **Repoint documentation links** — any docs that referenced the moved design-system
   docs (`docs/hcw-kit/**`, `HCW-UI-KIT.md`, `HCW-UI-UX-PRINCIPLES.md`, etc.) now point
   to this repo, e.g.
   `https://github.com/HolagundiWorks/hcwux/blob/main/docs/esti/HCW-UI-KIT.md`.
4. `pnpm install` — pnpm clones the git dep, installs its dev deps, runs `prepare`,
   and links the built `dist/`.
5. **Typecheck / build** the app. The kit's public export surface is unchanged
   (`src/index.ts` → `dist/index.js`), so existing `import … from "@hcw/ui-kit"`
   statements resolve without edits.

### Dev-loop change

The old workspace trick (`docker cp` the kit `src/` into the container after edits)
no longer applies — the kit is not in the app's workspace. For **local kit
development** against a consumer, either:

- Work in the `hcwux` repo directly (`pnpm build` / `pnpm test`), bump the pinned SHA
  in the consumer when ready; or
- Temporarily `pnpm overrides` / `pnpm link` the consumer to a local `hcwux` checkout
  during active co-development, then re-pin to a pushed SHA before committing.

## Updating the kit

Bump the pinned SHA in the consumer's `package.json` and `pnpm install`. Review
[`CHANGELOG.md`](../CHANGELOG.md) for design-contract changes between SHAs.
