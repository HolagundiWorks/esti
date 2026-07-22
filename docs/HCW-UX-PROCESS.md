# HCW UX Process

**Status:** Canonical UX **process** · **Adopted:** 2026-07-21 · **Version:** 1.2  
**Paired with:** [HCW-UX-FRAMEWORK.md](HCW-UX-FRAMEWORK.md) (the **model**)

| | Framework | Process |
| --- | --- | --- |
| Answers | *What is true?* principles, diagram, KPIs, scope | *What do we do next?* steps, roles, gates, deliverables |
| Changes | Rarely (Constitution-level) | Per project / sprint |
| Success | Same model across products | Same outcomes across teams |

**You need both.** Framework without process = beautiful doctrine nobody runs. Process without framework = steps with no shared model.

---

## 1. Process overview — five phases

```
  PLAN ──► DESIGN ──► BUILD ──► EVALUATE ──► IMPROVE ──┐
    ▲                                                  │
    └────────────── KPI + debt feedback ───────────────┘
```

| Phase | Goal | Exit gate |
| --- | --- | --- |
| **Plan** | Frame the job and capacity | Mission/screen brief signed |
| **Design** | Geography + depth + decisions | Spec against framework §2–3 |
| **Build** | Kit-only composition | PR cites catalog + checklist |
| **Evaluate** | Prove law + KPIs | Checklist pass + KPI sample |
| **Improve** | Close debt | Register + changelog updated |

Fits **Agile** (one loop ≈ story/sprint), **Waterfall** (phases sequential), **Lean** (CAPACITY = WIP limits), **Design Thinking** (prototype in Design; test in Evaluate).

---

## 2. Roles (RACI sketch)

| Activity | Designer | Engineer | PM / PO | Auditor | Principal |
| --- | --- | --- | --- | --- | --- |
| Plan brief | R | C | **A** | I | C |
| Design spec | **A**/R | C | C | I | I |
| Build | C | **A**/R | I | I | I |
| Evaluate checklist | C | R | I | **A** | I |
| KPI review | C | C | **A** | R | I |
| Debt triage | C | C | **A** | R | I |

Construction stakeholder modes: [HCW-CONSTRUCTION-UX-OVERLAY.md](esti/HCW-CONSTRUCTION-UX-OVERLAY.md).

---

## 3. Phase playbooks

### 3.1 Plan

**Do**
1. Name the **cognitive role** (who is this for under pressure?).
2. Write the screen/mission **job in one sentence**.
3. Pick **template** T1–T9 or T10 AI ([05-TEMPLATES.md](hcw-kit/05-TEMPLATES.md)).
4. Set **CAPACITY** budgets (KPI ≤4, dock ≤5, loops ≤3, toasts ≤2).
5. List **judgments** that may interrupt (else: rail only).

**Deliverables**
- Brief (role · job · template · caps · interrupt classes)
- For AI: draft answers to the four questions

**Gate** — PM/PO accepts brief; no build without template ID.

---

### 3.2 Design

**Do**
1. Draw **Rail / Stage / Taskbar / Dock** — nothing else.
2. Assign **layer by role** (flat · soft · glass).
3. Table **dock actions** (LEFT destroy · CENTER create · RIGHT commit).
4. Draft **AwarenessStrip** (state · meaning · next) and empty/error copy.
5. AI surfaces: Mission · ≤5 objectives · Decision queue · risks · phase.
6. Construction: pick **stakeholder mode** + lifecycle phase (overlay).

**Deliverables**
- Spec: region map · layer map · dock table · SA copy · decisions
- Open questions logged as risks

**Gate** — Designer + engineer agree kit primitives cover the spec (no forks).

---

### 3.3 Build

**Do**
1. Compose from `@hcw/ui-kit` only ([14-HCW-CATALOG.md](hcw-kit/14-HCW-CATALOG.md)).
2. Mount `KitRoot` with scheme/density; publish dock via `useScreenActions`.
3. Wire `publishOutcome` on RIGHT commits; ConfirmModal `kind` for destroy.
4. No raw hex / ad-hoc geometry (R1); no duplicate CTAs (R5).
5. Emit KPI events where instrumented ([HCW-UX-KPI-INSTRUMENT.md](esti/HCW-UX-KPI-INSTRUMENT.md)).

**Deliverables**
- PR: code + docs/changelog if contract changed + checklist evidence

**Gate** — CI typecheck/test/size green; reviewer confirms catalog citations.

---

### 3.4 Evaluate

**Do**
1. Run [07-UX-REVIEW-CHECKLISTS.md](hcw-kit/07-UX-REVIEW-CHECKLISTS.md) (pass/fail + `file:line`).
2. Keyboard + skip-link + focus-visible pass (WCAG).
3. AI: can a cold user answer the **four questions in ≤30s**?
4. Sample KPIs (orientation, interrupts, capacity_warn, outcome coverage).
5. Construction: safety interrupt class and field mode if applicable.

**Deliverables**
- Checklist sheet · KPI sample · findings list

**Gate** — No P0 findings; P1s filed on debt register before merge when blocking.

---

### 3.5 Improve

**Do**
1. File/fix [DESIGN-DEBT-REGISTER.md](hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md).
2. Retire anti-patterns; bump kit version if contract changed.
3. Feed KPI trends into next Plan (raise/lower caps only with governance).
4. Optional: case note for validation ([case-studies/](hcw-kit/11-audits/case-studies/)).

**Deliverables**
- Updated debt register · changelog · KPI note

**Gate** — Register reflects reality (Constitution IX).

---

## 4. Cadence

| Ritual | When | Owner |
| --- | --- | --- |
| UX Plan huddle | Story kickoff | PM + Designer |
| Spec review | Before coding | Designer + Engineer |
| PR UX gate | Every UI PR | Engineer + reviewer |
| Checklist audit | Before release / bi-weekly | Auditor |
| KPI + debt triage | Bi-weekly | PM |

---

## 5. Process outputs → framework artifacts

| Process output | Framework concept |
| --- | --- |
| Brief | Purpose + cognitive role |
| Region + layer map | Geography + Depth |
| Dock table + CAPACITY | Capacity + Interaction |
| Four questions / Mission | Principle 6 |
| Checklist + KPIs | Measurable quality |
| Debt + changelog | Continuous improvement |

---

## 6. Minimal path (small change)

For a one-control tweak:

1. **Plan** — one-line job (skip full brief).
2. **Design** — confirm region/layer unchanged.
3. **Build** — kit token/primitive only.
4. **Evaluate** — relevant checklist subsection only.
5. **Improve** — debt only if finding.

Still framework-bound: no new geography, no second accent, no capacity overrun.

---

## 7. Anti-patterns (process)

| Don’t | Do |
| --- | --- |
| Start in Figma with a new shell | Start from template + geography |
| “We’ll dock it later” | Dock table in Design gate |
| Checklist after ship | Evaluate before merge |
| KPI vanity (page views) | Orientation · interrupts · outcomes |
| Silent debt | Register in the same PR |

---

## 8. Related

| Need | Doc |
| --- | --- |
| Model / principles / KPIs | [HCW-UX-FRAMEWORK.md](HCW-UX-FRAMEWORK.md) |
| Heuristic table | [esti/HCW-UI-UX-PRINCIPLES.md](esti/HCW-UI-UX-PRINCIPLES.md) |
| Countable checks | [hcw-kit/07-UX-REVIEW-CHECKLISTS.md](hcw-kit/07-UX-REVIEW-CHECKLISTS.md) |
| AI surfaces | [esti/HCW-AI-ORCHESTRATION-UX.md](esti/HCW-AI-ORCHESTRATION-UX.md) |
| Construction | [esti/HCW-CONSTRUCTION-UX-OVERLAY.md](esti/HCW-CONSTRUCTION-UX-OVERLAY.md) |
| Index | [HCW-UX.md](HCW-UX.md) |
