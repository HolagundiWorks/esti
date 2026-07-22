# Case study 02 — Dock purity & outcomes

**Surface:** Detail / settings screens with inline Save / Delete  
**Owner:** Kit + Studio UX  
**Date:** 2026-07

## Context

Page-level CTAs duplicated in headers, footers, and mid-forms. Operators missed
commits; Norman’s gulf of evaluation stayed open (no durable outcome after Save).

## Before

| Metric | Observed |
| --- | --- |
| Inline page CTAs / week (sampled screens) | 14–20 |
| Dock commits with `ux.outcome` | ~0.2 coverage |
| Post-save confirmation | Toast-only or silent |

## Change

- All page intent via `useScreenActions` → ActionDock (LEFT destroy · RIGHT commit)
- `DockAction.outcome` + `track` → `publishOutcome` + `ux.dock` / `ux.outcome`
- `ActionOutcomeBanner` at stage head; ConfirmModal `kind` for destroy
- Cap dock at `CAPACITY.dockVisibleActions` (trim + `ux.capacity_warn`)

## After

| Metric | Observed |
| --- | --- |
| Inline page CTAs on adopted screens | 0 |
| Outcome coverage (dock commits with `ux.outcome`) | → ~1.0 when `outcome` set |
| Capacity dock warnings | Only on over-publish (>5) |

## Verdict

Dock purity → 0 inline CTAs on adopted templates (T3/T4). Outcome coverage is a
**wiring discipline** — set `outcome` on RIGHT commits; async flows call
`publishOutcome` explicitly.
