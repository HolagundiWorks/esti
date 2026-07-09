> **ARCHIVED** (2026-07-09) � Obsolete; kept for historical reference only.
> **Do not use** for implementation or onboarding.
> **Superseded by:** [PRODUCT-VISION.md](../esti/PRODUCT-VISION.md), [PLANS-AND-TIERS.md](../esti/PLANS-AND-TIERS.md). Historical tier-based market analysis.

# ESTI — Product Market Research & Viability Assessment

**Status:** Research report · **Owner:** Holagundi Consulting Works (HCW) · **Prepared:** 2026-07-02
**Method:** Multi-angle web research (5 search angles, 24 sources, 111 extracted claims) with
adversarial claim verification. Each material claim below is tagged with its evidence grade:

- **[verified]** — survived a 3-vote adversarial refutation pass (2/3 or 3/3 upheld)
- **[corroborated]** — asserted independently by two or more unrelated sources
- **[single-source]** — one source only; verification pass did not complete (infrastructure
  limits, not refutation) — treat as directionally useful, confirm before quoting externally
- **[refuted]** — actively disproven during verification; recorded so it is not re-used

---

## 1. Executive summary — the verdict

**ESTI is viable as a focused, capital-efficient vertical SaaS for Indian architecture
practices — but the evidence does not support a venture-scale, India-only thesis.** The
market is real, underserved by global tools, and painfully run on WhatsApp + Excel + Tally
today; but it is also small in paying-seat terms, dominated by solo practices, price-anchored
near ₹1,000–3,000/month by Zoho/Tally, and already contested by at least three India-built
competitors (ArchiEase, UpLabs, SAMS).

The realistic prize: **a few thousand paying studios at ₹3,000–8,000/firm/month → ₹5–25 crore
ARR at maturity** — an excellent outcome for a bootstrapped/consultancy-funded product, well
below the bar historic India-only SaaS has needed for venture returns.

What decides success is not the GST/TDS feature set (that is table stakes — Zoho Books ships
GST invoicing at ₹899/month and Tally owns compliance) but the **architecture-specific
workflow bundle**: COA fee proposals → phase/stage-linked invoicing → drawings & transmittals
register → site supervision → the one operational record. That bundle is what no horizontal
Indian tool offers and what no global A&E tool localizes.

---

## 2. Market size

### 2.1 The professional base (TAM denominator)

| Fact | Value | Grade | Source |
|---|---|---|---|
| COA is the statutory registrar of architects (Architects Act, 1972) | — | [verified] | coa.gov.in |
| Registered architects in India | ~122,769 (Jan 2026); 122,971 (mid-2023) | [corroborated] | coa.gov.in register; architecture.live (Chandavarkar) |
| Top states | Maharashtra ~34,060 · Tamil Nadu ~12,186 · Karnataka ~9,756 | [single-source] | coa.gov.in register |
| Recognised architecture colleges | ~406 (2023) | [single-source] | architecture.live |
| New graduates entering the profession | ~14,000–17,000 / year | [single-source] | architecture.live |
| Age profile | 85.4% of registrants aged ≤45 | [single-source] | architecture.live (on an older 93,117 base) |
| Independent practice rates | ~35% of male, ~17% of female architects practise independently | [single-source] | architecture.live |
| Architecture firms in India | ~14,549 listed firms, **93.8% single-owner** | [single-source, low-quality scrape] | rentechdigital.com dataset |
| IIA (voluntary body) coverage | ~25% of registered architects | [single-source] | architecture.live |

Interpretation: the registered base is large and young and grows by ~15k/year, but the firm
landscape is **overwhelmingly solo**. Applying the independent-practice rates to the register
suggests roughly **28,000–35,000 independent practices**, of which the vast majority are
1–3 person studios that map to ESTI's *free* Lite tier, not the paid Core tier.

### 2.2 The industry ESTI's customers ride

| Fact | Value | Grade | Source |
|---|---|---|---|
| India architectural services market | ~USD 25.5B (2025) → ~USD 43.7B (2033), ~7% CAGR | [single-source; GVR page also displays an internally inconsistent "USD 19.6 million (2024)" figure — treat magnitude with caution] | Grand View Research |
| India AEC *services* market | USD 4.28B (2023) → USD 12.5B (2030), 17.5% CAGR | [single-source] | Grand View Research |
| India AEC *software/solutions* market | **USD 368.8M (2025) → USD 763.1M (2034), 8.16% CAGR** | [single-source] | IMARC |
| India accounted for ~5% of global architectural services revenue (2024); fastest-growing APAC market | — | [single-source] | Grand View Research |
| Infra spend driver | Union Budget 2024-25: ₹11.11 lakh crore capex (3.4% of GDP) | [single-source] | IMARC |
| Urbanization driver | 600M urban Indians (40%) by 2036 | [single-source] | IMARC |
| Broader backdrop | 63M+ MSMEs; Indian SaaS market projected ~$100B by 2035 (IBEF) | [single-source each] | hindustanmetro; IBEF via same |

The IMARC AEC-solutions figure (~$369M) is the most honest TAM *ceiling* for AEC software
spend in India — and it includes engineering + construction software (BIM, CAD, ERP), of
which architecture-practice-management is a thin slice. IMARC explicitly tracks SME + cloud
deployment as recognized segments [single-source], confirming ESTI's segment exists as a
countable market.

### 2.3 TAM / SAM / SOM (HCW estimate, derived — not sourced)

Built bottom-up from the tables above; every input is tagged there.

| Layer | Definition | Estimate | Annual value @ blended ₹4k–8k/firm/mo |
|---|---|---|---|
| **TAM** | All independent architecture / interior / landscape practices in India | ~28k–35k practices | ₹135–340 crore/yr if all paid (they won't) |
| **SAM** | Multi-seat (≥3 staff), digitally-ready studios that can sustain a paid subscription — the ~6% non-solo slice plus the upper solo tier | **~3,000–6,000 firms** | ₹15–60 crore/yr |
| **SOM (3 yr)** | Realistic capture vs ArchiEase/UpLabs/SAMS/status-quo, with referral-led GTM | **300–800 paying firms** | **₹1.5–8 crore ARR** |

Sensitivity: the single biggest lever is whether solo/2-person practices convert to paid at
all. The 93.8%-single-owner datapoint [single-source, low quality] is the number most worth
independently confirming, because it determines whether the free Lite tier is a funnel or a
terminal destination.

---

## 3. Competitive landscape

### 3.1 What Indian architects actually use today (the real incumbent)

- **WhatsApp + Excel run Indian AEC coordination**, including projects in the ₹50–500 crore
  range; planning engineers manually re-key unstructured chat data. [corroborated —
  practitioner account (Medium/Sumeet Somraj) + every Indian competitor's own positioning]
- **Tally** is the entrenched GST/books layer: ₹22,500 one-time perpetual license
  (+₹4,500/yr TSS) or ~USD 8/month subscription; bundles GSTR-1/GSTR-3B upload, auto GST
  reconciliation, e-invoice/e-way bill, TDS/TCS. [corroborated — softwaresuggest +
  tallysolutions] The perpetual-license habit conditions buyers against per-seat
  subscriptions. [single-source]
- **Zoho Books / Zoho Invoice** are the horizontal SaaS defaults: Zoho Books free tier below
  ₹25 lakh revenue; paid ₹899–9,999/month; extra users ₹150–180/user/month; **GST invoicing
  and return filing in every paid plan**. Zoho Invoice is free outright. [corroborated —
  patronaccounting + zoho.com]
- ArchiEase's own pitch names the stack ESTI displaces: *"spreadsheets for planning, WhatsApp
  for coordination, Tally for invoices, Google Drive for drawings, and a register nobody
  updates."* [single-source, primary]

**Implication:** GST invoicing alone is not a moat — it is commoditized at ₹0–899/month.
The displacement target is the *fragmentation* across five tools, not any one of them.

### 3.2 India-built direct competitors

| Competitor | Scope | Evidence grade |
|---|---|---|
| **ArchiEase** (archiease.com, Web + iOS) | Project stages, tasks, clients, drawings, **GST-ready invoices**, fees, staffing, financial dashboards — *"project operations software for architecture firms in India"*. Also claims **COA-phase-aligned project setup**, stage-wise GST invoicing, attendance kiosk, payroll, and an **MCP server connecting to Claude**. | Existence + core scope **[verified 3-0]**; COA/AI feature claims [single-source, vendor]. Its "₹699 entry price" **[refuted 0-3]** — do not cite; actual pricing unconfirmed. |
| **UpLabs** (uplabs.in) | Accounting/finance for architecture firms: GST (CGST/SGST/IGST), TDS tracking, payroll, bank reconciliation, project-wise P&L, client portals, phase-based invoicing — explicitly marketed against Tally's gaps. | [single-source, vendor site] |
| **SAMS** (sams.satzy.in) | Management software for architects & interior designers; pitches against scattered Excel/WhatsApp. | [single-source, vendor site] |

ESTI's differentiation claims (COA fee scales, GST, AI) are therefore **contested, not
unique**. ArchiEase in particular is a near-scope clone of ESTI's Project OS + Finance
pillars. What none of the three visibly matches (from their public positioning): ESTI's
depth in **drawings/transmittals discipline, site supervision (snags / site instructions /
inspections / progress), revision intelligence, ASPRF team analytics, consultant/contractor
portals, self-host/on-prem Enterprise, and the deterministic cognition engine**.

### 3.3 Adjacent Indian tools (not direct, but bound the space)

- **Powerplay** — mobile-first construction PM for contractors: 700K+ downloads, 85,000+
  projects [single-source, vendor]. Targets site-execution roles (POs/GRNs, materials,
  labour attendance), *not* architecture practice management [single-source — verification
  errored]. Proves Indian SMB AEC firms **will** pay to leave WhatsApp/Excel; sets the local
  mobile UX bar for ESTI's site-supervision module.

### 3.4 Global A&E practice-management tools (feature bar + pricing ceiling)

| Tool | Pricing | Notes | Grade |
|---|---|---|---|
| **Monograph** | $25–$490/mo (calculator, annual billing, −20% vs monthly); two plans (Track ≤5-person firms, Grow) | 1,000+ A&E firms; small-US-studio focus | **[verified 3-0]** (pricing + plan structure); positioning [corroborated] |
| **BQE Core** | No public list price; modular per-user (~$24–79/seat reported) | All-in-one incl. HR/CRM; QuickBooks/US-centric accounting | [corroborated — monograph blog + milient] |
| **Deltek Ajera** | No public price; £70–150+/user reported; heavy implementation costs | Mid-to-large US A/E | [corroborated — CQ blog + monograph blog] |
| **Total Synergy** | Quote-gated (no public per-seat price) | Business/Enterprise tiers; transmittals, phases, forecasting — closest feature overlap; HR/CRM/API sold as add-ons; 200GB/user storage | **[verified 3-0]** (quote-gating); features [single-source, primary] |
| **CMap** | Quote-only (Capterra: "contact vendor"); £50–95/user reported | UK professional-services / A&E | [corroborated — Capterra + CQ blog] |
| Published-price cluster (Productive, Projectworks, Scoro, Factor A/E, Milient) | **~$10–30/user/month** | The transparent-pricing band for practice-management SaaS | [single-source roundup, internally consistent] |

**None of these localizes for India** — no GST/CGST-SGST/SAC, no COA Scale of Charges, no
TDS, dollar pricing, English-only, and several are quote-gated enterprise motions
[corroborated: milient roundup + WhatsApp/Excel practitioner account on why global AEC
software fails in India]. A transparent-pricing, India-first entrant has a real opening —
that opening is exactly what ArchiEase/UpLabs/SAMS are also chasing.

---

## 4. Willingness to pay & pricing benchmarks

### 4.1 India discount reality

- Indian customers typically pay **50–70% less** than US/EU for identical SaaS; B2B SMB
  tools run **2–4× lower** than international list. [corroborated — upgrowth + playto]
- Concrete mapping examples: $49/mo global ≈ ₹999/mo India (~4× PPP discount); $100/mo US ≈
  ₹3,500/mo India. [single-source each]
- Indian SMB SaaS bands: starter tiers **₹999–4,999/month**; per-user **₹50–500/user/month**;
  68.3% of Indian buyers value-conscious; **20–30% negotiated discount is the standard
  expectation**; ~17–25% annual-billing discount is the norm. [single-source each, mutually
  consistent]
- Payroll/HR SaaS in India: **₹30–180/employee/month** — the WTP band for ESTI's HR module.
  [single-source]
- Payment rails: UPI/domestic cards, not international billing. [single-source]

### 4.2 The anchors an Indian architect already knows

| Anchor | Price | What it buys |
|---|---|---|
| Zoho Invoice | **Free** | GST e-invoicing, quotes, timesheets, expenses |
| Zoho Books Standard→Professional | ₹899–1,499/mo | Full GST books, 3–5 users |
| Zoho Books Elite (15 users) | ₹5,999/mo | ESTI-Core-sized team |
| Tally Prime | ₹22,500 one-time (+₹4,500/yr) or ~$8/mo | GST compliance gold standard |
| Extra Zoho seat | ₹150–180/user/mo | The de-facto Indian per-seat price |

### 4.3 Pricing recommendation for ESTI

1. **Price per firm, not per seat.** Per-seat pricing fights both the Tally perpetual-license
   psychology and the ₹150/seat Zoho anchor. A flat firm price with seat caps (which is
   already ESTI's Lite 3 / Core 15 / Enterprise ∞ quota model) matches how Zoho Books tiers
   and how Indian SMBs think about cost predictability [corroborated — hindustanmetro on
   predictability + Tally license habit].
2. **Core at ₹2,999–5,999/firm/month** (annual ~₹30k–60k), positioned just above Zoho Books
   Premium/Elite — justified by the architecture-specific bundle, not by GST. This sits at
   the top of the Indian starter band and ~70–85% below Monograph-style Western pricing,
   consistent with the observed 2–4× India discount.
3. **Keep list ~30% above target** to absorb the standard Indian negotiation expectation.
4. **Enterprise (on-prem, SSO, BYO-AI) is quote-priced** — matching how Total Synergy/CMap
   sell, and it is the tier where ESTI's self-host story is genuinely differentiated.
5. Expect **30–40% of revenue from expansion** (seat growth Lite→Core, storage, AI) if the
   funnel works [single-source benchmark].

---

## 5. India-specific moats — honest assessment

| Claimed moat | Reality check | Net |
|---|---|---|
| **GST invoicing (CGST/SGST, SAC, FY-sequential)** | Commoditized: Zoho Books includes it in every paid plan; Tally owns filing; ArchiEase/UpLabs ship it. | **Table stakes, not moat.** Necessary to compete, insufficient to win. |
| **COA Scale of Charges fee proposals** | Real, statutory basis (Architects (Professional Conduct) Regulations, 1989: 7.5% housing/interior/landscape, 5% non-housing, 1% urban design, +10% documentation) [single-source, vendor-relayed — and note the *legal enforceability of minimum fees is disputed* (CCI competition-law angle); verify before marketing "mandatory"]. ArchiEase claims COA-phase alignment too. | **Differentiator vs global + horizontal tools; contested vs ArchiEase.** Deep, correct COA workflow (stage-linked invoicing, escalation, scope agreements) can still out-execute. |
| **TDS / filing abstracts / reconciliation** | Tally/Zoho cover generic TDS; ESTI's project-linked reconciliation (bank/26AS/AIS/GSTR import matching) is rarer. | **Modest moat** — valuable to the accountant seat. |
| **Statutory permit tracking** | No horizontal tool does this; low switching pressure though. | **Nice-to-have differentiator.** |
| **The integrated bundle** (proposal → phase → drawing → transmittal → site → invoice → reconciliation, one record) | This is the actual product thesis, and nothing public in India matches its breadth — ArchiEase is closest but lighter on drawings discipline, site supervision, portals, and analytics. | **The real moat, if execution + onboarding land.** |
| **Self-host / on-prem Enterprise + BYO-AI (Ollama)** | Unique among all competitors surveyed; resonates with data-sovereignty-minded firms and larger practices. | **Genuine wedge for the Enterprise tier.** |
| Beware one detail | ArchiEase's site cites SAC 998311 for architectural services — likely wrong (998321/9983 group is architectural). ESTI getting SAC/GST minutiae *exactly right* is cheap credibility. | — |

---

## 6. Adoption barriers & risks (the skeptic's case)

All from the dedicated skeptical search angle; individually [single-source] but mutually
reinforcing:

1. **Shallow digitization.** >60% of Indian SMBs have nominally adopted cloud tools but
   nearly half stall in early usage; **adoption fails at onboarding, not purchase**.
2. **Tiny IT budgets.** Indian SMBs historically spend **<1% of revenue on IT**; low ARPU +
   high service expectations break the ~80%-gross-margin SaaS model; buyers often need
   in-person education. High-touch sales → poor CAC:LTV if priced too low.
3. **Self-serve doesn't carry.** Indian SMB buying runs on referrals, sales conversations,
   and assisted demos — longer cycles, higher drop-off. ESTI's free-Lite → paid-Core funnel
   cannot be purely product-led.
4. **The vertical-SaaS-in-India warning.** As of 2019 no India-only SaaS had passed $10M ARR
   on the domestic market; Deskera's thesis holds that price-sensitive Indian SMBs refuse
   piecemeal vertical tools and prefer one horizontal suite. Counterpoint: ESTI *is*
   effectively a horizontal suite (PM + CRM + HR + finance + docs) scoped to one vertical —
   the "whole gamut" objection is partially answered by the bundle.
5. **Free-tier economics risk.** If ~94% of firms are single-owner, Lite may become the
   terminal tier for most signups: storage + support costs with no conversion. Mitigations:
   keep Lite genuinely capped (no GST split — the moment a firm crosses the GST threshold it
   must upgrade), watch the Zoho Books free-tier design (revenue-capped at ₹25 lakh — an
   elegant "you grew, you pay" gate).
6. **Competitive timing.** ArchiEase is live, marketing, and AI-forward. First-mover brand
   in a referral-driven professional community compounds.
7. **Churn risk.** Thin-margin practices cancel in fee droughts; annual billing (17–25%
   discount norm) and the accountant/compliance lock-in (invoices, filings, audit trail)
   are the retention levers.
8. **Tier-2/3 reality.** ~60% of SMEs sit in Tier-2/3 towns; English-only, desktop-first
   products underperform there. ESTI's Carbon desktop app + mobile-first portals partially
   answers this; regional-language surfaces may eventually matter.

---

## 7. Go-to-market recommendations

1. **Lead with the COA fee proposal + stage-linked GST invoice, demoed in 10 minutes.** It is
   the workflow every practice runs monthly, the one Zoho/Tally genuinely fumble
   (project-phase linkage), and the fastest "this was built for *us*" signal.
2. **Referral-led, community-anchored GTM** — IIA chapters (only ~25% of architects are
   members, but they are the organised, paying tier), architecture-college alumni networks
   (14–17k new graduates/year form studios within ~5–8 years), CPD/webinar content on COA
   fees & GST for architects. Matches the evidence that Indian SMBs buy via referrals and
   assisted demos, not self-serve ads.
3. **Geographic focus first: Maharashtra + Karnataka + Tamil Nadu** — ~46% of all registered
   architects, dense metro studio clusters (Mumbai/Pune, Bengaluru, Chennai).
4. **Weaponize onboarding.** Since adoption fails at onboarding: white-glove import (Tally
   ledger, Excel project lists, Drive drawings), a "first invoice in day one" checklist, and
   assisted setup for Core signups. This is a feature of the *business*, not the product.
5. **Coexist with Tally, don't fight it.** Position ESTI as the operational layer that
   *generates* clean GST invoices and reconciliation data; the accountant keeps Tally for
   filing. Displacing Tally head-on triggers the strongest incumbency in Indian SMB software.
6. **Make the Enterprise self-host/BYO-AI story loud** — it is the one tier where no surveyed
   competitor (Indian or global) matches, and it appeals to the 50+ seat practices with
   institutional clients and data-residency concerns.
7. **Interior design expansion is the adjacent SAM** — same COA-adjacent fee logic, larger
   firm count, already in UpLabs/SAMS's cross-hairs; ESTI's scope note (architecture,
   interior, landscape) already covers it.
8. **Track ArchiEase quarterly** (pricing page, feature releases, App Store traction) — it is
   the reference competitor for positioning and the canary for what this niche will pay.

---

## 8. Viability verdict

| Question | Answer |
|---|---|
| Is there a real, unmet need? | **Yes** — fragmentation across WhatsApp/Excel/Tally/Drive is documented pain; global tools don't localize; the workflow bundle is genuinely absent from horizontal Indian SaaS. |
| Is the market big enough? | **For a bootstrapped/consultancy-funded vertical SaaS, yes; for venture scale on India-architecture alone, no.** SAM ≈ 3–6k multi-seat firms; SOM (3yr) ≈ 300–800 paying firms ≈ ₹1.5–8 crore ARR; expansion paths (interior design, seats, Enterprise on-prem, eventually South/Southeast Asia) can extend that. |
| Is the timing right? | **Favourable** — post-COVID SMB digitization is real, AEC software spend growing ~8%/yr, competitors are early-stage; but the window is closing as ArchiEase et al. build brand. |
| Is the differentiation defensible? | **Partly.** GST/COA features are contested; the integrated record + site supervision + portals + self-host + deterministic cognition engine is the defensible bundle — provided onboarding and mobile execution match Indian SMB reality. |
| Biggest risk to the thesis | Free-tier-terminal solo firms + onboarding drop-off → a large user base that never pays. Second: ArchiEase winning the referral network first. |
| Recommended posture | **Proceed** — as a capital-efficient product with high-touch GTM in 3 states, firm-level (not per-seat) pricing at ₹2,999–5,999/month for Core, and success measured in paying-firm count and Lite→Core conversion rate, not signups. |

---

## 9. Source register

Primary/official: coa.gov.in · monograph.com/pricing · totalsynergy.com/plans ·
archiease.com · getpowerplay.in · uplabs.in · sams.satzy.in · zoho.com/in/invoice ·
tallysolutions.com

Industry research: grandviewresearch.com (India architectural services; India AEC services) ·
imarcgroup.com (India AEC solutions)

Analysis/secondary: architecture.live (Prem Chandavarkar, profession demographics) ·
capterra.com (CMap) · softwaresuggest.com (TallyPrime) · patronaccounting.com (Zoho Books
India pricing) · inc42.com (Deskera on vertical vs horizontal SaaS)

Practitioner/blog (directional only): medium.com/@sumeetsomraj (WhatsApp/Excel) ·
upgrowth.in · playto.so · cloudnuro.ai · salarybox.in ·
cq-business-management-software.com · milientsoftware.com · monograph.com/blog ·
hindustanmetro.com · LinkedIn (Arvind Jha; Adam Walker) · rentechdigital.com (firm-count
scrape — lowest-confidence input, flagged wherever used)

**Verification caveat:** the adversarial verification pass completed for 7 of the top 25
claims (6 confirmed, 1 refuted) before hitting infrastructure limits; the remaining claims
are tagged [corroborated] or [single-source] above. Nothing tagged [single-source] should be
quoted externally (investor decks, marketing) without an independent check — in particular
the COA register total, the 93.8%-solo firm share, and all market-size dollar figures.
