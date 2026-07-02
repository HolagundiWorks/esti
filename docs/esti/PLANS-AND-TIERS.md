# AORMS — editions & module map (Lite / Pro)

> **⚠ Reconciliation note (2026-06-28).** The **Estimation OS**, **Construction Cost
> spine**, **Rate Books** (`rateBooks` feature), and **Rate Analysis** were **removed** in
> the teardown — rows mapping them to tiers are **historical**. The authoritative record of
> what exists today is [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md)
> § "System state"; the rebuild is
> [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) +
> [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md). The new Construction Knowledge Bank is Pro.

> **Legacy editions.** The former **Core** and **Enterprise** editions were merged into
> one paid edition, **AORMS-Pro**. Legacy `CORE` / `ENTERPRISE` licence tokens and
> `FIRM_PLAN` values still work at runtime — `asPlan()` in `packages/contracts` folds
> them to `PRO`.

> Proposal. Maps every module (see [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md))
> to a plan. Backend is one codebase; the plan is a **firm-level flag** that gates
> features and quotas — orthogonal to the existing `can(role, capability)` (which
> gates by *person*). Plan gates by *firm subscription*.

## Positioning

| Edition | For | One line |
|---|---|---|
| **AORMS-Lite** (free) | solo / tiny studios (below GST threshold) | Run your design practice — clients, projects, drawings, simple invoices, basic bank reconciliation — free, with caps. *No GST split, no AI.* |
| **AORMS-Pro** (paid · contact for pricing) | established firms through multi-office / scale | The full office OS: revision intelligence, HR, GST invoicing + reconciliation + filing, portals, ESTI cognition — plus unlimited seats, SSO, API/ESTICAD, governance, integrations, white-label. **Cloud-hosted or self-hosted (on-premises).** |

## Quotas

| Limit | Lite (free) | Pro |
|---|---|---|
| **Admin (owner)** | 1 | 1 |
| **General staff seats** | **3** | **unlimited** |
| Accountant seats | — | unlimited |
| HR manager seats | — | unlimited |
| **Clients** | unlimited | unlimited |
| **Contractors** | unlimited | unlimited |
| Consultants | unlimited | unlimited |
| Active projects | unlimited | unlimited |
| Document storage | 5 GB | unlimited |
| Bring-your-own storage (BYOS) | — | ✓ NAS / S3 |
| AI / LLM / ML | — (none) | ✓ built-in Ollama or bring-your-own API (per-licence flag) |
| Support | community | priority + SLA |

> Lite and Pro are both **self-serve**: clients, contractors, consultants and
> projects are **unlimited on both editions** (created through the normal "New …"
> flow — Lite is no longer a fixed pre-seeded workspace). The only count cap is
> **general staff seats** on Lite (3); Pro is unlimited, though a licence token may
> still constrain seats via its `seats` field. Accountant and HR_MANAGER are
> **separate extra seats** (Pro: unlimited; Lite: none — upgrade to Pro for those
> roles). **AI/LLM/ML is Pro only** — Lite has no AI. **Bring-your-own AI provider**
> (a per-licence flag within Pro) — instead of the on-server Ollama, a Pro firm can
> point AI Studio at their own **OpenAI-compatible** cloud endpoint (base URL +
> model + key) from Company → AI Studio; the key is write-only and calls fall back
> to the template if the provider is unreachable. **Bring-your-own-storage (BYOS,
> Pro)** lets a firm redirect object storage — drawings, documents and generated
> PDFs — to their own **NAS / mounted folder** or **S3-compatible hosting engine**
> from Company → Storage (the S3 secret is write-only). NAS mode requires the path
> to be mounted on both the backend and the worker host.

> Only **active** logins consume a staff seat — disabling an account frees its
> seat back up. On Lite, creating a 4th active general-staff login is blocked with
> an upgrade prompt (clients/contractors/consultants/projects are not capped). On
> Pro, seats and storage are unlimited by edition; if the licence token carries a
> `seats` cap, exceeding it is blocked the same way — never silent data loss. The
> owner can switch the firm's edition from the Users page (Upgrade plan); the plan
> reflects the firm's licence and applies higher caps immediately.

## Module → edition matrix

`✓` included · `◐` limited / basic · `—` not in this edition

### Home & Work
| Feature | Lite | Pro |
|---|---|---|
| Dashboard KPIs, Alerts, Search, Tasks | ✓ | ✓ |
| Action Center — cognition interventions (AI/ML priority) | — | ✓ |
| Workload analytics | ◐ | ✓ |

### Clients & pipeline
| Feature | Lite | Pro |
|---|---|---|
| Client CRM + client log | ◐ (≤10) | ✓ |
| Proposals pipeline | — | ✓ |
| Fee proposals (COA Scale of Charges) | ◐ (flat) | ✓ |

### Projects — Consultancy (design)
| Feature | Lite | Pro |
|---|---|---|
| Project info, brief, phases | ✓ | ✓ |
| Drawings & transmittals register | ✓ | ✓ |
| ESTICAD takeoff capture (companion) | — | ✓ |
| Approvals / issue log | ✓ | ✓ |
| Decisions & **revision intelligence** | — | ✓ |
| Documents & spec sheets | ◐ | ✓ |
| Statutory permits | ◐ | ✓ |
| Fee proposals (COA) | ◐ (flat) | ✓ |
| Invoices (non-GST simple invoice) | ✓ | ✓ |
| GST invoicing (CGST/SGST split, SAC, FY-sequential) | **—** | ✓ |

### Projects — Site Delivery (consultancy supervision)
> **Note:** The former PMC / Costing & Measurement / Tenders spine was **removed 2026-06-28** (consultancy-only teardown). The rows below reflect what remains.

| Feature | Lite | Pro |
|---|---|---|
| Site ops (snags, instructions, progress, inspections) | — | ✓ |
| Purchase orders | — | ✓ |

### Accounts
| Feature | Lite | Pro |
|---|---|---|
| Expenses & cash book | ✓ | ✓ |
| Reconciliation — bank statements | ✓ | ✓ |
| Reconciliation — 26AS / AIS / GSTR import | **—** | ✓ |
| GST / TDS filing abstracts | **—** | ✓ |

### People
| Feature | Lite | Pro |
|---|---|---|
| Team & assignments | ◐ (≤3) | ✓ |
| Attendance | — | ✓ |
| HR — leaves & payroll | — | ✓ |
| Performance — ASPRF, scores, rewards | — | ✓ |
| Consultant / contractor directories | ◐ (≤10/5) | ✓ |

### Knowledge
| Feature | Lite | Pro |
|---|---|---|
| Knowledge Bank / Item Library | — | ✓ |
| Spec catalogue | — | ✓ |

### Collaboration & portals
| Feature | Lite | Pro |
|---|---|---|
| Comments, critical notes, activity | ✓ | ✓ |
| Client portal | ◐ (1 project) | ✓ |
| Consultant (collaborator) portal | — | ✓ |
| Contractor portal (bids + running bills) | — | ✓ |

### AI — ESTI
| Feature | Lite | Pro |
|---|---|---|
| ESTI AI Studio / agent | **—** | ✓ (built-in Ollama; BYO provider per licence) |
| Cognition engine (dashboard) | **—** | ✓ |
| ESTICAD desktop AI / takeoff | — | ✓ |

> **AORMS-Lite has no AI / LLM / ML features.** In exchange for the free tier,
> Lite operational data — de-identified and aggregated — may be used to train our
> AI/LLM/ML models. The paid edition (Pro) and self-hosted deployments are
> excluded and never used for training. This is disclosed in the Terms of
> Service (§4) and is the legal basis for the free tier.

### Admin & governance
| Feature | Lite | Pro |
|---|---|---|
| Company, users, settings | ✓ (3 users) | ✓ |
| Roles / access tiers | ◐ (owner + 2) | ✓ full ladder |
| Immutable audit log | — | ✓ + export |
| Companion / ESTICAD device API | — | ✓ |
| SSO, API access, multi-office, white-label | — | ✓ |
| Priority support / SLA | — | ✓ |

## Pricing & deployment

| Edition | Pricing | Hosting | How to start |
|---|---|---|---|
| **Lite** | **Free** | Cloud (shared) | **Self-signup** on the landing page |
| **Pro** | **Contact for pricing** | **Cloud — dedicated VM** (4 vCPU · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth · 1 snapshot · weekly backups · dedicated IP) **or self-hosted / on-premises** (deployed on your infrastructure) | Contact form on the landing page |

## The upgrade story (what pulls Lite → Pro)

- **Lite → Pro** when the firm crosses the **GST threshold**:
  the moment they need GST-correct invoices (CGST/SGST/IGST, SAC, filing
  abstracts) and 26AS/AIS/GSTR reconciliation, revision intelligence to defend
  fees, HR/payroll, or a 4th team member / 11th client.
- Pro also carries everything a firm needs at **scale & governance**: many
  offices, unlimited seats, SSO, the ESTICAD/API integration, audit export,
  white-label — there is no separate higher edition.

## Enforcement (implementation approach)

1. **`plan` on the firm** — `LITE | PRO` (DB column on the firm/org record;
   defaults `LITE`). Legacy `CORE` / `ENTERPRISE` values are folded to `PRO` by
   `asPlan()`.
2. **Feature gate** — `planAllows(plan, feature)` in `packages/contracts`
   (sibling to `can(role, capability)`); a procedure tier `planProcedure(feature)`
   in `backend/src/trpc/trpc.ts` returns `PAYMENT_REQUIRED`/`FORBIDDEN` below tier.
3. **Quota gate** — on create mutations (team/client/contractor/project), count
   existing rows and block at the cap with an upgrade-prompt error code.
4. **Frontend** — hide/disable gated nav + show upgrade chips; the plan flows from
   `auth.me` (like `isSystemAdmin`) so the SPA renders the right edition.
5. **Reuse the build variants** — the firm product (`VITE_PUBLIC_SITE=false`) is
   orthogonal; plan gating works in both the demo and firm builds.
