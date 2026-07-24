# AORMS consulting frameworks & product philosophy

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-12

This document defines **why AORMS exists**, the **platform philosophy** inferred from how the
product is built, and **two discipline-specific operational frameworks** — one for
**architecture consultancies** (**AORMS-Studio**) and one for **engineering consultancies**
(**AORMS-Consultancy**).

Naming: [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md). Executable
constants: `frontend/src/lib/product-nomenclature.ts`.

---

## 1. Product philosophy — derived from how AORMS is built

AORMS is not “another PM tool with AEC skin.” The codebase, IA, and teardown history encode a
consistent philosophy. These are the principles the software already enforces or is moving toward.

### 1.1 Advise; do not deliver

AORMS serves **consulting firms that advise clients** — architecture and engineering practices —
not contractors running builds, not PMC portfolios, not construction programme management.

Evidence in the product:

- Consultancy-only scope (2026-06): removed PMC, construction Gantt, tenders, mood boards,
  contractor execution accounting.
- Marketing and PRD boundary: site supervision and architect-side coordination **yes**;
  warehouses, labour gangs, subcontractor ledgers **no**.
- Two apps on one **advisory spine**, not one app pretending every AEC firm does the same work.

**Philosophy:** The operating system models **professional judgement and traceable advice**, not
site logistics or client construction PM.

### 1.2 One living record — context before conversation

Important work must stay attached to the object that created it: a revision on a drawing, a
decision on a project, a fee event on a proposal, an approval on a transmittal.

Evidence:

- Project-centric modules (phases, decisions, drawings, transmittals, critical notes).
- Revision intelligence (category, source, budget) on decisions — not a detached comment wall.
- Activity and audit trails on mutations.
- Portals scoped to **project objects**, not a firm-wide social feed.

**Philosophy:** **Memory is structural**, not archival. If it mattered, it has a parent record,
actor, and timeline.

### 1.3 Two frameworks on one spine

Every AORMS consulting office runs two layers (see `PLATFORM_FRAMEWORKS` in code):

| Framework | Question it answers | Encoded as |
| --- | --- | --- |
| **Operational** | How does the **office** run? | Intake, standards, review chains, audit, HR rhythm, billing cadence, adoption |
| **Design** | How is each **engagement** structured? | Methodologies, deliverable models, templates, staged advisory patterns |

The **platform** owns the spine (tenant, permissions, collaboration, EOMS gate, analytics).
Each **app** owns discipline-specific design frameworks and workspace modules.

**Philosophy:** **Operations** and **engagement design** are separate problems. Conflating them
is why generic tools fail consultancies.

### 1.4 Deterministic truth; intelligence explains

Office health, priorities, ASPRF scores, and revision signals come from **auditable rules** and
recorded events. LLMs (**ESTI** in Studio, **EOMS** platform-wide) **explain and draft** —
they do not invent operational fact.

Evidence:

- Cognition engine + `dashboard.home` reasoning frame (evidence-backed).
- ASPRF weights (reliability, quality, client impact, collaboration, learning, wellbeing).
- AI settings and Ask ESTI bounded to validated repositories.

**Philosophy:** **The system calculates; the human decides.** AI is a translator and assistant,
not an oracle.

### 1.5 Dual-tier intelligence firewall

| Agent | Tier | Role |
| --- | --- | --- |
| **EOMS** | External | Validates content **entering** the firm from outside (codes, uploads, client packs) |
| **ESTI** | Internal | Answers only from **validated** firm repositories (Studio today) |

Data path: `External → EOMS (validate) → Repository → Internal agent (RAG) → Output`

**Philosophy:** **Trust is engineered.** Nothing raw from the internet becomes “firm truth”
without passing the external gate.

### 1.6 Depth encodes importance (HCW)

The UI thesis — flat information at rest, glass for action, soft for objects you work inside —
mirrors the operational thesis:

- **Flat (Layer 1):** registers, tables, text — the record at rest.
- **Soft (Layer 2):** panels, dialogs, forms — the object you handle.
- **Glass (Layer 3):** dock, alerts, CTAs — what wants attention **now**.

Spatial model: **Rail** = instruments (health, telemetry, section tabs) · **Stage** = work ·
**Dock** = commit/create/destroy.

**Philosophy:** **Attention is scarce.** Chrome lifts only what requires action; calm is the
default for professional reading and review.

### 1.7 India-first studio correctness (architecture app)

**AORMS-Studio** encodes Indian practice reality: integer **paise**, **GST/TDS**, COA fee
proposals, FY April–March, statutory filing abstracts — not bolted-on locale flags.

**Philosophy:** For the shipped architecture vertical, **correctness is local**. The framework
assumes Indian consultancy law and habit, not a US-generic template.

### 1.8 Transparency without surveillance

Performance (ASPRF), revision patterns, and office health are framed as **coaching signals**
attached to work — optional wellbeing, anti-gaming weights, owner-visible audit — not
surveillance theatre.

**Philosophy:** **Measure to improve practice**, not to punish presence.

### 1.9 Progressive formalization

Frameworks deploy in **days** (process standards, templates, review chains), then adoption and
cycle time are tracked. The product does not require a Big Bang ERP cutover.

**Philosophy:** **Standardize what repeats; leave judgment where it belongs.**

---

## 2. Shared platform operational spine

Both consultancies inherit this spine from **AORMS** (platform). Discipline apps specialize
the **design framework** and module emphasis.

```text
┌─────────────────────────────────────────────────────────────────┐
│  INTAKE → QUALIFY → ENGAGE → PRODUCE → REVIEW → ISSUE → CLOSE   │
│       ↑                    ↑         ↑                          │
│   Operational          Design      EOMS gate                    │
│   standards            framework   (external in)                │
│       ↓                    ↓         ↓                          │
│   OFFICE RHYTHM · AUDIT · KNOWLEDGE · ANALYTICS · ESTI/EOMS     │
└─────────────────────────────────────────────────────────────────┘
```

| Spine stage | Operational meaning | Platform primitives |
| --- | --- | --- |
| **Intake** | Enquiry captured with source, scope hint, conflict check | CRM, proposals pipeline |
| **Qualify** | Go/no-go against capacity, risk, commercial fit | Dashboard signals, workload |
| **Engage** | Signed scope, fee model, team roster, portals opened | Proposals, contracts, assignments |
| **Produce** | Deliverables versioned against engagement model | Tasks, drawings/docs, specifications |
| **Review** | Serial or parallel sign-off before issue | Approvals, transmittals |
| **Issue** | Controlled release to client / co-consultant / authority | Transmittals, portals, PDFs |
| **Close** | Archive, lessons, financial reconciliation | Archive, knowledge bank, reconcile |

---

## 3. Architecture consultancy operational framework

**App:** **AORMS-Studio** · **Audience:** Indian architecture, interior, and landscape
consultancies · **Status:** Shipping (this repo)

### 3.1 North star

> **From chaos to clarity — one living record for the practice.**

The architecture firm sells **design judgement, coordinated documents, and site advisory** over
a long engagement. Money, revisions, drawings, and statutory work must not live in separate
silos.

### 3.2 Design framework (engagement shape)

How an architecture engagement is **structured** — the “design” layer for architects:

| Element | Definition | Studio modules |
| --- | --- | --- |
| **Engagement types** | Full architectural service, interior-only, site supervision add-on | Project brief, phases |
| **Stage model** | Concept → schematic → tender → construction issue → handover (practice-defined) | Phases, tasks |
| **Deliverable register** | Drawings, specs, reports, models — each with issue purpose | Drawings, spec library |
| **Revision contract** | MoM-led changes; MINOR / MAJOR / CRITICAL + source taxonomy | Decisions, revision intelligence |
| **Approval gates** | Client sign-off, internal partner review before issue | Approvals, proposals gate |
| **Portal contract** | What client sees vs consultant vs contractor | Client / consultant / contractor portals |

### 3.3 Operational framework (office rhythm)

How the **architecture office runs** day to day:

#### Phase A — Practice intake & commercial

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| A1 Enquiry log | Capture lead, site, client type, fee sensitivity | Clients, leads |
| A2 Proposal | COA-aligned fee proposal or scope letter | Unified proposals |
| A3 Contract & GST | Commercial terms, SAC, invoice rhythm | Contracts, invoices |
| A4 Project birth | Phase plan, team, portal policy | Project office, assignments |

**Operational rule:** No production work without a **scoped proposal or contract** on the record.

#### Phase B — Project memory & coordination

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| B1 Single project thread | Phases, tasks, decisions in one place | Projects, tasks, Work hub |
| B2 MoM → revision | Client meeting drives categorized revision | Decisions + revision fields |
| B3 Critical notes | Partner-visible risk without email chains | Critical notes |
| B4 Third parties | Consultants and contractors on project scope | Consultants, contractors, engagements |

**Operational rule:** **MoM is not a PDF in email** — it links to decisions and revision budget.

#### Phase C — Document production & issue

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| C1 Drawing register | Sheet issue, revision, transmittal | Drawings, transmittals |
| C2 Specifications | Office material catalogue linked to project spec | Knowledge bank, spec catalogue |
| C3 Internal review | Partner review before client issue | Approvals |
| C4 Controlled issue | Transmittal with recipient acknowledgement | Transmittals, portals |

**Operational rule:** **Issue is an event**, not a file drop in WhatsApp.

#### Phase D — Statutory & money

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| D1 Fee recovery | Bill against stage / percentage / time model | Invoices, proposals |
| D2 GST compliance | SAC, rates, filing abstracts | Invoices, filing reports |
| D3 Reconciliation | Bank / 26AS / GSTR alignment | Reconcile |
| D4 Office cash | Petty cash and project expenses | Accounts, expenses |

**Operational rule:** **Money follows scope** — invoice lines trace to proposal stages.

#### Phase E — Site advisory (architect as supervisor)

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| E1 Site visits & inspections | Record findings, photos, PDF | Inspections, site visits |
| E2 Snags & instructions | Architect instruction, not contractor PM | Snags, site instructions |
| E3 Progress narrative | Client-visible progress reports | Progress reports |

**Operational rule:** Architect **supervises and certifies**; does not run contractor programmes.

#### Phase F — Studio intelligence & people

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| F1 Workload & leave | Capacity before promise dates | Workload, leaves, attendance |
| F2 ASPRF | Delivery predictability without gaming | Performance, team scores |
| F3 ESTI | Ask from validated office corpus | Ask ESTI, Studio Intelligence |
| F4 Lessons | Post-project capture to library | LXOS / knowledge (evolving) |

**Operational rule:** **Health in the rail, work in the stage** — principals see office state
before opening a project.

### 3.4 Architecture consultancy philosophy (one line)

**Clarity is a commercial asset:** fee recovery, revision discipline, and issued documents are
the same system — because Indian practices lose money when those drift apart.

---

## 4. Engineering consultancy operational framework

**App:** **AORMS-Consultancy** · **Audience:** Structural, MEP, civil, and multidisciplinary
engineering consultancies · **Status:** Code-complete; live (shares platform spine)

> **Deep dive:** the **grounded, sourced case study** of how engineering consultancies
> operate (org hierarchy, sign-off chain, workflow, billing, risk — with citations) is in
> [`AORMS-CONSULTANCY-SOP-CASE-STUDY.md`](AORMS-CONSULTANCY-SOP-CASE-STUDY.md); the
> **system-architecture draft** that maps it onto the `esti` codebase is in
> [`AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md`](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md).
> This section is the framework-level summary those documents expand.

### 4.1 North star

> **One spine for engineering consultancies that advise on built-environment projects.**

The engineering firm sells **calculation-backed advice, peer-reviewed deliverables, and
governed technical judgement** — often nested under an architect or developer, rarely as
prime contractor.

### 4.2 Design framework (engagement shape)

How an engineering engagement is **structured** — the “design” layer for engineers:

| Element | Definition | Consultancy modules (target) |
| --- | --- | --- |
| **Engagement models** | Design assist, peer review, full design, site support | Engagement frameworks |
| **Deliverable packages** | Calc set, report, sketch, model extract — not generic tasks | Deliverable register |
| **Dependency map** | Inputs from architect / other disciplines; hold points | Engagement dependencies |
| **Review ladder** | Peer → checker → principal → issue | Serial review chains |
| **Technical query register** | TQ/RFI with closure evidence | Variations / TQ module |
| **Issue classes** | For information / for approval / for construction | Transmittal types |

### 4.3 Operational framework (office rhythm)

#### Phase A — Engagement intake

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| A1 Scope boundary | What is in/out; reliance on architect pack | Engagement record |
| A2 Input validation | External codes, briefs via **EOMS** gate | EOMS-validated intake |
| A3 Commercial | Fee basis (lump, %, hours cap) | Proposals (shared spine) |
| A4 Team & discipline | Lead discipline, checker assignment | Assignments |

**Operational rule:** **No calculation without validated inputs** — external packs pass EOMS
before they become working assumptions.

#### Phase B — Deliverable production

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| B1 Work breakdown | Deliverable IDs tied to engagement model | Deliverable register |
| B2 Version discipline | Rev A/B/C with change log | Document versions |
| B3 Parametric / calc trail | Reproducible calculation lineage (where applicable) | Calculation packages |
| B4 Cross-discipline coordination | MEP ↔ structural hold points | Engagement coordination |

**Operational rule:** A deliverable is **issued as a package**, not a folder of files.

#### Phase C — Serial technical review

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| C1 Peer review | Same-grade technical check | Review chain step 1 |
| C2 Checker review | Independent checker sign-off | Review chain step 2 |
| C3 Principal issue | Professional responsibility on record | Principal approval |
| C4 SLA & escalation | Overdue review visible in action center | Dashboard / alerts |

**Operational rule:** **Review is serial and named** — informal WhatsApp approval is not issue.

#### Phase D — Issue & dependency management

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| D1 Transmittal to architect/client | Purpose of issue stated | Transmittals |
| D2 TQ / variation log | Scope creep captured as technical queries | TQ register |
| D3 Portal visibility | Client sees issued packs only | Client portal (scoped) |

**Operational rule:** **Downstream reliance is explicit** — issue purpose on every transmittal.

#### Phase E — Governance & knowledge

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| E1 Office standards | NBC, IS codes, office detail library | Standards library |
| E2 EOMS external corpus | Validated code snippets enter repo | EOMS + knowledge bank |
| E3 Precedent search | Past projects as governed patterns | Semantic search (internal agent) |
| E4 Audit export | Review chain + issue log for QA | Compliance reporting |

**Operational rule:** **Codes enter once, validated** — not copied from random PDFs per project.

#### Phase F — Capacity & analytics

| Step | Intent | Outcome in AORMS |
| --- | --- | --- |
| F1 Discipline workload | Structural vs MEP capacity | Workload by discipline |
| F2 Review cycle time | Bottleneck in checker queue | Operational dashboards |
| F3 Engagement margin | Hours vs fee stage (advisory) | Analytics (non-ERP) |

**Operational rule:** **Capacity is a professional duty** — overload shows before quality fails.

### 4.4 Engineering consultancy philosophy (one line)

**Reliance is engineered:** peer review, validated inputs, and named issue are how engineering
consultancies defend professional duty — not slide decks and email threads.

---

## 5. Side-by-side — architecture vs engineering

| Dimension | Architecture (**AORMS-Studio**) | Engineering (**AORMS-Consultancy**) |
| --- | --- | --- |
| **Primary artifact** | Drawings & spatial coordination | Calculations & technical reports |
| **Revision driver** | Client MoM, design iteration | Input change, code update, TQ |
| **Review idiom** | Partner / client approval | Peer → checker → principal ladder |
| **Commercial spine** | COA stages, GST invoices (India) | Lump / % / capped hours on engagement |
| **External gate** | Client briefs, consultant packs | Codes, standards, third-party models |
| **Internal agent** | **ESTI** (live) | Consultancy Ask / EOMS review / precedent (code-complete; distinct brand profile at launch) |
| **Site role** | Architect supervision | Technical site support (scoped) |
| **Out of scope** | Construction PM, tendering | Contractor execution, fabrication PM |

Both share: **proposals, projects, tasks, transmittals, approvals, portals, EOMS, audit,
knowledge library, rail · stage · dock UX**.

---

## 6. How to use this document

| Audience | Use |
| --- | --- |
| **Product / HCW** | PRD and roadmap alignment — new modules must map to a framework phase |
| **Marketing** | Unified landing `/#studio` and `/#consultancy` copy — one philosophy, two frameworks |
| **Implementation** | Navigation and `useScreenActions` — CTAs match framework commit points |
| **Wiki** | Summarize per app hub; link here as canonical framework reference |

**Related docs:**

- [PRODUCT-VISION.md](PRODUCT-VISION.md) — Studio product boundary (implementation detail)
- [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) — platform north-star
- [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) — philosophy expressed in interface law
- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) — naming

---

*Human Centric Works · AORMS — Accelerated Operational Resources Management System*
