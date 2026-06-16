"""Smoke tests for compliance PDF rendering (mocked DB/storage/WeasyPrint)."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from esti_worker.jobs.pdf import render_pdf


SAMPLE_ASSESSMENT = {
    "id": "00000000-0000-0000-0000-000000000011",
    "status": "DRAFT",
    "assessment_phase": "PRE_DESIGN",
    "overall_score": 72,
    "site_inputs": {"siteAreaSqm": 240, "proposedHeightM": 9},
    "dev_control": {
        "maxFar": 1.75,
        "maxBuiltUpSqm": 420,
        "maxCoveragePct": 60,
        "maxHeightM": 45,
        "usedFAR": 0,
        "usedGroundCoverPct": 0,
        "score": 100,
    },
    "basement": None,
    "sustainability": {"score": 50, "checks": []},
    "approval_readiness": {"readiness": "PARTIAL", "score": 40, "documents": []},
    "violations": None,
    "project_title": "Demo Villa",
    "project_ref": "PRJ/2026-27/0001",
    "client_name": "Demo Client",
    "site_address": "Indiranagar, Bengaluru",
    "authority": "BBMP",
    "district": "Bengaluru Urban",
    "state": "Karnataka",
    "building_use": "RESIDENTIAL",
    "effective_date": "2015-01-01",
    "issued_at": None,
}

FIRM = {
    "legalName": "HCW Architects",
    "addressLines": ["Bengaluru, Karnataka"],
    "email": "hi@hcw.in",
    "phone": "",
    "gstin": "",
    "pan": "",
    "coaRegNo": "CA/1",
}


class CompliancePdfSmokeTests(unittest.TestCase):
    @patch("esti_worker.jobs.pdf.update_site_assessment")
    @patch("esti_worker.jobs.pdf.fetch_site_assessment_full")
    @patch("esti_worker.jobs.pdf.put_bytes")
    @patch("weasyprint.HTML")
    def test_render_compliance_pdf_writes_storage(
        self,
        html_cls: MagicMock,
        put_bytes: MagicMock,
        fetch_full: MagicMock,
        update_sa: MagicMock,
    ) -> None:
        fetch_full.return_value = SAMPLE_ASSESSMENT
        html_cls.return_value.write_pdf.return_value = b"%PDF-1.4 compliance"

        result = render_pdf(
            {"target": "compliance", "id": SAMPLE_ASSESSMENT["id"], "firm": FIRM},
        )

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["target"], "compliance")
        self.assertGreater(result["bytes"], 0)
        put_bytes.assert_called_once()
        args = put_bytes.call_args[0]
        self.assertTrue(str(args[1]).startswith("pdf/compliance/"))
        self.assertEqual(args[2], b"%PDF-1.4 compliance")
        update_sa.assert_any_call(SAMPLE_ASSESSMENT["id"], pdf_status="PROCESSING")
        update_sa.assert_any_call(
            SAMPLE_ASSESSMENT["id"],
            pdf_key=f"pdf/compliance/{SAMPLE_ASSESSMENT['id']}.pdf",
            pdf_status="READY",
        )


if __name__ == "__main__":
    unittest.main()
