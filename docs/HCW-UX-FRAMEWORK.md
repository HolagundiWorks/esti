# HCW UX Framework — Charter

**Status:** Canonical UX **framework** (model) · **Adopted:** 2026-07-21 · **Version:** 1.2  
**Type:** UX **framework** — principles, scope, diagram, KPIs  
**Run it with:** [HCW-UX-PROCESS.md](HCW-UX-PROCESS.md) (the **process**) · **Index:** [HCW-UX.md](HCW-UX.md)  
**Executable layer:** `@hcw/ui-kit` · **Laws:** [HCW-UI-UX-PRINCIPLES.md](esti/HCW-UI-UX-PRINCIPLES.md) · **AI module:** [HCW-AI-ORCHESTRATION-UX.md](esti/HCW-AI-ORCHESTRATION-UX.md) · **Construction overlay:** [HCW-CONSTRUCTION-UX-OVERLAY.md](esti/HCW-CONSTRUCTION-UX-OVERLAY.md)

| Framework (this doc) | Process |
| --- | --- |
| *What is true* — problem, seven principles, one diagram, KPIs | *What we do* — Plan → Design → Build → Evaluate → Improve |
| Rarely changes | Runs every change / sprint |

This charter answers: *what problem we solve, for whom, with what structure, how we measure, and where we stop.* The process turns that model into repeatable team action. Everything else (tokens, components, checklists) implements both.

---

## 1. Purpose

### Problem statement

Knowledge workers and AI supervisors under time pressure face three failures in modern product UI:

1. **Attention inflation** — every surface glows, so nothing is urgent.
2. **Geography drift** — each screen invents its own chrome; muscle memory never forms.
3. **Conversation-first AI** — chat dumps implementation; humans re-read threads instead of supervising missions.

Existing design systems (Material, Carbon, Fluent…) optimise **component consistency**. Existing AI UIs optimise **dialogue**. Neither optimises **cognitive role + spatial supervision** under load.

**HCW UX Framework** solves: *how to design product and AI surfaces so a professional can answer “where am I, what matters, what do I do, what happens next?” in under 30 seconds — calmly, repeatedly, and accessibly.*

### Scope

| In scope | Out of scope |
| --- | --- |
| Product chrome, information architecture, interaction contracts | Brand marketing strategy (except marketing *shell*) |
| Cognitive load, interruption, trust calibration, SA | Model training / agent internals |
| AI *product* UX (mission-first supervision) | Coding-agent behaviour ([12-AI-AGENT-RULEBOOK](hcw-kit/12-AI-AGENT-RULEBOOK.md)) |
| Domain-agnostic kit primitives | Domain business rules baked into kit |
| Construction *overlay* (roles, lifecycle, field) | Full CPM / BIM authoring standards (integrate, don’t replace) |

### Target users

| Role | How they use the framework |
| --- | --- |
| **Product designers** | Spatial + layer decision trees; templates; catalog attributes |
| **Engineers** | Kit primitives, tokens, CI gates, R1–R10 recipes |
| **PMs / product owners** | Priority via dock/decision law; KPI dashboard |
| **Executives / principals** | Four-question AI glance; scarce interruption |
| **Researchers / auditors** | Evidence map + measurable checklists |
| **Construction stakeholders** (via overlay) | Role modes, lifecycle phases, field density |

---

## 2. Structure — seven memorables

Keep these seven; everything else is elaboration.

| # | Principle | One-liner |
| --- | --- | --- |
| **1** | Depth encodes importance | Flat = info · soft = object · glass = action |
| **2** | One geography | Rail · Stage · Taskbar · Dock — never invent a fifth region |
| **3** | One accent, scarce lift | Radiant Orange for fills/active chrome only |
| **4** | Capacity under load | Cowan caps (`CAPACITY`) beat unbounded strips |
| **5** | Cognitive role first | Interface serves the human’s job, not the system’s internals |
| **6** | Mission over conversation | AI surfaces answer four questions in ≤30s |
| **7** | UX law beats taste | When aesthetics and law conflict, law wins |

### One diagram (the model)

```
                    ┌─────────────────────────────────────┐
                    │         COGNITIVE ROLE              │
                    │   (architect · owner · supervisor)  │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
   │  GEOGRAPHY  │            │   DEPTH     │            │  CAPACITY   │
   │ Rail·Stage  │            │ flat·soft   │            │ chunks ≤4±1 │
   │ Taskbar·Dock│            │ ·glass      │            │ interrupt ≤2│
   └──────┬──────┘            └──────┬──────┘            └──────┬──────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     ▼
                    ┌─────────────────────────────────────┐
                    │     WORK SURFACE / AI MISSION       │
                    │  What? Done? Judgment? Next? (30s)  │
                    └─────────────────┬───────────────────┘
                                      │
                                     KPI feedback → improve
```

### Lifecycle coverage (framework phases)

The framework **names** the lifecycle; the **process** runs it with roles and gates — see [HCW-UX-PROCESS.md](HCW-UX-PROCESS.md).

| Phase | Framework activity | Primary outputs |
| --- | --- | --- |
| **Plan** | Frame mission / screen job; pick template (T1–T10); set capacity budgets | Mission brief · template ID · CAPACITY plan |
| **Design** | Assign geography + depth by role; map decisions / risks | Layer map · dock action list · SA strip copy |
| **Build** | Compose kit primitives only; no forks | PR with catalog-cited components |
| **Evaluate** | Heuristic + WCAG + R1–R10 + KPI sample | Checklist scores · audit findings |
| **Improve** | Debt register + changelog; retire anti-patterns | Closed D-items · version bump |

Modules (usable alone): Geography · Depth · Capacity · Interaction contract · AI mission hierarchy · Construction overlay · Audit/KPI.

---

## 3. Usability — framework quickpath (process owns the gates)

This section is the **model checklist** for a single sitting. Roles, exit gates, and cadence live in **[HCW-UX-PROCESS.md](HCW-UX-PROCESS.md)**.

1. Name the user’s **cognitive role** and the screen’s **job** (one sentence).
2. Pick a **template** ([05-TEMPLATES.md](hcw-kit/05-TEMPLATES.md)) or T10 AI surface.
3. Place content in **Rail / Stage / Dock / Taskbar** — nothing else.
4. Choose **layer by role** (flat / soft / glass).
5. Cap choices with **CAPACITY**; interrupts with **INTERRUPTION**.
6. For AI: answer the **four questions** above the fold in the rail.
7. Ship via process Evaluate → Improve (checklist + KPIs · [HCW-UX-KPI-INSTRUMENT.md](esti/HCW-UX-KPI-INSTRUMENT.md)).

**Actionable outputs (not ideas):** templates · dock action tables · AwarenessStrip copy · Decision queue · ConfirmModal kind · KPI row · debt register entry.

---

## 4. Quality — evidence & measurement

### Evidence base (non-exhaustive)

Jakob · Hick · Fitts · Cowan · Endsley SA · Norman gulfs · Reason slips/mistakes · Treisman/Ware · Mayer · Bailey/Iqbal · Lee & See · W3C COGA · Nielsen 1–10 · WCAG 2.2 AA.  
Full application table: [HCW-UI-UX-PRINCIPLES.md §3](esti/HCW-UI-UX-PRINCIPLES.md).

### Repeatability

Constitution articles + agent rules R1–R10 + catalog attributes → same geometry and contracts across teams. Divergence is a defect (Constitution IX).

### Core KPIs (measure these)

| KPI | Target direction | Instrument |
| --- | --- | --- |
| Time-to-orientation | ↓ (≤30s for AI four questions) | Timed task / diary |
| Unnecessary interrupts / hour | ↓ | Toast + judgment event log |
| Dock CTA locus violations | → 0 | R5 / dock audit |
| Capacity overruns (KPI>4, dock>5, loops>3) | → 0 | CAPACITY assert / review |
| Decision cycle time (pending → frozen) | ↓ | Decision queue events |
| WCAG AA gate fails | → 0 | CI + checklist |
| Mission completion rate (AI) | ↑ | Mission outcome events |
| Rework from UX ambiguity (construction overlay) | ↓ | Change-order / RFI tags (product) |

Detail: [HCW-UX-KPI-INSTRUMENT.md](esti/HCW-UX-KPI-INSTRUMENT.md).

---

## 5. Adaptability

| Concern | Stance |
| --- | --- |
| **Scale** | Same seven principles from a login rail to a multi-mission studio |
| **Method fit** | Works inside Agile (sprint = dock commits + outcome banners), Waterfall (phase = Stage tabs), Lean (CAPACITY as WIP limit), Design Thinking (prototype against templates) |
| **Industry** | **Kit = industry-agnostic.** Construction specialization is an **intentional overlay**, not baked into tokens |

---

## 6. Integration

| Method / standard | How HCW coexists |
| --- | --- |
| Scrum / Kanban | Dock = sprint actions; AwarenessStrip loops = WIP; outcomes = done criteria |
| PMBOK / ISO | Overlay maps phases & governance; kit stays presentation |
| BIM | Overlay defines viewer/field density & decision freeze — not authoring |
| Existing DS (Material…) | Implementation engines only; HCW is authority (Constitution I) |

**Collaboration:** Dock zones and Decision queue define *who acts*; AI doctrine defines *human vs agent*; construction overlay defines *stakeholder modes*.

---

## 7. Governance

| Need | Mechanism |
| --- | --- |
| Decision support | Dock LEFT/CENTER/RIGHT · recommendation-first Decision cards · freeze rules |
| Risk awareness | HealthGlassOrb / STATUS_SHAPE · AI risk band · construction safety interrupt class |
| Continuous improvement | Debt register · audits · KPI instrument · changelog |

**Trade-off rule:** When taste conflicts with UX law, **law wins** unless a dated product exception is recorded (e.g. marketing atmosphere).

---

## 8. Evaluation checklist (self-score)

| # | Question | HCW answer (2026-07-21) |
| --- | --- | --- |
| 1 | Problem better than existing? | Yes — cognitive-role chrome + mission-first AI vs chat/DS-only |
| 2 | Every component necessary? | Yes — CAPACITY/COGA/orchestration shipped; no spare shells |
| 3 | Short intro success? | Yes — framework §3 + process §3 + T10 primitives |
| 4 | Consistent across teams? | Designed for yes; enforce via R1–R10 + process gates |
| 5 | Impact measurable? | KPIs + `logUxEvent` + case studies published |
| 6 | Integrates workflows? | Yes with eng; overlay for CPM/BIM |
| 7 | Scales? | Yes for screens; programmes via overlay |
| 8 | Evidence / cases? | [case-studies/](hcw-kit/11-audits/case-studies/) (interrupt · dock · mission) |
| 9 | One diagram? | Yes (§2) |
| 10 | Adoption motive? | Reduces inventiveness tax **and** improves decision speed |

---

## 9. Document map

| Need | Document |
| --- | --- |
| **Index (framework + process)** | [HCW-UX.md](HCW-UX.md) |
| Why (philosophy) | [HCW-DESIGN-PLAYBOOK.md](HCW-DESIGN-PLAYBOOK.md) |
| Law | [hcw-kit/00-CONSTITUTION.md](hcw-kit/00-CONSTITUTION.md) |
| This charter (framework) | **You are here** |
| **How to run (process)** | [HCW-UX-PROCESS.md](HCW-UX-PROCESS.md) |
| Heuristic → pattern | [esti/HCW-UI-UX-PRINCIPLES.md](esti/HCW-UI-UX-PRINCIPLES.md) |
| AI module | [esti/HCW-AI-ORCHESTRATION-UX.md](esti/HCW-AI-ORCHESTRATION-UX.md) · [ai-orchestration-ux-framework.md](ai-orchestration-ux-framework.md) |
| Construction | [esti/HCW-CONSTRUCTION-UX-OVERLAY.md](esti/HCW-CONSTRUCTION-UX-OVERLAY.md) |
| KPIs | [esti/HCW-UX-KPI-INSTRUMENT.md](esti/HCW-UX-KPI-INSTRUMENT.md) |
| Kit catalog | [hcw-kit/14-HCW-CATALOG.md](hcw-kit/14-HCW-CATALOG.md) |

---

## 10. Framework gaps

**Closed in 1.3.0** (see [DESIGN-DEBT-REGISTER.md](hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) Retired):

| ID | Was | Closed by |
| --- | --- | --- |
| F1 | Orchestration under-primitivized | `MissionHeader` · `ObjectiveList` · `PhaseStrip` · `DecisionQueue` · `FreezeTable` · `ConfidenceBand` + **T10** |
| F2 | CAPACITY partial | `enforceCapacity` · ActionDock trim · `KpiStrip` |
| F3 | COGA unused | `KitRoot({ coga })` / `createHcwTheme({ coga })` |
| F4 | KPI telemetry unwired | `logUxEvent` / `setUxEventSink` + dock `outcome`/`track` |
| F5 | No case studies | [11-audits/case-studies/](hcw-kit/11-audits/case-studies/) |

New gaps: file as D- or F-items on the debt register — do not leave §10 stale.