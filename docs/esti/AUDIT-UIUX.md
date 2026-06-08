# ESTI — UI/UX Audit (screen by screen)

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-08

> Heuristic + screen-by-screen review of the Carbon React SPA. Severity:
> **P1** (fix soon) · **P2** (should) · **P3** (polish). Items already addressed
> are marked ✅.

## Cross-cutting

| Area | Finding | Sev |
|---|---|---|
| Feedback | ✅ Global toast on every failed query/mutation (React Query caches); ✅ top-level error boundary. | — |
| Theme | ✅ Light/dark toggle in header, persisted; ✅ login/loading themed. Verify all ad-hoc inline colors use `--cds-*` tokens (several still hardcode `#6f6f6f`, `#161616`). | P2 |
| Loading states | ✅ `DataState` component — skeleton while loading, illustrated empty state with action CTA; applied to Projects, Clients, Tasks, Master DSR, Consultants, Team. | P1 |
| Tables | ✅ Projects, Clients, Consultants, Team migrated to `DataTable` with `TableToolbarSearch` + `isSortable`; Projects and Clients also have `Pagination`. | P2 |
| Pagination | ✅ Projects and Clients paginated (10/25/50 per page, resets on search). Server-side pagination deferred (A1). | P2 |
| Money input | Raw `type=number` ₹ fields everywhere. A shared `RupeeInput` (₹ prefix, grouping, paise discipline) would cut entry errors. | P2 |
| A11y | ✅ All `hideLabel` controls now have descriptive `labelText` (11 fixes across 9 files). | P1 |
| Responsiveness | ✅ Dashboard on Carbon Grid. Most other pages use flexbox with fixed `maxWidth` tiles; check < 672 px (sidebar rail + tables overflow). | P2 |
| Keyboard | ✅ Calculator Alt+C/Esc. No other shortcuts; consider `g p` (projects), `/` (search). | P3 |

## Shell & navigation

- **Rail sidebar** ✅ icon-based, expands on hover. P3: active-route contrast in dark theme is subtle; add a left accent bar.
- **Header**: ✅ firm name, ✅ alerts bell (count + clearable panel), ✅ theme, ✅ sign-out. P3: no current-user indicator — add the signed-in name/avatar menu (sign-out lives only as an icon).
- **Floating calculator** ✅ screen-only, Alt+C. P3: draggable + remember last expression.

## Screen-by-screen

### Login
- P2: single combined form, minimal error styling; ✅ now themed. Add product logo/pictogram and a "first-run creates the owner" hint.

### Dashboard ✅ (Grid)
- P2: KPIs are static tiles — add `@carbon/charts-react` (fee pipeline invoiced/collected/outstanding; project-stage donut; permit status).
- P3: clickable tiles only on some KPIs; make all drill through.

### Projects (list)
- P1: plain table, no search/sort/pagination, no empty state. Migrate to `DataTable` with search + status filter chips.
- P2: "New project" modal is long; group address/site fields with `FormGroup`.

### ProjectDetail (tabbed)
- ✅ Reorganised into tabs (Phases · Fees · Invoices · Client log · Compliance · Costing · Drawings · Team · Settings); ✅ Fees tab owner-only.
- P2: 9 tabs is a lot — consider grouping (e.g. "Drawings" already holds drawings+viewer+transmittals+approvals; "Costing" holds estimates+BBS). Add a sticky project header (ref, status, client, contract value) above the tabs so context persists across tabs.
- P2: each sub-section repeats its own heading/“New …” button pattern — consistent, but the Drawings tab is dense (4 sections). Consider an inner secondary tab or accordions.
- P3: deep-link to a tab via URL (`?tab=invoices`) for shareable links.

### Tasks ✅ (new)
- P2: it's a flat table; a Kanban (To do / In progress / Blocked / Done columns) would suit task triage. Add assignee filter and "my tasks".

### Clients / Consultants / Team / Users
- Consistent CRUD pattern. P1: empty/loading states. P2: Consultants/Team plain tables → `DataTable`. P3: Users page — show last-login and the linked record (client/consultant) more prominently.

### HR (leaves + payroll)
- P2: two stacked tables on one page; fine, but add month filter on payroll and a leave-balance summary per member.

### Reconcile
- Good flow (upload → match → settle). P2: surface the parsed column mapping the worker inferred; allow re-mapping when detection is wrong.

### Master DSR
- P2: rate items have no search/bulk import — a versioned master will grow large; add CSV import + search.

### Company
- P1: long single-column form — split into `FormGroup`s / two-column `Grid` (firm · solo architect · address · GST · logo · HR toggle). P3: live logo preview is there ✅; show how it appears on a document.

### Estimation / BOQ / BBS
- P2: estimate line entry is modal-per-item; a spreadsheet-like inline grid would be faster for long BOQs. BBS preview ✅. Add export (PDF/XLSX) of the approved BOQ and the BBS.

### Drawing viewer
- ✅ inline SVG + overlay measurement, calibration. P2: no zoom/pan; add wheel-zoom + drag-pan and a measurement list toggle. P3: snapping to endpoints.

### Portals (client / consultant)
- Clean read-only shells. P2: no branding/logo, no empty states; add firm logo + "nothing issued yet" copy. P3: let clients acknowledge an approval (write-back) rather than read-only.

## Top recommendations (in order)
1. **Loading + empty states** everywhere (skeletons + uniform empty row).
2. **A11y pass**: `aria-label` on all hide-label inline controls.
3. **DataTable migration** for list pages (sort/search/pagination).
4. **Sticky project header** above the ProjectDetail tabs; URL-addressable tabs.
5. **Charts on the dashboard**; **RupeeInput** component; **Tasks Kanban**.

---

## Re-audit — 2026-06-08 (all screens)

Full pass over all 18 routes + 21 components after the RBAC / dashboard /
admin-tools work.

### Systemic findings (recur across most screens)

| # | Finding | Sev | Status |
|---|---|---|---|
| G1 | No loading states — lists render an empty table while fetching. | P1 | 🔧 `DataState` wrapper |
| G2 | No empty states — bare headers, no "add your first…" guidance. | P1 | 🔧 `DataState` wrapper |
| G3 | No search / filter / pagination despite backend `search`/`status`/`limit`/`offset`. | P1 | open |
| G4 | Inconsistent destructive UX: password-modal vs `window.confirm` vs instant remove. | P1 | 🔧 `ConfirmModal` |
| G5 | Hard-coded hex (`#6f6f6f`, `#da1e28`, `#fff`) → poor dark-theme contrast. | P1 | 🔧 token sweep |
| G6 | Two table paradigms (`DataTable` on 2 screens, hand-rolled elsewhere). | P2 | open |
| G7 | Status as plain text on Projects/Portal vs coloured `Tag` elsewhere. | P2 | open |
| G8 | Heading levels skip (`h1`→`h3`); cards use `h3` as page title. | P2 | open |
| G9 | Forms validate only on submit; no inline `invalid`/`invalidText`. | P2 | open |
| G10 | Modal inline-error display inconsistent (some rely on global toast only). | P3 | open |

### Per-screen
- **Login** P2 title is `h3`; no password reveal (`PasswordInput`), no product mark.
- **Projects / Clients** P1 G1/G2/G3; Projects status plain text (G7).
- **Tasks / Master DSR** P1 instant "Remove" (G4); no empty/loading.
- **Reconcile / DrawingViewer / Portal / ClockLeaves** P1 hard-coded colors (G5).
- **Portal / CollaboratorPortal** P1 a11y — project cards are `Tile onClick` (not
  keyboard-focusable); use `ClickableTile`.
- **HR** P2 `h1`→`h3`; instant Approve/Reject/Mark-paid.
- **ProjectDetail** P2 no breadcrumb; invoice delete uses `window.confirm` (G4).
- **Dashboard / Filing / Users / Company** in good shape post-recent work.

### Fix order (this pass)
1. ✅/🔧 `DataState` (skeleton + empty) → list screens (G1, G2).
2. 🔧 `ConfirmModal` standardising destructive actions (G4).
3. 🔧 Color-token sweep for dark theme (G5).
4. Search + cursor pagination on Projects/Clients via `DataTable` (G3, G6).
5. Inline validation (G9); a11y pass — `ClickableTile`, heading levels (G8).
