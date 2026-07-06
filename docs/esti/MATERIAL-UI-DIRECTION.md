# AORMS Material UI direction

> **Status: active migration (2026-07).** The app, panels and all portals are
> moving from IBM Carbon (`@carbon/react`) to **Material UI** (`@mui/material`).
> The **landing page stays on Carbon** (see `CARBON-UI-DIRECTION.md`). This doc is
> the migration playbook; **[`AORMS-BRANDING-KIT.md`](AORMS-BRANDING-KIT.md) is the
> single source of truth for colour, type, surfaces and brand marks** — read it first.

## Screen nomenclature — Rail / Stage (canonical)

Every screen splits into two regions. **Always refer to them by these names:**

| Term | Width | Class | What it holds |
|---|---|---|---|
| **Rail** | 20% | `.esti-dash-rail` | Fixed info column — heading/greeting, telemetry (health, KPIs, filing), zone health, section tabs, module toggles (bottom). Its own hidden-scrollbar scroll. |
| **Stage** | 80% | `.esti-dash-stage` | The changing primary content — tabs' items, lists, tables, panels. |

Shared shell: `components/RailLayout.tsx` (`<RailLayout title tabs aside>{stage}</RailLayout>`).
A **TabSplit** inside the Stage repeats the pattern for a single tab (20% meta + 80% grid).

## The three hard rules

1. **Hyper-minimalist LIGHT palette — Radiant Orange accent.** Lifted into
   `frontend/src/theme/muiTheme.ts`: a Fog-Gray canvas (`#F2F4F7`), Pure-White
   cards (`#FFFFFF`), Coal-Black ink (`#141517`), with **Radiant Orange `#FF4F18`**
   the single signature accent (fills only, **white text on it**, deeper `#DB3E0F`
   on hover). Links use slate, never the accent. Airy whitespace, hairline
   separators, large light-weight numeric readouts over small muted labels.
   **`src/theme/` is the only place raw colour values may live**; everywhere else
   references the theme (`color="primary"`, `sx`, tokens). The Carbon token layer
   runs under `<Theme theme="white">` so `--cds-*` status tokens stay light-coherent.
   Full palette: [`AORMS-BRANDING-KIT.md`](AORMS-BRANDING-KIT.md).
2. **Square corners everywhere.** `shape.borderRadius = 0` plus explicit
   `borderRadius: 0` on every surface/control in the theme. The visual guard
   rejects any non-zero `border-radius` (SCSS) or `borderRadius` (JSX/TS) outside
   the exempt landing + theme files. No pills, no rounded cards, no rounded chips.
3. **Flat surfaces everywhere.** The flat dashboard language runs across the whole
   app: Paper / Card / DataGrid / Drawer / AppBar / Menu are solid **Pure-White**
   (or transparent) panels with a **hairline edge — no backdrop blur, no drop
   shadow**. Definition comes from the hairline, not elevation. Tables sit flat on
   the canvas (no surface fill, hairline row rules). Baked into the theme, so
   screens inherit it for free. Only the floating widgets (ESTI / Pomodoro /
   Calculator) keep the **neumorphic** soft-UI treatment (`glass.scss`).

## Brand font — Open Sans (whole product, landing included)

- **Open Sans** (SIL OFL, free) is self-hosted via `@fontsource/open-sans`
  (weights 400/600/700 imported in `main.tsx`) — works offline, no CDN/CSP issue.
- Single source of truth: `--esti-font-sans` in `styles.scss`, mirrored by
  `theme.typography.fontFamily` (MUI) and `--lp-font` (landing).
- Applied to Carbon surfaces via a runtime override in `styles.scss` (Carbon's
  `$font-families` map is not a configurable Sass var). Our `.esti-*` monospace
  utilities are untouched (higher specificity), so numeric/code readouts keep
  `IBM Plex Mono`.

## Foundation (already in place)

| Piece | File | Role |
|---|---|---|
| Theme | `src/theme/muiTheme.ts` | MP025 light palette, `borderRadius:0`, light-glass component overrides, Open Sans |
| Provider | `src/theme/MuiRoot.tsx` | `StyledEngineProvider injectFirst` + `ThemeProvider`, mounted in `main.tsx` around `<App>`; no global `CssBaseline` (would repaint landing) |
| Guard | `frontend/scripts/carbon-policy-rules.mjs` | flags rounded corners + raw hex/controls; exempts `src/theme/`, `landing.scss`, `glass.scss`, `components/landing/**` |

Both systems coexist. A screen still on Carbon keeps working; migrate it when you
touch it. The office shell and portals render g100, so Carbon and MUI screens look
consistent (same dark glass palette) throughout the transition.

## Migration playbook (per screen)

1. **Swap imports** `@carbon/react` → `@mui/material`. Common map:

   | Carbon | Material UI |
   |---|---|
   | `Tile` / `ClickableTile` | `Paper` / `Card` (`CardActionArea` for click) |
   | `Button` (`kind`) | `Button` (`variant`: contained/outlined/text; `color`) |
   | `Tag` | `Chip` (`size="small"`, `variant="outlined"`) |
   | `Stack` (`gap`, `orientation`) | `Stack` (`spacing`, `direction`); gap 3→spacing 1, gap 5→spacing 2 |
   | `Grid`/`Column` (2x grid) | `Grid` (`container` / `size`) or `Box` `display:grid` |
   | `Modal` | `Dialog` (+ `DialogTitle/Content/Actions`) |
   | `TextInput` / `TextArea` / `Select` | `TextField` (`multiline`, `select`) |
   | `DataTable` / `Table*` (list/data grids) | **MUI X `DataGrid`** (`@mui/x-data-grid`) — columns + rows, sorting/filtering built in |
   | small static `Table*` (2–3 rows, no data ops) | plain MUI `Table`/`TableHead/Body/Row/Cell` is fine |
   | `LineChart`/`BarChart` (`@carbon/charts`) | **MUI X Charts** (`@mui/x-charts`) — `LineChart`/`BarChart`/`PieChart` |
   | date `TextInput type="date"` | **MUI X `DatePicker`** (`@mui/x-date-pickers`, dayjs adapter mounted in MuiRoot) |
   | `Tabs`/`Tab`/`TabPanel` | `Tabs`/`Tab` + controlled panel state |
   | `InlineNotification` | `Alert` (`severity`) |
   | `ProgressBar` | `LinearProgress` (`variant="determinate"`) |
   | `@carbon/icons-react` | `@mui/icons-material` (per-icon default import) |

2. **Use the MUI System, not Carbon layout.** Layout, spacing, sizing and type go
   through the [MUI System](https://mui.com/system/getting-started/): `Box`/`Stack`/
   `Grid` with the `sx` prop and system props (`spacing`, `p`/`m`, `width`, `display`,
   `typography`). No Carbon `Grid`/`Column`/`gap`, no ad-hoc structural divs.
   - **Grid**: `<Grid container spacing={2}>` + `<Grid size={{ xs: 12, md: 4 }}>`.
   - **Spacing/sizing**: `sx={{ p: 2, mt: 3, width: 1, maxWidth: 480 }}` (8px unit).
   - **Type**: MUI `Typography` (`variant="h4|body1|body2|caption"`) or the `typography`
     sx prop — not raw `<h1>/<p>`. Page titles use `<Typography variant="h4">`.
3. **Never hard-code colour.** Use `color="primary|error|warning|success"`,
   theme palette, or `--cds-*` vars (still defined on the g100 shell). No hex.
4. **Never round corners.** Don't set `borderRadius` (theme handles it). The guard
   will fail the build on any non-zero radius.
5. **Structural classes stay.** `.esti-grow`, `.esti-fill`, `.esti-row-between`,
   etc. are colourless layout helpers — reuse them.
6. **Verify:** `pnpm exec tsc -p tsconfig.json --noEmit` + `node scripts/check-carbon.mjs`.

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
work anywhere; the theme styles `MuiDataGrid` square + glass to match.

- **Tables → `DataGrid`.** Define `columns: GridColDef[]` + `rows` (each row needs an
  `id`). Prefer this for any list screen — it brings sort/filter/resize for free.
  Community edition (MIT) is enough. Render status columns with `renderCell` → our
  `StatusTag`/`Chip`.
- **Charts → `@mui/x-charts`.** `LineChart`/`BarChart`/`PieChart` with `series` +
  `xAxis`. Colour series from the theme palette / `--cds-*` tokens, never hex.
- **Dates → `DatePicker`.** `value`/`onChange` are dayjs objects; format with
  `dayjs`. Replaces `TextInput type="date"`.

## Icons

`@carbon/icons-react` → `@mui/icons-material`, per-icon default import
(`import Logout from "@mui/icons-material/Logout"`). Size via `sx={{ fontSize }}`.
