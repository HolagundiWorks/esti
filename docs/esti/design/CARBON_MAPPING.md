# CARBON MAPPING — Custom Patterns vs. Carbon Components

This document maps every custom UI pattern found in the ESTI codebase to its correct Carbon equivalent, identifies which files need updating, and assigns a remediation priority.

---

## Mapping Table

| Custom Pattern | Correct Carbon Component | Files to update | Priority |
|---|---|---|---|
| `<input type="date">` wrapped in `TextInput` | `DatePicker` + `DatePickerInput` | FeeProposals.tsx, Letters.tsx, Contracts.tsx, Team.tsx (dateJoined), Hr.tsx | P2 |
| Back-navigation plain text link (`← Projects`) | `Breadcrumb` + `BreadcrumbItem` | ProjectDetail.tsx | P2 |
| Status `<Select>` + `<Tag>` rendered side-by-side in same cell (Invoices, Contracts) | `Select` only (Tag redundant) or use `OverflowMenu` for actions | Invoices.tsx, Contracts.tsx | P2 |
| Ghost `Button` row actions stacked horizontally (Delete, Retry, Hide, Export XLSX) | `OverflowMenu` + `OverflowMenuItem` | AuditLog.tsx, Reconcile.tsx, Letters.tsx, Contracts.tsx, Proposals.tsx | P2 |
| `StructuredListWrapper` / `StructuredListBody` / `StructuredListRow` — these v10 APIs are not standard in v11 | `Table size="sm"` | Company.tsx (archive history) | P1 |
| `<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px" }}>` — custom attendance/finance grid | `Grid condensed` + `Column` | Dashboard.tsx `ScreenProjects`, `ScreenFinance`, `ScreenTeam` | P1 |
| `<div style={{ display: "flex", gap: 12 }}>` — FeeProposals input row | `Stack orientation="horizontal" gap={4}` | FeeProposals.tsx line ~192 | P1 |
| `<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>` — KnowledgeBank search row | `Stack orientation="horizontal" gap={4}` | KnowledgeBank.tsx line ~53 | P1 |
| `<div style={{ display: "flex", gap: 12 }}>` — Letters form fields | `Stack orientation="horizontal" gap={4}` | Letters.tsx line ~215 | P1 |
| Custom `TelemGauge` SVG circle | `MeterChart` from `@carbon/charts-react` | Dashboard.tsx | P3 |
| `<div className="esti-resource-row">` with custom bar (`--rl`, `--rc` CSS vars) | `ProgressBar` | Dashboard.tsx ScreenProjects + ScreenTeam | P2 |
| `<div className="esti-av-strip">` alert strip | `InlineNotification` or `ActionableNotification` | Dashboard.tsx AlertStrip | P3 |
| `<div className="esti-detail-grid">` / `esti-detail-cell` / `esti-detail-item` | `Grid` + `Column` + `Table size="sm"` | Dashboard.tsx DetailRow | P2 |
| `<div className="esti-macro-grid">` 2×2 zone grid | `Grid condensed` + `Column lg={8}` | Dashboard.tsx ScreenOverview | P3 |
| `<div className="esti-quad">` 2×2 quad cells | `Grid condensed` + `Column lg={8}` or `Tile` variants | Dashboard.tsx QuadCell | P3 |
| `<div className="esti-pressure-grid">` | `Grid condensed` | Dashboard.tsx ScreenProjects, ScreenFinance, ScreenTeam | P2 |
| `<div className="esti-team-bar">` search + button row | `Stack orientation="horizontal"` | Team.tsx toolbar | P1 |
| `<div className="esti-staff-tile__photo">` + `<div className="esti-staff-tile__initials">` | Keep as custom struct helper; background colour only | Team.tsx — accent OK per convention | P3 |
| Inline `<p style={{ color: ..., fontSize: 13 }}>` empty-state text | `.esti-label--secondary` class or Carbon `body-compact-01` | Dashboard.tsx multiple locations | P1 |
| `style={{ height: "calc(100vh - 280px)", minHeight: 500 }}` for ParametricCanvas | `.esti-chart-lg` structural class | KnowledgeBank.tsx line ~161 | P2 |
| `style={{ maxWidth: 220 }}` on TextInput in Reconcile | Use `Column` sizing or omit width restriction | Reconcile.tsx multiple lines | P2 |
| `style={{ maxWidth: 520 }}` / `style={{ maxWidth: 640 }}` on Tile in Settings/Performance | Use `Column lg={8}` or `Column lg={6}` wrapping instead | Settings.tsx, Performance.tsx | P2 |
| `style={{ maxWidth: 760 }}` on Tile in Company | Use `Column lg={12}` or `Column lg={10}` | Company.tsx | P2 |
| `style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28 }}` — numeric KPI value | Carbon heading token or `heading-05` type style | Dashboard.tsx ScreenProjects/ScreenFinance/ScreenTeam | P1 |

---

## Priority Definitions

| Priority | Meaning | Target |
|---|---|---|
| P0 | Non-Carbon component blocking production quality | Fix before next release |
| P1 | Layout built with raw divs where Carbon Grid/Stack exists | Fix in next sprint |
| P2 | Minor structural drift — partially correct but Carbon component exists | Fix when screen is next touched |
| P3 | Semantic improvement — currently works but a closer Carbon match exists | Address in quarterly polish |

---

## Notes on Dashboard Custom Classes

The Dashboard uses a large set of custom CSS classes (`esti-av-strip`, `esti-macro-grid`, `esti-macro-zone`, `esti-quad`, `esti-qcell`, `esti-detail-grid`, `esti-detail-cell`, `esti-detail-item`, `esti-pressure-grid`, `esti-pressure-cell`, `esti-resource-row`, `esti-telem-panel`, `esti-telem-tile`, `esti-appr-row`, `esti-macro-hdr`, `esti-cockpit__zone-name`, `esti-screen`) that are not defined in `styles.scss`. These classes are Dashboard-specific and must be audited: either add minimal structural definitions to `styles.scss` (layout/sizing only, no colour) or replace the bespoke layout with Carbon `Grid`+`Column` combinations.
