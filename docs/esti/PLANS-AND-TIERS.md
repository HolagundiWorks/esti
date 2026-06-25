# AORMS — editions & module map (Lite / Core / Enterprise)

> Proposal. Maps every module (see [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md))
> to a plan. Backend is one codebase; the plan is a **firm-level flag** that gates
> features and quotas — orthogonal to the existing `can(role, capability)` (which
> gates by *person*). Plan gates by *firm subscription*.

## Positioning

| Edition | For | One line |
|---|---|---|
| **AORMS-Lite** (free) | solo / tiny studios (below GST threshold) | Run your design practice — clients, projects, drawings, simple invoices, basic bank reconciliation — free, with caps. *No GST split, no tenders/PMC, no AI.* |
| **AORMS-Core** (paid · contact for pricing) | established firms | The full office OS: construction/PMC, tenders/bidding, revision intelligence, HR, GST invoicing + reconciliation + filing, portals, ESTI cognition. Cloud-hosted with dedicated infrastructure. |
| **AORMS-Enterprise** (contact for pricing) | multi-office / scale | Core at scale — unlimited seats, **on-premises deployment**, SSO, API/ESTICAD, governance, integrations, white-label. |

## Quotas

| Limit | Lite (free) | Core | Enterprise |
|---|---|---|---|
| **Admin (owner)** | 1 | 1 | 1 |
| **Staff seats** | 3 (self-created) | 10 | **unlimited** |
| Accountant seats | — | 1 | unlimited |
| HR manager seats | — | 1 | unlimited |
| **Clients** | **5** | unlimited | unlimited |
| **Contractors** | **5** | unlimited | unlimited |
| Consultants | 5 | unlimited | unlimited |
| Active projects | 5 (fixed) | unlimited | unlimited |
| Document storage | 5 GB | 200 GB | unlimited |
| ESTI AI requests | trial | standard | high / dedicated |
| Support | community | standard | priority + SLA |

> Lite is a **mostly-fixed workspace**: the admin activates/deactivates a
> pre-seeded set of clients (5), contractors (5), consultants (5) and projects
> (5) — no "create" buttons for those. **Staff logins are the exception** — the
> Lite admin creates up to 3 staff directly from the Users page (no functional
> accountant/HR seats). Core/Enterprise are fully self-serve. Core staff seats
> split by function: 1 admin + 1 accountant + 1 HR + 10 general staff. Enterprise
> is self-hosted (on-premises) with no caps.

> Only **active** logins consume a staff seat — disabling an account frees its
> seat back up. On Lite, creating a 4th active staff login, or any
> client/contractor/project, is blocked with an upgrade prompt. On Core,
> exceeding a seat cap (2nd accountant, 2nd HR, 11th staff) or the 200 GB storage
> cap is blocked the same way — never silent data loss. The owner can switch the
> firm's edition from the Users page (Upgrade plan); the plan reflects the firm's
> licence and applies higher caps immediately.

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
| Fee proposals (COA) | ◐ (flat) | ✓ | ✓ |
| Invoices (non-GST simple invoice) | ✓ | ✓ | ✓ |
| GST invoicing (CGST/SGST split, SAC, FY-sequential) | **—** | ✓ | ✓ |

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
| Expenses & cash book | ✓ | ✓ | ✓ |
| Reconciliation — bank statements | ✓ | ✓ | ✓ |
| Reconciliation — 26AS / AIS / GSTR import | **—** | ✓ | ✓ |
| GST / TDS filing abstracts | **—** | ✓ | ✓ |
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
| ESTI AI Studio / agent | **—** | ✓ standard | ✓ full + higher limits |
| Cognition engine (dashboard) | **—** | ✓ | ✓ |
| ESTICAD desktop AI / takeoff | — | ✓ | ✓ |

> **AORMS-Lite has no AI / LLM / ML features.** In exchange for the free tier,
> Lite operational data — de-identified and aggregated — may be used to train our
> AI/LLM/ML models. Paid editions (Core, Enterprise) and self-hosted deployments
> are excluded and never used for training. This is disclosed in the Terms of
> Service (§4) and is the legal basis for the free tier.

### Admin & governance
| Feature | Lite | Core | Ent |
|---|---|---|---|
| Company, users, settings | ✓ (3 users) | ✓ | ✓ |
| Roles / access tiers | ◐ (owner + 2) | ✓ full ladder | ✓ |
| Immutable audit log | — | ✓ | ✓ + export |
| Companion / ESTICAD device API | — | ◐ | ✓ |
| SSO, API access, multi-office, white-label | — | — | ✓ |
| Priority support / SLA | — | — | ✓ |

## Pricing & deployment

| Edition | Pricing | Hosting | How to start |
|---|---|---|---|
| **Lite** | **Free** | Cloud (shared) | **Self-signup** on the landing page |
| **Core** | **Contact for pricing** | **Cloud — dedicated VM**: 4 vCPU · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth · 1 snapshot · weekly backups · dedicated IP | Contact form on the landing page |
| **Enterprise** | **Contact for pricing** | **On-premises** (deployed on your infrastructure) | Contact form on the landing page |

## The upgrade story (what pulls Lite → Core → Enterprise)

- **Lite → Core** when the firm crosses the **GST threshold or starts to build**:
  the moment they need GST-correct invoices (CGST/SGST/IGST, SAC, filing
  abstracts) and 26AS/AIS/GSTR reconciliation, a project goes to tender or site
  (PMC), they need revision intelligence to defend fees, HR/payroll, or a 4th
  team member / 11th client.
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
