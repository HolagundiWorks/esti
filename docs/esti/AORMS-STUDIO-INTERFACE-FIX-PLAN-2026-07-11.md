# AORMS-Studio interface fix plan — 2026-07-11

**Source audit:** [AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md](AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md)

| Phase | IDs | Scope | Status |
| --- | --- | --- | --- |
| **1** | I4, I5–I7 | Title + NAV/surface docs | ✅ done |
| **2** | I8, I9 | Dock consolidation (Performance, Reconcile) | ✅ done |
| **3** | I10–I12 | Loading grammar | ✅ done |
| **WIP** | I1–I3 | `Clients.tsx` / `Projects.tsx` | blocked — parallel WIP |
| **4** | I13, I18 | Account SEO + KB portal title | ✅ done |
| — | I14–I17 | Accepted / deferred | no change |

**Public pages UX (UX1–UX14):** ✅ done — [PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md](../marketing/PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md)

## Changes (2026-07-11)

- **I4** — `StudioAbstract.tsx`: `document.title = Studio Intelligence — AORMS-Studio`
- **I5–I7** — `NAVIGATION.md` KB portal + capability gates; `AORMS-SURFACE-URLS.md` kbank behaviour
- **I8** — `Performance.tsx`: grant action in `RowActionsMenu`
- **I9** — `Reconcile.tsx`: dock opens upload dialog; rail is help + settle alerts only
- **I10** — `SystemAdmin.tsx`: `DataState` skeleton inside `RailLayout`
- **I11** — `StandardsLibrary.tsx` Documents tab: `DataState` skeleton
- **I12** — `ArchivedProjects.tsx`: dialog file preview skeleton
- **I13** — `PortalChrome.tsx`: tab-aware `document.title` on account portals
- **I18** — `KnowledgeBankPortal.tsx`: `document.title`; tsc clean
- **Bonus** — `SitePortal.tsx`: project list skeleton (D7 loading grammar)
