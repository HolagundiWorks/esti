# HCW Design Playbook

**Status:** Enduring · **Owner:** Human Centric Works (HCW) · **Adopted:** 2026-07-11

This playbook sits **above** every product and every kit. It captures the principles
each current and future HCW product — AORMS-Studio, AORMS-Consultancy, and whatever
comes after — must follow. It changes rarely and deliberately; implementations
(`@hcw/ui-kit`, app code, docs) evolve constantly *underneath* it.

> **Why this document exists:** an agent (human or AI) should be able to reason about
> **why** a rule exists before deciding **how** to implement it. The Playbook holds
> the why. The [Constitution](hcw-kit/00-CONSTITUTION.md) compresses it into articles;
> the [UI Kit docs](hcw-kit/README.md) implement it.

---

## 1. Design philosophy

**Depth encodes importance.** Visual depth is a semantic channel, not decoration:
the flatter and calmer a thing is, the more it is information at rest; the more it
lifts, softens, or glows, the more it wants attention or action. Every HCW product
stacks three material languages — **flat** (information), **soft** (objects you work
within), **glass** (actions and alerts) — and assigns them by an element's **role**,
never by taste.

**Calm by default.** ~90% of pixels are flat. Attention is a budget: one accent
colour, scarce glass, hairline structure. When everything glows, nothing does.

**One geography everywhere.** Rail · Stage · Taskbar · Dock. Users build muscle
memory when chrome never moves. Novelty in layout is a cost, not a feature.

## 2. Human-centric principles

1. Users are professionals under time pressure — the interface serves their task,
   never its own aesthetics.
2. Consistency beats novelty; recognition beats recall; defaults beat configuration.
3. Progressive disclosure: show the next step, not every branch.
4. Honest systems: real states, real numbers, no fabricated content — errors say
   what failed and what to do next.
5. Everyone operates it: keyboard, screen reader, reduced motion, and touch are
   design inputs, not retrofits.

## 3. Visual language

- **Ground:** calm neutral canvas; pure surfaces; ink text. One accent
  (Radiant Orange in AORMS) reserved for fills/active states — links are never
  the accent.
- **Shape:** square surfaces; rounding is meaning (buttons small-radius, dialogs
  slightly more, dock capsule) — never ambience.
- **Structure:** hairlines and whitespace define regions; boxes and shadows are
  exceptions with assigned meaning (the soft/glass layers).
- **Type:** one brand family, one scale; micro-typography only from the sanctioned
  ladder; uppercase + letterspacing marks structural labels.
- **Iconography:** one icon set per product; icons are geometry (sizing via
  fontSize is legitimate); never colour-only meaning.

## 4. UX laws we operate by

Jakob (familiar patterns) · Hick (fewer simultaneous choices) · Fitts (big, near
targets; ≥44px persistent chrome) · Miller (7±2 chunks; ≤4 KPIs/chips) · Tesler
(irreducible complexity goes to the stage, chunked — not hidden) · Doherty (<400ms
perceived; skeletons + optimistic writes) · Van Restorff (one accent, scarce glass)
· Serial position (first/last matter) · Peak–end (commits and confirmations are the
memory) · Goal gradient (progress is visible) · Gestalt (proximity/similarity/common
region do the grouping — not borders). Full application table:
[HCW-UI-UX-PRINCIPLES.md](esti/HCW-UI-UX-PRINCIPLES.md) §3.

## 5. Information architecture

- Navigation is canonical, documented, and singular (one source-of-truth IA doc per
  product; chrome must match it).
- Menu depth respects Miller; groups are labelled; the most-used destinations sit
  first and last.
- Wayfinding is mandatory: breadcrumbs on deep screens, `aria-current` in nav,
  per-route document titles.
- Search is a first-class citizen, reachable by keyboard from anywhere.

## 6. Interaction philosophy

- **Page-level intent has one locus** (the dock): destroy left · create centre ·
  commit right. No duplicate affordances.
- Verbs are specific: Create / Save / Delete — never OK / Submit / Apply.
- Destroy always confirms; dialogs own their actions (the dock yields while one is
  open).
- Feedback is immediate: optimistic where safe, skeleton where not, toast on
  success, precise message on failure.
- Motion communicates state (enter/exit/attention) and is always reduced-motion
  gated. Decorative animation is debt.

## 7. Accessibility requirements (non-negotiable)

WCAG 2.2 AA is a **gate**: one `<main>` + skip link per shell; visible
focus (`:focus-visible` parity with hover); ≥44px persistent-chrome targets; named
dialogs; programmatic labels on every input; colour never the only signal;
`prefers-reduced-motion` honoured; autofill semantics on identity fields. A change
that regresses any of these is rejected regardless of its other merits.

## 8. Content principles

Plain, specific, honest. Verb-first controls. Errors = what failed + next step.
Domain language matches the user's world (for AORMS: COA stages, GST, paise,
en-IN dates). Helper text is a system style, not ad-hoc small text. No fabricated
testimonials, statistics, or states — a stated brand stance.

## 9. Governance

- **The design system is the only design authority.** Products consume it;
  they never fork it. See [Constitution](hcw-kit/00-CONSTITUTION.md).
- New patterns enter the kit **before** first use (definition precedes
  implementation), versioned semver with changelog, deprecated with migration
  paths, removed only at zero usage.
- Documentation is part of the change: code, docs, and audits move together.
- Audits are recurring, evidence-based (`file:line`), and feed a living
  [Design Debt Register](hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md).

## 10. AI design rules

AI agents are permanent staff on this system, bound by the
[AI Agent Rulebook](hcw-kit/12-AI-AGENT-RULEBOOK.md): they never invent visual
values, never duplicate patterns, always cite evidence, always leave the system
more consistent than they found it, and record every material change in the
audit trail. External design systems (Carbon, Material, Fluent, Polaris, Primer)
are references for craft — **never precedent over HCW**.

---

*The Playbook is amended by deliberate decision only — record amendments here with
date and rationale.*
