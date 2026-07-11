# HCW Design Constitution

**Status:** Supreme authority for design decisions · **Adopted:** 2026-07-11
**Why each article exists:** [HCW-DESIGN-PLAYBOOK.md](../HCW-DESIGN-PLAYBOOK.md)

Every designer, developer, and AI agent working on an HCW product is bound by these
articles. When any document, habit, or preference conflicts with them, **the
Constitution wins**. Amendments are deliberate, dated, and recorded at the bottom.

## Articles

**I. HCW Design is the only design authority.**
External systems (Carbon, Material 3, Fluent, Polaris, Primer) are references for
craft, never precedent. MUI is an implementation detail.

**II. Tokens are the only source of visual values.**
Colour, type, spacing, radius, shadow, motion, opacity, z-index live in the token
layer and nowhere else. A literal visual value outside the token files is a defect.

**III. Components are never page-specific.**
A reusable element exists once, in the kit. Pages compose; they do not invent.
Domain knowledge is injected into kit primitives, never baked into them.

**IV. Consistency is more valuable than novelty.**
An inconsistent improvement is a regression. Same action, same place, same verb,
same behaviour — everywhere.

**V. Depth encodes importance.**
Flat = information · soft = objects · glass = action/alert. Layer is chosen by
role, never by taste. Glass stays scarce.

**VI. New patterns require governance.**
Definition precedes implementation: a pattern enters the kit (tokens → theme →
primitive → docs → changelog) before its first use in any product.

**VII. Accessibility is mandatory.**
WCAG 2.2 AA is a merge gate, not a backlog item. No exceptions for deadlines.

**VIII. Components are composed, never duplicated.**
One canonical implementation per pattern. Duplicates are consolidated, deprecated,
and removed at zero usage.

**IX. Documentation moves with the change.**
Code, docs, changelog, and the debt register are one unit of work. Divergence is a
defect of the change, not of the docs.

**X. Every change reduces design debt.**
Each implementation must leave the system more consistent, more reusable, and
better documented than it found it — or it does not ship.

---

## Amendments

*(none yet — record as: date · article · change · rationale)*
