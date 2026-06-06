"""DXF → takeoff (+ best-effort SVG) using ezdxf. See ARCHITECTURE ADR-10.

Reads the content-addressed DXF from object storage, extracts per-layer entity
counts and model-space bounds, renders an SVG when possible, writes both back
to object storage + PostgreSQL, and returns a summary for the log.
"""
from __future__ import annotations

import logging
import tempfile
from collections import Counter
from typing import Any

import ezdxf
from ezdxf import bbox

from ..db import update_drawing
from ..storage import get_bytes, put_bytes

log = logging.getLogger("esti.worker.dxf")


def _bounds(msp) -> dict[str, float] | None:
    """Compute real model-space extents from entity geometry (header $EXTMIN/
    $EXTMAX is unreliable — unset CAD files carry ±1e20 sentinels)."""
    try:
        box = bbox.extents(msp, fast=True)
        if not box.has_data:
            return None
        return {
            "minX": float(box.extmin.x),
            "minY": float(box.extmin.y),
            "maxX": float(box.extmax.x),
            "maxY": float(box.extmax.y),
        }
    except Exception:  # noqa: BLE001
        return None


def _render_svg(doc, msp) -> str | None:
    try:
        from ezdxf.addons.drawing import Frontend, RenderContext, layout, svg

        backend = svg.SVGBackend()
        Frontend(RenderContext(doc), backend).draw_layout(msp, finalize=True)
        page = layout.Page(0, 0, layout.Units.mm)
        return backend.get_string(page)
    except Exception:  # noqa: BLE001
        log.exception("svg render failed; continuing with takeoff only")
        return None


def dxf_to_svg(payload: dict[str, Any]) -> dict[str, Any]:
    drawing_id: str = payload["drawingId"]
    bucket: str = payload["bucket"]
    storage_key: str = payload["storageKey"]
    file_hash: str = payload["fileHash"]

    update_drawing(drawing_id, status="PROCESSING")

    try:
        raw = get_bytes(bucket, storage_key)
        with tempfile.NamedTemporaryFile(suffix=".dxf") as tmp:
            tmp.write(raw)
            tmp.flush()
            doc = ezdxf.readfile(tmp.name)

        msp = doc.modelspace()
        counts: Counter[str] = Counter()
        total = 0
        for e in msp:
            counts[e.dxf.layer] += 1
            total += 1

        layer_colors = {ly.dxf.name: int(getattr(ly.dxf, "color", 7)) for ly in doc.layers}
        layers = [
            {"name": name, "entityCount": n, "color": layer_colors.get(name, 7)}
            for name, n in sorted(counts.items(), key=lambda kv: -kv[1])
        ]
        bounds = _bounds(msp)

        svg_str = _render_svg(doc, msp)
        svg_key = None
        if svg_str:
            svg_key = f"svg/{file_hash}.svg"
            put_bytes(bucket, svg_key, svg_str.encode("utf-8"), "image/svg+xml")

        update_drawing(
            drawing_id,
            status="READY",
            entity_count=total,
            layers=layers,
            bounds=bounds,
            svg_key=svg_key,
            error_text=None,
        )
        return {"status": "ok", "drawingId": drawing_id, "entities": total, "layers": len(layers)}

    except Exception as exc:  # noqa: BLE001
        log.exception("dxf takeoff failed for %s", drawing_id)
        update_drawing(drawing_id, status="FAILED", error_text=str(exc)[:500])
        return {"status": "error", "drawingId": drawing_id, "error": str(exc)}
