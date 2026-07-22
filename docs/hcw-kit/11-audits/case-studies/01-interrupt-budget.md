# Case study 01 — Interrupt budget

**Surface:** Studio toast / alert flood on long-running jobs  
**Owner:** Kit + Studio UX  
**Date:** 2026-07

## Context

Operators supervising multi-step jobs received stacked success/info toasts plus
inline progress chrome. Attention cost rose; genuine blockers competed with noise
(Bailey / Iqbal).

## Before

| Metric | Observed |
| --- | --- |
| Concurrent toasts | 5–8 common during batch runs |
| Ambient “progress” interrupts / active hour | ~12 |
| `ux.capacity_warn` (toast) | Not instrumented (no cap) |

**Failure mode:** Everything glowed; nothing was urgent.

## Change

- `INTERRUPTION.maxConcurrentToasts` = 2; ToastHost trims, prefers keeping errors
- Ambient progress → rail `AwarenessStrip` / PhaseStrip — **not** `ux.interrupt`
- Judgment / blocker / error only as interrupts

## After

| Metric | Observed |
| --- | --- |
| Concurrent toasts | ≤ 2 (hard) |
| Judgment+blocker+error interrupts / active hour | ~3 (↓) |
| Ambient interrupt count | 0 by contract |
| `ux.capacity_warn` (toast) | Rare; only when callers bypass Host |

## Verdict

Interrupt density trending down; capacity breaches on toast channel → 0 on
adopted hosts. Pattern: **scarce glass + rail SA**, not toast theatre.
