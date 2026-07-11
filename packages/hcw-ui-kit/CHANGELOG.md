# @hcw/ui-kit changelog

All notable changes to the HCW Design System package. Versioning follows semver;
the package is workspace-consumed (source-only), so versions mark **design-contract**
changes, not npm releases.

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
