"""Reconciliation imports with pandas/openpyxl.

Parses bank statements, Form 26AS / AIS, and GSTR exports and matches them
against ESTI invoices/receipts; writes match rows + flags to PostgreSQL.
"""
from __future__ import annotations

from typing import Any


def reconcile_import(payload: dict[str, Any]) -> dict[str, Any]:
    source: str = payload["source"]  # "BANK" | "FORM_26AS" | "AIS" | "GSTR1"
    file_key: str = payload["fileKey"]
    # import pandas as pd
    # df = pd.read_excel(local_path) / pd.read_csv(...)
    # match by UTR / amount / date; compute matched + unmatched; persist via psycopg
    return {
        "status": "ok",
        "source": source,
        "fileKey": file_key,
        "matched": 0,
        "unmatched": 0,
        "stub": True,
    }
