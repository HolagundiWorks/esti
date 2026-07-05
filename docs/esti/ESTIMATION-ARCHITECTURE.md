# Estimation architecture — ESE publisher + Estimate desktop app + AORMS import/viewer

Three layers, decoupled by data. The **Estimation Specification Engine (ESE)**
deciphers state/central PWD workbooks into clean, versioned **Rate Library Packs**;
the **standalone Estimate desktop app** consumes a pack and does all creation
(measure → extract → price); **AORMS only imports, views, and re-costs** against its
rate books. Money is integer **paise** throughout; India-native (SQM/CUM/RM, FY Apr–Mar).

```
┌──────────────────────────┐  Rate    ┌────────────────────────┐  .aormsest ┌────────────────────────┐
│ Estimation Specification  │ Library  │  Estimate desktop app   │  estimate  │  AORMS (project tab)    │
│ Engine (ESE) — back office│ Pack     │  (standalone, offline)  │  file      │  import · view · re-cost │
│                          │ ───────▶ │                        │ ─────────▶ │                        │
│ Ingest PWD workbooks      │          │  • consume rate library │            │  • Rate Books (editable) │
│ (CPWD DSR/Specs/DAR,      │          │  • Work Item→Rate Item  │            │  • Import estimate       │
│  state PWD SoRs)          │          │    (spec·UOM·rate·      │            │  • Viewers (read-only):  │
│ Decipher · Normalize ·    │          │     measurement tmpl)   │            │    Abstract·BOQ·         │
│ Version · Publish         │          │  • Material + steel BBS  │            │    Materials·Steel       │
│                          │          │  • Measure→extract→price │            │  • Change rate book →     │
│  yearly: new DSR → new    │          │  • Export .aormsest      │            │    recalculate costing   │
│  versioned pack           │          │                        │            │  • NO estimate creation   │
└──────────────────────────┘          └────────────────────────┘            └────────────────────────┘
```

## 0. Estimation Specification Engine (ESE) — the rate-library publisher

A **back-office pipeline** (run by the office/publisher, not per end-user) that turns
each year's messy state/central PWD workbook into a clean, versioned dataset the apps
consume. All the parsing/interpretation complexity lives here so the apps stay simple,
and a new DSR is just a re-run — never a code change.

**Pipeline — Ingest → Decipher → Normalize → Version → Publish:**
- **Ingest** — raw markdown/PDF/CSV of one source + year (CPWD DSR + Specifications + DAR;
  or a state PWD SoR).
- **Decipher** *(the crux)* — detect the item hierarchy + that book's code scheme; from each
  item extract work type, spec **attributes** (thickness/grade/mortar/location), unit, and
  rate; link the **Specification** text and the **DAR** material/labour recipe by item code.
  **Hybrid**: deterministic table/regex parse for code·unit·**rate** (must be exact — never
  LLM-guessed), LLM-assisted extraction for semantic attributes, human review for the
  canonical-taxonomy mapping.
- **Normalize** — map every source onto the canonical **Work Item → Rate Item → Recipe**
  schema; money → paise; units canonicalised (cum/sqm/rm/each/quintal→kg).
- **Version** — each source+year is an **immutable edition** (`CPWD-DSR-2023`, `KAR-PWD-2024`).
- **Publish** — emit a signed **Rate Library Pack**:
  `{ source, year, checksum, workItems[], rateItems[], recipes[], specs[] }`, hosted for the
  apps to pull (same distribution pattern as the desktop-installer / latest-release resolver).

**Yearly lifecycle:** DSR changes → re-ingest → new versioned pack → apps pull the update →
a project either stays **pinned** to the edition it was estimated on, or migrates to the new
edition and **re-costs**. Old editions are never mutated, so historical estimates stay reproducible.

> The CPWD/state markdown you provide is the **input to the ESE**. CPWD's own hierarchy
> (parent item `6.4` → sub-items `6.4.1/6.4.2` with mortar variant + unit + rate) already
> matches Work Item → Rate Item, which is why the mapping is clean. Steel: PWD books give the
> steel *rate* only; the *arrangement/quantities* come from the BBS model (§5), meeting at ₹/kg.

## Confirmed decisions

- **Coefficient basis** — per the **item's own UOM** (bricks per SQM for `bw23013`; cement per CUM for RCC). Extraction is a plain multiply; no thickness math at run time.
- **Wastage** — **per recipe line** (brick waste ≠ sand waste).
- **Take-off is priced** — material quantities × material rates = purchase value.
- **AORMS is import + view only.** No measurement/creation UI in the project tab.
- **Rate books are the one editable lever in AORMS**; changing the project's rate book re-costs the imported quantities.

---

## 1. Knowledge Bank model (lives in the desktop app; the Rate Book also mirrors to AORMS)

**Work Item** — the reusable activity (deduplicated).
```
work_item:  code · name("Brick work") · discipline · default_uom? · description
```

**Rate Item** (the priced, fully-specified variant / spec-book entry).
```
rate_item:  item_id → work_item
            code                 "bw23013"
            short_name           "Brick work 230mm"        (what shows during entry)
            specification        "<full written spec: 1:3 cement mortar, 230mm…>"
            attributes           { Thickness:"230mm", Mortar:"1:3" }   (filterable)
            uom                  "SQM"
            rate_paise           690000                     (as-estimated baseline)
            measurement_template <see §2>
            source · effective_from · active
```

**Measurement template** — which of the four factors the estimator punches vs. baked.
```
factor  Nos | L | B | H   each = PUNCHED | FIXED(value) | OFF
qty = Nos × L × B × H     (fixed values substituted, OFF = 1)
```
- `bw23013` (SQM): `Nos·L·H` punched, `B=OFF` → qty = L×H. Thickness is **spec-only** (rate differentiator), not a factor.
- `rccm20col230x450` (CUM): `Nos·L` punched, `B=FIXED 0.230`, `H=FIXED 0.450` → qty = Nos×L×0.230×0.450.

**Material recipe** — consumption per 1 unit of the item's UOM.
```
rate_item_material:  rate_item_id · material_id · coefficient · wastage_pct
```
`bw23013` → `[{Bricks,115/SQM,2%}, {Cement,0.86/SQM,2%}, {Sand,0.06/SQM,5%}]`.

**Material master** (already exists in AORMS as `esti_kb_material`): `code · name · unit · rate_paise · density?`.

> The `esti_kb_material` / `esti_kb_specification` / `esti_kb_spec_material` tables kept during the estimation-UI teardown are the seed of this model; the desktop app owns the full editing experience.

---

## 2. The extractors (desktop app)

**Item BOQ / Abstract** — measured rows → qty × rate → amount, per item, summed.

**Material take-off** — for each estimate line: `mat_qty = item_qty × coefficient × (1 + wastage_pct)`, grouped and summed by material, then × material rate = **purchase value**.

**Steel quantities** — a special, per-diameter material (see §5).

---

## 3. The interchange file (`.aormsest`, JSON) — the contract

```jsonc
{
  "formatVersion": 1,
  "meta": { "estimateName": "…", "projectName": "…", "createdAt": "ISO",
            "appVersion": "…", "currency": "INR" },
  "rateBook": { "code": "OWN-2026", "name": "Office rate book 2026-27" },  // what the desktop used
  "items": [
    {
      "code": "bw23013",
      "shortName": "Brick work 230mm",
      "specification": "<full written spec>",
      "attributes": { "Thickness": "230mm", "Mortar": "1:3" },
      "uom": "SQM",
      "ratePaise": 690000,                    // as-estimated (AORMS may override)
      "measurements": [
        { "desc": "GF wall A", "nos": 1, "l": 4.5, "b": null, "h": 3.0, "qty": 13.5 },
        { "desc": "GF wall B", "nos": 1, "l": 2.3, "b": null, "h": 3.0, "qty": 6.9 }
      ],
      "qty": 20.40,
      "amountPaise": 14076000
    }
  ],
  "materials": [
    { "code": "BRK-MOD", "name": "Modular brick", "unit": "Nos", "qty": 2393,
      "ratePaise": 900, "amountPaise": 2153700 }
  ],
  "steel": [
    { "diaMm": 12, "unitWeightKgM": 0.888, "weightKg": 3720, "ratePaise": 6500, "amountPaise": 24180000 }
  ]
}
```

- **Items carry codes** — that's the join key AORMS uses to re-price against its own rate book.
- **Quantities are authoritative** (fixed by the estimate); **prices are advisory** (AORMS can override via rate book).
- Signed/checksummed envelope + `formatVersion` so imports are validated and forward-compatible (same pattern as the company migration bundle).

---

## 4. AORMS side — import, view, re-cost (no creation)

**Rate Book (editable, the one lever).** Office master rate book(s) in the Knowledge Bank; a project selects one (default = office) and may override individual rates. A rate book entry = `code · description · uom · rate_paise` keyed by the **same item codes** the estimate uses.

**Import.** Parse `.aormsest` → store an **immutable estimate snapshot** on the project (items + measurements + material take-off + steel). Re-importing creates a new version.

**Re-costing.** `line.amount = line.qty × rateBook.rate[line.code]`. Changing the project's rate book (or editing a rate) recomputes every amount live. Show **as-estimated vs as-costed** and the variance, so swapping DSR→own-rates or 2025→2026 is visible.

**Viewers (read-only tables), each scrolls inside its Tile (Carbon DataTable):**
1. **Abstract / Estimation** — item · spec · qty · unit · rate · amount · total.
2. **BOQ** — numbered bill: code · description · unit · qty · rate · amount, grouped by section.
3. **Materials** — take-off: material · unit · qty · rate · purchase value · total (procurement / PO basis).
4. **Steel** — reinforcement schedule (see §5).

**AORMS data model (new):**
```
project_estimate:        id · projectId · name · sourceFile · rateBookId · importedAt · version
project_estimate_item:   estimateId · code · shortName · specification · uom · qtyEstimated ·
                         ratePaiseEstimated · measurements(jsonb)
project_estimate_material: estimateId · code · name · unit · qty · ratePaise
project_estimate_steel:  estimateId · diaMm · weightKg · unitWeightKgM · ratePaise
```
Costing is computed (qty × rate-book rate), never stored as truth — so a rate-book change is always a pure recompute.

---

## 4a. Automation engines — "enter once, derive everything" (the core value)

The point of the product is to **kill repetition**. Three engines do that:

**A. Derived measurements — measure once → linked quantities.**
Enter a wall's `L × H` once → brickwork, **plastering (× 2 faces)**, and **painting (× 2)**
are all computed from that single measurement (net of openings). Driven by **derivation
rules** on the rate item: `parent item → child item · rule · factor`.
- Rules: `FACTOR` (child qty = parent × k, e.g. plaster = brick × 2), `NET_OF_OPENINGS`
  (subtract door/window areas), and geometric rules (`PERIMETER_X_HEIGHT`, …).
- Auto-generated child lines are editable/removable (openings, part-height, etc.).
> The `esti_kb_item_dependency` table `{parentItem, childItem, ratio, derivation}` kept
> during the teardown **is** this engine's store — retained on purpose.

**B. Rate propagation — change once → re-cost everything.** Swap the project's rate book,
or edit one rate, and every amount recomputes live (costing is computed, never stored — §4).

**C. BBS engine — fixed IS formulae, not 100 manual steps** (see §5).

## 5. Steel quantities & the BBS engine (designed against IS 2502 / IS 456)

Steel is a **Bar Bending Schedule**: each element (slab/beam/column/footing) is a **member**
carrying **bar rows**, and every bar's cut length + weight is *computed* from a few inputs.

**Inputs the estimator gives:** element type · member dims · bar diameter · spacing · cover ·
grade · exposure. **Everything else is formula:**
```
nos         = ⌊ clear length / spacing ⌋ + 1
cut length  = Σ(outer dimensions) + Σ hooks + Σ(Ld / laps) − Σ(bend deductions)   ( + crank )
weight      = nos × cut length × (D² / 162)      kg
```

**Verified constants** (primary BIS sources this run — IS 456:2000, IS 2502:1963, SP 34:1987,
IS 1786:2008; ✅ = 3-0 verified, ⛔ = a rule-of-thumb that was **refuted**, use the code rule):
| Constant | Value | Source |
|---|---|---|
| Unit mass | **D² / 162** kg/m ✅ | (162.27 exact) — 8:0.395·10:0.617·12:0.888·16:1.58·20:2.47·25:3.85 |
| Development length | **Ld = φ·σs / (4·τbd)** ✅ | IS 456 cl.26.2.1 |
| τbd (plain, tension) | 1.2/1.4/1.5/1.7/1.9 N/mm² for M20/25/30/35/40+ ✅ | **+60 % deformed, +25 % compression** → Fe500/M25 ≈ **48d** |
| **Lap — tension** | **max(Ld, 30φ)**, straight lap ≥ 15φ or 200 mm ✅ | IS 456 cl.26.2.5.1 — ⛔ flat "40d" refuted |
| **Lap — compression** | **Ld(comp), min 24φ** ✅ | IS 456 |
| Cut-length **bend deduction** | 45°=**1d** · 90°=**2d** · 135°=**3d** · 180°=**4d** ✅ | per bend |
| Hook allowance (add) | **9d/11d/13d/17d** for k=2/3/4/6 ✅ | IS 2502; bend-anchorage add 5d/5.5d/6d/7d |
| k (steel type) | 2 mild · 3 medium · **4 HYSD** ✅ | ↑ (6) for bars > 25 mm |
| Anchorage value | 4d per 45° bend (max 16d) · U-hook = 16d ✅ | IS 456 |
| Crank (slab bent-up) | **+0.42 h** ✅ | h = vertical crank height |
| Cover = **max(element-min, exposure-min)** | slab 15 · beam 25 · column 40 (→25 small) · footing **50** · end 25/2d ✅ | SP 34 §4.1 |
| Cover — exposure (durability) | mild 20 · moderate 30 · severe 45 · very-severe 50 · extreme 75 mm ✅ | IS 456 Table 16 — ⛔ footing "40–75" refuted → 50 min |
| Grades (fy = grade №) | Fe415 (elong ≥14.5 %) · Fe500 (≥12 %) · Fe550 (≥8 %) ✅ | IS 1786; Fe500D/550D = ductile variants |

> **Two corrections the research forced:** lap is **not** a flat 40d — it is `max(Ld, 30φ)`
> tension / `≥24φ` compression; and cover is the **greater of the element minimum and the
> exposure minimum** (footing = 50 mm, the "40–75" range was refuted). These are the values
> to hardcode.

**Bar rows per element** (Part 1 arrangements — a design decision *grounded in* the above,
not itself a cited finding):
- **Slab** — main + distribution + top bars at supports + crank/bent-up.
- **Beam** — bottom & top longitudinal + **stirrups** (135° hooks) + curtailed/extra + bent-up + side-face.
- **Column** — longitudinal verticals + **ties/spirals** + lap each floor.
- **Footing** — two-way bottom mesh + dowel/starter bars.

**Data model (member → bar rows):**
```
member:  type · id · concreteGrade · dims · cover · steelGrade · exposure
bar:     mark · role(main|dist|top|stirrup|bent-up|dowel|side) · dia · shapeCode(IS 2502) ·
         spacing · nos · cutLengthMm · unitWtKgM · weightKg
```
Roll up **by diameter** → the steel schedule; **by member** → element steel; × rate → cost.
AORMS only **displays** the imported schedule (it never recomputes bar geometry).

## 5b. Steel quantities — AORMS viewer

Steel is a material reported **by bar diameter**, priced by **weight**.

- Unit weight per metre = `dia² / 162` kg/m → 8:0.395, 10:0.617, 12:0.888, 16:1.58, 20:2.47, 25:3.85.
- The desktop app produces the per-diameter **weight** either from a coefficient (kg/CUM of the RCC item, split across diameters) or a bar-bending schedule; **AORMS only displays the resulting schedule** (it doesn't recompute steel geometry).

**Steel viewer (AORMS):**
```
Dia (mm)   Unit wt (kg/m)     Weight (kg)     Rate (₹/kg)     Amount
   8           0.395              1,240
  10           0.617              2,480
  12           0.888              3,720
  16           1.580              1,980
                              ─────────────
                    Total = 10,340 kg (10.34 MT)     …        ₹…
```
Steel is priced from the rate book like any material (₹/kg or ₹/MT), so a rate change re-costs steel too. Wastage/lap is already inside the imported weight.

---

## 6. Build order

**AORMS side (this repo, buildable + verifiable now):**
1. ✅ **Rate Book** — the flat `esti_rate_book` catalogue (`code · description · uom · rate_paise`), office-wide, keyed by `code`. Seeded from an ESE pack via `estimates.importRateBookPack`. *(Per-project override still a follow-up.)*
2. ✅ **Interchange contract** — `.aormsest` zod schema (`EstimateFile`) in `@esti/contracts`, with `estimateSealString` for checksum verification (shared, so the desktop app reuses it).
3. ✅ **Import + snapshot** — `/upload/estimate` REST route validates + seals + stores an immutable `esti_estimate` snapshot; `estimates.list/byId`.
4. ✅ **Re-costing engine** — pure `recostEstimate` (`@esti/contracts`): qty × rate-book rate, as-estimated vs as-costed + variance; exposed as `estimates.recost`.
5. ✅ **Four viewers** — Abstract · BOQ · Materials · Steel, read-only Carbon route `EstimateViewer` at `/libraries/estimates`.

**ESE side (this repo, `ese/`):**
- ✅ Deterministic Karnataka SR parser → sealed `RateLibraryPack` (`ese/packs/kar-pwd-2023.pack.json`); `build-pack` CLI; Ollama enrichment (adds metadata only).

**Estimate desktop app (separate, Tauri — built + tested on Windows via CI):**
6. Knowledge Bank editor (work item · rate item · measurement template · recipes). *(pending)*
7. Measurement entry + extractors (BOQ · materials · steel) + priced abstract. *(pending — the pure extractors `measureQty`/`takeoffMaterials`/`deriveLinked`/`steelFromBBS` already exist in `@esti/contracts`)*
8. Export `.aormsest` (+ PDF abstract). *(pending — sealing via `estimateSealString`; see the demo `docs/esti/samples/villa-demo.aormsest`)*

The interchange schema (step 2) is the seam: both apps develop against the same contract. A demo file (`docs/esti/samples/villa-demo.aormsest`) exercises the whole AORMS loop today.
