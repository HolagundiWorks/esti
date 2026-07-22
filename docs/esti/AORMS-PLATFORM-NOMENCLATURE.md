# AORMS platform nomenclature

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-22

This document is the **single source of truth for product naming**. Where an older doc still says
*Architecture Office Resource Management System*, **AORMS-Architecture**, or **HiveD**,
treat those as **superseded** unless the doc is explicitly marked historical.

Executable constants: `frontend/src/lib/product-nomenclature.ts`.

---

## Names at a glance

| Name | Expansion / role | Audience |
| --- | --- | --- |
| **AORMS** | **Accelerated Operational Resources Management System** — the **platform** | **AEC consulting firms** — architecture and engineering practices that advise clients; not solution delivery or construction PM |
| **AORMS-Studio** | **Architecture app** — shipped workspace (slug `aorms-studio`) | Indian architecture & interior design consultancies |
| **AORMS-Consultancy** | **Engineering app** — code-complete in monorepo; launch gated (slug `aorms-consultancy`) | Structural, MEP, civil, and multidisciplinary engineering consultancies |
| **EOMS** | **Knowledge bank** (standalone API, separate repo) — *Emergent Object Management System* | The continuously-learning catalog of standard codebooks, building & compliance codes; AORMS apps query its API to retrieve authoritative code/data |
| **ESTI** | **Internal AI agent** — *Embedded Studio Intelligence* | Answers only from **validated firm repositories** — Ask ESTI, Studio Intelligence, ESTI Pulse (live in **AORMS-Studio**) |
| **`esti` (codename)** | Repo name, `@esti/*` packages, `esti_*` DB tables | Engineering only — do not expose in marketing |

**HCW** (Human Centric Works) is the design-system and product studio behind AORMS.

---

## Two apps on one platform

AORMS targets **AEC consulting firms only**. There are exactly **two apps**:

| Discipline | App name | Slug | Status |
| --- | --- | --- | --- |
| Architecture | **AORMS-Studio** | `aorms-studio` | **Shipping** (this repo) |
| Engineering | **AORMS-Consultancy** | `aorms-consultancy` | Code-complete; launch gated on P9.V / P9.M |

Legacy slugs for **AORMS-Studio** redirect to canonical URLs: `hived`, `aorms-architecture`.

---

## Platform vs apps

### AORMS (platform)

Mission: give **AEC consulting firms** — architecture and engineering practices that
**advise clients** — an **operational framework** and a **design framework** on one spine.

**AORMS is not** a solution-delivery platform, a contractor tool, or client construction
project management. It consolidates scattered office tools into one AI-enhanced system
for consultancies.

North-star capabilities:

- **Operational framework** — intake, process standards, rollout, adoption
- **Design framework** — engagement methodologies, deliverable models, templates
- Collaborative workspace (documents, channels, reviews)
- Dual-tier AI / **EOMS** (knowledge bank) + **ESTI** (internal RAG)
- Audit & compliance reporting
- Knowledge base with semantic search
- Analytics & operational dashboards

**Canonical pre-release architecture:** [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md)
(rendered on the public landing at `/`).

### AORMS-Studio (architecture app — this repo)

The **shipped monorepo** is the **architecture consultancy app** — what users previously
called “AORMS portal”, **AORMS-Architecture**, or **HiveD**.

| Aspect | AORMS-Studio |
| --- | --- |
| **Product name** | **AORMS-Studio** (slug: `aorms-studio`) |
| **Scope** | Indian architecture office: projects, fees, GST invoicing, drawings, site supervision, HR, client & consultant portals |
| **Typical URL** | `studio.aorms.in` (legacy `app.aorms.in` → 301) |
| **Public wiki** | [aorms.in/wiki](https://aorms.in/wiki) |

### AORMS-Consultancy (engineering app — code-complete; launch gated)

The **engineering consultancy app** — structural, MEP, civil, and multidisciplinary firms
advising on built-environment projects. Shares the same AORMS platform primitives (tenant,
permissions, workflow engine, EOMS) as a separate workspace profile
(`hlp_organization.workspace_type = CONSULTANCY`). Core + SOP + R&O are **built** in this
monorepo; public launch is gated on human fee UX review (P9.V) and marketing (P9.M) —
see [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md) § P9.

---

## Portals and surfaces

Executable labels: `AORMS_PORTALS` in `frontend/src/lib/product-nomenclature.ts`.

| Surface | Display name | URL / route | Notes |
| --- | --- | --- | --- |
| **Staff workspace** | **AORMS-Studio** | `studio.aorms.in` · `/login` | Architecture app today |
| **Knowledge Bank portal** | Knowledge Bank portal | `/libraries/knowledge-bank-portal` | EOMS textbook intake → ESTI RAG |
| **Wiki** | AORMS Wiki | `/wiki/*` on **aorms.in** | Public documentation |
| **External portals** | External portals | `/access` | Client, consultant, contractor, site sign-in |
| **Client portal** | Client portal | external session | Scoped to client projects |
| **Consultant portal** | Consultant portal | external session | Alias *collaborator portal* in internal copy |
| **Contractor portal** | Contractor portal | external session | Rebuild in progress (stub) |
| **Site portal** | Site portal | site supervisor session | Mobile-first site inspections |
| **Personal account** | AORMS account | `/account` | Portable identity + licence hub |
| **Company account** | Company account | `/company-account` | Firm owners: GST, members, admin |
| **Licensing console** | Licensing console | `admin.aorms.in` · `/platform-admin` | Platform operators only |
| **Consultancy marketing** | **AORMS-Consultancy** | `consultancy.aorms.in` · `/aorms-consultancy` | Engineering app (launch gated) |

Frozen host map: [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md).

---

## EOMS — the knowledge bank

**EOMS** — *Emergent Object Management System* — is AORMS's **continuously-learning
knowledge bank**, delivered as a standalone **API in its own repository** (not part of
the `esti` monorepo). It ingests, catalogs, and serves the codified knowledge every AEC
practice depends on:

- **Standard codebooks** — IS / NBC / Eurocode and the like
- **Building compliance** — development-control rules, zonal and bye-law regulations
- **Other compliance codes** — fire, structural, MEP, environmental standards

Content is stored **catalogued** so a specific code, clause, or dataset can be **retrieved**
on demand. EOMS **learns continuously** as new editions and sources are ingested, validated,
and published. Every AORMS app — and the native tools (AiADT, Construction OS) — query
**EOMS over its API** for authoritative codes and compliance data; nothing unvalidated is
stored as truth.

Full design: **[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md)** — the object model, the
continuous-learning ingestion pipeline, the API surface, and how esti / AiADT / Construction OS
consume it.

---

## ESTI — internal AI agent

**ESTI** — *Embedded Studio Intelligence* — is the **internal AI agent**. It answers
only from **validated firm repositories** inside the tenant boundary:

- Ask ESTI / ESTI AI / AI Studio
- Cognition engine & Studio Intelligence home
- ESTI Pulse

**AORMS-Studio** ships ESTI today. **AORMS-Consultancy** will ship its own internal-agent
profile when the engineering app launches — do not describe ESTI as spanning both apps
in marketing copy until that ships.

### Agent split (governing rule)

> **EOMS** handles the outside world. **ESTI** handles what the firm already knows.

No unvalidated content enters the knowledge base. Every internal answer cites approved sources.

### Knowledge Bank portal

Staff route **`/libraries/knowledge-bank-portal`** — PDFs convert to Markdown (HCW Markdown Tool
pipeline); **EOMS** rephrases and summarises; **publish** promotes sections into the validated
library **ESTI** uses. See [KNOWLEDGE-BANK-PORTAL.md](KNOWLEDGE-BANK-PORTAL.md).

---

## Legacy names (superseded)

| Legacy | Use instead | Notes |
| --- | --- | --- |
| *Architecture Office Resource Management System* | **AORMS** (platform) or **AORMS-Studio** (app) | Retire in new copy |
| **AORMS portal** / **AORMS-Architecture** | **AORMS-Studio** | Staff workspace SPA |
| **HiveD** | **AORMS-Studio** | Retired display name |
| Risk / education / auditing as platform scope | **AEC only** — Architecture + Engineering | Retired (2026-07-11) |

---

## Migration notes for authors

1. **Expand AORMS** as *Accelerated Operational Resources Management System* — platform for **AEC consulting firms only**.
2. Two apps: **AORMS-Studio** (architecture, shipping) and **AORMS-Consultancy** (engineering, code-complete; launch gated).
3. Import **`AORMS_APPS`**, **`AORMS_STUDIO`**, **`AORMS_CONSULTANCY`**, **`PLATFORM_APPS`** from `product-nomenclature.ts`.
4. Do **not** rename the repo, packages, or tables to `aorms_*` — the `esti` codename is stable.
5. Staff workspace today = **AORMS-Studio** at `studio.aorms.in`; never “AORMS portal”.
6. External **client / consultant / contractor / site** portals keep the word *portal*.

---

## Precedence

When nomenclature conflicts:

1. This file — naming and platform vs apps
2. [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § System state — what exists in **AORMS-Studio**
3. [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) — platform north-star (may ahead of code)
