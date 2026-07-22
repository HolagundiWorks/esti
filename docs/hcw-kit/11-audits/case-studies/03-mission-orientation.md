# Case study 03 — Mission orientation (AI surface)

**Surface:** Chat-first AI panel → T10 mission anatomy  
**Owner:** Kit + AI product UX  
**Date:** 2026-07

## Context

Conversation-first AI dumped implementation in a thread. Principals re-read
scrollbacks to answer “what needs me?”. Orientation routinely exceeded 30s.

## Before

| Metric | Observed |
| --- | --- |
| Median time to answer four questions | ~90–120s |
| Decision latency (pending → frozen) | Unmeasured; often lost in chat |
| Mission completion clarity | Ambiguous (thread ended, state unclear) |

## Change

- T10 template: `MissionHeader` · `ObjectiveList` · `PhaseStrip` · `DecisionQueue`
  · `FreezeTable` · `ConfidenceBand` · `AwarenessStrip` in the rail
- Decisions ranked above artifacts; approve/reject in dock
- `logUxEvent("ux.orient" | "ux.decision" | "ux.mission")` via product sink

## After

| Metric | Observed |
| --- | --- |
| Median `ux.orient.msToFourAnswers` (timed cold start) | ~18–25s (≤30s band) |
| Decision cards above the fold | Pending first; freeze after RIGHT commit |
| Mission state | Explicit Active / Done / Failed via status + events |

## Verdict

Mission-first anatomy beats chat for **supervision**. Keep implementation detail
collapsed; interrupts only for judgment. Replicate Evaluate gate: cold user, four
questions, stopwatch.
