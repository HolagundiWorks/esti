---
title: Knowledge Bank portal — EmOI textbook library
slug: knowledge-bank-portal
excerpt: PDF to Markdown, then EmOI rephrases and summarises; ESTI answers from the published library.
order: 2
section: AI core
domain: ai-core
updated: 2026-07-11
---

The **Knowledge Bank portal** (`/libraries/knowledge-bank-portal`) is where firm staff bring **external
textbooks and reference material** into AORMS. PDFs convert to **Markdown** (same
[pymupdf4llm](https://github.com/HolagundiWorks/hcw-markdown-tool) pipeline as **HCW Markdown Tool**);
**EmOI** processes the markdown; **ESTI** reads only **published** library content.

## Workflow

1. **Add source** — title, author, category, and text (paste or upload PDF / `.txt` / `.md`).
2. **Markdown** — PDFs convert in the worker; pasted text is normalised to markdown.
3. **Process with EmOI** — rephrase + section summaries (faithful to source; no invented facts).
4. **Review** — read generated sections.
5. **Publish to ESTI** — library enters Ask ESTI context with citations.

## Who can use it

Staff with **write** capability (L4+). AI must be enabled on the firm plan for live EmOI inference.

## Related

- [AI core](ai-core) — EmOI vs ESTI
- [How to use AORMS — Library](how-to-use-aorms#library)
