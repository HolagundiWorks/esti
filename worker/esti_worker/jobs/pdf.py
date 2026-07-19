"""GST document PDF rendering with WeasyPrint (HTML → PDF). See ADR-10.

Renders the Tax Invoice / Bill of Supply for an invoice using the firm profile
supplied in the job payload (single-firm, fixed config), stores the PDF in
object storage and records the key on the invoice row.
"""
from __future__ import annotations

import base64
import html
import logging
import re
from typing import Any

from ..config import settings
from ..db import (
    fetch_drawing_full,
    fetch_engagement_full,
    fetch_feeproposal_full,
    fetch_inspection_full,
    fetch_invoice_full,
    fetch_letter_full,
    fetch_measurement_book_full,
    fetch_payslip_full,
    fetch_proposal_full,
    fetch_specsheet_full,
    fetch_transmittal_full,
    fetch_progress_report_full,
    fetch_feasibility_report_full,
    fetch_site_instruction_full,
    update_drawing,
    update_engagement,
    update_feeproposal,
    update_inspection,
    update_invoice,
    update_letter,
    update_measurement_book,
    update_payslip,
    update_progress_report,
    update_proposal,
    update_feasibility_report,
    update_site_instruction,
    update_specsheet,
    update_transmittal,
)
from ..storage import get_bytes, put_bytes

log = logging.getLogger("esti.worker.pdf")

_DOC_TITLE = {
    "TAX_INVOICE": "Tax Invoice",
    "BILL_OF_SUPPLY": "Bill of Supply",
    "INVOICE": "Invoice",
}


def _inr(paise: int | None) -> str:
    """Indian-grouped rupees, e.g. 12345678 paise -> ₹1,23,456.78."""
    p = int(paise or 0)
    rupees, paise_part = divmod(abs(p), 100)
    s = str(rupees)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = ",".join([head[max(i - 2, 0) : i] for i in range(len(head), 0, -2)][::-1])
        s = f"{head},{tail}"
    sign = "-" if p < 0 else ""
    return f"{sign}₹{s}.{paise_part:02d}"


def _e(value: Any) -> str:
    return html.escape("" if value is None else str(value))


def _logo_img(firm: dict[str, Any]) -> str:
    """Embed the firm logo as a base64 data-URI (read from object storage)."""
    key = firm.get("logoKey")
    if not key:
        return ""
    try:
        data = get_bytes(settings.s3_bucket, key)
    except Exception:  # noqa: BLE001
        return ""
    ext = str(key).rsplit(".", 1)[-1].lower()
    mime = (
        "image/svg+xml"
        if ext == "svg"
        else "image/jpeg"
        if ext in ("jpg", "jpeg")
        else f"image/{ext}"
    )
    b64 = base64.b64encode(data).decode("ascii")
    return (
        f'<img src="data:{mime};base64,{b64}" '
        'style="max-height:56px;max-width:220px;margin-bottom:6px" />'
    )


def _firm_heading(firm: dict[str, Any], tag: str = "div") -> str:
    """Print the logo if one is set, otherwise the company name."""
    logo = _logo_img(firm)
    if logo:
        return logo
    return f'<{tag} class="firm">{_e(firm.get("legalName"))}</{tag}>'


def _tax_rows(inv: dict[str, Any]) -> str:
    rows = ""
    if inv["cgst_paise"]:
        rows += f"<tr><td>CGST @ 9%</td><td class='r'>{_inr(inv['cgst_paise'])}</td></tr>"
        rows += f"<tr><td>SGST @ 9%</td><td class='r'>{_inr(inv['sgst_paise'])}</td></tr>"
    if inv["igst_paise"]:
        rows += f"<tr><td>IGST @ 18%</td><td class='r'>{_inr(inv['igst_paise'])}</td></tr>"
    return rows


def _render_html(inv: dict[str, Any], firm: dict[str, Any]) -> str:
    title = _DOC_TITLE.get(inv["document_kind"], "Invoice")
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    comp_note = ""
    if inv["composition_levy_paise"]:
        comp_note = (
            "<p class='note'>Composition taxable person — not eligible to collect tax "
            "on supplies. Composition levy borne by the firm.</p>"
        )
    client_tax = ""
    if inv.get("client_gstin"):
        client_tax = f"<div>GSTIN: {_e(inv['client_gstin'])}</div>"
    elif inv.get("client_pan"):
        client_tax = f"<div>PAN: {_e(inv['client_pan'])}</div>"

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 18mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 11px; }}
      .firm {{ font-size: 18px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .title {{ font-size: 15px; font-weight: 700; text-transform: uppercase;
                border-top: 2px solid #161616; border-bottom: 2px solid #161616;
                padding: 6px 0; margin: 18px 0; letter-spacing: 1px; }}
      .grid {{ display: flex; justify-content: space-between; margin-bottom: 14px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
      th, td {{ padding: 6px 8px; border-bottom: 1px solid #e0e0e0; text-align: left; }}
      th {{ background: #f4f4f4; }}
      td.r, th.r {{ text-align: right; }}
      .totals td {{ border: none; padding: 3px 8px; }}
      .grand {{ font-weight: 700; border-top: 2px solid #161616 !important; }}
      .note {{ color: #6f6f6f; font-style: italic; margin-top: 6px; }}
      footer {{ position: fixed; bottom: 0; left: 0; right: 0; color: #6f6f6f;
                font-size: 9px; border-top: 1px solid #e0e0e0; padding-top: 6px; }}
    </style></head><body>
      <div class="grid">
        <div>
          {_firm_heading(firm)}
          <div class="muted">{addr}</div>
          <div class="muted">{_e(firm.get('email'))} · {_e(firm.get('phone'))}</div>
        </div>
        <div class="muted" style="text-align:right">
          <div>GSTIN: {_e(firm.get('gstin'))}</div>
          <div>PAN: {_e(firm.get('pan'))}</div>
          <div>COA Reg: {_e(firm.get('coaRegNo'))}</div>
        </div>
      </div>

      <div class="title">{_e(title)}</div>

      <div class="grid">
        <div>
          <div class="muted">Bill to</div>
          <div style="font-weight:600">{_e(inv.get('client_name') or '—')}</div>
          <div class="muted">{_e(inv.get('client_city'))} {_e(inv.get('client_state'))}</div>
          {client_tax}
        </div>
        <div style="text-align:right">
          <div><b>Invoice #</b> {_e(inv['ref'])}</div>
          <div><b>Date</b> {_e(inv.get('date_invoice') or '—')}</div>
          <div><b>Project</b> {_e(inv.get('project_ref'))}</div>
        </div>
      </div>

      <table>
        <thead><tr><th>Description</th><th>SAC</th><th class="r">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>Professional architectural services — {_e(inv.get('project_title'))}</td>
            <td>{_e(inv.get('sac') or '—')}</td>
            <td class="r">{_inr(inv['taxable_paise'])}</td>
          </tr>
        </tbody>
      </table>

      <table class="totals" style="width:55%; margin-left:45%">
        <tr><td>Taxable value</td><td class="r">{_inr(inv['taxable_paise'])}</td></tr>
        {_tax_rows(inv)}
        <tr class="grand"><td>Total</td><td class="r">{_inr(inv['grand_total_paise'])}</td></tr>
        <tr><td>Less: TDS u/s 194J</td><td class="r">{_inr(inv['tds_paise'])}</td></tr>
        <tr class="grand"><td>Net receivable</td><td class="r">{_inr(inv['net_receivable_paise'])}</td></tr>
      </table>
      {comp_note}
      {f'<p class="note">{_e(inv.get("notes"))}</p>' if inv.get("notes") else ''}

      <footer>{_e(firm.get('legalName'))} · COA Reg {_e(firm.get('coaRegNo'))} ·
        GSTIN {_e(firm.get('gstin'))} — computer-generated document</footer>
    </body></html>"""


def _payslip_html(p: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 18mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 11px; }}
      .firm {{ font-size: 18px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .title {{ font-size: 15px; font-weight: 700; text-transform: uppercase;
                border-top: 2px solid #161616; border-bottom: 2px solid #161616;
                padding: 6px 0; margin: 18px 0; letter-spacing: 1px; }}
      table {{ width: 60%; border-collapse: collapse; margin-top: 10px; }}
      td {{ padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }}
      td.r {{ text-align: right; }}
      .net {{ font-weight: 700; border-top: 2px solid #161616; }}
    </style></head><body>
      <div class="grid">
        {_firm_heading(firm)}
        <div class="muted">{addr}</div>
        <div class="muted">COA Reg {_e(firm.get('coaRegNo'))}</div>
      </div>
      <div class="title">Salary Slip — {_e(p['month'])}</div>
      <div><b>{_e(p['member_name'])}</b> · {_e(p['member_role'])} · {_e(p['employment_type'])}</div>
      <div class="muted">Date joined: {_e(p.get('date_joined') or '—')}</div>
      <table>
        <tr><td>Gross salary</td><td class="r">{_inr(p['gross_paise'])}</td></tr>
        <tr><td>Deductions</td><td class="r">- {_inr(p['deductions_paise'])}</td></tr>
        <tr class="net"><td>Net pay</td><td class="r">{_inr(p['net_paise'])}</td></tr>
        <tr><td>Status</td><td class="r">{'Paid ' + _e(p.get('paid_date') or '') if p['paid'] else 'Unpaid'}</td></tr>
      </table>
      {f'<p class="muted">{_e(p.get("notes"))}</p>' if p.get("notes") else ''}
      <p class="muted" style="margin-top:24px">Computer-generated salary slip — {_e(firm.get('legalName'))}.</p>
    </body></html>"""


def _feeproposal_html(f: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    fee = int(f["fee_paise"] or 0)
    coa_min = int(f["coa_minimum_paise"] or 0)
    pct_of_coa = f"{(fee / coa_min * 100):.0f}%" if coa_min else "—"
    basis = f.get("fee_basis") or "COA_PERCENT"
    basis_label = {
        "COA_PERCENT": "COA scale (% of cost of works)",
        "PER_SQM": "Per sq.m of built-up area",
        "LUMPSUM": "Lumpsum",
    }.get(basis, basis)
    persqm_row = ""
    if basis == "PER_SQM":
        area = f.get("built_up_area_sqm") or 0
        rate = int(f.get("rate_per_sqm_paise") or 0)
        persqm_row = (
            '<tr><td class="muted">Built-up area × rate</td>'
            f'<td class="r">{area:g} sq.m × {_inr(rate)}/sq.m</td></tr>'
        )
    below = (
        '<p class="warn">Quoted fee is below the COA minimum scale of charges.'
        f' Override: {_e(f.get("override_reason") or "—")}</p>'
        if f["below_minimum"]
        else ""
    )
    stage_rows = "".join(
        f"<tr><td>{_e(ph['label'])}</td><td class='r'>{ph['billing_pct']}%</td>"
        f"<td class='r'>{_inr(round(fee * ph['billing_pct'] / 100))}</td></tr>"
        for ph in f.get("phases", [])
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 18mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 11px; }}
      .firm {{ font-size: 18px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .title {{ font-size: 15px; font-weight: 700; text-transform: uppercase;
                border-top: 2px solid #161616; border-bottom: 2px solid #161616;
                padding: 6px 0; margin: 16px 0; letter-spacing: 1px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
      th, td {{ padding: 5px 8px; border-bottom: 1px solid #e0e0e0; text-align: left; }}
      th {{ background: #f4f4f4; }} td.r, th.r {{ text-align: right; }}
      .kv td {{ border: none; padding: 2px 8px; }}
      .warn {{ color: #8a3800; background: #fff8e1; padding: 8px; margin-top: 10px; }}
      h4 {{ margin: 18px 0 4px; }}
    </style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>

      <div class="title">Fee Proposal — {_e(f['ref'])}</div>
      <table class="kv">
        <tr><td class="muted">Client</td><td>{_e(f.get('client_name') or '—')}</td></tr>
        <tr><td class="muted">Project</td><td>{_e(f['project_title'])} ({_e(f['project_ref'])})</td></tr>
        <tr><td class="muted">Type / jurisdiction</td><td>{_e(f['project_type'])} · {_e(f['jurisdiction'])}</td></tr>
        <tr><td class="muted">Work category</td><td>{_e(f['work_category'])}</td></tr>
      </table>

      <h4>Fee</h4>
      <table class="kv">
        <tr><td class="muted">Fee basis</td><td class="r">{_e(basis_label)}</td></tr>
        <tr><td class="muted">Cost of works</td><td class="r">{_inr(f['cost_of_works_paise'])}</td></tr>
        {persqm_row}
        <tr><td class="muted">Professional fee</td><td class="r"><b>{_inr(fee)}</b></td></tr>
        <tr><td class="muted">COA minimum (benchmark)</td><td class="r">{_inr(coa_min)} ({pct_of_coa} of COA)</td></tr>
        <tr><td class="muted">Documentation &amp; communication</td><td class="r">{f['doc_comm_pct']}%</td></tr>
      </table>
      {below}

      <h4>Stage-wise billing</h4>
      <table>
        <thead><tr><th>Stage</th><th class="r">Billing %</th><th class="r">Amount</th></tr></thead>
        <tbody>{stage_rows or '<tr><td colspan=3 class="muted">No stage plan</td></tr>'}</tbody>
      </table>

      {f'<h4>Scope</h4><p style="white-space:pre-wrap">{_e(f.get("scope"))}</p>' if f.get("scope") else ''}
      <p class="muted" style="margin-top:24px">{_e(firm.get('legalName'))} · architectural professional services.</p>
    </body></html>"""


_PURPOSE_LABEL = {
    "FOR_APPROVAL": "For approval",
    "FOR_CONSTRUCTION": "For construction",
    "FOR_INFORMATION": "For information",
    "FOR_TENDER": "For tender",
    "AS_BUILT": "As built",
}


def _transmittal_html(t: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    rows = "".join(
        f"<tr><td>{i + 1}</td><td>{_e(it['drawing_ref'])}</td><td>{_e(it['title'])}</td>"
        f"<td class='c'>{_e(it.get('rev') or '—')}</td><td class='c'>{it['copies']}</td></tr>"
        for i, it in enumerate(t.get("items", []))
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 18mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 11px; }}
      .firm {{ font-size: 18px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .title {{ font-size: 15px; font-weight: 700; text-transform: uppercase;
                border-top: 2px solid #161616; border-bottom: 2px solid #161616;
                padding: 6px 0; margin: 16px 0; letter-spacing: 1px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
      th, td {{ padding: 6px 8px; border-bottom: 1px solid #e0e0e0; text-align: left; }}
      th {{ background: #f4f4f4; }} td.c, th.c {{ text-align: center; }}
      .kv td {{ border: none; padding: 2px 8px; }}
    </style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>

      <div class="title">Drawing Transmittal — {_e(t['ref'])}</div>
      <table class="kv">
        <tr><td class="muted">To</td><td>{_e(t['recipient'])}</td></tr>
        <tr><td class="muted">Project</td><td>{_e(t['project_title'])} ({_e(t['project_ref'])})</td></tr>
        <tr><td class="muted">Purpose</td><td>{_e(_PURPOSE_LABEL.get(t['purpose'], t['purpose']))}</td></tr>
        <tr><td class="muted">Channel</td><td>{_e(t['channel'])}</td></tr>
        <tr><td class="muted">Date issued</td><td>{_e(t.get('date_issued') or '—')}</td></tr>
      </table>

      <table>
        <thead><tr><th>#</th><th>Drawing no</th><th>Title</th><th class="c">Rev</th><th class="c">Copies</th></tr></thead>
        <tbody>{rows or '<tr><td colspan=5 class="muted">No items</td></tr>'}</tbody>
      </table>

      {f'<p class="muted" style="margin-top:10px">{_e(t.get("notes"))}</p>' if t.get("notes") else ''}
      <p class="muted" style="margin-top:24px">Issued by {_e(firm.get('legalName'))}. Please acknowledge receipt.</p>
    </body></html>"""


_WORK_TYPE_LABEL = {
    "ARCHITECTURE": "Architecture Consultancy",
    "INTERIOR": "Interior Consultancy",
    "LANDSCAPE": "Landscape",
    "MISC": "Miscellaneous",
}

_DOC_CSS = """
  @page { size: A4; margin: 18mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 11px; line-height: 1.5; }
  .firm { font-size: 18px; font-weight: 700; }
  .muted { color: #6f6f6f; }
  .title { font-size: 15px; font-weight: 700; text-transform: uppercase;
           border-top: 2px solid #161616; border-bottom: 2px solid #161616;
           padding: 6px 0; margin: 16px 0; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; }
  .kv td { border: none; padding: 2px 8px; }
  h4 { margin: 16px 0 4px; }
  .pre { white-space: pre-wrap; }
"""


def _proposal_html(pr: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    work = _WORK_TYPE_LABEL.get(pr.get("work_type", "ARCHITECTURE"), pr.get("work_type"))
    stage_rows = "".join(
        f"<tr><td>{_e(ph['label'])}</td><td class='r'>{ph['billing_pct']}%</td></tr>"
        for ph in pr.get("phases", [])
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}
      td.r,th.r {{ text-align: right; }}</style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>
      <div class="title">Proposal &amp; Agreement — {_e(pr['ref'])}</div>
      <table class="kv">
        <tr><td class="muted">Client</td><td>{_e(pr.get('client_name') or '—')}</td></tr>
        <tr><td class="muted">Project</td><td>{_e(pr['project_title'])} ({_e(pr['project_ref'])})</td></tr>
        <tr><td class="muted">Site</td><td>{_e(pr.get('site_address') or '—')}</td></tr>
        <tr><td class="muted">Discipline</td><td>{_e(work)}</td></tr>
        <tr><td class="muted">Professional fee</td><td><b>{_inr(pr['fee_paise'])}</b></td></tr>
      </table>
      <h4>Scope of work</h4>
      <p class="pre">{_e(pr.get('scope') or '—')}</p>
      <h4>Project stages and fee allocation</h4>
      <table><thead><tr><th>Stage</th><th class="r">Billing %</th></tr></thead>
        <tbody>{stage_rows or '<tr><td colspan=2 class="muted">—</td></tr>'}</tbody></table>
      {f'<h4>Notes</h4><p class="pre">{_e(pr.get("notes"))}</p>' if pr.get('notes') else ''}
      <p class="muted" style="margin-top:28px">Accepted for and on behalf of the Client: ____________________
        &nbsp;&nbsp; Date: __________</p>
      <p class="muted">For {_e(firm.get('legalName'))} — subject to the agreed project scope and terms.</p>
    </body></html>"""


def _inspection_html(s: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    def block(label: str, val: Any) -> str:
        return f"<h4>{label}</h4><p class='pre'>{_e(val or '—')}</p>"
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}</style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>
      <div class="title">Site Inspection Report — {_e(s['ref'])}</div>
      <table class="kv">
        <tr><td class="muted">Project</td><td>{_e(s['project_title'])} ({_e(s['project_ref'])})</td></tr>
        <tr><td class="muted">Site</td><td>{_e(s.get('site_address') or '—')}</td></tr>
        <tr><td class="muted">Date of visit</td><td>{_e(s.get('date_visit') or '—')}</td></tr>
        <tr><td class="muted">Weather</td><td>{_e(s.get('weather') or '—')}</td></tr>
        <tr><td class="muted">Inspected by</td><td>{_e(s.get('inspector_name') or '—')}</td></tr>
        <tr><td class="muted">Next visit</td><td>{_e(s.get('next_visit') or '—')}</td></tr>
      </table>
      {block('Attendees', s.get('attendees'))}
      {block('Progress of work', s.get('progress'))}
      {block('Observations', s.get('observations'))}
      {block('Instructions issued', s.get('instructions'))}
      <p class="muted" style="margin-top:24px">{_e(firm.get('legalName'))} — site inspection record.</p>
    </body></html>"""


def _specsheet_html(s: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    rows = "".join(
        f"<tr><td>{_e(it.get('category'))}</td><td>{_e(it['item'])}</td>"
        f"<td>{_e(it.get('make'))}</td><td>{_e(it.get('specification'))}</td>"
        f"<td>{_e(it.get('finish'))}</td><td>{_e(it.get('remarks'))}</td></tr>"
        for it in s.get("items", [])
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}</style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>
      <div class="title">Specification Sheet — {_e(s['title'])}</div>
      <div class="muted">{_e(s['project_title'])} ({_e(s['project_ref'])}) · {_e(s['ref'])}</div>
      <table>
        <thead><tr><th>Category</th><th>Item</th><th>Make</th><th>Specification</th><th>Finish</th><th>Remarks</th></tr></thead>
        <tbody>{rows or '<tr><td colspan=6 class="muted">No items</td></tr>'}</tbody>
      </table>
      <p class="muted" style="margin-top:24px">{_e(firm.get('legalName'))} — material specification.</p>
    </body></html>"""


# Estimation OS cost heads (canonical render order) + calculation-type labels.
_COST_HEAD_LABEL = {
    "SUBSTRUCTURE": "Substructure",
    "SUPERSTRUCTURE": "Superstructure",
    "FINISHES": "Finishes",
    "SERVICES": "Services (MEP)",
    "EXTERNAL": "External works",
    "PRELIMS": "Preliminaries",
    "CONTINGENCY": "Contingency",
    "OTHER": "Other",
}
_CALC_TYPE_LABEL = {
    "RATE_BOOK": "Rate book",
    "AREA_RATE": "Area rate",
    "PERCENTAGE": "Percentage",
    "LUMPSUM": "Lumpsum",
    "COMPONENT": "Component",
    "NON_MODELED": "Non-modeled",
}


def _letter_html(letter: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    proj = (
        f"<div class='muted'>Re: {_e(letter['project_title'])} ({_e(letter['project_ref'])})</div>"
        if letter.get("project_ref")
        else ""
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}</style></head><body>
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>{_firm_heading(firm)}<div class="muted">{addr}</div>
          <div class="muted">{_e(firm.get('email'))} · {_e(firm.get('phone'))}</div></div>
        <div class="muted" style="text-align:right">
          <div>Ref: {_e(letter['ref'])}</div>
          <div>{_e(letter.get('date_letter') or '')}</div>
        </div>
      </div>
      <div style="margin-top:24px">To,<br><b>{_e(letter['recipient'])}</b></div>
      {proj}
      <div style="margin-top:16px"><b>Subject: {_e(letter['subject'])}</b></div>
      <p class="pre" style="margin-top:12px">{_e(letter['body'])}</p>
      <div style="margin-top:36px">Yours faithfully,<br><br>{_firm_heading(firm, 'span')}</div>
    </body></html>"""


def _site_instruction_html(rec: dict[str, Any], firm: dict[str, Any]) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h1>Site instruction {_e(rec.get('ref'))}</h1>
      <p><strong>Project:</strong> {_e(rec.get('project_ref'))} — {_e(rec.get('project_title'))}</p>
      <p><strong>Date:</strong> {_e(rec.get('issued_at'))}</p>
      <h2>{_e(rec.get('subject'))}</h2>
      <div>{_e(rec.get('body') or '')}</div>
      <p class="muted">{_e(firm.get('legalName'))}</p>
    </body></html>"""


def _progress_report_html(rec: dict[str, Any], firm: dict[str, Any]) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h1>Monthly progress report</h1>
      <p><strong>Project:</strong> {_e(rec.get('project_ref'))} — {_e(rec.get('project_title'))}</p>
      <p><strong>Period:</strong> {_e(rec.get('period_start'))} to {_e(rec.get('period_end'))}</p>
      <p><strong>Schedule progress:</strong> {rec.get('schedule_progress_pct') or 0}%</p>
      <p><strong>Open snags:</strong> {rec.get('open_snag_count') or 0} · <strong>Open RFIs:</strong> {rec.get('open_rfi_count') or 0}</p>
      <h2>Narrative</h2>
      <div>{_e(rec.get('narrative') or '')}</div>
      <p class="muted">{_e(firm.get('legalName'))}</p>
    </body></html>"""


_BILL_TYPE_LABEL = {
    "RA": "Running account (RA) bill",
    "FINAL": "Final bill",
    "EXTRA_ITEM": "Extra item bill",
    "VARIATION": "Variation bill",
    "ADVANCE_RECOVERY": "Advance recovery",
    "RETENTION_RELEASE": "Retention release",
}


_COST_STATUS_LABEL = {
    "GREEN": "Within budget",
    "AMBER": "Watch",
    "RED": "Overrun or approval required",
    "GREY": "Not started / no data",
}


def _feasibility_report_html(rec: dict[str, Any], firm: dict[str, Any]) -> str:
    """Project OS Slice D — the printable feasibility report. Renders the frozen
    pre-project assessment straight from the stored `snapshot` jsonb: site area,
    permissible FAR area, buildable area, possible floors, super-builtup area,
    and the estimated project cost. The snapshot is an exact copy of what was on
    screen at generation time, so the PDF never re-derives anything."""
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    snap = rec.get("snapshot") or {}

    def _num(v: Any, suffix: str = "") -> str:
        try:
            f = float(v)
        except (TypeError, ValueError):
            return "—"
        text = f"{f:,.0f}" if abs(f - round(f)) < 1e-9 else f"{f:,.2f}"
        return f"{text}{suffix}"

    area_rows = "".join(
        f"<tr><td>{label}</td><td>{_num(snap.get(key), suffix)}</td></tr>"
        for label, key, suffix in (
            ("Site area", "siteAreaSqm", " sqm"),
            ("Permissible FAR area", "permissibleFarArea", " sqm"),
            ("Setback-buildable area", "setbackBuildableArea", " sqm"),
            ("Ground coverage", "actualGroundCoverage", " sqm"),
            ("Possible floors", "possibleFloors", ""),
            ("Estimated builtup (super)", "superBuiltupArea", " sqm"),
        )
    )
    cost_rows = (
        f"<tr><td>Construction rate</td><td>{_inr(int(snap.get('constructionRatePaise') or 0))} / sqm</td></tr>"
        f"<tr><td>Estimated project cost</td><td>{_inr(int(snap.get('estimatedProjectCostPaise') or 0))}</td></tr>"
    )
    timeline = snap.get("estimatedTimeline")
    compliance = snap.get("compliancePct")
    meta_rows = ""
    if timeline:
        meta_rows += f"<tr><td>Estimated timeline</td><td>{_e(timeline)}</td></tr>"
    if compliance is not None:
        meta_rows += f"<tr><td>Compliance</td><td>{_num(compliance, '%')}</td></tr>"
    breakdown = snap.get("breakdown") or {}
    breakdown_block = ""
    if breakdown:
        b_rows = "".join(
            f"<tr><td>{_e(k)}</td><td>{_num(v, '%')}</td></tr>" for k, v in breakdown.items()
        )
        breakdown_block = (
            '<div class="title" style="font-size:13px">Cost-head split</div>'
            f"<table class=\"kv\"><tbody>{b_rows}</tbody></table>"
        )
    generated = _e(snap.get("generatedAt") or rec.get("generated_at") or "")
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}</style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr}</div>
      <div class="title">Feasibility report — {_e(rec.get('project_title'))} ({_e(rec.get('project_ref'))})</div>
      <table class="kv" style="margin-top:8px">
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>{area_rows}{meta_rows}</tbody>
      </table>
      <table class="kv" style="margin-top:8px">
        <thead><tr><th>Cost</th><th>Amount</th></tr></thead>
        <tbody>{cost_rows}</tbody>
      </table>
      {breakdown_block}
      <p class="muted" style="margin-top:12px">Indicative feasibility for discussion only — subject to
        statutory sanction and detailed design. Generated {generated}.</p>
    </body></html>"""


_ENG_MODEL = {
    "DESIGN_ASSIST": "Design assist",
    "PEER_REVIEW": "Peer review",
    "FULL_DESIGN": "Full design",
    "SITE_SUPPORT": "Site support",
}
_ENG_DISCIPLINE = {
    "STRUCTURAL": "Structural",
    "MEP": "MEP / building services",
    "CIVIL": "Civil / infrastructure",
    "GEOTECHNICAL": "Geotechnical",
    "FACADE": "Façade / specialist",
    "OTHER": "Other",
}
_ENG_ISSUE_CLASS = {
    "FOR_INFORMATION": "For information",
    "FOR_APPROVAL": "For approval",
    "FOR_CONSTRUCTION": "For construction",
}
_ENG_STEP = {"CHECK": "Checked", "APPROVE": "Approved (EoR)", "VERIFY": "Proof-checked"}
_ENG_FEE_MODEL = {
    "PERCENT_OF_COST": "% of construction cost",
    "LUMP_SUM": "Lump sum",
    "TIME_CHARGE": "Time charge",
    "RETAINER": "Retainer",
}


def _engagement_register_html(e: dict[str, Any], firm: dict[str, Any]) -> str:
    """AORMS-Consultancy engagement register — the issue-sheet record: the
    deliverable register with its sign-off chains, fee stages, and TQ log."""
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    steps_by_del: dict[str, list[dict[str, Any]]] = {}
    for s in e.get("steps", []):
        steps_by_del.setdefault(str(s["deliverable_id"]), []).append(s)

    def chain_cell(d: dict[str, Any]) -> str:
        steps = steps_by_del.get(str(d["id"]), [])
        if not steps:
            return "<span class='muted'>—</span>"
        return "<br>".join(
            f"{_ENG_STEP.get(s['kind'], s['kind'])}: {_e(s['user_name'])} "
            f"<span class='muted'>{str(s['at'])[:10]}</span>"
            for s in steps
        )

    del_rows = "".join(
        f"<tr><td>{_e(d['code'])}</td><td>{_e(d['title'])}</td>"
        f"<td>{_e(_ENG_DISCIPLINE.get(d['discipline'], d['discipline']))}</td>"
        f"<td class='c'>{_e(d['revision'])}</td>"
        f"<td>{_e(_ENG_ISSUE_CLASS.get(d['issue_class'], d['issue_class']))}</td>"
        f"<td class='c'>{_e(d['check_category'])}</td>"
        f"<td>{chain_cell(d)}</td>"
        f"<td class='c'>{_e(d['status'])}"
        f"{('<br><span class=muted>' + str(d['issued_at'])[:10] + '</span>') if d.get('issued_at') else ''}</td></tr>"
        for d in e.get("deliverables", [])
    )
    fee_rows = "".join(
        f"<tr><td>{_e(f['label'])}</td><td class='r'>{_inr(f['amount_paise'])}</td>"
        f"<td class='c'>{_e(f['status'])}</td></tr>"
        for f in e.get("fee_stages", [])
    )
    tq_rows = "".join(
        f"<tr><td>{_e(t['code'])}{' <b>· scope</b>' if t.get('scope_impact') else ''}</td>"
        f"<td>{_e(t['question'])}"
        f"{('<br><span class=muted>Answer: ' + _e(t['answer']) + '</span>') if t.get('answer') else ''}"
        f"{('<br><span class=muted>Closure: ' + _e(t['closure_note']) + '</span>') if t.get('closure_note') else ''}</td>"
        f"<td class='c'>{_e(t['status'])}</td></tr>"
        for t in e.get("tqs", [])
    )
    vo_rows = "".join(
        f"<tr><td>{_e(v['code'])}</td><td>{_e(v['title'])}</td>"
        f"<td class='r'>{_inr(v['amount_paise'])}</td><td class='c'>{_e(v['status'])}</td></tr>"
        for v in e.get("variations", [])
    )
    fee_line = (
        f"{_ENG_FEE_MODEL.get(e.get('fee_model'), e.get('fee_model'))} · agreed {_inr(e.get('fee_total_paise'))}"
        if e.get("fee_model")
        else "No fee model recorded"
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 16mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 10.5px; }}
      .firm {{ font-size: 18px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .title {{ font-size: 14px; font-weight: 700; text-transform: uppercase;
                border-top: 2px solid #161616; border-bottom: 2px solid #161616;
                padding: 6px 0; margin: 14px 0 10px; letter-spacing: 1px; }}
      h3 {{ font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.6px;
            margin: 16px 0 4px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 4px; }}
      th, td {{ padding: 5px 7px; border-bottom: 1px solid #e0e0e0; text-align: left;
                vertical-align: top; }}
      th {{ background: #f4f4f4; }} td.c, th.c {{ text-align: center; }}
      td.r, th.r {{ text-align: right; }}
      .kv td {{ border: none; padding: 2px 8px; }}
    </style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr}</div>

      <div class="title">Engagement Register — {_e(e['title'])}</div>
      <table class="kv">
        <tr><td class="muted">Client</td><td>{_e(e.get('client_name') or '—')}</td></tr>
        <tr><td class="muted">Model</td><td>{_e(_ENG_MODEL.get(e['model'], e['model']))} ·
            lead: {_e(_ENG_DISCIPLINE.get(e['lead_discipline'], e['lead_discipline']))}</td></tr>
        <tr><td class="muted">Stage</td><td>{_e(e.get('stage') or '—')} · {_e(e['status'])}</td></tr>
        <tr><td class="muted">Reliance</td><td>{_e(e.get('reliance_scope') or '—')}</td></tr>
        <tr><td class="muted">Fee</td><td>{fee_line}</td></tr>
      </table>

      <h3>Deliverable register</h3>
      <table>
        <thead><tr><th>Code</th><th>Title</th><th>Discipline</th><th class="c">Rev</th>
          <th>Issue class</th><th class="c">Check</th><th>Sign-off chain</th><th class="c">Status</th></tr></thead>
        <tbody>{del_rows or '<tr><td colspan=8 class="muted">Empty register</td></tr>'}</tbody>
      </table>

      {f'<h3>Fee stages</h3><table><thead><tr><th>Stage</th><th class="r">Amount</th><th class="c">Status</th></tr></thead><tbody>{fee_rows}</tbody></table>' if fee_rows else ''}

      {f'<h3>Variations</h3><table><thead><tr><th>Code</th><th>Title</th><th class="r">Amount</th><th class="c">Status</th></tr></thead><tbody>{vo_rows}</tbody></table>' if vo_rows else ''}

      {f'<h3>Technical queries</h3><table><thead><tr><th>Code</th><th>Question</th><th class="c">Status</th></tr></thead><tbody>{tq_rows}</tbody></table>' if tq_rows else ''}

      <p class="muted" style="margin-top:22px">Issued by {_e(firm.get('legalName'))}.
        Deliverables are issued for the stated purpose only; drafts and superseded
        revisions remain with the office.</p>
    </body></html>"""


_UOM_LABEL = {"SQM": "sqm", "CUM": "cum", "RMT": "rmt", "NOS": "nos", "KG": "kg", "LTR": "ltr"}


def _mm(value: Any) -> str:
    """Millimetres as metres to 3 dp — the Indian abstract convention."""
    if value is None:
        return "—"
    try:
        return f"{float(value) / 1000:.3f}"
    except (TypeError, ValueError):
        return "—"


def _abstract_html(b: dict[str, Any], firm: dict[str, Any]) -> str:
    """Measurement book as a printable abstract sheet (P8.7).

    Mirrors the Excel export: L/B/H in metres, quantity with its unit, and a
    TOTAL line per unit — an abstract is read bottom-up. Totals are summed then
    rounded once so a column of 3-dp rows cannot drift the total.
    """
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    rows = b.get("rows", [])

    body = "".join(
        f"<tr><td class='c'>{i + 1}</td>"
        f"<td>{_e((r.get('level_code') + ' — ' + r.get('level_name')) if r.get('level_code') else 'All levels')}</td>"
        f"<td>{_e(r.get('library_item_code') or '—')}</td>"
        f"<td>{_e(r['particulars'])}</td>"
        f"<td class='r'>{_mm(r.get('length_mm'))}</td>"
        f"<td class='r'>{_mm(r.get('breadth_mm'))}</td>"
        f"<td class='r'>{_mm(r.get('height_mm'))}</td>"
        f"<td class='r'>{float(r['quantity'] or 0):.3f}</td>"
        f"<td class='c'>{_e(_UOM_LABEL.get(r['uom'], r['uom']))}</td></tr>"
        for i, r in enumerate(rows)
    )

    totals: dict[str, float] = {}
    for r in rows:
        totals[r["uom"]] = totals.get(r["uom"], 0.0) + float(r["quantity"] or 0)
    total_rows = "".join(
        f"<tr class='total'><td colspan='7' class='r'>TOTAL — {_e(_UOM_LABEL.get(u, u))}</td>"
        f"<td class='r'>{round(t, 3):.3f}</td><td class='c'>{_e(_UOM_LABEL.get(u, u))}</td></tr>"
        for u, t in totals.items()
    )

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}
      td.r, th.r {{ text-align: right; }} td.c, th.c {{ text-align: center; }}
      tr.total td {{ font-weight: 700; border-top: 2px solid #161616; }}
    </style></head><body>
      {_firm_heading(firm)}
      <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div>

      <div class="title">Abstract of Measurements — {_e(b['title'])}</div>
      <table class="kv">
        <tr><td class="muted">Project</td><td>{_e(b['project_title'])} ({_e(b['project_ref'])})</td></tr>
        <tr><td class="muted">Status</td><td>{_e(b['status'])} · revision {_e(b['revision_no'])}</td></tr>
      </table>

      <table>
        <thead><tr>
          <th class="c">S.No</th><th>Level</th><th>Item code</th><th>Particulars</th>
          <th class="r">L (m)</th><th class="r">B (m)</th><th class="r">H (m)</th>
          <th class="r">Quantity</th><th class="c">Unit</th>
        </tr></thead>
        <tbody>{body or '<tr><td colspan=9 class="muted">No measured rows</td></tr>'}{total_rows}</tbody>
      </table>

      <p class="muted" style="margin-top:22px">Measured from calibrated plan sheets in
        {_e(firm.get('legalName'))}. Quantities are as measured; check against the issued drawings.</p>
    </body></html>"""


_RENDERERS = {
    "invoice": (fetch_invoice_full, _render_html, update_invoice, "invoice"),
    "measurement_book": (
        fetch_measurement_book_full,
        _abstract_html,
        update_measurement_book,
        "abstract",
    ),
    "engagement_register": (fetch_engagement_full, _engagement_register_html, update_engagement, "engagement"),
    "payslip": (fetch_payslip_full, _payslip_html, update_payslip, "payslip"),
    "feeproposal": (fetch_feeproposal_full, _feeproposal_html, update_feeproposal, "feeproposal"),
    "transmittal": (fetch_transmittal_full, _transmittal_html, update_transmittal, "transmittal"),
    "proposal": (fetch_proposal_full, _proposal_html, update_proposal, "proposal"),
    "inspection": (fetch_inspection_full, _inspection_html, update_inspection, "inspection"),
    "specsheet": (fetch_specsheet_full, _specsheet_html, update_specsheet, "specsheet"),
    "letter": (fetch_letter_full, _letter_html, update_letter, "letter"),
    "progress_report": (fetch_progress_report_full, _progress_report_html, update_progress_report, "progress_report"),
    "feasibility_report": (fetch_feasibility_report_full, _feasibility_report_html, update_feasibility_report, "feasibility_report"),
    "site_instruction": (fetch_site_instruction_full, _site_instruction_html, update_site_instruction, "site_instruction"),
}


def _inject_watermark(html_str: str, text: str) -> str:
    """Overlay a faint diagonal watermark, repeated on every page."""
    wm = (
        '<div style="position:fixed; top:42%; left:-10%; right:-10%; text-align:center;'
        " transform:rotate(-28deg); font-size:64px; font-weight:700; letter-spacing:6px;"
        f' color:rgba(218,30,40,0.12);">{_e(text)}</div>'
    )
    return html_str.replace("</body>", wm + "</body>")


def _drawing_issue_html(rec: dict[str, Any], firm: dict[str, Any], svg: str) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    # Let the embedded SVG scale to the page via its viewBox.
    svg = re.sub(r'(<svg\b[^>]*?)\s(?:width|height)="[^"]*"', r"\1", svg, count=2)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4 landscape; margin: 12mm; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #161616; font-size: 10px; }}
      .tb {{ display: flex; justify-content: space-between; border-bottom: 2px solid #161616;
             padding-bottom: 6px; margin-bottom: 8px; }}
      .firm {{ font-size: 14px; font-weight: 700; }}
      .muted {{ color: #6f6f6f; }}
      .frame {{ border: 1px solid #e0e0e0; padding: 6px; }}
      .frame svg {{ width: 100%; height: auto; }}
    </style></head><body>
      <div class="tb">
        <div>{_firm_heading(firm, "span")}
          <div class="muted">{addr} · COA Reg {_e(firm.get('coaRegNo'))}</div></div>
        <div style="text-align:right">
          <div><b>{_e(rec['title'])}</b> ({_e(rec['ref'])})</div>
          <div class="muted">{_e(rec['project_title'])} · {_e(rec['project_ref'])}</div>
        </div>
      </div>
      <div class="frame">{svg}</div>
    </body></html>"""


def _already_ready(rec: dict[str, Any] | None, *, key: str = "pdf_key", status: str = "pdf_status") -> bool:
    return bool(rec and rec.get(status) == "READY" and rec.get(key))


def _render_drawing_issue(record_id: str, firm: dict[str, Any], watermark: str | None) -> dict:
    rec = fetch_drawing_full(record_id)
    if _already_ready(rec, key="issue_pdf_key", status="issue_pdf_status"):
        return {"status": "skipped", "reason": "already_ready", "id": record_id, "target": "drawing"}
    update_drawing(record_id, issue_pdf_status="PROCESSING")
    try:
        from weasyprint import HTML

        if rec is None or not rec.get("svg_key"):
            raise ValueError("drawing/svg not found")
        svg = get_bytes(settings.s3_bucket, rec["svg_key"]).decode("utf-8")
        html_str = _drawing_issue_html(rec, firm, svg)
        if watermark:
            html_str = _inject_watermark(html_str, watermark)
        pdf_key = f"pdf/drawing/{record_id}.pdf"
        pdf_bytes = HTML(string=html_str).write_pdf()
        put_bytes(settings.s3_bucket, pdf_key, pdf_bytes, "application/pdf")
        update_drawing(record_id, issue_pdf_key=pdf_key, issue_pdf_status="READY")
        return {"status": "ok", "id": record_id, "target": "drawing", "bytes": len(pdf_bytes)}
    except Exception as exc:  # noqa: BLE001
        log.exception("drawing issue pdf failed for %s", record_id)
        update_drawing(record_id, issue_pdf_status="FAILED")
        return {"status": "error", "id": record_id, "error": str(exc)}


def render_pdf(payload: dict[str, Any]) -> dict[str, Any]:
    target: str = payload.get("target", "invoice")
    record_id: str = payload["id"]
    firm: dict[str, Any] = payload.get("firm", {})
    watermark: str | None = payload.get("watermark")

    if target == "drawing":
        return _render_drawing_issue(record_id, firm, watermark)

    fetch, render_html, update, folder = _RENDERERS.get(target, _RENDERERS["invoice"])
    rec = fetch(record_id)
    if rec is None:
        return {"status": "error", "id": record_id, "error": f"{target} not found"}
    if _already_ready(rec):
        return {"status": "skipped", "reason": "already_ready", "id": record_id, "target": target}

    update(record_id, pdf_status="PROCESSING")
    try:
        # Heavy import (pango/cairo) kept local so the module imports without
        # system libs (e.g. in CI / unit tests).
        from weasyprint import HTML

        pdf_key = f"pdf/{folder}/{record_id}.pdf"
        html_str = render_html(rec, firm)
        if watermark:
            html_str = _inject_watermark(html_str, watermark)
        pdf_bytes = HTML(string=html_str).write_pdf()
        put_bytes(settings.s3_bucket, pdf_key, pdf_bytes, "application/pdf")
        update(record_id, pdf_key=pdf_key, pdf_status="READY")
        return {"status": "ok", "id": record_id, "target": target, "bytes": len(pdf_bytes)}
    except Exception as exc:  # noqa: BLE001
        log.exception("pdf render failed for %s %s", target, record_id)
        update(record_id, pdf_status="FAILED")
        return {"status": "error", "id": record_id, "error": str(exc)}
