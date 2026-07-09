---
title: Finance and billing
slug: finance-and-billing
excerpt: COA fee proposals, GST invoices, reconciliation, filing abstracts, and project expenses.
order: 4
section: Modules
updated: 2026-07-09
---

AORMS finance modules follow **Indian consultancy practice** — COA fee scales, GST, TDS reconciliation, and April–March reporting context.

---

## Fee proposals

**Route:** Office → Proposals (`/office/proposals`)

1. Create a **fee proposal** or **scope agreement** on the unified proposal model — the same form covers both; a proposal is a fee proposal when it uses a COA/per-sqm fee basis, and a scope agreement when it's mostly a lump-sum with a filled-in scope.
2. Enter fees on the COA scale, per sq.m rate, or as a lump sum — the dialog flags amounts below the COA minimum and requires an override reason to proceed.
3. Track **client approval** (Pending / Approved / Rejected / On hold) from the project's Pipeline → Activation panel — this is also the gate that activates the project.
4. Approved proposals become the **billing baseline** for the project.

---

## GST invoicing

**Route:** Invoices (`/invoices`)

1. **New invoice** — select the project; the firm's GST profile (Not applicable / Composition / Regular, set in Company account) drives the tax logic automatically.
2. Regular firms add a consultancy **SAC code**; tax splits CGST/SGST intra-state or IGST inter-state. TDS (10% u/s 194J) applies per the firm default.
3. Amounts are stored in **paise** internally; the UI formats INR.
4. Move Draft → **Issue** (queues the PDF) → **Paid**, or **Cancel** instead of deleting an issued invoice.

---

## Reconciliation

**Route:** Reconcile (`/reconcile`)

1. Upload a **bank statement** (CSV/XLSX) with a batch label; remap Date/Description/Amount columns if headers don't match.
2. Review the matched lines (by reference and amount) in the batch.
3. **Settle matched** to mark those invoices Paid, or export the batch as XLSX. Unmatched lines stay flagged.

---

## Filing abstracts

**Route:** Financial Reports (`/filing`)

- **GST abstract** and **TDS abstract** tabs — a period-by-period breakdown built from issued/paid invoices.
- **Export register** downloads an XLSX invoice register for your CA.

---

## Office cash book and expenses

- **Cash book** (`/accounting/cash-book`) and **Office Expenses** (`/accounting/office-expenses`) share one form — category, amount, date, payee, payment method — for firm overhead. Each entry moves Draft → Submitted → Audited (or Rejected) → Closed.

---

## Payroll (optional)

When HR is enabled for your firm:

- **Finance → Payroll** — payslips from attendance and salary structure.
- Requires `hr:manage` capability.

---

## Workflow: bill a design stage

1. Confirm the **stage is complete** on the project (tasks/decisions closed).
2. Open **Proposals** — verify the milestone amount for that stage.
3. **Create invoice** for the milestone; attach reference to the proposal line.
4. Send PDF to client; record receipt in reconcile when paid.
5. Studio Intelligence's **ESTI** tab finance snapshot should return to green for that project.

---

## Frequently asked questions

### Does AORMS file GST returns directly?

AORMS prepares **abstracts and reconciled data** — your CA files through the government portal. Integration depth may expand; check release notes.

### Are fees in rupees or paise?

Display is rupees; storage is integer **paise** for precision.

### Can clients see invoices in the portal?

Expose as your office policy dictates — fee **status** is visible in the client portal; invoice PDFs per your sharing practice.
