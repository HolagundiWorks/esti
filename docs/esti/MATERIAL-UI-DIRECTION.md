# AORMS Material UI direction

> **Status: active migration (2026-07).** The app, panels and all portals are
> moving from IBM Carbon (`@carbon/react`) to **Material UI** (`@mui/material`).
> The **landing page stays on Carbon** (see `CARBON-UI-DIRECTION.md`). This doc is
> the canonical guide for everything else.

## The three hard rules

1. **Colours are unchanged.** Every colour comes from the Carbon **g100** design
   tokens, lifted verbatim into `frontend/src/theme/muiTheme.ts`. The dark
   "liquid glass" look *is* the g100 theme — the office workspace already rendered
   g100, so no hue shifts. **`src/theme/` is the only place raw colour values may
   live**; everywhere else references the theme (`color="primary"`, `sx`, tokens).
2. **Square corners everywhere.** `shape.borderRadius = 0` plus explicit
   `borderRadius: 0` on every surface/control in the theme. The visual guard
   rejects any non-zero `border-radius` (SCSS) or `borderRadius` (JSX/TS) outside
   the exempt landing + theme files. No pills, no rounded cards, no rounded chips.
3. **Liquid glass.** Paper / Card / Drawer / AppBar / Menu surfaces are
   translucent with a backdrop blur, matching `landing.scss` and `glass.scss` —
   frosted panels over the dark ambient backdrop. Baked into the theme, so screens
   inherit it for free.

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
| Theme | `src/theme/muiTheme.ts` | g100 palette, `borderRadius:0`, glass component overrides, Google Sans |
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
   | `DataTable` / `Table*` | `Table` / `TableHead/Body/Row/Cell` (+ `TableContainer`) |
   | `Tabs`/`Tab`/`TabPanel` | `Tabs`/`Tab` + controlled panel state |
   | `InlineNotification` | `Alert` (`severity`) |
   | `ProgressBar` | `LinearProgress` (`variant="determinate"`) |
   | `@carbon/icons-react` | keep short-term (framework-neutral SVG) or `@mui/icons-material` |

2. **Keep semantic type.** Prefer `<h1>…<h4>`, `<p>` inside MUI containers so the
   existing Carbon/Google-Sans type scale applies — don't re-scale with MUI
   `Typography` variants unless matching the old size.
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

## Charts & icons (deferred)

- `@carbon/charts-react` has no MUI equivalent; keep it until a chart pass swaps to
  MUI X Charts / Recharts. It renders fine on the g100 shell.
- `@carbon/icons-react` icons are plain SVG components — keep during migration to
  avoid churn; swap to `@mui/icons-material` opportunistically.
