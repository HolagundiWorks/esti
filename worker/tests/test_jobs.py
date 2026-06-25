"""Unit tests for the worker's pure helpers (no DB / object storage / network)."""
from esti_worker.jobs import HANDLERS
from esti_worker.jobs.pdf import _inr, _running_bill_html
from esti_worker.jobs.reconcile import _digits, _pick, _to_paise


def test_handlers_registered() -> None:
    assert set(HANDLERS) == {"dxf_to_svg", "render_pdf", "reconcile_import"}


def test_inr_indian_grouping() -> None:
    assert _inr(0) == "₹0.00"
    assert _inr(2500000) == "₹25,000.00"
    assert _inr(12345678) == "₹1,23,456.78"
    assert _inr(-5000) == "-₹50.00"


def test_to_paise_parsing() -> None:
    assert _to_paise("1,23,456.78") == 12345678
    assert _to_paise("25000") == 2500000
    assert _to_paise("₹ 1,000.50") == 100050
    assert _to_paise("") is None
    assert _to_paise(None) is None


def test_pick_column_aliases() -> None:
    cols = ["Txn Date", "Narration", "Credit Amount", "Balance"]
    assert _pick(cols, ("date", "txn date")) == "Txn Date"
    assert _pick(cols, ("description", "narration")) == "Narration"
    assert _pick(cols, ("amount", "credit")) == "Credit Amount"
    assert _pick(cols, ("debit",)) is None


def test_digits_only() -> None:
    assert _digits("INV/2026-27/0006") == "2026270006"
    assert _digits("UTR-ABCD") == ""


def test_running_bill_html_renders_gross_deductions_net() -> None:
    rec = {
        "ref": "RB-0001",
        "title": "RA 1 — substructure",
        "bill_type": "RA",
        "status": "MEASURED",
        "measurement_date": "2026-06-25",
        "notes": "First running bill",
        "total_paise": 10000000,  # ₹1,00,000 gross
        "retention_paise": 500000,  # ₹5,000
        "advance_recovery_paise": 0,
        "tax_tds_paise": 200000,  # ₹2,000
        "other_recovery_paise": 0,
        "net_payable_paise": 9300000,  # ₹93,000
        "project_ref": "PRJ-1",
        "project_title": "Sample tower",
        "contractor_name": "Acme Builders",
        "items": [
            {"description": "PCC 1:4:8", "unit": "cum", "qty": 5, "rate_paise": 2000000, "amount_paise": 10000000},
        ],
    }
    html_str = _running_bill_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "Running account (RA) bill" in html_str
    assert "RB-0001" in html_str
    assert "Acme Builders" in html_str
    assert "₹1,00,000.00" in html_str  # gross
    assert "Less: Retention" in html_str
    assert "-₹5,000.00" in html_str
    assert "Less: Tax / TDS" in html_str
    assert "Net payable" in html_str
    assert "₹93,000.00" in html_str
    # A zero-value deduction (advance recovery) is omitted.
    assert "Advance recovery" not in html_str
