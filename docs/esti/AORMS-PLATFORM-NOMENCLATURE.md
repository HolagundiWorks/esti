# AORMS platform nomenclature

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-11

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
| **AORMS-Consultancy** | **Engineering app** — roadmap workspace (slug `aorms-consultancy`) | Structural, MEP, civil, and multidisciplinary engineering consultancies |
| **EOMS** | **External AI agent** — *External Operations Management System* | Validates, enriches, and gates content from **outside sources** before it enters the firm knowledge base |
| **ESTI** | **Internal AI agent** — *Embedded Studio Intelligence* | Answers only from **validated firm repositories** — Ask ESTI, Studio Intelligence, ESTI Pulse (live in **AORMS-Studio**) |
| **`esti` (codename)** | Repo name, `@esti/*` packages, `esti_*` DB tables | Engineering only — do not expose in marketing |

**HCW** (Human Centric Works) is the design-system and product studio behind AORMS.

---

## Two apps on one platform

AORMS targets **AEC consulting firms only**. There are exactly **two apps**:

| Discipline | App name | Slug | Status |
| --- | --- | --- | --- |
| Architecture | **AORMS-Studio** | `aorms-studio` | **Shipping** (this repo) |
| Engineering | **AORMS-Consultancy** | `aorms-consultancy` | Roadmap |

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
- Dual-tier AI / **EOMS** (external validation gate + internal RAG firewall)
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

### AORMS-Consultancy (engineering app — roadmap)

The **engineering consultancy app** — structural, MEP, civil, and multidisciplinary firms
advising on built-environment projects. Shares the same AORMS platform primitives (tenant,
permissions, workflow engine, EOMS) but ships as a separate workspace profile.

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
| **Consultancy marketing** | **AORMS-Consultancy** | `consultancy.aorms.in` · `/aorms-consultancy` | Engineering app (roadmap) |

Frozen host map: [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md).

---

## EOMS — external AI agent

**EOMS** — *External Operations Management System* — is the **external AI agent** on the
AORMS platform:

- Fetches and validates content from **outside sources**
- Enriches and gates inbound material before it enters the firm knowledge base
- Quality layer on outbound model calls — no unvalidated external content stored as truth

Every AORMS app uses **EOMS** for external intelligence intake.

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
2. Two apps: **AORMS-Studio** (architecture, shipping) and **AORMS-Consultancy** (engineering, roadmap).
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
