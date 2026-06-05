# ESTI Security Policy

## Supported Versions

Security reports are accepted for the active ESTI development branch and any
published ESTI release that has not reached end of support.

ESTI is a modified fork of Dolibarr ERP & CRM. Reports about vulnerabilities in
upstream-derived code are welcome here when they affect ESTI.

## Reporting A Vulnerability

Use the ESTI GitHub security advisory flow:

```text
https://github.com/HolagundiWorks/esti/security/advisories/new
```

If the advisory flow is unavailable, open a private security discussion with the
repository maintainers before publishing details.

## Scope

Reports should target the ESTI web application, REST/SOAP APIs, public pages,
installer/runtime profile, and ESTI-specific architect-office, GST/TDS, drawing,
permit, fee proposal, and supporting costing modules.

For local testing, use the Podman development runtime documented in:

```text
docs/esti/PODMAN-RUNTIME.md
```

## Required Test Setup

- Use the current ESTI branch or a supported ESTI release.
- Complete installation and lock the installer.
- Keep CSRF protection enabled.
- Run with a production-like web server layout where `htdocs/` is the web root
  and documents storage is outside the public web root.
- Do not enable development-only modules when reporting production-impact
  vulnerabilities unless the issue is specific to those modules.

## Responsible Disclosure

Do not access, modify, leak, or destroy data that does not belong to you. Avoid
denial-of-service testing and automated scans against systems you do not own.

ESTI keeps upstream Dolibarr attribution and GPL notices where legally required,
but ESTI security reports should be filed in the ESTI repository.
