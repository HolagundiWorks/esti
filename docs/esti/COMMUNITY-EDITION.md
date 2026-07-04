# AORMS Community Edition

The **free, offline, LAN-only** appliance: one install per machine, a single
admin + 3 staff/intern, no licence, no online/hub, no AI, no external portals.
Pro remains the licensed/cloud product; data moves **one way, Community → Pro**
(package the company in *Company › Move to AORMS Pro*, import it into Pro).

## Turning it on

Set the edition (Tauri desktop bakes `AORMS_EDITION`; a server install uses env):

```
ESTI_EDITION=COMMUNITY
FIRM_PLAN=LITE
ESTI_HUB_URL=            # empty → fully offline
```

`auth.runtime` then reports `{ community: true }` and the SPA strips every
licence/online/AI/portal surface (see `useEdition()`).

## First run — default admin + backup code

On first boot with an empty DB (Community only), the backend seeds one OWNER
admin and prints, **once**, to the server console:

```
[AORMS Community] First-run admin created — username "admin", password "Admin00@" (must be changed on first login).
[AORMS Community] Backup recovery code: XXXX-XXXX-XXXX — the only offline recovery path; store it safely.
```

- The admin **must** rotate the password on first login (`mustChangePassword` —
  every mutation is blocked until it's changed).
- **Recovery is the backup code only** (no email): *Sign in › Use backup code*
  (`/recover`) resets the password and issues a fresh code. Keep it safe — it is
  the sole recovery path.
- The admin creates up to **3 more accounts** (staff/intern) from *Users*
  (Lite's `staff: 3` cap → 4 users total).

## What's included vs stripped

**Included:** Projects (phases, tasks, drawings, decisions, MoM) · Tasks ·
**Contacts** (clients) · Proposals · basic Invoices / Cashbook / Office Expenses ·
Contracts / Letters / Transmittals / Permits / Spec · Company / Users / Settings /
Archived · **Share any PDF via WhatsApp**.

**Stripped:** AI / Ask-ESTI / cognition · **Estimation & Knowledge Bank** (these
ship as a separate estimate desktop app that pushes for Pro) · client / contractor /
consultant **portals** · consultants / contractors / vendors directories · licence /
online account / upgrade-request · LXOS · and everything already Pro-gated (PMC, HR,
Performance, GST filing, ESTICAD, audit log…).

## Install lock (one install per machine)

The backend holds a machine-scoped single-instance lock
(`acquireCommunityInstanceLock`, `os.tmpdir()/aorms-community.lock`): a second
live Community instance on the same machine refuses to start. Override for
support with `ESTI_INSTALL_LOCK=off`.

**Desktop (Tauri) — add the native single-instance guard** (needs a desktop
build; can't be compiled in CI here):

```toml
# desktop/src-tauri/Cargo.toml
tauri-plugin-single-instance = "2"
```
```rust
// desktop/src-tauri/src/lib.rs — before other plugins
.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
    // focus the existing window instead of launching a second copy
    if let Some(w) = app.get_webview_window("main") { let _ = w.set_focus(); }
}))
```

## LAN serving (teammates connect from their own devices)

The backend already binds **`0.0.0.0`**, and in Community it logs the reachable
LAN URLs at boot:

```
AORMS Community reachable on the LAN at http://192.168.1.42:4000
```

LAN clients open that URL in a browser (same-origin → normal cookie auth; the
host's Tauri webview keeps its bearer token). **To serve the SPA to LAN browsers**
the built `frontend/dist` must be served over HTTP on the same origin — either:

1. **Reverse proxy** (recommended for a fixed host): nginx serves `frontend/dist`
   with an SPA fallback and proxies `/trpc`, `/files`, `/platform` to the backend
   port — see `docs/esti/VPS-INSTALL.md`; or
2. **Serve from the backend**: add `@fastify/static` pointing at `frontend/dist`
   with a `setNotFoundHandler` SPA fallback for non-API paths (so `/trpc/*`,
   `/files/*` are untouched). One `pnpm add @fastify/static` + a small plugin
   registration in `backend/src/index.ts`.

The Tauri shell should surface the LAN URL to the host (e.g. a menu item / toast)
so they can share it — read it from the backend boot log or `os` network
interfaces in the Rust shell.
