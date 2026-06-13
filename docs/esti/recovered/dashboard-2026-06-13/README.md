# Recovered dashboard redesign — 2026-06-13

**Status:** Archived / not in `main`. This folder preserves a dashboard redesign
built on 2026-06-13 that was **superseded when `main` fast-forwarded to the
`claude/code-documentation-audit-hbblum` branch**, which carried an earlier
(2026-06-12) dashboard. The decision at merge time was to keep the older
dashboard; this archive exists so the newer work is not lost and can be
re-applied later if wanted.

## Why it's here

The redesign lived on the (now-deleted) `codex/esti-rebrand-baseline` branch as
five commits on top of `e326e181`. That branch was deleted; `main` does **not**
contain these commits. The patch series and final source snapshots below are the
complete record.

## What this dashboard did (vs the current one in `main`)

The current `main` dashboard (the 2026-06-12 version) uses pictogram + category-
tag tile headers, Carbon charts (Treemap / Radar / Gauge / Heatmap), and ghost
"Open module" buttons. The archived 2026-06-13 redesign reworked it around the
AORMS brief's "answer 5 questions in 10 seconds" goal:

1. **Brief-aligned priority ladder** — strict top-to-bottom order: KPI strip →
   Action Center → Financial health → Project health → Client signals → Team
   performance → Quality intelligence → Statutory & activity → admin toggles.
2. **Four-chip KPI strip** (was a ragged 6-chip 4+2 layout): Ready to bill,
   Outstanding collections, Active projects, Team utilization — one row, one
   question each; overdue/at-risk folded into each chip's context tag.
3. **Single typography scale** — `h1` page, `h3` zone headers, `h4` tile titles,
   `h2` only for KPI values; removed the pictogram + category-tag headers that
   scattered the eye.
4. **Per-card health edge** — a 3px left border (Carbon notification anatomy)
   using support tokens (`--cds-support-error/warning/success`,
   `--cds-border-subtle-01`) as each card's single status signal.
5. **Condensed mosaic** — Carbon `condensed` grid (1px gutters) + 1px row-gap so
   tiles read as a flush mosaic; minimum inter-card spacing.
6. **Action Center split** into four equal tiles (Overdue collections, Approvals
   pending, Ready to bill, Risk & capacity), each with its own health edge.
7. **Square tags** — geometry-only `border-radius: 0` override (kept colour).
8. **Zone-header tiles with arrows** — each section header became a full-width
   tile; where it maps to a page it is a `ClickableTile` with an `ArrowRight`.
   Clickable tiles use a corner arrow instead of a bottom "Open X" text button.
9. **New backend support** — `dashboard.utilization` query (30-day timesheet
   utilization + billable rate) and `currentPhase` / `progressPct` added to
   `dashboard.projectHealth`. **Note:** these backend additions are also absent
   from `main`, so the archived `Dashboard.tsx` will not run as-is against the
   current backend until they are re-applied (see patch 0001 / 0002).

## Files in this folder

| File | What it is |
|---|---|
| `0001..0005-*.patch` | The five commits, in order, as `git format-patch` output (full diffs + messages). |
| `Dashboard.final.tsx` | Verbatim `frontend/src/routes/Dashboard.tsx` at the final commit `28b67058`. |
| `styles.final.scss` | Verbatim `frontend/src/styles.scss` at `28b67058` (condensed grid, square-tag, edge helpers). |
| `dashboard-router.final.ts` | Verbatim `backend/src/modules/dashboard/router.ts` at `28b67058` (incl. `utilization` query + project progress fields). |

## Original commit SHAs (orphaned — will be GC'd from the local clone eventually)

```
28b67058 Dashboard: zone-header tiles with arrows, coloured square tags
d1e47c26 Dashboard: condensed mosaic, Action Center split into tiles, square tags
b6cdbb66 Dashboard: health edge per card, monochrome outline tags
b270b4ef Dashboard UX pass: priority ladder, single type scale, equal-height rows
0e8b2b46 Dashboard redesign: brief-aligned hierarchy with utilization + ASPRF tiles
```
Base commit (present in `main`): `e326e181`.

## How to re-apply later

The patches are based on `e326e181`, which **is** in `main`'s history, but `main`
has since diverged (a different dashboard). A clean `git am` will likely conflict.
Recommended approaches:

- **Cherry-pick by hand (simplest):** copy `Dashboard.final.tsx`,
  `styles.final.scss`, and `dashboard-router.final.ts` over the current files,
  then reconcile against any newer changes and run the frontend typecheck.
- **Apply the series:** `git am --3way docs/esti/recovered/dashboard-2026-06-13/00*.patch`
  from a branch off `main`, resolving conflicts (mainly `Dashboard.tsx` and
  `styles.scss`, which were rewritten by the merged branch).

After re-applying, restart the backend (`podman restart esti-backend`) because
the `utilization` query and `projectHealth` progress fields are new server code.
