"""GST document PDF rendering with WeasyPrint (HTML → PDF). See ADR-10.

Renders the Tax Invoice / Bill of Supply for an invoice using the firm profile
supplied in the job payload (single-firm, fixed config), stores the PDF in
object storage and records the key on the invoice row.
"""
from __future__ import annotations

import html
import logging
from typing import Any

from weasyprint import HTML

from ..config import settings
from ..db import fetch_invoice_full, update_invoice
from ..storage import put_bytes

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
          <div class="firm">{_e(firm.get('legalName'))}</div>
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


def render_pdf(payload: dict[str, Any]) -> dict[str, Any]:
    invoice_id: str = payload["id"]
    firm: dict[str, Any] = payload.get("firm", {})

    update_invoice(invoice_id, pdf_status="PROCESSING")
    try:
        inv = fetch_invoice_full(invoice_id)
        if inv is None:
            raise ValueError("invoice not found")

        pdf_bytes = HTML(string=_render_html(inv, firm)).write_pdf()
        pdf_key = f"pdf/invoice/{invoice_id}.pdf"
        put_bytes(settings.s3_bucket, pdf_key, pdf_bytes, "application/pdf")

        update_invoice(invoice_id, pdf_key=pdf_key, pdf_status="READY")
        return {"status": "ok", "id": invoice_id, "pdfKey": pdf_key, "bytes": len(pdf_bytes)}
    except Exception as exc:  # noqa: BLE001
        log.exception("pdf render failed for %s", invoice_id)
        update_invoice(invoice_id, pdf_status="FAILED")
        return {"status": "error", "id": invoice_id, "error": str(exc)}
