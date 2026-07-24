---
title: Fee stages to Studio invoices — closing the billable path
date: 2026-07-22
excerpt: Consultancy engagements carry fee stages that connect to AORMS-Studio invoices — so delivered advisory work stops sitting unbilled between two systems.
tags: Finance, Product, Operations, India
author: Human Centric Works
---

Fee recovery fails in the gap between **“stage done”** and **“invoice raised.”**
That gap is worse when engineering engagements live in one tool and GST invoices
live in another.

On the AORMS spine, **fee stages** on a consultancy engagement are meant to join
the same commercial trail as **Studio invoices** — one billable path the office
can actually close.

## What “connected” means

A fee stage is not a sticky note. It has terms: fee model, totals, and — when
linked — the Studio project that owns the invoice trail. Staff can edit terms
while the stage is still open; once a stage is invoiced or paid, destroy actions
stay out of the way so the audit story does not rewrite itself.

Empty fee-stage lists get a clear call to action instead of a blank panel.
Confirmations and toasts make create / edit / remove feel like office work, not
a silent API call.

## Why architecture and engineering share this

**AORMS-Studio** already bills COA-style stages with Indian GST detail. Engineering
engagements on **AORMS-Consultancy** reuse that commercial grammar instead of
inventing a second invoicing dialect. The walkthrough that gates consultancy
launch is partly about this UX: principals must see stage → invoice without
guessing which screen owns the truth.

## Practical habit

1. Put fee stages on the engagement when the proposal is agreed  
2. Link the Studio project when the engagement is real work  
3. Raise the invoice from the stage path — do not re-key totals in a side sheet  
4. Treat INVOICED / PAID as durable — change terms earlier, not after the tax trail

## Read next

- [How architecture firms lose revenue](/blog/how-architecture-firms-lose-revenue)
- [GST invoicing for architects](/blog/gst-invoicing-for-architects)
- [AORMS-Consultancy on the same spine](/blog/aorms-consultancy-same-spine)
