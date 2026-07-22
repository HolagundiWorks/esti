# Page templates — canonical anatomies

**Status:** Documented from shipped screens (2026-07-11). These are not new
inventions (Constitution VI): each template names its live reference
implementation — clone that, don't improvise. Every template presumes the shell
contract: rail · stage · taskbar footer · ActionDock, breadcrumb + document
title via `PageBreadcrumb`, CTAs via `useScreenActions`.

## T1 — Dashboard (reference: `StudioAbstract.tsx`, route `/`)

```
RAIL (glass, fixed)                STAGE (scrolls)
├ identity + greeting              ├ stage head: zone-health orb row (26px, shape-coded)
├ attention line (one issue)       ├ ≤4 KPI cards (TYPE_SCALE.kpi values)
├ telemetry bands (hairline-split) ├ tab strip (transparent, inset top alert line)
├ vertical section tabs            └ per-tab: 4 KPIs + one DataGrid that scrolls
└ module toggles (mt:auto)             inside its tile — the page never scrolls
```
Rules: ≤4 KPIs visible (Miller); health = shape + colour; numbers drill through.

## T2 — List / register (reference: `Consultants.tsx`, `Invoices.tsx`)

```
RailLayout(title, description, aside: search/filters)
├ PageBreadcrumb
├ Box sx={layoutSx.listToolbar}
│   ├ TextField sx={searchFieldSx} + Search InputAdornment
│   └ filters (Select / ToggleButtonGroup)
├ optional success Alert (dismissible)
└ DataState(loading, isEmpty, empty:{one sentence + one action})
    └ DataGrid (≤8 columns · StatusDot for status · RowActionsMenu per row)
       — prefer KitRoot density="compact" on dense registers
Dock: CENTER "New <object>" · dialog publishes [] while open
Create/edit = Dialog (aria-labelledby) — never an always-visible form
```

## T3 — Detail (reference: `ProjectDetail.tsx`)

```
RailLayout · PageBreadcrumb (list → this record, 2–4 levels)
├ header: record identity + StatusDot
├ tab strip for facets (each facet = its own panel component)
└ facet panels own their queries; mutations carry meta.errorTitle
Dock: RIGHT commit actions for the active facet · LEFT destroy (ConfirmModal)
```

## T4 — Settings / preferences (reference: `WorkspaceSettingsPanel.tsx`)

```
Stacked `esti-form-panel` blocks, one concern each (Appearance · Photo ·
Password · 2FA…), subtitle1 headings, helper text via esti-label--helper.
Success = dismissible Alert or toast; every mutation pending-disables its button.
```

## T5 — Auth (reference: `Login.tsx` + `AuthRailLayout`)

```
AuthRailLayout: FORM IN THE RAIL (never centred on stage) · AuthBrandBlock top
· stage = editorial/brand canvas only. autoComplete on every identity field;
errors inline below the fields; single submit with progress verb.
```

## T6 — Portal (external users) (reference: `Portal.tsx` + `ExternalPortalShell`)

```
ExternalPortalShell (GlassRail): rail = portal label + firm + sign-out (44px);
stage = read-mostly panels + request forms. No taskbar, no ActionDock —
portal-class surfaces are dock-less by design (documented exception).
```

## T7 — Marketing page (reference: `MarketingShell` + `DesignSystemPage.tsx`)

```
MarketingShell: clear-glass floating rail (open 240 / collapsed 56) · SectionDock
scroll-spy · heading-glass section heads · FLAT sub-cards (no glass on tiles)
· contours atmosphere · one h1 · single #lp2-main.
```

## T8 — Report / document output (reference: `Filing.tsx`, PDF cells)

```
List template (T2) + per-row generate/download actions; generation shows an
honest busy state and lands the output action in place. Money via formatINR;
en-IN dates.
```

## T9 — Wizard / multi-step flow (reference: `AccountHub.tsx`)

```
Multi-step guided flow on the shell contract:
├ RAIL   step progress — Stepper (MuiStepper themed: accent-active · success
│        completed · accent-outlined current) OR a Step checklist that
│        auto-completes from state (AccountHub: Account ✓ → Company → Workspace)
├ STAGE  the CURRENT step only — one concern per step (form / summary / confirm),
│        chunked (Tesler): never the whole flow at once
└ DOCK   LEFT "Back" (reversible) · RIGHT "Next" / "Finish" (commit) — publish []
         while a step-level Dialog is open
```
Rules: goal-gradient progress always visible (Nielsen #1 + goal-gradient law); one
step = one decision (Miller); "Next" disabled until the step validates (error
prevention); completed steps stay reachable to edit. Kit theming: `MuiStepper` /
`MuiStepIcon` / `MuiStepConnector` (governed in `theme.ts`).

## T10 — AI / mission orchestration (reference: kit primitives)

Mission-first supervision surface (Framework principle 6). Domain-agnostic kit
primitives — product supplies copy and phase enums.

```
RailLayout (GlassRail)
├ RAIL
│  ├ MissionHeader          — one-sentence mission + status
│  ├ AwarenessStrip         — state · meaning · next (judgment = interrupt)
│  ├ ObjectiveList          — ≤ CAPACITY.railObjectives (5)
│  └ ConfidenceBand         — low|medium|high (never lone false-precision %)
├ STAGE
│  ├ PhaseStrip             — phase · progress · eta
│  ├ DecisionQueue          — Pending Decisions first (DecisionCard)
│  ├ FreezeTable            — locked decisions (read-only)
│  ├ risks / artifacts      — StatusDot · HealthGlassOrb · soft Surface
│  └ optional implementation detail (collapsed by default)
└ DOCK
   LEFT reject / defer · CENTER choose alternative · RIGHT approve / freeze
   publish [] while a decision Dialog is open
   RIGHT commits: DockAction.outcome + track → publishOutcome + ux.dock/ux.outcome
```

Four questions above the fold (≤30s): What is the mission? What is done? What needs
judgment? What happens next? Ambient progress never interrupts. Compose only from
`@hcw/ui-kit` — do not invent a fifth chrome region.

---

*Template catalog complete (T1–T10). Register a D-item only if a new pattern is
needed without a shipped reference to clone.*
