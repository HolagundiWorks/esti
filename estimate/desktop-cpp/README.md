# AORMS Estimate — native C++ desktop app

The **native desktop implementation** of AORMS Estimate: a pure-**C++** app (no
Rust, no server) that embeds the OS webview to render the browser-based SPA and
runs the estimating engine + **SQLite** in-process. Nothing listens on a port;
nothing leaves the machine.

```
┌ aorms-estimate-desktop (native C++ exe) ──────────────────────────┐
│  OS webview (WebView2 / WebKitGTK / WKWebView)                     │
│     └ the React SPA (browser UI, ../src) — window.esti_* bindings  │
│  C ABI bridge (src/capi.*)  ← in-process, no HTTP                  │
│  engine (src/estimate.*, bbs_engine.*)  +  SQLite (vendored)       │
└───────────────────────────────────────────────────────────────────┘
```

- **No server.** The webview `bind()`s C++ functions onto `window.*`; the SPA
  calls them directly. There is no localhost HTTP, no daemon.
- **Self-contained.** SQLite is vendored as the amalgamation and compiled in, so
  there are no external runtime dependencies (beyond the OS webview, which ships
  with Windows 10/11 and every desktop Linux/macOS).
- **Same engine as everywhere else.** A faithful C++ port of the shared
  TypeScript engine in `@esti/contracts`; a sealed `.aormsest` produced here has
  the **exact same sha256 checksum** as one sealed by the SPA (pinned by test).

## Layout

```
desktop-cpp/
├─ app/main.cpp        webview host: opens the window, loads the SPA, binds esti_*
├─ src/
│  ├─ numeric.hpp      paise/rounding + jnum (JS-JSON number parity)
│  ├─ sha256.hpp       dependency-free SHA-256 (the .aormsest seal)
│  ├─ bbs.hpp          IS-code constants (IS 456 / 2502 / SP 34)
│  ├─ bbs_engine.*     element geometry → bar schedule
│  ├─ estimate.*       model → draft → seal + re-costing
│  ├─ db.*             SQLite store (estimates table)
│  └─ capi.*           extern "C" bridge the host binds to window.*
├─ tests/              engine parity + C-ABI round-trip (ctest)
├─ third_party/        vendored: sqlite3 (amalgamation), json.hpp, webview.h
└─ CMakeLists.txt      library + tests (always) + desktop app (when webview deps present)
```

## window.* API (bound by the host)

Each resolves to parsed JSON; failures surface as `{ error }`.

| Binding | Purpose |
|---|---|
| `esti_list()` | saved estimates (summaries) |
| `esti_create(model)` | save new → `{id, …, costed}` |
| `esti_get(id)` | model + freshly-costed views |
| `esti_update(id, model)` | overwrite (re-seals, re-costs) |
| `esti_delete(id)` | delete |
| `esti_file(id)` | sealed `.aormsest` |
| `esti_recost(body)` | stateless re-cost |
| `esti_bbs(body)` | geometry → bar schedule |

The SPA reaches these through `../src/lib/native.ts` (`isNative()` guards a plain
browser, where the app stays export-only).

## Build & test

The engine library and its tests build anywhere with a C++17 compiler + CMake —
**no GUI deps needed**. The desktop app target is added only when the platform
webview deps are present (Windows/macOS always; Linux needs GTK3 + WebKitGTK).

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure     # engine_parity + capi_roundtrip
```

Linux desktop build needs: `sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev`.

## Desktop app + installer

The UI is a **single-file** SPA bundle (`ESTI_SINGLEFILE=1 pnpm --filter
@esti/estimate build` → `estimate/dist/index.html`) that the host loads via
`set_html`; CPack ships it next to the executable.

Windows (WebView2 SDK restored via NuGet, packaged with NSIS):

```sh
pnpm --filter @esti/estimate build            # with ESTI_SINGLEFILE=1
cmake -S . -B build -A x64 -DWEBVIEW2_DIR=<Microsoft.Web.WebView2 nuget dir>
cmake --build build --config Release
cd build && cpack -G NSIS -C Release           # → AORMS-Estimate-Setup.exe
```

CI does all of this and **publishes `AORMS-Estimate-Setup.exe` to a GitHub
Release** — see `.github/workflows/estimate.yml` (manual dispatch, or push an
`estimate-v*` tag). That asset name is what `VITE_ESTIMATION_DOWNLOAD_URL` (when
set at build time) points at — keep it stable.
