"""PostgreSQL write-back for job results (psycopg 3)."""
from __future__ import annotations

import json
from typing import Any

import psycopg

from .config import settings


def update_drawing(drawing_id: str, **fields: Any) -> None:
    """Patch an esti_drawing row. jsonb columns (layers, bounds) are json-encoded."""
    if not fields:
        return
    json_cols = {"layers", "bounds"}
    sets: list[str] = []
    values: list[Any] = []
    for col, val in fields.items():
        if col in json_cols:
            sets.append(f"{col} = %s::jsonb")
            values.append(json.dumps(val))
        else:
            sets.append(f"{col} = %s")
            values.append(val)
    sets.append("updated_at = now()")
    values.append(drawing_id)
    sql = f"update esti_drawing set {', '.join(sets)} where id = %s"
    with psycopg.connect(settings.database_url) as conn:
        conn.execute(sql, values)
        conn.commit()
