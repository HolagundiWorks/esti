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

## Structure

```
estimate/
├─ src/core/       model + build (model → sealed EstimateFile) + live preview
├─ src/components/ Items · Materials · BBS · Saved panels (Carbon)
├─ src/store.ts    the working-model store (zustand)
├─ src/lib/native.ts  bridge to the C++ host (window.esti_*); no-op in a browser
├─ src/App.tsx     shell — meta, preview totals, export, saved estimates
└─ desktop-cpp/    the native C++ desktop app: webview host + engine + SQLite
```

## Develop / build

```
pnpm --filter @esti/estimate dev        # Vite dev server (browser)
pnpm --filter @esti/estimate typecheck  # tsc
pnpm --filter @esti/estimate build      # tsc + vite build → estimate/dist
```

The native desktop app (webview host + C++ engine + SQLite) lives in
[`desktop-cpp/`](desktop-cpp/README.md). Its Windows installer
(`AORMS-Estimate-Setup.exe`, NSIS) is built in CI —
`.github/workflows/estimate.yml` (manual dispatch, or push an `estimate-v*` tag
to publish a GitHub Release). The landing download link resolves that asset live
(backend `desktopInstallers`), with `VITE_ESTIMATION_DOWNLOAD_URL` as fallback.

## Offline fonts

Carbon's IBM Plex is loaded from a CDN (`$font-path` in `styles.scss`); offline it
degrades to system fonts — the app stays fully functional. Bundling Plex for
pixel-identical offline type is a future polish.
