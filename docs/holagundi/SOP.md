# Standard Operating Procedures — Indian Architecture Practice

**Status:** Practice reference · **Owner:** Holagundi Consulting Works ·
**Reviewed:** 2026-07-18

> Firm-wide SOPs for running an Indian architecture consultancy end to end —
> enquiry through final account. Written generically enough for any Indian
> practice, with a **module** column mapping each step to where it happens in
> **AORMS** today, and a **status** flag where AORMS doesn't support a step yet.
> Complements [CLIENT-ONBOARDING.md](CLIENT-ONBOARDING.md) and
> [PROJECT-BRIEFING.md](PROJECT-BRIEFING.md) (Phase 0 detail) and the compliance
> constants in [`docs/esti/INDIA-PROFILE.md`](../esti/INDIA-PROFILE.md). Module
> references were verified against the shipped app on 2026-07-17; where AORMS
> itself has since drifted from its own docs, see
> [`docs/esti/DOC-CODE-DRIFT-2026-07.md`](../esti/DOC-CODE-DRIFT-2026-07.md).

**Status legend:** ✅ supported end-to-end in AORMS today · 🚧 partially
supported (manual step or workaround needed) · 🔲 not supported — track outside
AORMS for now.

**This document is also the LXOS Academy curriculum.** Each SOP below is a
teaching module in **LXOS → Certification & Growth**: the *theory* half is a
condensed version of that SOP's steps (kept in sync with `ACADEMY_CURRICULUM`
in `packages/contracts/src/academy.ts`); the *practical* half is doing the
real workflow in AORMS, auto-detected from the audit log where a SOP has one
verifiable action (marked **AUTO** in the curriculum) and self-attested
otherwise (**SELF**). Changing a SOP's steps here should be followed by
updating the matching module's `theory`/`practical` text in `academy.ts` so
the two don't drift.

---

## Regulatory foundation

Every SOP below sits inside a fixed statutory frame — cite these rather than
restating them per-SOP:

| Instrument | Governs |
|---|---|
| **Architects Act, 1972** + **Council of Architecture Regulations, 1989** | Who may practise as "Architect" in India, registration (COA number), professional conduct, minimum scale of charges |
| **State building bye-laws / Town & Country Planning Act** (state-specific — e.g. Karnataka, Zoning Regulations) | FAR, setbacks, ground coverage, plan sanction, occupancy certificate |
| **RERA (state Real Estate Regulatory Act)** | Applies to the **client-as-promoter**, not usually the architect directly — but the architect's certifications (Form 3, progress certification) feed the promoter's RERA filings on eligible projects |
| **CGST/SGST/IGST Act, 2017** | GST on professional fees — see the three GST systems below |
| **Income-tax Act, 1961, §194J** | 10% TDS on professional fees, deducted by the client |
| **Indian Contract Act, 1872** | Enforceability of the engagement letter / fee proposal as a contract |
| **Copyright Act, 1957** | Drawings are the architect's copyright unless assigned — state this in the engagement letter |
| **Professional indemnity insurance** (not statutory, but COA-recommended practice) | Firm-level risk cover, renew annually, record the policy/renewal date |

### The lifecycle spine

AORMS's default phase plan (`packages/contracts/src/schemas.ts`,
`DEFAULT_PHASE_PLAN`) is the neutral, editable backbone every project and every
SOP below hangs off. Percentages are the *default* fee allocation per phase
(editable per project, must still sum to 100):

| # | Phase | Default fee % |
|---|---|---|
| 1 | Appointment & Engagement | 15 |
| 2 | Initiation & Brief | 5 |
| 3 | Concept Design | 10 |
| 4 | Design Development | 15 |
| 5 | Statutory Coordination | 15 |
| 6 | Construction Documentation | 15 |
| 7 | Tender & Appointment | 5 |
| 8 | Construction Administration | 15 |
| 9 | Handover & Closeout | 5 |

---

## Part A — Business development & engagement

### SOP-01 — Lead capture and qualification

| | |
|---|---|
| **Trigger** | Any enquiry — call, email, referral, site visit, walk-in |
| **Owner** | Front-desk / office manager, reviewed by a principal |
| **Steps** | 1. Capture enquirer name, phone, email, lead source, project type, site location, city, notes within 24 hours. 2. Move status **New → Contacted** once the first call/meeting happens. 3. **Assessment started → Awaiting review** while a principal decides fit (site, budget, timeline realism, conflict-of-interest check per COA Regulation 1989 — is another architect already engaged on this site?). 4. **Qualified** → convert; **Dropped/Lost** → record the reason for pipeline analytics. |
| **Records** | Lead register entry, conversion trail |
| **AORMS module** | Leads (`/leads`) · ✅ |

### SOP-02 — Pre-project due diligence

| | |
|---|---|
| **Trigger** | Lead marked Qualified and converted to a draft project (status: Enquiry) |
| **Owner** | Project-in-charge (Senior+) |
| **Steps** | 1. Capture **Project DNA** — budget mode, Vastu requirement, design language, decision-makers, timeline criticality, material expectations, revision tolerance. This produces a risk score to flag high-friction clients early. 2. Run the **feasibility check** — site dimensions, FAR factor, setbacks, ground coverage, construction rate — to sanity-check the client's budget against buildable area before quoting. 3. Generate a feasibility note/PDF for internal sign-off if the numbers are marginal. |
| **Records** | Project DNA record, feasibility computation, optional feasibility PDF |
| **AORMS module** | Project → Pipeline → Project DNA / Feasibility · ✅ |

### SOP-03 — Fee proposal and engagement letter

| | |
|---|---|
| **Trigger** | Feasibility accepted internally |
| **Owner** | Principal / Partner (`fees:manage`, L2+) |
| **Steps** | 1. Pick the work category and fee basis — **COA % of cost of works**, per-sq.m rate, or lump sum. 2. The system computes the COA minimum for that category automatically (Individual house 7.5% · Group housing 3.5/2.5/2.0% by size band · non-housing 5% · interiors/conservation/landscape 7.5% · urban design 1% — see Appendix). Quoting below the minimum requires a recorded **override reason** — never quote below COA minimum silently. 3. Add Doc & Communication @ 10% of the professional fee per COA convention. 4. Move the proposal **Draft → Internal review → Approved** (principal sign-off) before it ever reaches the client. 5. Attach scope of work, generate the proposal PDF, and move it to **Sent to client** — the record now shows exactly when and by whom it left the office. |
| **Records** | Proposal record (ref, fee basis, COA-minimum flag, override reason if any, status history), PDF |
| **AORMS module** | Office → Proposals (`/office/proposals`) · ✅ — status column (`proposals.setStatus`) |

### SOP-04 — Client approval and project activation

| | |
|---|---|
| **Trigger** | Client responds to the fee proposal |
| **Owner** | Principal / Partner |
| **Steps** | 1. Record the client's decision — **Approved / Rejected / On hold** — on the proposal. A rejection auto-cancels the draft project and marks the source lead **Lost**, closing the loop without a stray record. 2. Once approved, complete **client onboarding**: billing address, GSTIN, PAN, communication preference, authorised representative, signed agreement upload, ID proof upload. 3. Collect the advance payment per your standard terms. 4. Check the **activation gate** — DNA captured, assessment recorded, proposal approved, onboarding complete, advance received — then **Activate**. This flips the project to Active and auto-creates a kick-off meeting task. |
| **Records** | Client-approval timestamp, onboarding record, activation gate state |
| **AORMS module** | Project → Pipeline → Activation · ✅ |

---

## Part B — Design delivery

### SOP-05 — Phase planning and project brief

| | |
|---|---|
| **Trigger** | Project activated |
| **Owner** | Project-in-charge |
| **Steps** | 1. Confirm/adjust the default nine-phase plan and fee allocation for this project (see Lifecycle spine above). 2. Complete the **Project Info / Brief** questionnaire so the whole team works from one brief, not tribal knowledge. 3. Staff the project — assign team members under **Settings** (Senior+ to edit). |
| **Records** | Phase plan, project brief, team roster |
| **AORMS module** | Project → Setup: Program, Project Info, Settings · ✅ |

### SOP-06 — Task allocation and time attribution

| | |
|---|---|
| **Trigger** | Each design activity that needs to be tracked (per phase, per drawing set, per client deliverable) |
| **Owner** | Project-in-charge, executed by assigned staff |
| **Steps** | 1. Create a task with **Classification** (Billable / Non-billable / Training / Collaboration / Personal) — this is the financial dimension. 2. Set **Work type** (Design Communication / Design Development / Technical Production / Construction Support) — the ASPRF architectural category, separate from classification. 3. Set difficulty (1–5) and estimated hours for delivery-predictability scoring. 4. Assign, set a due date and priority; staff move status To do → In progress → Blocked → Done as work proceeds. |
| **Records** | Task history feeds ASPRF (SOP-27) and billing-readiness signals on the dashboard |
| **AORMS module** | Tasks (`/tasks`) · ✅ |

### SOP-07 — Drawing register, numbering and transmittal control

| | |
|---|---|
| **Trigger** | Any sheet issued internally or externally |
| **Owner** | Project-in-charge / drawing custodian |
| **Steps** | 1. Register every sheet — number, title, discipline, revision — before it leaves the office, never as a loose email attachment. 2. Increment the revision on the **same register row** — never create a new row for a revision, or the audit trail breaks. 3. Before issuing, mark the sheet **Reviewed** (with an optional note) — a QC checkpoint that stays visible next to "Issue PDF" so an unreviewed sheet is never issued by accident (advisory, not a hard block). 4. Issue a numbered, dated **transmittal** against the register for anything sent externally (client, consultant, statutory authority, contractor). 5. Log the client's **approval decision** against the issued drawing on the same panel. |
| **Records** | Drawing register (single source of truth for revision history), review status + reviewer, transmittal log, approval decisions |
| **AORMS module** | Project → Drawings & approvals · ✅ — review column (`drawings.setReviewStatus`) |

### SOP-08 — Client decision and revision management (CRIF)

| | |
|---|---|
| **Trigger** | Any client-requested or internally-flagged change |
| **Owner** | Project-in-charge |
| **Steps** | 1. Record the decision/revision with a **category** — Minor / Major / Critical — and a **source** — Client-driven / Internal error / Technical query / Scope change. Never let a "small" verbal change proceed unrecorded; category + source is what lets you later show a client *why* fees moved. 2. Assign an owner and track the state through to resolution. 3. Where a revision has fee or timeline impact, flag it before design work restarts — this is what protects the fee baseline set in SOP-03/04. |
| **Records** | Revision ledger (CRIF) on the project Overview tab |
| **AORMS module** | Project → Overview (revision-intelligence panel) · ✅ |

### SOP-09 — Statutory approvals and permit tracking

| | |
|---|---|
| **Trigger** | Design ready for local-authority submission (typically end of Concept/DD) |
| **Owner** | Project-in-charge, liaising with the statutory-approvals consultant if the firm uses one |
| **Steps** | 1. Track each permit application (plan sanction, fire NOC, environmental clearance, occupancy certificate, etc.) with submission date, authority, and status. 2. Chase and log follow-ups against the statutory-coordination phase, since this is usually the longest-lead item on the timeline. 3. Attach the sanctioned/approved documents once received — they become part of the permanent project record. |
| **Records** | Permit tracker |
| **AORMS module** | Project → Setup → Permits · ✅ |

### SOP-10 — Consultant coordination

| | |
|---|---|
| **Trigger** | Structural, MEP, landscape, or other specialist consultant engaged |
| **Owner** | Project-in-charge |
| **Steps** | 1. Add the consultant to the directory (discipline, firm, contact) and grant a **scoped consultant-portal login** for the engagement. 2. Track the engagement's agreed fee, paid amount, and balance. 3. The consultant works their own portal — submits deliverables, raises RFIs, adds notes, and marks assigned tasks done — so their coordination trail lives with the project, not in a side WhatsApp group. |
| **Records** | Engagement record, consultant portal activity |
| **AORMS module** | Third Parties → Consultants (`/consultants`), Consultant portal · ✅ |

---

## Part C — Site delivery (consultancy supervision)

> AORMS is consultancy-only — it supervises the contractor's execution; it does
> not run the contractor's own delivery (bidding, work packages, running bills,
> tenders — those modules were retired 2026-06-29, consultancy-only pivot).

### SOP-11 — Site visit cadence and inspections

| | |
|---|---|
| **Trigger** | Per the agreed site-visit frequency in the engagement letter (typically weekly to fortnightly during Construction Administration) |
| **Owner** | Project-in-charge or a designated site-visit architect |
| **Steps** | 1. Record each site visit against the project. 2. Log inspection findings and generate a PDF site-inspection/progress report where the client or contractor needs a formal record. 3. Raise **snags** for defects and **site instructions** for direction given on-site — both need a clear date and recipient so there's no dispute about what was instructed and when. |
| **Records** | Site visit log, inspection reports, snag register, site-instruction log |
| **AORMS module** | Project → Site Progress · ✅ |

### SOP-12 — Contractor coordination and rating

| | |
|---|---|
| **Trigger** | Contractor appointed by the client for execution |
| **Owner** | Project-in-charge |
| **Steps** | 1. Add the contractor to the directory (category, GSTIN/PAN, contact). 2. Record a 1–5 performance rating (quality, timeliness, safety) at each milestone or on completion — this becomes the firm's institutional memory for future recommendations. 3. Note the **contractor portal is not yet available** — site-instruction/drawing sharing with contractors is manual (email/print) until that surface ships. |
| **Records** | Contractor directory, rating history |
| **AORMS module** | Third Parties → Contractors (`/contractors`) · ✅ for the directory; contractor portal · 🔲 not built |

---

## Part D — Client & external collaboration

### SOP-13 — Client portal governance

| | |
|---|---|
| **Trigger** | Project activated (or per firm policy, at proposal stage) |
| **Owner** | Project-in-charge grants access; principal owns the disclosure policy |
| **Steps** | 1. Grant the client a **portal login** from the Clients directory. 2. The client sees only their own projects — stage status, invoices, approvals (Approve / Request revisions / Reject with remarks), issued drawings (acknowledge receipt), transmittals, and their own request/feedback history. 3. The client can raise a change request, leave feedback, or request a meeting from their side — route every one of these into SOP-08 (revision ledger) rather than answering informally outside the system. |
| **Records** | Portal activity log, client-side requests |
| **AORMS module** | Client portal · ✅ |

### SOP-14 — Meeting minutes and action tracking

| | |
|---|---|
| **Trigger** | Any client or team meeting with decisions/actions |
| **Owner** | Whoever chairs or scribes the meeting |
| **Steps** | 1. Record minutes against the project. 2. Where a minute implies a design change, cross-link it into the revision ledger (SOP-08) rather than letting it live only as a minutes entry — minutes are evidence, the revision ledger is the tracked commitment. |
| **Records** | Minutes log |
| **AORMS module** | Project → Minutes · ✅ |

---

## Part E — Finance & statutory compliance

### SOP-15 — GST invoicing

| | |
|---|---|
| **Trigger** | A billable milestone/phase is complete, or per the agreed billing schedule |
| **Owner** | Partner / Finance lead (`invoice:manage`, L2+) |
| **Steps** | 1. Confirm the milestone is actually complete (tasks/decisions for that phase closed) before raising the invoice — this is what keeps the fee baseline honest. 2. Create the invoice against the project; the firm's GST system (Not applicable / Composition / Regular — fixed per firm, see Appendix) drives the tax automatically: Regular splits CGST+SGST intra-state or IGST inter-state at 18%; Composition issues a Bill of Supply at a flat 6% borne by the firm, no GST charged to the client. 3. Move Draft → **Issue** (locks the invoice date, queues the PDF) → **Paid** on receipt, or **Cancel** rather than delete an issued invoice — the audit trail must stay intact. |
| **Records** | Invoice register, PDF, status history |
| **AORMS module** | Invoices (`/invoices`) · ✅ |

### SOP-16 — TDS tracking

| | |
|---|---|
| **Trigger** | Every invoice raised under §194J (10% TDS is the client's obligation to deduct and deposit) |
| **Owner** | Finance lead |
| **Steps** | 1. AORMS computes expected TDS per invoice automatically per the firm default. 2. At year-end (or as certificates arrive), reconcile expected TDS against **Form 26AS/AIS** so nothing is missed at ITR filing time. |
| **Records** | TDS receivable ledger |
| **AORMS module** | Reconcile (`/reconcile`), Filing (`/filing`) TDS abstract · ✅ |

### SOP-17 — Bank reconciliation

| | |
|---|---|
| **Trigger** | Periodic (weekly/monthly) or on payment receipt |
| **Owner** | Finance lead |
| **Steps** | 1. Upload the bank statement (CSV/XLSX) with a batch label; remap columns if the bank's export doesn't match the expected headers. 2. Review matched lines (by reference + amount); **Settle matched** to mark those invoices Paid. 3. Chase unmatched entries — they're either an unrecorded receipt or a client payment reference error. |
| **Records** | Reconciliation batches, matched/unmatched lines |
| **AORMS module** | Reconcile (`/reconcile`) · ✅ |

### SOP-18 — Periodic statutory filing abstracts

| | |
|---|---|
| **Trigger** | Monthly/quarterly filing cycle |
| **Owner** | Finance lead, handed to the firm's CA |
| **Steps** | 1. Pull the **GST abstract** (period-wise invoices/taxable/GST/grand total) for GSTR-1 + GSTR-3B (Regular) or CMP-08 + GSTR-4 (Composition). 2. Pull the **TDS abstract** for the CA's TDS reconciliation. 3. Export the invoice register (XLSX) as backup for the return. 4. Track statutory due dates on the Studio Intelligence dashboard rail: **TDS payment — 7th**, **GSTR-1 — 11th**, **GSTR-3B — 20th** of the following month. |
| **Records** | GST/TDS abstracts, exported register |
| **AORMS module** | Filing (`/filing`) · ✅ |

### SOP-19 — Office expense and cash-book control

| | |
|---|---|
| **Trigger** | Any firm overhead spend (rent share, software, stationery) or project-attributable expense (site travel, food, stay) |
| **Owner** | Whoever incurs the spend; audited by finance |
| **Steps** | 1. Log the expense — category, amount, date, payee, payment method. 2. Move it Draft → **Submitted** (by the spender) → **Audited** (approved) or **Rejected** by finance → **Closed** once settled. Cash vouchers debit the firm's Cash account directly. 3. Never let client revenue and expense rows mix in the same view — they're separate ledgers by design. |
| **Records** | Expense/voucher register with full status history |
| **AORMS module** | Office Expenses (`/accounting/office-expenses`), Cashbook (`/accounting/cash-book`) · ✅ |

### SOP-20 — Vendor and material rate tracking

| | |
|---|---|
| **Trigger** | Any material/vendor quote or purchase relevant to a project or general office costing awareness |
| **Owner** | Whoever collects the quote (project-in-charge, site architect) |
| **Steps** | 1. Add the vendor to the directory with category, contact, GSTIN/PAN. 2. Record each price point — material, unit, rate, effective date, source (manual/quote/invoice) — into that vendor's pricing history so rate trends are visible over time, not re-negotiated from scratch each project. 3. Rate the vendor (quality/reliability/pricing) after each transaction. |
| **Records** | Vendor directory, pricing history, quote comparisons |
| **AORMS module** | Third Parties → Vendors (`/vendors`) · ✅; formal purchase orders — Project → Purchase Orders tab · ✅ (link lines to the specification catalogue or add ad-hoc lines, DRAFT→ISSUED→RECEIVED/CANCELLED) |
| **Note** | The vendor pricing/quote `materialId` schema/code mismatch from the 2026-07-09 teardown was fixed (`efa1e1fa`); recording vendor prices and quotes works. ✅ |

---

## Part F — People and knowledge

### SOP-21 — Attendance, leave and payroll

| | |
|---|---|
| **Trigger** | Daily (attendance) / as requested (leave) / monthly (payroll) |
| **Owner** | HR lead (`hr:manage`, L2+) for approvals; each staff member logs their own time |
| **Steps** | 1. Staff attribute time to tasks; attendance rolls up automatically. 2. Leave requests move Requested → **Approved/Rejected** by HR/Owner. 3. **Generate payslips** monthly against attendance and salary structure; **Mark paid** once disbursed. Salary figures are visible only to roles with salary-view access (Owner, L1) — Partner-level HR admins process payroll without seeing individual amounts, by design. |
| **Records** | Attendance register, leave register, payslip history |
| **AORMS module** | Tasks → Attendance, HR (`/hr`), Payroll (`/finance/payroll`) · ✅ |

### SOP-22 — ASPRF performance review and recognition

| | |
|---|---|
| **Trigger** | Ongoing (rolling 30-day score), formal review per firm cadence |
| **Owner** | Principal / project leads |
| **Steps** | 1. Scores build automatically from task and decision history across six weighted components: **Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%**, plus an opt-in **Wellbeing 5%** (informational only — never used for discipline; each staff member opts themselves in). 2. Use the score, not gut feel, when granting recognition — award types (Reliability Champion, Quality Champion, Drawing Excellence, Site Hero, Design Excellence, Mentor, Knowledge Builder) and reward points are tracked against the profile. |
| **Records** | ASPRF score history, reward-point ledger |
| **AORMS module** | Performance (`/performance`) · ✅ |

### SOP-23 — Lessons learned and specification reuse

| | |
|---|---|
| **Trigger** | Project milestone or closeout; any recurring specification/material choice |
| **Owner** | Project-in-charge (lessons); whoever maintains the office's spec standard (catalogue) |
| **Steps** | 1. Draft a lesson (title, category, body, recommendation, tags) on the project; **publish** it so it surfaces office-wide rather than staying buried in one project's file. 2. Maintain the **specification catalogue** as versioned sets (category/item/make/spec/finish) so every new project starts from the office's proven choices, not a blank sheet — version it so past projects' spec sheets keep an immutable snapshot even as the active catalogue evolves. |
| **Records** | Published lessons register, spec catalogue versions |
| **AORMS module** | LXOS → Internal Exchange (Lessons Learned) · ✅; Library → Specification catalogue · ✅ |
| **Note** | The rest of LXOS (documentation exchange, internal blogs, community exchange, certifications) is a placeholder — not yet usable. 🔲 |

---

## Part G — Governance and records

### SOP-24 — Role-based access control

| | |
|---|---|
| **Trigger** | Onboarding/offboarding staff, or a role change |
| **Owner** | Owner (`firm:admin`, L1) |
| **Steps** | 1. Assign the internal staff level at hire — **Owner (L1)** for principals/directors, **Partner (L2)** for finance/senior partners, **Senior (L3)** for project leads, **Associate (L4)** for mid-level staff, **Viewer (L5)** for interns/juniors. 2. Grant portal-only access (Client/Consultant/Contractor) to external parties — they sit outside the internal ladder entirely and only ever see their own scoped record. 3. Revoke access (deactivate) immediately on offboarding — don't wait for a cleanup pass. |
| **Records** | User/role register, audit log |
| **AORMS module** | Company account → Members / Administration, `/system-admin` for install-level toggles · ✅ |

### SOP-25 — Document retention and project archival

| | |
|---|---|
| **Trigger** | Project reaches Completed status |
| **Owner** | Project-in-charge, signed off by principal |
| **Steps** | 1. Confirm the drawing register, transmittals, approvals, and final account are all closed out and internally consistent before archiving. 2. Move the project to Completed/Archived — this is what keeps active-project views clean without deleting the record; archived projects remain searchable. 3. Retain records for the practice's professional-indemnity/limitation period (commonly recommended 5–15 years depending on the firm's insurance terms and any latent-defect exposure) — do not purge project data on a fixed short timer. |
| **Records** | Archived project record (full history intact) |
| **AORMS module** | Projects → status, Admin → Archived projects · ✅ |

### SOP-26 — Professional conduct and conflict-of-interest checks

| | |
|---|---|
| **Trigger** | Every new enquiry (SOP-01/02) and periodically for ongoing engagements |
| **Owner** | Principal |
| **Steps** | 1. Before quoting, confirm no other architect is already engaged on the same commission without written release (COA Regulations, 1989) — enforced as a required checkbox + optional notes on the lead **Convert** dialog; conversion is blocked server-side without it. 2. Never offer or accept trade commissions/discounts from contractors or suppliers referred on a project. 3. Print the COA registration number and architect name on every drawing, proposal, invoice, and certificate — AORMS does this automatically from the firm's Legal ID once configured. 4. Keep professional-indemnity insurance current and record the renewal date somewhere reviewed annually. |
| **Records** | Conflict-check flag + notes on the lead record (stamped at conversion), insurance renewal reminder |
| **AORMS module** | Firm profile (COA number auto-stamped on documents) · ✅ for stamping; conflict-of-interest check · ✅ (`leads.convert` requires `conflictCheckDone`) |

### SOP-27 — Alerts and daily escalation

| | |
|---|---|
| **Trigger** | Continuous |
| **Owner** | Whoever's role the alert is scoped to |
| **Steps** | 1. Start the day on **Studio Intelligence** (`/`) — scan the ESTI tab's ranked priorities and risk list before anything else. 2. Check **Alerts** for immediate-action items (client decisions, follow-ups, permits, portal requests, overdue tasks) and the daily digest for lower-urgency items. 3. Treat a **■ critical** glyph as same-day, a **▲ watch/friction** glyph as this-week, and don't let items sit in the digest unactioned past a week. |
| **Records** | N/A — this is a monitoring habit, not a record-producing SOP |
| **AORMS module** | Studio Intelligence (`/`), Alerts (`/alerts`) · ✅ |

---

## Gap register

Where this SOP calls for something AORMS doesn't fully support yet, so it isn't
mistaken for a missing habit rather than a missing feature. **Closed 2026-07-18:**
explicit proposal-sent status, internal proposal approval, drawing QC checkpoint,
and the conflict-of-interest prompt — see the SOP entries above for how each
now works. Remaining:

| Gap | Impact | Workaround today |
|---|---|---|
| Contractor portal | No shared drawing/instruction surface with contractors | Email/print site instructions and drawings manually |
| LXOS beyond Lessons Learned + Academy | No documentation exchange, internal blogs, community exchange, professional identity, or formal certification issuance yet | Keep those artefacts elsewhere for now |
| Vendor pricing `materialId` schema mismatch | Recording a vendor price/quote line may error (2026-07-09 teardown fallout) | Track vendor pricing outside AORMS until fixed |

See [`docs/esti/DOC-CODE-DRIFT-2026-07.md`](../esti/DOC-CODE-DRIFT-2026-07.md) for
the engineering-side detail behind these gaps.

---

## Appendix — regulatory quick reference

**COA minimum fee scale** (% of cost of works, excluding land):

| Work category | Min % |
|---|---|
| Individual / independent house | 7.5 |
| Single-block housing (≤0.5 ha) | 5.0 |
| Group housing (0.5–2.5 / 2.5–5 / >5 ha) | 3.5 / 2.5 / 2.0 |
| All non-housing | 5.0 |
| Interiors / conservation / landscape | 7.5 |
| Urban design / renewal | 1.0 |
| Site development | 2.5 |
| Repeated design (same campus / different site) | 2.5 / 3.5 |

Plus **Documentation & Communication @ 10%** of the professional fee, and an
optional **contractor payment-certificate verification @ 1%** of cost.

**GST systems** (one active per firm):

| System | When | Rate | Document |
|---|---|---|---|
| Not applicable | Turnover ≤ ₹20L (₹10L special-category states), unregistered | none | Plain invoice |
| Composition | Annual billing < ₹40L, composition-registered | 6% flat, firm-borne | Bill of Supply |
| Regular | Default registered practice | 18% (CGST+SGST intra-state / IGST inter-state) | Tax Invoice |

**TDS:** §194J, 10% on professional fees, client-deducted — reconcile against
Form 26AS/AIS.

**Statutory due dates (monthly):** TDS payment — 7th · GSTR-1 — 11th ·
GSTR-3B — 20th.

Full detail: [`docs/esti/INDIA-PROFILE.md`](../esti/INDIA-PROFILE.md).
