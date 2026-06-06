# ESTI SPA Architecture — API-only Backend + Carbon React

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

Developed by **Holagundi Consulting Works (HCW)**. This document is the
engineering architecture for ESTI's move to an API-only Dolibarr backend with a
standalone Carbon Design System React front end, a DXF/PDF viewer service, and a
Podman pod. It adapts the HCW Architect Platform technical documentation and
viewer addendum to ESTI naming and the existing module base.

See [Product Vision](PRODUCT-VISION.md) for the positioning and
[Architect Practice Profile](ARCHITECT-PROFILE.md) for the product modules.

## Architecture Decision Records

### ADR-ESTI-01: Strip Dolibarr to API-only, keep its DB and REST core

**Decision.** Run Dolibarr headless as a backend service. Disable all Dolibarr
and legacy ESTI server-rendered UI routes. Expose data only through Dolibarr's
REST API (`/api/index.php/`) plus ESTI custom REST endpoints registered by the
`esti_*` modules.

**Rationale.**
- Dolibarr already has solid models for `societe` (client/supplier), `facture`
  (invoice), `projet`, and `user`. The ESTI architect-office modules add
  `esti_*` models on top. Re-implementing these from scratch is high-risk.
- Stripping the UI removes PHP/template debt and makes the Carbon React SPA the
  single front end for the ESTI Architect Platform.

**Consequences.**
- The existing `esti_*` modules keep their SQL tables and CommonObject classes
  and gain REST endpoints. Their `.php` list/card pages become a compatibility
  boundary, removed only after the React replacement is complete and
  permission-safe (consistent with [Backend Profile](BACKEND-PROFILE.md)).
- Web access is restricted to `/api/` (and `/install/` on first run) via the
  reverse-proxy rule shipped in `containers/`.

### ADR-ESTI-02: IBM Carbon Design System v11 (React) as the sole UI library

**Decision.** Use `@carbon/react` v11 as the only component library. No MUI, Ant,
or bespoke component frameworks. Icons from `@carbon/icons-react`; charts from
`@carbon/charts-react`.

**Rationale.** Carbon is built for data-dense enterprise UIs — the DataTables,
multi-step forms, side panels, and notifications that fee proposal, invoice,
drawing, permit, consultant, and takeoff screens need. The token system lets a
small team produce a coherent UI without a dedicated designer. This supersedes
the earlier "CSS-and-theme-first, avoid Carbon packages" guidance in
[Carbon UI Direction](CARBON-UI-DIRECTION.md), which described the interim
embedded-theme phase.

**Consequences.** Use `@carbon/themes` tokens, not raw hex. Layout via Carbon
`Grid`/`Column`/`Row`. Keep the existing ESTI blue/IBM-blue token layer as Carbon
theme overrides.

### ADR-ESTI-03: Fee proposal is the migration anchor

**Decision.** Migrate the architect fee proposal experience to Carbon React
first — it validates the Dolibarr/ESTI API ↔ React data flow end to end before
any other screen is built. The first product workflow is scope, deliverables,
exclusions, COA benchmark, revision history, client approval, and phase-linked
billing.

### ADR-ESTI-04: DXF rendering via a Node.js conversion service → SVG

**Decision.** Do not parse DXF in the browser. A Node.js sidecar accepts a DXF
upload, converts it to SVG with the `dxf` npm package, and returns SVG + layer +
bounds metadata. React renders the SVG and overlays a Canvas measurement layer.
SVG artefacts are cached by file hash in a pod volume. See
[Architect Practice Profile](ARCHITECT-PROFILE.md) for the takeoff flow.

### ADR-ESTI-05: Measurement layer is Canvas-over-SVG/PNG

**Decision.** Render the drawing as static SVG (DXF) or PNG (PDF via pdf.js).
Overlay a transparent `<canvas>` at the same dimensions. All measurement
interaction happens on the canvas; pixel distances convert to real-world units
via a user-set or DXF-auto-detected scale (pixels-per-metre).

### ADR-ESTI-06: Single Podman pod for development

**Decision.** All services share one Podman pod, extending the existing
`containers/` runtime. Pod members: MariaDB, Dolibarr (API-only), the ESTI viewer
service, and the Vite/React dev server.

### ADR-ESTI-07: Dolibarr version baseline

**Decision.** ESTI targets the Dolibarr **19** baseline already used by the
`esti_*` modules (`need_dolibarr_version = array(19, -3)`). The HCW draft's
17.x pin is superseded. Pin the exact patch version before each release and keep
a clean upstream remote for security-fix merges.

## Backend Strip Strategy

### Keep (retain Dolibarr data + API)

| Dolibarr module | ESTI usage |
|---|---|
| `societe` | Clients, consultants, suppliers |
| `user` | Auth, roles (admin / consultant / client) |
| `facture` / `facturedet` | Invoices (extended for GST/TDS) |
| `ecm` | Drawing/document vault file storage base |
| ESTI `esti_*` modules | Architect-office domain models |

### Disable (already removed from ESTI discovery, keep disabled)

CRM/prospecting, generic orders, POS, ecommerce, HRM, recruitment, expenses,
MRP, helpdesk, surveys, email campaigns, events, interventions, knowledge base,
generic products/services/variants/barcodes, generic projects/collaboration,
generic ECM UI, stock/warehouse, purchase operations, multi-currency, subtotals
— per [Backend Profile](BACKEND-PROFILE.md).
The strip is enforced by removed module descriptors, `410 Gone` legacy routes,
and `containers/apply-esti-defaults.php`. The SPA migration adds: block all
non-`/api/` web routes at the reverse proxy.

### Reverse-proxy rule (concept)

Expose only `/api/` (and `/install/` on first run). Return `403`/`410` for every
other path so no Dolibarr or legacy ESTI PHP page is reachable from a browser.
The concrete config ships in `containers/` alongside the existing Apache/Podman
files.

## Frontend Stack

```
React 18
@carbon/react v11            UI components
@carbon/icons-react v11      icons
@carbon/charts-react         dashboard charts
@tanstack/react-query v5     server state (no raw useEffect fetches)
zustand v4                   local UI state (modals, selection, active tool)
react-router-dom v6          routing
react-hook-form + zod        forms + validation
dayjs                        dates
papaparse                    CSV export (BOQ, GSTR-1, 26AS)
pdfjs-dist                   in-browser PDF rendering for takeoff
```

- **Server state:** React Query, with cache keys centralised in
  `src/api/queryKeys.js`.
- **UI state:** Zustand stores per module under `src/store/`.
- **Form state:** React Hook Form only.
- **Brand tokens:** keep ESTI/IBM blue as Carbon theme overrides; light theme
  (`g10`) first, dark (`g90`) toggle as a later phase.

## API Layer

Base: `http://<host>/api/index.php/`. All calls send the Dolibarr API key header
(`DOLAPIKEY`), obtained from `POST /login`.

Dolibarr REST endpoints used: `/thirdparties`, `/users`, `/invoices`,
`/documents`. ESTI domain data is served by custom REST endpoints registered in
each `esti_*` module (replacing the HCW doc's `/hcw/*` with `/esti/*`), e.g.:

```
GET/POST/PUT  /esti/projects, /esti/phases, /esti/clients, /esti/feeproposals,
              /esti/invoices, /esti/permits, /esti/bylaws, /esti/drawings,
              /esti/revisions, /esti/collaborators, /esti/approvals,
              /esti/boqs, /esti/takeoff-items, /esti/drawing-scale
GET           /esti/dashboard, /esti/gst-summary, /esti/tds-summary
```

Each `esti_*` module gains an `api/` directory exposing its CommonObject CRUD
plus profile-specific aggregations. Frontend wraps these in a thin client
(`src/api/client.js`) used exclusively through React Query.

## Viewer Service (Node.js)

A container built from `containers/viewer/` (Node 20):

```
express        HTTP server
dxf            DXF → SVG + entity/layer/bounds metadata
multer         multipart upload handling
sharp          raster fallback for very large drawings
node:crypto    file-hash cache keys
```

Endpoints: `POST /dxf-to-svg`, `GET /dxf-layers/:hash`, `GET /cache/:hash`,
`POST /pdf-to-meta`. SVG output is cached by file hash in a persistent pod
volume. PDF display uses pdf.js in the browser; the service only provides PDF
page metadata. Licence note: `dxf`, `pdfjs-dist`, `multer`, and the Carbon stack
are MIT/Apache-2.0; the viewer service ships as its own component. ESTI overall
remains GPL-3.0-or-later (Dolibarr-derived) — see [License Notice](LICENSE-NOTICE.md);
the SPA/viewer licensing is reviewed before public distribution.

## Podman Pod Topology

Extends the existing `containers/podman-compose.yml`:

| Container | Image | Port | Purpose |
|---|---|---|---|
| `esti-db` | `mariadb:10.11` | 3306 | Database |
| `esti-app` | Dolibarr (pinned 19.x) | 80 | API-only backend |
| `esti-viewer` | `node:20-alpine` (custom) | 3001 | DXF→SVG, PDF metadata |
| `esti-frontend` | `node:20-alpine` (custom) | 5173 | Vite dev server (Carbon React) |

Shared volumes: db data, Dolibarr documents/ECM (shared with the viewer for
uploads), and a viewer SVG cache. Vite proxies `/api` → `:80` and `/viewer` →
`:3001` so there are no CORS issues in development.

## Folder Structure (target)

```
esti/
  htdocs/                         Dolibarr + esti_* backend modules (API-only)
    esti_dsrsor/ ...              reference/costing support modules
    esti_projectoffice/           architect-office project modules
    esti_feeproposal/             fee proposal and COA benchmark modules
    esti_invoiceindia/            GST/TDS invoice support modules
    esti_permit/ esti_drawing/    drawing and compliance modules
    ...
  containers/
    podman-compose.yml            pod definition (db, app, viewer, frontend)
    viewer/                       Node DXF/PDF service (Dockerfile, src/)
  frontend/                       standalone Carbon React SPA
    src/
      api/        client.js, queryKeys.js
      layouts/    AppShell.jsx, PortalShell.jsx
      modules/    feeproposals/ projects/ invoices/ permits/ drawings/
                  consultants/ dashboard/ takeoff/ portal/
      store/      authStore.js, takeoffStore.js, uiStore.js
      utils/      gst.js, coaFee.js, formatCurrency.js
      constants/  permitTypes.js, projectPhases.js, disciplines.js, coaRates.js
      styles/     esti-carbon-tokens.scss
  docs/esti/                      this documentation set
```

The current `htdocs/estiui/` embedded React shell is the seed of `frontend/`;
it is promoted to the standalone Vite app as the migration proceeds.

## Authentication and Multi-tenancy

- **Phase 1 (single firm):** one Dolibarr admin user (HCW principal). API key in
  `sessionStorage` after `POST /login`.
- **Phase 2 (collaborators + clients):** Dolibarr roles — `admin` (HCW),
  `consultant` (project-scoped, no fee/invoice access), `client` (read-only
  portal at `/portal`).
- Design custom tables with an optional `fk_firm` column so a future multi-firm
  SaaS does not require a migration, even though it is unused in Phase 1.
