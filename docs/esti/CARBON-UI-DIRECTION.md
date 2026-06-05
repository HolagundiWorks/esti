# Carbon UI Direction

## Objective

ESTI should move toward a Carbon-inspired interface using IBM blue and a focused
light/dark mode system, while preserving Dolibarr's proven ERP workflows.

This is a redesign direction, not a first-step rewrite. The implementation
should begin with an ESTI theme and reusable templates before core UI changes.

## Design Principles

- Use IBM blue as the primary brand color.
- Provide light and dark modes only.
- Remove theme marketplace/customization from the ESTI distribution profile.
- Keep dense ERP screens readable for repeated operational use.
- Prefer tables, filters, tabs, side panels, and clear action bars over
  marketing-style layouts.
- Keep forms compact and predictable for keyboard-heavy users.
- Preserve Dolibarr accessibility and translation behaviour.

## Theme Scope

Initial theme work should cover:

- Login screen.
- Main navigation.
- List pages.
- Object detail pages.
- Forms and validation states.
- Buttons, tabs, badges, alerts, filters, and modals.
- Construction dashboards and project cost views.

Core construction screens should include:

- Dashboard.
- DSR/SOR Library.
- BOQ Builder.
- Estimate Builder.
- Rate Analysis Sheet.
- Lead/Lift Calculator.
- Measurement Book Entry.
- RA Billing.
- Project Dashboard.
- Reports.

## Carbon Component Map

- Use `DataTable` patterns for DSR/SOR search, BOQ lines, measurement entries,
  RA bill quantities, and project cost tracking.
- Use `SideNav` for fixed global navigation and fluid local navigation.
- Use `Tabs` for estimate versions, BOQ views, rate-analysis components, and RA
  bill sections.
- Use `Modal` for approvals, revision creation, import confirmation, and locked
  record warnings.
- Use `ComboBox` for DSR/SOR item lookup, unit selection, source/site selection,
  and project/package selection.
- Use `Toast` notifications for saves, import results, approvals, and validation
  failures.
- Use `DatePicker` for schedule effective dates, estimate validity, measurement
  dates, and billing periods.
- Use inline loading states for imports, formula recalculation, and report
  generation.
- Use tags and status indicators for lifecycle states such as draft, internal
  review, client submission, technical sanction, approved, revised, and locked.

## Implementation Guardrails

- Avoid introducing Carbon packages until dependency and GPL compatibility are
  reviewed.
- Start with CSS and template alignment rather than a full frontend framework.
- Use Dolibarr hooks and theme extension points where possible.
- Keep JavaScript in separate files under the relevant module or theme path.
- Verify UI changes on common ERP workflows: estimate creation, BOQ editing,
  purchase order creation, stock issue, and billing.

## Proposed Color Tokens

```text
Primary: IBM blue family
Background light: white/neutral gray
Background dark: near-black neutral
Success: green
Warning: yellow/orange
Danger: red
Information: blue
```

Avoid one-note blue screens. Blue should identify actions and navigation, while
content areas remain neutral and readable.
