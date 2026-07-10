# HCW-UI-Kit — the layered design system

**HCW-UI-Kit** (*Human Centric Works UI Kit*, package `@hcw/ui-kit`) is the single,
centralised design system deployed against **every** AORMS portal — the workspace
app, the client & consultant portals, the licensing console, ESE, the Estimate
app, and any future deployable. Change a token or a primitive here and every
portal that mounts the kit moves together.

## Thesis — *depth encodes importance*

Three material languages are stacked by visual depth. **The flatter and calmer a
thing is, the more it is "just information"; the more it lifts, softens, or glows,
the more it is "an object you act within" or "an action/alert that wants you now."**
You never pick a layer by taste — you pick it by the element's **role**.

| Layer | Language | Material | Used for | Job |
|---|---|---|---|---|
| **1** | **Hyperminimalist** | FLAT — Fog-Gray canvas, Pure-White, hairline rules, no box, no shadow | data tables, body text, headings, labels, inputs **at rest** (~90% of pixels) | legibility, calm |
| **2** | **Neumorphic** | SOFT — same-material block extruded/recessed with soft dual shadows, no border | dialogs, text panels, widgets, highlight / summary cards, text-entry wells | "a physical object you work within" |
| **3** | **Glassmorphism** | GLASS — translucent frosted glass, blur + light edge, floats above everything | **hover states, CTAs, the action dock, priority notifications, active/important widgets** | attention + action |

Mnemonic: **Flat = info at rest · Soft = objects you handle · Glass = actions &
alerts that rise to the top.** The single Radiant-Orange accent concentrates in
Layer 3, so *actionability itself* is what glows.

In code the layer recipes are tokens (`LAYERS.flat|soft|glass|clearGlass|headingGlass`,
`NEU_RAISED`, `GLASS_SURFACE`, `CLEAR_GLASS_SURFACE`, `HEADING_GLASS_SURFACE`, the
recessed `NEU_INSET` for inputs, `NEU_POP` for dialogs), and the
`<Surface layer="…">` primitive applies them:

```tsx
<Surface layer="soft" sx={{ p: 2 }}>…a summary card…</Surface>        // Layer 2
<Surface layer="glass" sx={{ p: 2 }}>…a priority alert…</Surface>     // Layer 3 frost
<Surface layer="clearGlass">…marketing rail…</Surface>                // Layer 3 clear
<Surface layer="headingGlass">…full-width section head…</Surface>     // Layer 3 heading
```

### Layer decision tree

```
Is it a page-level CTA?                    → ActionDock (not a Surface)
Is it information at rest (table/text)?    → flat
Is it a contained object (dialog/panel)?   → soft
Is it actionable / alert / dock chrome?    → glass (frost)
Is it a marketing rail over atmosphere?    → clearGlass
Is it a marketing section heading band?    → headingGlass
Is it a marketing sub-card / tile?         → flat (transparent + hairline — NO glass)
```

**Do not** put glass on every card. Glass is scarce on purpose — when everything
glows, nothing does (Von Restorff / depth-encodes-importance).

## Spatial model — Rail · Stage · Footer · Dock

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌─ RAIL (20%, glass, 100vh) ─┐  STAGE (80%, scrolls)                    │
│  │ identity · telemetry       │  stage head (zone health, KPIs)           │
│  │ section tabs · filters     │  tables (L1) · panels (L2) · dialogs     │
│  │ module toggles (bottom)    │                                          │
│  │                            │        ╭── ActionDock (L2→L3) ──╮        │
│  │  ← fixed full viewport     │        │ ⌫ │ ＋ new │ 💾 save │          │
│  └────────────────────────────┘                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [Calc]    [Studio·Tasks·ESTI·Wellbeing·Pomodoro]    due·🔔·ID·🕐·out    │  ← glass taskbar
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Width | Layer | Role |
|--------|-------|-------|------|
| **Rail** | 20% | **Glass (L3)** — frosted panel, full viewport height on desktop | Fixed **instruments**: identity/greeting, telemetry, health summaries, vertical section tabs, filters, module toggles (`mt: auto` at bottom). Scrolls internally (hidden scrollbar). **Auth panels (login, signup, recovery) live here — never on the stage.** |
| **Stage** | 80% | Flat (L1) + soft cards (L2) | **Working surface**: stage-head metrics (e.g. zone health row), DataGrids, editors, tab bodies. **Scrolls independently** on desktop; the page shell does not scroll. |
| **TaskbarFooter** | full width | Glass (L3) | **Calculator LEFT**; launcher cluster **CENTRE** (Studio Intelligence · Tasks · Ask ESTI · Wellbeing · Pomodoro); **system tray RIGHT** (due count · alerts · ID card · office health when not stable · clock · sign out). Admin menu lives in the **header ribbon**, not the footer. |
| **ActionDock** | floats bottom-centre | Soft → glass on hover | The one **global, context-aware** action bar. **All page-level CTAs live here, not inline.** |

**Rollout queue:** [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) — clone the
Studio Intelligence rail to every `RailLayout` screen and move login into the rail.

### Marketing shell — public site (`MarketingShell`)

**Status: design complete (2026-07-10)** on `aorms.in` (`Landing.tsx`, Blog, SEO
landings, Investors) via `frontend/src/components/landing/MarketingShell.tsx` +
`frontend/src/landing.scss`.

Marketing reuses the same **Rail · Stage · ActionDock** spatial model as the
workspace, with these deliberate differences:

| Region | Marketing rule |
|--------|----------------|
| **Rail** | Glass nav only — brand logo, section links, value-prop line, HCW mark. **No Create / Sign-in buttons** (those are dock-only). Default **expanded** on desktop; user may collapse. |
| **Stage** | Scrolls the long-form page; single `#lp2-main` landmark (do not nest `<main>`). |
| **TaskbarFooter** | **Absent** on marketing — dock sits closer to the viewport bottom (`--esti-dock-bottom: 24px`). |
| **ActionDock** | **Sole** locus for Create account (CENTER) and Sign in (RIGHT). Mount `ActionDockProvider` inside `MarketingShell` because public routes sit outside the app shell. |

#### Hero composition (brand test)

First viewport must read as **one composition**:

1. **AORMS logo** (`<AormsLogo variant="hero" />` — CSS-mask `/aorms-logo.png`, Radiant Orange) — **not** plain text “AORMS”
2. One headline (`h1`)
3. One short supporting sentence
4. **No** signal chips, stats, or CTAs in the hero — CTAs are in the ActionDock

#### Contour atmosphere (Layer 0)

`LandingContours` is a fixed, non-interactive backdrop (chaos → clarity hill).
Depth is scroll-driven via `--lp-depth` (**0.08 → 1 across the full page
scroll range**, not mid-fold). Progress uses smoothstep + frame lerp so the
hill keeps elevating through the footer. **Z-stack steps are 3× the 2026-07
baseline** so elevation reads clearly:

| Token | Value (3×) | Role |
|-------|------------|------|
| `--lp-step-far` | `42px` | far-band `translateZ` step |
| `--lp-step-mid` | `66px` | mid-band `translateZ` step |
| `--lp-step-near` | `90px` | near-band `translateZ` step |
| `--lp-rise-far/mid/near` | `30 / 48 / 72px` | vertical stack rise |

Owned in `landing.scss` (editorial marketing system) — **not** in `@hcw/ui-kit`
tokens. Kit owns workspace/portal chrome; marketing atmosphere stays in
`landing.scss` so blur/rgba/3-D exceptions do not leak into product screens.

#### Glass hierarchy on marketing stage

| Surface | Treatment | Why |
|---------|-----------|-----|
| **Rail** | Clear glass (light frost, translucent) — kit `CLEAR_GLASS_SURFACE` / `layer="clearGlass"` | L3 instrument chrome; contours readable through it |
| **Section heading** (`.lp2-section-head`) | Clear heading glass, **full content width** — kit `HEADING_GLASS_SURFACE` | Hierarchy — the only stage glass |
| **Sub-cards** (tiles, pricing meters, trust, FAQ items) | **No glass** — transparent + hairline dividers | Lets the contour background stay sharp |

Do **not** put `backdrop-filter` on `.lp2-tile` / pricing meters — that milks the
scene and flattens hierarchy. Marketing SCSS currently mirrors these recipes;
prefer importing the kit tokens when migrating surfaces to MUI `sx`.

#### FAQ & progressive disclosure

Long FAQ answers use native `<details>` / `<summary>` in a **3-column grid**
(`.lp2-faq` — 3 / 2 / 1 columns by breakpoint), not a wall of open tiles.
Trust strip caps at **≤4** pain→solution chips (Miller).

#### Brand assets

| Surface | Primitive |
|---------|-----------|
| Marketing hero / rail / footer | `AormsLogo` (`frontend`) — mask logo |
| Kit-portable wordmark (no image) | `<BrandMark />` from `@hcw/ui-kit` |
| Auth rail | `AuthBrandBlock` / `AormsLogo variant="rail"` |

### Glass Rail — canonical reference (Studio Intelligence)

**Status: design complete (2026-07-09)** on `/` (`StudioAbstract.tsx` +
`frontend/src/glass.scss`). This is the template every workspace screen should match.

#### Geometry

| Property | Desktop (≥901px) | Mobile |
|----------|------------------|--------|
| Width | 20% of content area (`calc((100vw - 32px) * 0.2)`) | 100%, stacks above stage |
| Height | `100vh`, `position: fixed`, `top: 0` | auto (static) |
| Scroll | Rail scrolls internally; stage scrolls beside it | Page scrolls normally |
| Spacer | Hidden 20% flex sibling reserves width while rail is fixed | none |

Classes: `.esti-dash-rail` (rail) · `.esti-dash-stage` (stage) · wrapper
`.esti-glass-dash`. Studio home adds `.esti-app-shell2--studio-home` for the white
canvas + ambient pulse.

#### Glass panel recipe (rail)

Documented exception in `glass.scss` (blur/rgba). **U6 (2026-07):** layout
primitives live in `@hcw/ui-kit` (`GlassRail`, `HealthGlassOrb`, `Surface`).
`glass.scss` retains Studio pulse, orb CSS, and frosted panel recipes only:

- `border: 1px solid rgba(255,255,255,0.5)` · `border-radius: 14px`
- Background: `linear-gradient(145deg, rgba(255,255,255,0.44), rgba(255,255,255,0.2))`
- `backdrop-filter: blur(12px) saturate(1.2)` + soft outer shadow + inset highlight
- `padding: 12px` · `gap: 12px` column flex
- Float-nav clearance: `padding-top: 40px` when ribbon uses `variant="float"`

#### Rail content stack (top → bottom)

1. **Identity** — light `h5` greeting line + semibold name + optional firm caption
2. **Attention** — one-line `body2` secondary issue/action
3. **Telemetry sections** — `overline` label + content; use hairline `borderTop` /
   `borderBottom` between bands (Today grid, office health, due dates)
4. **Section tabs** — vertical MUI tabs, left-aligned (`.MuiTab-root` in rail SCSS)
5. **Module toggles** — icon · label · `Switch` per row; `mt: "auto"` pins to bottom

**Office health** (single glass orb + state word) belongs in the **rail**.
**Zone health** (multi-zone orb row) belongs in the **stage head** — top hairline,
`overline` heading on the **left**, 26×26px glass orbs with labels **beside** each dot.

#### Stage head (zone health row)

```
──────────────────────────── top divider ────────────────────────────
Zone health    ● Lead   ● Project   ● Financial   ● Team   …
──────────────────────────── KPI row / tabs below ───────────────────
```

Component: `OfficeHealthGlyph` `variant="glass"` + `.esti-zone-glass-orb` in
`glass.scss`. Default orb 13×13px; **stage-head orbs 26×26px**
(`.esti-dash-stage-head__zones .esti-zone-glass-orb`).

#### Login & auth — rail, not stage

Unauthenticated surfaces use the same 20/80 split. The **form panel** (email,
password, Google, tenant picker, recovery links) is rendered inside the **glass rail**.
The **stage** holds editorial/brand content only — product visual, tagline, or calm
empty canvas. **Never** centre a `max-width: 24rem` card on the page. See
[AORMS-UI-AUTOPILOT-ROADMAP.md U2](AORMS-UI-AUTOPILOT-ROADMAP.md#u2--login--auth-rail).

#### Shared shell for other screens

`frontend/src/components/RailLayout.tsx` — `<RailLayout title tabs aside>{stage}</RailLayout>`.
**U1 complete (2026-07):** glass fixed-rail pattern (`.esti-dash-rail` /
`.esti-dash-stage`). Prefer `RailLayout` for workspace screens; prefer kit
`GlassRail` for portals / auth / account shells outside the ribbon chrome.

### The action dock — one dock, three zones

A screen never renders its own CTAs; it **publishes** them to the global dock,
which lays them out in three fixed zones so the geography is identical everywhere:

| Zone | Meaning | Examples | Tone |
|---|---|---|---|
| **LEFT** | exit / destroy | Delete · Discard / Save-without-changes · Cancel | `danger` (red) |
| **CENTER** | generate | Add · Create · New | `primary` (orange) |
| **RIGHT** | commit | Save · Edit · Save-changes · Confirm | `primary` (orange) |

Create in the middle, commit on the right, destroy on the left — muscle memory
across the whole product (and Fitts's-law-friendly big targets). Dock buttons are
neumorphic at rest and **lift to glass on hover**. The dock hides itself when no
screen has published actions.

```tsx
// In a screen — declare actions; they appear in the dock, clear on unmount.
useScreenActions(
  [
    { id: "delete", zone: "left",   tone: "danger",  label: "Delete", icon: <Delete/>,  onClick: onDelete, disabled: !selected },
    { id: "new",    zone: "center", tone: "primary", label: "New",    icon: <Add/>,     onClick: onNew },
    { id: "save",   zone: "right",  tone: "primary", label: "Save",   icon: <Save/>,    onClick: onSave,   disabled: !dirty },
  ],
  [selected, dirty],
);
```

## Mounting the kit in a portal

```tsx
import {
  MuiRoot, ActionDockProvider, ActionDock, TaskbarFooter, TaskbarButton,
  GlassRail, Surface, useScreenActions, HealthGlassOrb,
} from "@hcw/ui-kit";

<MuiRoot>
  <ActionDockProvider>
    <GlassRail glass="frost" rail={<>…</>}>
      <Routes />
    </GlassRail>
    <ActionDock />
    <TaskbarFooter left={…} center={…} right={…} />
  </ActionDockProvider>
</MuiRoot>
```

Add `"@hcw/ui-kit": "workspace:*"` to the portal's `package.json`, and import the
brand font once (`@fontsource/urbanist` weights 400/500/600/700).

## What's in the package

```
packages/hcw-ui-kit/src/
├─ tokens.ts          colour, radius, type + LAYER recipes
│                     (flat · soft · glass · clearGlass · headingGlass)
├─ theme.ts           shared MUI theme from tokens
├─ MuiRoot.tsx        provider (theme + dayjs)
├─ Surface.tsx        <Surface layer="…">
├─ GlassRail.tsx      rail · stage (`glass="frost|clear"`)
├─ HealthGlassOrb.tsx zone / office-health (flat | glass)
├─ ActionDock.tsx     provider · useScreenActions · <ActionDock/>
├─ TaskbarFooter.tsx  left · center · right + TaskbarButton
└─ BrandMark.tsx      asset-free wordmark
```

Source-only (like `@esti/contracts`); the consuming portal's bundler compiles it.
Colour + shape live ONLY here (and, for the landing page's editorial type scale /
contour atmosphere, in `landing.scss`).

Package README: [`packages/hcw-ui-kit/README.md`](../../packages/hcw-ui-kit/README.md).

## Adoption status & path

**Shipped (2026-07):**
- **Glass Rail reference complete** on Studio Intelligence (`/`): full-viewport-height
  frosted rail, independent stage scroll, stage-head zone health, glass taskbar footer.
  Canonical spec: [§ Glass Rail](#glass-rail--canonical-reference-studio-intelligence).
  Rollout: [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) **U0–U6 ✅**.
- **Marketing shell complete** on public site: clear-glass rail · full-width heading
  glass · flat sub-cards · hero logo · contour z-depth 3× · full-page scroll depth ·
  dock-only CTAs · FAQ 3-up. Spec:
  [§ Marketing shell](#marketing-shell--public-site-marketingshell).
- **Kit exports:** `GlassRail`, `HealthGlassOrb`, `Surface` (+ clear/heading glass),
  `ActionDock`, `TaskbarFooter` (`left` · `center` · `right`), `CLEAR_GLASS_SURFACE`,
  `HEADING_GLASS_SURFACE`.
- Workspace + marketing mount `ActionDockProvider` + `ActionDock`.
- **Taskbar footer** live (`AppFooterBar`); FloatingDock retired.
- Layer 3 via theme: button hover glass; error/warning alerts tinted glass.

**Remaining (incremental):**
1. Estimate app E1 UI pivot when `estimate/` lands — same kit mount pattern.
2. Optional: marketing SCSS rail/heads import kit clear-glass tokens instead of
   duplicated rgba recipes.
3. Optional further shrink of `glass.scss` once orb class aliases fully migrate
   (`hcw-health-glass-orb*`).
4. `Projects.tsx` / `Clients.tsx` remain parallel-WIP — do not edit unless asked.
