---
title: AI core ? EmOI and ESTI
slug: ai-core
excerpt: EmOI (external AI agent) and ESTI (internal AI agent) ? outside validation, inside answers, deterministic scoring.
order: 1
section: Overview
domain: ai-core
updated: 2026-07-11
---

AORMS intelligence is split into **two agents**. **Do not conflate them in copy or configuration.**

| Agent | Name | Role |
| --- | --- | --- |
| **External** | **EmOI** ? Embedded Operational Intelligence | Validates, enriches, and gates content from **outside sources** |
| **Internal** | **ESTI** ? Embedded Studio Intelligence | Answers only from **validated firm repositories** (live in **AORMS-Studio**) |

## Governing rule

> **EmOI** handles the outside world. **ESTI** handles what the firm already knows.

Deterministic systems create business truth. LLMs explain business truth ? they must not invent scores, predict delays directly, calculate financial state, or create unsupported recommendations.

## EmOI ? external AI agent

North-star capabilities:

- **External validation gate** ? outbound model calls and inbound external content pass a quality/safety gate
- **Enrichment & storage** ? validated external material enters the firm knowledge base (see **Knowledge Bank portal** at `/libraries/knowledge-bank-portal`)
- **Workflow intelligence** ? operational signals from governed external intake

EmOI is platform-wide ? every AORMS app uses the external agent for outside intelligence.

## ESTI ? internal AI agent

Live in **AORMS-Studio** today:

| Surface | Purpose |
| --- | --- |
| **Studio Intelligence** (`/`) | Office health, zone KPIs, ranked priorities, cognition brief |
| **Ask ESTI** | Taskbar AI ? contextual Q&A from validated firm data + published repo library (BYO API key supported) |
| **ESTI Pulse** | Attention signals ? fee risk, revision pressure, load |
| **MoM extraction** | Draft revision requests from meeting minutes |

### Cognition pipeline

```text
Operational records ? deterministic scoring ? pattern recognition
  ? causal reasoning ? prediction ? intervention recommendation
  ? LLM explanation ? dashboard office state
```

Key tables: `esti_cognition_event`, `esti_cognition_behavior_profile`, `esti_cognition_priority_item`. Exposed via `dashboard.home` and related tRPC namespaces.

## Configuration

- Firm AI settings ? model provider, API keys, feature toggles (owner/admin)
- Ask ESTI ? user-level key optional for BYO inference
- Wiki content syncs to ESTI product knowledge on build (`sync-wiki-knowledge.mjs`)
- **Knowledge Bank portal** ? EmOI-processed textbooks publish into ESTI agent context (`knowledgeBankPortal` tRPC)

## Where to go next

- [Knowledge Bank portal](knowledge-bank-portal) ? textbook intake and library publish

- [How to use AORMS ? Studio Intelligence](how-to-use-aorms#studio-intelligence--your-morning-surface)
- [AORMS-Studio overview](aorms-studio)
- Engineering: `docs/esti/COGNITION-ENGINE.md`, `docs/esti/ESTI-PULSE.md`

## Frequently asked questions

### Can ESTI fetch from the open web?

No. **EmOI** handles external sources. **ESTI** answers from validated firm repositories only.

### Does the AI write invoices or change drawings?

No. ESTI recommends and explains; writes go through normal audited modules (proposals, invoices, drawing register, portal approvals).

### Is Ollama required?

The backend AI gateway supports Ollama for on-prem inference. Cloud deployments may use other providers configured in firm AI settings.
