# ESTI Desktop (Tauri shell)

Native desktop app: a Tauri 2 (Rust) shell that boots a **local PostgreSQL**, runs
the existing **Node backend as a bundled sidecar**, and serves the existing
**React/Carbon SPA** in the webview — all on the user's machine. This is **Phase A.1
(P1)** of the desktop plan: local-only, filesystem storage, no worker/PDFs yet.

```
Tauri shell (Rust) ──┬─ starts local PostgreSQL (initdb on first run)
                     ├─ spawns the Node backend sidecar (loopback, env-wired)
                     ├─ waits for /readyz, injects window.__ESTI__ = { apiBase }
                     └─ opens the webview at the built SPA → talks to the loopback backend
```

The app-code seams that make this possible are already in the main codebase and are
**backward-compatible** (the VPS/web build is unchanged):

| Seam | File | Desktop env |
|---|---|---|
| Filesystem object store | `backend/src/lib/storage.ts` | `STORAGE_DRIVER=fs`, `STORAGE_DIR`, `FILES_PUBLIC_BASE` |
| File serving route | `backend/src/index.ts` `GET /files/*` | — |
| In-process worker (PDFs deferred) | `backend/src/lib/redis.ts` | `WORKER_MODE=inproc` |
| Loopback secrets allowance | `backend/src/env.ts` | `DESKTOP=1` |
| Bearer (not cookie) auth | `auth/router.ts` returns token; `index.ts` shim | `Authorization: Bearer` |
| Runtime API base | `frontend/src/lib/api-base.ts` | `window.__ESTI__.apiBase` |

## Prerequisites
- Rust toolchain + `tauri-cli` 2.x (`cargo install tauri-cli` or `cargo tauri`).
- Windows: the MSVC build tools + WebView2 (preinstalled on Win 11).
- pnpm + Node 20+ (already used by the repo).
- App icons: `cargo tauri icon path/to/logo.png` (generates `src-tauri/icons/`). The
  `bundle` step needs these; they're git-ignored binaries, not committed.

## Build (Windows installer)
```
pnpm desktop:assemble     # contracts + backend + frontend build, then bundle the backend sidecar
pnpm desktop:build        # cargo tauri build → NSIS installer
```
`desktop:assemble` runs `desktop/scripts/bundle-backend.mjs`, which stages
`src-tauri/resources/backend/{dist,drizzle,node_modules}` and vendors Node as
`src-tauri/binaries/esti-backend-<triple>`.

## Dev run
```
pnpm --filter @esti/backend build           # the sidecar runs the built dist
pnpm desktop:bundle-backend                  # stage resources + vendor node sidecar
pnpm --filter @esti/frontend build           # frontendDist
cargo tauri dev --config desktop/src-tauri/tauri.conf.json
# Optional: ESTI_BACKEND_SCRIPT=<abs path to backend/dist/index.js> to skip resource staging
```

## What lives where (per OS)
Windows: `%APPDATA%\in.aorms.esti\` → `pgdata/`, `files/`, `logs/`, `secrets/`.

## Known follow-ups (not in P1)
- **Compile + run validation:** the Rust shell is authored against Tauri 2 +
  `postgresql_embedded` 0.18 + `tauri-plugin-shell` 2; run `cargo build` in
  `src-tauri` to validate the crate APIs in your toolchain (a few `postgresql_embedded`
  `Settings`/method names may need a minor pin/adjust). The TypeScript seams are
  typecheck-verified.
- **Offline Postgres:** `postgresql_embedded` downloads PG binaries on first
  `setup()`. Vendor them under `resources/pgsql/` for an offline installer (P3).
- **P2:** bundle the Python worker (PyInstaller) + a small Redis sidecar for PDF
  rendering (`WORKER_MODE=redis`).
- **P3:** code-signing, `tauri-plugin-updater`, `pgdata` backup-before-migrate,
  first-run splash, macOS/Linux targets.
