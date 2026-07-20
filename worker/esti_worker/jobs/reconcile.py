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
    """Parse a statement amount to paise, preserving sign.

    Debits must come out negative so the credit filter drops them. Indian bank
    exports mark a debit in several ways — accounting parentheses `(1,234.50)`,
    a trailing minus `1,234.50-`, or a `Dr` suffix — and stripping to digits
    turned every one of them into a positive number that was then reconciled as
    an incoming payment.
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    raw = str(value).strip()
    low = raw.lower()
    negative = (
        (raw.startswith("(") and raw.endswith(")"))
        or raw.endswith("-")
        or low.endswith(" dr")
        or low.endswith("dr")
    )
    s = re.sub(r"[^0-9.]", "", raw)  # magnitude only; sign handled above
    if s in ("", "."):
        return None
    try:
        paise = round(float(s) * 100)
    except ValueError:
        return None
    return -paise if negative else paise


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s)


def match_line(
    amount_paise: int,
    description: str,
    invoices: list[dict[str, Any]],
    by_ref_digits: dict[str, dict[str, Any]],
) -> tuple[str, dict[str, Any] | None, list[dict[str, Any]]]:
    """Match one credit line to an invoice.

    Returns (match_type, hit, amount_candidates).

    A reference match identifies a specific invoice, so it wins outright. An
    amount match only identifies an invoice when exactly one open invoice has
    that total: two projects billed the same standard fee produce identical
    receivables, and binding the receipt to whichever the database returned
    first settled an arbitrary one. When several match, the type is
    `amount_ambiguous` with no invoice bound, so a human resolves it rather than
    the wrong project silently showing collected.
    """
    ref_hit = None
    desc_digits = _digits(description)
    for ref_digits, inv in by_ref_digits.items():
        if len(ref_digits) >= 6 and ref_digits in desc_digits:
            ref_hit = inv
            break

    amt_matches = [
        inv
        for inv in invoices
        if amount_paise in (inv["grand_total_paise"], inv["net_receivable_paise"])
    ]

    if ref_hit:
        exact = any(inv["id"] == ref_hit["id"] for inv in amt_matches)
        return ("ref_amount" if exact else "ref"), ref_hit, amt_matches
    if len(amt_matches) == 1:
        return "amount", amt_matches[0], amt_matches
    if len(amt_matches) > 1:
        return "amount_ambiguous", None, amt_matches
    return "none", None, []


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

            match_type, hit, candidates = match_line(
                amount_paise, description, invoices, by_ref_digits
            )

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
                    # For an ambiguous amount, list the invoices it could be so a
                    # human can pick — otherwise the line is a dead end.
                    "candidateInvoiceRefs": (
                        [inv["ref"] for inv in candidates]
                        if match_type == "amount_ambiguous"
                        else None
                    ),
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
