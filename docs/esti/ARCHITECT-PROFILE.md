# ESTI Architect Practice Profile

**Status:** Canonical module registry · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-18

This document maps ESTI requirements to modules. Delivery status and sequence
are authoritative only in [ROADMAP](ROADMAP.md). Long-term scope discipline is in
[STABILITY-CHARTER](STABILITY-CHARTER.md).

## Access Model

- **Internal:** Owner, Partner, Senior, Associate, Viewer. Capabilities refine
  access for administration, finance, HR, reports, and destructive operations.
- **Client portal:** one client record; own projects and explicitly client-visible objects.
- **Consultant portal:** one consultant record; engaged projects and assigned objects.
- **Contractor portal:** invited tenders and awarded projects only (token-scoped bid portal + site coordination).

Portal identities are not internal staff. Every query and mutation must apply
row/object scope in the backend, including REST uploads and downloads.

## Module registry

**Stable (frozen IA)** — extend with additive fields and exports; avoid navigation or workflow reshuffles.

| Product area | Delivered foundation | Expansion (charter-safe only) |
| --- | --- | --- |
| Dashboard | Action Center, KPI boards, intelligence tiles, activity feed | Performance/pagination only — no major relayout |
| Activity Center | alerts, digest, escalations | Same surfaces — no new top-level nav |
| Clients | register, communication log, portal provisioning | Deep links, exports |
| Projects | overview, timeline, CRIF, health, archive, tabs | Additive fields on existing tabs |
| Knowledge Bank | DSR, compliance/RIE, spec catalogue, SteelFlow templates, lessons | New catalogue rows — **not** CAD/BIM vendor libraries (charter-rejected) |
| Compliance | standalone assessment + immutable PDF | Rule versions only |
| Tasks / Work | Kanban, calendar, workload, ASPRF hooks | Cursor pagination, exports |
| Drawings | DXF upload, versions, issue PDF, **Open in ESTICAD**, read-only takeoff list | ESTICAD companion sync — **no browser measure** |
| Documents | register, specs, mood boards, inspections, transmittals, MOM | Revision/approval on existing types |
| Approvals | issue/sign-off log and supersede chain | Portal acknowledgement only |
| Consultants | register, engagements, scoped portal, RFIs | Contextual responses |
| Contractors / tenders | register, tender packages, bids, award, bid portal | Site coordination inbox |
| Site coordination | RFI, submittal, shop drawing, IR, instruction, snag, NCR | Same object model |
| Fees / contracts | proposals, COA scale, contracts | Templates and activity links |
| Accounting | invoices, GST/TDS, filing, reconciliation | Exports and mapping |
| Estimation | DSR, BOQ, takeoff (ESTICAD capture + web read), BBS, PO with spec link | Import/export — **no web visual connector** |
| Search | permission-aware universal search | New entity types quietly |
| AI Studio | Ollama drafts, provenance, `/office/ai-studio` | **No new web draft kinds** — CAD kinds in ESTICAD only (Phase 13D) |
| ESTI agent | Alt+A read-only advisor (live AORMS context) | Prompt/rules only — no execute/upload |
| Administration | users, roles, audit review, release metadata, demo tools | Device admin (Phase 13E) |

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
- `esti_activity`: human-readable timeline event with project/object, visibility,
  summary, and metadata.
- Contextual comments: discussion linked to a supported source object.
- CRIF decisions and drawing revisions: change description, impact, actor,
  acknowledgement requirements, feedback quality, and revision budget signals.

## Behavioral And Studio Intelligence

CRIF-style revision intelligence lives in the project object model: feedback
quality, revision budgets, impact previews, decision states, and approval lag
belong to the work item, not to a separate chat thread.

ASPRF-style studio performance lives in the task/capacity model: reliability,
quality, client impact, collaboration, learning, and wellbeing are used for
coaching, recognition, and workload balancing. Pomodoro and water reminders are
opt-in wellbeing tools in Personal Workspace — not expanded into a wellness product.

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
