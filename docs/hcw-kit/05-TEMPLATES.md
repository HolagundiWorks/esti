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
├ optional success Alert (dismissible)
└ DataState(loading, isEmpty, empty:{one sentence + one action})
    └ DataGrid (≤8 columns · StatusDot for status · RowActionsMenu per row)
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

*Gaps to fill as products demand them (register D-item when real): wizard
(multi-step) template — no shipped reference yet; use dialogs + goal-gradient
progress per the UX checklists when one is first needed.*
