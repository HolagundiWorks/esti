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
`Dashboard · Projects · Tasks · Studio · Third Parties · Office · Finance · LXOS · Admin`
Header utilities (not sidebar): **Global Search · Notifications · AI Assistant · User Profile**.

---

## 1. Dashboard ✅ (tabs)
| Tab | Status | Where |
|---|---|---|
| Overview | ✅ | `dashboard.home` |
| Leads Pipeline | ✅ | Dashboard "LEADS PIPELINE" tab (`Leads`) |
| Daily Activities | ✅ | `activity` |
| Notifications | ✅ | `notifications` / `/alerts` |
| Pending Approvals | ✅ | dashboard Approvals |
| Critical Deadlines | 🚧 | from tasks/phases due-soon |
| ESTI AI Insights | ✅ | dashboard AI |

## 2. Projects ✅
Active Projects ✅ (`/projects`) → Project Details ✅ (`/projects/:id`): Drawings ✅ ·
Documents ✅ · Site Progress ✅ · Project Timeline ✅. **Project Workspace tabs:**
Drawings ✅ · Documents ✅ · **Estimation OS 🔲 · BOQ 🔲** · Site Progress ✅ ·
Project Discussions ✅ · Transmittals ✅ *(project-only — no office-wide view)*.

## 3. Tasks ✅
Assigned ✅ · Site Visits ✅ · Documentation ✅ · Revisions ✅ · Deadlines ✅ ·
Dependencies ✅ · Priority Engine 🚧 — mapped to the Work-hub (`/tasks`).

## 4. Studio
| Group → Module | Status | Where |
|---|---|---|
| **Libraries › Item Library** | ✅ | `/knowledge-bank` (Materials · Labor · Specifications · **Rate Books 🔲 · Estimation Intelligence 🔲**) |
| **Libraries › Compliance Library** | 🔲 | NBC Rules · FAR Rules · Setbacks · Fire Compliance · Regulations |
| **Libraries › Master Plan Library** | 🔲 | PDF · DWG · Zoning Plans · Development Plans |
| **Libraries › Standards Library** | 🔲 | Interiors · Plumbing · Electrical · Lighting (Technical Notes · Drawings · Standard Details) |
| Teams | ✅ | `/team` |
| Performance | ✅ | `/performance` |
| HR | ✅ | `/hr` |

## 5. Third Parties
| Module | Status | Where |
|---|---|---|
| Clients | ✅ | `/clients` (profile · projects · contracts · consultancy fees · invoices · comm log) |
| Consultants | ✅ | `/consultants` (discipline · projects · deliverables · fees · payments · coordination) |
| Contractors | ✅ | `/contractors` (profile · projects · site coordination · billing · payments · performance) |
| Vendors | 🔲 | vendor categories · material categories · pricing history · quotations · supplier DB |

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
| Payroll | 🚧 | from `team/hr.ts` payroll → `/finance/payroll` (planned) |
| Financial Reports | 🚧 | `/filing` (GST/TDS) + reports |

## 8. LXOS — Learning Exchange Operating System
Renamed from LEOS. Placeholder pillar (`/lxos`, `Lxos.tsx`; `/leos` redirects). 4 layers:
| Layer | Status | Contents |
|---|---|---|
| Internal Exchange (firm-private) | 🔲 | Project Learnings (site · design decisions · revisions · **Lessons Learned — wire `LessonsBank` ✅**) · Documentation Exchange · Internal Blogs · Whiteboard Studio · Knowledge Notes |
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
| User Profile | 🚧 | see below |

### User Profile (AORMS Identity Layer)
Opened from the header; expands today's `Settings.tsx`.
| Section | Status | Notes |
|---|---|---|
| Personal Profile | ✅ | name · photo · email · mobile · department · designation · joining date |
| AORMS Identity | 🔲 | AORMS Unique ID (e.g. `AORMS-IND-000245`) · professional role · firm mapping |
| AORMS Certification | 🔲 | tracks ACA/ACE/ACC/ACOM/ACFM/ACO × levels (Foundation→Master) · history *(shared with LXOS)* |
| AORMS Index | 🔲 | overall · knowledge contribution · skill · platform competency · community reputation scores |
| Work Profile | 🚧 | assigned projects · active/completed tasks · attendance/work-hours · performance (aggregate existing) |
| LXOS Profile | 🔲 | blogs · learnings shared · contributions · templates · discussions |
| Notifications · Activity History · Preferences (Theme · Dashboard Layout · Notification prefs · Security) · Logout | ✅ | current `Settings.tsx` + header |

---

## Removed (consultancy-only)
Not in V3; routes redirect or are gone: **PMC**, **Construction**, **Programme**,
**Tenders**, **Mood boards** (`/pmc`,`/programme`,`/office/construction` → `/projects`).
Growth OS dissolved (Leads → Dashboard tab). Fee proposals + the thin proposal →
unified **Proposals**.

## Build-vs-placeholder policy
**Built/wired:** the V3 menu, Dashboard Leads tab, Proposals merge, removals, LXOS
rename. **Build fully (Stage 2):** the 3 new Libraries (Compliance, Master Plan,
Standards). **Placeholder / follow-on builds:** Estimation OS · BOQ · Rate Books ·
Estimation Intelligence (the separate Estimation-OS rebuild), Vendors, Payroll,
LXOS exchange layers, and the User-Profile/LXOS identity·certification·index
subsystems. See [ROADMAP.md](ROADMAP.md) Phase 32 and the implementation plan.

## Closing philosophy
AORMS is an **operating system for design studios**: work and learning coexist,
knowledge becomes infrastructure (LXOS), growth becomes measurable.
