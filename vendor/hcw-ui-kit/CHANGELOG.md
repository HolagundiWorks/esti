# @hcw/ui-kit changelog

All notable changes to the HCW Design System package. Versioning follows semver;
the package is workspace-consumed (source-only), so versions mark **design-contract**
changes, not npm releases.

## 1.4.0 — 2026-07-22

### Added
- **RTL foundation (D15 kit half)** — `createHcwTheme({ direction })` ·
  `KitRoot({ direction, locale })` (`dir`/`lang`/`data-hcw-direction`) ·
  `createHcwRtlCacheOptions` · `useHcwLocale` / `HcwLocaleContext` · logical
  properties on GlassRail, Toast, ConfirmModal, DecisionCard, TaskbarFooter,
  picker header. Dock zones remain semantic roles under RTL.
- **Figma Variables bridge (D16 kit half)** — `dist/tokens.json` + `dist/tokens.css`
  from build; `@hcw/ui-kit/tokens.json` · `./tokens.css` · `./token-export`;
  [02-TOKEN-EXPORT.md](docs/hcw-kit/02-TOKEN-EXPORT.md).
- **[13-ROADMAPS.md](docs/hcw-kit/13-ROADMAPS.md)** — kit vs product scope split.

### Docs
- Debt register: kit roadmap halves retired; product i18n + Figma component library
  remain DesignOps/esti.

## 1.3.1 — 2026-07-22

### Fixed
- **COGA calm** — `chromeIconSx` expands to 48px under `[data-hcw-coga="calm"]`;
  `chromeIconSxFor` / `typeScaleSx` helpers; theme leftovers use `cogaFor` type ladder.
- **Scheme-aware chrome** — button lift / table / DataGrid / skeleton borders use
  `hexToRgba(CDS.ink, α)` instead of light-only coal rgba.
- **`CAPACITY.decisionAlternatives`** — DecisionCard alternatives cap is a token
  (was hardcoded `3` in capacity helper).
- **Catalog + HCW-UI-KIT.md** — ConfirmModal `kind`/`reason`, StatusDot `shape`,
  Toast undo, AwarenessStrip props, KitRoot mount, package listing synced to exports.
- **Tests** — ConfirmModal mistake path, Decision alternatives trim, KitRoot
  `data-hcw-coga`, toast `ux.capacity_warn`; exported `ConfirmModalProps` /
  `AwarenessStripProps` / `KpiStripProps`.

### Docs
- KB gap list no longer claims Toast/DataState/Avatar absent; audits index 00–14 /
  50 KB budget; debt register kit-defect queue cleared.

## 1.3.0 — 2026-07-21

### Added
- **Orchestration primitives (F1)** — `MissionHeader` · `ObjectiveList` · `PhaseStrip` ·
  `ConfidenceBand` · `DecisionCard` / `DecisionQueue` · `FrozenDecisionRow` /
  `FreezeTable`; template **T10** in `05-TEMPLATES.md`.
- **`KpiStrip`** + **`enforceCapacity` / `assertCapacity`** (F2) — Cowan caps on KPI
  strips; ActionDock trims to `CAPACITY.dockVisibleActions` with warn.
- **`KitRoot({ coga })` / `createHcwTheme({ coga })`** (F3) — calm mode raises
  targets and bumps type one step; `data-hcw-coga`; `cogaFor` / `densityFor(..., coga)`.
- **`logUxEvent` / `setUxEventSink`** (F4) — sink-agnostic KPI instrument; dock
  `DockAction.track` / `.outcome` couples `ux.dock` + `publishOutcome`; typed
  `logOrient` · `logDecision` · `logMission` · `logInterrupt`; toast/outcome
  channels emit `ux.capacity_warn` on overrun.
- **Case studies (F5)** — `docs/hcw-kit/11-audits/case-studies/` (interrupt · dock ·
  mission orientation).

### Changed
- Framework §10 / debt register: F1–F5 closed.
- Catalog, styleguide, KPI instrument, AI knowledge base updated.
- Gzip size budget **40 → 50 KB** (new orchestration + telemetry surface).

## 1.2.0 — 2026-07-21

### Added
- **HCW UX Process** — `docs/HCW-UX-PROCESS.md`: Plan → Design → Build → Evaluate →
  Improve with RACI, exit gates, cadence, deliverables, and minimal path.
- **HCW UX index** — `docs/HCW-UX.md`: ships **both** framework (model) and process
  (how teams run). Neither replaces the other.

### Changed
- Framework charter (`HCW-UX-FRAMEWORK.md`) pairs explicitly with the process;
  lifecycle phases point at process gates.
- Playbook, kit README, CLAUDE.md, principles map, AI/construction/KPI parents
  all route through `HCW-UX.md`.

## 1.1.0 — 2026-07-21

### Added
- **HCW UX Framework Charter** — `docs/HCW-UX-FRAMEWORK.md`: problem · scope ·
  users · seven principles · one diagram · lifecycle · KPIs · integration ·
  evaluation checklist (framework criteria, not process-only).
- **Construction UX Overlay** — `docs/esti/HCW-CONSTRUCTION-UX-OVERLAY.md`
  (lifecycle · stakeholder modes · safety interrupts · BIM stance · field rules)
  without polluting the domain-agnostic kit.
- **KPI instrument** — `docs/esti/HCW-UX-KPI-INSTRUMENT.md` event vocabulary +
  healthy bands.
- Debt register **F1–F5** open framework gaps (orchestration primitives, capacity
  enforcement, COGA calm, KPI wiring, case studies).

### Docs
- Playbook + governance README + UX principles map point at the charter.

## 1.0.0 — 2026-07-21

### Added
- **HCW Catalog** — `docs/hcw-kit/14-HCW-CATALOG.md`: every foundation, element,
  component, pattern, pictogram, and icon with attributes (HCW vocabulary only).
- **`src/pictograms.ts`** — `PICTOGRAM` · `HEALTH_PICTOGRAM` · `STATUS_PICTOGRAM` ·
  `ICON` / `ICON_SLOTS` / `ICON_SIZE` / tones · brand accent shapes.
- **HCW aliases** — `KitRoot` (= `MuiRoot`), `createHcwTheme` / `hcwTheme`.
- **10-ELEMENTS.md** cheat-sheet; former mapping file redirects to the catalog.
- **Cognitive contracts** — `CAPACITY` · `INTERRUPTION` · `COGA` · `TRUST` ·
  `STATUS_SHAPE`; `AwarenessStrip`; `publishOutcome` / `ActionOutcomeBanner`;
  ConfirmModal `kind`/`reason`; toast stack budget + undo; `StatusDot.shape`;
  `layoutSx.formField`.

### Changed
- Token governance, styleguide, and token comments speak HCW only (no external
  system framing in public contracts).
- Governance README §10 → Elements; §14 → Catalog.

## 0.9.0 — 2026-07-21

### Added
- **Density mode** — `DensityName` (`comfortable` | `compact`) + `densityFor()`;
  `createAormsTheme({ density })` and `MuiRoot({ density })` wire Button, IconButton,
  Tab, Chip, List/MenuItem, inputs, TableCell, and DataGrid row heights.
- **List / search recipes** — `layoutSx.listToolbar` + `searchFieldSx`; themed
  `MuiListSubheader` / `ListItemIcon` / `ListItemText`; T2 template updated.

### Fixed
- **TaskbarFooter** — `colors.layer01` instead of raw `#ffffff`; TaskbarButton
  uses `DENSITY.controlCompact`.

### Docs
- Token governance density contract; element list/search/density notes.

## 0.8.0 — 2026-07-21

### Added
- **Sequential · diverging · semantic viz scales** — `DATA_VIZ_SEQUENTIAL`,
  `DATA_VIZ_DIVERGING`, `DATA_VIZ_SEMANTIC` plus `sequentialColors` /
  `divergingColors` / `chartPalette(kind, n)` / `chartColorAt` / `chartAreaFill`.
- **`src/charts.ts` grammar** — `CHART_MARKERS` · `chartMarkerAt`,
  `chartChromeFor` / `CHART_CHROME`, `chartRootSx` (MUI X axis/grid/legend/tooltip
  selectors), `withChartSeriesColors` (optional markers). No `@mui/x-charts`
  kit dependency — consumers wire values into chart props.
- Styleguide foundations specimen for the three ramps + semantic roles.

### Docs
- Mapping, token governance, MATERIAL-UI-DIRECTION — full chart contract
  (palette kinds, chrome, WCAG marker pairing).

## 0.7.0 — 2026-07-21

### Added
- **`DENSITY` tokens** — productive touch/control heights (`touchTarget` 44,
  `controlCompact` 38, `control` 40). Tabs wire to `DENSITY.control`.
- **`chromeIconSx`** — ≥44px IconButton recipe for persistent chrome (taskbar,
  ribbon, rail utilities).
- **`DATA_VIZ_CATEGORICAL` + `chartSeriesColors(n)`** — ordered chart series
  ladder so MUI X charts stop inventing hex / unordered `Object.values`.

### Fixed
- **`HealthGlassOrb`** — flat fills use `colors.support*` / `textHelper` (no
  `--cds-*` CSS vars or Carbon fallback hexes).
- **Tooltip** — `colors.ink` / `textOnColor` / `borderStrong` (no raw `#141517`).
- **Alert `variant="filled"`** — scheme-aware solid support fills (ToastHost);
  standard error/warning glass washes use `hexToRgba` on scheme support colours.
- **DatePicker popup** — `MuiPickerPopper` / `MuiDateCalendar` /
  `MuiPickersCalendarHeader` themed to flat pop + accent day (with existing
  `MuiPickerDay`).
- **`MuiIconButton`** — focus-ring + `BUTTON_RADIUS`.

### Docs
- **10-MUI-MAPPING.md** — Pagination/Stepper/DatePicker/Charts → 🟩; IconButton
  documents real `chromeIconSx`; search/List/Toggle recipes noted; Carbon marriage
  preamble.
- **MATERIAL-UI-DIRECTION** + branding — post-migration marriage contract (density
  only; frozen app `--cds-*`; Urbanist; `chartSeriesColors`).
- Token governance + design-debt register updated for density/charts/chrome.

## 0.6.0 — 2026-07-21

### Added
- **`LAYOUT` tokens** — Carbon-inspired shell/grid organisation without Carbon's
  visual language: 12-column grid (`columns`), gutter/margin 16, rail widths
  (240 / collapsed 56), 20/80 fractions, stage padding multipliers, content max
  width, taskbar height, dock clearance. `GlassRail` + `TASKBAR_HEIGHT` consume
  them.
- **`layoutSx`** recipes (`rail` · `stage` · `content` · `grid` · `page`) in
  `chrome-sx.ts` for consistent organisation at call sites.
- **Spacing mid-steps** — `SPACING.compact` (12) and `SPACING.section` (40),
  aligning the ladder with Carbon productive density while keeping HCW names.
- **Type hierarchy** — `TYPE_SCALE` gains `label` · `subtitle` · `heading` ·
  `display`; theme typography `fontSize`s and Taskbar clock wire from the ladder.
  Styleguide documents the full scale + 12-col grid specimen.

### Docs
- Token governance: grid · organisation · hierarchy contract (12-col MUI, not
  Carbon 16-col). MATERIAL-UI-DIRECTION + HCW-UI-KIT spatial table + KB borrow
  row updated.

## 0.5.3 — 2026-07-21

### Removed
- **Orchestra design exploration** — deleted the parallel indigo/Inter visual
  language (`tokens/orchestra.*`, `styleguide/`, `docs/design-system/`,
  `docs/ai-orchestration-ux-prototype.html`). AI-orchestration doctrine remains
  (`docs/ai-orchestration-ux-framework.md` · `docs/esti/HCW-AI-ORCHESTRATION-UX.md`);
  product UI uses `@hcw/ui-kit` only (Radiant Orange · Urbanist).

### Fixed
- **Scheme-aware accent helpers** — `hexToRgba`, `underlineAccent`,
  `glassAccentWash`, `focusRingFor`, `ddFlatFor`, `liquidGlassButtonFor` derive
  from the active scheme accent instead of baking light `#FF4F18` into underlines,
  washes, focus rings, Select hover, DataGrid selection hover, and liquid-glass
  glow. Theme + dark/HC recipes + chrome-sx consume them; `portal-chrome.scss`
  exposes `--hcw-accent` / `--hcw-accent-glow` (mirrors light `colors.accent`).
- **`docs/styleguide.html` high-contrast theme** — CSS + theme toggle now cycle
  light · dark · highContrast (`#C93A00` accent), matching `SCHEMES.highContrast`.

### Docs
- Clarified accent rule: fills/CTAs **and** active chrome glyph tints; body links
  stay slate. Noted `DATA_VIZ.orange` is a chart series hue, not the brand accent.

## 0.5.2 — 2026-07-12
