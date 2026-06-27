---
title: We rebuilt estimation to feel like a measurement book, not a form
date: 2026-06-27
excerpt: Estimators think in elements and dimensions, not dialog boxes. Here is how we made AORMS's BOQ estimation keyboard-first — pick a rate-book item, build the quantity element by element, and watch the totals compute as you type.
tags: Product, Estimation
author: Holagundi Consulting Works
coverImage: /esti-logo.png
---

Ask any estimator who has spent years with an Excel sheet and a measurement book what slows them down in "modern" software, and the answer is always the same: the forms. Open a dialog, type a description, choose a unit, enter a quantity, click save, repeat. It looks tidy. It is also slower than the paper it replaced.

So when we rebuilt estimation in AORMS, we started from one rule:

> Think → Type → Calculate → Continue. The estimator should never have to stop typing.

## The problem with form-first estimating

A bill of quantities is not a sequence of unrelated form submissions. It is a continuous act of measurement. You read a drawing, you call out elements — *Wall A, Wall B, the lintel band* — and for each one you write down a few dimensions and let arithmetic do the rest. The total is the sum of the parts, and the parts are the record.

Most BOQ tools throw that away. They store a single quantity number per line and make you arrive at it somewhere else — a side calculator, a spreadsheet, your head. Next month, when someone asks *"where did 42 sqm come from?"*, the working-out is gone.

## What we built instead

The costing window is now a single workspace with no modals. You pick the **rate book** for the estimate in a side panel, press `+ Add Item`, and start typing — the rate-book search filters as you type, you press Enter, and the line appears with its rate already filled in. No dialog, no save button, no wizard.

Every line opens a nested **measurement book** — the same `Element · Nos · Length · Breadth · Depth` table the estimator already keeps by hand:

- Type `Wall A`, then `2`, `5`, `3`, and press Enter — a new row opens for the next element.
- Each row's quantity is calculated instantly; the line quantity is the running sum.
- The columns adapt to the line's unit: square-metre items ask for length and breadth, cubic-metre items add depth, running-metre items ask only for length. You never pick a formula — the unit decides what to measure.

The amount and the project total update as you go, because the quantity is *derived* from the book rather than typed over it. And because the breakdown is saved, reopening the estimate next week shows every element exactly as you left it.

## The honest engineering bit

Two things made this clean to build without a schema change. The quantity already lived as a stored number on the BOQ line, and the line already carried a free-form payload for provenance. So the measurement rows live there, the server recomputes the quantity from them, and the existing totals engine does the rest. The "Excel feel" — tab across cells, Enter starts the next row, autosave on every change — is keyboard logic, not a heavyweight spreadsheet grid. It stays inside our design system with no custom widgets.

## It does not stop at the estimate

An estimate that ends at a number is half a tool. In AORMS the approved estimate becomes the project BOQ, and the same record carries the job through construction: issue it to contractors as a tender, collect item-wise bids and award, turn the award into a priced work package, measure work on site in a measurement book, bill it on running-account bills with deductions, and watch a cost dashboard compare estimated, tendered, awarded, billed and certified. A cost overrun on site is visible against the figure you estimated at the start — not discovered at the end.

If you want the feature-page version, see [architecture estimation software](/architecture-estimation-software). To try it on a working office, [open the demo](/demo).
