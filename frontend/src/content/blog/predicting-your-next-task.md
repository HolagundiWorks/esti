---
title: Predicting your next task — the priority and reasoning engine
date: 2026-06-16
excerpt: How AORMS ranks every open task into one recommended action, and how it still reasons usefully when the dependency data is incomplete.
tags: AI, Product
author: Human Centric Works
---

"What should I do next?" is the most expensive question an owner asks all day —
because answering it well means holding the entire office in your head at once.
AORMS answers it for you.

## Scoring every task

The priority engine reads each live task and scores it across the things that
actually decide importance in a practice:

```text
priority =
    urgency
  + financial impact
  + dependency risk
  + team blockage
  + meeting proximity
  + deadline pressure
  − safe deferral
```

It then ranks everything globally and surfaces just the **top three** in Today's
Focus — with the single highest-leverage item marked for action.

## Reasoning when data is missing

Real office data is never complete. Predecessors are unlinked, a drawing has no
billing milestone attached, an approval has no due date. A naive system stops
there. AORMS reasons like a senior architect instead.

If dependency edges are missing, the **architectural reasoning engine** infers
likely impact from what *is* known — the standard architecture workflow (concept
→ design development → execution drawings → site), the assignee's role, how long
the task has sat, how close the next client meeting is, whether it touches
billing, and how that client or team has behaved historically.

A facade drawing with no links, assigned to a senior architect, with a client
review tomorrow, is not invisible — it surfaces as *"may affect the upcoming
client review."* Confidence is tracked internally, never shown as a number, and
low-confidence guesses never escalate to "urgent" unless a real deadline or
meeting backs them.

The goal is not mathematical certainty. It is **useful guidance despite
imperfect office data** — which is the only kind of office data that exists.
