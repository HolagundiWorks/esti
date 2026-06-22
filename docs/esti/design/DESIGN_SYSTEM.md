# DESIGN SYSTEM — ESTI AORMS Master Reference

This is the master document for the ESTI AORMS design system. It defines the design philosophy, establishes how Carbon is used as the foundation, and provides the contribution checklist for every PR.

All seven supporting documents are cross-referenced below.

---

## 1. Design Philosophy

ESTI AORMS is an operational command system for Indian architecture practices. Its visual language is derived entirely from IBM Carbon Design System g100 (dark theme). The design philosophy has three principles:

**Clarity over decoration.** Every pixel must serve operational clarity. No gradients, shadows, rounded corners, or decorative colour. The interface exists to surface actionable information from complex project, financial, and team data.

**Semantic colour.** Colour communicates operational state — not branding. The AORMS alert palette (stable/watch/friction/critical) maps to business outcomes. The identity palette (CLIENT/FINANCE/PROJECT/TEAM) encodes domain zones. No other colours are permitted in the office shell.

**Carbon as the contract.** Carbon provides the grid, type scale, spacing scale, component library, and theme system. ESTI does not extend or override Carbon — it uses it. Custom CSS is limited to layout helpers that are colourless and structural only.

---

## 2. Carbon G100 as the Foundation

The entire office shell runs on Carbon's g100 (dark) theme. This is set via the `Theme` component wrapper in `App.tsx` and applies globally to all staff routes.

Carbon provides:
- **2x Grid** (16-column desktop, 8-column tablet, 4-column mobile) for all page layouts
- **Type scale** (label-01 through heading-06) for all text
- **Spacing scale** (spacing-01 through spacing-09) for all gaps, padding, and margin
- **Semantic colour tokens** (--cds-*) for all backgrounds, borders, and text
- **Component library** (Button, Tile, DataTable, Modal, Tabs, Tag, etc.) for all UI elements
- **Icon library** (@carbon/icons-react) for all iconography
- **Chart library** (@carbon/charts-react) for all data visualisation

The only deliberate departure from Carbon is the AORMS operational alert/identity palette documented in DESIGN_TOKENS.md. These colours communicate real-time business state and are isolated to Dashboard.tsx.

---

## 3. How to Use the Component Library

Before writing any JSX for a new UI element:

1. Check COMPONENT_LIBRARY.md to see if the element already exists as a Carbon component
2. Check CARBON_MAPPING.md to see if a custom implementation exists that should be replaced
3. If no Carbon component exists for the use case, check whether the nearest Carbon component can be extended with structural-only CSS (layout, sizing)
4. If you must write custom markup, it must be colourless and use only Carbon spacing tokens

The shared ESTI wrapper components (PageHeader, DataState, ConfirmModal, PeriodFilter, ZoneTile, KpiChip) must be used on every screen that matches their purpose. Never re-implement these patterns inline.

---

## 4. How to Add New Screens

To add a new route to ESTI:

1. Create the route file in `frontend/src/routes/`
2. Open the file with a Carbon `Stack gap={6}` as the root element
3. Use `PageHeader` as the first child for the page title, description, and primary action
4. Use `DataState` for any data list to handle loading and empty states
5. Use `TableContainer` + `Table` for data grids; add `DataTable` only if client-side sort/search is needed
6. Use `Modal` for all create/edit forms; always include `InlineNotification` for error states
7. Use `Tabs` (with URL-sync via useSearchParams) for screens with multiple views
8. Register the route in `App.tsx` with appropriate permission guards

**Layout decisions:**
- Single-column content: use `Stack gap={6}` directly inside the route
- Multi-column: use `Grid` + `Column` — never raw CSS flex/grid
- Constrained width: use `Column lg={8}` or `Column lg={10}`, never inline maxWidth
- Full-width tables: let `TableContainer` fill the Column naturally

---

## 5. CSS Class Rules

Permitted custom CSS classes are defined in `styles.scss` and are listed in CLAUDE.md. All permitted classes are:
- Structural and colourless (no colour values, no font-size, no decoration)
- Documented by a comment in styles.scss explaining their purpose
- Named with the `esti-` prefix

Do not add new CSS classes that set colour, font-size, font-weight, or decorative properties. These belong in Carbon tokens.

---

## 6. Contribution Checklist

Every developer must complete this checklist before raising a PR that touches `frontend/src/`:

**[ ] 1. Carbon-only components**
No non-Carbon UI component has been added. Every new element comes from @carbon/react, @carbon/icons-react, or @carbon/pictograms-react. Checked by searching imports for non-Carbon packages.

**[ ] 2. Spacing on Carbon scale**
Every inline style gap, padding, margin, or position value is on the Carbon spacing scale (2/4/8/12/16/24/32/40/48px). No raw pixel values like gap: 12 or padding: 6. Used Stack gap={N} for flex layout instead of inline flex.

**[ ] 3. No hardcoded colours**
No hex values except the documented AORMS exception palette (alert-stable #42be65, alert-watch #f1c21b, alert-friction #ff832b, alert-critical #fa4d56, plus four identity colours). All other colours use var(--cds-*) tokens.

**[ ] 4. No inline fontSize**
No style={{ fontSize: N }} or style={{ fontFamily: ..., fontSize: N }} except on pure-numeric dashboard KPI displays that require IBM Plex Mono. Hint text uses .esti-label--secondary class, not inline fontSize.

**[ ] 5. Shared components used**
PageHeader is used for every route page title. DataState is used for every list screen loading/empty state. ConfirmModal is used for every destructive action. PeriodFilter is used for every date-range filter. No inline re-implementations of these patterns.

---

## 7. Document Index

| Document | Purpose |
|---|---|
| [DESIGN_LAW.md](./DESIGN_LAW.md) | Constitution — 8 immutable rules for the ESTI UI |
| [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md) | Catalogue of every Carbon component in use and recommended additions |
| [CARBON_MAPPING.md](./CARBON_MAPPING.md) | Custom patterns mapped to their correct Carbon equivalents with remediation priority |
| [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) | Spacing, typography, colour, and border token definitions |
| [UI_CONSISTENCY_AUDIT.md](./UI_CONSISTENCY_AUDIT.md) | All violations found in the June 2026 code audit, with file/line and priority |
| [VISUAL_HIERARCHY_GUIDE.md](./VISUAL_HIERARCHY_GUIDE.md) | Per-route hierarchy assessment — primary element, secondary info, verdict, recommendation |
| [DASHBOARD_RULES.md](./DASHBOARD_RULES.md) | Fixed rules for the dashboard: telemetry strip, macro zones, quad cells, alert colours, tab structure |

---

## 8. Architecture Notes

**App shell theme:** `App.tsx` wraps the office shell in `Theme theme="g100"`. This must not change.

**Portal themes:** `Portal.tsx` and `CollaboratorPortal.tsx` use `Theme theme="white"` — intentional for external-facing views.

**Fonts:** IBM Plex Sans (Carbon default) via CDN at `https://unpkg.com/@ibm/plex@6.4.1`. IBM Plex Mono is available for numeric KPI display.

**Charts:** `@carbon/charts-react` with `MeterChart` used in Performance.tsx. The chart `theme` prop receives the value from `useAppTheme()` to stay in sync with the Carbon theme context.

**Dark background:** `html:has(.esti-app-shell)` sets `background: #161616` on body so there is no unstyled flash between navigation. This is the only body-level CSS in styles.scss.

**Dashboard width:** The dashboard uses `style={{ width: "80%", margin: "0 auto" }}` as a documented product decision for the command-center layout on wide monitors. This is not a pattern to copy to other screens.