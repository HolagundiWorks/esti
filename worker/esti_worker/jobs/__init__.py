"""Job handlers, dispatched by `type` from the Redis Streams job bus."""
from __future__ import annotations

from collections.abc import Callable

from .dxf import dxf_to_svg
from .pdf import render_pdf
from .pdf_to_markdown import pdf_to_markdown
from .reconcile import reconcile_import

HANDLERS: dict[str, Callable[[dict], dict]] = {
    "dxf_to_svg": dxf_to_svg,
    "render_pdf": render_pdf,
    "pdf_to_markdown": pdf_to_markdown,
    "reconcile_import": reconcile_import,
}

__all__ = ["HANDLERS"]
