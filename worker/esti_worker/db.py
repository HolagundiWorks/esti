"""PostgreSQL write-back for job results (psycopg 3)."""
from __future__ import annotations

import json
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .config import settings


def fetch_storage_settings() -> dict[str, Any]:
    """Read the firm's BYOS storage config (esti_orgsettings.storage_settings).
    Returns {"mode": "DEFAULT"} when unset/unreadable so the worker falls back to
    the env-configured store."""
    try:
        with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
            row = conn.execute("select storage_settings from esti_orgsettings limit 1").fetchone()
        val = (row or {}).get("storage_settings")
        if isinstance(val, dict):
            return val
        if isinstance(val, str):
            return json.loads(val)
    except Exception:
        pass
    return {"mode": "DEFAULT"}


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
    _patch("esti_proposal", fee_id, set(), fields)


def update_transmittal(tr_id: str, **fields: Any) -> None:
    _patch("esti_transmittal", tr_id, set(), fields)


def fetch_transmittal_full(tr_id: str) -> dict[str, Any] | None:
    """Transmittal + project + its item rows, for the cover-sheet PDF."""
    sql = """
        select t.ref, t.recipient, t.purpose, t.channel, t.date_issued, t.notes,
               p.ref as project_ref, p.title as project_title
        from esti_transmittal t
        join esti_projectoffice p on p.id = t.project_id
        where t.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute(sql, [tr_id]).fetchone()
        if row is None:
            return None
        row["items"] = conn.execute(
            "select drawing_ref, title, rev, copies from esti_transmittal_item "
            "where transmittal_id = %s order by created_at",
            [tr_id],
        ).fetchall()
        return row


def fetch_drawing_full(drawing_id: str) -> dict[str, Any] | None:
    """Drawing + its project, for the watermarked issue-set PDF."""
    sql = """
        select d.ref, d.title, d.svg_key, d.file_name,
               p.ref as project_ref, p.title as project_title
        from esti_drawing d
        join esti_projectoffice p on p.id = d.project_id
        where d.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [drawing_id]).fetchone()


def fetch_feeproposal_full(fee_id: str) -> dict[str, Any] | None:
    """Fee proposal joined with its project + client, plus the stage plan."""
    sql = """
        select
          f.ref, f.work_category, f.fee_basis, f.cost_of_works_paise, f.fee_paise,
          f.built_up_area_sqm, f.rate_per_sqm_paise,
          f.doc_comm_pct, f.coa_minimum_paise, f.below_minimum,
          f.override_reason, f.scope, f.revision_no,
          p.id as project_id, p.ref as project_ref, p.title as project_title,
          p.project_type, p.jurisdiction,
          c.name as client_name, c.city as client_city, c.state as client_state
        from esti_proposal f
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


def update_proposal(pid: str, **fields: Any) -> None:
    _patch("esti_proposal", pid, set(), fields)


def fetch_proposal_full(pid: str) -> dict[str, Any] | None:
    sql = """
        select pr.ref, pr.work_type, pr.scope, pr.fee_paise, pr.notes,
               p.ref as project_ref, p.title as project_title,
               p.project_type, p.jurisdiction, p.site_address,
               c.name as client_name, c.city as client_city, c.state as client_state
        from esti_proposal pr
        join esti_projectoffice p on p.id = pr.project_id
        left join esti_client c on c.id = p.client_id
        where pr.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute(sql, [pid]).fetchone()
        if row is None:
            return None
        row["phases"] = conn.execute(
            "select label, billing_pct from esti_phase where project_id = "
            "(select project_id from esti_proposal where id = %s) order by sort_order",
            [pid],
        ).fetchall()
        return row


def update_inspection(iid: str, **fields: Any) -> None:
    _patch("esti_inspection", iid, set(), fields)


def fetch_inspection_full(iid: str) -> dict[str, Any] | None:
    sql = """
        select s.ref, s.date_visit, s.weather, s.attendees, s.progress,
               s.observations, s.instructions, s.next_visit, s.inspector_name,
               p.ref as project_ref, p.title as project_title, p.site_address
        from esti_inspection s
        join esti_projectoffice p on p.id = s.project_id
        where s.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [iid]).fetchone()


def update_letter(lid: str, **fields: Any) -> None:
    _patch("esti_letter", lid, set(), fields)


def fetch_letter_full(lid: str) -> dict[str, Any] | None:
    sql = """
        select l.ref, l.recipient, l.subject, l.body, l.date_letter,
               p.ref as project_ref, p.title as project_title
        from esti_letter l
        left join esti_projectoffice p on p.id = l.project_id
        where l.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [lid]).fetchone()


def update_specsheet(sid: str, **fields: Any) -> None:
    _patch("esti_specsheet", sid, set(), fields)


def fetch_specsheet_full(sid: str) -> dict[str, Any] | None:
    sql = """
        select s.ref, s.title,
               p.ref as project_ref, p.title as project_title
        from esti_specsheet s
        join esti_projectoffice p on p.id = s.project_id
        where s.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute(sql, [sid]).fetchone()
        if row is None:
            return None
        row["items"] = conn.execute(
            "select category, item, make, specification, finish, remarks "
            "from esti_specitem where spec_sheet_id = %s order by sort_order",
            [sid],
        ).fetchall()
        return row


def update_progress_report(rid: str, **fields: Any) -> None:
    _patch("esti_progress_report", rid, set(), fields)


def fetch_progress_report_full(rid: str) -> dict[str, Any] | None:
    sql = """
        select r.period_start, r.period_end, r.narrative, r.physical_progress_pct,
               r.schedule_progress_pct, r.open_snag_count, r.open_rfi_count, r.status,
               p.ref as project_ref, p.title as project_title
        from esti_progress_report r
        join esti_projectoffice p on p.id = r.project_id
        where r.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [rid]).fetchone()


def update_feasibility_report(report_id: str, **fields: Any) -> None:
    """Patch an esti_feasibility_report row (only pdf_status / pdf_key; the
    snapshot is written by the backend and never touched here)."""
    _patch("esti_feasibility_report", report_id, set(), fields)


def fetch_feasibility_report_full(report_id: str) -> dict[str, Any] | None:
    """A project feasibility report (Project OS Slice D). Carries the frozen
    assessment `snapshot` jsonb + project header, so the PDF prints straight from
    the snapshot taken at generation time. psycopg parses jsonb into a dict."""
    sql = """
        select fr.snapshot, fr.generated_at, fr.pdf_key, fr.pdf_status,
               p.ref as project_ref, p.title as project_title
        from esti_feasibility_report fr
        join esti_projectoffice p on p.id = fr.project_id
        where fr.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [report_id]).fetchone()


def update_site_instruction(sid: str, **fields: Any) -> None:
    _patch("esti_site_instruction", sid, set(), fields)


def fetch_site_instruction_full(sid: str) -> dict[str, Any] | None:
    sql = """
        select si.ref, si.subject, si.body, si.issued_at,
               p.ref as project_ref, p.title as project_title
        from esti_site_instruction si
        join esti_projectoffice p on p.id = si.project_id
        where si.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [sid]).fetchone()


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


def fetch_estimation_set(set_id: str) -> dict | None:
    """Fetch a Final Estimation Set row; snapshot_json is parsed by psycopg."""
    sql = """
        select fs.id, fs.revision_no, fs.title, fs.status, fs.snapshot_json,
               fs.total_paise, fs.pdf_status, fs.pdf_key, fs.created_at,
               p.ref as project_ref, p.title as project_title
        from esti_cms_final_set fs
        join esti_projectoffice p on p.id = fs.project_id
        where fs.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [set_id]).fetchone()


def update_estimation_set(set_id: str, **fields) -> None:
    _patch("esti_cms_final_set", set_id, set(), fields)


def update_estimate_boq(estimate_id: str, **fields: Any) -> None:
    """Patch the BOQ-PDF columns on esti_estimate. The renderer speaks the
    generic pdf_status/pdf_key kwargs; map them to the boq_* columns."""
    remap = {"pdf_status": "boq_pdf_status", "pdf_key": "boq_pdf_key"}
    mapped = {remap.get(k, k): v for k, v in fields.items()}
    _patch("esti_estimate", estimate_id, set(), mapped)


def fetch_estimate_boq_full(estimate_id: str) -> dict[str, Any] | None:
    """An estimate's frozen priced-BOQ snapshot + header, for the PDF. The
    boq_* columns are aliased to the generic pdf_key/pdf_status the renderer
    expects; boq_snapshot (jsonb) is parsed into a dict by psycopg."""
    sql = """
        select e.title, e.boq_snapshot as snapshot,
               e.boq_pdf_key as pdf_key, e.boq_pdf_status as pdf_status,
               p.ref as project_ref, p.title as project_title
        from esti_estimate e
        join esti_projectoffice p on p.id = e.project_id
        where e.id = %s
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        return conn.execute(sql, [estimate_id]).fetchone()
