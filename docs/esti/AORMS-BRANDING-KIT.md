# AORMS Branding Kit

> **The single source of truth for the AORMS brand** — colour, type, iconography,
> surface language, motion and UX patterns. Every style in the product traces back
> to this document. If a screen, component or asset needs a colour, a font, a
> corner, a shadow or a layout, the answer is here.
>
> **Product:** **AORMS** (Architecture Office Resource Management System) — the
> workspace. **ESTI** (Embedded Studio Intelligence) — the AI/agent layer inside it.
> Code identifiers keep the `esti` codename; the brand the user sees is **AORMS**.

---

## 1. Colour — Radiant Orange system

The palette is **hyper-minimalist and light**: a cool Fog-Gray canvas, Pure-White
panels, Coal-Black ink, with **Radiant Orange** the single signature accent.

| Role | Name | Hex | Notes |
|---|---|---|---|
| **Accent / primary** | **Radiant Orange** | `#FF4F18` | THE accent — CTAs, active states, indicators, brand marks. **Carries white text.** Fill only, never body text. |
| Accent hover | Deeper Orange | `#DB3E0F` | Hover/pressed state of the accent |
| Accent wash | Orange 14% | `rgba(255, 79, 24, 0.14)` | Selected rows, subtle highlights |
| **Canvas** | **Fog Gray** | `#F2F4F7` | App shell / page background |
| **Panel / card** | **Pure White** | `#FFFFFF` | Flat panels, tiles, dialogs, menus |
| **Ink** | **Coal Black** | `#141517` | Primary text, headings, glyphs |
| Ink — secondary | Slate Grey | `#5B616B` | Muted labels, secondary text |
| Ink — helper | Quiet Grey | `#8A9099` | Hints, disabled, eyebrow captions |
| On-accent text | Pure White | `#FFFFFF` | Text/icon on the orange fill |
| Hairline | Coal Black 8–10% | `rgba(20,21,23,0.08)` | Separators, panel edges, row rules |

**Status colours** (kept coherent on light):

| State | Hex |
|---|---|
| Success | `#1B7F5A` (deep teal-green) |
| Warning | `#FF9932` (saffron — deliberately distinct from the accent orange) |
| Error | `#C8442E` (burnt red) |
| Info / links | `#3B5568` (slate) — links use slate, **never** the accent orange |

**Rules**

- **Orange is a fill, not a text colour.** Buttons, chips, tab indicators, brand
  marks fill orange with white text/glyphs. Body text and links stay ink/slate.
- **No hard-coded hex outside the token files.** Everywhere else references the
  theme (`color="primary"`, `sx`, `--cds-*`, the `--esti-*` vars).
- **One accent.** Do not introduce a second brand hue; use the status family for
  state, the neutral scale for everything else.

---

## 2. Typography — Open Sans

- **Open Sans** (SIL OFL, free) is the brand face across the **entire** product,
  landing included. Self-hosted via `@fontsource/open-sans` (weights 400/600/700,
  imported in `frontend/src/main.tsx`) — offline-safe, no CDN/CSP dependency.
- Single source of truth: `--esti-font-sans` in `styles.scss`, mirrored by
  `theme.typography.fontFamily` (MUI) and `--lp-font` (landing).
- **Type scale (MUI):** `h1`–`h3` run **light (300)** with tight tracking so large
  numerics/readouts dominate; `h4` regular; `overline` is the uppercase eyebrow
  (letter-spacing `0.08em`, weight 600) used for section titles and table headers.
- Numeric/code readouts keep `IBM Plex Mono` via the `.esti-*` mono utilities.

---

## 3. Surface language — **FLAT**

The whole app runs the **flat dashboard language** (first built on Studio
Intelligence, now everywhere):

- **Solid Pure-White panels on the Fog-Gray canvas.** No frosted glass, no
  backdrop blur, no drop shadow. Definition comes from a **hairline edge**, not
  elevation.
- **Square corners everywhere.** `borderRadius: 0`. No pills, no rounded cards or
  chips. The visual guard fails the build on any non-zero radius.
- **Hairline separators** (`1px` @ ~8% ink) replace card edges — an 80%-width
  centred rule between flat sections (the dashboard `Sep()` idiom), a full-height
  hairline between Rail and Stage.
- **Tables sit flat on the canvas** — MUI X `DataGrid` with no surface fill and no
  outer border, just hairline row rules and tiny uppercase eyebrow headers.
- **Card-less content.** Do not wrap content in an elevated/bordered `<Paper>` or
  `<Card>`. Group a section with the shared **`FlatSection`** primitive
  (`components/FlatSection.tsx` — an uppercase eyebrow title + optional action +
  content) and separate stacked sections with **`<Hairline />`** (or a plain
  `<Divider>`). Small metric/KPI tiles keep only a hairline `border` for definition.
  Pop surfaces (Dialog / Menu / Drawer) and interactive launcher tiles are the
  exceptions that keep a surface.
- **The only elevated surfaces are the floating widgets** (ESTI · Pomodoro ·
  Calculator), which use the **neumorphic** soft-UI treatment: same-colour panel
  with a dark bottom-right shadow + a light top-left highlight. **Neu is the one
  exception to the square-corner rule — its corners are soft ROUNDED** (`20px`
  panels, `16px` buttons), because rounded corners are intrinsic to the neumorphic
  look. Everything else stays square.
- **Text inputs are RECESSED neu, not boxes.** Every text-entry field (search +
  all `TextField`/`Select`/`DatePicker`) looks carved *into* the surface: a
  same-colour fill with a dark inner shadow top-left + a light inner highlight
  bottom-right, **no border**, **square corners**, a **shallow** inset (~2px), and a
  Radiant-Orange inner ring on focus. Baked into the theme (`MuiOutlinedInput`/
  `MuiFilledInput`); raw fields can use the `.esti-neu-input` class (`glass.scss`).

---

## 4. Layout — **Rail / Stage** (canonical nomenclature)

Every screen splits into two regions. **Always refer to them by these names.**

| Term | Width | Class | Holds |
|---|---|---|---|
| **Rail** | 20% | `.esti-dash-rail` | Fixed instruments — heading/greeting, telemetry (health, KPIs, filing), zone health, section tabs, filters, primary action, module toggles (bottom). Own hidden-scrollbar scroll. |
| **Stage** | 80% | `.esti-dash-stage` | The changing primary content — lists, tables, panels, tab bodies. |

- Shared shell: **`frontend/src/components/RailLayout.tsx`**
  (`<RailLayout title description tabs aside>{stage}</RailLayout>`). The header +
  search/filters + primary action live in the Rail; content fills the Stage.
- A **TabSplit** inside the Stage repeats the pattern for a single tab (20% meta +
  80% grid).
- **Top nav** = Projects · Teams · Office (section menus, dropdown, no ribbon
  chrome, no background bar). **Active reads as an underline**, not a box.
- **Header & footer are chromeless** — transparent, no background band; the Fog-Gray
  shell canvas sits behind them so scrolling content never shows through and never
  overlaps. Admin (Third Parties · Library · Admin groups) lives in the footer beside
  the user ID card.
- **Telemetry tiles** are square units in a fixed grid (2–3 per row) with top/left
  hairline borders — health, KPIs and filing due-dates all share this one shape.

---

## 5. Iconography & brand marks

- **Icons:** `@mui/icons-material` (per-icon default import), sized via
  `sx={{ fontSize }}`. Legacy Carbon surfaces (landing) use `@carbon/icons-react`.
- **Brand marks are identical everywhere** — no per-screen variants, no white/box
  background fill (which made them look square). Both the **ESTI mark** and the
  **AORMS wordmark** render in **Radiant Orange on a transparent background**,
  recoloured via CSS mask:
  - `.esti-brand.esti-brand--esti` → `/esti-mark-black.png` mask, orange fill
  - `.esti-brand.esti-brand--aorms` → `/aorms-logo.png` mask, orange fill
  - Fill token: `--esti-brand-accent` (`glass.scss`); `--esti-brand-yellow` is a
    legacy alias pointing at the same orange.
- **Assets** live in `frontend/public/` (`esti-mark-*.png`, `aorms-logo*.png`,
  `aorms-wordmark.png`, favicons, `og-image.png`).

---

## 6. Where the tokens live (the ONLY places raw colour is allowed)

| File | Scope | Guard |
|---|---|---|
| **`frontend/src/theme/muiTheme.ts`** | MUI theme — palette, type, shape (`borderRadius:0`), flat component overrides. The primary source. | exempt |
| **`frontend/src/glass.scss`** | App-shell surfaces, flat tiles, neumorphic widgets, brand-mark fill var. | exempt |
| **`frontend/src/styles.scss`** | Font var, structural helpers, `.esti-brand` mask classes. Colourless except the brand var. | enforced |
| **`frontend/src/landing.scss`** | Landing (Carbon editorial) `--lp-*` tokens — warm accent = Radiant Orange. | exempt |

Everything else references these — no raw hex, no rounded corners. Enforcement:
`frontend/scripts/check-carbon.mjs` (frontend `lint`) + `carbon-policy.test.ts`.

---

## 7. Motion

Restrained and functional only — 100–120 ms ease transitions on hover/press; no
decorative keyframes. The permitted functional keyframes (state indicators, not
decoration) are listed in `CLAUDE.md`: `esti-pom-pulse`, `esti-zone-pulse`,
`esti-calm-breathe`, `esti-qpulse`.

---

## 8. Linked references

**Design docs**
- [`MATERIAL-UI-DIRECTION.md`](MATERIAL-UI-DIRECTION.md) — MUI theme, migration
  playbook, Rail/Stage, square-corner + palette-lock rules (app + portals).
- [`CARBON-UI-DIRECTION.md`](CARBON-UI-DIRECTION.md) — the landing surface + legacy
  Carbon exceptions.
- [`NAVIGATION.md`](NAVIGATION.md) — Canonical V3 information architecture / sidebar.
- [`INFORMATION-ARCHITECTURE.md`](INFORMATION-ARCHITECTURE.md) — module map.

**Code**
- Theme: `frontend/src/theme/muiTheme.ts` · `frontend/src/theme/MuiRoot.tsx`
- Surfaces: `frontend/src/glass.scss` · `frontend/src/styles.scss` ·
  `frontend/src/landing.scss`
- Layout shell: `frontend/src/components/RailLayout.tsx`
- Guard: `frontend/scripts/carbon-policy-rules.mjs` ·
  `frontend/scripts/check-carbon.mjs`

**Assets:** `frontend/public/` (brand marks, favicons, OG image).
