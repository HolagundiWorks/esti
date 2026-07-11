---
title: How to use AORMS
slug: how-to-use-aorms
excerpt: End-to-end workflows — enquiry, design, approvals, site, finance, and close-out — with step-by-step instructions for every major module.
order: 2
section: Start here
domain: aorms-studio
updated: 2026-07-09
---

This guide walks through **how an Indian architecture consultancy runs on AORMS** — from the first client enquiry to final billing. All steps happen in the **cloud workspace**; there is no separate desktop product to install.

---

## The four-stage practice workflow

Every commission follows the same spine in AORMS:

| Stage | What happens | Primary modules |
|-------|----------------|-----------------|
| **01 — Enquiry & proposal** | Lead captured, scope defined, COA fee proposal issued | Leads, Office ? Proposals |
| **02 — Design & drawings** | Phases, tasks, drawing register, transmittals | Projects, Tasks, Drawings |
| **03 — Approvals & revisions** | Client decisions, revision intelligence, portal trace | Client portal, Decisions, Critical notes |
| **04 — Bill & close** | GST invoices, reconciliation, filing abstracts | Finance ? Invoices, Filing |

The sections below expand each stage with **click-level instructions**.

---

## Studio Intelligence — your morning surface

**Route:** `/` (home)

Studio Intelligence is the principal's **action-oriented dashboard**, not a decorative KPI wall.

### What you see

- **Overview tab** — merged studio health: leads, projects, fees at risk, team load.
- **Zone tabs** — Lead · Project · Financial · Team · Work · Approval — each with four KPI tiles and a scrolling data table inside the tile.
- **Sidebar** — AI recommendation over the last ten office-log entries.

### Daily routine (5 minutes)

1. Open AORMS and land on **Studio Intelligence**.
2. Scan **Approval** and **Financial** zones for red or yellow states.
3. Open the ranked **Action Centre** items — overdue client approvals, unbilled completed work, blocked tasks.
4. Use **Ask ESTI** (header or AI panel) to explain a specific risk: *"Why is Project X flagged for fee risk?"*

### Tips

- The page **does not scroll** as a whole — each zone's table scrolls inside its tile. Use the rail to jump modules.
- KPI colours map to zone state (healthy, attention, critical) — treat orange as "needs a principal decision today."

---

## Stage 01 — Enquiry and fee proposal

### Capture the lead

1. **Studio Intelligence ? Lead** or **Office ? Leads** — create a new lead with client name, site location, and enquiry source.
2. Link the lead to an existing **Client** (Third Parties) or create the client record first.
3. When qualified, **convert to project** — the project inherits client and brief context.

### Issue a COA fee proposal

1. Go to **Office ? Proposals** (`/office/proposals`).
2. **Create proposal** — choose type (fee proposal / scope agreement as applicable).
3. Enter stage-wise fees on the **COA scale**, SAC code, and payment milestones.
4. Route through internal review if your office uses approval workflows.
5. **Send to client** via the client portal or export PDF for email — the proposal stays on the project record.

### Client approval gate

When the client accepts:

1. Open the proposal and set **client approval** status.
2. The project **fee baseline** is locked for billing — later revisions can carry fee impact separately.

---

## Stage 02 — Design, drawings, and delivery

### Set up the project

1. **Projects** (`/projects`) — open the project.
2. **Phases** — mirror your design stages (Concept, SD, DD, CD, etc.).
3. **Project Info / Brief** — complete the questionnaire sections so the team shares one brief.
4. **Assignments** — attach staff from **Studio ? Team** to the project.

### Tasks and time

1. **Tasks** (`/tasks`) — create tasks per phase with classification (billable / non-billable) and work type (design development, technical production, etc.).
2. Set **estimated hours** and **difficulty** for ASPRF scoring.
3. Staff log **attendance** and attribute time to tasks — workload views show overload before deadlines slip.

### Drawing register

1. In the project, open **Drawings**.
2. Register each sheet: number, title, discipline, revision.
3. Issue **transmittals** — numbered, dated, tied to the project (not a loose email attachment).
4. Upload DXF/PDF as your office policy requires; revisions increment on the same register row.

### Site supervision (consultancy)

For site-led commissions:

1. **Site visits**, **inspections**, **progress reports**, **snags**, and **site instructions** live under the project's site modules.
2. Generate PDF reports from recorded visits — status tracks PENDING ? READY on the worker.

---

## Stage 03 — Approvals, revisions, and client portal

### Client portal

1. Enable portal access for the client contact (Third Parties ? Client ? portal invite).
2. The client sees **only their projects** — drawings for approval, fee status, revision requests.
3. Decisions are **dated and attributed** — not screenshots in WhatsApp.

### Revision intelligence

When the client requests a change:

1. Record a **decision** or **revision request** with category (minor / major / critical) and source (client-driven, internal error, technical query, scope change).
2. Attach **fee and time impact** before work proceeds.
3. **Meeting minutes** can feed revision requests — ESTI can draft formal revision text from MOM for client approval.

### Consultant and contractor portals

- **Consultants** — scoped to their engagement; RFIs and issued drawings only.
- **Contractors** — site instructions and drawings for their package; no office-wide access.

---

## Stage 04 — Finance and close-out

### Invoicing

1. **Finance ? Invoices** — create GST invoice from completed stages or running account.
2. Line items use your firm SAC; CGST/SGST or IGST per place of supply.
3. Link invoice to proposal milestones where applicable.

### Reconciliation and filing

1. **Finance ? Reconcile** — import bank, 26AS, AIS, GSTR files; match entries.
2. **Finance ? Filing** — GST/TDS filing abstracts for the accountant.

### Expenses and payroll

- **Office cash book** and **project expenses** for internal costing.
- **Payroll** (if HR enabled) — payslips tied to attendance.

See **[Finance and billing](finance-and-billing)** for detail.

---

## Library — knowledge your office reuses

**Route:** `/knowledge-bank` and `/libraries/*`

| Library | Purpose |
|---------|---------|
| **Item library** | Materials, labour, items, brands, specifications, recipes |
| **Compliance** | NBC, FAR, setbacks, fire, regulations |
| **Master plans** | PDF/DWG reference uploads |
| **Standards** | Discipline standards with attached files |

Use the library when writing specs, estimates, and compliance checks — one catalogue for the whole firm.

---

## AI Studio and Ask ESTI

### Ask ESTI

- Available from the header AI entry — asks over **your project and office record**.
- Explains risk across fees, revisions, and site progress.
- Configure **BYO API key** in Company ? AI for your own OpenAI-compatible endpoint.

### AI Studio

- Plan-gated module for heavier AI workflows (rank and firm settings apply).
- Uses the same BYO-or-hosted model policy.

**Metering:** Hosted AI is billed per usage. With a valid BYO key, hosted inference is not metered for that firm.

---

## Project measurement (roadmap)

The in-browser **Estimation OS** (BOQ, rate books, parametric takeoff) was retired in 2026-06 and is being rebuilt. Today, open a project and use the **Measurement** tab for quantity records tied to the project file. Watch the wiki and release notes for the next cost-management wave.

---

## Office administration

| Task | Where |
|------|--------|
| Firm profile, logo, GST | **Company** (`/company`) |
| Users and roles | **Admin ? Users** (firm admin) |
| Storage usage | **Company ? settings** |
| Audit trail | **Admin ? Audit log** |
| Preferences, password | **Profile ? Settings** |

Account-level licence and members: **[Company account](/company-account)** portal.

---

## Role-based access (summary)

| Role | Typical access |
|------|----------------|
| **Owner / Principal** | Full studio, financials, approvals |
| **Project architect** | Assigned projects, tasks, drawings |
| **Finance** | Invoices, reconcile, filing — not HR unless granted |
| **HR** | Team, payroll, attendance — when `hrEnabled` |
| **Client** | Portal only — their projects |
| **Consultant / Contractor** | Scoped portal |

Capabilities are enforced server-side via `can(role, capability)` — the UI hides what the role cannot do.

---

## Keyboard and productivity

- **Global search** — header search across projects, clients, documents.
- **Calculator** — footer left; persists as a float.
- **Pomodoro** — footer tray for focus sessions.
- **ActionDock** — centre bottom; primary save/create for the active screen.

---

## Getting help

- **Email:** [hi@aorms.in](mailto:hi@aorms.in)
- **Wiki:** [aorms.in/wiki](https://aorms.in/wiki)
- **Blog:** [aorms.in/blog](https://aorms.in/blog) — practice notes and release context

---

## Frequently asked questions

### Can we run AORMS on our own server?

AORMS is offered as **cloud SaaS** at aorms.in. Contact Human Centric Works for dedicated deployment discussions.

### Are there different product editions?

No. **One standard AORMS licence** includes the full feature set. You pay for extra storage and hosted AI, or bring your own AI API key.

### Where did the desktop estimator go?

Estimation is **in the browser workspace** on each project. There is no separate AORMS Estimate download.

### How do I delete a workspace?

Company owners manage their organisation in the **account portal**. Platform operators use the licensing console. For account closure, email [hi@aorms.in](mailto:hi@aorms.in).
