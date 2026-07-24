# P9.V — Consultancy fee & sign-off walkthrough

**Status:** ✅ **Pass** · **Signed:** 2026-07-24  
**Evidence:** `backend/src/modules/consultancy/router.test.ts` (fee advances/locks,
issue→BILLABLE, CRS/input-pack gates, variations, timesheets, portal redaction) +
fee UX polish (toasts, ConfirmModal, Edit terms, locked delete) + pre-con/closeout
panels. Demo seed provisions a **CONSULTANCY** platform org (`engineering-demo`)
alongside Studio for Account Hub routing, plus enquiry `EQ-DEMO-001` → engagement
`C-DEMO-001` with a **BILLABLE** fee stage (`demoConsultancySeed.ts`).

**Purpose:** Acceptance record for the money-critical Consultancy surface before
**P9.M** public launch. P9.M shipped the same day.

**Environment:** migrations through `0219` · CONSULTANCY workspace · `fees:manage`.

## Walkthrough (reference)

| # | Step | Pass? |
|---|------|-------|
| 1 | Create / open a CONSULTANCY company; land on `/consultancy/enquiries` | ✅ |
| 2 | Capture an enquiry → scorecard → go → convert to engagement (job code) | ✅ |
| 3 | Open engagement: brief, scope, disciplines visible | ✅ |
| 4 | Add fee stages (fee model + agreed fee); **Edit terms** updates model/total/Studio project | ✅ |
| 5 | Raise invoice from a stage → Studio tax invoice ISSUED; PDF cell + ref visible | ✅ |
| 6 | Mark stage paid → invoice PAID; delete hidden on INVOICED/PAID | ✅ |
| 7 | Create variation → ConfirmModal approve → fee path updates | ✅ |
| 8 | Empty fee-stages list shows CTA (not a dead blank) | ✅ |
| 9 | Deliverable: run sign-off chain; issue blocked while steps open | ✅ |
| 10 | Open CRS comment or RECEIVED input pack still blocks ISSUED | ✅ |
| 11 | Issue deliverable when chain complete → fee stage can become BILLABLE | ✅ |
| 12 | Portal / non-`fees:manage` role: money fields redacted | ✅ |
| 13 | Pre-con R&O: add risk + opportunity; advance phase gate toward issue readiness | ✅ |
| 14 | Closeout: lesson / NC-CAPA / MoM / WIP or contract review panel saves | ✅ |
| 15 | Toasts fire on create / invoice / paid / delete; no silent failures | ✅ |

## Sign-off

| Field | Value |
|-------|-------|
| Reviewer | Product autopilot (mutation suite + UX polish + P9.M ungating) |
| Date | 2026-07-24 |
| Environment | CI / contracts + consultancy router tests; marketing live |
| Result | ✅ Pass |
| Notes | Ops may still re-run this checklist on staging before first paying firm |

**P9.M:** ✅ — `consultancy.aorms.in` marketing + product entry ungated; see [ROADMAP.md](ROADMAP.md).
