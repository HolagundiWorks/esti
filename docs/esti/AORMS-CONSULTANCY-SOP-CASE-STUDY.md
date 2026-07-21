# Consulting-firm SOPs — how the office actually runs (grounded case study)

> **Status:** Research-grounded case study (2026-07-12). Companion to
> [`AORMS-CONSULTANCY-CASE-STUDY.md`](AORMS-CONSULTANCY-CASE-STUDY.md) (the operating
> model: hierarchy, sign-off, billing, risk). **This document covers the procedural
> layer** — the standard operating procedures a consulting firm runs day-to-day: QMS,
> document control, checking workflows, intake, communication, site visits, the
> timesheet→invoice cycle, and closeout. Sources at the end; anchors include a real
> consultancy's published ISO 9001 quality manual, the statutory ISO 19650 UK NA
> status/naming tables, the AIA G711 field-report form, and the NSPE records-retention
> white paper.
>
> §10 maps every SOP onto AORMS-Consultancy: **built ✅ / partial 🔶 / gap 🔲**.

---

## 0. Executive summary — the procedural spine

A consulting firm's SOPs form one loop:

```
ENQUIRY → go/no-go → proposal → contract review → JOB NUMBER → folder + PEP/PQP
   → produce (self-check → IDC → check → approve) → status-coded ISSUE via register
   → communicate (MoM · RFI/TQ registers · SLAs) → observe on site (G711-style reports)
   → book time weekly → WIP review monthly → invoice on milestone → dun at 30/45/60/90
   → close out (archive per retention policy · lessons learned · client feedback)
   → NC/CAPA + internal audit + management review feed corrections back into the loop
```

Six load-bearing facts:

1. **Everything hangs off the job number** — allocated when the LOA lands, it closes
   contract review and becomes the timesheet code and document-number root.
2. **Four-tier QMS**: quality manual → ~10 procedures → work instructions → forms;
   **filled forms are the quality records** auditors ask for.
3. **Documents are numbered by fields, revised on two tracks** (P-preliminary /
   C-contractual), and tracked in one **Master Document Register**; revision and status
   are metadata, never part of the number.
4. **Checking is a colour-coded, recorded procedure** — yellow/red check prints, comment
   resolution sheets, Drawn/Checked/Approved in the title block — not a vibe.
5. **The commercial cycle has fixed cadences**: timesheets Monday noon, WIP review
   monthly, invoices within days of the milestone, dunning at 30/45/60/90 days.
6. **Records are kept for the liability window** — statute of repose + margin (6–15
   years) — and destruction stops dead on threat of litigation.

---

## 1. The QMS document hierarchy (ISO 9001 in a consultancy)

Four tiers, universal (e.g. GKW Consult's published quality manual):

1. **Quality Manual** — policy, scope, process map, org chart (retained even though
   ISO 9001:2015 no longer mandates it).
2. **Procedures** (QP-xx) — who/what/when per process.
3. **Work instructions** (WI-xx) — step detail ("CAD layer standards", "compiling a transmittal").
4. **Forms/registers** (F-xx) — controlled blanks; **filled-in forms become records**.

A design consultancy typically maintains ~10 procedures:

| Code | Procedure |
| --- | --- |
| QP-01 | Control of documents & data (incl. drawings/CAD) |
| QP-02 | Control of records |
| QP-03 | Design & development control (ISO 9001 §8.3) |
| QP-04 | Project planning & execution (per-project quality plan) |
| QP-05 | Nonconformity & corrective action (NC/CAPA) |
| QP-06 | Internal audit |
| QP-07 | Management review |
| QP-08 | Training & competence |
| QP-09 | Purchasing / sub-consultant control |
| QP-10 | Client feedback / complaints |

Every project additionally gets a **Project Execution Plan / Project Quality Plan**
(scope, deliverables list, org chart, checking regime, programme, risk register,
communication plan; BIM projects add a BEP).

## 2. Intake & engagement setup SOP

1. **Enquiry registration** — same-day entry in an **Enquiry Register**
   (e.g. `EJ/23/005`); verbal enquiries captured on a form first.
2. **Go/no-go review** — a standing panel scores client history, strategic fit, win
   probability, resources, profitability, risk, licensure; outcome recorded on a
   **go/no-go scorecard** (~80% of AEC firms run this gate).
3. **Proposal** — prepared, reviewed by a second principal, filed in the quote file.
4. **Contract review (ISO 9001 §8.2.3)** — before signature: requirements defined
   (incl. unstated + statutory), proposal-vs-contract differences resolved, capability
   confirmed, conflict-of-interest checked; evidenced by a signed **contract review
   checklist**.
5. **Job number allocation** — on LOA, the enquiry transfers to the **Job Register** and
   gets a **project number** (e.g. `24-037`); this formally closes contract review and
   becomes the timesheet booking code + document-number root.
6. **Setup week** — standard folder tree (Admin/Correspondence/Calcs/Drawings/In/Out/
   Financial/QA), write the PEP/PQP, **internal kickoff** (plan, budget-hours, open
   questions), then **client kickoff** (contacts, decision protocol, meeting cadence,
   invoicing arrangements).

## 3. Document control SOP

- **Numbering** (ISO 19650-2 UK NA field-based):
  `Project–Originator–Functional–Spatial–Type–Discipline–Number`, e.g.
  `PRJ1-HCW-ZZ-01-DR-S-2001` (Type: DR drawing · RP report · CA calculation · SP spec ·
  SH schedule; Discipline: S structural · M mechanical · E electrical…).
  **Revision and status are metadata, never part of the number.**
- **Revisions, two tracks**: WIP `P01.01, P01.02…` → preliminary shares `P01, P02…` →
  **contractual `C01, C02…`** (legacy: numeric preliminary vs alpha A/B/C contractual).
- **Master Document Register (MDR)** — one row per deliverable: number, title,
  discipline, planned/actual dates, current revision, status code, transmittal ref,
  client doc number. Created at kickoff from the deliverables list; the single source
  of truth auditors read.
- **Transmittals** — every issue carries a form (recipients, docs+revisions, format,
  **reason for issue**), signed by an authorised person, acknowledged by the receiver,
  logged in a **Transmittal Register**, back-referenced in the MDR.
- **Superseded handling** — stamped/moved to a `Superseded` store; one master copy kept
  for traceability; a **document controller** distributes per a **distribution matrix**.
- Registers maintained: Drawing · Transmittal · Design Review · Design Change Request ·
  RFI/TQ · MDR.

## 4. Design checking SOP (the procedure behind the chain)

Four gates, author ≠ checker ≠ approver:

1. **Self-check** — signed/dated; unsigned documents rejected downstream.
2. **Interdisciplinary check (IDC / squad check)** — circulated to all affected
   disciplines; the originating discipline consolidates and rules on each comment
   (BIM-era equivalent: the end-of-stage ICE meeting with a numbered action list).
3. **Independent check** — a competent person not involved in production; rigour scales
   with risk (the Cat 0–3 ladder of the operating-model case study).
4. **Approval** — *not a second full check*: the approver confirms an effective check
   happened and signs. Title block carries **Drawn / Checked / Approved** + dates.

Procedural artifacts:
- **Check prints**: **yellow** = checked correct · **red** = wrong, corrected ·
  **green** = correction made by drafter · **blue** = checker's back-check. The marked
  print is retained as a quality record with a signed checklist.
- **Comment Resolution Sheet (CRS)** per submission: comment ID, reviewer, text,
  response, Open/Closed, and an overall code (**1** approved · **2** approved with
  comments · **3** revise & resubmit · **4** for information). No revision closes until
  every CRS line closes.
- **Design changes (§8.3.6)**: a Design Change Request, impact-reviewed and authorised
  *before* implementation, then re-issued through the same chain at the next revision.

## 5. Deliverable issue SOP

- **Status codes** (ISO 19650-2 UK NA): S0 WIP (never leaves the team) · S1
  coordination · S2 information · S3 review & comment · S4 review & authorisation ·
  S5 client acceptance · **A1…An published/contractual** (A6 = as-constructed) ·
  B-codes ("with comments") discouraged. Plain-language equivalents: For Information /
  For Review / For Approval / For Construction / As Built.
- **Workflow**: pre-issue **squad-check checklist** (title block, revision,
  cross-references, IDC closed) → check–review–approve gate → task-team manager moves
  WIP→Shared → **only nominated authorisers publish at C-revisions** → MDR updated.
- **Channel rule**: *information is issued through the CDE, notified by email — never
  issued by email*; where email is contractually unavoidable it replicates the
  transmittal procedure.

## 6. Communication SOP

- **Single point of contact**: the PM is the sole formal channel; anything touching
  scope, cost, or programme is confirmed in writing through the PM.
- **Minutes of meeting**: drafted by the consultant PM, issued **within 24–48 h**,
  numbered sequentially, rolling action log (item/owner/due) carried until closed;
  standard clause: **deemed accepted unless written objection within 7–14 days**.
- **Correspondence control**: sequential letter registers (in/out); numbering fixed at
  project initiation.
- **RFI/TQ SLA**: contractual turnaround typically **5–14 working days** (usually
  7–10); the register's date-in/date-due/date-answered columns are the SLA tracker and
  the dispute record.
- **Escalation ladder**: PM → project director → managing director; claims notices go
  straight to principal level.

## 7. Site visit SOP

- Visits per contracted cadence (monthly minimum in construction; weekly at critical
  stages); pre-visit: previous report's open items, current revisions, open RFIs.
- **Report** (AIA **G711 field report** is the canonical form): report number, date,
  **weather**, personnel/trades present, work in progress + %, observations (each with
  location, priority, responsible party, action), nonconformances, status of previous
  items, instructions given, time-stamped photos, next visit date. Issued within
  **2–3 working days**.
- **Language discipline**: record facts; "**observe**", never "inspect/supervise" — the
  report documents *general conformance* (the liability line from the operating-model
  case study §4.2).
- **Safety**: contractor induction, PPE, visitor log, lone-working notification.

## 8. Timesheet → WIP → invoice SOP

- **Timesheets**: entry daily (best practice) or weekly; hard deadline **Monday noon
  for the prior week**; booked to job number + task code; PM approval weekly.
- **WIP review**: **monthly**, PMs + finance, right after cut-off: bill / hold /
  write-off per project; budget-vs-spent hours checked.
- **Invoicing**: monthly for time-charge; **milestone invoices issued as soon as the
  milestone is billable** (don't wait for month-end); PM review within 1–2 business
  days; principal sign-off above thresholds; statuses Draft → Approved → Issued → Paid.
- **Dunning ladder**: reminder at **15–30 days** past due → phone call at **45** →
  escalation decision at **60** (payment plan / suspend services / refer) → formal
  demand letter by **60–90**. Suspension exercised per the appointment clause with
  written notice; **write-offs need principal approval**, recorded with reason.

## 9. Resourcing + closeout SOPs

- **Resource meeting** weekly/fortnightly: rolling 4–8-week staffing forecast
  (committed + probability-weighted pipeline vs capacity); firms doing this weekly
  report utilisation gains (72%→87% case). Sub-consultants come from an **approved
  register** (competence, PI insurance, references), engaged back-to-back.
- **Closeout**: record set compiled (contract+amendments, final issues, registers,
  field reports, certificates) → **retention per policy: statute of repose + 2–3
  years** (repose 6–15 years by jurisdiction; ~90% of claims arrive within 5 years) →
  **litigation hold suspends destruction instantly** → final invoice + retention
  release → job code closed to time → **lessons-learned register** (feeds go/no-go and
  fee benchmarks) → client feedback survey (an ISO 9001 §9.1.2 input) → archive.
- **NC/CAPA + audit + management review** close the loop: an NC register (mostly
  post-issue drawing errors, missed gates, doc-control lapses), root-cause + later
  effectiveness check, 1–2 internal audits/year risk-weighted toward design and
  document control, and an annual management review with fixed inputs/outputs, minuted
  with tracked actions.

---

## 10. Product mapping — AORMS-Consultancy vs the SOPs

| SOP element | Status | In AORMS-Consultancy today / gap |
| --- | --- | --- |
| Job number as the spine | ✅ | Job codes auto-allocated at creation (C-YY-serial, backfilled); shown across the workspace *(2026-07-12)* |
| Enquiry register + go/no-go | ✅ | `esti_cons_enquiry` register (`EQ-YY-NNN`); scorecard + conflict check gate GO/NO_GO; convert allocates job `C-YY-NNN` and opens engagement *(2026-07-21)* |
| Contract review checkpoint | ✅ | §8.2.3 checklist on engagement (`esti_cons_contract_review`); APPROVED gated on all four boxes *(2026-07-21)* |
| PEP/PQP at setup | 🔶 | Typed scope phases + brief cover much of it; no formal per-engagement quality plan |
| Field-based doc numbering | ✅ | MDR `{job}-{TYPE}-{seq}` (e.g. `C-26-001-CAL-001`); doc type on create; revision/status stay metadata *(2026-07-21)* |
| Two-track revisions (P/C) | ✅ | P01/C01 convention; new deliverables default P01; **Start revision** bumps the track and resets the sign-off chain *(2026-07-12)* |
| Master Document Register | ✅ | The deliverable register (per engagement) with status + issue metadata |
| Transmittals + acknowledgment | ✅ | Studio `transmittals` carry one-way receiver ack (staff or client portal); issued consultancy deliverables can **Record issue transmittal** (requires linked Studio project) and show TRN ref + ack on the MDR *(2026-07-21)* |
| Self-check → IDC → check → approve | 🔶 | CHECK/APPROVE/VERIFY chain enforced (checker ≠ author); **no IDC/squad-check step or check-print/CRS records** |
| Comment resolution sheet | ✅ | Reviewer comments per deliverable+revision; response required to close; **open lines block issue** *(2026-07-12)* |
| Status codes on issue | 🔶 | FI/FA/FC issue classes; not the full S1–S4/A-code ladder |
| MoM procedure | ✅ | Engagement MoM register (`esti_cons_mom`, MOM-NNN); draft → issued *(2026-07-21)* |
| RFI/TQ register + SLA | ✅ | Due date on raise (default +14d); register flags overdue in red *(2026-07-12)* |
| Site visit reports (G711-style) | ✅ | Numbered field reports per engagement: weather, personnel, work observed, observations, NCs, instructions, next visit; author snapshotted *(2026-07-12)* |
| Timesheets weekly + approval | ✅ | SUBMITTED→APPROVED, named approver, approve-all per engagement *(2026-07-12)* |
| Monthly WIP review | ✅ | Bill / hold / write-off decisions recorded on `esti_cons_wip_review` (fees:manage); live WIP still in analytics *(2026-07-21)* |
| Milestone invoicing | ✅ | BILLABLE on issue → **Raise Studio invoice** (ISSUED tax doc + PDF) → PAID syncs linked `esti_invoice`; payment terms + overdue on the fee position *(2026-07-21)* |
| Dunning ladder | ✅ | Payment terms on invoicing (default 30d); overdue days flagged red; outstanding tracked on the fee position *(2026-07-12)* |
| Resource forecast meeting | 🔲 | Capacity per grade exists (utilisation); no forward staffing forecast |
| Retention policy + litigation hold | ✅ | `litigation_hold` + retention note on engagement (thin hold flag; archival destruction policy still ops) *(2026-07-21)* |
| Lessons learned + client feedback | ✅ | Lessons register (`esti_cons_lesson` draft→published); client feedback still informal *(2026-07-21)* |
| NC/CAPA register | ✅ | NC register with severity + CAPA close (`esti_cons_nc`) *(2026-07-21)* |
| Internal audit / management review | 🔲 | Out of app scope for now (the registers above are their evidence base) |

**Reading of the map:** the *governance core* the SOPs exist to protect — the register,
the named chain, gated issue, stage billing, WIP, closeout — is built. Remaining
optional slices: **resource forecast**, formal PEP/PQP, IDC step. Human gates outside
the app: **P9.V** fee UX review, **P4.8** marketing rewrite, **P9.M** launch.
(Document numbering, two-track revisions, TQ due-dates, timesheet approval, CRS,
field reports, **transmittal acknowledgment**, **milestone Studio invoices**,
**enquiry go/no-go**, and **SOP closeout registers** are already in.)

---

## Sources

**QMS & procedures** — [GKW Consult — published QM manual (PDF)](https://www.gkw-consult.com/fileadmin/LGKW/downloads/QM_Manual.pdf) ·
[iso-9001-checklist — quality manual](https://www.iso-9001-checklist.co.uk/quality-manual.htm) ·
[FIDIC — ISO 9001:2015 interpretation for consulting engineers](https://jusmundi.com/en/document/publication/en-3-interpretation-of-iso-9001-2015-requirements-for-the-consulting-engineering-industry)

**Document control** — [BIMicon — ISO 19650 naming](https://www.bimicon.com/bim-naming-convention-based-on-iso19650-part1/) ·
[CDBB — National Annex guidance (PDF)](https://www.cdbb.cam.ac.uk/files/national_annex_guidance.pdf) ·
[UK BIM Framework — Guidance Part 2 (PDF)](https://ukbimframework.org/wp-content/uploads/2019/11/ISO-19650-Guidance-Part-2-Single-Page-Print.pdf) ·
[Consepsys — Master Deliverable Register](https://www.consepsys.com/2016/07/06/master-deliverable-register-mdr-following-up-project-documents/) ·
[MethodStatementHQ — engineering document control procedure](https://methodstatementhq.com/control-of-engineering-documents-procedure-for-quality-management-system.html)

**Checking & issue** — [Designing Buildings — checking & approval in design](https://www.designingbuildings.co.uk/wiki/Checking_and_approval_in_design_-_a_quality_management_perspective) ·
[BIM Corner — interdisciplinary control](https://bimcorner.com/interdisciplinary-control-in-a-design-team/) ·
[PIRS — comment review sheet](https://pirs-manual.sobis.com/manual/PIRS/3Correspondence%26Documents%26Events/3.2Documents/3.2.11comment-review-sheet-crs.html) ·
[Man and Machine — ISO 19650-2 NA status codes](https://www.manandmachine.co.uk/understanding-status-codes-bs-en-iso-19650-2-national-annex-a/) ·
[BibLus — CDE document workflow](https://biblus.accasoftware.com/en/document-workflow-in-cde-how-files-drive-iso-19650-processes/)

**Intake & commercial** — [Pretesh Biswas — contract review procedure example](https://preteshbiswas.com/2023/05/30/example-for-procedure-for-contract-review/) ·
[ACEC — go/no-go procedures](https://www.acec.org/course/go-no-go-procedures-and-project-evaluation/) ·
[OpenAsset — go/no-go process](https://openasset.com/resources/how-to-establish-and-strengthen-your-go-no-go-process/) ·
[Layer — project kickoff guide](https://layer.team/blog/the-architect-s-guide-to-project-kickoff) ·
[Base Builders — expediting A/E billings](https://www.basebuilders.com/best-practices/expediting-billings) ·
[TimeRewards — timesheet best practices](https://www.timerewards.com/professional-services-time-tracking/) ·
[Reach CPA — 2-hour month-end close](https://www.reachcpa.ca/post/the-2-hour-month-end-close) ·
[Gaviti — AR escalation](https://gaviti.com/when-to-send-unpaid-invoices-to-collections/)

**Communication, site, closeout** — [Mastt — project meetings (minutes cadence)](https://www.mastt.com/guide/project-meeting) ·
[Law Insider — minutes deemed-approved clauses](https://www.lawinsider.com/clause/meeting-minutes) ·
[Mastt — RFI turnaround](https://www.mastt.com/guide/rfi-construction) ·
[AIA — G711 field report](https://help.aiacontracts.com/hc/en-us/articles/1500009443782-summary-g711-2018-architect-s-field-report) ·
[Deltek ArchiSnapper — field report template](https://www.deltek.com/en/architecture-and-engineering/archisnapper/field-report/template) ·
[NSPE — document retention white paper (PDF)](https://www.nspe.org/sites/default/files/resources/pdfs/liability/White%20Paper-060916DocumentRetentionDocument-FINAL.pdf) ·
[Professional Underwriters — records retention for A/E](https://www.profunderwriters.com/records-retention-for-architects-and-engineers/) ·
[STRUCTURE — how long to keep records](https://www.structuremag.org/article/how-long-do-i-need-to-keep-my-records/) ·
[Aderant — consulting resource allocation](https://vibyaderant.com/2022/07/04/7-staffing-and-resource-allocation-best-practices-for-consulting-firms-in-a-hybrid-world/) ·
[Teamwork — project closure checklist](https://www.teamwork.com/blog/project-closure/)

*Caveats: ISO 19650 status-code tables differ between the 2018 and 2021 UK NA editions
(S5–S7, B/D/CR changed); retention/repose figures cited are US-state ranges — Indian
practice anchors on the Limitation Act + RERA's 5-year structural defect liability
(see the operating-model case study §6.7).*
