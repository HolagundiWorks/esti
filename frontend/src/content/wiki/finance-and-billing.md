---
title: Finance and billing
slug: finance-and-billing
excerpt: COA fee proposals, GST invoices, reconciliation, filing abstracts, and project expenses.
order: 4
section: Modules
domain: management
updated: 2026-07-09
---

AORMS finance modules follow **Indian consultancy practice** — COA fee scales, GST, TDS reconciliation, and April–March reporting context.

---

## Fee proposals

**Route:** Office ? Proposals (`/office/proposals`)

1. Create a **fee proposal** or **scope agreement** on the unified proposal model.
2. Enter stage-wise fees, percentages, or lump sums per COA convention.
3. Track **internal approval** and **client approval** on the same record.
4. Approved proposals become the **billing baseline** for the project.

---

## GST invoicing

**Route:** Finance ? Invoices (`/finance/invoices`)

1. **Create invoice** — select client, project, and tax profile.
2. Line items use consultancy **SAC codes**; CGST/SGST or IGST from place of supply.
3. Amounts are stored in **paise** internally; the UI formats INR.
4. Issue PDF; track payment status and credit notes as your policy requires.

---

## Reconciliation

**Route:** Finance ? Reconcile (`/finance/reconcile`)

1. Import **bank statements**, **26AS**, **AIS**, or **GSTR** files (formats supported by the worker).
2. Review suggested matches; confirm or override.
3. Unmatched entries stay flagged for the accountant.

---

## Filing abstracts

**Route:** Finance ? Filing (`/finance/filing`)

- Generate **GST** and **TDS** filing abstracts for the compliance period.
- Export for your CA or internal review — tied to reconciled data where possible.

---

## Office cash book and project expenses

- **Cash book** — office-level receipts and payments.
- **Project expenses** — attribute costs to projects for internal job costing.

---

## Payroll (optional)

When HR is enabled for your firm:

- **Finance ? Payroll** — payslips from attendance and salary structure.
- Requires `hr:manage` capability.

---

## Workflow: bill a design stage

1. Confirm the **stage is complete** on the project (tasks/decisions closed).
2. Open **Proposals** — verify the milestone amount for that stage.
3. **Create invoice** for the milestone; attach reference to the proposal line.
4. Send PDF to client; record receipt in reconcile when paid.
5. Studio Intelligence **Financial** zone should return to green for that project.

---

## Frequently asked questions

### Does AORMS file GST returns directly?

AORMS prepares **abstracts and reconciled data** — your CA files through the government portal. Integration depth may expand; check release notes.

### Are fees in rupees or paise?

Display is rupees; storage is integer **paise** for precision.

### Can clients see invoices in the portal?

Expose as your office policy dictates — fee **status** is visible in the client portal; invoice PDFs per your sharing practice.
