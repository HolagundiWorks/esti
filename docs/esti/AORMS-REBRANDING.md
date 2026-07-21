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

The executable canon and the docs are updated; the token sweep is essentially complete.

| Area | State |
|---|---|
| `frontend/src/lib/product-nomenclature.ts` (executable canon) | ✅ AORMS/ESTI/EOMS correct; `EOMS` constant reframed as the knowledge bank (`external`, `hosts`, new summary) |
| `docs/esti/AORMS-PLATFORM-NOMENCLATURE.md` | ✅ EOMS row + section rewritten as the knowledge bank; links to EOMS-ARCHITECTURE |
| `docs/esti/EOMS-ARCHITECTURE.md` | ✅ Added — full EOMS design |
| EOMS expansion string (code + docs) | ✅ "Emergent Object Management System" everywhere it appears |
| `EmOI` → `EOMS` token sweep | ✅ ~30 files on `EOMS`; **4 files still reference `EmOI`** (see §5) |
| `emoi*` code identifiers | ✅ none remain |
| `docs/esti/AORMS-BRANDING-KIT.md` | ⚠️ header still calls EOMS "external AI agent" — one-line update pending (§5) |

---

## 5. Remaining cleanup (follow-ups — not code, documented here)

Small, low-risk edits to finish the rebrand. **This document is documentation only; these are
tracked, not executed here.**

1. **Last four `EmOI` mentions → `EOMS`** (mostly comments/prose):
   - `CLAUDE.md`
   - `worker/esti_worker/jobs/pdf_to_markdown.py`
   - `packages/contracts/src/consultancy.ts` (the "EmOI input gate" comments)
   - `packages/contracts/src/repo-portal.ts`
   Confirm each mention is the external-agent concept before replacing (some are historical
   references to the input-gate workflow, which is fine to keep as prose but should read
   "EOMS").
2. **AORMS-BRANDING-KIT.md** — change the header line *"EOMS — external AI agent"* to
   *"EOMS — Emergent Object Management System (the knowledge bank)"* so the heritage doc matches
   the canon.
3. **Any UI copy** still framing EOMS as an "external agent / validation gate" rather than the
   knowledge bank — audit `frontend/src` strings on the next design pass.
4. **Generated content** (e.g. `wiki-knowledge.generated.ts`) — verify it reads EOMS as the
   knowledge bank; it is hand-maintained now, so update in place when the copy is next revised.

None of these block anything; the canon and the product-facing marks are already correct.

---

## 6. Cross-references

- Product naming source of truth → **[AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)**
- Executable canon → `frontend/src/lib/product-nomenclature.ts`
- Brand look & feel → **[AORMS-BRANDING-KIT.md](AORMS-BRANDING-KIT.md)** + `@hcw/ui-kit` tokens
- EOMS system design → **[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md)**
