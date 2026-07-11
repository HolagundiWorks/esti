# Design debt register — LIVING

**The single queue of known design debt.** Every audit deposits here; every fix
withdraws. Agents: update this file in the same change that alters a fact
(Rulebook §14). Ordered by severity × reach. **Updated:** 2026-07-11.

## Open

| # | Category | Item | Evidence / note | Sev |
| --- | --- | --- | --- | --- |
| D1 | Perf/UX | Zero optimistic writes — every mutation blocks on refetch | `grep onMutate → 0`; worst: Leads status, Users toggle | High |
| D2 | Testing | No Storybook / visual regression / component-render tests | unit tests exist (0.3.0); no gallery harness | High |
| D3 | Theme | Dark/HC schemes + recipes implemented but unsigned — no visual QA, no switcher UI | kit 0.2.0 `recipesFor` | Med |
| D4 | Hardcoded | Canvas/SVG palettes off-token | `PlanReaderPanel.tsx` (16), `ZonalComplianceCalculator.tsx` (10) + small-text contrast unaudited | Med |
| D5 | Component | Charts ungoverned (MUI X Charts raw) | last canonical outside the kit | Med |
| D6 | A11y | Dialog `aria-labelledby` long tail (~80 dialogs; shared shells done) | ConfirmModal fixed; bake into remaining shared dialogs | Med |
| D7 | Loading | 17 bare "Loading…" texts instead of DataState skeletons | OfficeExpenses, SitePortal, Portal, ProjectMinutes, +11 | Med |
| D8 | Feedback | Generic global error title; silent success on some toggles | `main.tsx` toast wiring; Users/Leads | Med |
| D9 | IA | Office ribbon menu = 11 flat items | `App.tsx` SectionMenu; split or ListSubheader | Med |
| D10 | IA | Work hub reaches 8 tabs | `Work.tsx` | Low |
| D11 | Duplicate | `TagChip` fork in `Clients.tsx` (parallel-WIP file) | migrate to StatusDot when WIP lands | Low |
| D12 | MUI gaps | DatePicker popup, Pagination, Stepper un-themed | govern before first heavy use (Mapping 🟨) | Low |
| D13 | A11y | Route-change focus management absent | focus `#esti-main` on navigation | Low |
| D14 | Security-adjacent | Desktop token localStorage fallback on Tauri invoke failure; surface-host TLS beyond wiki.; `wss:` connect-src broad | review-noted (2026-07-11) | Low |
| D15 | Scale | RTL / i18n unsupported | long-term | Low |
| D16 | DesignerX | No Figma library / variables bridge | external deliverable | Low |
| D17 | Templates | Section 05 empty — no dashboard/admin/report/detail page templates | hierarchy gap | Low |

## Component conformance (Quality-checklist §Gate)

| Component | Gate status |
| --- | --- |
| Surface, GlassRail, ActionDock, TaskbarFooter, SectionDock, HealthGlassOrb, BrandMark | ✓ shipped pre-checklist; re-audit opportunistically |
| StatusDot, DataState, ConfirmModal, PageBreadcrumb, ToastHost, Avatar | ✓ gate items met at promotion; Storybook/visual-regression pending (D2) |

## Retired (most recent first)

- 2026-07-11 · Toast + Avatar promoted (0.3.0); first kit test suite (15 tests)
- 2026-07-11 · Dark/HC recipes implemented (0.2.0) → moved to D3 (sign-off)
- 2026-07-11 · PageBreadcrumb promoted (router-agnostic injection); last real-text inline fontSize cleared
- 2026-07-11 · KnowledgeBankPortal stale APIs + contract violations repaired; tree green
- 2026-07-11 · Kit governance: semver 0.1.0+, CHANGELOG, GOVERNANCE, sideEffects
- 2026-07-11 · Scheme layer + scale tokens + 8 controls themed (0.1.0)
- 2026-07-11 · StatusDot/DataState/ConfirmModal promoted; StatusTag delegates
- 2026-07-11 · A11y wave: nested-main, 44px targets, keyboard paths, skip link, aria-current, document.title, reduced-motion, autofill (24 files)
- 2026-07-11 · Licensing console filled TagChips → StatusDot (12 files)
