from esti_worker.jobs import HANDLERS, dxf, pdf, reconcile


def test_handlers_registered() -> None:
    assert set(HANDLERS) == {"dxf_to_svg", "render_pdf", "reconcile_import"}


def test_dxf_stub_returns_svg_key() -> None:
    out = dxf.dxf_to_svg({"fileHash": "abc123"})
    assert out["svgKey"] == "svg/abc123.svg"
    assert out["status"] == "ok"


def test_pdf_stub_uses_document_kind() -> None:
    out = pdf.render_pdf({"id": "inv-1", "documentKind": "BILL_OF_SUPPLY"})
    assert out["pdfKey"] == "pdf/bill_of_supply/inv-1.pdf"


def test_reconcile_stub() -> None:
    out = reconcile.reconcile_import({"source": "FORM_26AS", "fileKey": "x"})
    assert out["status"] == "ok"
