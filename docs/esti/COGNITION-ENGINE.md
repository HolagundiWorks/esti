# AORMS Cognition Engine

**Status:** Live foundation · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-23

AORMS is not an ERP dashboard with an AI chatbot bolted on. **ESTI — Embedded Studio Intelligence — is its cognition engine**: the intelligence layer that continuously observes office operations, calculates current health, recognises pressure, recommends intervention, and explains the result to the owner.

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

## Current Implementation

The live implementation is deterministic and backed by a normalized cognition
event layer:

- computes domain health from existing dashboard read models (finance, client, project, team, approval);
- ingests real office records into `esti_cognition_event` with stable `source_key`
  values so repeated ingestion updates the same signal instead of duplicating it;
- materializes learned behavior profiles in
  `esti_cognition_behavior_profile` for clients, assignees, and office-level
  approval patterns;
- materializes open priority items in `esti_cognition_priority_item`;
- produces office health as a weighted score;
- emits ranked intervention recommendations with `title`, `confidence`,
  `expectedEffect`, and `riskIfIgnored`;
- returns this as `dashboard.home.cognition` and
  `dashboard.home.cognitiveEngine` via the existing `dashboard.home` bundle;
- exposes `dashboard.ingestCognition` and `dashboard.cognitionQueue` for worker,
  cron, and test access;
- keeps LLMs outside the score and intervention path.

The dashboard TODAY'S FOCUS tile renders the breathing space engine: OFFICE CALMNESS score + at most 3 immediate actions + safely deferred list + system confidence. The SYSTEM HEALTH quad tile shows live domain health percentages.

The Python worker image carries scikit-learn, XGBoost, MLflow, and Evidently for
future model-assisted recognition and prediction phases. The current production
path is TypeScript/PostgreSQL deterministic logic.

## Event Ingestion

The ingestion engine lives in `backend/src/modules/cognition/engine.ts`.

Inputs:

- pending approvals;
- overdue invoices;
- billing-ready phases;
- project health rows;
- client-intelligence rows;
- team-intelligence rows;
- near meeting/review tasks.

Each event records:

- domain and event type;
- subject and project references;
- severity;
- urgency, finance, dependency, team blockage, meeting proximity, deadline, and
  safe-deferral scores;
- final `priorityScore`;
- structured evidence JSON.

## Priority Formula

Priority is deterministic:

```text
priority =
  urgency
  + financial impact band
  + dependency risk
  + team blockage
  + meeting proximity
  + deadline risk
  - safe deferral
```

The score is clamped to `0-100`. Financial impact is logarithmic so one large
invoice matters without overwhelming every other signal.

## Behavioral Learning

The first learning layer is durable pattern extraction, not black-box ML.

Profiles are currently generated for:

- clients: approval delay, payment delay, revision churn, normal response;
- assignees: overload, deadline slip, balanced load;
- office approval system: approval queue backlog.

Each profile stores sample count, confidence percentage, metrics, and last
observed timestamp. These are evidence for reasoning and future prediction, not
punitive staff scoring.

## AI Reasoning Frame

`dashboard.home.cognitiveEngine.reasoning` returns:

- the single next best action;
- supporting evidence;
- expected benefit;
- step-by-step `howTo`;
- learned patterns that explain why the action is suggested;
- items safe to ignore today.

The frame has:

```text
rule = DETERMINISTIC_REASONING_LLM_EXPLAINS_ONLY
```

This is the handoff object for an LLM briefing. LLMs may explain this frame in
plain language but must not change the score, action, evidence, or ranking.

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

1. Worker jobs for anomaly recognition using scikit-learn.
2. Worker jobs for prediction using XGBoost or equivalent local models.
3. Reasoning graph edges across client, project, finance, team, and compliance
   dependencies.
4. Outcome measurement after intervention.
5. LLM briefing generated from persisted cognition snapshots.
