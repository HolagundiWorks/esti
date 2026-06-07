# BBMP Bylaw Calculator — Rules & Tables

**Status:** Planned (Phase 9) · **Owner:** Holagundi Consulting Works (HCW) ·
**Reviewed:** 2026-06-07

> _Part of the [ESTI documentation set](README.md). Defines the development-
> control calculator for Bengaluru (BBMP / RMP-2015 zoning regulations). The
> numeric tables here are **editable seed defaults**, version-controlled in
> `esti_bylaw_rule`; always verify against the current BBMP byelaws / Revised
> Master Plan and the sanctioning authority before relying on a result._

## Purpose

Turn site geometry into the governing planning parameters for a project:

- **FAR** (Floor Area Ratio / FSI)
- **Ground coverage** (%)
- **Setbacks** on all four sides (m)
- **Parking** requirement (ECS — equivalent car spaces)

## Inputs (per project)

- **Project type** — Commercial | Residential | Semi-Public | Public Building.
- **Site area** (sq m) and plot dimensions.
- **Neighbouring sides** — which of Left / Right / Front / Back abut a road vs a
  neighbouring plot.
- **Roads** — up to four abutting roads, each with a **width** and **length**,
  mapped to the side it abuts.

## Road-centre RBL (Restricted Building Line)

For each abutting road, the **building line is measured from the centre of the
road**, not the plot boundary:

```
rblFromCentre   = (roadWidth / 2) + roadMargin(roadClass)
rblSetback      = max(0, rblFromCentre − distanceCentreToBoundary)
governingSetback(side) = max(tableSetback(side), rblSetback)      # whichever is higher
```

`roadMargin` is a per-road-class clearance (NH/SH/arterial/local) held in the
rule table. The **higher of the RBL-derived setback and the table setback
governs** the road-facing side. Non-road sides use the table setback only.

## Selection rule (range tables)

Each rule row is a **range** keyed by `site_area` band **and** `road_width`
band, scoped to a project type. To evaluate:

1. Select all rows for the project type whose `site_area` and `road_width`
   bands contain the project's values (a row may match on either/both — a row
   with an open band matches any value).
2. When **more than one row matches**, apply the **least-permissive** value:
   **minimum FAR, minimum ground coverage, maximum setback, maximum parking**.

This mirrors the byelaw intent that the most restrictive applicable condition
controls.

## Seed table — Residential (verify & edit)

Indicative RMP-2015-style values; FAR/coverage are driven primarily by abutting
road width. **Seed only — confirm current figures.**

| Road width band | FAR (max) | Ground coverage (max) |
|---|---|---|
| < 12 m | 1.75 | 60% |
| 12 m – < 18 m | 2.25 | 60% |
| 18 m – < 24 m | 2.50 | 60% |
| 24 m – < 30 m | 3.00 | 60% |
| ≥ 30 m | 3.25 | 60% |

### Setbacks by building height (residential, seed)

| Building height | Front | Rear | Each side |
|---|---|---|---|
| ≤ 11.5 m | 3.0 | 1.5 | 1.0–2.0 |
| 11.5 – 15 m | 5.0 | 3.0 | 3.0 |
| 15 – 18 m | 6.0 | 3.0 | 3.0 |
| 18 – 24 m | 7.0 | 5.0 | 5.0 |
| > 24 m | per height/2 rule, min 9.0 | per rule | per rule |

### Parking (seed)

| Use | Requirement |
|---|---|
| Residential | 1 ECS per dwelling > 100 sq m; scaled below |
| Commercial | 1 ECS per 50 sq m built-up (approx.) |
| Public / Semi-public | per occupancy schedule |

Commercial / Semi-Public / Public tables follow the same shape and live in the
same `esti_bylaw_rule` set, scoped by project type.

## Data model

- `esti_bylaw_rule` — versioned rule rows:
  `version`, `projectType`, `siteAreaMin/Max`, `roadWidthMin/Max`,
  `heightMin/Max`, `far`, `coveragePct`, `setbackFront/Rear/Side`, `roadMargin`,
  `parkingBasis`.
- `esti_bylaw_calc` — per-project inputs (sides, roads, dimensions) + the
  computed envelope (governing FAR, coverage, setbacks, parking), recomputed on
  change and shown on the project file.

## Output

A buildable-envelope summary on the project: permissible built-up area
(`siteArea × FAR`), max footprint (`siteArea × coverage`), the governing setback
on each side (with which condition governed), and the parking requirement. The
result feeds the project's `esti_bylaw` development-control compliance rows.
