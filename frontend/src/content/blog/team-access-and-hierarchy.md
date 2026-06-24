---
title: Smart access — team hierarchy and who can see what
date: 2026-05-28
excerpt: Roles, capabilities, staff levels, teams, and scoped portals. Everyone sees exactly what their work needs — and nothing it doesn't.
tags: Team, Security
author: Holagundi Consulting Works
---

A practice is not flat. A principal, a project lead, a junior architect, an
accounts person, and an external contractor have very different needs — and very
different things they should *not* see. AORMS models that hierarchy directly.

## Capabilities, not just roles

Access is decided by **capability**, not a blunt role flag. Each action — manage
invoices, approve fees, view reports, administer the firm — is a named capability,
and a single rule, `can(role, capability)`, governs the whole system. Sensitive
operations sit behind owner-only or admin-only tiers. The result is real
least-privilege: a junior can do their work without ever touching payroll or firm
settings.

## Staff levels and teams

Members carry a **staff level** (L1 Principal through L4 support) and can be
grouped into **named teams**. Selecting a team onto a project staffs all its
members at once — so a "Civil package" team or a "Competition" team becomes a
one-click assignment instead of a dozen.

## Scoped portals for outsiders

The people *outside* the firm get their own doors, each scoped to exactly their
slice:

- **Clients** see issued drawings, transmittals, invoices, and their own
  approvals — never internal tasks or finances.
- **Contractors** get tender documents, issued drawings and transmittals, and a
  channel to raise queries — scoped to their project.
- **Consultants** get the collaborator portal for their engagement.

Each portal is a separate, narrow surface — not a stripped-down copy of the staff
app. Access mirrors responsibility, which is the only access model that stays
safe as a practice grows.
