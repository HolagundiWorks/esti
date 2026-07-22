# AORMS Material UI direction

> **⚠️ SUPERSEDED for styling (2026-07): [`HCW-UI-KIT.md`](HCW-UI-KIT.md) is now the
> single source of truth** — the layered design system (`@hcw/ui-kit`) that every
> MUI portal mounts: three depth layers (flat · neumorphic · glass), the taskbar
> footer, and the global ActionDock. This doc remains the Carbon→MUI **migration
> playbook** (component mappings, screen checklist) and the **marriage contract**:
> MUI renders; Carbon contributes density/organisation only.
>
> **Status: migration complete, `@carbon/react` removed (2026-07).** The app,
> panels, all portals, and the landing page now run **Material UI**
> (`@mui/material` + `@hcw/ui-kit`). No Carbon React components remain. Consumer
> apps may keep a **frozen** `--cds-*` compatibility block in their own
> `styles.scss` for legacy call sites — the kit never extends it; new code uses
> kit tokens (`colors.*`, `STATUS_COLORS`, `DATA_VIZ_*`).

## Screen nomenclature — Rail / Stage (canonical)

Every screen splits into two regions. **Always refer to them by these names.**
Full visual spec (glass rail, scroll model, login placement):
[HCW-UI-KIT.md § Glass Rail](HCW-UI-KIT.md#glass-rail--canonical-reference-studio-intelligence).

| Term | Width | Class | What it holds |
|---|---|---|---|
| **Rail** | 20% | `.esti-dash-rail` | **Glass panel (L3), full viewport height on desktop.** Identity/greeting, telemetry (Today, office health, due dates), vertical section tabs, filters, module toggles (bottom). **Login/signup/recovery forms live here — not on the stage.** Internal scroll, hidden scrollbar. |
| **Stage** | 80% | `.esti-dash-stage` | **Scrolls independently.** Stage-head metrics (zone health row, KPIs), then primary content — lists, tables, panels, tab bodies. |

Shared shell: `components/RailLayout.tsx` (`<RailLayout title tabs aside>{stage}</RailLayout>`).
Reference implementation: `StudioAbstract.tsx` (Studio Intelligence `/`).
Rollout: [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md).
A **TabSplit** inside the Stage repeats the pattern for a single tab (20% meta + 80% grid).

## The three hard rules

1. **Hyper-minimalist LIGHT palette — Radiant Orange accent.** Owned by
   `@hcw/ui-kit` (`tokens.ts` → `createAormsTheme`): Fog-Gray canvas (`#F2F4F7`),
   Pure-White cards (`#FFFFFF`), Coal-Black ink (`#141517`), with **Radiant Orange
   `#FF4F18`** the single signature accent (fills + active chrome tints, **white
   text on fills**, deeper `#DB3E0F` on hover). Links use slate, never the accent.
   Airy whitespace, hairline separators, large light-weight numeric readouts over
   small muted labels. **`@hcw/ui-kit` `src/tokens.ts` is the only place raw colour
   values may live** (consumers re-export via `muiTheme.ts`); everywhere else
   references the theme (`color="primary"`, `sx`, kit tokens). Do not add
   `--cds-*` usages. Full palette: [`AORMS-BRANDING-KIT.md`](AORMS-BRANDING-KIT.md).
2. **Square corners everywhere.** `shape.borderRadius = 0` plus explicit
   `borderRadius: 0` on every surface/control in the theme. The visual guard
   rejects any non-zero `border-radius` (SCSS) or `borderRadius` (JSX/TS) outside
   the exempt landing + theme files. No pills, no rounded cards, no rounded chips
   (exceptions: buttons / dock / dialogs per kit radii).
3. **Flat surfaces everywhere.** The flat dashboard language runs across the whole
   app: Paper / Card / DataGrid / Drawer / AppBar / Menu are solid **Pure-White**
   (or transparent) panels with a **hairline edge — no backdrop blur, no drop
   shadow**. Definition comes from the hairline, not elevation. Tables sit flat on
   the canvas (no surface fill, hairline row rules). Baked into the theme, so
   screens inherit it for free. Only the floating widgets (ESTI / Pomodoro /
   Calculator) keep the **neumorphic** soft-UI treatment (`glass.scss`).

## Brand font (whole product, landing included)

> **Live brand face is Urbanist** — self-hosted via `@fontsource/urbanist`
> (weights 400/500/600/700), mirrored as `FONT_FAMILY` in `@hcw/ui-kit`
> `tokens.ts`. Do not introduce IBM Plex (Carbon) as a product face.

- Single source of truth: `FONT_FAMILY` in the kit; consumers mirror via
  `--esti-font-sans` / `theme.typography.fontFamily`.
- Numeric/code readouts may keep a monospace utility (app-owned) — not Plex as brand.

## Foundation (already in place)

| Piece | File | Role |
|---|---|---|
| Theme | `src/theme/muiTheme.ts` (re-export shim of `@hcw/ui-kit`) | Light palette, layered flat/neu/glass component overrides, Urbanist |
| Provider | `src/theme/MuiRoot.tsx` | `StyledEngineProvider injectFirst` + `ThemeProvider`, mounted in `main.tsx` around `<App>`; no global `CssBaseline` (would repaint landing) |
| Density / layout | `@hcw/ui-kit` `LAYOUT` · `SPACING` · `DENSITY` · `densityFor` · `layoutSx` | Carbon-inspired organisation; 12-col MUI grid; `MuiRoot({ density })` |

The Carbon→MUI migration is complete; there is no automated visual-policy guard
in CI (removed with `@carbon/react`) — code review is the check now.

## Migration playbook (per screen)

1. **Swap imports** `@carbon/react` → `@mui/material`. Common map:

   | Carbon | Material UI |
   |---|---|
   | `Tile` / `ClickableTile` | `Paper` / `Card` (`CardActionArea` for click) |
   | `Button` (`kind`) | `Button` (`variant`: contained/outlined/text; `color`) |
   | `Tag` | `Chip` (`size="small"`, `variant="outlined"`) — **status → kit `StatusDot`** |
   | `Stack` (`gap`, `orientation`) | `Stack` (`spacing`, `direction`); gap 3→spacing 1, gap 5→spacing 2 |
   | `Grid`/`Column` (2x grid) | `Grid` (`container` / `size`) or `Box` `display:grid` via `layoutSx.grid` |
   | `Modal` | `Dialog` (+ `DialogTitle/Content/Actions`) |
   | `TextInput` / `TextArea` / `Select` | `TextField` (`multiline`, `select`) |
   | `DataTable` / `Table*` (list/data grids) | **MUI X `DataGrid`** (`@mui/x-data-grid`) — columns + rows, sorting/filtering built in |
   | small static `Table*` (2–3 rows, no data ops) | plain MUI `Table`/`TableHead/Body/Row/Cell` is fine |
   | `LineChart`/`BarChart` (`@carbon/charts`) | **MUI X Charts** (`@mui/x-charts`) — `chartSeriesColors(n)` |
   | date `TextInput type="date"` | **MUI X `DatePicker`** (`@mui/x-date-pickers`, dayjs adapter mounted in MuiRoot) |
   | `Tabs`/`Tab`/`TabPanel` | `Tabs`/`Tab` + controlled panel state |
   | `InlineNotification` | `Alert` (`severity`) — or kit `pushToast` for transient |
   | `ProgressBar` | `LinearProgress` (`variant="determinate"`) |
   | `@carbon/icons-react` | `@mui/icons-material` (per-icon default import) |

2. **Use the MUI System + kit `LAYOUT` tokens, not Carbon layout.** Layout, spacing,
   sizing and type go through the [MUI System](https://mui.com/system/getting-started/)
   and `@hcw/ui-kit` (`LAYOUT`, `SPACING`, `DENSITY`, `TYPE_SCALE`, `layoutSx`): `Box`/`Stack`/
   `Grid` with the `sx` prop and system props (`spacing`, `p`/`m`, `width`, `display`,
   `typography`). No Carbon `Grid`/`Column`/`gap`, no ad-hoc structural divs with
   magic px. Shell geometry (rail width, stage padding, gutters) lives in `LAYOUT`.
   - **Grid (12-col, not Carbon 16):** `<Grid container spacing={2}>` +
     `<Grid size={{ xs: 12, md: 4 }}>` — or `sx={layoutSx.grid}` with
     `gridColumn: "span N"`.
   - **Spacing/sizing:** `SPACING.*` / `theme.spacing` (8px unit); mid-steps
     `compact` (12) and `section` (40) for dense stacks / section rhythm.
     Touch targets: `DENSITY.touchTarget` (44) via `chromeIconSx` in persistent chrome.
   - **Type:** MUI `Typography` variants (sizes wired from `TYPE_SCALE`) — not
     raw rem. Dense telemetry uses `TYPE_SCALE.micro` / `.label` / `.kpi`.
3. **Never hard-code colour.** Use `color="primary|error|warning|success"`, the
   theme palette, or `@hcw/ui-kit` tokens. `--cds-*` vars (if present in the app)
   are a **frozen** compatibility layer — never add new call sites.
4. **Never round corners.** Don't set `borderRadius` (the kit theme handles it).
5. **Structural classes stay.** `.esti-grow`, `.esti-fill`, `.esti-row-between`,
   etc. are colourless layout helpers — reuse them.
6. **Verify:** `pnpm exec tsc -p tsconfig.json --noEmit`.

### Reference migration

`src/components/PageHeader.tsx` — the shared page-title block, migrated Carbon
`Stack` → MUI `Stack` with the API unchanged, so all ~38 call sites upgraded with
zero edits. Copy its shape for other shared primitives.

## MUI v9 gotchas

- **`Stack` alignment** — `alignItems`/`justifyContent` go via `sx`, not direct props.
- **Date/shrink label** — use `slotProps={{ inputLabel: { shrink: true } }}` on
  `TextField` (the old `InputLabelProps` is gone in v9). Same for `input`/`htmlInput`.
- **`Grid`** — use the `size` prop (`<Grid size={{ xs: 12, md: 4 }}>`), not `item`/`xs`.
- **Icons** — import per-icon default: `import Logout from "@mui/icons-material/Logout"`.

## MUI X (the data layer)

Installed and wired: `@mui/x-data-grid`, `@mui/x-charts`, `@mui/x-date-pickers`
(+ `dayjs`). `MuiRoot` mounts `LocalizationProvider` (dayjs adapter) so pickers
work anywhere; the theme styles `MuiDataGrid`, `MuiPickerDay`, and the picker
popper to match HCW flat language.

- **Tables → `DataGrid`.** Define `columns: GridColDef[]` + `rows` (each row needs an
  `id`). Prefer this for any list screen — it brings sort/filter/resize for free.
  Community edition (MIT) is enough. Render status columns with `renderCell` → our
  `StatusTag`/`StatusDot`.
- **Charts → `@mui/x-charts`.** `LineChart`/`BarChart`/`PieChart` with `series` +
  `xAxis`. Colour via `withChartSeriesColors(series)` or `chartPalette(kind, n)`;
  apply `sx={chartRootSx()}` for axis/grid/legend/tooltip chrome. Use sequential
  for heatmaps, diverging for polarity, `DATA_VIZ_SEMANTIC` for KPI deltas.
  Pair multi-series lines with `chartMarkerAt` / `markers: true`. Never hex and
  never brand accent as a series default.
- **Dates → `DatePicker`.** `value`/`onChange` are dayjs objects; format with
  `dayjs`. Replaces `TextInput type="date"`.

## Icons

`@carbon/icons-react` → `@mui/icons-material`, per-icon default import
(`import Logout from "@mui/icons-material/Logout"`). Size via `sx={{ fontSize }}`.
Persistent chrome icons: spread `chromeIconSx` for the 44px target.
