# ESTI License and Notice Policy

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for
> license, trademark, and attribution policy. This is an engineering policy, not
> legal advice — get a legal review before public/commercial distribution._

## Two phases: transitional fork → greenfield original

ESTI started as a fork of **Dolibarr ERP & CRM** (GPL-3.0-or-later) but is being
rebuilt as **greenfield, original software** with **no Dolibarr code and no PHP**
(see [ARCHITECTURE](ARCHITECTURE.md) ADR-01). Licensing follows that transition.

### While the Dolibarr tree (`htdocs/`) is still present

- The repository still contains Dolibarr GPL code. While that code is present
  and distributed, the distributed combination is governed by **GPL-3.0-or-later**.
- Keep `COPYING`, `COPYRIGHT`, and third-party license files intact.
- Do not strip Dolibarr copyright headers from Dolibarr-derived files.
- The legacy `esti_dsrsor` PHP module is Dolibarr-derived (built on Dolibarr's
  module/CommonObject framework) and is therefore GPL while it exists.

### Greenfield ESTI code (`backend/`, `frontend/`, `worker/`, `packages/`)

- This is **original work authored by Holagundi Consulting Works**. It does not
  incorporate or derive from Dolibarr GPL code.
- Keep it **clean-room**: port DSR/SOR and other *data/facts* (which are not
  copyrightable), but do **not** copy Dolibarr source, schemas-as-code, or
  GPL-derived logic into the greenfield tree. This is what preserves HCW's
  freedom to license it independently.

### After the Dolibarr tree is removed

- Once `htdocs/` (and any Dolibarr-derived module) is deleted and nothing GPL
  remains, ESTI is **original software and HCW chooses its license** —
  proprietary, source-available, or a permissive/again-GPL open-source license,
  at HCW's discretion.
- Until then, treat distributions as GPL-3.0-or-later to be safe.

## Trademark

- Product name is **ESTI** / **ESTI Architect Platform**.
- Do not imply affiliation with or endorsement by Dolibarr.
- Remove all Dolibarr visual branding from UI, docs, and container metadata
  (largely moot once the greenfield UI replaces the legacy tree).

## Links

ESTI source, issues, releases, and docs:
`https://github.com/HolagundiWorks/esti`. Dolibarr URLs remain only where needed
to identify the original GPL provenance of any still-present Dolibarr code.

## Distribution Checklist

- If any Dolibarr code is included: GPL text, full corresponding source, and
  upstream + ESTI copyright notices are present.
- If fully greenfield: HCW's chosen `LICENSE` file is present and consistent
  across the repo and container images.
- Third-party dependency licenses (Carbon, ezdxf, WeasyPrint, etc.) reviewed and
  compatible with the chosen license.
- Legal review completed before commercial distribution.
