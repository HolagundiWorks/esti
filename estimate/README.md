# AORMS Estimate

The **offline desktop estimating app** — the companion to AORMS. Enter items and
measurements, model steel, and export a **sealed `.aormsest`** you import and
re-cost inside any AORMS project (→ Cost Management).

- **Measure once, derive everything.** `nos · L · B · H` per row → quantity;
  quantities are frozen on export, price is AORMS's live lever.
- **Steel = Bar Bending Schedule.** Slab / beam / column / footing geometry →
  cut lengths + weights computed against IS 456 / IS 2502 (the same engine AORMS
  uses).
- **Fully offline.** A static SPA in a Tauri shell — no server, no database.
  Nothing leaves the machine until you export a file.
- **The shared seam.** All the estimating logic lives in `@esti/contracts`
  (`EstimateFile`, `measureQty`, `computeMemberBBS`, `steelFromBBS`,
  `estimateSealString`, `recostEstimate`) — the exact contract AORMS imports, so
  the two never drift.

## Structure

```
estimate/
├─ src/core/       model + build (model → sealed EstimateFile) + live preview
├─ src/components/ Items · Materials · BBS panels (Carbon)
├─ src/store.ts    the working-model store (zustand)
├─ src/App.tsx     shell — meta, preview totals, export
└─ src-tauri/      thin Tauri v2 shell (webview only; no backend)
```

## Develop / build

```
pnpm --filter @esti/estimate dev        # Vite dev server (browser)
pnpm --filter @esti/estimate typecheck  # tsc
pnpm --filter @esti/estimate build      # tsc + vite build → estimate/dist
```

Desktop installer (Windows/NSIS) is built in CI — `.github/workflows/estimate.yml`
(manual dispatch, or push an `estimate-v*` tag to publish a Release). Point the
landing/download `VITE_ESTIMATION_DOWNLOAD_URL` at that release asset.

## Offline fonts

Carbon's IBM Plex is loaded from a CDN (`$font-path` in `styles.scss`); offline it
degrades to system fonts — the app stays fully functional. Bundling Plex for
pixel-identical offline type is a future polish.
