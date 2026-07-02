# AORMS License and Notice Policy

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [AORMS documentation set](README.md). Canonical source for license,
> trademark, and attribution policy. This is an engineering policy, not legal
> advice — get a legal review before public/commercial distribution._

## Ownership

AORMS is **original software authored and owned by Holagundi Consulting Works
(HCW)**. There is no third-party application code in the product; the codebase is
HCW's own work across `backend/`, `frontend/`, `worker/`, and `packages/`.

## License

HCW chooses AORMS's license — proprietary, source-available, or open-source — at
its discretion. Add the chosen terms as a top-level `LICENSE` file and keep it
consistent across the repository and container images. Until a `LICENSE` file is
added, the code is "all rights reserved" by default.

## Third-party dependencies

AORMS builds on open-source libraries (e.g. Carbon, React, Fastify, tRPC,
Drizzle, ezdxf, WeasyPrint, pandas). Their licenses (MIT / Apache-2.0 / BSD /
LGPL, etc.) are permissive and compatible with HCW's options, but:

- Review each dependency's license before adding it.
- **WeasyPrint is GPL/BSD-licensed and runs as a separate process** in the
  Python worker (invoked, not linked into HCW code), which keeps it at arm's
  length. Confirm this boundary if a proprietary license is chosen, or swap to a
  permissively-licensed PDF engine.
- Keep a generated dependency-license report in releases.

## Trademark

- Product name is **AORMS**; **ESTI** names the embedded intelligence layer
  (code/repo keep the `esti` codename).
- Use HCW's own branding, logo, and favicon.

## Links

AORMS source, issues, releases, and docs:
`https://github.com/HolagundiWorks/esti`.

## Distribution checklist

- A `LICENSE` file with HCW's chosen terms is present and consistent.
- Third-party dependency licenses reviewed and a license report shipped.
- The WeasyPrint process boundary confirmed for the chosen license.
- Legal review completed before commercial distribution.
