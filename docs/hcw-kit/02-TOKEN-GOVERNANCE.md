# Token governance

**Scope:** `packages/hcw-ui-kit/src/tokens.ts` — the single executable source of
visual values (Constitution II). **Adopted:** 2026-07-11.

## Tiers

| Tier | Examples | Mutability |
| --- | --- | --- |
| **Global** | raw ladders: `SPACING`, `BREAKPOINTS`, `Z_INDEX`, `OPACITY`, `MOTION`, `TYPE_SCALE`, `RADIUS`/`BUTTON_RADIUS`/`DIALOG_RADIUS`, base hues | **Immutable** — values change only by Constitution-level decision |
| **Semantic** | `colors`/`SCHEMES` roles (`accent`, `textHelper`, `borderSubtle`…), `ELEVATION`, `STATUS_COLORS`, recipe sets (`recipesFor`) | Extend freely; **meanings never silently change** |
| **Component** | recipe constants a primitive consumes (`ACTION_DOCK_TRAY`, `SECTION_DOCK_CHIP_GLASS`) | Owned by the component's definition; changed with it |

## Rules

1. **No token deletion, no renaming** — deprecate (`@deprecated` alias → migrate
   all usages → remove at zero usage in a minor version, per kit GOVERNANCE).
2. **Semantic over global at call sites** — screens reference roles
   (`colors.textHelper`, `TYPE_SCALE.micro`), not raw values; new code prefers
   semantic tokens over the frozen `--cds-*` compat layer (which is never
   extended).
3. **No component owns colours; no page owns spacing or typography** — a component
   consumes semantic tokens; a page consumes the theme + kit primitives.
4. **Every scheme carries every role** — adding a semantic colour role means adding
   it to light, dark, AND high-contrast in the same change (enforced by the kit
   test `tokens.test.ts › every scheme carries every semantic role`).
5. **Additions need a home in the ladder** — a value that doesn't fit an existing
   step is a proposal to extend the ladder, not an inline literal.
6. **Contrast is part of the token** — a text/fill role pairing is verified ≥4.5:1
   (AA) in every scheme before adoption.
7. **Sanctioned exceptions are documented, closed sets:** canvas/SVG data-viz
   palettes (flagged for token migration), brand-mandated colours (e.g. Google
   sign-in), the `landing.scss`/`glass.scss` editorial recipes, and the frozen
   `--cds-*` compat layer.

## Change protocol

Token PRs state: tier · new/changed entries · scheme coverage · contrast evidence ·
consumers updated · CHANGELOG entry. The Token Manager role
([Rulebook](12-AI-AGENT-RULEBOOK.md)) audits drift with the R1 recipes in the
knowledge base.
