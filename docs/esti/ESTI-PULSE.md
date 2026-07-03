# ESTI Pulse — Project Standup Engine

**Status:** ◐ P-1 + P-2 + P-3 shipped 2026-07-03, P-4 planned · **Owner:** Holagundi Consulting Works (HCW) · **Adopted:** 2026-07-02

ESTI Pulse is an **ESTI capability** — part of the Embedded Studio
Intelligence layer inside the AORMS workspace — that periodically reviews
project tasks, detects missing dependencies and information, asks the right
team member the right question, recalculates task priority and confidence,
and tells the office **what must be done first**.

This is not a chatbot. It is a **task-risk and dependency-resolution engine**
for architecture offices.

> **Nomenclature:** **AORMS** (Architecture Office Resource Management System)
> is the workspace that holds the tasks, drawings, approvals and records Pulse
> reads. **ESTI** (Embedded Studio Intelligence) is the intelligence layer;
> Pulse is one of its capabilities, beside ESTI AI / Ask ESTI and the
> [Cognition Engine](COGNITION-ENGINE.md). The cognition engine watches the
> **office** (health scores, owner attention); ESTI Pulse watches **projects
> and tasks** (dependencies, blockers, standups). Both obey the same law:
> *deterministic systems create business truth; LLMs explain business truth.*
> Pulse never lets an LLM invent a score, a deadline, or a priority.

---

## 1. Core principle

Every task is not equally urgent. The engine answers one question:

> **Which task, if ignored now, creates the highest project damage?**

Damage classes: site stoppage · client escalation · drawing delay · approval
delay · payment delay · rework · consultant dependency failure · contractor
idle time · compliance risk · reputation damage.

## 2. Pipeline

```text
AORMS project data (esti_task, drawings, approvals, invoices, site records)
        ↓
Task Dependency Graph            (Module 1)
        ↓
Missing Parameter Detector       (Module 2)
        ↓
Project Standup Agent            (Module 3)
        ↓
Team Question Loop               (Module 4)
        ↓
Priority Scoring Engine          (Module 5)  +  Confidence Score (Module 6)
        ↓
Action recommendations
        ↓
Studio Intelligence dashboard + notifications
```

## 3. What already exists (build on, do not duplicate)

| Foundation | Where | Status |
|---|---|---|
| Task model — status, priority, dueDate, assignee/reviewer FKs, classification, workType, difficultyCoefficient, estimatedHours | `esti_task` (`backend/src/db/schema/hr-work.ts`) | ✅ live |
| Single blocking dependency | `esti_task.dependsOnId` | ✅ live (Pulse generalises to a graph) |
| Stale-blocker flag (>48 h unresolved dependency) | `esti_task.interventionRequired` | ✅ live |
| Multi-factor priority score 0–100 | `esti_task.priorityScore` + `tasks.computeScores` (`computeTaskPriority`) | ✅ live (Pulse extends the factor set) |
| Today's Work Queue (top-20 by score) | `tasks.todayQueue` → Work hub / Studio Intelligence WORK tab | ✅ live |
| Office-level cognition + Action Center | `cognition/engine.ts`, `dashboard` namespace | ✅ live |
| Notifications, threaded comments, immutable activity | `notifications` / `comments` / `activity` | ✅ live |
| AI runtime (Ollama, prompts) | `@hcw/aorms-ai-kit`, `ai` namespace (Pro-gated) | ✅ live |
| **Dependency graph** (P-1) | `esti_task_dependency` (migration `0145`) + `pulse.dependencies.*` | ✅ live |
| **Missing-parameter detector** (P-1) | `esti_task_missing_param` + `detectMissingParameters()` + `pulse.detect` / `pulse.missingParameters.*` | ✅ live |
| **Confidence score** (P-1) | `esti_task.confidenceScore` + `computeConfidenceScore()` | ✅ live |
| **Priority bands** (P-1) | `bandForScore()` — shown in Work hub Tasks tab + Studio Intelligence WORK queue | ✅ live |
| **Priority/confidence audit log** (P-1) | `esti_task_priority_log` + `pulse.recompute` | ✅ live |
| **Standup sessions + questions** (P-2) | `esti_standup_session` / `esti_standup_question` (migration `0146`) + `pulse.standup.*` | ✅ live |
| **Standup scheduler** (P-2) | `runDueStandups()` — 5-min server tick, `backend/src/index.ts` | ✅ live (best-effort, server-local time) |
| **Standup UI** (P-2) | `PulseStandupModal.tsx` — launched from the Work hub Tasks tab (project-scoped) | ✅ live |
| **Approval-based action agent** (P-3) | `esti_pulse_action` (migration `0147`) + `pulse.actions.{propose,list,decide}` — escalation ladder + follow-up task proposals, approve/reject only | ✅ live |
| **Action proposal scheduler** (P-3) | 30-min server tick — `proposePulseActions()`, `backend/src/index.ts` | ✅ live |

## 4. Module 1 — Task Dependency Graph

Tasks are not flat to-do items. Each task knows what it depends on and what
depends on it.

```text
Client Approval → Revised Drawing → CMS BOQ Update → Work Order → Site Execution → Billing
```

`esti_task_dependency` (new) supersedes the single `dependsOnId` with a
many-to-many graph: `taskId · dependsOnTaskId · dependencyType
(BLOCKS | INFORMS | APPROVAL | DOCUMENT) · status`. Required-input fields
(approvals, documents, site inputs, consultant inputs, client inputs) are
modelled as **missing parameters** (Module 2), not as columns.

## 5. Module 2 — Missing Parameter Detector

Detect incomplete information **before** the task becomes a crisis. A missing
parameter is a typed, assignable gap on a task:

no due date · no assignee · no client approval · no consultant input · no
site measurement · no drawing reference · no BOQ/CMS reference · no vendor
decision · no dependency mapping · no document attached · no fresh update ·
no confirmation from the responsible person.

Detection is **deterministic rules per task type**, e.g.:

```text
IF task.status = OPEN
AND task.type   = DRAWING_RELEASE
AND no APPROVAL parameter is CONFIRMED
THEN raise missing parameter APPROVAL_STATUS_UNKNOWN → route to Project Architect
```

## 6. Module 3 — Project Standup Agent

At scheduled intervals the agent scans active projects and asks **only the
questions needed to resolve uncertainty**.

Standup cycles (per-firm configurable; runs in the backend scheduler):

```text
09:00  Morning Project Pulse
12:00  Midday Blocker Check
15:00  Dependency Resolution Check
18:00  Closure Review
```

The agent never asks "What is the update?". It asks:

```text
Project: Residence A
Task: Finalize staircase detail
Missing:
1. Site measurement confirmation
2. Structural consultant beam detail
3. Railing material approval
Please update these before 3 PM.
```

## 7. Module 4 — Team Question Loop

Convert hidden blockers into visible data. Questions route by parameter type
to the responsible role (mapping is firm-configurable; defaults):

| Missing | Routed to |
|---|---|
| Client approval | Project Architect (assigned PARTNER/SENIOR) |
| Site measurement | Site Engineer (assignment on the project) |
| Consultant input | Project Coordinator / `engagements` owner |
| Cost implication | Accounts (ACCOUNTANT seat) |
| Drawing issue | Drafting lead (task reviewer) |
| Material decision | Architect / client coordinator |
| Payment blocker | Accounts |

Response types: `CONFIRMED · PENDING · BLOCKED · NOT_REQUIRED · NEEDS_REVIEW
· ATTACHED_DOCUMENT · COMMENT_ONLY`. Every response updates the task's
parameters, confidence and priority — answers are data, not chat.

## 8. Module 5 — Priority Scoring Engine

Rank work by **consequence, not noise**. Extends the live
`computeTaskPriority` factor set:

```text
Priority Score =
  Deadline Risk + Dependency Blockage + Site Impact + Client Impact
+ Financial Impact + Compliance Risk + Rework Risk + Aging Risk
+ Confidence Penalty
```

Priority bands (replace raw-number display everywhere):

```text
CRITICAL       Immediate attention required
ACTION TODAY   Must be resolved today
WATCH          Risk is developing
NORMAL         Planned work
BACKLOG        Safe to defer
```

Every recalculation writes an `esti_task_priority_log` row (old/new priority,
old/new confidence, reason) — scores must be explainable and auditable.

## 9. Module 6 — Confidence Score

A task with missing data must not look healthy.

```text
Confidence Score =
  Dependency Completeness + Latest Update Freshness + Approval Clarity
+ Document Availability + Assignee Confirmation + Site Readiness
```

```text
Task: Issue electrical drawing        Status: Open · Due: tomorrow
Missing: client fixture approval
Confidence: 42% · Priority: CRITICAL
Reason: the drawing cannot be completed until fixture approval is received;
this blocks site electrical work.
```

`esti_task.confidenceScore` (new column, 0–100) sits beside the live
`priorityScore`.

## 10. Module 7 — RAG Layer (phase 4)

Ground the agent's explanations in the firm's own records: site notes,
meeting minutes, client approvals, transmittals, CMS/BOQ revisions, invoices,
contracts, consultant comments, compliance library, past task history.

Use cases: find a previous similar delay · retrieve the related approval
note · check the latest site instruction · match a CMS item · summarise a
blocker history.

Storage: **pgvector first** (stays inside the existing Postgres, no new
service); Qdrant is the documented scale-out option. Embeddings via Ollama
(`bge-m3` or `nomic-embed-text`). RAG output feeds *explanations only* —
never scores.

## 11. Module 8 — Agent maturity stages

The agent earns autonomy; it never starts with it.

```text
Stage 1  Read-only      reads status, detects missing data, suggests questions
Stage 2  Draft-only     drafts reminders, task updates, meeting notes
Stage 3  Approval-based sends reminders / updates fields / creates follow-ups after user approval
Stage 4  Limited auto   routine reminders, overdue-blocker escalation, confidence refresh
```

Stage is a firm setting; promotion is explicit (owner action), per firm,
never automatic.

## 12. Module 9 — Dashboard output

Pulse surfaces inside **Studio Intelligence** (Overview action items + WORK
tab) and the **Tasks** pillar (the Priority Engine slot in
[NAVIGATION.md](NAVIGATION.md) §3) — no new nav pillar.

Sections: Today's Critical Tasks · Blocked Tasks · Missing Parameters ·
Pending Team Responses · Low Confidence Tasks · Upcoming Site Impact ·
Client Approval Bottlenecks · Consultant Delay Watch · Payment/Billing
Blockers.

Task card (Pure Carbon — Tile + Tag + DataTable):

```text
Task: Finalize staircase detail        Project: Residence A
Priority: CRITICAL                     Confidence: 38%
Why now: site execution is blocked — latest measurement and structural input missing.
Missing: site measurement · structural consultant detail · railing material approval
Next action: ask the site engineer and consultant coordinator for confirmation.
```

## 13. Design rule — never noisy

Bad agent: `Please update your tasks.`

Good agent: `Project Alpha has 2 tasks blocking site work tomorrow. Please
confirm client approval for tile selection and the latest site measurement.`

One targeted question per gap, routed to one owner, with a deadline. Repeat
questions escalate (assignee → reviewer → owner), they do not re-ask.

## 14. Data model (new tables, `esti_` convention)

```text
esti_task (extend)            confidence_score int 0–100
esti_task_dependency          id · task_id · depends_on_task_id · dependency_type · status · created_at
esti_task_missing_param       id · task_id · parameter_type · description · assigned_to · status · resolved_at
esti_standup_session          id · project_id · session_type · scheduled_at · started_at · completed_at · status
esti_standup_question         id · session_id · task_id · question_text · asked_to · response_status · response_text · created_at · answered_at
esti_task_priority_log        id · task_id · old/new_priority_score · old/new_confidence_score · reason · created_at
```

`dependsOnId` remains for backward compatibility and is migrated into
`esti_task_dependency` (type BLOCKS); reads prefer the graph.

## 15. System flow

```text
1. Scheduled standup starts (per-firm cycle)
2. Engine scans active project tasks
3. Dependency graph evaluated
4. Missing parameters detected
5. Confidence recalculated → 6. Priority recalculated (log rows written)
7. Agent prepares targeted questions (stage-gated)
8. Questions delivered (in-app notification; email later; WhatsApp later)
9. Responses collected as typed data
10. Task data updated → 11. Priority list regenerated
12. Dashboard shows what must be done first
```

## 16. Tech stack (AORMS reality)

| Concern | Decision |
|---|---|
| Engine + scheduler | Existing Fastify backend (TypeScript); standup cycles on the in-process scheduler; heavy scans can offload to the Python worker via Redis streams later |
| Graph + tables | PostgreSQL relational tables (above); Neo4j only if graph queries outgrow SQL (not expected at office scale) |
| Scoring | Deterministic TypeScript in `packages/contracts` (pure, unit-tested — same pattern as `computeTaskPriority` / ASPRF) |
| LLM runtime | Ollama via `@hcw/aorms-ai-kit` (existing); vLLM documented as production-scale option |
| Agent orchestration | Deterministic state machine in the backend (stage-gated); LangGraph noted as a later option, not a day-1 dependency |
| Vectors (phase 4) | pgvector first; Qdrant as scale option; `bge-m3` / `nomic-embed-text` embeddings |
| Notifications | Existing `notifications` namespace; email via existing mail transport; WhatsApp later |

## 17. Plan gating

- **Deterministic core** (dependency graph, missing parameters, priority
  bands, confidence, priority log): available to every edition — it is task
  hygiene, same tier as the existing `priorityScore`.
- **Standup agent + question drafting + RAG** (anything touching the LLM):
  **Pro** (`ai` plan feature), consistent with
  [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md).

## 18. Delivery phases

| Phase | Scope | Gate |
|---|---|---|
| **P-1 Graph + gaps** ✅ | `esti_task_dependency` + `esti_task_missing_param` + detector rules; band display (CRITICAL…BACKLOG); confidence column + formula; priority log | Blocked/low-confidence tasks visible in Work hub + Studio Intelligence; scores reproducible from inputs |
| **P-2 Standup loop** ✅ | `esti_standup_session/question` (migration `0146`); best-effort server-local scheduler (09/12/15/18, once/project/day); question routing (asked to the task's assignee); typed responses; Stage-1/2 agent (template composition only, zero LLM) | A full standup runs end-to-end with zero LLM required; questions are specific, routed, and answerable in-app |
| **P-3 Approval agent** ✅ | Stage-3 actions (escalate, follow-up tasks) proposed on a schedule; approve/reject-only decision path | No agent write without a recorded human approval; audit trail complete |
| **P-4 RAG + Stage 4** | pgvector embeddings over office records; grounded explanations; limited auto-actions | Explanations cite source records; auto-actions limited to the Stage-4 list |

Naming: the module is **ESTI Pulse** (product name), namespace `pulse`
(tRPC), tables `esti_standup_*` / `esti_task_*` as above.
