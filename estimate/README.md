# AORMS Estimate

The **offline desktop estimating app** — the companion to AORMS. Enter items and
measurements, model steel, and export a **sealed `.aormsest`** you import and
re-cost inside any AORMS project (→ Cost Management).

- **Measure once, derive everything.** `nos · L · B · H` per row → quantity;
  quantities are frozen on export, price is AORMS's live lever.
- **Steel = Bar Bending Schedule.** Slab / beam / column / footing geometry →
  cut lengths + weights computed against IS 456 / IS 2502 (the same engine AORMS
  uses).
- **Fully offline, native.** A browser-based SPA rendered inside a pure-**C++**
  webview desktop host (`desktop-cpp/`) — no Rust, no server. Estimates persist
  locally in **SQLite** in-process; nothing leaves the machine.
- **The shared seam.** All the estimating logic lives in `@esti/contracts`
  (`EstimateFile`, `measureQty`, `computeMemberBBS`, `steelFromBBS`,
  `estimateSealString`, `recostEstimate`), ported 1:1 to C++ in `desktop-cpp/`
  — the exact contract AORMS imports, so the three never drift.

## Workflow (rate book → estimate)

1. **Rate book** — load embedded CPWD DSR 2021 (4,252 rate items, 261 cement recipes) or import an ESE `RateLibraryPack`.
2. **Add items** — search by code/description; each row is a priced **rate item** with its full **specification** text.
3. **Measure** — enter Nos·L·B·H per the item's unit template (m² → Nos×L×H, m³ → Nos×L×B×H, etc.).
4. **Model graph** — React Flow canvas of chapters → rate items → derived children → materials (read-only; quantities sync from measurements).
5. **BOQ & materials** — abstract grouped by CPWD chapter; materials auto-derived from recipes (`qty × coefficient`).
6. **BBS / steel** — slab/beam/column/footing geometry → bar schedule (IS 456 / IS 2502) → steel by diameter.
7. **Export** — sealed `.aormsest` → import in AORMS › Project › Cost Management.

**Auto-derivation:** brick/masonry items (chapter 6) spawn plaster `13.1.1` at ×2 face area when you measure the parent.

**Recipes:** CPWD cement coefficients (concrete) plus enriched mortar/brick/plaster supplements on pack load.

### Data model (simplified)

| Entity | What it is | Example |
|--------|------------|---------|
| **Work item** | Parent grouping / chapter | `6.4` Brick work |
| **Rate item** | Priced, fully-specified line | `6.4.1` Brick in 1:3 mortar · m² · ₹690 |
| **Specification** | Full description text on the rate item | "Brick work in cement mortar 1:3…" |
| **Recipe** | Material consumption per 1 UOM of item | cement 0.86 quintal/m³ |
| **Material** | Procurement line derived from recipes | cement 12.4 quintal |

**BBS / steel scheduling** is step 5 in the workflow tab.

**Roadmap:** [docs/esti/ESTIMATE-AUTOPILOT-ROADMAP.md](../docs/esti/ESTIMATE-AUTOPILOT-ROADMAP.md) — autopilot queue; **UI pivot to HCW-UI-Kit is active (E1)**.


## Develop / build

```
pnpm --filter @esti/estimate dev        # Vite dev server (browser)
pnpm --filter @esti/estimate typecheck  # tsc
pnpm --filter @esti/estimate build      # tsc + vite build → estimate/dist
```

The native desktop app (webview host + C++ engine + SQLite) lives in
[`desktop-cpp/`](desktop-cpp/README.md). Its Windows installer is built in CI —
`.github/workflows/estimate.yml`. This is **separate** from the main AORMS cloud
workspace (estimation also runs in-browser on projects — see
[wiki.aorms.in/estimation-and-boq](https://wiki.aorms.in/estimation-and-boq)).

## Offline fonts

Carbon's IBM Plex is loaded from a CDN (`$font-path` in `styles.scss`); offline it
degrades to system fonts — the app stays fully functional. Bundling Plex for
pixel-identical offline type is a future polish.
