/**
 * Product knowledge for ESTI (Ask ESTI + landing AI).
 *
 * Originally auto-generated from frontend/src/content/wiki/*.md by
 * frontend/scripts/sync-wiki-knowledge.mjs — **that generator no longer exists**,
 * so this file is now maintained by hand. Keep it in step with the wiki content
 * and with PLANS-AND-TIERS.md; wrong answers here are shown to prospects.
 */

export const WIKI_PRODUCT_KNOWLEDGE = `\
## Official AORMS Wiki (canonical product documentation)

Public URL: https://aorms.in/wiki

### AI core ? EOMS and ESTI (aorms.in/wiki/ai-core)

AORMS intelligence is split into **two tiers**. **Do not conflate them in copy or configuration.**

| Tier | Name | Role |
| --- | --- | --- |
| **External knowledge bank** | **EOMS** — Emergent Object Management System | Catalog of **standard codebooks and compliance codes** (standalone API) |
| **Internal agent** | **ESTI** — Embedded Studio Intelligence | Answers only from **validated firm repositories** (live in **AORMS-Studio**) |

## Governing rule

> **EOMS** handles the outside world. **ESTI** handles what the firm already knows.

Deterministic systems create business truth. LLMs explain business truth ? they must not invent scores, predict delays directly, calculate financial state, or create unsupported recommendations.

## EOMS — knowledge bank

North-star capabilities:

- **Codes & compliance catalog** — standard codebooks and building/compliance codes, edition-versioned
- **API retrieval** — AORMS apps and native tools query EOMS for authoritative code/data on demand
- **Firm intake** — Knowledge Bank portal at \`/libraries/knowledge-bank-portal\` processes textbooks before publish to ESTI

EOMS is platform-wide — every AORMS app can query the knowledge bank for outside standards.

## ESTI ? internal AI agent

Live in **AORMS-Studio** today:

| Surface | Purpose |
| --- | --- |
| **Studio Intelligence** (\`/\`) | Office health, zone KPIs, ranked priorities, cognition brief |
| **Ask ESTI** | Taskbar AI ? contextual Q&A from validated firm data + published repo library (BYO API key supported) |
| **ESTI Pulse** | Attention signals ? fee risk, revision pressure, load |
| **MoM extraction** | Draft revision requests from meeting minutes |

### Cognition pipeline

\`\`\`text
Operational records ? deterministic scoring ? pattern recognition
  ? causal reasoning ? prediction ? intervention recommendation
  ? LLM explanation ? dashboard office state
\`\`\`

Key tables: \`esti_cognition_event\`, \`esti_cognition_behavior_profile\`, \`esti_cognition_priority_item\`. Exposed via \`dashboard.home\` and related tRPC namespaces.

## Configuration

- Firm AI settings ? model provider, API keys, feature toggles (owner/admin)
- Ask ESTI ? user-level key optional for BYO inference
- Wiki content syncs to ESTI product knowledge on build (\`sync-wiki-knowledge.mjs\`)
- **Knowledge Bank portal** ? EOMS-processed textbooks publish into ESTI agent context (\`knowledgeBankPortal\` tRPC)

## Where to go next

- [Knowledge Bank portal](knowledge-bank-portal) ? textbook intake and library publish

- [How to use AORMS ? Studio Intelligence](how-to-use-aorms#studio-intelligence--your-morning-surface)
- [AORMS-Studio overview](aorms-studio)
- Engineering: \`docs/esti/COGNITION-ENGINE.md\`, \`docs/esti/ESTI-PULSE.md\`

## Frequently asked questions

### Can ESTI fetch from the open web?

No. **EOMS** handles external sources. **ESTI** answers from validated firm repositories only.

### Does the AI write invoices or change drawings?

No. ESTI recommends and explains; writes go through normal audited modules (proposals, invoices, drawing register, portal approvals).

### Is Ollama required?

The backend AI gateway supports Ollama for on-prem inference. Cloud deployments may use other providers configured in firm AI settings.

---

### AORMS-Consultancy (aorms.in/wiki/aorms-consultancy)

**AORMS-Consultancy** is the **engineering consultancy app** on the AORMS platform — for structural, MEP, civil, and multidisciplinary engineering firms that advise on built-environment projects.

| Aspect | AORMS-Consultancy |
| --- | --- |
| **Status** | Roadmap |
| **Slug** | \`aorms-consultancy\` |
| **Discipline** | Engineering |
| **Intelligence** | **EOMS** knowledge bank + **ESTI** internal AI agent when engineering app ships |

## What it shares with AORMS-Studio

Both apps run on the same AORMS platform spine:

- Operational framework — intake, process standards, review chains, audit trails
- Design framework — engagement methodologies, deliverable models, versioned templates
- Collaboration, approval workflows, knowledge base, analytics
- Dual-tier AI — **EOMS** knowledge bank + **ESTI** internal agent

## What differs from AORMS-Studio

- Discipline-specific deliverable models (calculations, reports, peer review, sign-off chains)
- Engineering engagement templates — not architecture fee proposals or drawing registers
- No **ESTI** (internal agent) at launch — **AORMS-Consultancy** uses **EOMS** (knowledge bank) first; internal-agent profile follows

## Platform context

| Discipline | App |
| --- | --- |
| Architecture | **[AORMS-Studio](aorms-studio)** (shipping) |
| Engineering | **AORMS-Consultancy** (this page — live) |

- [AORMS platform home](/)
- [AORMS-Studio sign in](/login)
- [AORMS-Consultancy marketing](/aorms-consultancy)

---

### AORMS-Studio (aorms.in/wiki/aorms-studio)

**AORMS-Studio** is the **architecture app** on the AORMS platform — built for Indian architecture and interior design **consultancies** that advise clients. It is **not** construction project management or contractor coordination software.

| Aspect | Detail |
| --- | --- |
| **App URL** | [studio.aorms.in](https://studio.aorms.in) |
| **Audience** | Registered architects, interior designers, solo practitioners, mid-sized firms |
| **Licence** | One standard licence — unlimited users, clients, projects; 5 GB included storage |
| **Intelligence** | **ESTI** (internal AI agent) · **EOMS** (knowledge bank) on the platform |

## What the workspace covers

- **Projects & phases** — enquiry to close-out on one project record
- **Fee recovery** — COA fee proposals, stage-wise billing, GST invoicing
- **Client revisions** — MoM → ESTI extract → client request → architect assessment → client approval → site
- **Drawings** — register, transmittals, approval state, revision categories
- **Site supervision** — visits, snags, site instructions, progress reports, inspections
- **Portals** — client, consultant, and contractor scoped access
- **Studio Intelligence** — principal dashboard with zone health and ranked priorities
- **Library** — compliance, master plans, standards, item/spec catalogues

## The four-stage practice spine

| Stage | Modules |
| --- | --- |
| **01 — Enquiry & proposal** | Leads, Office → Proposals |
| **02 — Design & drawings** | Projects, Tasks, Drawings |
| **03 — Approvals & revisions** | Client portal, Decisions, Critical notes |
| **04 — Bill & close** | Finance → Invoices, Filing |

## Guides in this wiki

- [Getting started](getting-started) — account, profile, first project
- [How to use AORMS](how-to-use-aorms) — end-to-end workflow map

## Platform context

AORMS (**Accelerated Operational Resources Management System**) is the wider platform — operational and design frameworks for **AEC consulting firms**. Two apps share one spine:

| Discipline | App |
| --- | --- |
| Architecture | **AORMS-Studio** (this app — shipping) |
| Engineering | **AORMS-Consultancy** (live) |

- [AORMS platform home](/)
- [AORMS-Studio marketing + sign in](/login)
- [AORMS-Consultancy (live)](/aorms-consultancy)
- [Wiki documentation](/wiki/aorms-studio)

## Frequently asked questions

### Is this the same as generic project management software?

No. AORMS-Studio is a **consultancy project record** — phases, drawings, fee milestones, revision approval chains, and Indian GST context are first-class. It does not replace contractor scheduling or site PM tools.

### Where does ESTI appear?

Studio Intelligence (\`/\`), Ask ESTI (taskbar), ESTI Pulse signals, and MoM-to-revision drafting. ESTI is scoped to this workspace only.

### Do I need a desktop install?

No. AORMS runs entirely in the browser — there are no desktop apps or installers.

---

### Getting started (aorms.in/wiki/getting-started)

## 1. Create an account

1. Open [aorms.in](https://aorms.in) and choose **Create account** in the rail, or go directly to [aorms.in/login](https://aorms.in/login) and switch to the sign-up tab.
2. Enter your work email and password. Complete the profile fields (name, firm, COA registration where applicable).
3. Confirm your email if prompted. Every new account receives the **full AORMS workspace** and **5 GB** of included cloud storage.

There is **one standard licence** � you do not pick Lite, Pro, or Enterprise. Unlimited staff, clients, and projects are included from day one.

## 2. First sign-in

After sign-in you may be asked to:

- **Set a new password** (if an admin pre-provisioned your account).
- **Complete your workspace profile** � firm name, address, GSTIN, and practice details used on proposals and invoices.

These gates appear once and unblock the full workspace.

## 3. Understand the shell

AORMS uses a fixed **glass rail** (left), a scrolling **stage** (centre), a **taskbar footer** (calculator, launcher, tray), and a **context ActionDock** (bottom-centre) for screen-specific actions.

| Area | What it does |
|------|----------------|
| **Rail** | Module navigation � Studio Intelligence, Projects, Tasks, Library, Finance, and more |
| **Stage** | The active screen � tables, forms, and project detail |
| **ActionDock** | Create, save, and destroy actions for the current screen (replaces scattered page buttons) |
| **Footer** | Calculator, app launcher, notifications tray |

## 4. Your first hour

Recommended order for a new principal or office manager:

1. **Studio Intelligence** (\`/\`) � read the overview KPIs and Action Centre.
2. **Company** � upload your firm logo, confirm GST and address, review storage usage.
3. **Third Parties ? Clients** � add one real client and one active project.
4. **Projects ? open the project** � create phases, add a drawing register entry, assign one task.
5. **Tasks** (\`/tasks\`) � log attendance-linked work for today.

## 5. Invite your team

1. Go to **Company account** (from the header ID card or \`/company-account\`).
2. Open **Members** and invite colleagues by email. They must sign up first if they do not have an account.
3. Assign **roles** so finance, HR, and project staff see only what they need.

## 6. Where to go next

- **[How to use AORMS](how-to-use-aorms)** � full workflow guide from enquiry to final account.
- **[Finance and billing](finance-and-billing)** � proposals, GST invoices, reconciliation.
- **[Account and licence](account-and-licence)** � storage, AI usage, and company settings.

## Frequently asked questions

### Do I need to download anything?

No. AORMS runs entirely in the browser at [aorms.in](https://aorms.in). Sign in from any modern desktop or laptop browser.

### How many users can I add?

Unlimited. Pricing is not per-seat. You pay for **additional cloud storage** and **hosted AI usage** beyond the included allowance, or bring your own API key for Ask ESTI and AI Studio.

### Is there a demo?

Yes. Contact [hi@aorms.in](mailto:hi@aorms.in) or use the demo unlock in the footer if your deployment exposes it. Demo data resets nightly (IST).

---

### HCW-UI design system (aorms.in/wiki/hcw-ui-kit)

**HCW-UI** (*Human Centric Works UI Kit*, package \`@hcw/ui-kit\`) is the single design system behind every AORMS surface � workspace app, client and consultant portals, licensing console, marketing pages, and the live specimen at [/design-system](/design-system).

## Thesis � depth encodes importance

Three material languages stack by visual depth. Pick a layer by **role**, not taste:

| Layer | Language | Used for |
| --- | --- | --- |
| **1 � Flat** | Hyperminimalist | Data at rest � tables, text, headings, surfaces |
| **2 � Soft** | Neumorphic | Objects you work within � dialogs, panels, widgets, recessed inputs |
| **3 � Glass** | Glassmorphism | Live layer � hover, CTAs, ActionDock, priority alerts |

**Radiant Orange** (\`#FF4F18\`) is the single accent. Filled buttons carry white text; links use slate, never the accent fill.

**Shape:** surfaces are square (\`RADIUS: 0\`). Generic \`MuiButton\` uses \`BUTTON_RADIUS\` (4px). The **ActionDock** tray and its buttons use **\`DOCK_PILL_RADIUS\`** � a full capsule pill (\`ACTION_DOCK_TRAY\` + \`actionDockButtonSx\`).

## Spatial model � Rail � Stage � Taskbar � ActionDock

| Zone | Role |
| --- | --- |
| **Rail** (20%, fixed) | Navigation, filters, screen context � glass on marketing; glass dash rail in the app |
| **Stage** (scrolls) | Primary work surface |
| **Taskbar footer** | Calculator � launcher cluster � tray (clock, alerts, ID, sign out) |
| **ActionDock** (floating, bottom-centre) | Context-aware screen actions via \`useScreenActions\` � left destroy � centre create � right commit |

Login and auth forms sit in the **rail**, not on the stage.

## Key primitives

- \`<MuiRoot>\` � themed app shell
- \`<Surface layer="flat|soft|glass|clearGlass|headingGlass">\` � layer recipes
- \`<GlassRail>\` � marketing / auth rail
- \`useScreenActions\` � publish CTAs to the global ActionDock
- \`HealthGlassOrb\` � office health signal on glass chrome

Tokens live in \`packages/hcw-ui-kit/src/tokens.ts\`. The frontend theme shim re-exports the kit � do not add raw hex in product screens.

## Where to go next

- **Live specimen:** [Design system](/design-system) on the public site
- **Engineering docs:** \`docs/esti/HCW-UI-KIT.md\` and \`docs/esti/HCW-UI-UX-PRINCIPLES.md\` in the monorepo
- **Brand heritage:** \`docs/esti/AORMS-BRANDING-KIT.md\`

## Frequently asked questions

### Is Carbon still used?

No. \`@carbon/react\` was removed (2026-07). Legacy \`--cds-*\` CSS variables in \`styles.scss\` are a static compatibility layer only.

### Where do marketing pages get their layout?

\`MarketingShell\` � glass rail (open or collapsed icon strip) + scrolling stage + SectionDock for in-page sections. Flat marketing content uses the \`lp2-ds\` class family.

### How do I add a screen action?

Call \`useScreenActions\` from \`@hcw/ui-kit\` with \`{ id, zone, label, onClick, tone?, icon? }\`. Clear the array when a dialog is open so the dock does not compete with modal CTAs.

---

### Management � operational framework (aorms.in/wiki/management)

**Management** in AORMS means how the **consultancy office runs** � not client construction delivery. The platform provides an **operational framework** (process, audit trails, review chains) and a **design framework** (engagement models, deliverable templates) on one spine.

For AORMS-Studio, management modules include:

## Finance & compliance

| Module | Route | Purpose |
| --- | --- | --- |
| **Proposals** | \`/office/proposals\` | COA fee proposals and scope agreements |
| **Invoices** | \`/finance/invoices\` | GST invoicing, SAC codes, FY-sequential numbering |
| **Reconciliation** | \`/finance/reconcile\` | Bank, 26AS, AIS, GSTR imports |
| **Filing** | \`/finance/filing\` | GST/TDS filing abstracts |
| **Office expenses** | \`/finance/expenses\` | Project and office costing |
| **Cash book** | \`/finance/cash-book\` | Office cash movements |
| **Payroll** | \`/finance/payroll\` | Payslips (HR-gated) |

See [Finance and billing](finance-and-billing) for step-by-step guides.

## People & performance

| Module | Route | Purpose |
| --- | --- | --- |
| **Team** | \`/team\` | Roster, assignments, workload |
| **HR** | \`/hr\` | Leaves, payroll inputs (hr:manage) |
| **Performance** | \`/performance\` | ASPRF composite scores |
| **Attendance** | (per-person records) | Daily attendance and time attribution |

**ASPRF** weights: Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%, Wellbeing 5% (opt-in).

## Administration

| Topic | Guide |
| --- | --- |
| Licence & storage metering | [Account and licence](account-and-licence) |
| Users & roles | Firm admin ? Users (\`firm:admin\`) |
| Audit log | Admin ? Audit (\`reports:view\`) |
| Company profile | Firm ? Company |

## Third parties

- **Clients** � CRM and client log (\`/clients\`)
- **Consultants** � engagements and consultant portal
- **Vendors** � placeholder directory

## Operational principles

1. **Money in paise** � all amounts integer; display with \`formatINR\`
2. **Immutable audit** � activity and audit namespaces for traceability
3. **Capabilities** � \`can(role, capability)\` gates procedures; not ad-hoc UI hides
4. **India profile** � April�March FY, GST rates, SAC codes from public \`profile\` namespace

## Platform vs workspace

| Layer | Management scope |
| --- | --- |
| **AORMS platform** | Frameworks, EOMS + ESTI agents, **AORMS-Consultancy** engineering app (live) |
| **AORMS-Studio** | Indian consultancy finance, HR, team, and office modules listed above |

## Frequently asked questions

### Is there a Lite or Pro tier?

No. One **AORMS Standard** licence � full workspace, unlimited users, 5 GB included storage. Legacy tier names are retired.

### Where is project management?

Engagement delivery lives on the **project record** (phases, drawings, revisions) � see [AORMS-Studio](aorms-studio). AORMS is not a construction PM tool.

### Who can see financial reports?

Capability-gated � typically principals and finance roles. See \`packages/contracts/src/permissions.ts\` for the canonical matrix.

---

### How to use AORMS (aorms.in/wiki/how-to-use-aorms)

This guide walks through **how an Indian architecture consultancy runs on AORMS** � from the first client enquiry to final billing. All steps happen in the **cloud workspace**; there is no separate desktop product to install.

---

## The four-stage practice workflow

Every commission follows the same spine in AORMS:

| Stage | What happens | Primary modules |
|-------|----------------|-----------------|
| **01 � Enquiry & proposal** | Lead captured, scope defined, COA fee proposal issued | Leads, Office ? Proposals |
| **02 � Design & drawings** | Phases, tasks, drawing register, transmittals | Projects, Tasks, Drawings |
| **03 � Approvals & revisions** | Client decisions, revision intelligence, portal trace | Client portal, Decisions, Critical notes |
| **04 � Bill & close** | GST invoices, reconciliation, filing abstracts | Finance ? Invoices, Filing |

The sections below expand each stage with **click-level instructions**.

---

## Studio Intelligence � your morning surface

**Route:** \`/\` (home)

Studio Intelligence is the principal's **action-oriented dashboard**, not a decorative KPI wall.

### What you see

- **Overview tab** � merged studio health: leads, projects, fees at risk, team load.
- **Zone tabs** � Lead � Project � Financial � Team � Work � Approval � each with four KPI tiles and a scrolling data table inside the tile.
- **Sidebar** � AI recommendation over the last ten office-log entries.

### Daily routine (5 minutes)

1. Open AORMS and land on **Studio Intelligence**.
2. Scan **Approval** and **Financial** zones for red or yellow states.
3. Open the ranked **Action Centre** items � overdue client approvals, unbilled completed work, blocked tasks.
4. Use **Ask ESTI** (header or AI panel) to explain a specific risk: *"Why is Project X flagged for fee risk?"*

### Tips

- The page **does not scroll** as a whole � each zone's table scrolls inside its tile. Use the rail to jump modules.
- KPI colours map to zone state (healthy, attention, critical) � treat orange as "needs a principal decision today."

---

## Stage 01 � Enquiry and fee proposal

### Capture the lead

1. **Studio Intelligence ? Lead** or **Office ? Leads** � create a new lead with client name, site location, and enquiry source.
2. Link the lead to an existing **Client** (Third Parties) or create the client record first.
3. When qualified, **convert to project** � the project inherits client and brief context.

### Issue a COA fee proposal

1. Go to **Office ? Proposals** (\`/office/proposals\`).
2. **Create proposal** � choose type (fee proposal / scope agreement as applicable).
3. Enter stage-wise fees on the **COA scale**, SAC code, and payment milestones.
4. Route through internal review if your office uses approval workflows.
5. **Send to client** via the client portal or export PDF for email � the proposal stays on the project record.

### Client approval gate

When the client accepts:

1. Open the proposal and set **client approval** status.
2. The project **fee baseline** is locked for billing � later revisions can carry fee impact separately.

---

## Stage 02 � Design, drawings, and delivery

### Set up the project

1. **Projects** (\`/projects\`) � open the project.
2. **Phases** � mirror your design stages (Concept, SD, DD, CD, etc.).
3. **Project Info / Brief** � complete the questionnaire sections so the team shares one brief.
4. **Assignments** � attach staff from **Studio ? Team** to the project.

### Tasks and time

1. **Tasks** (\`/tasks\`) � create tasks per phase with classification (billable / non-billable) and work type (design development, technical production, etc.).
2. Set **estimated hours** and **difficulty** for ASPRF scoring.
3. Staff log **attendance** and attribute time to tasks � workload views show overload before deadlines slip.

### Drawing register

1. In the project, open **Drawings**.
2. Register each sheet: number, title, discipline, revision.
3. Issue **transmittals** � numbered, dated, tied to the project (not a loose email attachment).
4. Upload DXF/PDF as your office policy requires; revisions increment on the same register row.

### Site supervision (consultancy)

For site-led commissions:

1. **Site visits**, **inspections**, **progress reports**, **snags**, and **site instructions** live under the project's site modules.
2. Generate PDF reports from recorded visits � status tracks PENDING ? READY on the worker.

---

## Stage 03 � Approvals, revisions, and client portal

### Client portal

1. Enable portal access for the client contact (Third Parties ? Client ? portal invite).
2. The client sees **only their projects** � drawings for approval, fee status, revision requests.
3. Decisions are **dated and attributed** � not screenshots in WhatsApp.

### Revision intelligence

When the client requests a change:

1. Record a **decision** or **revision request** with category (minor / major / critical) and source (client-driven, internal error, technical query, scope change).
2. Attach **fee and time impact** before work proceeds.
3. **Meeting minutes** can feed revision requests � ESTI can draft formal revision text from MOM for client approval.

### Consultant and contractor portals

- **Consultants** � scoped to their engagement; RFIs and issued drawings only.
- **Contractors** � site instructions and drawings for their package; no office-wide access.

---

## Stage 04 � Finance and close-out

### Invoicing

1. **Finance ? Invoices** � create GST invoice from completed stages or running account.
2. Line items use your firm SAC; CGST/SGST or IGST per place of supply.
3. Link invoice to proposal milestones where applicable.

### Reconciliation and filing

1. **Finance ? Reconcile** � import bank, 26AS, AIS, GSTR files; match entries.
2. **Finance ? Filing** � GST/TDS filing abstracts for the accountant.

### Expenses and payroll

- **Office cash book** and **project expenses** for internal costing.
- **Payroll** (if HR enabled) � payslips tied to attendance.

See **[Finance and billing](finance-and-billing)** for detail.

---

## Library � knowledge your office reuses

**Route:** \`/knowledge-bank\` and \`/libraries/*\`

| Library | Purpose |
|---------|---------|
| **Item library** | Materials, labour, items, brands, specifications, recipes |
| **Compliance** | NBC, FAR, setbacks, fire, regulations |
| **Master plans** | PDF/DWG reference uploads |
| **Standards** | Discipline standards with attached files |

Use the library when writing specs, estimates, and compliance checks � one catalogue for the whole firm.

---

## AI Studio and Ask ESTI

### Ask ESTI

- Available from the header AI entry � asks over **your project and office record**.
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
| Firm profile, logo, GST | **Company** (\`/company\`) |
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
| **Finance** | Invoices, reconcile, filing � not HR unless granted |
| **HR** | Team, payroll, attendance � when \`hrEnabled\` |
| **Client** | Portal only � their projects |
| **Consultant / Contractor** | Scoped portal |

Capabilities are enforced server-side via \`can(role, capability)\` � the UI hides what the role cannot do.

---

## Keyboard and productivity

- **Global search** � header search across projects, clients, documents.
- **Calculator** � footer left; persists as a float.
- **Pomodoro** � footer tray for focus sessions.
- **ActionDock** � centre bottom; primary save/create for the active screen.

---

## Getting help

- **Email:** [hi@aorms.in](mailto:hi@aorms.in)
- **Wiki:** [aorms.in/wiki](https://aorms.in/wiki)
- **Blog:** [aorms.in/blog](https://aorms.in/blog) � practice notes and release context

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

---

### Knowledge Bank portal — EOMS textbook library (aorms.in/wiki/knowledge-bank-portal)

The **Knowledge Bank portal** (\`/libraries/knowledge-bank-portal\`) is where firm staff bring **external
textbooks and reference material** into AORMS. PDFs convert to **Markdown** (same
[pymupdf4llm](https://github.com/HolagundiWorks/hcw-markdown-tool) pipeline as **HCW Markdown Tool**);
**EOMS** processes the markdown; **ESTI** reads only **published** library content.

## Workflow

1. **Add source** — title, author, category, and text (paste or upload PDF / \`.txt\` / \`.md\`).
2. **Markdown** — PDFs convert in the worker; pasted text is normalised to markdown.
3. **Process with EOMS** — rephrase + section summaries (faithful to source; no invented facts).
4. **Review** — read generated sections.
5. **Publish to ESTI** — library enters Ask ESTI context with citations.

## Who can use it

Staff with **write** capability (L4+). AI must be enabled on the firm plan for live EOMS inference.

## Related

- [AI core](ai-core) — EOMS vs ESTI
- [How to use AORMS — Library](how-to-use-aorms#library)

---

### Finance and billing (aorms.in/wiki/finance-and-billing)

AORMS finance modules follow **Indian consultancy practice** � COA fee scales, GST, TDS reconciliation, and April�March reporting context.

---

## Fee proposals

**Route:** Office ? Proposals (\`/office/proposals\`)

1. Create a **fee proposal** or **scope agreement** on the unified proposal model.
2. Enter stage-wise fees, percentages, or lump sums per COA convention.
3. Track **internal approval** and **client approval** on the same record.
4. Approved proposals become the **billing baseline** for the project.

---

## GST invoicing

**Route:** Finance ? Invoices (\`/finance/invoices\`)

1. **Create invoice** � select client, project, and tax profile.
2. Line items use consultancy **SAC codes**; CGST/SGST or IGST from place of supply.
3. Amounts are stored in **paise** internally; the UI formats INR.
4. Issue PDF; track payment status and credit notes as your policy requires.

---

## Reconciliation

**Route:** Finance ? Reconcile (\`/finance/reconcile\`)

1. Import **bank statements**, **26AS**, **AIS**, or **GSTR** files (formats supported by the worker).
2. Review suggested matches; confirm or override.
3. Unmatched entries stay flagged for the accountant.

---

## Filing abstracts

**Route:** Finance ? Filing (\`/finance/filing\`)

- Generate **GST** and **TDS** filing abstracts for the compliance period.
- Export for your CA or internal review � tied to reconciled data where possible.

---

## Office cash book and project expenses

- **Cash book** � office-level receipts and payments.
- **Project expenses** � attribute costs to projects for internal job costing.

---

## Payroll (optional)

When HR is enabled for your firm:

- **Finance ? Payroll** � payslips from attendance and salary structure.
- Requires \`hr:manage\` capability.

---

## Workflow: bill a design stage

1. Confirm the **stage is complete** on the project (tasks/decisions closed).
2. Open **Proposals** � verify the milestone amount for that stage.
3. **Create invoice** for the milestone; attach reference to the proposal line.
4. Send PDF to client; record receipt in reconcile when paid.
5. Studio Intelligence **Financial** zone should return to green for that project.

---

## Frequently asked questions

### Does AORMS file GST returns directly?

AORMS prepares **abstracts and reconciled data** � your CA files through the government portal. Integration depth may expand; check release notes.

### Are fees in rupees or paise?

Display is rupees; storage is integer **paise** for precision.

### Can clients see invoices in the portal?

Expose as your office policy dictates � fee **status** is visible in the client portal; invoice PDFs per your sharing practice.

---

### Account and licence (aorms.in/wiki/account-and-licence)

## One standard licence

AORMS has **no product tiers**. Every active account receives:

- The **full workspace** (projects, finance, HR, portals, AI, estimation, library)
- **Unlimited users**, clients, contractors, consultants, and projects
- **5 GB** included cloud storage

Legacy names (Lite, Pro, Core, Enterprise) are retired � licensing console and account screens show **AORMS Standard** only.

---

## What you pay for

| Meter | Included | Overage |
|-------|----------|---------|
| **Storage** | 5 GB | Per GB-month beyond included |
| **Hosted AI** | Usage-based | Per token/request when not using BYO key |
| **BYO AI key** | � | Your provider cost; AORMS does not meter hosted AI while BYO is active |

View usage in **Company ? settings** (storage bar and AI studio settings).

---

## Account portals

| Portal | URL | Purpose |
|--------|-----|---------|
| **Personal account** | \`/account\` | Email, password, AORMS ID, credentials |
| **Company account** | \`/company-account\` | Members, company licence, administration |

Company **owners** invite members, approve joins, and manage the workspace licence key if your deployment uses node activation.

---

## Sign-in and security

- **Email** is canonical (lowercase) across the platform.
- Enable **TOTP** from the account security panel.
- **Portal users** (clients, contractors) use separate login flows at \`/access\`.

---

## Workspace profile gate

Existing users may be prompted once to complete **firm profile** fields (GSTIN, address, COA details) before accessing the workspace. This keeps proposals and invoices consistent.

---

## Storage management

1. Monitor usage in Company settings.
2. **Archive** closed projects to move files off hot storage where archive workflow exists.
3. Purchase additional storage through your account operator or hi@aorms.in.

---

## AI configuration

1. **Company ? AI Studio settings** (firm admin).
2. Set **OpenAI-compatible** base URL and API key for BYO.
3. Ask ESTI and AI Studio prefer BYO when configured; fall back to hosted model if unreachable.

---

## Deleting a company workspace

- **Members** can leave via company account.
- **Owners** requesting full workspace deletion should contact [hi@aorms.in](mailto:hi@aorms.in).
- Platform operators can remove organisations from the licensing console (irreversible).

---

## Frequently asked questions

### Do I need a licence key for cloud SaaS?

Cloud accounts at aorms.in are **activated on sign-up**. Self-hosted or node installs may still display a key field � ignore for standard cloud unless support instructs otherwise.

### Can I add accountants without extra seats?

Yes. **Unlimited users** � add finance roles without per-seat fees.

### Where is the pricing page?

[aorms.in/#pricing](https://aorms.in/#pricing) � usage-based storage and AI on top of the included allowance.

---

### AORMS Wiki (aorms.in/wiki/index)

Welcome to the **AORMS Wiki** ? the canonical documentation hub for Human Centric Works products.

This wiki is organised in **four domains**:

| Domain | What it covers |
| --- | --- |
| **[HCW-UI](hcw-ui-kit)** | The layered design system (\`@hcw/ui-kit\`) ? flat, soft, and glass surfaces; Rail ? Stage ? Dock |
| **[AORMS-Studio](aorms-studio)** | The shipped architecture advisory workspace ? projects, fees, revisions, drawings, portals |
| **[AI core](ai-core)** | **EOMS** knowledge bank + **ESTI** internal AI agent — cognition engine, Ask ESTI |
| **[Management](management)** | Finance, billing, HR, licensing, team performance, operational framework |

**AORMS** (**Accelerated Operational Resources Management System**) is the platform for **AEC consulting firms**. Two apps share one spine: **AORMS-Studio** (architecture — shipping from this repository) and **AORMS-Consultancy** (engineering — live).

Sign in at [aorms.in/login](https://aorms.in/login). One standard licence ? unlimited users, **5 GB** included storage, no desktop installs.
`;
