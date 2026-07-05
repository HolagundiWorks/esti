# ESE source samples — drop DSR / DAR / spec markdown here

This is the intake for the ESE parser. Put the markdown files here (one file per
document is fine), then tell me and I build the parser against the **real** format
and emit a `RateLibraryPack`.

## Naming

```
<authority>-<kind>-<year>.md
```
- `authority`: `cpwd` (Delhi DSR) · `kar` · `tn` · `mh` · `ap`
- `kind`: `dsr` (Schedule of Rates) · `dar` (Analysis of Rates) · `spec` (Specifications)
- e.g. `cpwd-dsr-2023.md`, `cpwd-dar-2023.md`, `cpwd-spec-2023.md`

## What makes the best first sample

A **representative slice** (not the whole book) is enough to build a robust parser:
- 3–4 full sub-heads / chapters that exercise the variety — ideally **Brick Work**,
  **RCC / Concrete**, **Plastering**, and **Steel reinforcement**;
- keep the **hierarchy intact** — the parent item **and** its sub-items with their
  rates (e.g. `6.4` → `6.4.1`/`6.4.2` with mortar variant · unit · rate);
- if you have it, one **DAR analysis block** (an item broken into material + labour +
  machinery with quantities) and one **spec block** — these unlock the material
  recipes and the specification text, not just the rate.

## What I'll do with it

1. Read the real structure, write the deterministic `parseRateRow` for this source
   (codes · units · **rates** — never LLM-guessed).
2. Extract semantic attributes (thickness / grade / mortar) with the local Ollama pass.
3. Emit a checksummed, versioned `RateLibraryPack` (+ recipes if the DAR is present).
4. Verify against a golden fixture so the parser is regression-safe.
