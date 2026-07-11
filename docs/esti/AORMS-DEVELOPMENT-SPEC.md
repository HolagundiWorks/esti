# AORMS development specification (platform)

**Status:** North-star · Pre-release · **Version 1.0** · **Updated:** 2026-07-10

> **AORMS** = **Accelerated Operational Resources Management System** (platform).
> The **shipped codebase** in this monorepo is **AORMS-Studio**
> (slug `aorms-studio`). See [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).

---

## Relationship to this repository

| Layer | Document / code | Notes |
| --- | --- | --- |
| **Platform north-star** | This spec (sections below) | Target architecture for multi-vertical AORMS |
| **Public landing copy** | [`frontend/src/content/aorms-development-spec.md`](../../frontend/src/content/aorms-development-spec.md) | **Edit here for rendered `/` page** — keep in sync with this doc |
| **Live system state** | [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | What **AORMS-Studio** actually ships (Fastify + tRPC + Drizzle, not GraphQL) |
| **Stack reality** | [ARCHITECTURE.md](ARCHITECTURE.md) | Postgres, Redis, S3, Python worker, Ollama via `@hcw/aorms-ai-kit` |

The sections below summarise the platform specification. For the **full**
markdown (diagrams, SQL, API sketches, roadmap checklists) open the frontend
content file — it is the build-time source of truth for the landing page.

---

## Product overview

### Mission

AORMS consolidates fragmented consulting workflows into a single, AI-enhanced
platform. It replaces 5–7 disconnected tools (Slack, Asana, Google Docs,
Notion, email, etc.) with an integrated system that standardizes processes,
accelerates optimization, and enables knowledge-driven decision-making.

### Key differentiators

- **Custom framework deployment** — analyse office workflows → tailored process frameworks in days
- **Dual-tier AI architecture** — external validation layer + internal RAG firewall
- **Cross-domain applicability** — architecture-agnostic; accounting, law, strategy, engineering, management consulting
- **Unified collaboration surface** — communication, revision, review, audit logs in one system

### Target user

Consulting firms (5–500 person teams) seeking operational consolidation and
workflow optimization without a full ERP overhaul.

---

## Core architecture (summary)

```
Frontend (React)
    → Core API (REST/GraphQL target) + Real-time (WebSocket target)
        → Core services (projects, workflows, collaboration, documents, analytics, permissions)
        → AI orchestration (External AI validation → Internal RAG firewall)
            → PostgreSQL · Vector store · Redis · S3
```

**Two-tier AI (firewall model):**

1. **External AI** — ingest and validate external content against audit rules; no raw external data enters the system.
2. **Internal AI** — RAG on validated repos only; generate reports and recommendations with citation and audit trail.

Data flow: `External Source → External AI (validate) → Repo store → Internal AI (RAG) → Output`

---

## Feature modules (platform)

1. Workflow analysis & framework deployment
2. Project & task management
3. Collaborative workspace (documents, channels, real-time editing)
4. Review & approval workflows
5. Audit & compliance reporting
6. Knowledge base & resource library (semantic search)
7. Analytics & dashboards

Module detail, entity lists, and API sketches: see the [full content file](../../frontend/src/content/aorms-development-spec.md).

---

## Technical stack

### North-star (spec)

| Layer | Target |
| --- | --- |
| Backend | Node.js + TypeScript; Express/Fastify; optional GraphQL |
| Data | PostgreSQL + pgvector; Redis; S3 |
| AI | LangChain-style RAG; Claude/Ollama; embeddings in pgvector |
| Frontend | React + TypeScript; component library + design tokens |
| Ops | Docker; Kubernetes; CI/CD |

### Shipped (aorms-studio monorepo)

| Layer | Actual |
| --- | --- |
| Backend | **Fastify + tRPC** + Drizzle ORM |
| Data | **PostgreSQL**, **Redis** (jobs), **S3** (MinIO in dev) |
| AI | **@hcw/aorms-ai-kit** + Ollama |
| Frontend | **React + Vite** + **@hcw/ui-kit** (MUI) |
| Worker | **Python** Redis Streams consumer |
| Ops | **Docker Compose** (`compose.yaml`) |

When the north-star and shipped stack differ, **ARCHITECTURE.md** and
**UNIFIED-ARCHITECTURE-V4.md** win for implementation; this spec wins for
**platform direction**.

---

## Development roadmap (phases)

| Phase | Focus |
| --- | --- |
| **1 — MVP** | Multi-tenant foundation; project/task; documents; basic approval; AI foundation; audit log |
| **2** | Collaboration (messaging, co-editing); audit reports; analytics |
| **3** | Enterprise workflows, SSO, advanced RBAC, integrations |
| **4** | Vertical templates (accounting, law, …); marketplace |

Checklist detail: [full content file](../../frontend/src/content/aorms-development-spec.md) § Development Roadmap.

---

## Landing & marketing

- Rendered at `/` via `MarketingHero` + markdown body
- Redesign brief: [LANDING-REDESIGN-CONTEXT.md](../marketing/LANDING-REDESIGN-CONTEXT.md)
- Design system: [HCW-UI-KIT.md](HCW-UI-KIT.md), `/design-system`

---

## Document history

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026 | Initial platform architecture & technical specification |
| 1.0.1 | 2026-07-10 | Nomenclature rebrand; platform vs vertical split; repo reality table |
| 1.0.2 | 2026-07-10 | **AORMS-Studio** workspace naming; vertical pattern (Compliance, Advisory, Audit, Studio) |
