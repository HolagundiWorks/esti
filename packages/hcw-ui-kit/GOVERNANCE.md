# @hcw/ui-kit — governance

**Owner:** Human Centric Works (HCW). The kit is the design authority for every
AORMS surface; MUI is the implementation layer. Agent contract + rulesets:
[`docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md`](../../docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md).

## Contribution workflow (kit-first)

1. **Definition before implementation.** A new pattern lands in the kit (tokens →
   theme → primitive) and its docs (HCW-UI-KIT.md + CHANGELOG) before any screen
   uses it. No feature-level forks of visual recipes.
2. **Tokens only.** Raw colour/shape/motion values live in `tokens.ts` alone.
   New values require a token, not an inline literal.
3. **Layer by role.** Every new surface picks flat/soft/glass by the element's
   role (decision tree in HCW-UI-KIT.md) — reviews reject taste-based layering.
4. **Accessibility gate.** WCAG 2.2 AA items in the KB (R6) are blocking review
   criteria, not follow-ups.
5. **Docs sync (R9).** A kit change without matching doc + CHANGELOG entries is
   incomplete by definition.

## Versioning

Semver on the package `version` (workspace-consumed; versions mark **design-contract**
changes):

- **major** — breaking API/visual contract (removed export, changed prop, changed
  token meaning).
- **minor** — new tokens/components/variants; scheme additions.
- **patch** — bug fixes, doc-only, non-visual refactors.

Every change lands a `CHANGELOG.md` entry under the next version heading.

## Deprecation policy

1. Mark the export `@deprecated` with a pointer to the replacement; keep it working.
2. Migrate all in-repo call sites (grep-verified zero usages).
3. Remove in the next **minor** once usages are zero (major if externally consumed).
4. Note both the deprecation and the removal in the CHANGELOG.

Precedent: the `AORMS_VERTICALS`/`HIVED` alias cycle (deprecated → call sites
migrated → removed, 2026-07).

## Review checklist (each PR touching the kit)

- [ ] Values are tokens; no new literals outside `tokens.ts`
- [ ] Layer chosen by role; glass stays scarce
- [ ] Hover/active/`:focus-visible`/disabled + `REDUCE_MOTION` states covered
- [ ] Works in every consuming shell (workspace, portals, console, marketing)
- [ ] CHANGELOG + HCW-UI-KIT.md updated; KB §6 ledger refreshed if facts changed
- [ ] Kit + frontend typecheck clean
