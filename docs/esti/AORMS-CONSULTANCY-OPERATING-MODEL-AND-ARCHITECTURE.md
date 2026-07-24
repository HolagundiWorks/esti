# AORMS-Consultancy — engineering consultancy operating model & system architecture

> **Status:** Phases 0–4 + SOP closeout + pre-con R&O **code-complete** (migrations
> `0183`–`0218`); automated mutation/wiring tests landed. Remaining gates are **human**:
> P9.V ✅ and P9.M ✅ (2026-07-24) — see
> [autopilot roadmap P9](ROADMAP.md)
> and the §9 audit. **App:** **AORMS-Consultancy** (slug `aorms-consultancy`, host
> `consultancy.aorms.in`, discipline **Engineering**).
>
> **This document is the system-architecture draft.** The grounded, sourced operating
> model it rests on — org hierarchy, sign-off chain, workflow, billing, risk, with
> citations — lives in
> **[`AORMS-CONSULTANCY-SOP-CASE-STUDY.md`](AORMS-CONSULTANCY-SOP-CASE-STUDY.md)** (read that first).
> Framework/philosophy is in
> [`AORMS-CONSULTING-FRAMEWORKS.md`](AORMS-CONSULTING-FRAMEWORKS.md); naming in
> [`AORMS-PLATFORM-NOMENCLATURE.md`](AORMS-PLATFORM-NOMENCLATURE.md); surfaces in
> [`AORMS-SURFACE-URLS.md`](AORMS-SURFACE-URLS.md).
>
> Section §-references below (e.g. "case study §3") point into
> [`AORMS-CONSULTANCY-SOP-CASE-STUDY.md`](AORMS-CONSULTANCY-SOP-CASE-STUDY.md).

---

# System architecture draft (AORMS-Consultancy)

## 1. Design principles & platform fit

1. **One spine, two apps.** AORMS-Consultancy reuses the AORMS operational spine that
   already powers AORMS-Studio — auth, firm, clients, projects, tasks, transmittals,
   approvals, portals, proposals/invoices, libraries, audit, dashboard, and the
   **rail · stage · dock** HCW-UI-Kit UX. Engineering-specific behaviour is **additive**.
2. **Deterministic truth; intelligence explains.** Sign-off state, fee state, and issue
   state are deterministic records. AI (EOMS/ESTI-equivalent) explains and validates — it
   never *is* the record.
3. **Dual-tier intelligence firewall.** **EOMS** gates external inputs (codes, standards,
   architect packs, geotech reports) before they become working assumptions; the internal
   agent answers only from **validated firm repositories**.
4. **Depth encodes importance.** Same HCW three-layer material system (flat / soft / glass);
   the sign-off chain and hold points are the "live layer."
5. **Progressive formalization.** Works for a 4-person studio and a 60-person multidiscipline
   firm — advanced governance (Cat-3 checking, PI tracking) is opt-in.
6. **One account plane** *(shipped 2026-07-12)*. A single login window and a single licence
   manager serve both apps. Every company picks its workspace at creation —
   `hlp_organization.workspace_type` (**STUDIO** | **CONSULTANCY**, migration 0185), chosen
   on the company-creation form and carried on every org handle/membership. **Every user —
   individuals included — creates or joins a company before entering a workspace**; the
   workspace type only routes *where* the company works, never *how* it signs in or is
   licensed.

## 2. Reuse map — shared spine vs engineering-specific

| Concern | Reuse from platform | Engineering-specific addition |
| --- | --- | --- |
| Identity, firm, users, roles | `auth`, `users`, `firm`, `settings`, `admin`, `audit` | Grades + sign-off capabilities (§4) |
| Clients & engagements | `clients`, `projects`→**engagements**, `phases` | `disciplines`, engagement models, hold points |
| Work & people | `tasks`/`work`, `assignments`, `team`, `workload`, `attendance` | `timesheets`, `rateCards`, discipline capacity |
| Deliverables & issue | `transmittals`, `drawings`, `approvals`, `comments`, `activity` | `deliverables`, `calcPackages`, `reviewChains`, `technicalQueries` |
| Commercial | `proposals`, `invoices`, `reconcile`, `reports`, `accounts`, `expenses`, `purchaseOrders` | `feeAgreements`/`feeStages`, `variations`, WIP/realisation analytics |
| Knowledge | `standards`, `compliance`, `masterPlans`, `knowledgeBank`, `specCatalog` | Codes/standards intake via EOMS; precedent search |
| Site | `siteVisits`, `inspections`, `progressReports`, `snags`, `siteInstructions` | Scoped technical supervision, submittal review |
| Governance | `dashboard`, `notifications`, `portal`, `consultants` | `riskRegister`, `insurance` (PI), sign-off gates |

## 3. Domain model (engineering-specific entities)

New core entities (Drizzle tables prefixed **`esti_cons_`** — `esti_engagement` is
taken by Studio's architect↔consultant collaboration model, so the engineering spine
uses `esti_cons_engagement`, `esti_cons_deliverable`, `esti_cons_review_step`; the
tRPC namespace is `consultancy.*` for the same reason):

- **Engagement** — parallels/extends `project`: engagement **model** (design-assist / peer
  review / full design / site support), **consultancy type**, reliance scope, work-stage set.
- **ConsultancyType** *(shipped 2026-07-12, migration 0192)* — the Indian consultancy
  market's actual patterns: **Structural · PEB · Electrical · Plumbing (PHE) · HVAC ·
  Waterproofing · Landscaping**. Unlike architecture (one COA ladder for every practice),
  **consultancy work is typed — scope and phases cannot be generalised**: each type carries
  its own scope-of-work template (`CONSULTANCY_SCOPE_TEMPLATES` in contracts) which **seeds
  the engagement's phases at creation** (`esti_cons_engagement_phase`, editable per
  appointment). The consultancy's time is bounded by the recorded scope — work beyond it is
  a variation. Clients are typically **architecture firms** (sub-appointment), companies, or
  individuals (`ClientKind` gains `ARCHITECT_FIRM`).
- **Typed project brief** *(shipped 2026-07-12, migration 0193)* — a consultancy's brief is
  a **technical parameter set (the design-basis input data sheet)**, not architecture's
  client brief. Per-type researched field schemas in `CONSULTANCY_BRIEF_TEMPLATES`
  (structural mirrors the statutory **SDBR** form — built-up area, floors, construction
  type, seismic zone, SBC…; PEB mirrors the vendor RFQ sheet — span, eave height, bays,
  cranes, collateral; electrical/PHE/HVAC/waterproofing/landscape from NBC/IS/ISHRAE intake
  norms). Stored as `esti_cons_engagement.brief` jsonb; edited via a typed form generated
  from the template; feeds the intelligence digest.
- **Discipline** — structural / MEP / civil / geotech / façade …; an engagement has one or
  many; drives coordination + capacity.
- **DeliverablePackage** — the issuable unit: revision (A/B/C), **issue class** (FI/FA/FC),
  required **check category**, current sign-off state; groups drawings/calcs/reports.
- **CalculationPackage** — reproducible calc lineage: inputs, **assumptions**, code
  references, outputs; links to the deliverable and the validated `InputPack`.
- **ReviewStep / SignOff** — the serial chain: `originate → check → approve(sign) →
  [verify] → issue`, each step **named + timestamped + e-signed**, with the EoR captured at
  approve. Issue is **blocked** until the chain matching the check category is complete.
- **TechnicalQuery (TQ/RFI)** — direction, status, **closure evidence**, and a
  **scope-impact flag** that can spawn a Variation.
- **InputPack / Assumption** — external inputs (architect pack, geotech report, code
  clause) **validated through EOMS** before becoming working assumptions; carries
  **hold-point** gating.
- **FeeAgreement / FeeStage** — fee **model** (case study §5.1), stage values, and the mapping of
  stages to deliverable issues; drives milestone invoicing.
- **Timesheet / RateCard / Grade** — hours booked to engagement × deliverable × activity;
  chargeout rate per grade; substrate for WIP / utilisation / realisation.
- **Variation / AdditionalService** — out-of-scope work with approval → billing.
- **RiskItem / RiskRegister** — project + practice risk (likelihood × impact, owner,
  mitigation, residual).
- **InsurancePolicy (PI) / RelianceLetter** — PI limit/period/run-off; controlled reliance
  instruments.
- **CoordinationHold / ClashItem** — cross-discipline hold points and clash log.

## 4. Roles, capabilities & the sign-off chain in permissions

Extend `packages/contracts/src/permissions.ts` (`can(role, capability)`):

- **Grades** as a dimension alongside role (Principal / Director / Associate / Senior /
  Engineer / Graduate + Checker + Doc Control).
- New **capabilities**: `deliverable:originate`, `deliverable:check`,
  `deliverable:approve` (sign / become EoR), `deliverable:verify`, `deliverable:issue`.
- **Constraint engine** (server-side): checker ≠ originator; approver grade ≥ threshold;
  issue blocked until the **check-category** chain is satisfied. This is the codified sign-off chain (case study §3).
- Procedure tiers in `backend/src/trpc/trpc.ts` gate the mutations; the **audit** namespace
  records every sign-off immutably.

## 5. The billing engine

`feeAgreements` + `feeStages` extend the shared **`proposals`** model (which already unifies
fee proposals + scope agreements in AORMS-Studio):

1. Choose fee **model** (case study §5.1) per engagement; hybrid = lump/% base + time-charge lines +
   reimbursables.
2. **FeeStage → deliverable-issue** mapping fires a billing trigger; the **`invoices`**
   namespace (GST/SAC/TDS, paise) generates the tax-correct invoice.
3. **Timesheets → WIP / utilisation / realisation** analytics in the dashboard; earned vs
   billed vs collected.
4. **Variations** append billable scope and regenerate the fee position.

Reuses `invoices`, `reconcile`, `reports`, `accounts`, `expenses`, `purchaseOrders`
verbatim — engineering only adds the *fee-model + timesheet* front end.

## 6. The risk module

- **`riskRegister`** — per-engagement and practice-level register; feeds a dashboard health
  module (parallel to Studio's Revision Intelligence).
- **QA gates** — the sign-off chain state *is* the technical-risk control; the dashboard
  surfaces overdue checks and blocked issues.
- **`insurance`** — PI policy tracking (limit, period, run-off) + **reliance-letter** log.
- **Compliance** — reuses the existing `compliance` + `standards` libraries (NBC / IS / fire
  / regulation) as the codes-enter-once-validated corpus.

## 7. Dual-tier AI

- **EOMS (knowledge bank)** — the external catalog and intake path: codes, standards,
  architect packs, geotech reports, and third-party models are recorded and validated
  before they enter the firm knowledge base or become `InputPack` assumptions.
- **Internal agent (ESTI-equivalent, code-complete Ask surface)** — answers only from validated firm
  repositories: **precedent search** (past engagements as governed patterns), **calc-lineage
  Q&A**, **TQ history**, and **capacity analytics** ("structural is over-committed in
  September"). Uses the same on-server Ollama posture as ESTI — no external API keys.

## 8. Codebase integration (where it lands in `esti`)

- **`packages/contracts`** — new zod schemas (engagement, deliverable, review step, TQ, fee
  agreement, risk, PI), new **capabilities** + `can()` rules, engagement/issue-class enums.
- **`backend`** — domain lives at `backend/src/modules/consultancy/`, registered as the
  `consultancy.*` namespace in `backend/src/trpc/router.ts`. Sub-routers: `engagements` +
  `deliverables` (**shipped 2026-07-12**, migration 0183); to come: `calcPackages`,
  `reviewChains`, `technicalQueries`, `inputPacks`, `feeAgreements`, `timesheets`,
  `rateCards`, `variations`, `riskRegister`, `insurance`, `coordination`.
  Drizzle tables `esti_cons_*` (`esti_cons_engagement` + `esti_cons_deliverable` live;
  review/TQ/fee/risk/PI tables follow their phases); migrations in `backend/drizzle/`.
- **`frontend`** — the **consultancy surface** already exists (`surface === "consultancy"`,
  host `consultancy.aorms.in`). Build routes on the HCW-UI-Kit **rail · stage · dock**:
  Engagements, Deliverables + sign-off chain UI, TQ register, Fee & timesheets, Risk & PI,
  Coordination, plus reused Clients/Portals/Library.
- **`worker`** — reuse `render_pdf` for engineering deliverable/report PDFs; add renderers
  for calc packages / issue sheets if needed.
- **Surfaces** — `consultancy.aorms.in` + slug `aorms-consultancy` are already frozen in
  [`AORMS-SURFACE-URLS.md`](AORMS-SURFACE-URLS.md) and `frontend/src/lib/aorms-surface-urls.ts`.

## 9. Phased rollout

> **Status audit 2026-07-22 (code, not aspiration).** Phases 0–4 are **code-complete**
> (migrations `0183`–`0212` core + intelligence; `0214`–`0218` SOP links + closeout +
> pre-con R&O). Automated coverage: contracts helpers + stubbed-DB mutation wiring
> (fees, issue gates, closeout, pre-con). Remaining gate before offering Consultancy
> to a paying firm is complete (**P9.V** ✅ + **P9.M** ✅, 2026-07-24). See
> [autopilot roadmap P9](ROADMAP.md).

| Phase | Theme | Ships | State |
| --- | --- | --- | --- |
| **0 — Living record** | The engagement spine | `engagements`, `disciplines`, `deliverables` register, transmittals (reuse), client portal (scoped) | ✅ code-complete |
| **1 — Reliance engine** | Governance | `reviewChains` (named serial sign-off + check categories + EoR), `technicalQueries`, issue gating | ✅ code-complete |
| **2 — Commercial** | Fee & time | `feeAgreements`/`feeStages`, `timesheets`/`rateCards`, `variations`, WIP/utilisation/realisation, stage invoicing | ✅ code-complete |
| **3 — Risk** | Defensibility | `riskRegister`, opportunities, phase gates, `insurance` (PI + reliance), compliance gates, EOMS input validation | ✅ code-complete |
| **4 — Intelligence** | Internal agent | Ask + EOMS pack review, precedent search, deliverable/calc lineage, capacity outlook | ✅ code-complete |
| **SOP / closeout** | QMS registers | Lessons, NC/CAPA, MoM, WIP review, contract review, litigation hold, enquiry go/no-go | ✅ `0214`–`0217` |
| **Gate** | Ship to paying firm | Human fee UX review + marketing launch | ✅ P9.V / P9.M |

## 10. Decisions (resolved 2026-07-12 — Phase 0 unblocked)

Resolutions follow the platform's standing principles (one spine · progressive
formalization · India-first studio correctness · deterministic truth). Each stays
revisitable at the phase where it next bites.

| # | Decision | Resolution | Rationale / revisit point |
| --- | --- | --- | --- |
| **D1** | Tenancy | **Shared spine** — same DB/deployment as AORMS-Studio, app-scoped by surface (`consultancy.aorms.in`) | Every platform doc already assumes one spine; a split deployment re-creates the fragmentation AORMS exists to remove. Revisit only if a customer demands isolation. |
| **D2** | Proposals reuse depth | **Extend the unified `proposals` model** with fee-model + stage semantics (no parallel `feeAgreements` table) | The 0116 merge unified proposals for exactly this reason. Decision *bites* in Phase 2 — schema work deferred until then. |
| **D3** | Sign-off assurance | **Named + timestamped immutable record first** (reuse `audit`); cryptographic e-signature as a later, additive layer | Progressive formalization: the defensible record is the named chain, not the crypto. PKI adds cost before any firm asks for it. |
| **D4** | Calc engine scope | **Lineage only** — track calc packages, inputs, assumptions, code refs; **no in-app calculation engine** | Estimation OS teardown (2026-06-28) stands. The firm's tools compute; AORMS governs what was computed and relied on. |
| **D5** | Market order | **India-first** — RSE/NBC/IS statutory path, GST/SAC/TDS money spine; FIDIC/IStructE vocabulary kept compatible (check categories map to both) | Mirrors AORMS-Studio's India-first correctness; the check-category model is international-portable by design. |
| **D6** | BIM/model depth | **Reference-only** — deliverables reference model issues/extracts; no model-hosted data | Aligns with "report → model" as a *direction*, not a Phase-0 dependency. Revisit at Phase 4. |

**Gate status:** all six resolved. Phases 0–4 + SOP + R&O are built on the shared
spine (see the §9 audit); P9.V / P9.M are complete; further work is ops/DNS confirmation, not more
architecture decisions.

---

*Owner: platform. Update alongside
[`AORMS-CONSULTING-FRAMEWORKS.md`](AORMS-CONSULTING-FRAMEWORKS.md) and the nomenclature
canon. Phases 0–4 of this design are code-complete (see §9); launch remains gated
on human fee UX review and marketing.*
