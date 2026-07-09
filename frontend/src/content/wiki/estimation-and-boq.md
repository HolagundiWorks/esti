---
title: Estimation and BOQ
slug: estimation-and-boq
excerpt: In-browser measurement, rate books, materials takeoff, and bar bending schedules — linked to each project.
order: 3
section: Modules
updated: 2026-07-09
---

AORMS includes **project estimation and BOQ** inside the cloud workspace. You do **not** install a separate desktop application — open the project and work in **Estimation**.

---

## Open estimation on a project

1. **Projects** → select the project.
2. Open **Estimation** (or the cost/BOQ tab for your build).
3. The estimation workspace loads the project's structure model, items, and rate book links.

---

## Typical workflow

### 1. Structure and measurement

- Define or import a **structure model** (levels, elements, dimensions).
- Enter dimensions once — **derived quantities** cascade to child items where formulas apply.
- Use measurement tools aligned to architectural quantities (length, area, volume, count).

### 2. Rate book

- Attach a **rate book** — e.g. CPWD 2021 pack shipped with AORMS, or project-specific rates from the Item Library.
- Pick rate items into the BOQ; overrides stay on the project.

### 3. Items and BOQ

- The **items panel** lists BOQ lines with quantity, rate, and amount.
- Group by trade or specification section as your office prefers.
- Preview the BOQ before issuing.

### 4. Materials takeoff

- **Materials** derive from item recipes and takeoff rules.
- Cross-check against the specification catalogue in the Knowledge Bank.

### 5. Bar bending schedule (BBS)

- For RCC items, open the **steel schedule / BBS** panel.
- Enter bar marks, diameters, and shapes — weights compute from standard formulas.
- BBS totals feed the BOQ and material summaries.

### 6. Export and issue

- Generate **PDF** (BOQ, BBS) via the document worker when status shows READY.
- Store exports on the project record — transmittal or issue log as your QA requires.

---

## Link to cost management

Estimated totals inform:

- **Fee proposals** — sanity-check against construction cost for percentage fees.
- **Running accounts** — when site billing modules are active on the commission.
- **Client reporting** — scoped summaries through the portal if you choose to expose them.

---

## Tips for Indian practice

- Load **CPWD** or firm master rates from the Library — avoid retyping DSR year over year.
- Keep **one live model** per project — duplicate only when branching design options.
- Reconcile **steel weights** between BBS and supplier quotes before final tender issue.

---

## Frequently asked questions

### Is there a Windows app for BOQ?

No. Estimation runs in the browser as part of AORMS. Sign in at [aorms.in](https://aorms.in) and open the project.

### Can I use my own rate book?

Yes. Maintain custom items and rates in the **Item Library** and attach them to projects.

### Does ESTICAD still exist?

Drawing takeoff is handled **inside AORMS estimation** on linked drawings. There is no separate ESTICAD desktop companion to install.
