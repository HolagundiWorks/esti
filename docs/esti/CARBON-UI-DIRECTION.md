# ESTI Pure Carbon UI Policy

**Status:** Mandatory · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-15

**Carbon agent kit:** `@hcw/carbon-agent-kit` (`.carbon-kit/` after `pnpm install`) — design-intelligence, pattern-library, knowledge index. This document is the **ESTI-specific** enforcement layer only.

**Theme rules 1–8:** `.carbon-kit/knowledge/theme_implementation.md`  
**Search / refresh:** `pnpm carbon:search` · `pnpm carbon:index`

The ESTI frontend uses only IBM Carbon Design System components, icons,
pictograms, charts, layout, typography, and design tokens. This is an
implementation constraint, not a visual suggestion.

Reference specs used in this document:
- Components: https://carbondesignsystem.com/components/overview/components/
- Data viz: https://carbondesignsystem.com/data-visualization/getting-started/
- 2x Grid / spacing: https://carbondesignsystem.com/elements/2x-grid/overview/
- Typography: https://carbondesignsystem.com/elements/typography/overview/
- Colour: https://carbondesignsystem.com/elements/color/overview/

---

## Required

- Build screens from `@carbon/react`, `@carbon/icons-react`,
  `@carbon/pictograms-react`, `@carbon/charts-react`, and `@carbon/charts`.
- Use Carbon `Grid` and `Column` with the 16/8/4-column 2x Grid.
- Use `Stack` for all vertical and horizontal spacing — never inline margins.
- Use `DataTable`, `Pagination`, search/filter controls, `Tabs`, `Modal`,
  `Tile`/`ClickableTile`, `Tag`, `ProgressBar`, `InlineNotification`, skeletons,
  and Carbon form controls for their intended semantics.
- Use semantic headings (`h1`–`h4`) and `p` without decorative inline typography.
- Use only `--cds-*` tokens when a component API genuinely requires a colour.
- Validate keyboard access, focus order, accessible names, loading/error states,
  dark theme, and 320 px / 672 px / 1056 px representative layouts.

## Prohibited

- Custom cards, status pills, progress bars, tabs, modals, tables, or buttons.
- Hard-coded hex/RGB colours, gradients, shadows, bespoke palettes, and custom
  keyframe animations (except documented landing case-study border below).
- Decorative inline styles for font size, weight, colour, borders, or shadows.
- Custom CSS classes that implement a second visual system.
- Clickable non-interactive elements such as `Tile onClick`; use `ClickableTile`
  or Carbon buttons/links.
- User-configurable application theme colours. Firm branding applies to logos
  and generated documents, not the Carbon application chrome.

## Permitted CSS

`styles.scss` contains the Carbon import, full-viewport root fix, and minimal
colourless structural helpers that Carbon cannot express.
Any helper must affect only layout mechanics and must not define visual identity.
The exception must be documented beside the rule.

### Documented exceptions

These areas intentionally diverge from strict Pure Carbon. Each is scoped and
must not spread to staff workspace routes without an explicit policy update.

| Exception | Location | Rationale |
|---|---|---|
| Dashboard mosaic grid | `.esti-dash` | Condensed `Grid` with 1 px row-gap so zone tiles read as a flush mosaic; vertical rhythm matches horizontal gutters. |
| Square-corner tags | `.cds--tag { border-radius: 0 }` | Deliberate brand choice on dashboard and intelligence tiles; do not apply globally to form controls. |
| ASPRF / Performance KPI track bars | `.esti-kpi-track`, `.esti-kpi-fill` | Legacy CSS retained for any remaining scalar bars; Performance member tiles now use `MeterChart` (Phase 2F). |
| Workload heatmap cell colours | `Work.tsx` | Inline `--cds-tag-background-*` / `--cds-tag-color-*` token pairs per cell intensity; Carbon charts cannot express this calendar grid. |
| SteelFlow canvas geometry | `SteelArranger.tsx`, `CrossSectionCanvas.tsx` | SVG sizing, drop zones, and palette positioning require structural inline styles; no decorative hex or shadows. Browser drawing takeoff was removed 2026-06-17 — ESTICAD only. |
| Floating dock glass panel | `.esti-floating-dock` | Semi-transparent dock chrome over the workspace; uses `--cds-*` blur/background tokens only. |
| Quality intelligence layout | `.esti-qi-*` | Shared grid for radar + meter + metrics on Dashboard and landing preview; global scope. |
| Login brand mark | `.esti-login-mark` | Inverse background chip for the white ESTI mark on the login tile; uses `--cds-background-inverse`, not hard-coded hex. |
| Landing layout | `.esti-landing-content`, `.esti-landing-*` | UI Shell chrome plus expressive editorial typography and 2x Grid tile layout. Marketing sections use Carbon `Grid`, `Column`, `Stack`, and `Tile`. |
| Landing case-study border | `.esti-case-study-card`, `@property --esti-case-study-angle` | Landing-only IBM-style rotating conic border using `--cds-*` tokens only; `prefers-reduced-motion: reduce` disables animation. |
| Landing ESTI AI | `.esti-landing-ai` | Fixed corner FAB + panel positioning for public marketing AI; Carbon controls only. |
| Portal logo sizing | `.esti-portal-logo` | Structural max-height for firm logo in external portal headers. |

Staff routes (`src/routes` excluding `Landing.tsx`) must not add new entries to
this table without updating both this document and `ROADMAP.md` Phase 2F.

Automated enforcement lives in `@hcw/carbon-agent-kit/policy`
(consumed by `check-carbon.mjs` and `carbon-policy.test.ts`).

---

## 1 — Carbon 2x Grid and Spacing

### Grid variants

| Variant | Gutter | When to use |
|---|---|---|
| `<Grid>` (default) | 32 px / 16 px | Page sections, main content areas |
| `<Grid narrow>` | 16 px / 8 px | Compact rows (KPI bars, table toolbars) |
| `<Grid condensed>` | 2 px | Dense data grids only — avoid for card layouts |

Always use `<Grid fullWidth>` at the page root to reach the shell edges.

### Column widths

Use the 16-column (lg), 8-column (md), 4-column (sm) breakpoints. Common
patterns for ESTI screens:

| Content | lg | md | sm |
|---|---|---|---|
| Full-width section | 16 | 8 | 4 |
| Half-width tile | 8 | 8 | 4 |
| Third-width tile | 5 or 6 | 4 | 4 |
| KPI chip (6-across) | 2–3 | 4 | 2 |
| Quarter tile | 4 | 4 | 4 |

### Stack gap values (Carbon spacing scale)

`Stack gap={n}` maps to Carbon spacing tokens. Use these values semantically:

| gap | Token | px | Use |
|---|---|---|---|
| 2 | spacing-02 | 4 | Tightest grouping (tag + label) |
| 3 | spacing-03 | 8 | Label → value → tag within a metric cell |
| 4 | spacing-04 | 12 | Items within a list section |
| 5 | spacing-05 | 16 | Elements within a tile |
| 6 | spacing-06 | 24 | Between sub-sections within a tile |
| 7 | spacing-07 | 32 | Between major tile sections (usually handled by `esti-dash` row-gap) |

**Never** use `gap={1}` (2 px) for visible text — it is too tight to read.
**Never** skip levels without reason (e.g., jumping from gap=3 to gap=7 inside
a single tile).

### Marketing landing (`Landing.tsx`)

The public landing page uses **fixed layout headings** (`heading-03`–`heading-06`) and
`body-02` — not the productive app shell scale, and not fluid expressive tokens
(which are for full-bleed pages outside fixed containers).

| Element | Carbon type token | Notes |
|---|---|---|
| Hero `h1` | `heading-06` | Largest fixed layout heading |
| Section `h2` | `heading-04` | Band titles via `MarketingSectionHead` |
| Tile `h3` | `heading-03` | Feature / case-study titles |
| Hero deck | `heading-03` | Secondary colour via `--cds-text-secondary` |
| Section lead | `body-02` | Secondary colour via `--cds-text-secondary` |
| Eyebrow | `label-02` | Uppercase kicker above section titles |
| Impact metric | `heading-05` | Large numeral in impact tiles |

Spacing rhythm (see [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/)):

| Context | `Stack gap` | Token | px |
|---|---|---|---|
| Band vertical padding | — | `spacing-10` | 64 |
| Section head → tile grid | `10` | `spacing-10` | 64 |
| Section head internal (eyebrow → title → lead) | `5` | `spacing-05` | 16 |
| Hero major blocks (copy → CTAs) | `7` | `spacing-07` | 32 |
| Hero copy internal | `5` | `spacing-05` | 16 |
| Tile internal blocks | `5` | `spacing-05` | 16 |
| Grid row gap | — | `spacing-07` | 32 (matches default column gutter) |
| Band backgrounds | — | alternate `background` / `layer-01` / `layer-02` | lead → contrast → default → contrast → muted → default → contrast |
| Tile padding | — | `spacing-05` | 16 |

Productive heading overrides in `styles.scss` are scoped to
`.cds--content:not(.esti-landing-content)` so they do not clash with landing
layout heading styles.

### Tile internal layout

```tsx
<Tile className="esti-fill">
  <Stack gap={5}>               {/* 16 px — between major blocks */}
    <Stack gap={3}>             {/* 8 px — between title elements */}
      <p>Sub-label</p>
      <h2>Section Title</h2>
    </Stack>
    <Stack gap={4}>             {/* 12 px — between list items */}
      {rows.map(...)}
    </Stack>
  </Stack>
</Tile>
```

---

## 2 — Carbon Data Visualisation

Use `@carbon/charts-react` for all data displays beyond plain numbers. Never
build hand-rolled bars, progress-indicator lists, or custom SVG charts.

### Chart selection guide

| Data type | Carbon chart | Import |
|---|---|---|
| Part-to-whole (≤ 6 groups) | `DonutChart` | `@carbon/charts-react` |
| Part-to-whole (status distribution) | `PieChart` | `@carbon/charts-react` |
| Category comparison (horizontal) | `SimpleBarChart` with `ScaleTypes.LABELS` on the left axis | `@carbon/charts-react` + `@carbon/charts` |
| Category comparison (vertical) | `SimpleBarChart` with `ScaleTypes.LABELS` on the bottom axis | same |
| Time series trend | `LineChart` | `@carbon/charts-react` |
| Cumulative over time | `StackedAreaChart` | `@carbon/charts-react` |
| Single metric vs target | `MeterChart` | `@carbon/charts-react` |
| Scalar metric vs range | `GaugeChart` | `@carbon/charts-react` |

### Chart configuration rules

- Always set `toolbar: { enabled: false }` — the default toolbar clutters tiles.
- Set `height` in px or rem. Use the structural helpers in `styles.scss`:
  - `.esti-chart-sm` (≥160 px) — inline/mini chart
  - `.esti-chart-md` (≥288 px) — standard tile chart
  - `.esti-chart-lg` (≥384 px) — hero/full-width chart
- For horizontal bar charts set the left axis `scaleType: ScaleTypes.LABELS`
  and bottom axis `scaleType: ScaleTypes.LINEAR`; import `ScaleTypes` from
  `@carbon/charts`.
- Carbon charts automatically apply the **data-viz palette** (data-viz-01 →
  data-viz-14). Do not set `color.scale` unless you have a deliberate semantic
  reason (e.g., mapping a specific group to `$support-error`).
- Always pass an `accessibility.svgAriaLabel` for charts used in interactive
  tiles.
- For monetary values in tooltips: `tooltip: { valueFormatter: (v) => formatINRShort(v) }`.
- Dynamic height for horizontal bar charts: `height: ${Math.max(160, rows * 44)}px`
  (44 px per bar, minimum 160 px).

### Chart data shape

Carbon charts expect flat arrays of `{ group: string, value: number }` objects.
Keep transformation logic out of JSX — derive the data array in the component
body before rendering.

```tsx
// Correct — derived once, named clearly
const phaseData = byPhase.map((p) => ({ group: p.label, value: p.count }));

// Incorrect — inline transformation inside JSX
<SimpleBarChart data={byPhase.map((p) => ({ group: p.label, value: p.count }))} ... />
```

---

## 3 — Carbon Colour Anatomy

### Core blue family — primary interactive

| Token | Use |
|---|---|
| `--cds-interactive` (blue-60) | Focused interactive elements, links, active borders |
| `--cds-button-primary` (blue-60) | Primary `Button` — do not override |
| `--cds-background-selected` (blue-10) | Selected state in DataTable, lists |

Never use bare hex `#0f62fe` — use `--cds-interactive` or let Carbon components
apply it automatically.

### Semantic colour mapping for Tags

Carbon `Tag` accepts named types — not hex or CSS variables. Map domain states
to Tag types as follows:

| State | Tag `type` | Use |
|---|---|---|
| Success / complete / positive | `green` | Phase billed, invoice paid, project completed |
| Primary / active / live | `blue` | Active project, live pipeline, KPI labels |
| Error / critical / overdue | `red` | Overdue invoice, critical priority, error |
| Warning / pending / at risk | `magenta` | Pending approval, revision risk, on hold |
| Informational / secondary | `teal` | Proposal, exploratory, information |
| Neutral / default / inactive | `gray` | Cancelled, disabled, no data |
| Special / admin | `purple` | HR admin, owner-only capability |

**Note:** Carbon Tag does not have a `gold/yellow` type. Use `magenta` for
caution/warning states in Tags. For full-width alert banners use
`InlineNotification kind="warning"` which applies Carbon's gold alert colour.

### Alert palette — `InlineNotification` and `ToastNotification`

| `kind` prop | Colour | Use |
|---|---|---|
| `error` | Red | Destructive failure, blocked operation |
| `warning` | Gold | Caution — action needed but not blocking |
| `info` | Blue | Context or guidance without urgency |
| `success` | Green | Completed action confirmation |

Use notifications for transient system feedback. Do not use them as permanent
status chips — use `Tag` for persistent state display.

### Data visualisation palette

Carbon charts use the **data-viz sequential palette** automatically based on the
active theme (white / gray-10 / gray-90 / gray-100). Do not customise chart
colours unless you need semantic colour for a specific data group (e.g., marking
overdue buckets in an aging chart with `$support-error`). Let the theme handle
the rest.

---

## 4 — Standard Patterns

### Page layout

```tsx
<Stack gap={7}>                 {/* 32 px between page-level sections */}
  <Stack gap={3}>
    <h1>Page title</h1>
    <p>Supporting description</p>
  </Stack>
  {/* content */}
</Stack>
```

### Dashboard section

```tsx
<Column lg={8} md={8} sm={4}>
  <Tile className="esti-fill">
    <Stack gap={5}>
      <Stack gap={3}><p>Sub-label</p><h2>Section Title</h2></Stack>
      {/* content or chart */}
    </Stack>
  </Tile>
</Column>
```

### KPI chip

```tsx
<ClickableTile className="esti-fill" onClick={navigate}>
  <Stack gap={3}>
    <p>{label}</p>        {/* supporting-02: small label above value */}
    <h3>{value}</h3>      {/* productive-heading-02: large KPI number */}
    <Tag type={tagType} size="sm">{tagText}</Tag>
  </Stack>
</ClickableTile>
```

### List tile (intelligence signals)

Each row in a list tile (Client Intelligence, Team Intelligence, Project Health):
```tsx
<Stack orientation="horizontal" gap={4}>
  <Tag type={statusColor} size="sm">{statusLabel}</Tag>
  <div className="esti-grow">   {/* flex-grow to fill available space */}
    <p>{primaryLabel}</p>
    <p>{secondaryLabel}</p>
  </div>
  <Tag type={alertColor} size="sm">{alertCount}</Tag>
</Stack>
```

### Data list

```tsx
<DataTable rows={rows} headers={headers}>
  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
    <TableContainer>
      <Table {...getTableProps()}>
        <TableHead>
          <TableRow>
            {headers.map((h) => <TableHeader {...getHeaderProps({ header: h })}>{h.header}</TableHeader>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => <TableRow {...getRowProps({ row: r })}>{r.cells.map((c) => <TableCell key={c.id}>{c.value}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
  )}
</DataTable>
```

### Destructive action

Always use the shared `ConfirmModal` wrapper — never `window.confirm`.

---

## 5 — What NOT to do

- `ProgressBar` as a distribution chart → use `SimpleBarChart` horizontal
- Custom hand-rolled cards with icon + value + colored background → use `ClickableTile` + `Stack` + `Tag`
- Conditional class names for colour → use semantic `Tag type` or `InlineNotification kind`
- `gap={1}` anywhere text is present → minimum `gap={3}` for readable text
- `Grid condensed` for card layouts → use `Grid narrow` or `Grid` (default)
- Multiple nested `Grid` levels for simple two-column layouts → one `Grid` + appropriate `Column` spans
- Inline `style` for any visual property → Carbon tokens or component props only

The implementation cleanup and data-viz enhancements are tracked in
[ROADMAP Phase 2F](ROADMAP.md) (UI audit, page hierarchy, policy alignment).
