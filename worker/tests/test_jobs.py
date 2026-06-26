"""Unit tests for the worker's pure helpers (no DB / object storage / network)."""
from esti_worker.jobs import HANDLERS
from esti_worker.jobs.pdf import (
    _cost_report_html,
    _feasibility_report_html,
    _final_account_html,
    _inr,
    _running_bill_html,
)
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


def test_final_account_html_renders_reconciliation_and_attestations() -> None:
    rec = {
        "ref": "FA/2026-27/0001",
        "title": "Tower A — civil works final account",
        "status": "CLOSED",
        "notes": "Closed after no-claim cert.",
        "original_contract_paise": 50000000,  # ₹5,00,000
        "variation_paise": 5000000,  # ₹50,000
        "gross_billed_paise": 54000000,  # ₹5,40,000
        "retention_held_paise": 2700000,  # ₹27,000
        "retention_released_paise": 2700000,
        "advance_recovered_paise": 0,
        "tax_tds_paise": 1080000,  # ₹10,800
        "other_recovery_paise": 0,
        "net_paid_paise": 50220000,  # ₹5,02,200
        "final_certified_paise": 55000000,  # ₹5,50,000
        "balance_due_paise": 4780000,  # ₹47,800
        "no_claim_received": True,
        "client_final_approval": True,
        "closed_at": "2026-06-26",
        "project_ref": "PRJ-1",
        "project_title": "Sample tower",
        "wp_ref": "WP-0001",
        "wp_name": "Civil works",
    }
    html_str = _final_account_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "Final account" in html_str
    assert "FA/2026-27/0001" in html_str
    assert "Civil works (WP-0001)" in html_str
    assert "Adjusted contract value" in html_str
    assert "₹5,50,000.00" in html_str  # original + variation adjusted contract
    assert "Less: Retention held" in html_str
    assert "-₹27,000.00" in html_str
    assert "Balance due to contractor" in html_str
    assert "₹47,800.00" in html_str
    assert "No-claim certificate received" in html_str
    # A zero-value deduction (advance recovery) is omitted.
    assert "Advances recovered" not in html_str


def test_cost_report_html_renders_kpis_packages_and_checks() -> None:
    snapshot = {
        "kpis": {
            "estimatedPaise": 100000000,  # ₹10,00,000
            "tenderedPaise": 98000000,
            "awardedPaise": 95000000,  # ₹9,50,000
            "billedGrossPaise": 60000000,  # ₹6,00,000
            "certifiedNetPaise": 57000000,
            "pendingBillsCount": 1,
            "pendingBillsPaise": 5000000,
            "approvedDeviations": {"count": 2, "valuePaise": 1500000},
            "unapprovedDeviations": {"count": 0, "valuePaise": 0},
            "variationValuePaise": 2500000,  # ₹25,000
        },
        "overrunPct": -5.0,
        "packages": [
            {
                "id": "wp1",
                "ref": "WP-0001",
                "name": "Civil works",
                "contractor": "Acme Builders",
                "awardedPaise": 95000000,
                "variationPaise": 2500000,
                "billedPaise": 60000000,
                "openDeviations": 0,
                "status": "GREEN",
            }
        ],
        "contractors": [
            {
                "id": "c1",
                "name": "Acme Builders",
                "billedPaise": 60000000,
                "certifiedPaise": 57000000,
                "pendingBills": 1,
            }
        ],
        "riskNotes": [
            {
                "kind": "BILL_DEVIATION",
                "severity": "HIGH",
                "label": "Billing exceeds awarded value",
                "detail": "Billed ₹6,00,000 against awarded ₹9,50,000",
                "ref": "WP-0001",
            }
        ],
        "generatedAt": "2026-06-26T10:00:00.000Z",
    }
    rec = {
        "snapshot": snapshot,
        "generated_at": "2026-06-26T10:00:00.000Z",
        "pdf_status": "PENDING",
        "pdf_key": None,
        "project_ref": "PRJ-1",
        "project_title": "Sample tower",
    }
    html_str = _cost_report_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "Cost report — Sample tower (PRJ-1)" in html_str
    assert "-5.0% vs estimate" in html_str
    assert "₹10,00,000.00" in html_str  # estimated KPI
    assert "₹9,50,000.00" in html_str  # awarded KPI / package awarded
    assert "Civil works" in html_str
    assert "Within budget" in html_str  # GREEN status label
    assert "Acme Builders" in html_str  # contractor row
    assert "Billing exceeds awarded value" in html_str  # risk note
    assert "Advisory only" in html_str


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


def test_cost_report_html_no_risks_shows_clean() -> None:
    rec = {
        "snapshot": {"kpis": {}, "overrunPct": None, "packages": [], "contractors": [], "riskNotes": []},
        "generated_at": "2026-06-26T10:00:00.000Z",
        "project_ref": "PRJ-2",
        "project_title": "Empty project",
    }
    html_str = _cost_report_html(rec, {"legalName": "HCW", "addressLines": []})
    assert "No cost risks detected." in html_str
    assert "No estimate baseline yet" in html_str
    assert "No work packages yet" in html_str
