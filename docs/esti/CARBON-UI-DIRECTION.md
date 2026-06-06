# Carbon UI Direction — Design Language

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). This document is the
> **design-language** reference (principles, screens, components, tokens). The
> **technology stack and UI architecture are decided in
> [ARCHITECTURE](ARCHITECTURE.md)** — ADR-ESTI-02 mandates `@carbon/react`
> v11 as the sole component library and supersedes the earlier theme-first /
> "avoid Carbon packages" guidance._

## Objective

ESTI's product UI is a Carbon Design System interface using IBM blue and a
focused light/dark mode system, turning Dolibarr's retained backend capabilities
into an architect-office product experience. The interface is delivered as the
standalone Carbon React SPA described in [ARCHITECTURE](ARCHITECTURE.md);
this document governs how that UI should look and behave, not how it is built.

## Design Principles

- Use IBM blue as the primary brand color, applied through Carbon theme tokens.
- Provide light and dark modes only; no theme marketplace or user customization.
- Keep dense office-management screens readable for repeated operational use.
- Prefer tables, filters, tabs, side panels, and clear action bars over
  marketing-style layouts.
- Keep forms compact and predictable for keyboard-heavy users.
- Preserve accessibility and translation behaviour.

## Screen Scope

UI work should cover the shared shell — login, global navigation, list pages,
object detail pages, forms and validation states, and the common controls
(buttons, tabs, badges, alerts, filters, modals) — plus these core architect
screens:

- Dashboard.
- Client and enquiry list.
- Project dashboard and project phases.
- Fee proposal builder.
- Invoice and receipt tracking.
- Permit tracker.
- Drawing register and revision detail.
- Consultant register.
- Client portal.
- Drawing viewer and takeoff.
- Reports.

## Carbon Component Map

- `DataTable` — projects, fee proposals, drawing registers, permit lists,
  consultant balances, invoices, and takeoff/BOQ support lines.
- `SideNav` — fixed global navigation and fluid local navigation.
- `Tabs` — project overview, phases, drawings, permits, fees, invoices,
  communication, and audit history.
- `Modal` — approvals, revision creation, issue-set confirmation, and
  locked/superseded record warnings.
- `ComboBox` — client, project, jurisdiction, phase, consultant, discipline,
  authority, SAC, and drawing lookup.
- `Toast` — saves, uploads, issue-set creation, approvals, and validation
  failures.
- `DatePicker` — project milestones, permit due dates, drawing issue dates,
  proposal validity, and billing periods.
- Inline loading — uploads, DXF conversion, PDF rendering, report generation,
  and invoice exports.
- Tags / status indicators — enquiry, active, on hold, concept, client review,
  issued, approved, superseded, overdue, paid, and pending TDS.

## Implementation Guardrails

The build mechanics are governed by [ARCHITECTURE](ARCHITECTURE.md). For
UI work specifically:

- Use `@carbon/react` components and `@carbon/themes` tokens. Do **not** use raw
  hex values; express the ESTI/IBM blue brand as Carbon theme overrides.
- Layout with Carbon `Grid` / `Column` / `Row`.
- Icons from `@carbon/icons-react`; dashboard charts from `@carbon/charts-react`.
- Keep server state in React Query and form state in React Hook Form (see the
  frontend stack in ARCHITECTURE).
- Verify UI changes on real architect workflows: project creation, fee proposal
  revision, drawing issue, permit update, invoice creation, consultant
  assignment, and client portal review.

## Color Tokens

```text
Primary: IBM blue family (Carbon interactive tokens)
Background light: white / neutral gray
Background dark: near-black neutral
Success: green   Warning: yellow/orange   Danger: red   Information: blue
```

Avoid one-note blue screens. Blue should identify actions and navigation, while
content areas remain neutral and readable.
