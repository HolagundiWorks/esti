# AORMS — Rate / Material / Spec Import Spec

> **Status:** Active · **Scope:** AORMS (esti) consume-side only
> **Companion:** Ratebook Studio `DEVELOPER_GUIDELINES.md` (the parser lives there as
> reference; AORMS embeds the *parsing logic* natively — **not** the Tauri app).

## 1. Purpose

Bring unstructured rate-schedule text (copied from PDFs, OCR, vendor quotes) into the
**existing** Knowledge Bank tables, cleanly categorised, **without creating duplicate rows
from nomenclature mismatch**. This is in addition to the per-library CSV import that already
exists (materials, items, specifications).

**Explicitly out of scope:** the standalone Tauri app, a separate SQLite store, and any
`schedule_items` / Rate-Book table. AORMS removed Rate Books (migration 0108) and does **not**
re-introduce them. Hierarchical DSR/KPWD schedules are *flattened* into the KB item+spec model.

## 2. Pipeline

```
Paste raw text → Detect type → Pre-clean → Parse → Validate → Review/edit → Upsert (KB tables)
```

| Step | What it does |
|---|---|
| Detect | Flat *material list* (`1. Cement  bag  420`) vs hierarchical *item schedule* (`7.23.1.1 12mm thick  m2  638`). Dotted codes → schedule; numbered list → material. User can override. |
| Pre-clean | Strip page numbers (`^\d{1,4}$`), `Page x of y`, column headers, `---` dividers, blank lines. |
| Parse | Per line: last token = rate, second-last = unit *iff* it's a known unit, remainder = description. Multi-line descriptions join until a unit+rate pair closes the row. |
| Validate | Error: missing description / rate. Warning: unknown unit, duplicate within batch. Section headers without unit+rate are **valid** (parents), not errors. |
| Review | Editable table; user corrects flags before commit. |
| Upsert | Match on the dedup key (§4); existing → update rate, new → insert. |

## 3. Mapping to existing tables

No new tables. Targets are `esti_kb_material`, `esti_kb_item`, `esti_kb_specification`.

| Parsed entity | Target table | Column mapping |
|---|---|---|
| **Material line** | `esti_kb_material` | `description → name`, `unit → unit` (canonical), `rate → default_rate_paise` (`round(rate×100)`), group/sl-section `→ category`, provenance (source/version/code) `→ notes` |
| **Item + rate** | `esti_kb_item` **+** `esti_kb_specification` | item: `description → name`, dotted code/section `→ category`; spec: `description → name`, `unit → unit`, `rate → rate_paise`, `is_default = true` for the first spec of a new item |
| **Specification line** (under a known item) | `esti_kb_specification` | `text → name`/`description`, `unit → unit`, `rate → rate_paise` |
| **Non-measurable header** (no unit/rate) | — | becomes the `category` carried to its children; never a standalone row |

**Money:** all rates are integer **paise** (`round(rupees × 100)`). Never store rupees.

## 4. Nomenclature — the duplicate-prevention core

Duplicates come from two mismatches. Normalise **before** insert/compare.

### 4.1 Canonical unit dictionary

AORMS canonical = **lowercase metric**, identical to Ratebook Studio's own dictionary so RS
exports and AORMS resolve to the same forms. Every variant maps to one canonical.

| Canonical | Accepts (case-insensitive, punctuation/space-stripped) |
|---|---|
| `m3` | m3, m³, cum, cu.m, cu m, cubic metre/meter |
| `m2` | m2, m², sqm, sqmt, sq.m, sq m, square metre/meter |
| `m`  | m, rm, rmt, rmtr, lm, lin.m, running metre/meter |
| `no` | no, no., nos, number, each, ea, unit |
| `kg` | kg, kgs, kilogram |
| `t`  | t, mt, ton, tonne, metric ton |
| `q`  | q, qtl, quintal |
| `l`  | l, ltr, litre, liter, liters |
| `bag` | bag, bags |
| `pair` | pair, pairs |
| `set` | set, sets |
| `sheet` | sheet, sheets |
| `sqft` | sqft, sq.ft, sft, sq ft |
| `rft` | rft, rf, ft, foot, feet |

Unknown unit → keep raw, flag **warning** (do not silently coerce). Display can localise to
Indian forms (Cum/Sqm/Rmt) later; storage stays lowercase-metric canonical.

### 4.2 Name normalisation

`normName(s)` = lowercase → trim → collapse internal whitespace → strip trailing
punctuation → drop a leading `sl-no.`/dotted-code prefix. The **dedup key** then *removes*
remaining whitespace so `6 mm` and `6mm` resolve identically (`nameKey = normName(s).replace(/\s+/g,"")`).
Used only for **matching**, never stored — the original display text is preserved verbatim.

### 4.3 Dedup / upsert keys

| Table | Match key | On match | On no match |
|---|---|---|---|
| `esti_kb_material` | `normName(name)` + canonical `unit` | update `default_rate_paise` (+ note prior rate) | insert |
| `esti_kb_item` | `normName(name)` + canonical `unit` | reuse the item | insert |
| `esti_kb_specification` | `item_id` + `normName(name)` | update `rate_paise` | insert (first spec of item ⇒ `is_default`) |

A re-import of the same schedule therefore **refreshes rates in place** — zero duplicate rows.

## 5. Build surface (native, no Tauri)

- **Pure helpers** (`packages/contracts`): `canonicalUnit()`, `normName()`, the parser
  (`parseRateText`) and the row→payload mappers. Pure, vitest-covered, no I/O.
- **Backend** (`kb.import.*`): accept reviewed rows, run the §4 upsert against the KB tables.
- **Frontend**: a "Paste & import" panel on the Knowledge Bank — textarea → parse → review
  table (Pure Carbon) → commit. Sits beside the existing per-library CSV import.

## 6. Versioning

Breaking changes to the unit dictionary or dedup keys are a version bump here; keep aligned
with Ratebook Studio's unit dictionary so its exports and AORMS resolve to the same canonicals.

*Last updated: 2026-06-30*
