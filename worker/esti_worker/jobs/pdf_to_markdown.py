"""PDF → Markdown for Repo portal (HCW Markdown Tool pipeline).

Uses pymupdf4llm — the same library as HolagundiWorks/hcw-markdown-tool — to
convert uploaded textbooks into markdown before EOMS ingest.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

from ..config import settings
from ..db import update_repo_source
from ..storage import get_bytes

log = logging.getLogger("esti.worker.pdf_to_markdown")

BATCH_PAGES = 25


def _convert_pdf_bytes(pdf_bytes: bytes) -> str:
    import pymupdf
    import pymupdf4llm

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        path = tmp.name

    try:
        doc = pymupdf.open(path)
        try:
            page_count = doc.page_count
            parts: list[str] = []
            for i in range(0, page_count, BATCH_PAGES):
                batch = list(range(i, min(i + BATCH_PAGES, page_count)))
                parts.append(pymupdf4llm.to_markdown(doc, pages=batch))
            return "\n".join(parts).strip()
        finally:
            doc.close()
    finally:
        os.unlink(path)


def pdf_to_markdown(payload: dict[str, Any]) -> dict[str, Any]:
    source_id = payload.get("sourceId")
    file_key = payload.get("fileKey")
    bucket = payload.get("bucket") or settings.s3_bucket

    if not source_id or not file_key:
        return {"status": "failed", "reason": "missing sourceId or fileKey"}

    try:
        pdf_bytes = get_bytes(bucket, file_key)
        markdown = _convert_pdf_bytes(pdf_bytes)
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)[:500]
        log.exception("pdf_to_markdown failed for %s", source_id)
        update_repo_source(
            source_id,
            convert_status="FAILED",
            convert_error=msg,
        )
        return {"status": "failed", "error": msg}

    if len(markdown) < 200:
        msg = "PDF yielded insufficient text for markdown ingest (try OCR via HCW Markdown Tool)."
        update_repo_source(
            source_id,
            convert_status="FAILED",
            convert_error=msg,
        )
        return {"status": "failed", "error": msg}

    update_repo_source(
        source_id,
        markdown_text=markdown,
        raw_text=markdown,
        convert_status="READY",
        convert_error=None,
    )
    log.info("pdf_to_markdown ready for %s (%d chars)", source_id, len(markdown))
    return {"status": "ready", "chars": len(markdown)}
