# AORMS — Navigation Architecture (Canonical V3)

**Status:** Canonical navigation IA · **Owner:** Holagundi Consulting Works ·
**Adopted:** 2026-06-29 · **Shell sync:** 2026-07-10

> This document is the **single source of truth for navigation** — where modules
> live in the shipped chrome, and naming. Where any other doc disagrees, **this
> wins**. For *what code exists today* the authority remains
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state"; the two
> are reconciled here via the **Status** column.
>
> **AORMS is a consultancy-only practice system.** Construction-delivery modules
> (PMC, Construction, Programme, Tenders) and mood boards are **removed**.
>
> **Spatial model (HCW-UI-Kit):** glass **ribbon** (top) · **rail** (20%) · **stage**
> (80%) · **ActionDock** (bottom-centre CTAs) · glass **taskbar footer**. See
> [HCW-UI-KIT.md](HCW-UI-KIT.md) · UX rationale: [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md).

## Status legend
| Tag | Meaning |
|---|---|
| ✅ | **Built** — code exists, reachable in its V3 home |
| 🚧 | **Partial / rebuilding** — exists in a different shape or under active rebuild |
| 🔲 | **Planned** — not built yet (no primary nav slot until live) |

## Shipped chrome (source of truth: `frontend/src/App.tsx`)

### Ribbon (top) — `nav` tree
Four sections (capability-gated):

| Item | Kind | Destinations |
|---|---|---|
| **Projects** | link | `/projects` |
| **Clients** | link | `/clients` (write capability) |
| **Teams** | menu | Teams · Performance · HR |
| **Office** | menu (2 labelled groups — Hick/Miller) | **Office:** Leads · Proposals · Documents · Contracts · Letters · **Finance:** Invoices · Reconcile · Cashbook · Expenses · Payroll · Financial Reports |

**Capability gates (ribbon pruning — source: `App.tsx`):**

| Item | Gate |
|---|---|
| **Clients** | `write` capability |
| **Teams** menu | `hrEnabled` firm setting — when off, the whole menu is pruned |
| Teams › Performance | `hrEnabled` + rank ≥ 60 |
| Teams › HR | `hrEnabled` + `hr:manage` |
| Office › Leads, Documents, Contracts, Letters | `write` |
| Office › Proposals | `fees:manage` |
| Finance › Invoices, Reconcile, Cashbook, Expenses | `invoice:manage` |
| Finance › Payroll | `hrEnabled` + `hr:manage` |
| Finance › Financial Reports | `reports:view` |

### Admin hamburger (ribbon) — `adminGroups`
| Group | Destinations |
|---|---|
| **Third Parties** | Consultants · Contractors · Vendors (Clients promoted to ribbon) |
| **Library** | Spec catalogue · Standard items · Compliance · Master Plans · Standards · Knowledge Bank portal |
| **Admin** | Archived projects · System (system admin) |

### Taskbar footer (centre launchers)
Studio Intelligence (`/`) · Tasks (`/tasks`) · **Search** (`/search`, Ctrl/Cmd+K) · Ask ESTI · Wellness · Pomodoro. Tray: clock · alerts · ID card · sign out.

### Not in ribbon (by design)
| Destination | How to reach |
|---|---|
| Studio Intelligence | Footer launcher or `/` |
| Tasks | Footer launcher or `/tasks` |
| Search | Footer Search or Ctrl/Cmd+K |
| LXOS | Direct `/lxos` (Lessons live; other layers Coming soon) |
| AI Studio | `/office/ai-studio` (plan + rank ≥ 60) |
| Estimation workspace | **Removed from nav** — `/estimation*` redirects to `/projects`. Measurement lives under Project → Measurement |

---

## 1. Studio Intelligence ✅
Route `/` · File `StudioAbstract.tsx` · tRPC `dashboard.*`. Glass rail + stage.
Tabs and KPI layout follow the live `StudioAbstract` implementation (rail telemetry +
stage tabs). Alert glyphs: ● circle (stable) · ▲ triangle (watch) · ■ square (critical).

## 2. Projects ✅
Active Projects ✅ (`/projects`) → Project Details ✅ (`/projects/:id`).

**Two-level tabs (Setup · Project workspace)** — section nav lives in the **glass rail** (2026-07-10); stage shows one panel at a time (no double horizontal tab bars):

| Group | Primary tabs | Nested (in-panel) |
|---|---|---|
| Setup | Overview · Brief · Settings | Brief → Project Info \| Pipeline \| Program \| **R&O** \| CPI |
| Project workspace | Measurement · Drawings & approvals · Documents · Invoices · Team · Delivery · Lessons | Drawings → Drawings \| Transmittals \| Approvals; Documents → Documents \| Specs; Delivery → Site \| Comms \| Minutes |

Legacy `?tab=` deep links (`info`, `pipeline`, `site-visits`, `approvals`, `invoices`, …) redirect to the new parent slug while preserving `approvalId` / `invoiceId` when present.

**Cost Management / Estimation:** `/estimation` → `/projects`; `/estimation/:id` → `/projects/:id?tab=measurement`. CMS modules in `components/cms/` are not project tabs. Measurement is the live quantity surface.

## 3. Tasks ✅
Work hub (`/tasks`). Tabs (2026-07-11, Miller — max 7 for a full-permission user):
Tasks · Board · Calendar · Workload (HR) · Activity · **Requests** (client +
consultant queues stacked in one tab; legacy `?tab=client-requests` /
`consultant-requests` alias to it) · Attendance (HR).
Priority Engine 🚧 → ESTI Pulse — [ESTI-PULSE.md](ESTI-PULSE.md).

## 4. AI Studio 🚧
Route `/office/ai-studio` — plan-gated, rank ≥ 60. Not a ribbon item.

## 5. Library ✅ (admin menu)
| Module | Status | Where |
|---|---|---|
| Specification catalogue | ✅ | `/libraries/spec-catalog` |
| Standard items library | ✅ | `/libraries/items` — unpriced takeoff vocabulary (code/UOM/measure-kind) feeding Plan Markup + Measurement Sheet |
| Rate Books | ✅ (2026-07-18) | `/libraries/rate-books`, `fees:manage` gated — firm item-code/unit/**rate** sets pricing the project **Estimation** tab (BOQ + contingency/GST); ported from Construction-Billing-System, estimation-only (no Contracts/Running-Bills). Distinct from the Standard items library above (no pricing there) — not yet cross-linked, see the note under Projects §2 |
| Compliance Library | ✅ | `/libraries/compliance` |
| Master Plan Library | ✅ | `/libraries/master-plans` |
| Standards Library | ✅ | `/libraries/standards` |
| Knowledge Bank portal | ✅ | `/libraries/knowledge-bank-portal` (staff L4+, EOMS intake) |

## 6. Studio (Teams menu)
| Module | Status | Where |
|---|---|---|
| Teams | ✅ | `/team` |
| Performance | ✅ | `/performance` |
| HR | ✅ | `/hr` |

## 7. Third Parties (admin menu)
| Module | Status | Where |
|---|---|---|
| Clients | ✅ | `/clients` |
| Consultants | ✅ | `/consultants` |
| Contractors | ✅ | `/contractors` |
| Vendors | 🚧 | `/vendors` |

## 8–9. Office + Finance (Office ribbon menu)
One trigger, **two labelled ListSubheader groups** (2026-07-11, Hick/Miller — the
flat list had reached 11 items): **Office** (Leads · Proposals · Documents ·
Contracts · Letters) and **Finance** (Consultancy Invoices · Reconcile · Cashbook ·
Office Expenses · Payroll · Financial Reports `/filing`) — capability-gated as in
`App.tsx`; empty groups are pruned per role.

## 10. LXOS 🚧
Route `/lxos` (`/leos` redirects). Single-page (no tabs — Parkinson / Goal Gradient,
avoid placeholder tab exploration): **Lessons Learned ✅** and the **Academy ✅**
(`AcademyPanel` — `docs/holagundi/SOP.md`'s 27 SOPs as theory/mark-read + practical,
auto-detected from real usage for 13, self-attested for 14; completion pushes a
portable growth event `hlp_growth_event` for I-5-linked users) are both live primary
sections. Community Exchange · Professional Identity remain 🔲 behind a single
"Coming soon" notice, not shown as empty tabs.

## 11. Admin & account portals
| Module | Status | Where |
|---|---|---|
| Personal account | ✅ | `/account` |
| Company account | ✅ | `/company-account` |
| Legacy redirects | ✅ | `/company`, `/users`, `/audit`, `/settings`, `/profile` → portals |
| System admin | ✅ | `/system-admin` |

---

## Header / footer utilities

| Utility | Status | Today |
|---|---|---|
| Global Search | ✅ | Footer Search + Ctrl/Cmd+K → `/search` |
| Skip to main | ✅ | `.esti-skip-link` → `#esti-main` |
| Notifications | ✅ | `AlertsBell` → `/alerts` |
| User Profile | ✅ | Footer ID card → `/account#profile` |
| Calculator | ✅ | Footer · Alt+C |

---

## Removed (consultancy-only)
**PMC**, **Construction**, **Programme**, **Tenders**, **Mood boards** — routes redirect
to `/projects`. Top-level **Estimation** nav removed; `/estimation*` → `/projects`.

## Closing philosophy
AORMS is an **operating system for design studios**: work and learning coexist,
knowledge becomes infrastructure (LXOS), growth becomes measurable. Navigation chrome
stays **ribbon · rail · stage · ActionDock · footer** — improve within that model.
