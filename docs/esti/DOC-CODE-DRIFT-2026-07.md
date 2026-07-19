# Doc ↔ code drift — findings from the 2026-07-09 user-guide rewrite

**Status:** Informational punch-list, not canonical · **Owner:** Holagundi Consulting Works ·
**Logged:** 2026-07-09 · **Updated:** 2026-07-18

> This is not a spec. It's the list of discrepancies found while verifying the actual
> shipped UI (`frontend/src/routes/**`, `backend/src/trpc/router.ts`) against the
> existing docs, in order to rewrite the user-facing wiki
> ([`frontend/src/content/wiki/how-to-use-aorms.md`](../../frontend/src/content/wiki/how-to-use-aorms.md)
> and siblings — done, see that commit) and, later, to close gaps in
> [`docs/holagundi/SOP.md`](../holagundi/SOP.md)'s gap register. The wiki is fixed and the
> Purchase Orders / migration-journal bugs below are fixed. **Everything else is not** —
> engineering-doc drift (and a live vendor-router bug) still waiting on an owner. Per
> `CLAUDE.md`'s Change Rule, whoever next touches these areas should reconcile the doc
> alongside the code, or update the doc to match reality if the code is intentional.

## Why this happened

`a9cd072` ("Remove estimation, CMS, and Knowledge Bank; keep spec catalogue only",
2026-07-09) tore out the Estimation OS, CMS, and Knowledge Bank UI/API in one pass but
touched no docs outside `CLAUDE.md`'s own module map — and even that snapshot predates
the same-day teardown in places (see below). Several other docs were already stale
*before* that commit, from an earlier nav simplification that was never written back to
`NAVIGATION.md`.

---

## 1. `NAVIGATION.md` — the sidebar it describes no longer exists

**Biggest single drift item.** `NAVIGATION.md` (adopted 2026-06-29) documents a ribbon
with ten top-level sections — Studio Intelligence · Projects · Tasks · AI Studio ·
Library · Studio · Third Parties · Office · Finance · LXOS · Admin — each with its own
sidebar entry.

The actual nav tree in `frontend/src/App.tsx:322-405` (the `nav` array + `adminGroups`)
is much flatter:

- **Top ribbon:** just **Projects**, **Teams** (submenu: Teams / Performance / HR), and
  **Office** (submenu: Proposals / Contracts / Letters, then Finance items folded in:
  Consultancy Invoices / Cashbook / Office Expenses / Payroll / Financial Reports).
- **Header admin-menu icon** (not the ribbon): three groups — **Third Parties**
  (Clients / Consultants / Contractors / Vendors), **Library** (Spec catalogue /
  Compliance / Master Plan / Standards), **Admin** (Archived projects / System).
- Studio Intelligence (`/`), Tasks (`/tasks`), Search, Alerts, LXOS (`/lxos`), and AI
  Studio (`/office/ai-studio`) are all reachable but aren't in `NAVIGATION.md`'s
  described ribbon/sidebar shape at all.

Specific items in `NAVIGATION.md` that no longer exist in code:
- **§ "Estimation ✅"** (top of file, `/estimation`) — route now redirects to `/projects`
  (`App.tsx:435-437`). Fully removed.
- **§5 Library → Item Library ✅** (`/knowledge-bank`, Materials/Labour/Items/Brands/
  Specifications/Recipes/Brand Catalogue/Import) — route now redirects to
  `/libraries/spec-catalog` (`App.tsx:434`). Only the spec catalogue survives.
- **§7 Third Parties → Vendors 🚧 "placeholder page"** — Vendors is not a placeholder;
  it's a built directory with category/contact/GSTIN/PAN, a 1–5 rating, and a full
  pricing-history + quote-comparison sub-view (`frontend/src/routes/Vendors.tsx`).
- **§7 Third Parties → Clients ✅ "(profile · projects · contracts · consultancy fees ·
  invoices · comm log)"** — `Clients.tsx` has none of this; it's a flat CRM list
  (name/type/city/GSTIN/email/status) with no per-client detail page.

## 2. `ACCESS-HIERARCHY.md` §6/§11 — Project Detail tab list is wrong

The doc claims `ProjectDetail.tsx` has separate **Invoices tab**, **Costing / BOQ /
Estimates tab**, and **Fee proposal tab**, all gated to `invoice:manage` (L2+) and
hidden entirely below that rank.

None of these exist as tabs in the actual component. Invoices live at the top-level
route `/invoices` (gated in `App.tsx` by `can(role, "invoice:manage")`), fee proposals
live at `/office/proposals` (gated by `fees:manage`), and there is no Costing/BOQ tab
anywhere — the closest thing is the read-only feasibility calculator inside the
project's **Pipeline → Feasibility** accordion, which is pre-project, not a costing
module.

The real tab structure (`ProjectDetail.tsx`, `aria-label="Project sections"`) is two
groups: **Setup** (Overview, Pipeline, Program, Project Info, CPI [residential only],
Permits, Settings) and **Project workspace** (Drawings & approvals, Documents,
Specifications, Team [hrEnabled], Site Progress, Communications, Minutes, Lessons).

Same section also implies decisions/revisions live in a dedicated "Decisions" tab —
they're actually part of the **Overview** tab (the CRIF revision-intelligence panel).

## 3. `UNIFIED-ARCHITECTURE-V4.md` — "System state" predates the teardown

The doc's own banner says it's "the single source of truth for current system state,"
last reconciled 2026-06-28. `a9cd072` landed 2026-07-09 and removed everything the doc
lists as **Live** (`kb.*`) or **Rebuilding** (`cms.*`) under pillar 4 ("Construction
Cost Management OS"). The doc still describes CMS-1/CMS-2 as shipped and the
Construction Knowledge Bank as the active rebuild foundation — neither namespace exists
in `backend/src/trpc/router.ts` any more. The "Rebuilding" section (lines ~60-71 as of
this writing) needs a fresh pass reflecting that the rebuild itself was abandoned/reset,
not just that the old spine was removed (that part is already correctly documented
under "Removed").

## 4. `CLAUDE.md` (this repo's own agent-instructions file) — stale Knowledge module map

Under **Knowledge**, the module map still lists:
- `knowledgeBank` — knowledge catalog (Specification and Lessons surfaced in
  `KnowledgeBank.tsx`)

Neither the `knowledgeBank` tRPC namespace nor `KnowledgeBank.tsx` exist after
`a9cd072` (`git show --stat a9cd072` shows `KnowledgeBank.tsx` deleted, 165 lines).
`specCatalog` is the only surviving entry and is already listed separately and
correctly. The `knowledgeBank` line should be deleted, and the "Removed" callout under
Knowledge should be extended to note the 2026-07-09 teardown removed the Item Library
UI entirely (materials/labour/items/brands/recipes), not just the estimation/CMS spine.

## 5. Real UI/code bugs found (not doc drift — code itself is wrong)

- **`SystemAdmin.tsx:143-148`** — the "Knowledge Bank" module tile (always-on,
  descriptive) still reads *"Rate books, rate analysis, components, specification
  catalogue, parametric studies, and lessons. Core reference module — always enabled."*
  All of that except "specification catalogue" was removed 2026-07-09. This is shown to
  system admins in the live app, not just a doc — worth fixing directly. **Still open.**
- ~~Orphaned Purchase Orders UI~~ — **fixed 2026-07-18.** `ProjectPurchaseOrders.tsx`
  is now mounted as a Project workspace tab in `ProjectDetail.tsx` (gated to `write`).
- **`vendor/router.ts` references a dropped column** — `materialId` on
  `esti_vendor_price`/`esti_vendor_quote_line` was dropped by the 2026-07-09
  teardown (`0175_estimation_teardown.sql` drops `material_id` from both tables), but
  `backend/src/modules/vendor/router.ts` (lines ~135, 164, 258, 293) still reads/writes
  it — a genuine schema/code mismatch, not just a stale comment. `pnpm exec tsc
  --noEmit` fails on this file today (4 errors). Recording a vendor price or quote line
  likely 500s at runtime until the router is updated to match the current
  `esti_vendor_price`/`esti_vendor_quote_line` schema (or the column is restored,
  whichever was intended — unclear from the teardown commit alone). **Still open** —
  found while implementing SOP.md's gap register, see
  [`docs/holagundi/SOP.md`](../holagundi/SOP.md) SOP-20.
- **`0175_estimation_teardown.sql` was never registered in
  `backend/drizzle/meta/_journal.json`** — the migration file existed but
  `runMigrations()` (Drizzle's journal-driven migrator) would never have picked it up
  on a real boot, meaning the DB-side teardown (dropping `esti_kb_*`, `esti_cms_*`,
  `material_id` columns, etc.) likely never actually ran anywhere. **Fixed 2026-07-18**
  — registered retroactively alongside two new migrations (0176, 0177) added for
  SOP.md's gap register.

## 6. Minor / lower-confidence items

- `docs/esti/NAVIGATION.md` §"Library" also still shows the KB text-import feature
  (`/knowledge-bank` "Import ✅ — paste/parse unstructured rate text") as built — gone
  with the rest of the Item Library.
- The `proposals.esti_proposal.status` field (DRAFT/…) exists in the schema but no
  mutation in the current UI transitions it explicitly — "send to client" in the wiki
  and in `finance-and-billing.md` (now corrected) was really describing the
  `clientApprovalStatus` field on the same record, not a separate send/status workflow.
  Confirm whether `status` is meant to be wired up later or is vestigial.
- `ai.run` is referenced in `CLAUDE.md`'s Ask OS pillar description
  (`docs/esti/UNIFIED-ARCHITECTURE-V4.md` pillar table) but the actual procedure the AI
  Studio page calls is `ai.generate`; `ai.generateCad` is real but only reachable from
  the ESTICAD desktop companion — which was dropped 2026-07-19, so no takeoff
  surface exists in the product today.

---

## Suggested next step

Whoever owns navigation/access docs should either (a) do a focused pass reconciling
`NAVIGATION.md` and `ACCESS-HIERARCHY.md` to the current `App.tsx`/`ProjectDetail.tsx`
shape, or (b) if the nav is expected to change again soon, add a short "known stale"
banner to those two docs pointing here so the next reader isn't misled in the meantime.
