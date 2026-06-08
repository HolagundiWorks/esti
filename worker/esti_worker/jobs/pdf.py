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
    fetch_feeproposal_full,
    fetch_inspection_full,
    fetch_invoice_full,
    fetch_letter_full,
    fetch_payslip_full,
    fetch_proposal_full,
    fetch_specsheet_full,
    fetch_transmittal_full,
    update_drawing,
    update_feeproposal,
    update_inspection,
    update_invoice,
    update_letter,
    update_payslip,
    update_proposal,
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
        <tr><td class="muted">Cost of works</td><td class="r">{_inr(f['cost_of_works_paise'])}</td></tr>
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
      <p class="muted" style="margin-top:24px">{_e(firm.get('legalName'))} · architectural services per the COA Conditions of Engagement.</p>
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
      <h4>Stage-wise engagement (COA)</h4>
      <table><thead><tr><th>Stage</th><th class="r">Billing %</th></tr></thead>
        <tbody>{stage_rows or '<tr><td colspan=2 class="muted">—</td></tr>'}</tbody></table>
      {f'<h4>Notes</h4><p class="pre">{_e(pr.get("notes"))}</p>' if pr.get('notes') else ''}
      <p class="muted" style="margin-top:28px">Accepted for and on behalf of the Client: ____________________
        &nbsp;&nbsp; Date: __________</p>
      <p class="muted">For {_e(firm.get('legalName'))} — per the COA Conditions of Engagement.</p>
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


def _letter_html(l: dict[str, Any], firm: dict[str, Any]) -> str:
    addr = "<br>".join(_e(line) for line in firm.get("addressLines", []))
    proj = (
        f"<div class='muted'>Re: {_e(l['project_title'])} ({_e(l['project_ref'])})</div>"
        if l.get("project_ref")
        else ""
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{_DOC_CSS}</style></head><body>
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>{_firm_heading(firm)}<div class="muted">{addr}</div>
          <div class="muted">{_e(firm.get('email'))} · {_e(firm.get('phone'))}</div></div>
        <div class="muted" style="text-align:right">
          <div>Ref: {_e(l['ref'])}</div>
          <div>{_e(l.get('date_letter') or '')}</div>
        </div>
      </div>
      <div style="margin-top:24px">To,<br><b>{_e(l['recipient'])}</b></div>
      {proj}
      <div style="margin-top:16px"><b>Subject: {_e(l['subject'])}</b></div>
      <p class="pre" style="margin-top:12px">{_e(l['body'])}</p>
      <div style="margin-top:36px">Yours faithfully,<br><br>{_firm_heading(firm, 'span')}</div>
    </body></html>"""


_RENDERERS = {
    "invoice": (fetch_invoice_full, _render_html, update_invoice, "invoice"),
    "payslip": (fetch_payslip_full, _payslip_html, update_payslip, "payslip"),
    "feeproposal": (fetch_feeproposal_full, _feeproposal_html, update_feeproposal, "feeproposal"),
    "transmittal": (fetch_transmittal_full, _transmittal_html, update_transmittal, "transmittal"),
    "proposal": (fetch_proposal_full, _proposal_html, update_proposal, "proposal"),
    "inspection": (fetch_inspection_full, _inspection_html, update_inspection, "inspection"),
    "specsheet": (fetch_specsheet_full, _specsheet_html, update_specsheet, "specsheet"),
    "letter": (fetch_letter_full, _letter_html, update_letter, "letter"),
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


def _render_drawing_issue(record_id: str, firm: dict[str, Any], watermark: str | None) -> dict:
    update_drawing(record_id, issue_pdf_status="PROCESSING")
    try:
        from weasyprint import HTML

        rec = fetch_drawing_full(record_id)
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
    update(record_id, pdf_status="PROCESSING")
    try:
        # Heavy import (pango/cairo) kept local so the module imports without
        # system libs (e.g. in CI / unit tests).
        from weasyprint import HTML

        rec = fetch(record_id)
        if rec is None:
            raise ValueError(f"{target} not found")
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
