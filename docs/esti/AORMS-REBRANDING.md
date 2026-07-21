# AORMS rebranding — nomenclature, mapping & rollout

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-21

The single reference for the **2026-07 rebrand**: what every name means now, what each one
replaced, and how far the rollout has gone. It sits above the two living canon docs and points
to them:

- **[AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)** — the product-naming
  source of truth (with `frontend/src/lib/product-nomenclature.ts` as its executable form).
- **[AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md)** — colour, type, and brand heritage
  (live tokens ship from `@hcw/ui-kit`).
- **[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md)** — the design for EOMS as a standalone service.

> **One-line summary.** The **product** is **AORMS**. The **repo/codebase** keeps the internal
> codename **`esti`**. **ESTI** (caps) is the *internal* AI agent; **EOMS** is the *external*
> **knowledge bank** — renamed from **EmOI** and re-scoped from "an agent" to a
> continuously-learning catalog service in its own repo.

---

## 1. Canonical names (the final state)

| Name | Kind | Expansion / role | Notes |
|---|---|---|---|
| **AORMS** | **Platform** | **Accelerated Operational Resources Management System** | The product mark. AEC consulting firms only. |
| **AORMS-Studio** | App | **Architecture** app (slug `aorms-studio`) | Shipping — this repo's primary app. |
| **AORMS-Consultancy** | App | **Engineering** app (slug `aorms-consultancy`) | Roadmap workspace. |
| **ESTI** | Internal AI agent | *Embedded Studio Intelligence* | Answers **only** from the firm's **validated** repositories (Ask ESTI, Studio Intelligence, ESTI Pulse). Tenant-bound. |
| **EOMS** | External knowledge bank | *Emergent Object Management System* | The continuously-learning catalog of **standard codebooks, building compliance, and other compliance codes** — a standalone **API in its own `eoms` repo**; AORMS apps and native tools query it. |
| **`esti`** | **Codename** | Repo name, `@esti/*` packages, `esti_*` DB tables | Internal only — **never surface in marketing**. Distinct from **ESTI** the agent. |
| **HCW** | Studio | **Human Centric Works** | The product & design studio behind AORMS. |
| **AiADT** | Native tool | AI-Aided Architecture Design & Takeoff | Rust CAD/takeoff engine (separate repo); an EOMS consumer. |
| **Construction OS** | Native tool | — | Offline contractor ERP (separate repo); an EOMS consumer. |

### The governing rule for the two AI names

> **ESTI is what the firm itself knows. EOMS is the outside world's catalog.**

ESTI is a per-firm RAG agent over validated firm data; EOMS is a shared, cross-firm,
edition-versioned knowledge bank of public codes and standards. No firm-private data ever
enters EOMS; no un-versioned public standard should live inside a firm's ESTI library once
EOMS is adopted (ESTI **cites** EOMS objects instead).

### `esti` (codename) vs **ESTI** (agent) — do not conflate

- **`esti`** lowercase / backticked = the **codebase** (this monorepo, its packages, its
  tables). Engineering-facing only.
- **ESTI** caps = the **internal AI agent** product surface. Marketing-facing.

They share a name by heritage; keep the casing/context distinct in prose.

---

## 2. What changed — the rename mapping

| Old name / expansion | New | Why |
|---|---|---|
| **EmOI** — *Embedded Operational Intelligence* | **EOMS** — *Emergent Object Management System* | The external tier is not merely "an agent" — it is the **knowledge bank system** itself (a separate-repo API cataloging codes/compliance for retrieval). Renamed and re-scoped. |
| EOMS — *External Operations Management System* (interim, 2026-07-21) | EOMS — *Emergent Object Management System* | Short-lived wrong expansion during the rename; corrected the same day. |
| AORMS — *Architecture Office Resource Management System* | AORMS — *Accelerated Operational Resources Management System* | The "Architecture Office…" expansion is **superseded**; the platform mark keeps **Accelerated Operational Resources Management System**. |
| **AORMS-Architecture** | **AORMS-Studio** | Legacy app name. |
| **HiveD** | **AORMS-Studio** | Legacy codename (redirects `hived`, `aorms-architecture`). |
| EOMS — "external **AI agent**" (interim role) | EOMS — "**knowledge bank** (standalone API)" | Role clarified: EOMS *is* the catalog, not just a validation agent over it. |

**Unchanged:** the platform mark **AORMS** and its expansion; **ESTI** (name, expansion, role);
the **`esti`** codebase codename (repo, `@esti/*`, `esti_*` — a rename there is explicitly **out
of scope**); **HCW**.

---

## 3. Usage rules

- **Product-facing / marketing:** always **AORMS**, **AORMS-Studio**, **AORMS-Consultancy**,
  **ESTI**, **EOMS**. Never expose `esti`, `esti_*`, `@esti/*`, or legacy names (HiveD,
  AORMS-Architecture).
- **Casing:** **AORMS / ESTI / EOMS** are all-caps marks. **`esti`** the codename is lowercase.
  **AiADT** keeps its mixed case.
- **Expansions:** spell out on first use in a document, then use the mark. AORMS = *Accelerated
  Operational Resources Management System*; ESTI = *Embedded Studio Intelligence*; EOMS =
  *Emergent Object Management System*.
- **Agents:** describe **ESTI** as internal/firm-validated and **EOMS** as the external
  knowledge bank. Do not describe ESTI as spanning both apps in marketing until AORMS-Consultancy
  ships its own internal-agent profile.
- **EOMS is a system, not an app screen:** refer to it as the knowledge bank / API, not a chat
  surface. Its consumer-facing appearance is "codes & compliance on tap" inside an app.

---

## 4. Rollout status

The executable canon, docs, and product-facing copy are updated. §5 follow-ups are done
(2026-07-21).

| Area | State |
|---|---|
| `frontend/src/lib/product-nomenclature.ts` (executable canon) | ✅ AORMS/ESTI/EOMS correct; `EOMS` constant reframed as the knowledge bank (`external`, `hosts`, new summary) |
| `docs/esti/AORMS-PLATFORM-NOMENCLATURE.md` | ✅ EOMS row + section rewritten as the knowledge bank; links to EOMS-ARCHITECTURE |
| `docs/esti/EOMS-ARCHITECTURE.md` | ✅ Added — full EOMS design |
| EOMS expansion string (code + docs) | ✅ "Emergent Object Management System" everywhere it appears |
| `EmOI` → `EOMS` token sweep | ✅ Complete in live code/docs/marketing (historical SQL migration comments may still say EmOI) |
| `emoi*` code identifiers | ✅ none remain |
| `docs/esti/AORMS-BRANDING-KIT.md` | ✅ Header reads EOMS as the knowledge bank |
| Landing / SEO / `llms.txt` / index.html | ✅ EmOI removed; EOMS framed as knowledge bank |
| `wiki-knowledge.generated.ts` + `eoms-repo` system prompt | ✅ Knowledge-bank framing |

---

## 5. Follow-ups completed (2026-07-21)

Previously tracked as remaining cleanup; executed on branch `cursor/aorms-rebrand-followup-cc53`:

1. **Last `EmOI` mentions → `EOMS`** in `CLAUDE.md`, `worker/.../pdf_to_markdown.py`,
   `packages/contracts/src/consultancy.ts`, `packages/contracts/src/repo-portal.ts`, plus
   marketing leftovers (`index.html`, `llms.txt`, investor deck, blog feed).
2. **AORMS-BRANDING-KIT.md** — header now *"EOMS — Emergent Object Management System (the knowledge bank)"*.
3. **UI / SEO copy** — Landing dual-tier section + FAQ, `landing-seo.ts` featureList, and related
   docs no longer call EOMS an "external agent".
4. **`wiki-knowledge.generated.ts`** — EOMS sections rewritten as the knowledge bank; ESTI remains
   the internal agent.

**Out of scope / intentional leftovers:** Drizzle migration SQL comments (`0180`, `0191`) keep
historical EmOI wording — do not rewrite applied migrations.

---

## 6. Cross-references

- Product naming source of truth → **[AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)**
- Executable canon → `frontend/src/lib/product-nomenclature.ts`
- Brand look & feel → **[AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md)** + `@hcw/ui-kit` tokens
- EOMS system design → **[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md)**
