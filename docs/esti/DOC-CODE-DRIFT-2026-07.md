# Doc ↔ code drift — 2026-07 punch-list (RESOLVED)

**Status:** Closed · **Owner:** Holagundi Consulting Works · **Logged:** 2026-07-09 ·
**Updated:** 2026-07-18 · **Closed:** 2026-07-21

> This punch-list tracked discrepancies found between the shipped UI
> (`frontend/src/routes/**`, `backend/src/trpc/router.ts`) and the docs after the
> 2026-07-09 estimation/CMS/Knowledge-Bank teardown (`a9cd072`). **All items are now
> resolved** — the file is kept only so existing inbound links stay valid. New drift, if
> found, should be fixed in place per `CLAUDE.md`'s Change Rule rather than re-opening a
> standing list here.

## Closure log

| # | Item | Resolution |
|---|------|------------|
| 1 | `NAVIGATION.md` described a 10-section ribbon that did not exist | `NAVIGATION.md` now has a "Shipped chrome (source of truth: `App.tsx`)" section matching the flat ribbon (Projects · Clients · Teams · Office) + admin hamburger. |
| 2 | `ACCESS-HIERARCHY.md` §6/§11 Project Detail tab list wrong (Invoices/Costing/BOQ/Fee-proposal tabs) | Corrected: the project cost surface is the **Estimation** tab (`fees:manage`); Invoices and Proposals are top-level routes. Authoritative tab list is `NAVIGATION.md` § 2. |
| 3 | `UNIFIED-ARCHITECTURE-V4.md` "System state" still listed `kb.*` / `cms.*` as live/rebuilding | Rewritten to the shipped estimation surface (Rate Books + project Estimation tab + plan takeoff). The CMS/Knowledge-Bank rebuild docs were deleted. |
| 4 | `CLAUDE.md` Knowledge module map listed the removed `knowledgeBank` namespace + `KnowledgeBank.tsx` | Removed; only `specCatalog` + `lessons` remain. |
| 5 | `SystemAdmin.tsx` stale "Knowledge Bank" tile copy; orphaned Purchase Orders UI; `vendor/router.ts` `materialId` mismatch; `0175` journal gap | Tile copy fixed; Purchase Orders mounted (2026-07-18); vendor `materialId` fixed (`efa1e1fa`); `0175` registered (2026-07-18). |
| 6 | Minor: KB text-import nav copy; `esti_proposal.status` vestigial; `ai.generateCad` only reachable from ESTICAD | KB import copy removed with the Item Library; `ai.generateCad` + ESTICAD removed 2026-07-19; `proposal.status` left as-is (clientApprovalStatus drives the client gate). |
