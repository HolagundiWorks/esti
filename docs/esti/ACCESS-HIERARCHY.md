# ESTI AORMS — Access Hierarchy

> **Version:** 1.0 · **Date:** 2026-06-21  
> **Status:** Canonical — single source of truth (HCW) · **Reviewed:** 2026-06-25  
> This document is the single source of truth for role-based access control across all ESTI modules. Code changes to permissions must be reflected here first.
> **Implementation source:** [`packages/contracts/src/permissions.ts`](../../packages/contracts/src/permissions.ts). Supersedes the former `ACCESS-MODEL.md` (moved to `deprecated_review/`, 2026-06-25).

---

## 1. Role ladder

ESTI uses five internal staff levels plus a System Admin overlay. External portal users (CLIENT, CONSULTANT, CONTRACTOR) are outside this ladder and have their own portal-scoped access.

| Level | Role constant | Rank | Display title | Typical holder |
|---|---|---|---|---|
| **L1** | `OWNER` | 100 | Owner / Director / Principal | Firm founders, directors |
| **L2** | `PARTNER` | 80 | Partner / Finance & HR Lead | Senior partners, finance head |
| **L3** | `SENIOR` | 60 | Senior Architect / Project Lead | Project-in-charge, senior professional |
| **L4** | `ASSOCIATE` | 40 | Associate / Architect / Engineer | Mid-level professional |
| **L5** | `VIEWER` | 20 | Junior / Intern / Site Supervisor | Interns, execution-level staff |
| — | `SYSTEM_ADMIN` | overlay | Installation Administrator | HCW-provisioned super-user |

### System Admin overlay

`is_system_admin` is a boolean flag on the user record — independent of the role ladder. It does **not** grant any extra operational capabilities (invoices, HR, etc.); it unlocks only installation-management endpoints:

- Seed / import demo data
- Purge / reset the entire installation
- System release metadata (`system.*` tRPC namespace)
- Can hold any role rank — typically paired with OWNER

Regular OWNER accounts **cannot** seed or purge. Only `is_system_admin = true` users may.

### External portal roles (not in the staff ladder)

| Role | Portal | Rank |
|---|---|---|
| `CLIENT` | Client portal | 0 |
| `CONSULTANT` | Collaborator portal | 0 |
| `CONTRACTOR` | Contractor bid portal | 0 |

---

## 2. Capability map

Minimum rank required per capability (defined in `packages/contracts/src/permissions.ts`):

| Capability constant | Min rank | Granted to |
|---|---|---|
| `workspace:view` | 20 | L5+ — any staff |
| `write` | 40 | L4+ — associate and above |
| `project:financials` | 40 | L4+ — project budget / expense view *(currently unused — see §4)* |
| `invoice:manage` | 80 | L2+ — draft + issue invoices |
| `invoice:delete` | 80 | L2+ — delete draft/cancelled invoice |
| `fees:manage` | 80 | L2+ — view + edit fee proposals |
| `finance:ops` | 80 | L2+ — cash book, reconciliation, vendor financials |
| `project:delete` | 80 | L2+ — delete a whole project |
| `hr:manage` | 80 | L2+ — HR, payroll, leave management |
| `reports:view` | 80 | L2+ — GST/TDS filing abstracts |
| `firm:admin` | 100 | L1 only — firm profile, users, module toggles |
| `salary:view` | 100 | L1 only — view team salary and payslip amounts |
| `system:admin` | overlay | `is_system_admin = true` only |

> **New capability to add:** `salary:view` (rank 100) — currently payroll amounts are shown to anyone with `hr:manage`. Restrict salary figures to L1 only.

---

## 3. Dashboard — KPI strip

| KPI tile | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Ready to bill (₹) | ✅ | ✅ | — | — | — |
| Outstanding collections (₹) | ✅ | ✅ | — | — | — |
| Active projects (count) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance today | ✅ | ✅ | — | — | — |

**Gate:** `invoice:manage` (rank 80) for billing KPIs. Attendance: `hr:manage` (rank 80).

---

## 4. Dashboard — Action Center

| Action Center item | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Billing-ready phases | ✅ | ✅ | — | — | — |
| Overdue invoices | ✅ | ✅ | — | — | — |
| Pending approvals | ✅ | ✅ | ✅ | ✅ | — |
| Overloaded team members | ✅ | ✅ | — | — | — |
| At-risk projects | ✅ | ✅ | ✅ | — | — |

**Gates:**
- Billing / invoicing items: `invoice:manage` (L2+)
- Team overload: `hr:manage` (L2+)
- At-risk projects: rank ≥ 60 (L3+)
- Approvals: `write` (L4+)

---

## 5. Dashboard — content sections

| Section | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Financial health (revenue charts, receivables aging) | ✅ | ✅ | — | — | — |
| Client signals table | ✅ | ✅ | — | — | — |
| Team ASPRF performance cards | ✅ | ✅ | own card | — | — |
| Quality intelligence (CRIF, revision sources) | ✅ | ✅ | ✅ | — | — |
| Project health table (no financial signals) | ✅ | ✅ | ✅ | ✅ | — |
| Project health — billable / overdue invoice signals | ✅ | ✅ | — | — | — |
| Personal panel (my tasks, leave balance) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recent activity feed | ✅ | ✅ | ✅ | ✅ | — |

**Gates:** Financial section: `finance:ops` (L2+). Client signals: `invoice:manage` (L2+). Team ASPRF: `hr:manage` for full view; L3 sees own card only. Quality intelligence: rank ≥ 60 (L3+).

---

## 6. Project detail — tabs

| Tab | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| Overview / phases / brief | ✅ | ✅ | ✅ | ✅ | ✅ |
| Drawings & transmittals | ✅ | ✅ | ✅ | ✅ | view |
| Tasks | ✅ | ✅ | ✅ | ✅ | own only |
| Approvals | ✅ | ✅ | ✅ | ✅ | — |
| **Invoices tab** | ✅ | ✅ | — | — | — |
| **Costing / BOQ / Estimates** | ✅ | ✅ | — | — | — |
| **Fee proposal** | ✅ | ✅ | — | — | — |
| Site inspections | ✅ | ✅ | ✅ | ✅ | — |
| Documents / specs | ✅ | ✅ | ✅ | ✅ | view |
| Project settings (team, consultants) | ✅ | ✅ | ✅ | — | — |
| Revision intelligence (CRIF ledger) | ✅ | ✅ | ✅ | — | — |

**Gates:** Invoices/costing/fees: `invoice:manage` (L2+). Project settings: rank ≥ 60 (L3+). Approvals/inspections: `write` (L4+).

---

## 7. Navigation sidebar

> Module placement and naming follow [NAVIGATION.md](NAVIGATION.md) (the **Canonical
> V3** IA, consultancy-only, implemented as the nested sidebar in `App.tsx`). This
> section lists **what each level sees**, by V3 pillar. Each module is its own page
> (`/clients`, `/team`, `/hr`, …); LXOS is a placeholder (`/lxos`) until its feature
> build lands. Construction-delivery (PMC/Construction/Programme/tenders) is removed.

### Always visible (L5+)

- Dashboard (Overview, Leads Pipeline, Daily Activities, …)
- Projects · Tasks
- Studio → Libraries (Item Library), Teams (names and roles only)
- Admin → Settings (My profile)
- Header → Global Search, Notifications, User Profile

### L4+ (ASSOCIATE and above)

- Tasks → Client requests / Consultant requests tabs
- Third Parties → Clients (view only for L4)
- Office → Contracts (view only for L4), Letters

### L3+ (SENIOR and above)

- Tasks (full write access)
- Third Parties → Clients (full), Consultants, Contractors
- Studio → Performance (own ASPRF card only)
- (AI assistant — header)

### L2+ (PARTNER and above)

- **Finance:** Consultancy Invoices · Cashbook · Office Expenses · Payroll · Financial Reports
- Office → Proposals
- Studio → HR / Payroll
- Studio → Performance (full team view)
- Tasks → Workload, Attendance
- Admin → Archived projects

### L1 only (OWNER)

- Admin → Company settings (edit)
- Admin → Users
- Admin → Audit Logs
- Admin → Licensing
- Studio → HR → Salary amounts (read)

### System Admin overlay only

- Admin → Import demo data
- Admin → Purge / reset installation
- Admin → System release metadata

---

## 8. Payroll and salary visibility

| Feature | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| View salary amounts for all staff | ✅ | — | — | — | — |
| View payslip amounts for all staff | ✅ | — | — | — | — |
| Download own payslip PDF | — | ✅ | ✅ | ✅ | ✅ |
| View own net pay amount | — | ✅ | ✅ | ✅ | ✅ |
| Approve / reject leave requests | ✅ | ✅ | — | — | — |
| Create / edit HR records | ✅ | ✅ | — | — | — |
| View attendance register | ✅ | ✅ | — | — | — |

**Note:** L2 (PARTNER/Finance Lead) manages payroll processing but does not see individual salary figures — only the owner/director reviews compensation. If this is incorrect for a firm's workflow, the `salary:view` capability rank can be lowered to 80.

---

## 9. Inactive module behaviour

Modules are toggled in firm settings: `hrEnabled`, `financialEnabled`, `projectEnabled`.

| Level | Module OFF behaviour |
|---|---|
| L1 / L2 | Nav link visible but dimmed with tooltip "Not enabled — configure in Company settings" |
| L3 / L4 / L5 | Nav link **hidden entirely** — no indication the module exists |

This prevents L3–L5 users from asking about modules that are not part of their workflow.

---

## 10. Data seeding and purge — access rules

| Action | Who can trigger | UI location |
|---|---|---|
| Import demo data | `is_system_admin = true` only | Admin → System (hidden for all others) |
| Purge / reset installation | `is_system_admin = true` only | Admin → System |
| System release metadata | `is_system_admin = true` only | Admin → System |
| Module toggle (HR…) | `firm:admin` (L1) | Admin → Company settings |
| User management | `firm:admin` (L1) | Admin → Users |

Regular OWNER (`firm:admin`) accounts see Company settings and Users but **not** the System panel.

---

## 11. Implementation notes

### New capability to add in `permissions.ts`

```typescript
"salary:view": 100,   // L1 only — gross/net salary amounts, payslip ₹ values
```

### `is_system_admin` flag

Already exists on `esti_user` as `is_system_admin boolean NOT NULL DEFAULT false`.  
Backend check: `if (!ctx.user.isSystemAdmin) throw new TRPCError({ code: 'FORBIDDEN' })`.

### Project detail tab gating

Tabs rendered in `ProjectDetail.tsx`. Gate using `can(user.role, 'invoice:manage')` for Invoices / Costing / Fee proposal tabs. These tabs should not appear in the tab strip at all for L3–L5 — not just be disabled.

### ASPRF cards on dashboard

L3 SENIOR users see a single card scoped to their own `teamMemberId`. L2+ see all team cards. Implemented by filtering `aspQ.data` by `memberId === user.teamMemberId` when rank < 80.

### Quality intelligence section

Visible to L3+ (`rank >= 60`). CRIF revision ledger contains architectural decisions — relevant for project leads and above.

---

## 12. Change log

| Date | Change | Author |
|---|---|---|
| 2026-06-21 | Initial document — 5-level hierarchy confirmed | HCW / ESTI team |
| 2026-07-01 | Login email canonicalised on every account-creating path (`normalizeEmail` on write, `emailMatches` for case-insensitive lookup/uniqueness) — owner-created staff/portal/consultant logins can no longer be un-loginnable or case-duplicated. See ARCHITECTURE › Authorization. | HCW / ESTI team |
| 2026-07-01 | AORMS Identity **I-1** shipped: portable `AORMS-U-` (person) / `AORMS-C-` (company) handles on the licensing platform. Cross-company identity model lives in [AORMS-IDENTITY](AORMS-IDENTITY.md); this ladder (per-firm `esti_user`) is unaffected until the I-5 firm-user projection. | HCW / ESTI team |
| 2026-07-01 | AORMS Identity **I-2** shipped: tenant-first login on the platform — Step-1 company resolver, membership-scoped `hlp_session`, company switcher. Additive (legacy single-step platform-admin login unchanged). Still platform-side only; the firm `esti_user` login path is untouched until I-5. | HCW / ESTI team |
| 2026-07-01 | AORMS Identity **I-3** shipped: membership activation lifecycle (INVITED→ACTIVE→LEFT) with self-serve create/join/leave company (domain-match auto-activates, else pending approval) and admin member management. Only ACTIVE memberships may sign in. Platform-side; firm `esti_user` unaffected until I-5. | HCW / ESTI team |
| 2026-07-01 | AORMS Identity **I-4** shipped: portable certifications + growth events keyed to `AORMS-U` (survive across firms). Self view (`/auth/my-credentials`), admin issuance (`admin.certifications.*`). Growth `recordGrowth` is the ASPRF/LXOS seam. | HCW / ESTI team |
| 2026-07-01 | AORMS Identity **I-5** shipped: firm-user projection — `esti_user.account_public_id` links a firm login to a central person (AORMS-U) via owner `users.linkIdentity`; handle shown in Users + Profile. Identity **model** complete; delegating firm auth to the platform + the hybrid desktop offline-cache remain runtime follow-ups (see [AORMS-IDENTITY](AORMS-IDENTITY.md) §10). | HCW / ESTI team |
| 2026-07-01 | Delegated firm login shipped (opt-in, `ESTI_IDENTITY_DELEGATE`, default off): `auth.login` verifies against the platform (`/platform/v1/verify-login`) and projects the person onto a local `esti_user`, with offline fallback to the cached password. Licence authority wired to `aorms.in`. Existing installs unchanged until enabled. | HCW / ESTI team |
| 2026-07-01 | Two-factor authenticator (TOTP) added — platform accounts (`hlp_account.totp_secret`) and firm logins (`esti_user.totp_secret`). Self-service enable/disable (Console Security tile / firm Settings); login requires a valid code when 2FA is on. Shared engine `backend/src/lib/totp.ts` (RFC 6238). | HCW / ESTI team |
