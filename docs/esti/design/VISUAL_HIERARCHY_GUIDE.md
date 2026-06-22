# VISUAL HIERARCHY GUIDE — Per-Route Assessment

This guide documents the visual hierarchy verdict for each route in the ESTI frontend.

Verdicts: GOOD = hierarchy is clear and Carbon-compliant | NEEDS WORK = hierarchy exists but has drift | BROKEN = no clear hierarchy or major violations

---

## Route Hierarchy Table

| Route | Primary Element | Secondary Information | Verdict | Recommendation |
|---|---|---|---|---|
| Dashboard | Telemetry strip (4 health tiles) + Tabs (OVERVIEW default) | Alert strip, macro zone grid, detail rows | GOOD | 80% width centred layout is intentional. Telemetry persists across tabs correctly. |
| Projects | PageHeader (h1) + DataTable with search | Status filter, pagination | GOOD | Standard list pattern correctly implemented. |
| ProjectDetail | Sticky project header (ref + title + status tag) + Tabs | Tab content panels | NEEDS WORK | Sticky header uses inline styles — extract to CSS class. |
| Clients | PageHeader + DataTable | Search toolbar, portal login action | GOOD | Mirrors Projects pattern cleanly. |
| Work | PageHeader + URL-synced Tabs | Tab content panels (Tasks/Board/Calendar etc.) | GOOD | Contained tab variant correctly used. |
| Team | PageHeader + portrait tile grid (Grid narrow, Column lg=3) | Staff photo, name, role, status tag | GOOD | Custom staff tile CSS is structural only — documented convention. |
| FeeProposals | PageHeader + Table | COA warning, modal create | NEEDS WORK | Modal form uses raw flex div for 3-input row — replace with Stack. |
| Invoices | PageHeader + PeriodFilter + Table | Status select per row, PDF cell | NEEDS WORK | Status column has redundant Select AND Tag side-by-side. |
| Proposals | PageHeader + Table | Scope textarea in modal, template selector | GOOD | Clean document list pattern. |
| KnowledgeBank | PageHeader + Search Tile + Tabs (7 panels) | Embedded sub-modules per tab | NEEDS WORK | Inline height on ParametricCanvas tab; search uses raw flex div. |
| Performance | PageHeader + KPI summary Grid + Tabs (Scores/Recognition) | MeterChart KPI meters, reward grant modal | GOOD | MeterChart from @carbon/charts-react is correct. maxWidth on wellbeing Tile should use Column. |
| Settings | PageHeader + stacked Tiles | Photo upload, display name, password change | NEEDS WORK | All four Tiles use inline maxWidth — should be Column lg=8 wrappers. |
| Company | PageHeader + firm form Tile + module toggles | Partners panel, archive history | NEEDS WORK | StructuredList P0 violation. Multiple maxWidth inline styles on Tiles. |
| Users | PageHeader + Table | Role select per row, status tag, password reset modal | GOOD | Inline Select for role change is appropriate in table cell. |
| Alerts | PageHeader + AlertTable (immediate) + Tile (digest) | Severity tags, project links | GOOD | Two-level alert structure well-organised. |
| AuditLog | PageHeader + Grid filter row + Table + Modal (detail) | Filter selects, pagination, JSON diff CodeSnippet | GOOD | CodeSnippet for JSON diff is correct Carbon usage. |
| Filing | PageHeader + PeriodFilter + export Tile + Tabs (GST/TDS) | Monthly period tables | GOOD | Two tabs mapping to two report types is clean. |
| Reconcile | PageHeader + upload controls + batch Table | Column mapping fields, statement lines table | NEEDS WORK | Inline maxWidth on TextInput fields; flex divs should be Stack. |
| Consultants | PageHeader + DataTable with search | Create login modal | GOOD | Mirrors Projects/Clients list pattern. |
| Letters | PageHeader + Table | Template selector in modal, PDF generation cell | GOOD | Consistent with Proposals. |
| Contracts | PageHeader + Table | Status select per row, delete action | NEEDS WORK | Redundant Select + Tag in status cell. |
| Portal (Client) | PortalHeader + project list/detail | Branding, approvals, invoices, submissions | GOOD | White theme for external users is documented and intentional. |
| CollaboratorPortal | PortalHeader + project list/detail | Engagement scope, drawings | GOOD | Same pattern as Portal — white theme intentional. |
| Hr | PageHeader + Tabs (Payroll/Leaves/Attendance/Profiles/Applications) | Leave approve/reject, payslip PDF | GOOD | URL-sync tabs correctly implemented. |
| ArchivedProjects | PageHeader + Table | Restore and purge actions, export JSON | GOOD | Destructive purge correctly uses password confirmation. |

---

## Hierarchy Verdict Summary

| Verdict | Count | Routes |
|---|---|---|
| GOOD | 17 | Dashboard, Projects, Clients, Work, Team, Proposals, Performance, Users, Alerts, AuditLog, Filing, Consultants, Letters, Portal, CollaboratorPortal, Hr, ArchivedProjects |
| NEEDS WORK | 8 | ProjectDetail, FeeProposals, Invoices, KnowledgeBank, Settings, Company, Reconcile, Contracts |
| BROKEN | 0 | None |

---

## Common Hierarchy Failures

**1. Inline maxWidth on Tiles instead of Column wrappers**
Settings.tsx, Performance.tsx, Company.tsx constrain Tile width with inline style maxWidth. Fix: wrap Tile in Column lg=8 or Column lg=6.

**2. Redundant Select plus Tag in table status cell**
Invoices.tsx and Contracts.tsx render both a Select (for status change) and a Tag (showing status) in the same cell. The Tag is redundant. Remove the Tag.

**3. Raw flex div replacing Stack**
FeeProposals.tsx, Letters.tsx, KnowledgeBank.tsx use inline flex style with gap 12 instead of Stack orientation=horizontal gap=4. Mechanical fix.

**4. Missing Breadcrumb**
ProjectDetail.tsx uses a plain Link with arrow text for back-navigation. Should be a Carbon Breadcrumb component for keyboard navigation and screen-reader labelling.