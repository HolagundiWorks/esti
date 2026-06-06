# ESTI Backend Profile — Dolibarr Decommissioning

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). ESTI is now greenfield with
> no Dolibarr backend (see [ARCHITECTURE](ARCHITECTURE.md) ADR-01). This document
> covers decommissioning the legacy Dolibarr tree. The forward backend is the
> ESTI TypeScript service; modules are in the [Module Map](ARCHITECT-PROFILE.md)._

## Status

The earlier plan kept a stripped Dolibarr as a data backbone. That is
**superseded** — ESTI drops Dolibarr entirely and owns its own PostgreSQL schema.
The whole `htdocs/` Dolibarr tree is now **legacy and unwired**: nothing in the
greenfield stack depends on it.

A first, statically-safe deletion wave already removed eight standalone modules
(`intracommreport, asterisk, zapier, collab, ftp, debugbar, bookmarks,
datapolicy`). Because ESTI no longer runs Dolibarr, the remaining tree does
**not** require boot-tested strip waves — it can be deleted wholesale once the
items below are ported.

## What to port before deleting `htdocs/`

- **DSR/SOR reference data** from `esti_dsrsor` → ESTI PostgreSQL tables
  (re-implemented clean-room; port the data, not the GPL code — see
  [LICENSE-NOTICE](LICENSE-NOTICE.md)).
- Confirm the greenfield app covers the data Dolibarr held: **clients**,
  **users**, **documents**, **invoices**. These are ESTI-native tables now.

## After the port

- Delete the `htdocs/` Dolibarr tree and the `containers/` Dolibarr/MariaDB
  runtime; replace with the greenfield Podman pod (Postgres, Redis, backend,
  worker, frontend, MinIO) in [ARCHITECTURE](ARCHITECTURE.md).
- Remove Dolibarr-specific docs references repo-wide.

## Not re-introduced

Generic ERP surfaces (CRM, commerce, HR, stock, purchase, POS, multi-currency,
etc.) are not part of ESTI and are not rebuilt. ESTI is a focused, single-firm
architecture-practice platform — see [PRODUCT-VISION](PRODUCT-VISION.md).
