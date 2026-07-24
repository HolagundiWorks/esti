# AORMS-Consultancy — how engineering consultancy firms operate (grounded case study)

> **Status:** Research-grounded case study (2026-07-12; status note 2026-07-22) for the
> **AORMS-Consultancy** engineering app (structural, MEP, civil, multidisciplinary) —
> product is **code-complete**; launch gated on P9.V / P9.M.
> **Method:** synthesised from industry sources (IStructE, RIBA, FIDIC, CEAI, Council of
> Architecture, NSPE/ASCE, ISO 19650, HSE CDM, Indian municipal/RERA/NBC material) — see
> **Sources** at the end. Every non-obvious claim is citable.
>
> **Reads with:** the procedural layer (QMS, document control, checking workflow, intake,
> timesheet→invoice cycle, closeout SOPs) in
> [`AORMS-CONSULTANCY-SOP-CASE-STUDY.md`](AORMS-CONSULTANCY-SOP-CASE-STUDY.md); philosophy in
> [`AORMS-CONSULTING-FRAMEWORKS.md`](AORMS-CONSULTING-FRAMEWORKS.md) · the system design
> in [`AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md`](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md).
> This document is the **evidence base** those two rest on.

---

## 0. Executive summary — the six load-bearing facts

1. **The firm sells reliance, not drawings.** Its product is a *signed, checked* set of
   calculations, drawings and reports that others (architect, client, lender, authority)
   rely on. The whole operating model exists to make that reliance **defensible**.
2. **Authority is delegated down; sign-off responsibility stays up.** A graduate's calcs
   are always checked by a senior and signed by a chartered/registered principal — the
   **Engineer of Record**.
3. **Checking rigour scales with consequence.** A formal category system (Cat 0→3, tied to
   Eurocode Consequence Classes) sets *how independent* the check must be — up to external
   third-party recalculation for high-consequence structures.
4. **Everything is issued as a status-coded package, never a loose file.** ISO 19650
   suitability codes (S1–S4 work-in-progress, A = "for construction") state what a document
   is *fit to be used for* right now.
5. **Fee is professional service, structured a few ways** (%-of-cost, lump, time-charge,
   milestone) and measured by **utilisation / realisation / WIP** — the health metrics of a
   consultancy.
6. **Risk is the reason the QA chain exists.** PI insurance, duty of care, liability caps,
   reliance letters, and the checking regime are one connected defence — and in India the
   **structural stability certificate** puts named statutory liability on a registered engineer.

---

## 1. What an engineering consultancy is (and is not)

An engineering consultancy sells **calculation-backed advice and peer-reviewed
deliverables**. It **advises and designs; it does not build**, and is usually **nested under
an architect or developer**, rarely the prime consultant, never the contractor.

**Disciplines:** structural; MEP / building services (which itself splits into
**Mechanical/HVAC, Electrical incl. ELV, and Plumbing + Fire Protection**, each with a
discipline lead); civil/infrastructure; geotechnical; specialist (façade, acoustics, fire,
sustainability); or **multidisciplinary** (several under one appointment).

**Out of scope for the firm — and therefore the app:** contractor execution, fabrication
management, construction PM, procurement of works. Same boundary AORMS-Studio holds:
*advise; do not deliver.*

**India statutory grounding.** Unlike architecture (single statutory body — the **Council of
Architecture**), consulting engineering in India has **no single national licence**.
Competence is gated **per municipality**: a **Registered Structural Engineer (RSE)** —
a Civil Engineer who is a corporate member of the **Institution of Engineers (India)** with
**≥5 years' structural-design experience (3 if postgraduate-qualified)** — is **empanelled
on the local corporation's rolls** and is the only person who may sign and submit structural
designs and the **structural stability certificate** for a building permit. Voluntary
accreditation exists via **IAStructE (Chartered Structural Engineer)** and **CEAI**; a
formal national licensing regime has been lobbied for (ISSE) but does **not** yet exist.

---

## 2. Organizational hierarchy

Firms are organised by **grade** (professional seniority) × **discipline** × **function**.
The distinguishing variable at each grade is **design authority** — who may originate,
check, approve, and sign.

### 2.1 The delivery ladder (UK/Commonwealth/India convention)

| Grade | Yrs (typical) | What they do | Authority on a deliverable |
| --- | --- | --- | --- |
| **Graduate / Assistant Engineer** | 0–4 | Calcs, modelling/drafting, markups, site-visit support — under supervision | Originate under supervision; **may not self-approve** |
| **Engineer** | 3–6 | Designs discrete elements / moderate projects; often the point of **chartership (CEng/MIStructE)**, ~4–5 yrs supervised + professional review | Originate |
| **Senior Engineer** | 6–10 (chartered) | Runs projects, budgets/schedules, **checks juniors' work**, client-facing | Originate lead + **independent checker** |
| **Principal Engineer** | 10+ | Technical lead on complex projects, specialism, proposals | Check / approve defined areas |
| **Associate** | — | First leadership rung — technical authority + BD + team lead | Approve smaller works |
| **Associate Director** | — | Rising into director scope; **holds approval authority** over defined areas | Approve / sign |
| **Technical Director / Director** | — | Discipline "technical authority"; owns quality + **final engineering sign-off** | Approve / sign; **Engineer of Record** |
| **Partner / Principal (owner)** | — | Firm ownership; ultimate accountability, carries PI liability | Final approval / EoR |

The US equivalent is a numeric grade system (ASCE Grade I–VIII). **Load-bearing point:**
*authority is delegated downward but sign-off responsibility stays at the top.*

### 2.2 Team composition — a pyramid weighted toward production

Every deliverable moves through an **Author → Checker → Approver gate** tracked in the CDE.
A project team therefore layers **delivery grades** (produce) · **checkers** (independent
verification — a distinct role, usually senior/principal) · **BIM/CAD** (technicians + a
**BIM Coordinator** owning the model, naming, LOD, clash — often the largest headcount
block) · **QA / document control** (enforces the BIM Execution Plan and the
Author-Checker-Approver workflow) · **project managers** (budget/schedule/client) ·
**commercial/bid** · **admin**.

> **Concrete India example** — *S.P.A. Consultants*: **3 associates : 4 design engineers :
> 17 CAD engineers** (≈ 1 leader : 7 producers, CAD-heavy). Practitioners cite **80–150
> staff** as the size band with the best balance of project variety and resource depth.

### 2.3 Multidisciplinary coordination models

Three canonical shapes: **matrix** (PMs sit outside disciplines; **discipline head owns
technical quality + staffing, PM owns budget/programme/client** — dual reporting is the
weakness); **hybrid** (PM sits inside the lead discipline); **market-based** (organised by
client sector under a "super PM"). Coordination across disciplines runs through **BIM
clash detection** in a shared federated model before construction.

### 2.4 Small (<10) vs large (50+)

Small practices make engineers **generalists** (broad exposure, thin checking depth, the
same senior wears PM + checker + BD hats — the Author-Checker-Approver chain compresses into
2–3 people). Large firms have **separate named roles** for delivery, checking, BIM, QA/doc
control, PM and commercial, with deep specialists and formal QA — but narrower individual
scope. **The app must degrade gracefully across this whole range.**

---

## 3. Chain of command — the sign-off chain

The firm's liability is defended by a **named, serial sign-off chain**. Informal approval
(a WhatsApp "looks fine") is **not an issue** and carries no defensible record.

### 3.1 The four-eyes principle and the four states

**Four-eyes / maker-checker:** one person prepares work, a **separate independent person**
reviews and approves it. Three roles: **Originator/Maker** creates · **Checker**
independently verifies · **Approver/Authoriser** signs. *The checker must never be the
author* — objectivity guards against both honest error and concealment (the same
segregation-of-duties logic as ISO 27001 Control 5.3).

```
   ORIGINATE  ──►  CHECK  ──►  APPROVE (sign) ──►  [VERIFY]  ──►  ISSUE
   author         independent    Principal/Dir      external/     doc control,
                  (≠ author)     = Engineer of      proof check    status-coded
                                 Record (liability)  (high cat)     transmittal
```

### 3.2 Design check categories (BS 5975 / IStructE; Eurocode consequence classes)

Category scales **check rigour and checker independence with consequence**:

| Category | Scope | Independence of check |
| --- | --- | --- |
| **Cat 0** | Standard/proprietary solutions already established | Verify the standard suits actual conditions |
| **Cat 1** | Simple designs, standard methods | **Another competent person in the same organisation** (peer review) |
| **Cat 2** | More complex structures/loading | **Independent of the original designer** (may be same firm) |
| **Cat 3** | Complex/unusual/innovative, or failure has significant consequences (e.g. bridges) | **Independent third-party check, often full recalculation** |

*"The higher the category, the greater the independence required."* This maps to
**Eurocode EN 1990 Consequence Classes CC1/CC2/CC3** and their Reliability Classes, Design
Supervision Levels (DSL1–3) and Inspection Levels (IL1–3): **CC3** (many lives lost on
collapse — grandstands, congregation buildings) demands the highest supervision +
**third-party verification**. **Design implication:** the app should let a firm set a
required category per deliverable and **block issue until the matching chain is complete.**

### 3.3 Engineer of Record (the signing act)

The signer is the engineer in **"responsible charge" — direct control and personal
supervision** of the work. The seal/signature is a **legal representation that the work was
prepared under their responsible charge, performed competently, and meets the professional
standard of care**; it places responsibility for the document's content — and liability for
its deficiencies — on that named person. Proof checking for the highest category is an
**independent third-party recalculation**, evidenced via design & check certificates.

### 3.4 Document status / suitability codes (ISO 19650-2, UK NA 2021)

A container's status states **what it is fit to be used for** right now:

| Code | Meaning |
| --- | --- |
| **S0** | Initial WIP (author only) |
| **S1** | Suitable for **coordination** |
| **S2** | Suitable for **information** |
| **S3** | Suitable for **review & comment** |
| **S4** | Suitable for **stage approval** |
| **A1, A2…** | **Authorised & accepted** — contractual issue (e.g. **"For Construction"**) |
| **B1, B2…** | Published **with comments** / partial sign-off |

Legacy plain-language equivalents: *For Information / For Approval / For Construction*.
The **Master Document Register (MDR)** is the single controlled index of every deliverable
(number, title, current revision, status, issue history); **transmittals** are the recorded,
purpose-stated issue to a recipient — the audit trail of information exchange.

### 3.5 India statutory sign-off

The **structural stability certificate** — issued only by a registered/empanelled structural
engineer after analysis — confirms the building is **safe, stable, fit for use** and
compliant with **BIS/IS codes and NBC Part 6 (Structural Design)**. It's submitted at
**building-permit approval** (and toward occupancy). Under **RERA 2016**, projects **>500 m²
or >8 apartments** must obtain one from a registered structural engineer before registration.
Many local bodies additionally require **independent proof-checking by an empanelled proof
engineer** for tall/high-consequence buildings (the Indian parallel to Cat 3). **IEI's
Chartered Engineer** credential underpins RSE registration and empanelment.

---

## 4. Project lifecycle & workflow

Engagements move through **work stages**. Internationally these follow the **RIBA Plan of
Work 2020 (stages 0–7)**; IStructE's parallel **Structural Plan of Work 2020** maps
stage-for-stage and adds a **Stage 4.5** for specialist/production design. In India,
engineering stages **shadow the architect's Council of Architecture (COA) stages** because
engineers are sub-appointed.

### 4.1 Stages, the engineer's work, and billing triggers

| RIBA (intl) | Engineer's work | Key deliverable | Billing trigger (typical) |
| --- | --- | --- | --- |
| **0 Strategic Definition** | Limited technical advice on the business case | — | — (bid) |
| **1 Preparation & Briefing** | Scope & responsibilities agreed; surveys (ground, UXO, services) | Brief / appointment | Mobilisation / advance |
| **2 Concept Design** | Sketch grids, scheme options, indicative sizing, design basis | Concept report + sketches | Stage % |
| **3 Spatial Coordination** | Coordinate structure with other disciplines; model + calcs; optimise | Scheme calcs + **GA drawings** | Stage % |
| **4 Technical Design** (+**4.5**) | Full coordinated design; details, specs, schedules (4.5 = connection/production design) | Detailed **calc set** + drawings + spec | Stage % (largest) |
| **5 Manufacturing & Construction** | Answer RFIs/TQs, review submittals, inspect; to Practical Completion | **IFC/GFC** issue | Stage % on issue + time |
| **6 Handover** | Practical Completion → end of defects period | Completion certificate, as-builts | Final % / retention |
| **7 Use** | Concurrent, minimal input | — | — |

**India COA stages** (engineer sub-appointed, formally engaged ~Stage 5 Working Drawings):
1 Brief → 2 Concept → 3 Preliminary → 4 Approvals → 5 Working drawings & tender → 6
Contractor appointment → 7 Construction. The architect **directs and integrates** the
consultants' work but the **consultants remain fully responsible for their own calculations,
detailed design, and periodic inspection**; the architect issues the completion certificate.

### 4.2 Cross-cutting flows (run through every stage)

- **RFI / Technical Query (TQ)** — a formal written question to interpret documents
  **without changing scope**, logged in a register with dated dispatch / response-required /
  response-received fields, related-document refs, potential time/cost impact, and
  **close-out evidence** (the dated trail is the dispute evidence). A TQ that *expands* scope
  becomes a **variation** (billable — §5.4).
- **Submittal / shop-drawing review** — four stamp dispositions: **Approved** ·
  **Approved as Noted** (conditioned on the comments) · **Revise and Resubmit** (*not* an
  approval) · **Rejected**. The stamp is a **focal point in liability disputes** — juries
  read "Approved" broadly, and softer words like "Reviewed" do **not** reliably reduce
  liability (established in the *Hyatt Regency Kansas City* walkway-collapse litigation).
- **Coordination & hold points** — discipline models merge into a **federated model** in the
  CDE; **clash detection** classifies **Critical / Major / Minor**; the **BIM Execution Plan**
  writes in mandatory hold points — a gate isn't cleared until clashes above an agreed
  severity are resolved.
- **Variations / change management** — client scope change and **code updates during design**
  are chargeable additional services; **design-team errors are not**. Distinguish routine
  *design development* (absorbed) from a true *variation* (contract amendment before proceeding).
- **Site observation (not supervision)** — the consulting engineer does **periodic
  observation** to judge **general conformance** with the contract documents; it is *not*
  exhaustive or continuous, and **responsibility for means, methods and workmanship stays
  with the contractor**. This "observation vs supervision" wording is a deliberate
  **liability line**. Construction support = interval site visits, RFI/TQ response, submittal
  review, witnessing mock-ups/tests/commissioning, valuation inspections, and inspection
  before certifying Practical Completion — **not** directing the contractor's labour or
  programme.

**Operating rule:** a deliverable is **issued as a status-coded package with a stated
purpose**, and **downstream reliance is explicit** on every transmittal.

---

## 5. What gets billed (the commercial engine)

### 5.1 Fee models (mixed in practice)

%-of-construction-cost · lump sum · **time-charge (rate × hours by grade)** · milestone/stage
· retainer · cost-plus · **reimbursables/disbursables** (travel, prints, statutory fees — at
cost, *on top of* fee, excluded from "net revenue"). A single appointment routinely mixes
models by stage — e.g. **time-charge for feasibility, then %-of-cost or lump sum for design**.
FIDIC's White Book supports time-based, lump-sum and percentage methods within one agreement.

### 5.2 India fee scales (public proxies)

| Work | Fee (% of construction cost) |
| --- | --- |
| Structural — simple residential (G+1–G+2) | **0.5–0.75%** |
| Structural — medium (G+3–G+5) | **0.75–1.25%** |
| Structural — high-rise (G+6+) | **1.25–2%** |
| Structural — special/complex | **1.5–2.5%** (seismic/tall +20–40%) |
| Structural (industry, NBM) | **0.2–1%** by magnitude/complexity/stage |
| Architect (CoA statutory) | **min 7.5%** residential; **3–15%** by complexity |

**CEAI** (India's FIDIC member) publishes the **Client/Consultant Model Services Agreement
(2017 White Book)** as the standard appointment instrument; exact fee tables are
members-only. **CPWD** levies consultancy fees via its published SOP.

### 5.3 Financial-health metrics (A&E benchmarks)

| Metric | Formula | Benchmark |
| --- | --- | --- |
| **Utilisation** | Billable ÷ available hrs | ~67% avg (firm-wide 58–65%; technical 60–70%; principals 35–50%) |
| **Realisation** | Billed ÷ billable work value | ~87% (architecture ~91%); high perf ≥90% |
| **Net multiplier** | Net revenue ÷ direct labour | 2.75–3.25; high perf ≥3.3 |
| **Overhead rate** | Indirect cost ÷ direct labour | 150–175% (smaller firms 170–200%) |
| **Project margin** | (Net rev − project cost) ÷ net rev | ~21% avg (13–32%) |
| **DSO** | (AR ÷ credit sales) × 365 | ~57 days; high perf ≤45 |
| **WIP** | Billable value performed **not yet invoiced** | tracked vs milestone/percent-complete |

Rate cards are set **per grade** (hourly salary cost × net multiplier). **Utilisation and
realisation are the two north-star health metrics of a consultancy.**

### 5.4 Stage billing, revenue recognition, variations

Fee splits by stage and invoices **on deliverable issue** (RIBA-style ≈ 30–35% to
concept/planning, 35–40% technical design, ~30% construction/handover). **Ind AS 115 /
IFRS 15** recognises revenue over time by an **input method (cost-to-cost / percent-complete)**
or **output method (milestones)** — cost-to-cost suits continuous design, milestones suit
staged infrastructure. **Variations / additional services** (AIA B101: services identified
after execution, not design-team fault) earn **additional fee + schedule extension**, billed
time-charge or renegotiated.

### 5.5 India tax & payment overlay

- **GST 18%** — SAC **998332** (engineering services for building projects) / **998333**
  (industrial & manufacturing projects), under heading **9983**.
- **TDS §194J** — **10% professional / 2% technical**, threshold **₹50,000/yr**, **20% if no
  PAN**.
- **Retention** — historically 10%, now commonly **5%**; released in stages, balance after
  the **Defects Liability Period** (typically 12 months); appears mostly in EPC/PMC
  engagements. Reuses the platform's India money spine (**paise**, `formatINR`, GST/SAC/TDS
  from the `profile` config) exactly as AORMS-Studio does.

---

## 6. Risk framework

Risk is *why* the QA/sign-off chain exists. Six connected layers:

### 6.1 Professional Indemnity (PI) insurance

**Claims-made** — responds to claims *first made during the policy period* regardless of when
the error occurred (subject to a **retroactive date**), so cover must be **continuously
renewed** or old work is left uninsured. **Limit of indemnity** is "each and every claim" or
"in the aggregate" (an **aggregation clause** decides whether related errors are one claim or
many). **Run-off cover** answers claims after a firm ceases trading / a principal retires —
typically carried **~6 years**, aligned to limitation periods.

### 6.2 Duty of care — the standard

Absent contrary terms, the engineer owes **reasonable skill and care** — judged against *what
a reasonably competent member of the profession would do*, **not perfection and not
hindsight**. Critical distinction: **reasonable skill and care vs. fitness for purpose** —
fitness-for-purpose is an absolute result guarantee, more onerous and **typically excluded
from PI cover**, so appointments should tie the obligation explicitly to reasonable skill and
care.

### 6.3 Limitation of liability (appointment clauses)

- **Liability cap** — capped to a sum or **multiple of fee** (keep coherent with the PI limit,
  or a disproportionately low cap risks being struck down).
- **Exclusion of consequential/indirect loss** — caps the *category* of recoverable loss.
- **Net Contribution Clause (NCC)** — converts **joint-and-several into proportionate
  liability**: each pays only its *just and equitable* share. Default (no NCC, per the Civil
  Liability (Contribution) Act 1978) lets the client recover **100%** from one party — the NCC
  **shifts a co-defendant's insolvency risk off the consultant**.

### 6.4 Reliance / third-party reliance letters

A **reliance letter** lets a third party (lender, purchaser, another consultant) rely on a
report/design as if addressed to them — **extending the duty of care beyond the original
client** and engaging PI. Drafted with **named beneficiaries, purpose limits, disclaimers and
time limits**; a firm can only give reliance on **its own** work. Lenders often require them
as a **condition precedent to financial close** — each one is a new potential claimant.

### 6.5 Project risk register (structure)

Row per risk: **ID / description** (event + cause + effect) → **likelihood × impact** (scored
across schedule/cost/scope/quality) → **score** (priority) → **owner** → **response**
(Avoid / Reduce / Transfer / Accept) → **residual risk**. Discipline: score **inherent (before
controls) and residual (after controls)** separately — the gap shows whether controls work.
It's a *living* document.

### 6.6 Safety-in-design & the QA-as-defence link

**UK CDM 2015** makes any "designer" apply a hierarchy — **Eliminate → Reduce → Inform** —
and a **Principal Designer** coordinates pre-construction H&S. **India** has no single CDM
analogue; designer safety duties are discharged through **NBC 2016** (legally binding once
adopted into state/municipal bye-laws), the **BIS/IS codes**, and the structural-stability
regime. Technical risk is controlled by **peer review, independent checks, and standards that
exceed code minima** — and **disregarding applicable standards is itself evidence of
negligence**, so the documented checking regime *is* the evidentiary spine of a
professional-negligence defence (independent checkers are generally not liable to parties they
have no contract with — *Multiplex*).

### 6.7 India liability overlay

The structural stability certificate carries the **named engineer's professional liability**
(they must verify drawings against as-built and record non-compliance — they cannot
subjectively certify). **RERA** imposes a **5-year structural defect-liability period** from
possession on developers, flowing exposure back onto the certifying structural consultant.

---

## 7. What this means for AORMS-Consultancy (product implications)

The case study translates into a small number of **non-negotiable product truths** — these
drive the architecture in
[`AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md`](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md):

| Reality (this doc) | Product truth (the app must…) |
| --- | --- |
| Author→Checker→Approver, checker ≠ author (§3.1) | Enforce a **named serial sign-off chain** server-side; block self-approval |
| Check categories Cat 0–3 (§3.2) | Set a **required check category per deliverable** and **gate issue** until met |
| Engineer of Record signs (§3.3) | Record **who signed what, when** immutably (reuse `audit`) |
| ISO 19650 status codes + MDR + transmittals (§3.4) | Deliverables carry **revision + suitability code**; a **master register**; purpose-stated transmittals |
| Stages + billing on issue (§4.1, §5.4) | **Fee stages mapped to deliverable issue** → milestone invoicing |
| RFI/TQ with scope-impact (§4.2) | **TQ register** with closure evidence; scope-impact flag spawns a **variation** |
| Submittal stamps carry liability (§4.2) | **Stamped review** with the four dispositions recorded |
| Coordination hold points (§4.2) | **Hold-point / clash gating** between disciplines |
| Utilisation/realisation/WIP (§5.3) | **Timesheets + rate cards** → WIP / utilisation / realisation analytics |
| PI, caps, NCC, reliance (§6.1–6.4) | **Insurance (PI) tracking + reliance-letter log**; appointment terms captured |
| Risk register inherent vs residual (§6.5) | **Risk-register module** with response + residual |
| Codes enter once, validated (§6.6) | **EOMS-gated** standards/codes intake; reuse `standards`/`compliance` libraries |
| India RSE + stability certificate + RERA 5-yr (§1, §3.5, §6.7) | India statutory sign-off + **paise/GST/SAC/TDS** money spine (shared with Studio) |

**One-line thesis (matches the frameworks doc):** *reliance is engineered* — peer review,
validated inputs, and named, status-coded issue are how an engineering consultancy defends
professional duty. The app's job is to make the defensible record the **path of least
resistance**.

---

## Sources

**Organisation & grades** — [ASCE Engineering Grades](https://www.asce.org/career-growth/early-career-engineers/asce-guidelines-for-engineering-grades) ·
[IStructE Chartered Membership](https://www.istructe.org/membership/chartered-membership/) ·
[Consulting-Specifying Engineer — org structures (matrix/hybrid/market)](https://www.csemag.com/organization-structure-beyond-the-boxes/) ·
[BibLus — Author-Checker-Approver / CDE / BEP](https://biblus.accasoftware.com/en/bim-qa-qc-quality-assurance-and-quality-control-in-bim-models/) ·
[Novatr — Structural firms in India (S.P.A. composition)](https://www.novatr.com/blog/structural-engineering-firms) ·
[Surat Municipal Corp — Registered Professionals](https://www.suratmunicipal.gov.in/Departments/TownDevelopmentRegisteredProfessionals) ·
[IAStructE — Chartered Structural Engineer](https://www.iastructe.co.in/ase-iastructe-accreditation.php) ·
[ISSE — licensing advocacy](https://isse.org.in/correspondence-with-govt-dept/)

**Checking, sign-off & document control** — [Construction Magazine — BS 5975 check categories](https://www.constructionmagazine.uk/2026/02/temporary-works-design-check-categories-bs-5975-category-0-1-2-3.html) ·
[Designing Buildings — Design & Check Certificates](https://www.designingbuildings.co.uk/wiki/Design_and_Check_Certificates) ·
[ScienceDirect — Consequence Class (EN 1990)](https://www.sciencedirect.com/topics/engineering/consequence-class) ·
[NSPE — signing/sealing & responsible charge](https://www.nspe.org/career-growth/ethics/board-ethical-review-cases/signing-sealing-manufacturer-s-drawings) ·
[NY Office of Professions — seals & signatures](https://www.op.nysed.gov/professions/engineering/professional-practice/professional-seals-and-signatures) ·
[goto.archi — ISO 19650 status codes](https://goto.archi/blog/post/iso-19650-status-codes-explained) ·
[projectdesign.io — ISO 19650-2 UK NA status table](https://projectdesign.io/bs-en-iso-19650-2-uk-national-annex-na-2021-status-and-use/) ·
[Aico — Four-Eye Principle](https://aico.ai/glossary/four-eye-principle)

**India statutory** — [Godrej — Structural Stability Certificate](https://www.godrejproperties.com/blog/structure-stability-certificate) ·
[RERA Filing — Structure Stability Certificate](https://rerafiling.com/rera-article-detail.php/624/what-is-structure-stability-certificate) ·
[CEV News — Structural Safety Certificate & NBC Part VI](https://cevnews.in/2022/02/structural-safety-certificate-and-its-importance/) ·
[BIS — National Building Code 2016](https://www.bis.gov.in/standards/technical-department/national-building-code/) ·
[IEI — Chartered Engineer](https://www.ieindia.org/AdminUI/IEI-PPCEApplication.aspx)

**Lifecycle & deliverables** — [IStructE — Structural Plan of Work 2020 (PDF)](https://www.istructe.org/IStructE/media/Public/Resources/Guidance-to-structural-plan-of-work-20200701.pdf) ·
[RIBA — Plan of Work 2020 Overview (PDF)](https://www.riba.org/media/syneeeto/2020ribaplanofworkoverviewpdf.pdf) ·
[Council of Architecture — Conditions of Engagement](https://coa.gov.in/index1.php?lang=1&level=2&sublinkid=294&lid=81) ·
[FIDIC — Definition of Services Guidelines (PDF)](https://fidic.org/sites/default/files/_DOS_guide_civil_works_1.pdf) ·
[EJCDC (O'Beirne) — Submittal Review Stamps](https://ejcdc.org/shop-drawings-and-submittals-part-4-submittal-review-stamps-by-kevin-obeirne-pe/) ·
[TDOCPlus — RFIs and TQs](https://tdocplus.co.uk/wp/using-tdoc/rfis-and-tqs) ·
[BluEnt — GFC Drawings](https://www.bluentcad.com/blog/what-are-gfc-drawings) ·
[Tejjy — MEP clash detection](https://www.tejjy.com/mep-clash-detection-best-practices/) ·
[PDI — Observation vs Supervision](https://www.pdiins.com/observation-vs-supervision-a-liability-line-every-design-professional-needs-to-understand/) ·
[Architekwiki — Additional Services](https://www.architekwiki.com/wiki/additional-services)

**Fees, billing & tax** — [AECORD — Structural fees India](https://aecord.com/blog/structural-engineering-fees-india-residential) ·
[NBM&CW — Engineering design consultancy fees](https://www.nbmcw.com/article-report/others/engineering-design-consultancy-fees.html) ·
[CEAI — Client/Consultant Model Services Agreement](https://www.ceai.org.in/product/client-consultant-model-services-agreement-5th-ed-2017-white-book/) ·
[Council of Architecture — fees](https://www.coa.gov.in/index1.php?lang=1&level=2&sublinkid=299&lid=86) ·
[FIDIC — White Book 5th ed 2017](https://fidic.org/books/clientconsultant-model-services-agreement-5th-ed-2017-white-book) ·
[RIBA — How architects calculate fees](https://www.riba.org/explore/find-an-architect/homeowners-digest/how-do-architects-calculate-fees/) ·
[BQE — Engineering KPI benchmarks](https://www.bqe.com/blog/engineering-kpi-formulas-and-benchmarks-for-firms-teams-and-managers) ·
[Northstar — AE firm financial metrics](https://nstarfinance.com/resources/architecture-engineering-firm-financial-metrics) ·
[Taxmann — Ind AS 115](https://www.taxmann.com/post/blog/analysis-ind-as-115-revenue-recognition-challenges-and-solutions) ·
[IndiaFilings — GST/SAC for engineers](https://www.indiafilings.com/learn/gst-rate-sac-code-architects-engineers) ·
[FindGST — SAC 998332](https://findgst.in/saclist/9983/sac-998332) ·
[ClearTax — §194J TDS](https://cleartax.in/s/section-194j) ·
[Sihela — Retention money](https://sihelaconsultants.com/retention-money-in-construction-contracts/)

**Risk & liability** — [RICS — PI Insurance Requirements (PDF)](https://www.rics.org/content/dam/ricsglobal/documents/standards/2022_Feb_Professional_Indemnity_Insurance_Requirements_Version_9.pdf) ·
[IStructE — PI run-off risk](https://www.istructe.org/journal/volumes/volume-100-(2022)/issue-11/professional-indemnity-insurance-run-off/) ·
[FIDIC — Standard of Care (PDF)](https://fidic.org/sites/default/files/Introduction%20to%20Standard%20of%20Care.pdf) ·
[Fenwick Elliott — skill & care vs fitness for purpose](https://www.fenwickelliott.com/research-insight/annual-review/2014/understanding-design-duty) ·
[Hill Dickinson — Net Contribution Clauses](https://www.hilldickinson.com/our-view/articles/net-contribution-clauses/) ·
[Practical Law — Reliance letter: reports](https://uk.practicallaw.thomsonreuters.com/w-022-1917) ·
[PRINCE2 — Risk register](https://www.prince2.com/usa/blog/the-risk-register-what-to-include-and-what-to-avoid) ·
[HSE — CDM 2015 Designers](https://www.hse.gov.uk/construction/cdm/2015/designers.htm) ·
[Burness Paull — Design checkers' liability](https://www.burnesspaull.com/insights-and-events/news/design-checkers-liability-to-third-parties) ·
[BBAPL — Structural Stability Certificate FAQs](https://www.bbapl.in/blog/structural-stability-certificate-frequently-asked-questions/)

---

*Case study owner: platform. Figures are public proxies (CEAI/CPWD exact scales are
paywalled); update as primary sources are obtained. This grounds — but does not itself
specify — the AORMS-Consultancy build.*
