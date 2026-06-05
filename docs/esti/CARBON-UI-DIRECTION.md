# Carbon UI Direction

## Objective

ESTI should move toward a Carbon-inspired interface using IBM blue and a focused
light/dark mode system, while turning Dolibarr's retained backend capabilities
into an architect-office product experience.

This is a redesign direction, not a first-step rewrite. The implementation
should begin with an ESTI theme and reusable templates before core UI changes.

## Design Principles

- Use IBM blue as the primary brand color.
- Provide light and dark modes only.
- Remove theme marketplace/customization from the ESTI distribution profile.
- Keep dense office-management screens readable for repeated operational use.
- Prefer tables, filters, tabs, side panels, and clear action bars over
  marketing-style layouts.
- Keep forms compact and predictable for keyboard-heavy users.
- Preserve Dolibarr accessibility and translation behaviour.

## Theme Scope

Initial UI work should cover:

- Login screen.
- Main navigation.
- List pages.
- Object detail pages.
- Forms and validation states.
- Buttons, tabs, badges, alerts, filters, and modals.
- Architect office dashboards, project phase views, drawing registers, permit
  lists, fee proposals, and invoice views.

Core architect screens should include:

- Dashboard.
- Client and enquiry list.
- Project dashboard.
- Project phases.
- Fee proposal builder.
- Invoice and receipt tracking.
- Permit tracker.
- Drawing register and revision detail.
- Consultant register.
- Client portal.
- Drawing viewer and takeoff.
- Reports.

## Carbon Component Map

- Use `DataTable` patterns for projects, fee proposals, drawing registers,
  permit lists, consultant balances, invoices, and takeoff/BOQ support lines.
- Use `SideNav` for fixed global navigation and fluid local navigation.
- Use `Tabs` for project overview, phases, drawings, permits, fees, invoices,
  communication, and audit history.
- Use `Modal` for approvals, revision creation, issue-set confirmation, and
  locked/superseded record warnings.
- Use `ComboBox` for client, project, jurisdiction, phase, consultant,
  discipline, authority, SAC, and drawing lookup.
- Use `Toast` notifications for saves, uploads, issue-set creation, approvals,
  and validation failures.
- Use `DatePicker` for project milestones, permit due dates, drawing issue
  dates, proposal validity, and billing periods.
- Use inline loading states for uploads, DXF conversion, PDF rendering, report
  generation, and invoice exports.
- Use tags and status indicators for lifecycle states such as enquiry, active,
  on hold, concept, client review, issued, approved, superseded, overdue, paid,
  and pending TDS.

## Implementation Guardrails

- Avoid introducing Carbon packages until dependency and GPL compatibility are
  reviewed.
- Start with CSS and template alignment rather than a full frontend framework.
- Use Dolibarr hooks and theme extension points where possible.
- Keep JavaScript in separate files under the relevant module or theme path.
- Verify UI changes on common architect workflows: project creation, fee
  proposal revision, drawing issue, permit update, invoice creation, consultant
  assignment, and client portal review.

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
