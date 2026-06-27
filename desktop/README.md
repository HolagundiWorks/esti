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

## Edition — LITE, licence-free
The desktop app ships as the **LITE, licence-free** edition: the Rust shell injects
`FIRM_PLAN=LITE` (override at launch for CORE/ENTERPRISE) and leaves `ESTI_HUB_URL`
empty, so the install is an **unmanaged node** — the backend's licence write-gate
never engages and the plan is pinned from `FIRM_PLAN` on boot. The SPA is built with
`VITE_PUBLIC_SITE=false` (manual login + signup, not the public-demo role picker) via
`desktop/scripts/build-frontend.mjs`.

## Build host (read first)
The installer must be built on a host whose `node_modules` is a **native install
for the target OS**. Critically: in the normal dev setup this repo's `node_modules`
is a **Linux install bind-mounted into the podman containers** (POSIX `.bin` shims,
Linux-ELF native addons like `@node-rs/argon2`). On a Windows/macOS host that
install **cannot build** the desktop app — package scripts fail with
`'tsc' is not recognized`, and the bundled sidecar's native addons are the wrong
platform — and **reinstalling in place would break the containers**.

So build on a **separate native checkout** (or CI runner) of the target OS with its
own `pnpm install`, not the container-shared working copy. Run the preflight to
verify the host before building:
```
pnpm desktop:doctor       # checks toolchain + that node_modules matches this host
```
It fails fast with guidance if the host isn't buildable. `desktop:assemble` runs it
automatically.

## Build (Windows installer)
Prerequisite: a native Windows host (see **Build host** above) with **pnpm + a full
`pnpm install`** (so the workspace `.bin`/`tsc` and Windows-native addons resolve),
Rust + `tauri-cli` 2.x, and Node. Then:
```
pnpm desktop:assemble     # preflight + contracts + backend + frontend(VITE_PUBLIC_SITE=false) build, then bundle the sidecar
pnpm desktop:build        # cargo tauri build → NSIS installer in src-tauri/target/release/bundle/nsis/
```
`desktop:assemble` runs `desktop/scripts/build-frontend.mjs` (firm-app SPA) then
`desktop/scripts/bundle-backend.mjs`, which stages
`src-tauri/resources/backend/{dist,drizzle,node_modules}` (via `pnpm deploy --prod`)
and vendors Node as `src-tauri/binaries/esti-backend-<triple>`. PostgreSQL binaries
are NOT in the installer — `postgresql_embedded` downloads them on first launch
(vendor under `resources/pgsql/` for a fully offline installer — P3).

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

## Status
- **Compiles cleanly** — `cargo build` in `src-tauri` succeeds (verified against
  `tauri` 2.11.3, `postgresql_embedded` 0.18.7, `tauri-plugin-shell` 2.3.5;
  `Cargo.lock` committed for reproducibility). The build needs `frontend/dist` to
  exist (run `pnpm --filter @esti/frontend build` first) plus the staged sidecar +
  `resources/backend/**` (run `pnpm desktop:bundle-backend`); the bundle/run path is
  not yet exercised end-to-end on a clean machine.

## Known follow-ups (not in P1)
- **Offline Postgres:** `postgresql_embedded` downloads PG binaries on first
  `setup()`. Vendor them under `resources/pgsql/` for an offline installer (P3).
- **P2:** bundle the Python worker (PyInstaller) + a small Redis sidecar for PDF
  rendering (`WORKER_MODE=redis`).
- **P3:** code-signing, `tauri-plugin-updater`, `pgdata` backup-before-migrate,
  first-run splash, macOS/Linux targets.
