# @hcw/ui-kit changelog

All notable changes to the HCW Design System package. Versioning follows semver;
the package is workspace-consumed (source-only), so versions mark **design-contract**
changes, not npm releases.

## 0.5.1 — 2026-07-11

### Added
- **Render tests for the structural + interaction primitives** (`primitives.test.tsx`,
  jsdom): Surface (class + Box-prop forwarding), BrandMark (accent mark present/
  absent), HealthGlassOrb (shape-encodes-severity contract across all 5 states +
  glass modifier classes + title override), and ActionDock/useScreenActions (the
  interaction contract: labelled toolbar, left→center→right zone ordering, empty
  publish → null, onClick + disabled, roving tabindex, unmount clears). Suite: 44
  tests (was 27).

## 0.5.0 — 2026-07-11

### Added
- **`MuiRoot({ scheme })`** — the provider accepts a colour scheme and resolves
  the theme via `createAormsTheme` (memoised; explicit `theme` prop still wins).
  Consumed by the app's Settings → Appearance switcher (light default; dark/HC
  preview-labelled).
- **Pagination · Stepper · PickerDay themed** — governed ahead of first heavy
  use: BUTTON_RADIUS geometry, accent-active with onAccent ink, FOCUS_RING,
  success-green completed steps, accent-outlined "today".

## 0.4.1 — 2026-07-11

### Added
- **Component render tests** (jsdom + @testing-library/react) for the promoted
  primitives — StatusDot, Avatar (+`getInitials` edge cases), DataState
  (loading/empty/children contract), ConfirmModal (accessible name, confirm/
  cancel, pending disable), PageBreadcrumb (link injection, last-crumb text,
  empty→null), ToastHost (live region, push/dismiss). Suite: **27 tests**.

## 0.4.0 — 2026-07-11

### Added
- **`DATA_VIZ` categorical tokens** — canvas/SVG marker + series hues (blue, cyan,
  green, purple, violet, orange, gray). Diagram palettes (CAD takeoff markers)
  now consume tokens instead of hardcoded hex; values match the shipped palette
  (no visual change).

## 0.3.0 — 2026-07-11

### Added
- **`ToastHost` + toast store** (`pushToast`/`dismissToast`/`useToasts`) — the one
  transient-feedback primitive, promoted from the app; positioned via the
  `Z_INDEX.toast` token; dedupe + TTL behaviour covered by tests.
- **`Avatar`** (+ `getInitials`) — circular identity mark, presentational only:
  callers inject `color` (domain palettes stay app-side; the app's `StaffAvatar`
  wraps it with the staff-level colour logic).
- **First test suite** — vitest; 15 tests over scheme integrity, `recipesFor`,
  shape/scale contracts, and toast store dedupe/TTL. `pnpm test` in the package.

## 0.2.0 — 2026-07-11

### Added
- **Scheme-aware surface recipes** — `recipesFor(scheme)` + `DARK_RECIPES` /
  `HIGH_CONTRAST_RECIPES` (`SurfaceRecipes` type). The theme's neu/glass materials
  (dialogs, menus, inputs, button-hover glass, drawer/app-bar fills, hairlines) now
  resolve per scheme. Dark: near-black shadow pairs + faint white highlights on
  lifted fills. High contrast: no frosts/soft shadows — solid fills + full-strength
  borders. **Light is byte-identical to 0.1.0** (resolves to the same constants);
  dark/HC are preview-grade pending visual sign-off.

## 0.1.0 — 2026-07-11

First versioned design contract (previously unversioned `0.0.0`).

### Added
- **Scale tokens** — `SPACING`/`SPACING_UNIT`, `BREAKPOINTS`, `Z_INDEX`, `OPACITY`,
  `MOTION` (durations + easings), `ELEVATION` (0–3 mapped to flat/neu/glass shadows).
- **Semantic colour schemes** — `SCHEMES` (`light` · `dark` · `highContrast`),
  `ColorScheme`/`SchemeName` types. `createAormsTheme({ scheme })` resolves the whole
  override tree from a scheme (no-arg default remains light). Dark/HC are
  **palette-complete scaffolds**: neu/glass recipes remain light-tuned.
- **`StatusDot`** — the canonical status indicator (dot + ink label, never a filled
  chip), promoted from the app; driven by the new `STATUS_COLORS` token map (which
  supersedes the frozen `--cds-tag-*` compat layer for new code).
- **`PageBreadcrumb`** — wayfinding trail, promoted from the app. Router-agnostic by
  injection (`linkComponent` + `linkPropName`) so the kit carries no router
  dependency; glyph separator keeps the kit icon-library-free.
- Theme coverage for previously un-themed controls: `Checkbox`, `Radio`, `Switch`,
  `Slider`, `LinearProgress`, `CircularProgress`, `Skeleton`, `Badge` — accent-active,
  token-driven, `FOCUS_RING` parity.
- `sideEffects: ["*.scss"]` for safe tree-shaking.

### Changed
- Theme `spacing`/`breakpoints`/`zIndex` now derive from tokens (values are parity
  with MUI defaults — no visual change).
- Theme transition strings consume `MOTION` tokens instead of literal `130ms ease`
  (KB rule R7).

### Governance
- Agent contract + rulesets: `docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md`.
