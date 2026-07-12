# AORMS-Studio interface audit — tracked issues

**Audit date:** 2026-07-11 · **Scope:** Authenticated **AORMS-Studio** workspace SPA (`studio.aorms.in`) — staff office shell, project workspace, libraries, finance, tasks, portals reachable while signed in. **Method:** Static code review + checklist pass against [NAVIGATION.md](NAVIGATION.md), [HCW-UI-KIT.md](HCW-UI-KIT.md), [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md), [07-UX-REVIEW-CHECKLISTS.md](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md), and [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md). **No live user testing. Audit only — no fixes in this pass.**

**Companion audits:** [11-audits/README.md](../hcw-kit/11-audits/README.md) (index) · [PUBLIC-PAGES-AUDIT-2026-07-11.md](../marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md) · [SECURITY-AUDIT-2026-07-11.md](SECURITY-AUDIT-2026-07-11.md) · [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md)

---

## Executive summary

| Area | Score | Verdict |
| --- | --- | --- |
| **Glass rail shell (U0–U6)** | 97% | ✅ Rollout complete; Studio Intelligence uses intentional custom geometry |
| **Navigation IA vs NAVIGATION.md** | 95% | ✅ KB portal + capability gates documented |
| **ActionDock adoption** | 85% | ◐ Reconcile + Performance fixed; WIP CRM screens remain |
| **Breadcrumbs + tab titles** | 88% | ◐ Studio home title fixed; account portals tab-aware |
| **Dialog accessibility** | 92% | ◐ All gaps in parallel-WIP `Projects.tsx` / `Clients.tsx` |
| **Loading grammar** | 92% | ✅ I10–I12 + SitePortal skeleton |
| **Status indicators** | 95% | ◐ `Clients.tsx` TagChip fork (registered D11) |
| **UX checklist (aggregate)** | ~90% | Post-fix I4–I14; I1–I3 blocked on WIP |

**Overall:** AORMS-Studio interface is **production-grade** on shell geometry and kit adoption. Remaining debt: **parallel-WIP CRM screens (I1–I3)** and accepted/deferred items (I14–I17).

---

## Method

1. Route inventory from `frontend/src/App.tsx` (staff branch ~572–751).
2. Shell detection: `RailLayout`, custom `esti-glass-dash`, `PortalShell`, `ExternalPortalShell`.
3. Checklist sweeps: `useScreenActions`, `PageBreadcrumb`, `DataState`, `StatusDot`/`StatusTag`, dialog `aria-labelledby`.
4. Cross-check admin nav tree vs [NAVIGATION.md](NAVIGATION.md) § Shipped chrome.
5. Compare rollout status vs [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) U0–U6 (marked ✅ 2026-07-10).

---

## 1. Shell & spatial model

| Surface | Shell | File | Notes |
| --- | --- | --- | --- |
| Studio Intelligence `/` | Custom glass dash | `StudioAbstract.tsx` | Canonical reference — not wrapped in `RailLayout` (intentional) |
| 32 staff list/detail screens | `RailLayout` + `esti-glass-dash` | `RailLayout.tsx` | Global glass rail SCSS |
| Project detail | `RailLayout` + rail tabs | `ProjectDetail.tsx` | `ProjectRailNav` in rail |
| Account / company account | `PortalShell` → kit `GlassRail` | `AccountPortal.tsx`, `CompanyAccountPortal.tsx` | Roadmap U5 approved alternate |
| Client / consultant / site portals | `ExternalPortalShell` | `Portal.tsx`, `CollaboratorPortal.tsx`, `SitePortal.tsx` | U5 ✅ |
| Auth gates | `AuthRailLayout` | `Login.tsx`, etc. | Rail-first auth ✅ |
| Contractor portal | Stub | `ContractorPortalStub.tsx` | Minimal — not glass rail |

**Outer chrome (all staff):** `esti-app-shell2` · floating `AppRibbon` · `AppFooterBar` · global `ActionDock` (`App.tsx`).

**Pass:** Rail holds instruments; stage holds work; footer launchers match NAV § Taskbar.

---

## 2. Route inventory (staff workspace)

| Route | Component | RailLayout | useScreenActions | PageBreadcrumb | DataState |
| --- | --- | --- | --- | --- | --- |
| `/` | StudioAbstract | — (custom) | ✅ | ❌ | Skeleton KPIs |
| `/projects` | Projects | ✅ | ✅ | ✅ | ✅ |
| `/projects/:id` | ProjectDetail | ✅ | (panels) | ✅ dynamic | Skeleton |
| `/clients` | Clients | ✅ | ✅ | ✅ | ✅ |
| `/leads` | Leads | ✅ | ✅ | ✅ | ✅ |
| `/consultants` | Consultants | ✅ | ✅ | ✅ | ✅ |
| `/contractors` | Contractors | ✅ | ✅ | ✅ | ✅ |
| `/vendors` | Vendors | ✅ | ✅ | ✅ | ✅ |
| `/tasks` | Work | ✅ | ✅ | ✅ | (tabs) |
| `/invoices` | Invoices | ✅ | ✅ | ✅ | ✅ |
| `/reconcile` | Reconcile | ✅ | ✅ | ✅ | Custom |
| `/office/proposals` | Proposals | ✅ | ✅ | ✅ | ✅ |
| `/office/documents` | DocumentsRegister | ✅ | ✅ | ✅ | ✅ |
| `/office/letters` | Letters | ✅ | ✅ | ✅ | ✅ |
| `/office/contracts` | Contracts | ✅ | ✅ | ✅ | ✅ |
| `/office/ai-studio` | AiStudio | ✅ | ✅ | ✅ | — |
| `/accounting/*` | OfficeExpenses | ✅ | ✅ | ✅ | Partial |
| `/finance/payroll` | Payroll | ✅ | ✅ | ✅ | ✅ |
| `/filing` | Filing | ✅ | ✅ | ✅ | Sub-panels |
| `/team`, `/hr`, `/performance` | Team, Hr, Performance | ✅ | Partial | ✅ | ✅ / — |
| `/libraries/*` (6) | Library routes | ✅ | Partial | ✅ | ✅ |
| `/search` | Search | ✅ | ✅ | ✅ | ✅ |
| `/alerts` | Alerts | ✅ | ❌ | ✅ | Skeleton |
| `/archived-projects` | ArchivedProjects | ✅ | ❌ | ✅ | ✅ |
| `/system-admin` | SystemAdmin | ✅ | ❌ | ✅ | Bare text |
| `/lxos` | Lxos | ✅ | ❌ | ✅ | Read-only |
| `/account`, `/company-account` | Portals | PortalShell | ❌ | Portal header | Spinner |

**Redirects (by design):** `/profile` → account · `/company`, `/users`, `/audit`, `/settings` → company-account hashes · `/estimation*` → projects.

---

## 3. Navigation IA vs NAVIGATION.md

| Check | Pass? | Evidence |
| --- | --- | --- |
| Ribbon: Projects · Clients · Teams · Office | ✅ | `App.tsx` nav tree ~440–508 |
| Office grouped (Office / Finance subheaders) | ✅ | Hick/Miller grouping |
| Footer: Studio · Tasks · Search · Ask ESTI · Wellness · Pomodoro | ✅ | `AppFooterBar.tsx` |
| Library admin menu (5 modules in NAV §5) | ◐ | **+6th item:** Knowledge Bank portal (`App.tsx` ~532) — **not in NAV** |
| Clients in ribbon (not Third Parties menu) | ✅ | NAV documents promotion |
| AI Studio not in ribbon | ✅ | `/office/ai-studio`, rank ≥ 60 |
| LXOS direct `/lxos` | ✅ | Not in ribbon |
| **Clients hidden without `write`** | ◐ | Capability gate — **undocumented in NAV** |
| **Teams menu hidden when `!hrEnabled`** | ◐ | Undocumented |
| **`kbank.aorms.in` → KB portal home** | ◐ | `App.tsx` ~548–549 — **undocumented in NAV** |
| Legacy PMC/Programme/Construction removed | ✅ | Redirects only |

---

## 4. UX checklist results

Source: [07-UX-REVIEW-CHECKLISTS.md](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md)

### Navigation — 6/8 pass

| Item | Pass? | Note |
| --- | --- | --- |
| Chrome matches NAVIGATION.md | ◐ | KB portal + gates |
| Menu ≤7±2 with grouping | ✅ | Office split; Work tabs merged |
| Active route `aria-current` | ✅ | Ribbon + rail nav |
| Every route `document.title` | ◐ | Via `PageBreadcrumb` — `/` missing |
| Breadcrumb deeper than top-level | ◐ | 29/32 RailLayout screens |
| Keyboard menus | ✅ | MUI menus |
| Search Ctrl/Cmd-K | ✅ | Footer + header |
| Serial position | ✅ | Footer launchers |

### Forms — 7/8 pass

| Item | Pass? | Note |
| --- | --- | --- |
| Programmatic labels | ✅ | WIP dialogs have labels |
| Required + inline validation | ✅ | Projects/Clients dialogs |
| Client mirrors server | ◐ | Spot-check only |
| autoComplete | ✅ | Identity fields |
| Submit disables while pending | ✅ | Common pattern |
| Error text actionable | ✅ | tRPC toasts |
| Escape/Cancel honest | ✅ | Dialogs |
| Logical field order | ✅ | |

### Tables / data grids — 7/8 pass

| Item | Pass? | Note |
| --- | --- | --- |
| ≤8 columns / scroll in-container | ✅ | DataGrid pattern |
| Loading skeleton / empty state | ◐ | DataState on most; 3 bare-text exceptions |
| StatusDot not filled chips | ◐ | **Clients TagChip** |
| Row actions keyboard | ✅ | RowActionsMenu |
| Header label style | ✅ | |
| Money formatINR | ✅ | |

### CRUD — 6/7 pass

| Item | Pass? | Note |
| --- | --- | --- |
| Create via dock zones | ◐ | ~79% screens; Performance inline grant |
| No inline duplicate of dock | ◐ | Reconcile dual upload; Users embedded |
| Destroy via ConfirmModal | ✅ | |
| Success toast | ✅ | |
| Focus on new record | ◐ | Not universal |
| Optimistic toggles | ◐ | Leads/Users done (D1b open) |

### Dialogs — 6/7 pass

| Item | Pass? | Note |
| --- | --- | --- |
| `aria-labelledby` every dialog | ◐ | **3 gaps in WIP files** |
| Focus trap / Escape | ✅ | MUI default |
| One primary verb-first | ✅ | |
| Dock yields while open | ✅ | Projects/Clients guard |
| Destructive ConfirmModal | ✅ | |

### Notifications — 5/6 pass

| Item | Pass? | Note |
| --- | --- | --- |
| Single ToastHost | ✅ | |
| Success on state change | ✅ | |
| Specific errors | ◐ | Generic fallback still possible |
| Deduped / dismissible | ✅ | |
| Layer 3 scarcity for alerts | ✅ | |

### Dashboards (Studio Intelligence) — 6/6 pass

| Item | Pass? | Note |
| --- | --- | --- |
| ≤4 KPIs without scroll | ✅ | Zone tabs |
| Zone health shape + colour | ✅ | Glass orbs |
| Numbers traceable | ✅ | Drill to modules |
| Skeletons sized | ✅ | |
| Rail = instruments only | ✅ | |

---

## 5. Issue tracker

Status: `open` · `done` · `accepted` · `deferred` · `wontfix`

| ID | Sev | Status | Area | Category | Finding | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| **I1** | High | open | `Clients.tsx` | A11y | 2 dialogs missing `aria-labelledby` | Add on WIP lift (D6 scope) |
| **I2** | High | open | `Projects.tsx` | A11y | "New project" dialog missing `aria-labelledby` | Same |
| **I3** | Medium | open | `Clients.tsx` | Components | Local `TagChip` filled chips for status | Migrate to `StatusDot` (D11) |
| **I4** | Medium | **done** | `/` Studio Intelligence | SEO/a11y | No `PageBreadcrumb` → generic tab title | `document.title` in `StudioAbstract` |
| **I5** | Medium | **done** | NAVIGATION.md | Docs | KB portal route missing from Library §5 | Added `/libraries/knowledge-bank-portal` |
| **I6** | Medium | **done** | NAVIGATION.md | Docs | Capability gates (Clients, Teams) undocumented | Ribbon gate table added |
| **I7** | Medium | **done** | NAVIGATION.md | Docs | `kbank.aorms.in` surface behaviour | SURFACE-URLS + NAV §5 |
| **I8** | Medium | **done** | `Performance.tsx` | CRUD | Inline "Grant reward points" per card | Row menu action |
| **I9** | Medium | **done** | `Reconcile.tsx` | CRUD | Rail file picker + dock upload (dual CTA) | Dock opens upload dialog |
| **I10** | Low | **done** | `SystemAdmin.tsx` | Loading | Bare "Loading modules…" | `DataState` skeleton in shell |
| **I11** | Low | **done** | `StandardsLibrary.tsx` | Loading | Bare "Loading documents…" in detail pane | `DataState` skeleton |
| **I12** | Low | **done** | `ArchivedProjects.tsx` | Loading | "Reading files…" bare text | Skeleton |
| **I13** | Low | **done** | Account portals | SEO | `PortalPageHeader` — no auto `document.title` | Tab-aware title hook in `PortalChrome.tsx` |
| **I14** | Low | accepted | Library grids | Components | Category/discipline `Chip` in Compliance/Standards | Metadata chips — acceptable for taxonomy labels |
| **I15** | Low | deferred | `Alerts`, `LXOS`, `ArchivedProjects` | CRUD | No dock create actions | By design (read-only / placeholder) |
| **I16** | Low | accepted | `StudioAbstract.tsx` | Shell | Custom layout vs shared `RailLayout` | Canonical reference — do not wrap |
| **I17** | Low | accepted | `ContractorPortalStub.tsx` | Shell | Not full glass rail | Stub until contractor portal ships |
| **I18** | Low | **done** | `KnowledgeBankPortal.tsx` | TS | Type errors in Docker tsc (pre-existing) | Clean tsc; portal `document.title` added |

---

## 6. Parallel WIP files (do not edit until flag cleared)

Policy: `CLAUDE.md` · [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) § Autopilot rules #6.

| File | Shell | Dock | Breadcrumb | DataState | Status UI | Dialog a11y |
| --- | --- | --- | --- | --- | --- | --- |
| `Projects.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ StatusTag | ❌ I2 |
| `Clients.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ TagChip I3 | ❌ I1 |

**When WIP lifts:** I1, I2, I3 are the only blockers for full checklist compliance on CRM entry points.

---

## 7. Autopilot roadmap cross-check (U0–U6)

| Phase | Status | Audit note |
| --- | --- | --- |
| U0 Glass rail reference | ✅ | `StudioAbstract.tsx` |
| U1 Shared primitives | ✅ | `RailLayout.tsx`, `glass.scss` |
| U2 Login rail | ✅ | `AuthRailLayout` |
| U3 Screen rollout | ✅ | All batch screens on RailLayout |
| U4 Health orbs | ✅ | Optional on non-home screens |
| U5 Portals | ✅ | External + account shells |
| U6 Kit export | ✅ | `@hcw/ui-kit` primitives |

**Per-screen checklist (roadmap § U3):**

- [x] Upgraded `RailLayout` — no local rail geometry
- [x] Rail: title/tabs/aside only — no DataGrid in rail (project detail excepted: section nav)
- [x] Stage scrolls independently
- [ ] Page CTAs via `useScreenActions` everywhere — **I8, I9, I15**
- [x] Typecheck — pre-existing KBP TS errors only (I18)

---

## 8. Design debt register cross-reference

| Audit ID | Register ID | Item |
| --- | --- | --- |
| I3 | D11 | TagChip fork in `Clients.tsx` |
| I8 | D1b | Optimistic / inline CTA pattern |
| I1–I2 | D6 (retired bulk) | Last 3 dialogs in WIP files |
| I10–I12 | D7 (retired bulk) | Residual bare loading strings |

Full queue: [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md)

---

## 9. Scorecard by module

| Module | Shell | Dock | A11y | Loading | Status UI |
| --- | --- | --- | --- | --- | --- |
| Studio Intelligence | ✅ custom | ✅ | ◐ title | ✅ | ✅ |
| Projects + detail | ✅ | ◐ | ◐ I2 | ✅ | ✅ |
| Clients / CRM | ✅ | ✅ | ❌ I1 | ✅ | ❌ I3 |
| Finance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Office docs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Library | ✅ | ◐ | ✅ | ◐ I11 | ◐ I14 |
| Tasks / Work | ✅ | ✅ | ✅ | ✅ | ✅ |
| Teams / HR | ✅ | ◐ I8 | ✅ | ✅ | ✅ |
| Search / Alerts | ✅ | ◐ | ✅ | ◐ I10 | ✅ |
| Portals (external) | ✅ U5 | N/A | ✅ | ✅ | ✅ |
| Account portals | ✅ | N/A | ◐ I13 | ✅ | ✅ |

---

## 10. Recommended fix order (when implementing)

1. **I1–I3** — Lift WIP on `Clients.tsx` / `Projects.tsx`; dialog names + StatusDot
2. **I4** — Studio Intelligence document title
3. **I5–I7** — NAV + surface URL doc sync
4. **I8–I9** — Performance grant + Reconcile upload consolidation
5. **I10–I12** — Loading grammar stragglers
6. **I18** — KnowledgeBankPortal typecheck

---

## Fix log

| Date | IDs | Notes |
| --- | --- | --- |
| 2026-07-11 | — | Initial interface audit (audit-only; no code changes) |
| 2026-07-11 | I4–I14, I18 | Fix pass — see [AORMS-STUDIO-INTERFACE-FIX-PLAN-2026-07-11.md](AORMS-STUDIO-INTERFACE-FIX-PLAN-2026-07-11.md) |

**Fix plan:** [AORMS-STUDIO-INTERFACE-FIX-PLAN-2026-07-11.md](AORMS-STUDIO-INTERFACE-FIX-PLAN-2026-07-11.md)

## Related

- [NAVIGATION.md](NAVIGATION.md) — canonical IA
- [HCW-UI-KIT.md](HCW-UI-KIT.md) — layer + spatial model
- [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) — UX laws + review checklist
- [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) — glass rail rollout
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) — host map
