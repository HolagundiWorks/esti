---
title: How to use AORMS
slug: how-to-use-aorms
excerpt: End-to-end workflows — enquiry, design, approvals, site, finance, and close-out — with step-by-step instructions for every module actually shipping today.
order: 2
section: Start here
updated: 2026-07-09
---

This guide walks through **how an Indian architecture consultancy runs on AORMS** — from the first client enquiry to final billing. All steps happen in the **cloud workspace**; there is no separate desktop product to install.

> AORMS is **consultancy-only**: it runs first-conversation-to-final-account design practice work (leads, proposals, drawings, site supervision, GST invoicing). Construction-delivery modules (contractor bidding, work packages, running bills, tenders) and the old in-browser Estimation/BOQ/Knowledge-Bank stack were retired and are being rebuilt from the ground up — they are **not** available today. This page only documents what you can actually click through right now.

---

## The practice workflow

Every commission follows the same spine in AORMS:

| Stage | What happens | Primary modules |
|-------|----------------|-----------------|
| **01 — Enquiry & fee proposal** | Lead captured, pre-project pipeline worked, fee proposal issued and approved, project activated | Leads, Project → Pipeline, Office → Proposals |
| **02 — Design & delivery** | Phases, project brief, tasks, drawing register, site supervision | Projects, Tasks, project Drawings & approvals |
| **03 — Approvals, revisions & portals** | Client/consultant decisions, revision tracking, portal collaboration | Client portal, Consultant portal, project Overview (CRIF) |
| **04 — Bill & close** | GST invoices, bank reconciliation, GST/TDS filing abstracts, expenses/payroll | Invoices, Reconcile, Filing, Cashbook, Payroll |

The sections below expand each stage with click-level instructions.

---

## Studio Intelligence — your morning surface

**Route:** `/` (home)

Studio Intelligence is the office's action-oriented dashboard. The left **rail** shows a greeting, a one-line "what needs attention" sentence, today's Tasks/Meetings/Visits counts, an office-health glyph, and upcoming statutory due dates (TDS 7th, GSTR-1 11th, GSTR-3B 20th). The **stage** holds five tabs:

| Tab | What's on it |
|---|---|
| **ESTI** | Zone-health strip, a Finance or Office snapshot (4 KPI tiles), the ranked **ESTI priorities** worklist (with a "Refresh rankings" button), office action items, and top risk projects/clients |
| **Projects** | Project health table — only projects currently flagged yellow/red, with phase, signal summary (late/stale/unbilled counts), and progress |
| **Work** | Work queue and pending approvals, ranked by confidence and wait time |
| **Team** *(only if HR is enabled)* | Team capacity table — open/late task counts and load per member |
| **Zonal compliance** | The setback/FAR permissible-development calculator |

**Alert glyphs** are shape-coded, not just colour-coded: **●** circle = stable, **▲** triangle = watch/friction, **■** square = critical. Colour is a secondary cue.

The page does not scroll as a whole — each tile's table scrolls inside itself.

---

## Stage 01 — Enquiry and fee proposal

### Capture and qualify the lead

1. Open **Leads** (top ribbon → Third Parties menu, or `/leads`) → **New lead** — enter enquirer name, phone, email, lead source, project type, site location, city, and notes → **Capture lead**.
2. Move the lead through its status as you work it, using the inline status dropdown on the lead row: **New → Contacted → Assessment started → Awaiting review → Qualified** (or mark it **Dropped**/**Lost** if it doesn't proceed).
3. When ready, use the row menu's **Convert** action → "Convert lead to draft project" — set a project title, project type, discipline/work type, and either pick an existing client or **"— Create new client from lead —"** → **Create draft project**. This creates the project in **Enquiry** status and marks the lead Qualified.

### Work the pre-project pipeline

Open the new project → **Pipeline** tab. Work through the accordion top to bottom:

1. **Project DNA** — capture the pre-sales questionnaire (budget mode, Vastu requirement, design language, decision makers, timeline criticality, material expectations, revision tolerance) → **Save DNA**. This produces a risk score badge for the project.
2. **Feasibility — assessment & report** — enter site length/width or a manual area, FAR factor, four setbacks, ground coverage %, super-built-up factor, and construction rate ₹/sqm → **Compute assessment**. The computed permissible FAR area, buildable area, floors, and estimated project cost appear in a table. Optionally **Generate feasibility PDF**.
3. **Negotiation** — log each round of fee/scope negotiation (fee change, discount %, scope/timeline changes, architect and client response, outcome) via **Add negotiation round**; a conversion probability is recalculated automatically.
4. **Client onboarding** — capture billing address, GSTIN, PAN, communication preference, authorised representative, and upload the signed agreement and ID proof → **Save details**, then **Mark onboarding complete**.
5. **Activation** — a checklist shows exactly what's still needed: project in Proposal stage, DNA captured, assessment recorded, fee proposal approved by the client, onboarding complete, advance payment received. The **Activate project** button only enables once every check passes.

### Issue the fee proposal

1. Go to **Office → Proposals** (`/office/proposals`) → **New proposal**.
2. Optionally start from a template, pick the **Project**, **Work category (COA)** and **Work type**, and a **Fee basis**: COA scale (% of cost of works), Per sq.m of built-up area, or Lumpsum. Enter the cost of works and the corresponding rate/area or lump-sum fee, plus Doc & comm %.
3. The dialog live-computes the COA minimum fee; if your quote is below it, you must fill an **Override reason** before you can save. Add Scope and Notes as needed → **Create**.
4. Generate the client-facing **PDF** from the proposal row (also shareable via WhatsApp).

### Client approval gate

Back on the project's **Pipeline → Activation** section, each proposal has a **client approval** dropdown: **Pending / Approved / Rejected / On hold**.

- **Approved** stamps the approval date and satisfies the activation gate.
- **Rejected** automatically cancels the project and, if it came from a lead, marks that lead **Lost** — this closes the sales funnel rather than leaving a dangling record.

Once every Activation check is green, hit **Activate project** — status flips to **Active** and a kick-off meeting task is created automatically.

---

## Stage 02 — Design and delivery

### Set up the project

Inside **Project → Setup**: **Overview** (summary, AI draft panel, revision ledger), **Pipeline** (above), **Program** (phases/schedule), **Project Info** (brief questionnaire), **CPI** (residential projects only), **Permits**, and **Settings** (project team and consultants, rank Senior+ to edit).

### Tasks and time

1. Open **Tasks** (`/tasks`). The Tasks tab lists work with filters for category (All / Execution / Drawings / Documentation / Billing / Approvals / Revisions), Open only / My tasks, status and priority, plus a **Standup** button for a per-project stand-up view.
2. **New task** — Title, Project, Assignee/Reviewer (when HR is enabled — otherwise tasks auto-assign to the principal), Priority, **Classification** (Billable / Non-billable / Training / Collaboration / Personal), **Work type** (Design Communication / Design Development / Technical Production / Construction Support — the ASPRF category), Due date, **Difficulty** (1–5) and **Estimated hours** → **Create**.
3. Change status inline (To do / In progress / Blocked / Done) from the task row. Other tabs: **Board** (kanban), **Calendar**, **Activity**, **Client requests** and **Consultant requests** (Associate+), and — when HR is enabled and you hold `hr:manage` — **Workload** and **Attendance**.

### Drawings, transmittals and approvals

Inside the project's **Drawings & approvals** tab: register each sheet (number, title, discipline, revision), issue numbered transmittals against it, and track client approval decisions on the same panel — everything ties back to the drawing register row rather than living in a separate email thread.

### Site supervision

For site-led commissions, the project's **Site Progress** tab covers site visits, inspection reports, progress reports, snags and site instructions; PDF reports can be generated from a recorded visit.

### Documents, specifications, communications, minutes, lessons

The remaining **Project workspace** tabs: **Documents** (register), **Specifications**, **Team** (if HR is enabled), **Communications** (threaded project discussion log), **Minutes** (meeting minutes), and **Lessons** (draft lessons-learned entries — publish one and it appears office-wide in LXOS, see below).

---

## Stage 03 — Approvals, revisions and portals

### Revision intelligence (CRIF)

Client-requested changes are tracked on the project's **Overview** tab as decisions/revisions with a **category** (Minor / Major / Critical) and a **source** (Client-driven / Internal error / Technical query / Scope change), each with an owner and a state transition history — so a revision has a paper trail, not a WhatsApp screenshot.

### Client portal

1. Grant portal access from **Third Parties → Clients** using the row's **Portal login** action.
2. The client signs in to their own portal and sees only their projects: stage progress, invoices (with PDF download), pending **approvals** (Approve / Request revisions / Reject, with a revision category and remarks when relevant), issued drawings (acknowledge receipt), transmittals, and a running feed of their own requests and feedback.
3. The client can also **Raise a change request**, **Leave feedback**, or **Schedule a meeting** from their portal header, and respond to an **impact assessment** once the architect has flagged fee/timeline impact on a request.

### Consultant portal

Grant access from **Third Parties → Consultants** using **Create login**. The consultant sees their engagement (scope, fees agreed/paid/balance), issued drawings, tasks assigned to them (with **Mark done**), and can **Submit a deliverable**, **Raise an RFI**, or **Add a note** — all text-based updates threaded per item.

### Contractor portal

Not yet available — contractor site-coordination access is being rebuilt.

---

## Stage 04 — Finance and close-out

### GST invoicing

1. Go to **Invoices** (`/invoices`, requires the Invoice-manage capability) → **New invoice**.
2. Pick the project; the firm's GST profile from Company settings (Not applicable / Composition / Regular) determines the tax logic automatically: Regular is 18% (split CGST/SGST intra-state, or full IGST inter-state) on a Tax Invoice; Composition is a flat 6% borne by the firm on a Bill of Supply; Not applicable adds no tax. TDS (10% u/s 194J) is applied per the firm's default when relevant.
3. Enter the taxable value (and SAC code, under Regular), mark **Inter-state (IGST)** if applicable, and optionally flag it as an **Advance invoice** (paying one gates project activation). Create as **Draft**.
4. **Issue** the invoice (Draft → Issued) once ready — this stamps the invoice date and queues the PDF; move it to **Paid** once payment lands, or **Cancel** instead of deleting an issued invoice.

### Reconciliation

**Reconcile** (`/reconcile`) — upload a bank statement (CSV/XLSX) with a batch label; remap the Date/Description/Amount columns if the file doesn't match the expected headers. AORMS matches statement lines to invoices by reference and amount; review the matched lines, then **Settle matched** to mark those invoices Paid, or export the batch as XLSX.

### Filing abstracts

**Financial Reports** (`/filing`) — two tabs, **GST abstract** and **TDS abstract**, each a period-by-period breakdown built from issued/paid invoices, with an **Export register** button for an XLSX invoice register to hand to your CA.

### Cash book, office expenses and payroll

- **Cashbook** (`/accounting/cash-book`) and **Office Expenses** (`/accounting/office-expenses`) share one form (**New expense** / **New cash voucher**): category, amount, date, payee, description, payment method. Each expense moves **Draft → Submitted → Audited (or Rejected) → Closed**.
- **Payroll** (`/finance/payroll`, HR-enabled firms) — **Generate payslip** for a member and month; salary figures are only shown to roles with salary-view access. **Mark paid** once disbursed.

---

## Library — reference content your office reuses

**Route:** `/libraries/*`

| Library | Route | What it holds |
|---|---|---|
| **Specification catalogue** | `/libraries/spec-catalog` | Versioned catalogue sets of specification line items (category, item, make, spec, finish); create a new version, add items, and set the active version |
| **Compliance Library** | `/libraries/compliance` | Uploaded compliance documents plus structured rule tables: NBC, FAR, Setbacks, Fire compliance, Regulations |
| **Master Plan Library** | `/libraries/master-plans` | PDF/DWG master-plan and zoning reference uploads |
| **Standards Library** | `/libraries/standards` | Design standards by discipline (Interiors, Plumbing, Electrical, Lighting), each with notes and attached files |

> The older Item Library (materials, labour, brand catalogue, recipes) and the in-browser Estimation/BOQ workspace were retired on 2026-07-09 and are not part of the current build. The specification catalogue above is the only surviving item-style library.

---

## Team, HR and performance

- **Teams** (`/team`) — the staff roster as portrait tiles (name, role, staff level, employment type, contact, monthly salary where visible, active/inactive). **New member** to add someone.
- **HR** (`/hr`, HR-enabled firms) — **Operations** tab: today's attendance summary, the leave register (**Request leave**, then **Approve**/**Reject**), and payslips (**Generate payslip**, **Mark paid**); plus **Staff profiles** and **Applications** (hiring pipeline) tabs.
- **Performance** (`/performance`) — the **ASPRF** (Architectural Staff Performance & Recognition Framework) dashboard: each member's rolling 30-day score is built from six weighted components — **Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%**, and an opt-in **Wellbeing 5%** (informational only, never used for discipline; a staff member turns it on for themselves). A **Recognition** tab lists the standard award types (Reliability Champion, Quality Champion, Drawing Excellence, Site Hero, Design Excellence, Mentor, Knowledge Builder) and lets managers **Grant reward points**.

---

## Third Parties

| Module | Route | What it is |
|---|---|---|
| **Clients** | `/clients` | A searchable CRM list — name, type, city, GSTIN, email, status; **New client**, activate/deactivate, and grant a **Portal login** |
| **Consultants** | `/consultants` | Directory of external consultants by discipline/firm; **Create login** grants a scoped consultant-portal account |
| **Contractors** | `/contractors` | Directory with category, contact, GSTIN/PAN, and a 1–5 performance rating (quality/timeliness/safety) per contractor |
| **Vendors** | `/vendors` | Material-supplier directory with category, contact, GSTIN/PAN, a rating, and a **pricing history** per vendor (material, unit, rate, effective date, source) plus quote comparison |

---

## Office documents

- **Proposals** (`/office/proposals`) — see Stage 01 above.
- **Contracts** (`/office/contracts`) — **New contract**: title, party, type, value, term, optional related project; status moves Draft → Active → On hold/Completed/Terminated.
- **Letters** (`/office/letters`) — **New letter**: recipient, date, subject, body (optionally starting from a template) — generates a shareable PDF the same way proposals and invoices do.

---

## AI — Ask ESTI and AI Studio

- **Ask ESTI** is a floating command bar, not a page — open it from the **ESTI** button in the footer taskbar or the **Alt+A** shortcut. Ask it about projects, invoices, tasks and deadlines; it answers from your project and office records.
- **AI Studio** (`/office/ai-studio`, Senior+ and plan-gated) generates permission-filtered document drafts — fee proposal narrative, scope of services, agreement clauses, specification notes, site report narrative, meeting minutes, RFI responses, project summaries, billing assistant text, and CRIF revision summaries. Every draft is editable, cites its sources, and is explicitly **draft only** — copy it into the target document and issue manually; nothing is sent automatically. (CAD-specific AI drafts are only available from the ESTICAD desktop companion, not this page.)
- AI runs on a self-hosted Ollama model by default — no external API keys required. A firm owner can switch to a firm-supplied OpenAI-compatible provider (endpoint, model, API key) from **Company account → Administration → AI Studio settings**, alongside a PII-redaction toggle.

---

## LXOS — Learning Exchange

**Route:** `/lxos`

Only the **Internal Exchange → Lessons Learned** register is live today — publish a lesson from a project's **Lessons** tab and it appears here office-wide (title, project, category, recommendation). The remaining tiles (Documentation Exchange, Internal Blogs, Whiteboard Studio, Knowledge Notes, and the whole Community Exchange / Professional Identity / Certification & Growth sections) are shown as **Planned** — not yet interactive.

---

## Alerts and search

- **Alerts** (`/alerts`) — an **Immediate action** table (refreshes every minute) and a **Daily digest** table below it, covering client decisions, follow-ups, permits, portal requests, overdue tasks, leave impact, and site coordination items. Click through to the linked project.
- **Search** (`/search`) — a single search box (2+ characters) with an object-type filter (projects, clients, tasks, drawings, letters, proposals, contracts, decisions, lessons, spec catalogue entries, consultants, contractors/vendors, invoices, and more) and an optional "limit to this project" scope.

---

## Account and company administration

| Task | Where |
|---|---|
| Your name, photo, password, personal 2FA | **Personal account** → `/account` (Profile, Security, Workspace tabs) |
| Firm profile — GSTIN, PAN, address, TDS declaration | **Company account** → `/company-account` (Firm tab) |
| Invite/manage members, approve joins | **Company account** → Members tab |
| Module toggles (HR, wellbeing breaks), storage usage, users, audit trail, AI Studio settings | **Company account** → Administration tab |
| Installation-level module toggles (system admin only) | `/system-admin` |

---

## Role-based access

AORMS uses a five-level internal staff ladder plus a System Admin overlay. External portal users (client/consultant/contractor) sit outside this ladder entirely.

| Level | Role | Typical access |
|---|---|---|
| **L1 — Owner** | Rank 100 | Everything, including firm settings, users, audit log, and salary figures |
| **L2 — Partner** | Rank 80 | Invoicing, fee proposals, HR/payroll, financial reports, project deletion |
| **L3 — Senior** | Rank 60 | Full task/project work, own performance card, project settings, consultants/contractors |
| **L4 — Associate** | Rank 40 | Day-to-day write access — tasks, drawings, client requests, view-only on clients/contracts |
| **L5 — Viewer** | Rank 20 | View access plus their own assigned tasks |
| **System Admin** | overlay | Installation-level tools only (seed/purge demo data, release metadata) — independent of role rank |

The UI hides what a role cannot do; the same rule is enforced server-side.

---

## Keyboard and productivity

- **Ask ESTI** — footer **ESTI** button or **Alt+A**.
- **Calculator** — footer left; persists as a floating panel.
- **Pomodoro** — footer tray, for focus sessions.
- **ActionDock** — centre-bottom; create/save/destroy actions for whichever screen you're on, instead of scattered page buttons.

---

## Getting help

- **Email:** [hi@aorms.in](mailto:hi@aorms.in)
- **Wiki:** [wiki.aorms.in](https://wiki.aorms.in)
- **Blog:** [aorms.in/blog](https://aorms.in/blog) — practice notes and release context

---

## Frequently asked questions

### Can we run AORMS on our own server?

AORMS is offered as **cloud SaaS** at aorms.in. Contact Holagundi Consulting Works for dedicated deployment discussions.

### Are there different product editions?

No. **One standard AORMS licence** includes the full feature set described here. You pay for extra storage and hosted AI usage beyond the included allowance, or bring your own AI provider.

### What happened to Estimation, BOQ, and the Knowledge Bank?

That stack (component library, rate books, BOQ, bar-bending schedules, work packages, running bills) was retired on 2026-07-09 and is being rebuilt from the ground up on a cleaner model. It is not available in the workspace today; the specification catalogue is the only piece that remains.

### How do I delete a workspace?

Company owners manage their organisation in the **company account** portal. Platform operators use the licensing console. For account closure, email [hi@aorms.in](mailto:hi@aorms.in).
