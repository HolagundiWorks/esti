# HCW AI-Orchestration UX — designing ESTI's mission-first surfaces

**The canonical UX authority for every AI surface on the AORMS platform** — how
**ESTI** (internal agent in AORMS-Studio: *Ask ESTI · Studio Intelligence · ESTI
Pulse · the cognition engine*) and **EmOI** (external quality gate) present work to
the human. Companion to **[HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md)** (general
UX law): where that governs *chrome and screens*, this governs *how an autonomous
agent reports, asks, and defers to human judgment*.

**Adopted:** 2026-07-12 · **Applies to:** ESTI (Studio Intelligence, Ask ESTI, ESTI
Pulse, AI Studio, the Overview AI-recommendation rail), EmOI surfaces, and every
future AI feature built on `@hcw/ui-kit`.

> **Scope boundary.** This document is about the UX of the AI *product* (ESTI) —
> what the user sees. It is **not** the [12-AI-AGENT-RULEBOOK](../hcw-kit/12-AI-AGENT-RULEBOOK.md),
> which governs how the AI *coding agent* (building the kit) must behave. Different
> readers, different law.

---

## 1. North star

> **The interface adapts to the user's cognitive role, not the AI's implementation
> role. ESTI reports intent and progress; the human manages intent, not
> implementation.**

AORMS users are architecture principals, project leads, and studio staff — the
**architect, product owner, and mission commander**, never the executor. ESTI is the
engineering organization: it plans, executes, validates, reports, and escalates only
when human judgment is genuinely required.

The interface exists to answer **four questions in under 30 seconds**:

1. **What is the mission?**
2. **What has been completed?**
3. **What requires my judgment?**
4. **What happens next?**

If a screen cannot answer those four at a glance, it is failing — no matter how
capable the model behind it.

**Conversation-first is the failure mode.** Chat is a *transport layer*, not the
workspace. Long-duration studio work — a fee proposal, a compliance review, a
drawing register cleanup — is not a conversation; it needs persistent state,
progress visibility, decision history, and preserved context. The workspace is
**artifacts + dashboards + a decision queue**, with Ask ESTI as *one* interaction
mechanism among many.

This is why Studio Intelligence (`/`, `StudioAbstract.tsx`) is a **dashboard**, not a
chat window — and it is the reference every AI surface clones.

---

## 2. The interface hierarchy — depth = responsibility

Information is layered by the user's level of responsibility. Implementation is
**always the deepest layer**; most users should rarely open it.

```
Mission          ← one sentence
   ↓
Objectives       ← ≤5
   ↓
Current phase    ← + progress + ETA
   ↓
Progress         ← completed · in-progress · remaining
   ↓
Pending decisions  ← highest-priority section
   ↓
Risks
   ↓
Artifacts        ← the durable output
   ↓
Implementation   ← code / logs / tRPC calls — opt-in only
```

This is the same **progressive-disclosure** law as
[HCW-UI-UX-PRINCIPLES §7](HCW-UI-UX-PRINCIPLES.md), expressed for AI: *reveal the next
decision, not every branch*. It maps directly onto the kit's **material layers** —
depth encodes importance ([HCW-UI-KIT.md](HCW-UI-KIT.md)):

| Hierarchy level | Kit layer / primitive | User feels |
|---|---|---|
| Mission · objectives · summary | Flat headings + `Surface layer="flat"` | "I'm reading the state." |
| Progress · artifacts · risk cards | `Surface layer="soft"` cards, `DataState`, `StatusDot`, `HealthGlassOrb` | "I'm inspecting objects." |
| Pending decisions · commit | `Surface layer="glass"` + **ActionDock** | "This wants my judgment / click." |
| Implementation (code, logs) | Collapsed `<details>` / opt-in drawer | "I chose to go deep." |

**Never expose implementation by default.** Code, tRPC payloads, and chain-of-thought
live behind an explicit affordance.

---

## 3. Reporting levels — one agent, four voices

ESTI communicates differently by the reader's cognitive role. Same work, four
registers:

| Level | Reader | Visibility | Contains |
|---|---|---|---|
| **L0 — Internal** | none | hidden | chain-of-thought, planning, intermediate reasoning |
| **L1 — Engineering** | staff / power user | on demand | code, tRPC/API calls, technical logs, DB changes |
| **L2 — Orchestrator** | project lead (**default**) | default | mission · progress · risks · pending decisions · artifacts · confidence · next actions |
| **L3 — Executive** | principal | one page | mission · KPIs · milestones · timeline · health · confidence |

**L2 is the default surface.** Studio Intelligence, ESTI Pulse, and AI Studio open at
L2. L1 is a drill-down (§2); L3 is the Executive Summary (§7). L0 is never shown —
if reasoning must be surfaced for trust, it is summarized as an artifact, not dumped
as a transcript.

---

## 4. Mission-first surface anatomy

Every AI surface is assembled from these blocks (each already has, or maps to, a kit
primitive). Present them in priority order — **pending decisions rank above
everything**.

### 4.1 Mission
One sentence. *"Prepare the COA fee proposal for Project Meadowbrook."*

### 4.2 Objectives — ≤5
Miller's Law ([UX-PRINCIPLES §7](HCW-UI-UX-PRINCIPLES.md)). More than five objectives
means the mission is really two missions.

### 4.3 Current phase
`Discovery → Architecture → Implementation → Validation → Documentation → Review →
Complete`. Show **phase · progress · estimated completion**. Phase state uses the
`zoneState` vocabulary already in `components/dashboard/zoneState.ts`.

### 4.4 Progress — not a transcript
`Completed ✓ · In progress • · Remaining ○`. This replaces re-reading chat. Render
with `StatusDot` (never a filled chip) and `DataState` for the loading/empty case.

### 4.5 Activity feed (ESTI Pulse) — not a chat
*Currently working on · expected duration · next step.* No code. This is
situational awareness, not a message log. Streamed tokens, if shown, are a
*progress signal* — they scroll away; the artifact is what persists.

### 4.6 Pending decisions — the highest-priority section
Only surfaces choices that genuinely need human judgment. Each **decision card**:

| Field | Rule |
|---|---|
| **Question** | One line, plain language |
| **Recommendation** | ESTI's default, first — *(Recommended)* |
| **Alternatives** | ≤3 |
| **Impact** | What it affects |
| **Time to decide** | Honest estimate |

Commit a decision through the **ActionDock** (CENTER = choose/generate, RIGHT =
approve/commit, LEFT = reject/discard) — the same muscle memory as every other AORMS
screen ([UX-PRINCIPLES §6](HCW-UI-UX-PRINCIPLES.md)).

### 4.7 Frozen decisions — anti-drift
Locked choices ESTI may **not** revisit without explicit human approval. Inspired by
engineering design-freeze / command intent. They keep the agent from re-litigating
settled ground. AORMS's standing frozen set:

| Decision | Frozen value |
|---|---|
| Design system | **HCW-UI-Kit** (`@hcw/ui-kit`) — *Carbon React was removed 2026-07* |
| Architecture | pnpm monorepo — `contracts · backend · frontend · worker` |
| Language | TypeScript (+ Python worker) |
| Database | PostgreSQL via Drizzle |
| Money | integer **paise**; `formatINR` |
| Security baseline | OWASP; capabilities in `permissions.ts` |
| Platform scope | **AEC consulting only** (architecture + engineering) |

A frozen decision is data, displayed as a locked `StatusDot`/read-only row — never an
editable field.

### 4.8 Risk board
ESTI continuously reports **High / Medium / Low**. Severity is encoded by
**shape + label first, colour second** — reuse `HealthGlassOrb` /
`OfficeHealthGlyph` (WCAG 1.4.1, [UX-PRINCIPLES §8](HCW-UI-UX-PRINCIPLES.md)).

### 4.9 Artifacts — the durable workspace
Artifacts *replace* conversation as the record: proposals, specs, checklists, audit
reports, decision logs, UI/security reviews, research notes. **Conversation is
temporary; artifacts are permanent and versioned.** Every meaningful ESTI output
becomes an addressable, versioned artifact — not a message the user must scroll back
to find.

### 4.10 Confidence
A single honest score per mission/decision. Low confidence is a *feature* — it routes
the item into Pending Decisions rather than silently proceeding.

---

## 5. Cognitive modes — the interface follows the work

The same surface reshapes to the user's current cognitive state. ESTI's behaviour
changes with it.

| Mode | Interface | ESTI behaviour |
|---|---|---|
| **Design** | canvas · whiteboard · research · mind-maps; quiet | explore, challenge assumptions, generate options — **no implementation** |
| **Transition** | decision summary · design-freeze · execution plan · checklist | compress, summarize, **lock decisions**, prepare execution |
| **Orchestration** | mission dashboard · artifacts · progress · decision queue · risk board | execute, monitor, report, escalate |
| **Execution** | focused editor · minimal nav · no notifications | assist only when asked; introduce **no** new design ideas |
| **Review** | comparison view · quality reports · validation results · change summary | audit, critique, suggest — **do not redesign architecture** unless asked |

**Orchestration mode is the AORMS default** (Studio Intelligence). The others are
deliberate context switches the user invokes.

---

## 6. Notification policy — protect attention

Human attention, not compute, is the scarce resource. Every needless prompt is a
cognitive tax.

**Interrupt the user only for:**
- Strategic decisions
- Blockers
- Conflicting requirements
- Failed validation
- Mission completion

**Never interrupt for:**
- Progress updates (they live on the dashboard / Pulse)
- Intermediate implementation
- Routine generation
- Minor improvements

Interruptions use `ToastHost`/`pushToast` for the non-blocking case and a Pending
Decision card for the blocking case — never a modal that steals focus mid-task
unless work is truly blocked.

---

## 7. Executive Summary — always one screen

Available from any AI surface. Maximum one viewport. Contains **only**:

- Mission status
- Overall progress
- Open decisions
- Current risks
- Next milestone
- Confidence score

Nothing more. This is the L3 view (§3) and the answer to the four questions (§1).

---

## 8. How this maps onto today's AORMS surfaces

Doctrine, grounded in what ships. (Embedding is staged — this doc lands first; ESTI
and Ask ESTI adopt it next.)

| Surface | File / route | Orchestration role | Current vs target |
|---|---|---|---|
| **Studio Intelligence** | `StudioAbstract.tsx` · `/` | The mission dashboard — L2 default | Already dashboard-first (KPI cards + tables + AI-recommendation rail). Target: add explicit mission line, phase strip, decision queue, risk board. |
| **Ask ESTI** | AI chat surface | Chat = **transport**, not workspace | Ensure outputs land as artifacts + decision cards, not just transcript. |
| **ESTI Pulse** | activity/insight feed | §4.5 activity feed | "Currently working on / next", no code. |
| **AI Studio** | plan+rank pillar (PRO-gated) | Design/Transition mode surface | Options + recommendation + confidence; freeze on accept. |
| **Overview AI rail** | `StudioAbstract` Overview sidebar | L3 Executive Summary in miniature | Recommendation over Office Log — extend toward the §7 one-screen contract. |

**Reuse, don't invent.** Every block in §4 already has a kit primitive
([HCW-UI-KIT.md](HCW-UI-KIT.md)): `StatusDot`, `HealthGlassOrb`, `DataState`,
`ActionDock` + `useScreenActions`, `Surface` layers, `PageBreadcrumb`, `ToastHost`.
AI surfaces are assembled from these — no bespoke AI-only chrome.

---

## 9. Anti-patterns (do not ship on an AI surface)

| Anti-pattern | Why |
|---|---|
| Chat transcript as the primary workspace | Forces re-reading; state lives nowhere durable |
| Streaming code/logs by default | L1 leaks into L2; overloads the orchestrator |
| Exposing chain-of-thought (L0) | Noise; erodes trust more than it builds it |
| Interrupting for progress updates | Violates §6; attention tax |
| A decision card with no recommendation | Pushes the whole choice onto the human — ESTI must have a default |
| Silent low-confidence execution | Confidence must route to Pending Decisions, not hide |
| Colour-only risk severity | Fails WCAG 1.4.1 — use `HealthGlassOrb` shape+label |
| Re-litigating a frozen decision | Drift; wastes the human's attention on settled ground |
| Bespoke AI panel ignoring rail·stage·dock | Breaks the one-spatial-model law ([UX-PRINCIPLES §4](HCW-UI-UX-PRINCIPLES.md)) |

---

## 10. Review checklist (AI-surface PR / agent)

- [ ] Answers the **four questions** (§1) in <30s
- [ ] Opens at **L2** (orchestrator); L1/implementation is opt-in drill-down
- [ ] **Pending decisions** ranked above progress/artifacts; each card has a *recommendation first*
- [ ] Decisions commit via **ActionDock** zones (reject LEFT · choose CENTER · approve RIGHT)
- [ ] **Frozen decisions** are read-only; risk uses `HealthGlassOrb` shape+label
- [ ] Meaningful outputs persist as **versioned artifacts**, not transcript
- [ ] **Confidence** shown; low confidence routes to a decision, never silent
- [ ] Interruptions obey §6 (blockers/strategy/completion only)
- [ ] Built from `@hcw/ui-kit` primitives on the rail·stage·dock model — no bespoke AI chrome
- [ ] No L0 chain-of-thought surfaced

---

## 11. Why this matters (the wager)

Roads shaped cities; interaction patterns will shape AI-native software. The first
generation of AI products is conversation-centric — efficient for retrieval,
inefficient for knowledge work. AORMS's bet is **orchestration over conversation**:
the studio principal manages *intent*; ESTI manages *execution*; the interface keeps
the human continuously oriented without drowning them in the AI's implementation.

The product that wins is not the one with the best model. It is the one with the best
**cognitive architecture**.

---

## 12. Related documents

| Area | Doc |
|---|---|
| General UX law | [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) |
| Layers · spatial model · primitives | [HCW-UI-KIT.md](HCW-UI-KIT.md) |
| Nomenclature (ESTI · EmOI · AORMS) | [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) |
| Navigation / IA | [NAVIGATION.md](NAVIGATION.md) |
| AI *coding-agent* rules (not this) | [12-AI-AGENT-RULEBOOK.md](../hcw-kit/12-AI-AGENT-RULEBOOK.md) |
| Measurable UX checklists | [07-UX-REVIEW-CHECKLISTS.md](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md) |

---

*HCW AI-Orchestration UX · Human Centric Works · AORMS / ESTI*
