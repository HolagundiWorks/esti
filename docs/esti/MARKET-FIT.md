# AORMS — Market fit brief

**Status:** Canonical GTM + product priority · **Updated:** 2026-07-24  
**Owner:** Human Centric Works (HCW)

Companion to [ROADMAP.md](ROADMAP.md) (delivery queue) and
[PRODUCT-VISION.md](PRODUCT-VISION.md) (boundary). This file records **market
research conclusions** and what we must ship for paying firms.

**Delivery status:** Market-fit Waves **W1–W3 shipped**; **W4 integrations deferred**.

---

## 1. ICP & category

| | |
|---|---|
| **Buyer** | Indian AEC **advisory** firms — architecture studios and engineering consultancies (structural / MEP / civil), roughly **5–50 people** |
| **Not for** | Contractors, PMC portfolios, construction execution ERP, warehouses / RA bills / tenders |
| **Category** | A/E practice ops / light PSA — not CAD, not construction PM, not generic ERP |
| **JTBD** | Replace WhatsApp + email + Excel + generic PM + ad-hoc GST with one **office operating record**: fees → delivery → revisions → site supervision → invoices → portals |

**Wedge line:** *Operating system for AEC consultancies in India* — fee recovery,
revision control, site supervision, and GST on one spine.

---

## 2. Gaps already closed

| Market gap | AORMS answer |
|---|---|
| Generic PM ignores COA fees, GST/TDS, FY April | India-first money (paise), proposals, invoices, reconcile |
| Global A/E PSA ignores Indian site supervision | Drawings, transmittals, snags, instructions, progress (architect-side) |
| “AI for architects” = chat wrappers | Dual-tier: **ESTI** (validated firm data) + **EOMS** (codes / knowledge bank) |
| Architecture tools ignore engineering (and vice versa) | Same spine: **AORMS-Studio** + **AORMS-Consultancy** |
| Scope creep into construction ERP | Explicit teardown — **advise, don’t deliver** |
| Fragmented external access | Client / consultant / contractor / site portals |
| Desktop install friction | Web-only · one Standard licence · storage + AI usage |

---

## 3. Competitive snapshot

| Type | Examples | They win | We win |
|---|---|---|---|
| Indian AEC ERP | ArchiO | Breadth, SMB familiarity | Advisory-only focus, Studio Intelligence, dual AI |
| Finance-only | UpLabs | Clean money UX | Full delivery + portals + R&O + revisions |
| AI toolkits | Studio Matrx ArchitectAI | Bylaw AI, free tools, brand | System of record + firm memory + eng app |
| Global PSA | Monograph, Ajera, Projectworks | Time → profitability polish | India GST/COA, site supervision, EOMS/ESTI |
| Inertia | Excel / WhatsApp / Notion | Zero switching cost | Traceability, invoices, portals, audit |

Biggest competitor: **inertia**, not any single SaaS.

---

## 4. Viability

**Viable as** a focused vertical SaaS for Indian AEC consultancies.  
**Not viable as** a horizontal AI/PM platform.

Path: land **Studio** (architects) → expand **Consultancy** (engineers) → upsell
storage / hosted AI + multi-company licensing.

Risks to manage: GTM consistency, time→WIP UX depth vs global PSA, reference
customers, “boring reliability” (invoice PDF / GST) before ESTI storytelling.

---

## 5. Market-fit backlog (priority)

Implementation status lives on [ROADMAP.md](ROADMAP.md) § Market fit.

### M1 — Trust & money (must-have)
1. Flawless invoice / GST / fee-stage path for first paying firms  
2. **Project fee recovery** visibility (fee vs invoiced vs outstanding) — Studio KPIs ✅  
3. Onboarding: first invoice in ~30 minutes (demo seed + guided empty states) ✅  

### M2 — Time & capacity
1. Staff time → WIP → fee stages (Consultancy already stronger; Studio light)  
2. Capacity / overload on Studio Intelligence ✅  

### M3 — Client-facing proof
1. Polished **client portal** empty states + pending-approval CTAs ✅  
2. Digests / notifications that pull decisions back into the record ✅  

### M4 — India differentiation
1. COA fee + GST as default excellence  
2. Pre-con R&O + revision intelligence as the “why not Excel” story  
3. Dense EOMS packs later — do not lead with bylaw-AI until catalog depth exists

### M5 — GTM packaging
1. Consistent public story (no BBS / PMC / tenders / “launch gated” leftovers) ✅  
2. Landing **#pricing** from [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) ✅  
3. ICP one-pager + Holagundi SOP as proof ✅  
4. Ask ESTI / wiki-knowledge scrub for removed modules ✅  

### M6 — Consultancy go-to-market
1. Reference eng firms + 15-minute engagement→invoice demo ✅  
2. Workspace chrome that does not feel like “Studio with extra URLs” ✅  

### M7 — Integrations (phase 2) — deferred
Tally / Zoho Books deepen · Drive for drawings · WhatsApp capture — not day-one.

### Explicitly defer
Desktop app · raw cloud DB clients · construction tenders / RA bills / BBS ·
“AI that designs the building.” · W4 integrations.

---

## 6. Waves (shipped)

| Wave | Items | Status |
|---|---|---|
| **W1** | Vendors gate · SEO scrub · wiki-knowledge · landing pricing · portal empty · fee recovery % | ✅ |
| **W2** | First-invoice checklist · capacity strip · Alerts digests | ✅ |
| **W3** | Consultancy chrome · demo seed · DEMO-SCRIPT + ICP-ONE-PAGER | ✅ |
| **W4** | Tally / Drive / WhatsApp | **Deferred** |

See [ROADMAP.md](ROADMAP.md) for per-item checklists.
