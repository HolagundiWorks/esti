"""Unit tests for the worker's pure helpers (no DB / object storage / network)."""
from esti_worker.jobs import HANDLERS
from esti_worker.jobs.pdf import _inr
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
