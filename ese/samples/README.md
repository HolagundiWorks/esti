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

## Status

The product standardises on **one** schedule — **CPWD** (Delhi DSR + Analysis of
Rates). The multi-state fan-out (TN / MH / AP) is dropped — we do not juggle
multiple state DSRs. The CPWD/PWD-family parser is validated against a real
Karnataka SR sample of the *identical* published format (retained only as a
parser fixture, not a second product source).

| Source | Role | Markdown | Parser | Golden test |
|---|---|---|---|---|
| **CPWD Delhi DSR** | product schedule | ⏳ awaiting markdown | ✅ `../src/parsers/karnataka.ts` (`parseSR`) | via the fixture below |
| Karnataka PWD Common SR 2023-24 | parser fixture (same format) | `kar-dsr-2023.md` | ✅ same parser | ✅ `karnataka.test.ts` (10) |

Drop CPWD markdown here (`cpwd-dsr-2023.md`) and I tune the parser for its
specifics (4-digit basic-rate codes, +Water 1% / +CPOH 15% build-up) and add a
CPWD golden fixture; the pack schema is shared.

### Karnataka parser — what it extracts (all deterministic, no LLM)

- **rateItems** ← the Schedule table (`Item No · Description · Unit · Rate`), hierarchy
  `X.Y.Z` preserved (`itemCode` = parent), `Note:` rows and sub-heads skipped.
- **materials** ← the *Material Component · Unit · Basic Rate* tables (incl. the
  header-less continuation pages); machinery (`hr`) and labour/royalty tables rejected
  by unit shape.
- **recipes** ← Table 20 material co-efficients **and** the DAR *"Details of cost for N"*
  blocks (`coefficient = qty ÷ N`, **MATERIAL** section only). When an item has a DAR
  breakdown it wins; Table-20's coarser jelly/sand lines are reconciled away to avoid
  double-counting aggregate.
- **attributes** ← grade (`M25`) · mortar (`1:4`) · nominal size · thickness, by regex.

It is built to survive the real OCR noise: the diagonal **"KPWD VOL-1" watermark**
that bleeds leading `K/P/W/D/V/L / VOL-1 / L-1` tokens into cells, and the garbled
**Kannada** header tables (skipped wholesale).

Run: `pnpm --filter @esti/ese test` (or `node --test 'src/**/*.test.ts'`).
Build a pack: `buildKarnatakaPack(markdown, { year: 2023 })` in `../src/pipeline.ts`.

**Next state's markdown drops here the same way** — I read its structure and add a
sibling `src/parsers/<state>.ts` + golden test (the pack schema is shared).
