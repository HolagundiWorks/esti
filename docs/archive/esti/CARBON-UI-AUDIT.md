> **ARCHIVED** (2026-07-09) � Obsolete; kept for historical reference only.
> **Do not use** for implementation or onboarding.
> **Superseded by:** [HCW-UI-KIT.md](../esti/HCW-UI-KIT.md), [MATERIAL-UI-DIRECTION.md](../esti/MATERIAL-UI-DIRECTION.md). Carbon React was removed 2026-07.

# AORMS UI/UX Carbon Audit

_Deep-dive audit of the AORMS frontend (`frontend/src/`) against the
**PURE CARBON ONLY** mandate (see `CLAUDE.md`). Grounded by reading `styles.scss`,
`landing.scss`, `App.tsx`, `main.tsx`, the shared shells
(`components/dashboard/abstractShell.tsx`, `zoneState.ts`, `dashboardUi.tsx`), the
shared primitives (`PageHeader.tsx`, `DataState.tsx`, `ToastHost.tsx`, `StatusTag.tsx`),
and the major route screens (StudioAbstract, Invoices, Proposals, Consultants,
KnowledgeBank, Team, Clients, Contractors, Projects, Leads, Payroll)._

## Executive Summary

The AORMS workspace UI is **~90% Carbon-compliant** and architecturally disciplined.
There is no rogue CSS framework, no hand-rolled buttons/inputs/modals/tables, and colour
is overwhelmingly `var(--cds-*)` token-driven plus documented semantic maps
(`ZONE_COLOR`, `HEALTH_TAG`, `TILE_COLOR`). Navigation, shell, tables, forms, modals,
empty/loading states, and page headers are all built from `@carbon/react` (v1.71.0), and
shared components (`PageHeader`, `DataState`, `AbstractScreenShell`) already remove most
boilerplate.

The gap is **consistency drift**, not wholesale violation:

1. A genuine, reproducible **navigation-width inconsistency** — nested menu items
   rendered at a different width/indent/hover-area than top-level items (mixed SideNav
   variants under `isRail`).
2. **Hardcoded px spacing in inline `style={}`** across ~30-40 screens instead of Carbon
   spacing tokens. Colours in those inline styles are tokenised; the *numbers* were not.
3. **Duplicated status→Tag mapping logic** re-implemented per route.
4. **Two divergent table patterns** (`DataTable` vs. raw `Table` primitives) with no rule
   for which to use.
5. A handful of **raw colour/opacity values** in `styles.scss`.

This audit shipped with a refactor addressing items 1, 2, 3, 5 and documenting item 4.

## Critical Carbon Violations

| Location | Issue | Carbon Rule Violated | Fix |
|---|---|---|---|
| `App.tsx` sidebar (`renderNavNode` + `<SideNav isRail>`) | Sidebar mixed `SideNavLink` (top-level, icon, full-width) with `SideNavMenuItem` (nested, no icon, Carbon-indented). Nested leaves rendered at a different width/indent/hover-area → the reported "80% vs 100%" menu inconsistency. | One consistent nav-item contract | **Fixed:** every leaf (top-level or nested) is now a `SideNavLink` with an icon; grouping is expressed only through `SideNavMenu`. |
| `styles.scss` `@keyframes esti-calm-breathe` | `rgba(66,190,101,0.42)` raw green RGB. | No hardcoded colours; use `--cds-*` | **Fixed:** `color-mix(in srgb, var(--cds-support-success) 42%, transparent)`. |
| ~30-40 route/component files | Inline `style={{ padding: "4px 0 4px 12px", marginBottom: 16, gap: 8 }}` — hardcoded px spacing. | No random padding values; use `var(--cds-spacing-*)` | **Fixed:** spacing swept to `var(--cds-spacing-*)` tokens. |
| `styles.scss:742,828` | `color: rgba(255,255,255,α)` overlay text. | Use tokens | **Fixed:** `var(--cds-text-on-color)`. |

## Styling Inconsistencies

| Location | Current Styling | Expected Styling | Status |
|---|---|---|---|
| Tables across routes | `DataTable`+toolbar (Consultants, Clients, Projects) vs. raw `Table` primitives (Invoices, Proposals, Payroll, KnowledgeBank, Studio shell) | `DataTable` for interactive lists (sort/search/select); raw primitives only for read-only/embedded dense tables | Rule documented in `CARBON-UI-DIRECTION.md`; interactive-list migration is incremental |
| `Team.tsx` loading state | Ad-hoc loading render | `DataState` / a grid skeleton | Addressed |
| Inline `Stack gap` values | Mixed `gap={3/4/5}` with no rule | Per-context scale (form fields `gap={5}`, header stacks `gap={3}`) | Codified in the standard |
| `styles.scss:742,828` | `rgba(255,255,255,α)` | `--cds-text-on-color` | Fixed |

## Custom Components — Keep / Replace / Refactor

| Component | Action | Reason |
|---|---|---|
| Per-route status→Tag ternaries | **Replaced** with `<StatusTag>` + maps in `@esti/contracts` | Same semantic re-implemented ≥6×; drift risk |
| `PageHeader.tsx` | Keep | Single page-header source; 15+ routes |
| `DataState.tsx` | Keep + adopt everywhere | Correct `DataTableSkeleton`+`Tile` composition |
| `AbstractScreenShell` / `zoneState.ts` | Keep | Enforces identical Studio-tab layout; documented semantic map |
| `ToastHost.tsx`, `ConfirmModal.tsx`, `DrawingIssueCell.tsx` | Keep | Thin Carbon wrappers |
| `StaffAvatar`, `UserIdCard`, `PomodoroRing`, `GanttChart`, `FloatingDock/Calculator`, `ScrollAffordance` | Keep | No Carbon equivalent; colour-token-clean layout/utility glue |

## Reusable Component Opportunities

| Pattern | Proposed Shared Component | Carbon Base | Status |
|---|---|---|---|
| Status badges | `<StatusTag>` + contracts maps | `Tag` | Shipped |
| Nav items | one `renderNavNode` honouring a single contract | `SideNavLink` | Shipped |
| List page scaffold | `<ListScreen>` (header + toolbar + table + empty/loading) | `DataTable`+`TableToolbar`+`DataState`+`PageHeader` | Proposed |
| Modal create/edit forms | `<FormModal>` | `Modal`+`Stack` | Proposed |
| Tile-grid loading | `<CardGridSkeleton>` | `SkeletonPlaceholder`/`Tile` | Proposed |

## Layout Audit

`Grid`/`Column` + `Stack` are used correctly; the Studio shell fixes page height and
scrolls tables internally (page never scrolls). Page headers are unified via `PageHeader`.
Spacing was good at the *component* level but leaked at the *leaf* level (inline px) — the
biggest vertical-rhythm risk, now closed by the spacing sweep. Recommended one system:
`Grid`/`Column` for structure → `Stack` for vertical rhythm (never inline margins) →
`Tile` for grouped surfaces → `DataTable` for interactive lists → `Tabs` for in-screen
sections → `Modal` for create/edit → `SideNav` with a single item contract.

## Accessibility Issues

| Location | Severity | Issue | Status |
|---|---|---|---|
| `App.tsx` sidebar (`isRail`) | Major | Nested items were icon-less → not represented in the collapsed rail; keyboard/hover targets differed | Fixed — every item now has an icon |
| Icon-only actions (`IconButton`/`HeaderGlobalAction`) | Major | Need accessible names | Verified `aria-label` present on header actions |
| Overlay text `rgba(255,255,255,α)` | Minor | Contrast on lighter accents | Fixed via `--cds-text-on-color` |
| Status conveyed by Tag colour | Minor | Never colour-only | Tags always carry text |

Positive: `StatusSymbol` sets `aria-label`; `TabList` has `aria-label`; Carbon
`DataTable`/`Modal`/inputs bring focus trapping, header semantics, and label association.

## Recommended Carbon Styling Standard

See [`CARBON-UI-DIRECTION.md`](./CARBON-UI-DIRECTION.md) for the enforced standard:
page padding, section spacing (`Stack gap={5}`/`{3}`), card padding, table density &
selection rule, button sizes, heading hierarchy, status tags, empty/loading states,
forms, modals, side panels, and the nav-item contract.

## Non-Negotiable Rules Going Forward

- Use Carbon components first.
- No custom button, input, modal, table, tab, dropdown, tooltip, toast, or side panel
  unless approved and documented in `CARBON-UI-DIRECTION.md`.
- Carbon tokens for colour, spacing, typography, border, focus, motion.
- No hardcoded hex/rgb colours (incl. in `@keyframes`).
- No random padding/margin/gap numbers — spacing tokens or `Stack`/`Grid` only, including
  inside inline `style={}`.
- No duplicate KPI-card or status-badge patterns — one shared component each.
- No page-specific styling for reusable patterns.

## Menu / Navigation Audit

The reported inconsistency was **real**. The nav markup was pure Carbon (no inline
width/padding), but the **composition** produced two different item contracts in one rail.

**Mechanism (before fix):** `<SideNav isRail>` → collapsed icon rail, expand-on-hover.
Depth-0 leaves were `SideNavLink` *with* `renderIcon` (full-row, icon+label); nested
leaves were `SideNavMenuItem` *without* an icon → Carbon added inline-start padding, so
their text start, hover area, and clickable width differed. Under `isRail`, icon-less
nested items also had no collapsed-rail representation. That indent/hover/width divergence
is exactly the "one item at 80%, another at 100%" symptom.

| Item Type | Before | Required Standard | After |
|---|---|---|---|
| Top-level leaf | `SideNavLink` + icon, full-width | 100% row, icon+label gap, full-row click | Unchanged (reference contract) |
| Nested leaf | `SideNavMenuItem`, no icon, indented, narrower hover, not rail-representable | Same 100% row contract | Now `SideNavLink` + icon |
| Menu | `SideNavMenu` + icon | Consistent row height/hover | Unchanged; children now uniform |

**Root cause (ranked):** (1) Carbon component misuse / IA inconsistency — three SideNav
variants in one rail with inconsistent icon usage; (2) `isRail` + icon-less nested items;
(3) top-level vs. nested render paths never unified. **Not** the cause: duplicate menu
components, inline styles, CSS modules, hardcoded percentages, parent width.

**Resolution — one reusable Carbon-native nav item:** `renderNavNode` now renders *every*
leaf (top-level or nested) as a `SideNavLink` with a `renderIcon`, so all items share row
width, height, icon+label gap, hover/active/focus, and full-row click. Grouping is
expressed only through the nestable `SideNavMenu`; nested leaves are never a different
variant. `isRail` is retained (the floating dock is pinned to the 3rem rail).
