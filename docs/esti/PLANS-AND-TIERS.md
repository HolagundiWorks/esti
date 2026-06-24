# AORMS — editions & module map (Lite / Core / Enterprise)

> Proposal. Maps every module (see [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md))
> to a plan. Backend is one codebase; the plan is a **firm-level flag** that gates
> features and quotas — orthogonal to the existing `can(role, capability)` (which
> gates by *person*). Plan gates by *firm subscription*.

## Positioning

| Edition | For | One line |
|---|---|---|
| **AORMS-Lite** (free) | solo / tiny studios | Run your design practice — clients, projects, drawings, GST invoicing — free, with caps. |
| **AORMS-Core** (paid) | established firms | The full office OS: construction/PMC, revision intelligence, HR, reconciliation, portals, ESTI cognition. |
| **AORMS-Enterprise** | multi-office / scale | Core at scale — unlimited seats, SSO, API/ESTICAD, governance, integrations, white-label. |

## Quotas

| Limit | Lite (free) | Core | Enterprise |
|---|---|---|---|
| **Team members** | **3** | 25 (add seats) | **unlimited** |
| **Clients** | **10** | unlimited | unlimited |
| **Contractors** | **10** | unlimited | unlimited |
| Active projects | 5 | unlimited | unlimited |
| Document storage | 2 GB | 100 GB | custom |
| Consultants | 5 | unlimited | unlimited |
| ESTI AI requests | trial | standard | high / dedicated |
| Support | community | standard | priority + SLA |

> When a Lite firm hits a cap (4th team member, 11th client/contractor), the
> action is blocked with an upgrade prompt — never silent data loss.

## Module → edition matrix

`✓` included · `◐` limited / basic · `—` not in this edition

### Home & Work
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Dashboard KPIs, Alerts, Search, Tasks | ✓ | ✓ | ✓ |
| Action Center — cognition interventions (AI/ML priority) | — | ✓ | ✓ |
| Workload analytics | ◐ | ✓ | ✓ |

### Clients & pipeline
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Client CRM + client log | ◐ (≤10) | ✓ | ✓ |
| Proposals pipeline | — | ✓ | ✓ |
| Fee proposals (COA Scale of Charges) | ◐ (flat) | ✓ | ✓ |

### Projects — Consultancy (design)
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Project info, brief, phases | ✓ | ✓ | ✓ |
| Programme (per-project Gantt) | ◐ | ✓ | ✓ |
| Drawings & transmittals register | ✓ | ✓ | ✓ |
| ESTICAD takeoff capture (companion) | — | ✓ | ✓ |
| Approvals / issue log | ✓ | ✓ | ✓ |
| Decisions & **revision intelligence** | — | ✓ | ✓ |
| Documents & spec sheets | ◐ | ✓ | ✓ |
| Statutory permits | ◐ | ✓ | ✓ |
| Fee & billing — GST invoices | ◐ (basic GST) | ✓ | ✓ |

### Projects — Project Management (construction / PMC)
| Feature | Lite | Core | Ent |
|---|---|---|---|
| PMC control + construction schedule (CPM) | — | ✓ | ✓ |
| **Costing & Measurement** — single window: rate analysis → estimation → BOQ → costing → site measurement → RA bills → submissions | — | ✓ | ✓ |
| Tenders & contractor bids | — | ✓ | ✓ |
| Site ops (snags, instructions, progress, inspections) | — | ✓ | ✓ |
| Purchase orders | — | ✓ | ✓ |
| Multi-project PMC portfolio | — | ◐ | ✓ |

### Accounts
| Feature | Lite | Core | Ent |
|---|---|---|---|
| GST invoicing | ◐ | ✓ | ✓ |
| Expenses & cash book | — | ✓ | ✓ |
| Reconciliation (bank / 26AS / AIS / GSTR import) | — | ✓ | ✓ |
| GST / TDS filing abstracts | — | ✓ | ✓ |

### People
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Team & assignments | ◐ (≤3) | ✓ | ✓ |
| Attendance | — | ✓ | ✓ |
| HR — leaves & payroll | — | ✓ | ✓ |
| Performance — ASPRF, scores, rewards | — | ✓ | ✓ |
| Consultant / contractor directories | ◐ (≤10/5) | ✓ | ✓ |

### Knowledge
| Feature | Lite | Core | Ent |
|---|---|---|---|
| DSR rates, knowledge bank | — | ✓ | ✓ |
| Analysed-rate library (rate analysis) | — | ✓ | ✓ |
| Spec catalogue | — | ✓ | ✓ |
| SteelFlow (BBS) | — | ◐ | ✓ |

### Collaboration & portals
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Comments, critical notes, activity | ✓ | ✓ | ✓ |
| Client portal | ◐ (1 project) | ✓ | ✓ |
| Consultant (collaborator) portal | — | ✓ | ✓ |
| Contractor portal (bids + running bills) | — | ✓ | ✓ |

### AI — ESTI
| Feature | Lite | Core | Ent |
|---|---|---|---|
| ESTI AI Studio / agent | trial | ✓ standard | ✓ full + higher limits |
| Cognition engine (dashboard) | — | ✓ | ✓ |

### Admin & governance
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Company, users, settings | ✓ (3 users) | ✓ | ✓ |
| Roles / access tiers | ◐ (owner + 2) | ✓ full ladder | ✓ |
| Immutable audit log | — | ✓ | ✓ + export |
| Companion / ESTICAD device API | — | ◐ | ✓ |
| SSO, API access, multi-office, white-label | — | — | ✓ |
| Priority support / SLA | — | — | ✓ |

## The upgrade story (what pulls Lite → Core → Enterprise)

- **Lite → Core** when the firm needs to **build, not just design**: the moment a
  project goes to tender/site (PMC), needs revision intelligence to defend fees,
  HR/payroll, reconciliation, or a 4th team member / 11th client.
- **Core → Enterprise** when the firm needs **scale & governance**: many offices,
  unlimited seats, SSO, the ESTICAD/API integration, audit export, white-label.

## Enforcement (implementation approach)

1. **`plan` on the firm** — `LITE | CORE | ENTERPRISE` (DB column on the firm/org
   record; defaults `LITE`).
2. **Feature gate** — `planAllows(plan, feature)` in `packages/contracts`
   (sibling to `can(role, capability)`); a procedure tier `planProcedure(feature)`
   in `backend/src/trpc/trpc.ts` returns `PAYMENT_REQUIRED`/`FORBIDDEN` below tier.
3. **Quota gate** — on create mutations (team/client/contractor/project), count
   existing rows and block at the cap with an upgrade-prompt error code.
4. **Frontend** — hide/disable gated nav + show upgrade chips; the plan flows from
   `auth.me` (like `isSystemAdmin`) so the SPA renders the right edition.
5. **Reuse the build variants** — the firm product (`VITE_PUBLIC_SITE=false`) is
   orthogonal; plan gating works in both the demo and firm builds.
