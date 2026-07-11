# Design debt register — LIVING

**The single queue of known design debt.** Every audit deposits here; every fix
withdraws. Agents: update this file in the same change that alters a fact
(Rulebook §14). Ordered by severity × reach. **Updated:** 2026-07-11.

## Open

| # | Category | Item | Evidence / note | Sev |
| --- | --- | --- | --- | --- |
| D1b | Perf/UX | Extend the optimistic-write pattern beyond the flagship sites (task board/tab interactions, other toggles) | pattern established in Leads.setStatus + Users.setDisabled (cancel→snapshot→set→rollback→settle) | Med |
| D2 | Testing | No Storybook / visual regression / component-render tests | unit tests exist (0.3.0); no gallery harness | High |
| D3 | Theme | Dark/HC schemes + recipes implemented but unsigned — no visual QA, no switcher UI | kit 0.2.0 `recipesFor` | Med |
| D5 | Component | Charts ungoverned (MUI X Charts raw) | last canonical outside the kit | Med |
| D8c | Feedback | Adopt `meta.errorTitle` across remaining mutations (mechanism + exemplars live) | opportunistic per Rulebook §14; convention in KB R8 | Low |
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

- 2026-07-11 · D6 dialog names: **106 dialogs across 64 files** gained `aria-labelledby` (WCAG 4.1.2); only the parallel-WIP `Clients.tsx` dialog remains (D11 scope)
- 2026-07-11 · D8b error context: `meta.errorTitle` mechanism live in the global query/mutation caches; exemplar adoption on all 6 Leads/Users mutations; convention codified in KB R8 → narrowed to D8c (incremental adoption)
- 2026-07-11 · D1 optimistic writes: pattern established at flagship sites (Leads status dropdown un-frozen + instant; Users enable/disable instant + toast) → narrowed to D1b
- 2026-07-11 · D4 canvas/SVG palettes: `DATA_VIZ` categorical token added (kit 0.4.0); PlanReaderPanel fully token-driven; ZonalCompliance palette centralised + 7px annotation darkened to hold AA
- 2026-07-11 · D7 loading grammar: 15 bare "Loading…" replaced with skeletons across 13 files (agent batch + PortalMinutes straggler)
- 2026-07-11 · D9 Office menu: grouped into Office/Finance ListSubheader groups (SectionMenu learned nested groups); NAVIGATION.md synced
- 2026-07-11 · Toast + Avatar promoted (0.3.0); first kit test suite (15 tests)
- 2026-07-11 · Dark/HC recipes implemented (0.2.0) → moved to D3 (sign-off)
- 2026-07-11 · PageBreadcrumb promoted (router-agnostic injection); last real-text inline fontSize cleared
- 2026-07-11 · KnowledgeBankPortal stale APIs + contract violations repaired; tree green
- 2026-07-11 · Kit governance: semver 0.1.0+, CHANGELOG, GOVERNANCE, sideEffects
- 2026-07-11 · Scheme layer + scale tokens + 8 controls themed (0.1.0)
- 2026-07-11 · StatusDot/DataState/ConfirmModal promoted; StatusTag delegates
- 2026-07-11 · A11y wave: nested-main, 44px targets, keyboard paths, skip link, aria-current, document.title, reduced-motion, autofill (24 files)
- 2026-07-11 · Licensing console filled TagChips → StatusDot (12 files)
