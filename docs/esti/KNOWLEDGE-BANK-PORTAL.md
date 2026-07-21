# Knowledge Bank portal — EOMS textbook library

**Status:** Canonical · **Updated:** 2026-07-11

The **Knowledge Bank portal** is the firm-facing surface where **EOMS** (external AI agent)
ingests **outside reference material** — textbooks, codes, and long-form guides —
rephrases it faithfully, writes summaries, and stores the result in a **governed
library**. **ESTI** (internal AI agent) reads **published** library content when
answering Ask ESTI questions.

Executable constants: `frontend/src/lib/product-nomenclature.ts` (`KNOWLEDGE_BANK_PORTAL`).

---

## Data flow

```text
External textbook (PDF / paste / .txt / .md)
  → HCW Markdown Tool pipeline (pymupdf4llm — worker job for PDFs)
  → Markdown
  → EOMS (validate · rephrase · summarise)
  → Review (firm staff)
  → Publish
  → ESTI agent context (Ask ESTI · citations)
```

**Governing rule:** EOMS handles the outside world. ESTI never sees raw external
text — only **published**, EOMS-processed sections.

Offline PDF conversion: [HCW Markdown Tool](https://github.com/HolagundiWorks/hcw-markdown-tool).

---

## Staff route

| Item | Value |
| --- | --- |
| **Menu** | Library › Knowledge Bank portal |
| **Route** | `/libraries/knowledge-bank-portal` |
| **Legacy redirect** | `/libraries/repository` |
| **tRPC** | `knowledgeBankPortal.*` |
| **Upload** | `POST /upload/repo-textbook` (PDF · txt · md) |

### Source lifecycle

| Status | Meaning |
| --- | --- |
| `DRAFT` | Markdown attached; ready for EOMS |
| `PROCESSING` | EOMS running |
| `REVIEW` | Sections generated; awaiting publish |
| `PUBLISHED` | In ESTI knowledge context |
| `FAILED` | Processing error (see `process_error`) |

PDF conversion uses `convert_status`: `PROCESSING` → `READY` | `FAILED`.

---

## Database

Migrations `0180_repo_portal.sql`, `0181_repo_markdown.sql`:

- `esti_repo_source` — textbook metadata + markdown + executive summary
- `esti_repo_section` — EOMS-generated title · summary · rephrased body

Table prefix `esti_repo_*` is an internal codename; the product name is **Knowledge Bank portal**.

---

## ESTI integration

Published sources are loaded in `backend/src/lib/ai/repo-knowledge.ts` and injected
into the Ask ESTI agent system prompt (`assembleAgentContext` in `context.ts`).

---

## Docker

Dev stack (`compose.yaml`):

```bash
docker compose up -d --build worker backend
```

- **Worker** — rebuild after `worker/requirements.txt` changes (`pymupdf`, `pymupdf4llm`).
  Job handler `pdf_to_markdown` is bind-mounted in dev (`./worker/esti_worker` → `/app/esti_worker`).
- **Backend** — migrations `0180` / `0181` apply automatically on boot (`runMigrations()`).
  Bind-mount `./backend/drizzle` is already in compose.

Production (`compose.prod.yaml`): same worker image (`worker/Dockerfile`); ensure worker
depends on Postgres, Redis, and MinIO (already configured).

---

## Related docs

- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) — EOMS vs ESTI
- Wiki: [knowledge-bank-portal](../frontend/src/content/wiki/knowledge-bank-portal.md)
