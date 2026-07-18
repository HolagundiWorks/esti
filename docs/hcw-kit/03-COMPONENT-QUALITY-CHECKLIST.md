# Component quality checklist

Every kit component (new or materially changed) passes this list before its
version ships. Reviewer: the Component Reviewer role
([Rulebook](12-AI-AGENT-RULEBOOK.md)). "N/A" is allowed only with a stated reason.

## Gate (blocking)

- [ ] **Token-driven** — zero literal visual values; consumes tokens/recipes only
- [ ] **States** — rest · hover · active · `:focus-visible` (ring + parity with hover) · disabled · loading/pending · error, as applicable
- [ ] **Keyboard** — fully operable; Enter/Space/Escape/arrows where the pattern demands
- [ ] **Screen reader** — accessible name, correct role, live-region where transient
- [ ] **Touch target** — ≥44px effective area in persistent chrome contexts
- [ ] **Reduced motion** — every transform/transition gated by `REDUCE_MOTION`
- [ ] **Scheme coverage** — renders correctly in light; dark/HC at least palette-coherent (no hardcoded light assumptions)
- [ ] **Responsive** — behaves at rail/stage widths and mobile stacking
- [ ] **Composition over duplication** — replaces/absorbs any app-level duplicate (shim left behind); domain logic injected, not embedded
- [ ] **Docs** — HCW-UI-KIT.md package listing + usage snippet; CHANGELOG entry; KB ledger updated
- [ ] **Types** — exported prop types; kit + consumers typecheck clean

## Target (tracked as debt if missing)

- [ ] Unit tests (behaviour/contract) in the kit suite
- [ ] Specimen on `/design-system` (the living gallery)
- [ ] Visual-regression snapshot (once the harness exists)
- [ ] RTL sanity (once RTL is in scope)
- [ ] Variant matrix documented (sizes · tones · layouts)
- [ ] Performance note if the component uses blur/filters (GPU budget)

## Current pass status

Tracked per component in the [Design Debt Register](11-audits/DESIGN-DEBT-REGISTER.md)
§Component conformance.
