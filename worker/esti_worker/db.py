"""PostgreSQL write-back for job results (psycopg 3)."""
from __future__ import annotations

import json
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .config import settings


def _patch(table: str, row_id: str, json_cols: set[str], fields: dict[str, Any]) -> None:
    if not fields:
        return
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
    values.append(row_id)
    sql = f"update {table} set {', '.join(sets)} where id = %s"
    with psycopg.connect(settings.database_url) as conn:
        conn.execute(sql, values)
        conn.commit()


def update_drawing(drawing_id: str, **fields: Any) -> None:
    """Patch an esti_drawing row. jsonb columns (layers, bounds) are json-encoded."""
    _patch("esti_drawing", drawing_id, {"layers", "bounds"}, fields)


def update_reconcile(reconcile_id: str, **fields: Any) -> None:
    """Patch an esti_reconcile row. The 'lines' jsonb column is json-encoded."""
    _patch("esti_reconcile", reconcile_id, {"lines"}, fields)


def update_invoice(invoice_id: str, **fields: Any) -> None:
    _patch("esti_invoice", invoice_id, set(), fields)


def fetch_invoice_full(invoice_id: str) -> dict[str, Any] | None:
    """Invoice tax snapshot joined with its project + client, for rendering."""
    sql = """
        select
          i.ref, i.document_kind, i.gst_system, i.sac, i.inter_state,
          i.taxable_paise, i.cgst_paise, i.sgst_paise, i.igst_paise,
          i.gst_total_paise, i.composition_levy_paise, i.tds_paise,
          i.grand_total_paise, i.net_receivable_paise, i.date_invoice, i.notes,
          p.ref as project_ref, p.title as project_title,
          p.city as project_city, p.state as project_state,
          c.name as client_name, c.gstin as client_gstin, c.pan as client_pan,
          c.state as client_state, c.city as client_city, c.email as client_email
        from esti_invoice i
        join esti_projectoffice p on p.id = i.project_id
        left join esti_client c on c.id = i.client_id
        where i.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        cur = conn.execute(sql, [invoice_id])
        return cur.fetchone()


def update_payslip(payslip_id: str, **fields: Any) -> None:
    _patch("esti_payslip", payslip_id, set(), fields)


def fetch_payslip_full(payslip_id: str) -> dict[str, Any] | None:
    """Payslip joined with its team member, for rendering."""
    sql = """
        select
          p.month, p.gross_paise, p.deductions_paise, p.net_paise,
          p.paid, p.paid_date, p.notes,
          m.name as member_name, m.role as member_role,
          m.employment_type, m.date_joined
        from esti_payslip p
        join esti_teammember m on m.id = p.team_member_id
        where p.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [payslip_id]).fetchone()


def update_feeproposal(fee_id: str, **fields: Any) -> None:
    _patch("esti_feeproposal", fee_id, set(), fields)


def fetch_feeproposal_full(fee_id: str) -> dict[str, Any] | None:
    """Fee proposal joined with its project + client, plus the stage plan."""
    sql = """
        select
          f.ref, f.work_category, f.cost_of_works_paise, f.fee_paise,
          f.doc_comm_pct, f.coa_minimum_paise, f.below_minimum,
          f.override_reason, f.scope, f.revision_no,
          p.id as project_id, p.ref as project_ref, p.title as project_title,
          p.project_type, p.jurisdiction,
          c.name as client_name, c.city as client_city, c.state as client_state
        from esti_feeproposal f
        join esti_projectoffice p on p.id = f.project_id
        left join esti_client c on c.id = p.client_id
        where f.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute(sql, [fee_id]).fetchone()
        if row is None:
            return None
        phases = conn.execute(
            "select label, billing_pct from esti_phase "
            "where project_id = %s order by sort_order",
            [row["project_id"]],
        ).fetchall()
        row["phases"] = phases
        return row


def fetch_open_invoices() -> list[dict[str, Any]]:
    """Invoices eligible for matching — issued receivables awaiting payment."""
    with psycopg.connect(settings.database_url) as conn:
        cur = conn.execute(
            "select id, ref, grand_total_paise, net_receivable_paise "
            "from esti_invoice where status = 'ISSUED'"
        )
        return [
            {
                "id": str(r[0]),
                "ref": r[1],
                "grand_total_paise": int(r[2]),
                "net_receivable_paise": int(r[3]),
            }
            for r in cur.fetchall()
        ]
