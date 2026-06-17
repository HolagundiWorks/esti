"""Bank-statement reconciliation with pandas. See ARCHITECTURE ADR-10.

Reads a CSV/XLSX statement from object storage, parses credit lines, matches
each against open invoices by reference and/or amount, and writes the matched/
unmatched results + totals back to esti_reconcile in PostgreSQL.
"""
from __future__ import annotations

import io
import logging
import re
from typing import Any

import pandas as pd

from ..db import fetch_open_invoices, update_reconcile
from ..storage import get_bytes

log = logging.getLogger("esti.worker.reconcile")

_DATE_ALIASES = ("date", "txn date", "value date", "transaction date")
_DESC_ALIASES = ("description", "narration", "particulars", "details", "remarks")
_AMOUNT_ALIASES = ("amount", "credit", "deposit", "cr", "credit amount")


def _resolve_column(columns: list[str], aliases: tuple[str, ...], override: str | None) -> str | None:
    if override:
        for col in columns:
            if col.strip().lower() == override.strip().lower():
                return col
        if override in columns:
            return override
    return _pick(columns, aliases)


def _pick(columns: list[str], aliases: tuple[str, ...]) -> str | None:
    norm = {c: c.strip().lower() for c in columns}
    for col, low in norm.items():
        if low in aliases:
            return col
    for col, low in norm.items():
        if any(a in low for a in aliases):
            return col
    return None


def _to_paise(value: Any) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = re.sub(r"[^0-9.\-]", "", str(value))
    if s in ("", "-", "."):
        return None
    try:
        return round(float(s) * 100)
    except ValueError:
        return None


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s)


def reconcile_import(payload: dict[str, Any]) -> dict[str, Any]:
    reconcile_id: str = payload["reconcileId"]
    bucket: str = payload["bucket"]
    storage_key: str = payload["storageKey"]
    file_name: str = payload.get("fileName", storage_key)

    update_reconcile(reconcile_id, status="PROCESSING")

    try:
        raw = get_bytes(bucket, storage_key)
        if file_name.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(raw))
        else:
            df = pd.read_csv(io.BytesIO(raw))

        cols = list(df.columns.astype(str))
        mapping = payload.get("columnMapping") or {}
        date_col = _resolve_column(cols, _DATE_ALIASES, mapping.get("date"))
        desc_col = _resolve_column(cols, _DESC_ALIASES, mapping.get("description"))
        amount_col = _resolve_column(cols, _AMOUNT_ALIASES, mapping.get("amount"))
        if amount_col is None:
            raise ValueError(f"no amount/credit column found in {cols}")

        invoices = fetch_open_invoices()
        # ref (digits) -> invoice, for description matching
        by_ref_digits = {_digits(inv["ref"]): inv for inv in invoices}

        lines: list[dict[str, Any]] = []
        total_credit = 0
        matched_credit = 0
        matched = 0

        for i, rec in df.iterrows():
            amount_paise = _to_paise(rec[amount_col])
            if amount_paise is None or amount_paise <= 0:
                continue  # debits / blanks are not receipts
            description = "" if desc_col is None else str(rec[desc_col])
            date_val = None if date_col is None else str(rec[date_col])
            total_credit += amount_paise

            # 1) reference match: an invoice ref's digits appear in the narration
            ref_hit = None
            desc_digits = _digits(description)
            for ref_digits, inv in by_ref_digits.items():
                if len(ref_digits) >= 6 and ref_digits in desc_digits:
                    ref_hit = inv
                    break
            # 2) amount match: equals grand total or net receivable
            amt_hit = next(
                (
                    inv
                    for inv in invoices
                    if amount_paise
                    in (inv["grand_total_paise"], inv["net_receivable_paise"])
                ),
                None,
            )

            if ref_hit and amt_hit and ref_hit["id"] == amt_hit["id"]:
                match_type, hit = "ref_amount", ref_hit
            elif ref_hit:
                match_type, hit = "ref", ref_hit
            elif amt_hit:
                match_type, hit = "amount", amt_hit
            else:
                match_type, hit = "none", None

            if hit:
                matched += 1
                matched_credit += amount_paise

            lines.append(
                {
                    "row": int(i),
                    "date": date_val,
                    "description": description[:200],
                    "amountPaise": amount_paise,
                    "matchType": match_type,
                    "matchedInvoiceId": hit["id"] if hit else None,
                    "matchedInvoiceRef": hit["ref"] if hit else None,
                }
            )

        update_reconcile(
            reconcile_id,
            status="READY",
            row_count=len(lines),
            matched_count=matched,
            unmatched_count=len(lines) - matched,
            total_credit_paise=total_credit,
            matched_credit_paise=matched_credit,
            lines=lines,
            error_text=None,
        )
        return {
            "status": "ok",
            "reconcileId": reconcile_id,
            "rows": len(lines),
            "matched": matched,
        }

    except Exception as exc:  # noqa: BLE001
        log.exception("reconcile failed for %s", reconcile_id)
        update_reconcile(reconcile_id, status="FAILED", error_text=str(exc)[:500])
        return {"status": "error", "reconcileId": reconcile_id, "error": str(exc)}
