# ESTI License and Notice Policy

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for
> license, trademark, and attribution policy._

## Current Upstream License

This repository contains Dolibarr ERP & CRM. The upstream project is licensed as
GPL-3.0-or-later, as stated in the top-level `COPYING` and `COPYRIGHT` files.
Some bundled third-party libraries and assets have their own compatible licenses,
listed in `COPYRIGHT` and in dependency-specific license files.

## ESTI Fork License

ESTI should be distributed under:

```text
GNU General Public License v3.0 or later
SPDX-License-Identifier: GPL-3.0-or-later
```

This is the correct license direction for a fork of Dolibarr's GPL codebase.
Do not replace the GPL with a proprietary, MIT, Apache-only, or closed-source
license for files derived from Dolibarr.

## Required Notices

Every ESTI distribution must keep:

- The top-level `COPYING` file with the GPL text.
- The upstream `COPYRIGHT` file, updated only with accurate ESTI additions.
- Third-party license files included with bundled libraries.
- Clear notices that ESTI is a modified fork of Dolibarr ERP & CRM.
- A source-code offer whenever ESTI binaries, container images, or hosted
  install packages are distributed to third parties.

## Trademark Policy

The Dolibarr name and related branding are restricted by the upstream trademark
policy. ESTI should:

- Use `ESTI Architect Platform` or `ESTI` as the visible product name.
- Avoid implying that ESTI is the official Dolibarr distribution.
- Keep an attribution such as `ESTI is a modified fork of Dolibarr ERP & CRM`.
- Replace Dolibarr visual branding in the user interface, documentation, and
  container metadata after completing a trademark review.

## Link Policy

ESTI public links for source code, issues, updates, releases, support, module
distribution, and documentation must point to:

```text
https://github.com/HolagundiWorks/esti
```

Dolibarr URLs should remain only when they are needed to identify upstream legal
notices, original copyrights, GPL source provenance, trademark context, or
engineering-only upstream merge references. Do not send ESTI users to Dolibarr
update feeds, marketplaces, partner pages, demos, or support pages as the normal
ESTI path.

## New ESTI Contributions

New original ESTI code should carry GPL-compatible notices. Suggested header:

```php
/**
 * ESTI Architect Platform - architecture office management fork based on Dolibarr.
 *
 * Copyright (C) 2026 ESTI contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
```

Use this only for new ESTI files. Do not remove or overwrite upstream Dolibarr
headers in modified upstream files.

## Distribution Checklist

- GPL license included.
- Source code available for the exact distributed version.
- Upstream and ESTI copyright notices preserved.
- Third-party licenses reviewed before dependency removal or addition.
- Container images include license labels and source repository reference.
- Dolibarr trademark usage reviewed before public release.

This document is an engineering policy, not legal advice. A legal review is
recommended before commercial distribution.
