# ESTICAD Companion Integration

> **⚠ Partial teardown (2026-06-28).** The downstream consumers of ESTICAD takeoff data — the Estimation OS, BOQ, Rate Books, and Rate Analysis — were **removed** in the consultancy-only rebuild. The companion's takeoff capture, `esti_measurement` storage, and AI gateway remain live. References below to "estimates", "BOQ/rate book", or `computeTakeoffBoq()` describe the original design and are no longer implemented.

**Status:** Delivered · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-19

Canonical integration spec for connecting **ESTICAD** (native Windows CAD) to **AORMS** (web office platform). ESTICAD mirror: [ESTI-COMPANION.md](../../../esticad/docs/ESTI-COMPANION.md).

---

## Product boundary

| Product | Role |
|---------|------|
| **AORMS** (`aorms.in`) | System of record — auth, projects, takeoff measurements, BOQ/rate book, estimates, AI gateway (Ollama), audit |
| **ESTICAD** (desktop, free) | **Only** takeoff capture client — native 2D drafting, measurement UI, AI reconciliation |

ESTICAD remains free and closed source. Cloud takeoff and cloud AI require an active **paying AORMS firm** account.

---

## Agreed policy (2026-06-17)

| Decision | Choice |
|----------|--------|
| Offline drafting | Allowed — local `.esti` geometry and commands work without network |
| Takeoff | **Online only** — blocked when offline or unauthenticated |
| Takeoff storage | **No local measurement data** — all units in `esti_measurement` (PostgreSQL) |
| License gate | Paying AORMS firm; staff with `write` capability |
| Local quant/BOQ in ESTICAD | **Deferred** — cloud-only via AORMS |
| Drawing upload per takeoff | **Not required** — measurements carry world coordinates + entity refs |
| Takeoff catalog | **Server-published JSON** (same semantics as `packages/contracts/src/takeoff.ts`) |
| Takeoff capture UI | **ESTICAD only** — web AORMS lists results and builds estimates; no browser measure tool |
| AI provider | AORMS Ollama gateway via ESTICAD — full CAD `AI_USE_CASES`; no local Ollama |

---

## Architecture

```text
ESTICAD (Win32 / C++)
  drawing_model (local .esti)
  takeoff commands + overlay renderer
  ai_engine → reconciliation (local proposals only)
       |
       | HTTPS — device token / bearer auth
       v
AORMS Fastify backend
  companion.* procedures (REST or tRPC adapter)
  measurements.* (extended schema)
  ai.generateCad (new draft kinds)
  takeoff catalog JSON endpoint
       |
       +---- PostgreSQL (esti_measurement, esti_drawing, esti_ai_run)
       +---- Ollama (firm-configured, server-side only)
```

ESTICAD is the **only** takeoff capture client. AORMS web lists synced measurements and builds estimates — it does not measure on drawings.

**Removed from web (2026-06-17):** `DrawingViewer.tsx`, `TakeoffComponentPicker.tsx`, `measurements.create`, `measurements.remove`, `drawings.setScale` (browser). Replaced by **Open in ESTICAD** on the project drawings tab.

---

## Authentication

Browser clients use the `esti_session` cookie. ESTICAD uses **device tokens**:

1. User signs in from ESTICAD (email + password) or pairs via AORMS web UI.
2. AORMS issues a long-lived **device refresh token** and short-lived **access token**.
3. ESTICAD stores secrets in **Windows Credential Manager** — not in `.esti` project files.
4. `companion.capabilities` returns `{ takeoff, ai, firmName, subscriptionActive }` on each session start and before takeoff commands.

**Access rules (ESTICAD device sessions)**

| Role | ESTICAD takeoff | ESTICAD AI |
|------|-----------------|------------|
| OWNER, PARTNER, SENIOR, ASSOCIATE (`write`, paying firm) | Yes | Yes (if firm AI enabled) |
| Demo staff (`write`) | Yes | No |
| VIEWER | No | No |
| CLIENT, CONSULTANT | No | No |
| Unauthenticated / expired | Drafting only | No |

**AORMS web (browser) — separate from companion**

| Account | ESTI agent (Alt+A) | AI Studio drafts | Uploads |
|---------|-------------------|------------------|---------|
| Demo | Yes (read-only) | No | No |
| Paying staff | Yes | Yes (if enabled) | Yes (by role) |

Demo web policy: `backend/src/lib/demo-policy.ts`. Companion writes use device-token auth, not browser Origin headers.

---

## Project and drawing linkage

Takeoff requires `projectId` and `drawingId` (existing `esti_drawing` FKs).

1. User runs `ESTILINK` (or equivalent) in ESTICAD and selects an AORMS project.
2. User selects or creates a drawing record (`ref`, `title`) — **no DXF upload required** for linkage.
3. `.esti` stores only linkage IDs in app preferences (not in measurement tables).

Optional later: DXF revision push on explicit user action — not part of the baseline gate.

Deep link from AORMS: `esticad://project/{projectId}/drawing/{drawingId}`.

---

## Takeoff catalog (server-published JSON)

**Endpoint:** `GET /api/companion/takeoff-catalog` (or `companion.takeoffCatalog` tRPC).

Response mirrors `TAKEOFF_CATALOG` from `@esti/contracts`:

- `id`, `category`, `label`, `measureKind`, `thicknessMm`, `widthMm`, `depthMm`
- `boqUnit`, `boqDescription`, `dsrItemCode`, `defaultHeightMm`

Server runs `computeTakeoffBoq()` on create — client sends raw geometry and element type; authoritative BOQ qty is always computed server-side.

ESTICAD caches catalog in memory for the session only; refresh on login and explicit `TAKEOFFCATALOG` reload.

---

## Measurement schema extension

Existing `esti_measurement` rows gain companion fields (migration required):

| Field | Type | Purpose |
|-------|------|---------|
| `source` | `ESTICAD` (new rows) | Origin client — legacy `WEB` rows may exist from earlier demos |
| `worldGeometry` | JSONB | Points, polylines, polygons in drawing world units |
| `entityRefs` | JSONB | Stable ESTICAD entity IDs tied to the measurement |
| `scaleWorldUnits` | text | World unit label (e.g. `mm`) |
| `createdByClient` | text | `esticad/{version}` |

Legacy columns `vbLength`, `realLength`, `unit` remain on the table for historical web rows; new ESTICAD rows use world geometry + `realLength` from server computation.

**Create flow (ESTICAD only)**

1. User picks component (WALL_230, etc.) and element name.
2. User measures length / area / count on canvas (native snap).
3. On save → `measurements.createCompanion` with world coords — **immediate POST**; no local queue.
4. Overlay redraws from `listByDrawing` response.

**Delete flow:** `measurements.removeCompanion` — ESTICAD only; audited.

---

## Takeoff commands (ESTICAD)

Native command-line UX — spec in [ESTI-COMPANION.md](../../../esticad/docs/ESTI-COMPANION.md):

| Control | ESTICAD command |
|---------|-----------------|
| Component picker | `TAKEOFF` + category/type prompts |
| Element name | Name prompt before save |
| Pan | `TOPAN` / existing pan |
| Length | `TOLEN` |
| Area | `TOAREA` |
| Count | `TOCOUNT` |
| Scale / calibrate | `TOSCALE` (persists via companion `drawings.setScale`) |
| Ortho / grid / endpoints | `snap_engine`; default grid `100 mm` |

**Web AORMS:** **Open in ESTICAD** button launches `esticad://project/{projectId}/drawing/{drawingId}`.

---

## BOQ and estimates

ESTICAD does not host the rate-book SQLite or local BOQ generation.

| Action | Where |
|--------|-------|
| Aggregate takeoff → estimate lines | AORMS `measurements.takeoffPreview`, `applyToEstimate` |
| Rate-book rate matching | AORMS `buildTakeoffEstimateLines` |
| Excel/PDF export | AORMS worker + office routes |

ESTICAD may show read-only preview fetched from API or deep-link to AORMS project estimation tab.
Estimate lines created from takeoff are stamped with source provenance and rate-book/takeoff snapshots in AORMS.

---

## AI integration

ESTICAD `ai_engine` builds local context (selection, layers, blocks, quantities context, revision metadata) but **never calls Ollama directly**.

New AORMS draft kinds (extend `AiDraftKind`):

| Kind | Maps to AI_USE_CASES |
|------|----------------------|
| `CAD_DIMENSION_SUGGEST` | Intelligent dimensioning (`AIDIM`) |
| `CAD_NAMING` | Naming assistant (`AINAME`) |
| `CAD_DOCUMENTATION` | Documentation assistant (`AINOTE`) |
| `CAD_QUANTITY_EXTRACT` | Quantity extraction (`AIQTY`) |
| `CAD_LAYER_AUDIT` | Layer cleanup (`AICLEAN`) |
| `CAD_REVISION_SUMMARY` | Revision summary (`AIREV`) |
| `CAD_PLOT_ASSIST` | Plot/layout suggestions (`AIPLOT`) |
| `CAD_BOQ_DRAFT` | BOQ narrative from quantities (`AIBOQ`) |

Flow:

```text
ESTICAD context_builder
  → companion.aiGenerateCad (permission-filtered)
  → AORMS runAiGateway → firm Ollama
  → esti_ai_run row + sources
  → proposal JSON back to ESTICAD
  → validation_engine → reconciliation_panel
  → user accept → command_engine commit
```

AI cannot mutate drawings or BOQ without reconciliation — unchanged from ESTICAD architecture.

---

## API surface (AORMS additions)

| Procedure / route | Auth | Purpose |
|-------------------|------|---------|
| `auth.loginDevice` | Public | Issue device + access tokens |
| `auth.refreshDevice` | Device refresh | Rotate access token |
| `companion.capabilities` | Device | License and feature flags |
| `companion.takeoffCatalog` | Device | Published catalog JSON |
| `companion.linkDrawing` | Device + write | Create/link `esti_drawing` without file upload |
| `measurements.createCompanion` | Device + write | World-geometry measurements |
| `measurements.removeCompanion` | Device + write | Delete ESTICAD measurement |
| `measurements.listByDrawing` | Device + project scope | Overlay sync |
| `companion.listDevices` | Owner | Active ESTICAD sessions |
| `companion.revokeDevice` | Owner | Revoke device session |
| `drawings.setScale` | Device + write | TOSCALE calibration |
| `ai.generateCad` | Device + write + AI enabled | CAD-specific Ollama drafts |

Implementation may expose a thin REST layer (`/api/companion/*`) for the C++ HTTP client while keeping tRPC as the internal implementation.

---

## Offline behaviour

| Mode | Drafting | Takeoff | AI |
|------|----------|---------|-----|
| Online + licensed | Full | Full | Full (if firm AI on) |
| Online + unlicensed | Full | Blocked | Blocked |
| Offline | Full | Blocked (no queue) | Blocked |

No local measurement queue — aligns with “no local takeoff data”.

---

## Security and audit

- Every companion measurement create/delete → `writeAudit` + optional `writeActivity`.
- AI runs → existing `esti_ai_run` provenance (`source: esticad`).
- Rate limits on device login and measurement create.
- Device tokens revocable from AORMS **Company → Connected devices** (owner-only panel).

---

## Delivery phases

Tracked in [ROADMAP](ROADMAP.md) Phase 13. ESTICAD side in [DEVELOPMENT_ROADMAP.md](../../../esticad/docs/DEVELOPMENT_ROADMAP.md) Phase 3 (redefined).

| Sub-phase | AORMS | ESTICAD |
|-----------|------|---------|
| 13A | Device auth, capabilities, catalog JSON | Login dialog, credential storage |
| 13B | Extended measurement schema + companion create/list | Takeoff commands, online-only overlay |
| 13C | `linkDrawing`, deep links | Project/drawing picker, `ESTILINK` |
| 13D | `generateCad` kinds + context contract | AI provider swap, full AI_USE_CASES reconciliation |
| 13E | Connected devices admin, integration tests | End-to-end gate, error UX |

---

## Related documents

- [ROADMAP](ROADMAP.md) — Phase 13 delivery tracking
- [ARCHITECTURE](ARCHITECTURE.md) — Companion client ADR
- [PRD](PRD.md) — ESTICAD companion requirements
- ESTICAD: [ESTI-COMPANION.md](../../../esticad/docs/ESTI-COMPANION.md), [AI_ENGINE.md](../../../esticad/docs/AI_ENGINE.md)
