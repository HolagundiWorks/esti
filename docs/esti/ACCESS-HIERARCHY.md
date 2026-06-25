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
| Open tenders | ✅ | ✅ | ✅ | — | — |
| Open construction coordination | ✅ | ✅ | ✅ | ✅ | — |
| Overloaded team members | ✅ | ✅ | — | — | — |
| At-risk projects | ✅ | ✅ | ✅ | — | — |

**Gates:**
- Billing / invoicing items: `invoice:manage` (L2+)
- Team overload: `hr:manage` (L2+)
- Tenders: `write` + rank ≥ 60 (L3+, new `tenders:view` or inline rank check)
- At-risk projects: rank ≥ 60 (L3+)
- Approvals / construction: `write` (L4+)

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
| PMC / programme | ✅ | ✅ | ✅ | view | — |
| Documents / specs / mood boards | ✅ | ✅ | ✅ | ✅ | view |
| Project settings (team, consultants) | ✅ | ✅ | ✅ | — | — |
| Revision intelligence (CRIF ledger) | ✅ | ✅ | ✅ | — | — |

**Gates:** Invoices/costing/fees: `invoice:manage` (L2+). Project settings: rank ≥ 60 (L3+). Approvals/inspections: `write` (L4+).

---

## 7. Navigation sidebar

### Always visible (L5+)

- Dashboard
- Projects (list)
- Work → Tasks / Board / Calendar / Activity
- Knowledge Bank
- Alerts
- Admin → My profile / Settings
- People → Team (names and roles only)

### L4+ (ASSOCIATE and above)

- Work → Client requests tab
- Work → Consultant requests tab
- People → Clients (view only for L4)
- Office → Documents, Letters, Contracts (view only for L4)

### L3+ (SENIOR and above)

- Work → (full write access on tasks)
- People → Clients (full)
- People → Consultants
- People → Contractors
- Programme
- Office → Tenders (view only for L3; write for L2+)
- Office → AI Studio
- People → Performance (own ASPRF card only)

### L2+ (PARTNER and above)

- **Accounting group:**
  - Invoices
  - Office expenses
  - Cash book
  - Reconciliation
  - Fee proposals
  - GST / TDS filing
- Office → Proposals
- Office → Tenders (full write)
- People → HR / Payroll
- People → Performance (full team view)
- Work → Workload
- Work → Attendance
- Admin → Archived projects

### L1 only (OWNER)

- Admin → Company settings (edit)
- Admin → Users
- Admin → Audit log
- People → HR → Salary amounts (read)

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

Modules are toggled in firm settings: `hrEnabled`, `pmcEnabled`, `financialEnabled`, `projectEnabled`.

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
| Module toggle (HR, PMC…) | `firm:admin` (L1) | Admin → Company settings |
| User management | `firm:admin` (L1) | Admin → Users |

Regular OWNER (`firm:admin`) accounts see Company settings and Users but **not** the System panel.

---

## 11. Implementation notes

### New capability to add in `permissions.ts`

```typescript
"salary:view": 100,   // L1 only — gross/net salary amounts, payslip ₹ values
"tenders:view": 60,   // L3+ — read access to tender list and documents
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
