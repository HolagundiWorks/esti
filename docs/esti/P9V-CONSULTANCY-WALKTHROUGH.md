# P9.V — Consultancy fee & sign-off walkthrough (human gate)

**Purpose:** Sign off the money-critical Consultancy surface before **P9.M** public
launch. Autopilot has shipped automated tests + fee UX polish; this checklist is
the remaining human gate on
[AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md).

**Environment:** CONSULTANCY workspace company · staff with `fees:manage` · demo
or staging with migrations through `0219`.

## Walkthrough

| # | Step | Pass? |
|---|------|-------|
| 1 | Create / open a CONSULTANCY company; land on `/consultancy/enquiries` | ☐ |
| 2 | Capture an enquiry → scorecard → go → convert to engagement (job code) | ☐ |
| 3 | Open engagement: brief, scope, disciplines visible | ☐ |
| 4 | Add fee stages (fee model + agreed fee); **Edit terms** updates model/total/Studio project | ☐ |
| 5 | Raise invoice from a stage → Studio tax invoice ISSUED; PDF cell + ref visible | ☐ |
| 6 | Mark stage paid → invoice PAID; delete hidden on INVOICED/PAID | ☐ |
| 7 | Create variation → ConfirmModal approve → fee path updates | ☐ |
| 8 | Empty fee-stages list shows CTA (not a dead blank) | ☐ |
| 9 | Deliverable: run sign-off chain; issue blocked while steps open | ☐ |
| 10 | Open CRS comment or RECEIVED input pack still blocks ISSUED | ☐ |
| 11 | Issue deliverable when chain complete → fee stage can become BILLABLE | ☐ |
| 12 | Portal / non-`fees:manage` role: money fields redacted | ☐ |
| 13 | Pre-con R&O: add risk + opportunity; advance phase gate toward issue readiness | ☐ |
| 14 | Closeout: lesson / NC-CAPA / MoM / WIP or contract review panel saves | ☐ |
| 15 | Toasts fire on create / invoice / paid / delete; no silent failures | ☐ |

## Sign-off

| Field | Value |
|-------|-------|
| Reviewer | |
| Date | |
| Environment | |
| Result | ☐ Pass · ☐ Fail (notes below) |
| Notes | |

When **Pass**, tick **P9.V** ✅ on the product autopilot roadmap and proceed to
**P9.M** (DNS / go-live copy for `consultancy.aorms.in`).
