"""DXF → SVG takeoff conversion using ezdxf (best-in-class). See ARCHITECTURE ADR-10.

The job reads a content-addressed DXF from object storage, converts it to SVG,
extracts model bounds + layers, writes the SVG back to object storage keyed by
the same hash, and returns metadata for the SPA's measurement overlay.
"""
from __future__ import annotations

from typing import Any


def dxf_to_svg(payload: dict[str, Any]) -> dict[str, Any]:
    file_hash: str = payload["fileHash"]
    # storage_key = f"dxf/{file_hash}.dxf"; svg_key = f"svg/{file_hash}.svg"
    #
    # import ezdxf
    # from ezdxf.addons.drawing import RenderContext, Frontend
    # from ezdxf.addons.drawing.svg import SVGBackend
    # doc = ezdxf.readfile(local_dxf_path)
    # msp = doc.modelspace()
    # ... render to SVG, read $EXTMIN/$EXTMAX for bounds, list doc.layers ...
    #
    # Sandboxed, resource-limited, size/time-bounded (untrusted input).
    return {
        "status": "ok",
        "fileHash": file_hash,
        "svgKey": f"svg/{file_hash}.svg",
        "bounds": None,  # {minX,minY,maxX,maxY} in model units
        "layers": [],
        "stub": True,
    }
