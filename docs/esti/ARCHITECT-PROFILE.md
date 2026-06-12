# ESTI Architect Practice Profile

**Status:** Canonical module registry · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

This document maps ESTI requirements to modules. Delivery status and sequence
are authoritative only in [ROADMAP](ROADMAP.md).

## Access Model

- **Internal:** Owner, Partner, Senior, Associate, Viewer. Capabilities refine
  access for administration, finance, HR, reports, and destructive operations.
- **Client portal:** one client record; own projects and explicitly client-visible objects.
- **Consultant portal:** one consultant record; engaged projects and assigned objects.
- **Contractor portal (planned):** invited tenders and awarded projects only.

Portal identities are not internal staff. Every query and mutation must apply
row/object scope in the backend, including REST uploads and downloads.

## Module Registry

| Product area | Current foundation | Planned expansion |
| --- | --- | --- |
| Dashboard | office/project/finance/workload boards | risks, revisions, tenders, health, digest, recognition |
| Activity Center | alerts aggregation | immutable activity feed, escalations, announcements, wellbeing cues |
| Clients | register, communication log, portal provisioning | requests, feedback, satisfaction, writable approvals |
| Projects | project record, general delivery stages, settings, internal notes | overview, timeline, critical notes, decisions, health, revision intelligence, archive |
| Knowledge Bank | Master DSR and versioned compliance rules | specification/procurement standards, structural element and reinforcement templates, CAD/BIM/vendor libraries |
| Compliance | standalone assessment linked to project overview | verified calculations and immutable PDF reports from published Knowledge Bank rules |
| Tasks | project tasks, status, priority, workload | IDs, review, dependencies, daily updates, timesheets, calendar, performance and rewards |
| Drawings | DXF upload, versions, viewer, takeoff, issue PDF | workflow statuses, impact, acknowledgements, zoom/pan/snapping |
| Documents | specs, mood boards, inspections, transmittals | unified register, photos/actions, revision/approval for all types |
| Approvals | issue/sign-off log and supersede chain | portal writes, internal/contractor approvals, acknowledgement |
| Consultants | register, engagements, scoped portal | deliverables, assigned tasks, contextual responses and RFIs |
| Contractors/tenders | none | register, tender, bids, evaluation, award, isolated portal |
| Site coordination | inspection reports | RFI, submittal, shop drawing, IR, instruction, snag, NCR |
| Fees/contracts | proposals, COA fee proposals, contracts | richer versions/templates and connected activity |
| Accounting | invoices, GST/TDS, filing, reconciliation | enhanced exports, mapping, retention, accountant workflow |
| Estimation | DSR, estimate/BOQ, takeoff, BBS, simple PO | import/export, versioning, inline entry, visual connector |
| Office/knowledge | letters, firm profile, Knowledge Bank shell | MOM, templates, CAD/BIM/vendor libraries, lessons |
| Search | module-local search | permission-aware universal search |
| AI Studio | none | editable, source-linked drafting and summarization |
| Administration | users, roles, settings, demo/purge tools | audit review, release metadata, retention, backup status, rewards governance |

## Project Object Model

A project is the primary context. Tasks, activity, comments, drawings,
documents, approvals, decisions, risks, consultants, contractors, tenders,
commercial records, and site coordination reference a project and, where
applicable, another source object.

Default project stages are Initiation & Brief, Concept Design, Design
Development, Statutory Coordination, Construction Documentation, Tender &
Appointment, Construction Administration, and Handover & Closeout. Project
lifecycle status and stage status are separate. Compliance
results are linked project documents; compliance itself is not a project tab.

## Compliance Boundary

The Knowledge Bank owns governed jurisdiction rule versions. The Compliance
module selects published rules by state, district, authority, building use, and
effective date, then runs deterministic development-control calculations.
Required outputs are ground coverage, FAR area, setbacks, and restricted
building lines, followed by an immutable PDF snapshot linked to the project.
ESTI does not claim live statutory compliance tracking and does not poll
approval portals without a supported authority API.

## Traceability Model

- `esti_audit`: append-only compliance record with actor and before/after data.
- `esti_activity` (planned): human-readable timeline event with project/object,
  visibility, summary, and metadata.
- Contextual comments: discussion linked to a supported source object.
- Revision records (planned beyond drawings): change description, impact,
  actor, affected objects, acknowledgement requirements, feedback quality, and
  revision budget signals.

## Behavioral And Studio Intelligence

CRIF-style revision intelligence lives in the project object model: feedback
quality, revision budgets, impact previews, decision states, and approval lag
belong to the work item, not to a separate chat thread.

ASPRF-style studio performance lives in the task/capacity model: reliability,
quality, client impact, collaboration, learning, and wellbeing are used for
coaching, recognition, and workload balancing. Pomodoro and water reminders are
treated as required wellbeing tools, not optional trivia.

Audit, activity, comments, and notifications are related but not interchangeable.

## Contractor Boundary

Contractor capabilities exist to support the architect's professional role:
tender administration, design/technical clarification, document issue,
inspection, quality observations, and recommendation. ESTI does not become the
contractor's inventory, labour, subcontractor, or accounting system.

## India And Money

The fixed India profile is defined only in [INDIA-PROFILE](INDIA-PROFILE.md).
All money uses integer paise. Firm GST selection is configurable among the
supported systems; rates and calculation rules remain centralized and fixed.

## Completion Rule

A module is delivered only when its contracts/schema, authorization, backend,
Pure Carbon UI, activity/audit behaviour, migration, tests, and documentation
pass the gate in [ROADMAP](ROADMAP.md).
