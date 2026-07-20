"""Unit tests for the worker's pure helpers (no DB / object storage / network)."""
from esti_worker.jobs import HANDLERS
from esti_worker.jobs.pdf import (
    _feasibility_report_html,
    _inr,
)
from esti_worker.jobs.reconcile import _digits, _pick, _to_paise, match_line
from esti_worker.storage import backend_from_settings


def test_backend_from_settings_default() -> None:
    assert backend_from_settings({"mode": "DEFAULT"}).kind == "default"
    assert backend_from_settings({}).kind == "default"
    # Incomplete S3/NAS configs fall back to default.
    assert backend_from_settings({"mode": "S3", "s3Endpoint": "http://x"}).kind == "default"
    assert backend_from_settings({"mode": "NAS"}).kind == "default"


def test_backend_from_settings_nas() -> None:
    b = backend_from_settings({"mode": "NAS", "nasPath": "/mnt/share"})
    assert b.kind == "fs"
    assert b.root == "/mnt/share"


def test_backend_from_settings_s3() -> None:
    b = backend_from_settings({
        "mode": "S3",
        "s3Endpoint": "https://s3.example.com",
        "s3Bucket": "firmbucket",
        "s3AccessKey": "a",
        "s3SecretKey": "b",
    })
    assert b.kind == "s3"
    assert b.bucket == "firmbucket"
    assert b.client is not None


def test_handlers_registered() -> None:
    assert set(HANDLERS) == {"dxf_to_svg", "render_pdf", "pdf_to_markdown", "reconcile_import"}


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


def test_to_paise_debits_are_negative() -> None:
    # Debits must come out negative so the credit filter drops them, rather than
    # being read as incoming payments.
    assert _to_paise("(1,234.50)") == -123450  # accounting parentheses
    assert _to_paise("1,234.50-") == -123450  # trailing minus
    assert _to_paise("1,234.50 Dr") == -123450  # Dr suffix
    assert _to_paise("1,234.50 Cr") == 123450  # credit stays positive
    assert _to_paise("-500") == -50000


_INVOICES = [
    {"id": "a", "ref": "INV/2026-27/0007", "grand_total_paise": 118000, "net_receivable_paise": 106200},
    {"id": "b", "ref": "INV/2026-27/0008", "grand_total_paise": 118000, "net_receivable_paise": 106200},
    {"id": "c", "ref": "INV/2026-27/0009", "grand_total_paise": 500000, "net_receivable_paise": 450000},
]


def _by_ref(invs):
    return {_digits(i["ref"]): i for i in invs}


def test_match_reference_identifies_the_invoice() -> None:
    mt, hit, _ = match_line(106200, "NEFT 2026270009 fee", _INVOICES, _by_ref(_INVOICES))
    # ref wins even though the amount also equals invoice c's net.
    assert mt == "ref_amount"
    assert hit["id"] == "c"


def test_match_reference_without_amount() -> None:
    mt, hit, _ = match_line(99999, "ref 2026270007 partial", _INVOICES, _by_ref(_INVOICES))
    assert mt == "ref"
    assert hit["id"] == "a"


def test_match_unique_amount() -> None:
    mt, hit, _ = match_line(450000, "some narration", _INVOICES, _by_ref(_INVOICES))
    assert mt == "amount"
    assert hit["id"] == "c"


def test_match_ambiguous_amount_binds_to_nothing() -> None:
    # 106200 is the net receivable of both a and b — we cannot know which, so it
    # must not auto-settle an arbitrary one.
    mt, hit, candidates = match_line(106200, "no ref here", _INVOICES, _by_ref(_INVOICES))
    assert mt == "amount_ambiguous"
    assert hit is None
    assert {c["id"] for c in candidates} == {"a", "b"}


def test_match_none() -> None:
    mt, hit, candidates = match_line(777, "unrelated", _INVOICES, _by_ref(_INVOICES))
    assert mt == "none"
    assert hit is None
    assert candidates == []


def test_pick_column_aliases() -> None:
    cols = ["Txn Date", "Narration", "Credit Amount", "Balance"]
    assert _pick(cols, ("date", "txn date")) == "Txn Date"
    assert _pick(cols, ("description", "narration")) == "Narration"
    assert _pick(cols, ("amount", "credit")) == "Credit Amount"
    assert _pick(cols, ("debit",)) is None


def test_digits_only() -> None:
    assert _digits("INV/2026-27/0006") == "2026270006"
    assert _digits("UTR-ABCD") == ""


def test_feasibility_report_html_renders_metrics_and_cost() -> None:
    rec = {
        "snapshot": {
            "siteAreaSqm": 108,
            "permissibleFarArea": 189,
            "setbackBuildableArea": 52.5,
            "actualGroundCoverage": 52.5,
            "possibleFloors": 3.6,
            "superBuiltupArea": 236.25,
            "estimatedProjectCostPaise": 472500000,  # ₹47,25,000
            "constructionRatePaise": 2000000,  # ₹20,000 / sqm
            "estimatedTimeline": "14–16 months",
            "compliancePct": 95,
            "breakdown": {"Civil": 55, "Electrical": 10},
            "generatedAt": "2026-06-26T10:00:00.000Z",
        },
        "generated_at": "2026-06-26T10:00:00.000Z",
        "project_ref": "PRJ-7",
        "project_title": "Sharma Villa",
    }
    html_str = _feasibility_report_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "Feasibility report — Sharma Villa (PRJ-7)" in html_str
    assert "₹47,25,000.00" in html_str  # estimated project cost
    assert "3.60" in html_str  # possible floors
    assert "14–16 months" in html_str
    assert "Civil" in html_str  # breakdown split


def test_feasibility_report_html_handles_minimal_snapshot() -> None:
    rec = {
        "snapshot": {"siteAreaSqm": 0, "estimatedProjectCostPaise": 0, "generatedAt": "x"},
        "generated_at": "x",
        "project_ref": "PRJ-8",
        "project_title": "Empty",
    }
    html_str = _feasibility_report_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "Feasibility report — Empty (PRJ-8)" in html_str


