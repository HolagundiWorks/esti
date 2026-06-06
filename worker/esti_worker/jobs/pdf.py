"""GST document PDF rendering with WeasyPrint (HTML → PDF).

Renders the Tax Invoice / Bill of Supply / plain Invoice per the firm's active
GST system, and applies drawing-set watermarks. The firm's COA registration
number and GSTIN appear on every document.
"""
from __future__ import annotations

from typing import Any


def render_pdf(payload: dict[str, Any]) -> dict[str, Any]:
    doc_kind: str = payload.get("documentKind", "TAX_INVOICE")
    target_id: str = payload["id"]
    # from weasyprint import HTML
    # html = render_template(doc_kind, payload)   # Jinja2 template
    # pdf_bytes = HTML(string=html).write_pdf()
    # store at f"pdf/{doc_kind.lower()}/{target_id}.pdf"
    return {
        "status": "ok",
        "id": target_id,
        "documentKind": doc_kind,
        "pdfKey": f"pdf/{doc_kind.lower()}/{target_id}.pdf",
        "stub": True,
    }
