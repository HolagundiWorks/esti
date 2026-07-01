# AORMS — Navigation Architecture (Canonical V3)

**Status:** Canonical navigation IA · **Owner:** Holagundi Consulting Works ·
**Adopted:** 2026-06-29

> This document is the **single source of truth for navigation** — the sidebar,
> module placement, and naming. Where any other doc disagrees, **this wins**. For
> *what code exists today* the authority remains
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state"; the two
> are reconciled here via the **Status** column.
>
> **AORMS is a consultancy-only practice system.** Construction-delivery modules
> (PMC, Construction, Programme, Tenders) and mood boards are **removed**.

## Status legend
| Tag | Meaning |
|---|---|
| ✅ | **Built** — code exists, reachable in its V3 home |
| 🚧 | **Partial / rebuilding** — exists in a different shape or under active rebuild |
| 🔲 | **Planned** — not built yet (placeholder where a nav slot exists) |

## Top-level menu (the `nav` tree in `frontend/src/App.tsx`)
`Studio Intelligence · Projects · Tasks · Studio · Third Parties · Office · Finance · LXOS · Admin`
Header utilities (not sidebar): **Global Search · Notifications · AI Assistant · User Profile**.

---

## 1. Studio Intelligence ✅ (tabs)
Route `/` · File `StudioAbstract.tsx` (component `StudioAbstract` — file/component name kept)
· tRPC `dashboard.*` (bundle stays named `dashboard`). Every tab shares one structure — a
header, **4 KPI cards**, then a **DataTable** that scrolls inside its Tile (the page never
scrolls; 100% width). Alert glyphs: ● circle (stable) · ▲ triangle (watch/friction) · ■
square (critical), each rendered in its alert colour (`zoneState.ts` + `abstractShell.tsx`).

| Tab | Status | Where |
|---|---|---|
| Overview | ✅ | `dashboard.home` — Studio + Summary **merged**; 4 KPIs + action-items table + right sidebar (**AI recommendation** over the **last-10 Office Log**) |
| Lead | ✅ | `Leads` route (the full lead register) |
| Project | ✅ | `dashboard.projectHealth` |
| Financial | ✅ | `dashboard.financialHealth` |
| Team | ✅ | `dashboard.teamIntelligence` |
| Work | ✅ | tasks today queue |
| Approval | ✅ | pending approvals |

Office Log is the **right sidebar** on Overview (not a tab); the old AI Remarks + Summary
Sheets tabs were folded into Overview.

## 2. Projects ✅
Active Projects ✅ (`/projects`) → Project Details ✅ (`/projects/:id`): Drawings ✅ ·
Documents ✅ · Site Progress ✅ · Project Timeline ✅. **Project Workspace tabs:**
Drawings ✅ · Documents ✅ (incl. **Final Estimation Records** ✅ — frozen CMS sets + PDF) · **Cost Management ✅** (Estimate ✅ · BOQ ✅ · Site Measurement ✅ · Work Orders ✅ · Contractor Bills ✅ · Cost Intelligence ✅ — material forecast + cost dashboard) · Site Progress ✅ ·
Project Discussions ✅ · Transmittals ✅ *(project-only — no office-wide view)*.

## 3. Tasks ✅
Assigned ✅ · Site Visits ✅ · Documentation ✅ · Revisions ✅ · Deadlines ✅ ·
Dependencies ✅ · Priority Engine 🚧 — mapped to the Work-hub (`/tasks`).

## 4. Studio
| Group → Module | Status | Where |
|---|---|---|
| **Libraries › Item Library** | ✅ | `/knowledge-bank` (Materials · Labour · Items · Brands · Specifications · Recipes · Brand Catalogue · **Import ✅** — paste/parse unstructured rate text, see `IMPORT_SPEC.md`) |
| **Libraries › Compliance Library** | ✅ | `/libraries/compliance` — structured: NBC · FAR · Setbacks · Fire · Regulations (CRUD) |
| **Libraries › Master Plan Library** | ✅ | `/libraries/master-plans` — PDF / DWG / zoning / development file uploads |
| **Libraries › Standards Library** | ✅ | `/libraries/standards` — by discipline (Interiors/Plumbing/Electrical/Lighting) + notes + files |
| Teams | ✅ | `/team` |
| Performance | ✅ | `/performance` |
| HR | ✅ | `/hr` |

## 5. Third Parties
| Module | Status | Where |
|---|---|---|
| Clients | ✅ | `/clients` (profile · projects · contracts · consultancy fees · invoices · comm log) |
| Consultants | ✅ | `/consultants` (discipline · projects · deliverables · fees · payments · coordination) |
| Contractors | ✅ | `/contractors` (profile · projects · site coordination · billing · payments · performance) |
| Vendors | 🚧 | `/vendors` placeholder page (greenfield): vendor categories · material categories · pricing history · quotations · supplier DB |

## 6. Office
| Module | Status | Where |
|---|---|---|
| Proposals | ✅ | `/office/proposals` — **unified** COA fee proposals + scope agreements (one `esti_proposal` model) |
| Contracts | ✅ | `/office/contracts` (firm↔client; not shown in the project workspace) |
| Letters | ✅ | `/office/letters` |

## 7. Finance
| Module | Status | Where |
|---|---|---|
| Consultancy Invoices | ✅ | `/invoices` |
| Cashbook | ✅ | `/accounting/cash-book` |
| Office Expenses | ✅ | `/accounting/office-expenses` |
| Payroll | ✅ | `/finance/payroll` (payslip list / generate / mark-paid; `payroll` namespace) |
| Financial Reports | 🚧 | `/filing` (GST/TDS) + reports |

## 8. LXOS — Learning Exchange Operating System
Renamed from LEOS. Placeholder pillar (`/lxos`, `Lxos.tsx`; `/leos` redirects). 4 layers:
| Layer | Status | Contents |
|---|---|---|
| Internal Exchange (firm-private) | 🚧 | **Lessons Learned ✅ live** (`LessonsBank` in the LXOS Internal Exchange tab; moved out of Item Library). Documentation Exchange · Internal Blogs · Whiteboard Studio · Knowledge Notes still 🔲 |
| Community Exchange (cross-firm) | 🔲 | Case studies · documentation showcase · architecture blogs · technical/standards discussions · vendor reviews · templates exchange · research papers · open discussions |
| Professional Identity | 🔲 | AORMS ID · role · knowledge contributions · community reputation · articles · templates · contribution history *(shared with User Profile)* |
| Certification & Growth | 🔲 | AORMS certification (Architect/HR/Finance/Operations) · skill assessments · levels (Foundation/Practitioner/Specialist/Master) · learning history *(shared with User Profile)* |

## 9. Admin
| Module | Status | Where |
|---|---|---|
| Company | ✅ | `/company` |
| Users | ✅ | `/users` |
| Licensing | 🚧 | in Company (`LicensePanel`) |
| Audit Logs | ✅ | `/audit` |
| Settings | ✅ | `/settings` |

---

## Header utilities

| Utility | Status | Today |
|---|---|---|
| Global Search | ✅ | header Search action → `/search` |
| Notifications | ✅ | `AlertsBell` → `/alerts` |
| AI Assistant | ✅ | "Ask ESTI" + header AI Studio action → `/office/ai-studio` |
| User Profile | 🚧 | `/profile` (`Profile.tsx`) — opened from the header ID card; see below |

### User Profile (AORMS Identity Layer)
Opened from the header; expands today's `Settings.tsx`.
| Section | Status | Notes |
|---|---|---|
| Personal Profile | ✅ | name · photo · email · mobile · department · designation · joining date |
| AORMS Identity | 🔲 | AORMS Unique ID (e.g. `AORMS-IND-000245`) · professional role · firm mapping |
| AORMS Certification | 🔲 | tracks ACA/ACE/ACC/ACOM/ACFM/ACO × levels (Foundation→Master) · history *(shared with LXOS)* |
| AORMS Index | 🔲 | overall · knowledge contribution · skill · platform competency · community reputation scores |
| Work Profile | ✅ | `userProfile.workSummary` — assigned projects · open/done tasks · days-present (30d) |
| LXOS Profile | 🔲 | blogs · learnings shared · contributions · templates · discussions |
| Notifications · Activity History · Preferences (Theme · Dashboard Layout · Notification prefs · Security) · Logout | ✅ | current `Settings.tsx` + header |

---

## Removed (consultancy-only)
Not in V3; routes redirect or are gone: **PMC**, **Construction**, **Programme**,
**Tenders**, **Mood boards** (`/pmc`,`/programme`,`/office/construction` → `/projects`).
Growth OS dissolved (Leads → Studio Abstract "Lead Register" tab). Fee proposals + the thin proposal →
unified **Proposals**.

## Build-vs-placeholder policy
**Built/wired:** the V3 menu, Studio Abstract Lead Register tab, Proposals merge, removals, LXOS
rename. **Build fully (Stage 2):** the 3 new Libraries (Compliance, Master Plan,
Standards). **Now built:** Cost Management (CMS-1→8) · Vendors (directory + pricing + quotations) ·
KB text-import (`docs/esti/IMPORT_SPEC.md`). **Placeholder / follow-on builds:** Payroll ·
LXOS exchange layers, and the User-Profile/LXOS identity·certification·index
subsystems. See [ROADMAP.md](ROADMAP.md) and [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md).

## Closing philosophy
AORMS is an **operating system for design studios**: work and learning coexist,
knowledge becomes infrastructure (LXOS), growth becomes measurable.
