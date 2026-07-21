# EOMS integration — connecting esti to the compliance Knowledge Bank

How the `esti` monorepo connects to **EOMS** (Emergent Object Management System — the
compliance Knowledge Bank, a *separate* repo: `github.com/HolagundiWorks/eoms`), which is
**hosted locally** as the desktop companion. Companion to the design in
[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md).

> **Shape of the link.** EOMS is an out-of-process, local REST/JSON service (FastAPI, default
> `http://127.0.0.1:8756`). esti consumes it **read-only, server-to-server** from the backend —
> the browser never talks to EOMS directly. EOMS is **optional**: if it isn't running, esti
> degrades gracefully (a "not connected" state), never an error.

---

## 1. What was wired on the esti side (this change)

| Piece | File |
|---|---|
| Typed contract (Zod mirror of the EOMS response model, `.passthrough()` so EOMS can add fields) | `packages/contracts/src/eoms.ts` |
| Backend client — fetch + timeout + short-TTL cache + **fail-safe** result envelope | `backend/src/lib/eoms/client.ts` |
| tRPC router — `eoms.status / resolve / rules / clause / bundle / sources / versions / library` | `backend/src/modules/eoms/router.ts` (wired in `trpc/router.ts`) |
| Config — `EOMS_API_URL` | `backend/src/env.ts` |
| Container → host reachability — `EOMS_API_URL` default + `extra_hosts: host.docker.internal:host-gateway` | `compose.yaml` (backend service) |

**Design choices baked in:**
- **Published-only.** `resolve` and `rules` always send `status=published`, so esti never
  surfaces draft/unreviewed rules — matching EOMS's human-in-the-loop gate.
- **Fail-safe.** Every client call returns `{ ok: true, data } | { ok: false, reason }`
  (`disabled` / `unreachable` / `not_found` / `bad_response`) instead of throwing. Verified:
  with EOMS down the client returns `{ ok:false, reason:"unreachable" }`; with `EOMS_API_URL`
  unset it returns `{ ok:false, reason:"disabled" }`.
- **Cache.** Immutable serving responses (clause, bundle) cache ~30 min; resolve ~1 min; rules
  ~5 min — EOMS marks them immutable per version.
- **Backend-only.** esti proxies EOMS through its own tRPC, so EOMS needs no CORS and stays off
  the browser/public surface.

The EOMS endpoints esti calls (all `GET`): `/health`, `/v1/resolve?source=&as_of=&status=published`,
`/v1/rules?version=&param=&status=published`, `/v1/versions/{id}/clauses/{n}`,
`/v1/versions/{id}/bundle`, `/v1/sources`, `/v1/versions`, `/v1/library`.

---

## 2. Running it locally (end-to-end)

1. **Start EOMS** (the desktop companion), on the host:
   ```bash
   cd <eoms>/apps/desktop-companion
   pip install -r requirements.txt
   # bind so the esti container can reach it (see §3, alteration #1):
   CKB_HOST=0.0.0.0 python run.py --server     # serves on :8756
   ```
   Ingest & **publish** at least one document (draft versions are not served).
2. **Point esti at it.** Default in `compose.yaml` is `http://host.docker.internal:8756`; the
   backend has `extra_hosts: host.docker.internal:host-gateway` so that resolves to the host
   under Docker Engine. Override with `EOMS_API_URL` in the root `.env` if needed. **Recreate**
   the backend so it picks up the env + host mapping:
   ```bash
   docker compose up -d --force-recreate backend
   ```
3. **Verify.** Call `trpc.eoms.status` (or from the app once a UI lands) — it returns
   `{ enabled, reachable }`. `reachable:true` means the link is live.

Topology: **esti backend (container) → host gateway → EOMS companion (host :8756)**. If esti ever
runs directly on the host (not Docker), set `EOMS_API_URL=http://127.0.0.1:8756`.

---

## 3. What needs to change in the EOMS API

The EOMS contract is a clean match for esti's needs — the read model (resolve → version, rules,
clauses, bundle), edition pinning (`as_of`), and the `published` gate are exactly right, and no
esti-side compromise was required. The changes below make the **local, cross-process** link
robust and secure. Only #1 is required for the Dockerized setup.

| # | Change | Priority | Why |
|---|---|---|---|
| 1 | **Bindable host** — add a `CKB_HOST` env (default `127.0.0.1`) so the server can bind `0.0.0.0`. | **Required** (for esti-in-Docker) | The companion listens on `127.0.0.1:8756`; a connection from the esti container arrives on the host's gateway interface, which a loopback-only bind rejects. `CKB_HOST=0.0.0.0` lets the container reach it. (Not needed if esti runs on the host, or if EOMS is later containerised on the compose network.) |
| 2 | **Optional API key** — accept a bearer/`X-API-Key` header (`CKB_API_KEY`), enforced only when set. | **Recommended** | Once bound to `0.0.0.0` the API is reachable by anything on the host's network. esti would send the key from the backend. Keeps the "bind wider" step from being wide-open. |
| 3 | **Keep `/openapi.json` stable & versioned** (FastAPI already serves it). | **Recommended** | Lets esti (and AiADT/Construction OS) regenerate a typed client instead of hand-mirroring. esti's current contract is `.passthrough()`-lenient specifically to survive additive drift; a stable spec makes that unnecessary. |
| 4 | **Batch resolve / rules** — `POST /v1/resolve` (many `{source, as_of}`) and/or `POST /v1/rules:batch` (many `{version, param}`). | Optional | Enriching a whole drawing or an AiADT takeoff against several codes is N round-trips today; a batch cuts it to one. |
| 5 | **`GET /v1/versions/{id}`** — fetch one version's metadata by id. | Optional (minor) | esti has `resolve` + `list`; a direct by-id lookup is convenient for cached links. |
| 6 | **Structured error envelope** — a consistent `{ error, code }` on 4xx (FastAPI returns `{detail}`). | Optional (minor) | esti already maps 404 → `not_found`; a uniform shape simplifies clients. |

Not needed: **CORS** (esti calls server-to-server, never from the browser) and **tenant/firm
auth** (EOMS serves public standards; firm context stays in esti). Both are deliberately kept
out of EOMS.

---

## 4. Who consumes it (now and next)

- **Now:** the `eoms.*` tRPC surface is live; the Knowledge Bank portal shows
  `EomsCompliancePanel` (`status` / sources / resolve / rules) with an offline
  state when the companion is down.
- **Next (per [EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md) migration):** the compliance module
  (`esti_compliance_*`) reads through EOMS instead of local tables; **ESTI** answers cite EOMS
  clauses (edition + provenance); **AiADT** takeoffs get a code/compliance overlay by resolving
  the relevant rules host-side and joining them to the quantities.
