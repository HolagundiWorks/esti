# ESTI Architect Platform

ESTI is an architecture office management platform for Indian freelance
architects and small architecture practices, developed by **Holagundi Consulting
Works (HCW)**.

ESTI is an **AORMS — Architectural Office Resource Management System**: software
to run an Indian architecture office, not a general ERP. It began as a Dolibarr
fork but is being rebuilt as **greenfield, original software** (no Dolibarr, no
PHP) — a TypeScript backend, a Carbon React SPA, and a Python worker for
drawings/PDF/reconciliation — managing clients, projects, phases, fee proposals,
drawings, permits, invoices, consultants, and office health. See
[docs/esti/ARCHITECTURE.md](docs/esti/ARCHITECTURE.md) and
[DEVELOPMENT.md](DEVELOPMENT.md).

## Product Focus

- Client enquiries, contacts, meetings, decisions, and approval history.
- Architecture projects with phase plans, jurisdiction, status, dates, and
  billing percentages.
- COA-aware fee proposals with scope, deliverables, exclusions, revisions, and
  client approval.
- Phase-linked invoicing under the firm's GST system (Not applicable /
  Composition 5% / Regular 18%), SAC 998321–998339, TDS u/s 194J, and exports.
- Reconciliation of payments, TDS against 26AS/AIS, and GST output vs returns.
- Permit and compliance tracking for BPAS, RERA, Fire NOC, Aviation NOC,
  environmental clearance, OC, CC, and local authorities.
- Drawing and document vault with drawing register, revision control, issue
  sets, watermarks, and approval logs.
- Consultant and collaborator tracking for structural, MEP, interiors,
  landscape, fire, survey, legal, and other project teams.
- Client portal for read-only project, drawing, invoice, and approval access.
- DXF/PDF drawing viewer and takeoff tools that support BOQ or fee proposal
  quantities.

DSR/SOR is retained as a supporting reference/costing engine for architecture
workflows. Future BOQ/takeoff support will be rebuilt for architect workflows.
Contractor operations such as labour teams, site stock, warehouse workflows,
purchase orders, GRN, RA billing, and measurement book certification are not
first-release goals.

## India-First Direction

ESTI defaults to:

- India as the operating country.
- INR as the operating currency.
- Asia/Kolkata as the timezone.
- Indian language support, starting with maintained Indian locales.
- GST-oriented tax workflows instead of VAT-first setup.
- IBM Carbon Design System, IBM Plex Sans, Carbon icons, and light/dark modes.

## Runtime

A development Podman runtime is available in [containers](containers).

If Podman Compose is installed:

```sh
cd containers
cp env.example .env
podman compose --env-file .env -f podman-compose.yml up --build
```

On Windows without a Compose provider:

```powershell
.\containers\start-dev.ps1 -HttpPort 8090
```

Then open:

```text
http://localhost:8090/install/
```

## Documentation

ESTI planning documents are in [docs/esti](docs/esti):

- [Product Vision](docs/esti/PRODUCT-VISION.md)
- [Architect Practice Profile](docs/esti/ARCHITECT-PROFILE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [System Architecture](docs/esti/ARCHITECTURE.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Backend Profile](docs/esti/BACKEND-PROFILE.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)
- [India Profile](docs/esti/INDIA-PROFILE.md)
- [Podman Runtime Plan](docs/esti/PODMAN-RUNTIME.md)
- [License and Notices](docs/esti/LICENSE-NOTICE.md)

## Repository Links

Use the ESTI repository for source, issues, updates, release notes, and public
documentation:

```text
https://github.com/HolagundiWorks/esti
```

Dolibarr references are kept only to identify the original GPL provenance of any
still-present legacy Dolibarr code.

## License

ESTI is being rebuilt as greenfield, original software. While the legacy
`htdocs/` Dolibarr tree is still present, the distributed combination remains
**GPL-3.0-or-later**; once it is removed and no Dolibarr code remains, ESTI is
original work and **HCW chooses its license**.

See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and
[docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).
