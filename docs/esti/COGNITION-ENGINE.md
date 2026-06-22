# AORMS Cognition Engine

**Status:** Live foundation · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-23

ESTI AORMS is not an ERP dashboard with an AI chatbot bolted on. It is an architecture-office cognition engine: a system that continuously observes office operations, calculates current health, recognises pressure, recommends intervention, and explains the result to the owner.

The governing rule is simple:

> Deterministic systems create business truth. LLMs explain business truth.

LLMs must not invent scores, predict delays directly, calculate financial state, or create unsupported recommendations.

## Intelligence Pipeline

```text
Operational records and events
        |
        v
Deterministic scoring
        |
        v
Anomaly and pattern recognition
        |
        v
Causal reasoning
        |
        v
Prediction
        |
        v
Intervention recommendation
        |
        v
LLM explanation
        |
        v
Dashboard office state
        |
        v
Outcome measurement
```

## Layer Responsibilities

| Layer | Responsibility | Truth Owner |
|---|---|---|
| Operational data | Projects, approvals, tasks, invoices, attendance, revisions, submissions, activity | PostgreSQL |
| Calculation | Finance, client, project, team, approval, compliance, and office scores | TypeScript backend |
| Recognition | Detect abnormal delay, revision, overload, collection, or submission patterns | Python worker |
| Reasoning | Connect causes across client, project, finance, team, and compliance dependencies | TypeScript rules / graph logic |
| Prediction | Forecast near-term delivery, workload, client, and recovery risks | Python worker |
| Intervention | Convert pressure into owner actions with expected effect and risk if ignored | TypeScript backend |
| Explanation | Produce clear human briefings from structured machine output | Ollama via AI gateway |

## Current Foundation

The first implementation slice is live and deterministic:

- computes domain health from existing dashboard read models (finance, client, project, team, approval);
- produces office health as a weighted score;
- emits ranked intervention recommendations with `title`, `confidence`, `expectedEffect`, and `riskIfIgnored`;
- returns this as `dashboard.home.cognition` via the existing `dashboard.home` bundle;
- keeps LLMs outside the score and intervention path.

The dashboard TODAY'S FOCUS tile renders the breathing space engine: OFFICE CALMNESS score + at most 3 immediate actions + safely deferred list + system confidence. The SYSTEM HEALTH quad tile shows live domain health percentages.

The Python worker image now carries scikit-learn, XGBoost, MLflow, and Evidently for the next recognition and prediction phases.

## Executive Cognitive Load Principle

The purpose of the dashboard is not to show all problems. It is to protect the owner's mental bandwidth.

Architecture firm owners carry continuous unresolved task loops (Zeigarnik Effect) that occupy working memory even during client meetings and site visits. The system must reduce cognitive load — not add to it.

Rules:
- Never show more than 3 items requiring immediate attention.
- All other interventions are silently classified as **safely deferred** and shown with reduced visual weight.
- The OFFICE CALMNESS score (0–100) is the headline metric — not a stress indicator but a calm-state signal.
- Time-aware focus context (morning / midday / afternoon) replaces meeting-calendar integration until that data is available.

Future phases will add meeting awareness (pre-meeting clearance), Focus Lock Mode (active meeting context), and deferred attention scheduling (auto-defer by time window).

## Dashboard Model

The overview screen follows three cognitive layers:

1. **Office calmness.** OFFICE CALMNESS score and SYSTEM HEALTH quad show state without alarm.
2. **Breathing space engine.** TODAY'S FOCUS shows exactly 3 actions. Everything else is safely deferred and hidden.
3. **Operational evidence.** Billing, team, project, and client evidence panels prove the system's reasoning.

The user's eye path should be:

```text
Office calmness score
  -> today's 3 focus items
  -> deferred (mentally offloaded)
  -> confidence
  -> evidence panels
```

Raw metrics remain available in other dashboard tabs. The primary surface answers one question: what do I need to do right now, and what can I safely stop thinking about?

## Domain Scores

All scores are `0-100`.

| Domain | Inputs | Output |
|---|---|---|
| Finance | outstanding receivables, overdue 30d amount, billing-ready value | financial recovery score |
| Client | pending approvals, max wait days, revision pressure, client risk rows | client attention score |
| Project | RED/YELLOW project health, delayed tasks, stale approvals, open revisions | project health score |
| Team | open task load, overdue work, overloaded assignees | team capacity score |
| Approvals | count and age of pending approvals | approval blockage score |

The office score is a weighted aggregate. Inactive domains are reported as inactive and excluded from the denominator.

## Intervention Contract

Every recommendation must include:

- `title`: the action the owner should consider;
- `severity`: `watch`, `friction`, or `critical`;
- `expectedEffect`: what should improve if action is taken;
- `confidence`: deterministic confidence from observed evidence;
- `riskIfIgnored`: what likely worsens if no action is taken;
- `source`: the operational domain that produced the recommendation.

## LLM Contract

The LLM explanation layer receives structured cognition output only. It may summarise detected risk, explain contributing causes, explain recommended interventions, and prepare an owner briefing.

It must not create or alter scores, calculate financial truth, invent predictions, recommend unsupported action, or replace deterministic backend rules.

## Next Phases

1. Append-only cognition event ledger for operational signals.
2. Worker jobs for anomaly recognition using scikit-learn.
3. Worker jobs for prediction using XGBoost or equivalent local models.
4. Reasoning graph across client, project, finance, team, and compliance dependencies.
5. Outcome measurement after intervention.
6. LLM briefing generated from persisted cognition snapshots.
