---
title: AI core — EmOI and ESTI
slug: ai-core
excerpt: Platform EmOI (Embedded Operational Intelligence) and architecture-workspace ESTI — dual-tier AI firewall, cognition engine, Ask ESTI, and deterministic scoring.
order: 1
section: Overview
domain: ai-core
updated: 2026-07-10
---

AORMS intelligence is split into two layers. **Do not conflate them in copy or configuration.**

| Layer | Name | Scope |
| --- | --- | --- |
| **Platform** | **EmOI** — Embedded Operational Intelligence | All AORMS verticals — dual-tier AI, RAG firewall, workflow intelligence |
| **Architecture workspace** | **ESTI** — Embedded Studio Intelligence | AORMS-Studio only — Ask ESTI, Studio Intelligence, ESTI Pulse, MoM extraction |

## Governing rule

> Deterministic systems create business truth. LLMs explain business truth.

LLMs must **not** invent scores, predict delays directly, calculate financial state, or create unsupported recommendations. The backend computes; the model explains.

## EmOI (platform)

North-star capabilities on the AORMS platform:

- **External validation gate** — outbound model calls pass a quality/safety gate
- **Internal RAG firewall** — firm knowledge stays inside the tenant boundary
- **Workflow intelligence** — operational signals across advisory engagements
- **Semantic search** — governed knowledge base retrieval

EmOI ships progressively as vertical workspaces adopt the platform spine. Marketing and `/development` document the north-star; the monorepo implements ESTI-first for AORMS-Studio.

## ESTI (AORMS-Studio)

Live workspace intelligence:

| Surface | Purpose |
| --- | --- |
| **Studio Intelligence** (`/`) | Office health, zone KPIs, ranked priorities, cognition brief |
| **Ask ESTI** | Taskbar AI — contextual Q&A (BYO API key supported) |
| **ESTI Pulse** | Attention signals — fee risk, revision pressure, load |
| **MoM extraction** | Draft revision requests from meeting minutes |

### Cognition pipeline

```text
Operational records → deterministic scoring → pattern recognition
  → causal reasoning → prediction → intervention recommendation
  → LLM explanation → dashboard office state
```

Key tables: `esti_cognition_event`, `esti_cognition_behavior_profile`, `esti_cognition_priority_item`. Exposed via `dashboard.home` and related tRPC namespaces.

## Configuration

- Firm AI settings — model provider, API keys, feature toggles (owner/admin)
- Ask ESTI — user-level key optional for BYO inference
- Wiki content syncs to ESTI product knowledge on build (`sync-wiki-knowledge.mjs`)

## Where to go next

- [How to use AORMS — Studio Intelligence](how-to-use-aorms#studio-intelligence--your-morning-surface)
- [AORMS-Studio workspace overview](aorms-studio)
- Engineering: `docs/esti/COGNITION-ENGINE.md`, `docs/esti/ESTI-PULSE.md`

## Frequently asked questions

### Can ESTI run on the platform home?

No. ESTI is architecture-workspace scoped. The platform layer is **EmOI**.

### Does the AI write invoices or change drawings?

No. ESTI recommends and explains; writes go through normal audited modules (proposals, invoices, drawing register, portal approvals).

### Is Ollama required?

The backend AI gateway supports Ollama for on-prem inference. Cloud deployments may use other providers configured in firm AI settings.
