# AORMS platform nomenclature

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-10

This document is the **single source of truth for product naming** after the 2026
platform rebrand. Where an older doc still says *Architecture Office Resource
Management System*, **AORMS-Architecture**, or **HiveD**, treat those as **superseded**
unless the doc is explicitly marked historical.

Executable constants: `frontend/src/lib/product-nomenclature.ts`.

---

## Names at a glance

| Name | Expansion / role | Audience |
| --- | --- | --- |
| **AORMS** | **Accelerated Operational Resources Management System** — the **platform** | **Consulting offices** that advise in risk, education, auditing, and AEC — not solution delivery or client PM |
| **AORMS-Studio** | First **vertical workspace** on the platform — Indian architecture & interior practices (slug `aorms-studio`) | Architects, studios, site-supervision consultancies |
| **AORMS-Compliance** | Risk-management vertical workspace (roadmap) | Enterprise risk & governance advisory consultancies |
| **AORMS-Advisory** | Education vertical workspace (roadmap) | Institutional accreditation & curriculum advisory consultancies |
| **AORMS-Audit** | Auditing vertical workspace (roadmap) | Assurance & compliance advisory consultancies |
| **EmOI** | **Embedded Operational Intelligence** — AI/agent layer on the **AORMS platform** | Platform-wide: dual-tier AI, RAG, workflow intelligence |
| **ESTI** | **Embedded Studio Intelligence** — AI/agent layer in **AORMS-Studio only** | AORMS-Studio users (Ask ESTI, Studio Intelligence, ESTI Pulse) |
| **`esti` (codename)** | Repo name, `@esti/*` packages, `esti_*` DB tables | Engineering only — do not expose in marketing |

**HCW** (Human Centric Works) is the design-system and product studio behind AORMS.

---

## Vertical workspace naming pattern

Each advisory domain ships as **`AORMS-{Name}`**:

| Industry domain | Workspace name | Slug | Status |
| --- | --- | --- | --- |
| Risk management | **AORMS-Compliance** | `aorms-compliance` | Roadmap |
| Education | **AORMS-Advisory** | `aorms-advisory` | Roadmap |
| Auditing | **AORMS-Audit** | `aorms-audit` | Roadmap |
| AEC (architecture) | **AORMS-Studio** | `aorms-studio` | **Shipping** (this repo) |

Legacy slugs for **AORMS-Studio** redirect to canonical URLs: `hived`, `aorms-architecture`.

---

## Platform vs vertical

### AORMS (platform)

Mission: give **consulting offices that advise clients** (risk management,
education, auditing, AEC) an **operational framework** and a **design framework**
on one spine — how the practice runs and how engagements are structured.

**AORMS is not** a solution-delivery platform or a client project-management
tool. It consolidates scattered office tools (messaging, advisory workflows,
documentation, email, sheets, file sharing) into one AI-enhanced system.

North-star capabilities (pre-release specification):

- **Operational framework** — intake, process standards, rollout, adoption
- **Design framework** — engagement methodologies, deliverable models, templates
- Collaborative workspace (documents, channels, reviews)
- Dual-tier AI / **EmOI** (external validation gate + internal RAG firewall)
- Audit & compliance reporting
- Knowledge base with semantic search
- Analytics & operational dashboards

**Canonical pre-release architecture:** [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md)
(rendered on the public landing at `/`).

### AORMS-Studio (vertical workspace — this repo)

The **shipped monorepo in this repository** is the **AEC / architecture vertical** —
what users previously called “AORMS portal”, **AORMS-Architecture**, **HiveD**, or the
architecture workspace. It remains the primary implementation surface while the
platform vision broadens.

| Aspect | AORMS-Studio (this repo) |
| --- | --- |
| **Product name** | **AORMS-Studio** (slug / URL: `aorms-studio`) |
| **Scope** | Indian architecture office: projects, fees, GST invoicing, drawings, site supervision, HR, client & consultant portals |
| **System state** | [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § System state |
| **Navigation** | [NAVIGATION.md](NAVIGATION.md) — Canonical V3 IA |
| **Typical URL** | `app.aorms.in` (AORMS-Studio workspace SPA) |
| **Public wiki** | [aorms.in/wiki](https://aorms.in/wiki) — central wiki: HCW-UI, AORMS-Studio, AI core, Management |

Future verticals share the **same platform primitives** (tenant, permissions, workflow engine, AI firewall model)
but ship as separate workspace profiles — not as forks of the architecture UI.

---

## EmOI (platform)

**EmOI** — *Embedded Operational Intelligence* — is the intelligence layer on the
**AORMS platform**:

- Dual-tier AI (external validation gate + internal RAG firewall)
- Workflow and operational intelligence across vertical workspaces
- Governed answers from validated repositories — platform north-star in
  [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) § AI/RAG

The **shipped** stack today in **AORMS-Studio** still routes much AI through
`@hcw/aorms-ai-kit` and Ollama; EmOI is the platform product name as verticals
broaden beyond the architecture workspace.

---

## ESTI (AORMS-Studio only)

**ESTI** — *Embedded Studio Intelligence* — is **not** the platform-wide layer.
It is the intelligence layer **embedded in AORMS-Studio only**:

- Ask ESTI / ESTI AI / AI Studio
- Cognition engine & Studio Intelligence home
- ESTI Pulse
- `@hcw/aorms-ai-kit` (prompts + Ollama SDK in backend — shared engineering kit)

Risk, Education, Auditing, and future verticals use **EmOI**, not ESTI, in product copy.
Do not describe ESTI as spanning every AORMS workspace in platform marketing.

---

## Legacy note (superseded)

Earlier docs described ESTI as inside “every workspace.” That is **superseded**
by the EmOI / ESTI split above (2026-07-10).

---

## Documentation map

| Question | Read |
| --- | --- |
| What is the **platform** vision? | [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) |
| What is **live in code** today? | [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § System state |
| Landing page redesign brief | [../marketing/LANDING-REDESIGN-CONTEXT.md](../marketing/LANDING-REDESIGN-CONTEXT.md) |
| Brand / UI tokens | [AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md), [HCW-UI-KIT.md](HCW-UI-KIT.md) |
| Agent entry | [CLAUDE.md](../../CLAUDE.md) |

---

## Legacy names (superseded)

| Legacy | Use instead | Notes |
| --- | --- | --- |
| *Architecture Office Resource Management System* | **AORMS** (platform) or **AORMS-Studio** (workspace) | Retire in new copy |
| **AORMS portal** / **AORMS-Architecture** (staff workspace) | **AORMS-Studio** | The advisory workspace SPA at `app.aorms.in` — not client/consultant portals |
| **HiveD** | **AORMS-Studio** | Retired display name (2026-07-10) |
| **`hived`** / **`aorms-architecture`** (slug) | **`aorms-studio`** | Legacy slugs redirect; do not use as display name |

---

## Migration notes for authors

1. **Expand AORMS** as *Accelerated Operational Resources Management System* in
   new copy; retire *Architecture Office Resource Management System*, **AORMS-Architecture**, and **HiveD** except in
   historical blog posts (add a one-line supersession note when editing).
2. When describing **shipping code**, say **AORMS-Studio** (slug `aorms-studio`) so platform docs stay honest.
3. Use **`AORMS-{Name}`** for vertical workspaces: Compliance, Advisory, Audit, Studio.
4. Do **not** rename the repo, packages, or tables to `aorms_*` — the `esti`
   codename is intentional and stable.
5. Do **not** call the staff workspace the “AORMS portal” — that term is retired;
   **client**, **consultant**, and **contractor** portals keep the word *portal*.
6. The **landing page** is platform marketing; the architecture-practice story
   lives on `/login`, wiki, and blog — see marketing brief.

---

## Precedence

When nomenclature conflicts:

1. This file — naming and platform vs vertical
2. [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § System state — what exists in **AORMS-Studio**
3. [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) — platform north-star (may ahead of code)
