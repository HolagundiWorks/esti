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
┌───────────────────────────────────────────────────────────┐
│                         STAGE                              │
│ R  │   working surface: tables (L1), cards/panels (L2),    │
│ A  │   dialogs (L2), inline hovers (L3)                    │
│ I  │                                                       │
│ L  │                                                       │
│    │              ╭──── ActionDock (L2→L3) ────╮           │
│    │              │  ⌫ delete │  ＋ new  │ 💾 save │        │  ← floats, glass on hover
├────┴──────────────┴───────────────────────────┴───────────┤
│ [ESTI][Pomodoro][Calc]                       12:40 · 08 Jul│  ← TaskbarFooter (Windows taskbar)
└───────────────────────────────────────────────────────────┘
```

- **Rail** (left) — navigation (the recursive `NavNode` tree). Layer 1.
- **Stage** (centre) — the working surface. Layers 1 + 2, hover in Layer 3.
- **TaskbarFooter** (bottom, full width) — a **Windows-taskbar-style** bar:
  persistent app widgets / launchers (ESTI, Pomodoro, Calculator) as **icons on
  the LEFT**; the **clock on the RIGHT** (system-tray position). Flat white with a
  hairline top edge; each launcher chip is neumorphic (`TaskbarButton`). This is
  the relocated + reoriented former floating dock (`TASKBAR_HEIGHT = 56`).
- **ActionDock** (bottom-centre, floats above the stage, clears the footer) — the
  one **global, context-aware** action bar. **All CTAs live here, not inline.**

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
- The workspace shell mounts `ActionDockProvider` + `ActionDock`; the dock renders
  once a screen publishes actions.
- The **taskbar footer is live** (`frontend/src/components/shell/AppFooterBar.tsx`):
  the old FloatingDock is retired and its widgets (Studio Intelligence · Tasks ·
  Wellness · Pomodoro · Calculator · Alerts · ESTI AI) sit LEFT with the admin
  menu/ID card/sign-out; search is centred; the tray (due · office health · clock)
  sits RIGHT. The office-health signal is the footer's top border.
- **Layer 3 is applied app-wide via the theme:** every button's hover is the glass
  slab; error/warning alerts render as tinted glass.
- **First ActionDock adopters (2026-07):** `Consultants.tsx`, `Contractors.tsx`,
  `Team.tsx` — each screen's page-level "New …" button moved from
  `RailLayout`'s `actions` slot into a single `useScreenActions([...])` call
  (CENTER zone). Dialog-local Cancel/Save buttons stay in their `DialogActions`
  — the dock is for page-level CTAs, not modal actions.

**Remaining (incremental, screen-by-screen):**
1. Migrate the rest of the `RailLayout actions=` screens the same way —
   `ArchivedProjects`, `AuditLog`, `ComplianceLibrary`, `Contracts`,
   `DocumentsRegister`, `Hr`, `Invoices`, `Leads`, `Letters`,
   `MasterPlanLibrary`, `OfficeExpenses`, `Payroll`, `Proposals`, `Reconcile`,
   `StandardsLibrary`, `Users`, `Vendors`, `Work`. (`Projects.tsx` and
   `Clients.tsx` are excluded for now — CLAUDE.md flags them as parallel WIP.)
   Rows/tables stay Layer 1; summary/highlight cards adopt
   `<Surface layer="soft">`; priority widgets `<Surface layer="glass">`.
2. Portals beyond the workspace app (estimate app, ESE) mount `MuiRoot` +
   `TaskbarFooter`/`ActionDock` the same way.
