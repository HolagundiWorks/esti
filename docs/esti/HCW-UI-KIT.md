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

In code the layer recipes are tokens (`LAYERS.flat|soft|glass`, `NEU_RAISED`,
`GLASS_SURFACE`, the recessed `NEU_INSET` for inputs, `NEU_POP` for dialogs), and
the `<Surface layer="flat|soft|glass">` primitive applies them:

```tsx
<Surface layer="soft" sx={{ p: 2 }}>…a summary card…</Surface>   // Layer 2
<Surface layer="glass" sx={{ p: 2 }}>…a priority alert…</Surface> // Layer 3
```

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

Documented exception in `glass.scss` (blur/rgba) — promote to `@hcw/ui-kit` in U6:

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
Today it uses a sticky rail with a hairline separator; **U1** upgrades it to the glass
fixed-rail pattern above without per-screen copy-paste.

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
import { MuiRoot, ActionDockProvider, ActionDock, TaskbarFooter, TaskbarButton } from "@hcw/ui-kit";

<MuiRoot>                         {/* brand theme + dayjs */}
  <ActionDockProvider>           {/* the action registry */}
    <Shell>
      <Rail/><Stage><Routes/></Stage>
    </Shell>
    <ActionDock/>                {/* the floating action bar */}
    <TaskbarFooter left={<><TaskbarButton icon={<Bolt/>} label="ESTI"/> …</>} />
  </ActionDockProvider>
</MuiRoot>
```

Add `"@hcw/ui-kit": "workspace:*"` to the portal's `package.json`, and import the
brand font once (`@fontsource/urbanist` weights 400/500/600/700).

## What's in the package

```
packages/hcw-ui-kit/src/
├─ tokens.ts        colour, radius, type + the three LAYER recipes (single source of truth)
├─ theme.ts         the shared MUI theme built from the tokens
├─ MuiRoot.tsx      provider (theme + dayjs localization)
├─ Surface.tsx      <Surface layer="flat|soft|glass"> depth primitive
├─ ActionDock.tsx   ActionDockProvider · useScreenActions · <ActionDock/> (3 zones)
├─ TaskbarFooter.tsx <TaskbarFooter> + <TaskbarButton> (Windows-taskbar footer)
└─ BrandMark.tsx    asset-free wordmark
```

Source-only (like `@esti/contracts`); the consuming portal's bundler compiles it.
Colour + shape live ONLY here (and, for the landing page's editorial type scale,
in `landing.scss`).

## Adoption status & path

**Shipped (2026-07):**
- **Glass Rail reference complete** on Studio Intelligence (`/`): full-viewport-height
  frosted rail, independent stage scroll, stage-head zone health, glass taskbar footer.
  Canonical spec: [§ Glass Rail](#glass-rail--canonical-reference-studio-intelligence).
  Rollout queue: [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md).
- The workspace shell mounts `ActionDockProvider` + `ActionDock`; the dock renders
  once a screen publishes actions.
- The **taskbar footer is live** (`frontend/src/components/shell/AppFooterBar.tsx`):
  the old FloatingDock is retired. **Calculator LEFT**; launcher cluster **CENTRE**
  (Studio Intelligence · Tasks · Ask ESTI · Wellbeing · Pomodoro); **tray RIGHT**
  (due count · alerts · ID card · office health when not stable · clock · sign out).
  Admin menu moved to the header ribbon.
- **Layer 3 is applied app-wide via the theme:** every button's hover is the glass
  slab; error/warning alerts render as tinted glass.
- **ActionDock adopters (2026-07):** `Consultants.tsx`, `Contractors.tsx`,
  `Team.tsx`, `Contracts.tsx`, `Leads.tsx`, `Letters.tsx`, `Payroll.tsx`,
  `Proposals.tsx`, `ComplianceLibrary.tsx`, `StandardsLibrary.tsx`,
  `OfficeExpenses.tsx` (both `OfficeExpenses`/`CashBook`), `MasterPlanLibrary.tsx`,
  `Reconcile.tsx`, `Users.tsx`, `Vendors.tsx`, `DocumentsRegister.tsx`, `Work.tsx`
  — each screen's page-level CTA(s) moved from `RailLayout`'s `actions` slot into
  a `useScreenActions([...])` call. Tab-conditional actions (e.g. Compliance/
  Standards Library, Work) key off the active tab in the effect's deps; upload
  forms (Master Plan, Reconcile) key off the relevant field state so the dock
  button never fires a stale closure. Non-create utility actions (Export XLSX,
  Resync identity types) sit in the RIGHT zone rather than CENTER. Dialog-local
  Cancel/Save buttons stay in their `DialogActions` — the dock is for page-level
  CTAs, not modal actions. `ArchivedProjects.tsx` and `AuditLog.tsx` turned out
  to have no page-level `actions=` at all (only per-row `RowActionsMenu`) — no
  migration needed there.

**Remaining (incremental, screen-by-screen):**
1. **Glass Rail rollout** — upgrade `RailLayout` + migrate every workspace screen;
   login/auth → rail (form never on stage). Queue:
   [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) (U1–U3).
2. `Hr.tsx` and `Invoices.tsx` still hold inline `RailLayout actions=` (both are
   multi-button/tab-conditional and need a closer read before migrating).
   `Projects.tsx` and `Clients.tsx` are excluded for now — CLAUDE.md flags them
   as parallel WIP. Rows/tables stay Layer 1; summary/highlight cards adopt
   `<Surface layer="soft">`; priority widgets `<Surface layer="glass">`.
3. Portals beyond the workspace app (estimate app, ESE) mount `MuiRoot` +
   `TaskbarFooter`/`ActionDock` the same way.
