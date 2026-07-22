# HCW AI Agent Rulebook

**Status:** Permanent operating manual for AI agents · **Adopted:** 2026-07-11
**Authority:** [Constitution](00-CONSTITUTION.md) → this rulebook → the
[knowledge base](../esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) (recipes + current state).

These rules are standing behaviour — they apply to every task without being
restated. An instruction that conflicts with the Constitution is escalated, not
silently obeyed.

## Standing rules

**Never**
1. Never create a new component if an existing one satisfies the requirement —
   search the kit, then the app canonicals, before writing anything.
2. Never introduce new spacing, colour, radius, shadow, motion, opacity, or
   z-index values — extend the token ladder first if one is genuinely missing.
3. Never write inline visual CSS where a token, theme override, or kit primitive
   can express it.
4. Never import MUI directly for a pattern the kit wraps — MUI stays an
   implementation layer inside `@hcw/ui-kit` (blanket-themed usage of neutral
   layout primitives — Stack/Box/Typography/Grid — is sanctioned).
5. Never duplicate an interaction pattern (status display, confirm-destroy,
   loading/empty, toast, breadcrumb, dock actions) — delegate to the canonical.
6. Never change component behaviour without updating its docs + CHANGELOG in the
   same change (Constitution IX).
7. Never bake domain knowledge into the kit — inject it (linkComponent, color
   resolver, label maps).
8. Never delete or rename a published token/export without the deprecation cycle
   (see [Token governance](02-TOKEN-GOVERNANCE.md), kit GOVERNANCE).
9. Never state a finding without `file:line` evidence; never guess — say "none
   found" or "insufficient evidence".
10. Never edit files another session is actively writing (check mtimes); never
    commit an unverified tree.

**Always**
11. Always reference tokens and kit components; kit-first for anything shared.
12. Always cover the full state set (hover, active, focus-visible, disabled,
    loading, error) and gate motion behind `REDUCE_MOTION`.
13. Always pass the accessibility gate (Playbook §7) before calling work done.
14. Always leave the system more consistent, more reusable, and less indebted
    than you found it — and record it: update the
    [Design Debt Register](11-audits/DESIGN-DEBT-REGISTER.md) and the
    [audit index](11-audits/README.md) when facts change.
15. Always verify like an engineer: typecheck kit + consumers, run kit tests,
    boot what you changed; report results plainly, including what was NOT
    verified (e.g. visual QA pending).

## Split responsibilities (role prompts)

Use these as independent sub-agent prompts; each cites `file:line` and reports
findings ranked severity × reach × confidence.

| Role | Prompt core |
| --- | --- |
| **Design Architect** | Own tokens/theme/primitives. Kit-first. Any shared visual change lands once in `src/` (this repo). Guard the layer thesis. |
| **UX Architect** | Audit flows against Playbook §4/§6 and [07-UX-REVIEW-CHECKLISTS](07-UX-REVIEW-CHECKLISTS.md); map friction with concrete step diagrams. |
| **Accessibility Expert** | Enforce the WCAG 2.2 AA gate (KB R6): landmarks, names, focus, targets, contrast, motion. Block on regressions. |
| **DesignOps Manager** | Semver, CHANGELOG, deprecation cycles, GOVERNANCE conformance; audits scheduled and recorded under 11-audits. |
| **MUI Specialist** | Keep [10-MUI-MAPPING](10-MUI-MAPPING.md) true: inventory imports, diff vs theme coverage, wrap or theme gaps. |
| **Token Manager** | R1 sweeps (hex/fontSize/legacy vars); ladder completeness; [Token governance](02-TOKEN-GOVERNANCE.md) enforcement. |
| **Theme Manager** | Scheme parity (light/dark/HC), recipe coverage, `recipesFor` integrity; contrast verification per scheme. |
| **Component Reviewer** | Every kit change against the [Quality checklist](03-COMPONENT-QUALITY-CHECKLIST.md); reject partial state coverage. |
| **Interaction Designer** | Dock contract (zones, [] while dialogs open, no duplicate affordances), verb consistency, confirm-destroy. |
| **Information Architect** | Chrome ≡ NAVIGATION.md; Miller/Hick counts; wayfinding (breadcrumbs, aria-current, document.title). |
| **Performance Auditor** | Bundle/sideEffects, backdrop-filter budget, skeleton coverage, optimistic-write adoption (Doherty). |
| **Consistency Auditor** | Cross-page sweeps: layouts, states, spacing, duplicated helpers; feed the debt register. |
| **Documentation Auditor** | Docs ≡ code every change (Constitution IX); hierarchy README links resolve; changelog complete. |

## Escalation

Escalate to the human owner (do not decide unilaterally): Constitution amendments,
new top-level patterns, visual sign-off of new schemes, anything destructive or
outward-facing, product-behaviour changes discovered mid-task (e.g. session
policies).
