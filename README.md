# ESTI Architect Platform

ESTI is an architecture office management platform for Indian freelance
architects and small architecture practices, developed by **Holagundi Consulting
Works (HCW)**.

ESTI is a modified fork of Dolibarr ERP & CRM. Dolibarr is retained as the
GPL-licensed backend foundation and compatibility layer; the product direction
is an architect-first Carbon React application for managing clients, projects,
phases, fee proposals, drawings, permits, invoices, consultants, and office
health.

## Product Focus

- Client enquiries, contacts, meetings, decisions, and approval history.
- Architecture projects with phase plans, jurisdiction, status, dates, and
  billing percentages.
- COA-aware fee proposals with scope, deliverables, exclusions, revisions, and
  client approval.
- Phase-linked invoicing with GST, SAC `998311`, TDS u/s 194J, receipts, and
  accountant-friendly exports.
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

- [Architecture Office Platform](docs/esti/AEC-PLATFORM.md)
- [Architect Practice Profile](docs/esti/ARCHITECT-PROFILE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [SPA Architecture](docs/esti/SPA-ARCHITECTURE.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Backend Profile](docs/esti/BACKEND-PROFILE.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)
- [India Localization and GST](docs/esti/INDIA-LOCALIZATION-GST.md)
- [Podman Runtime Plan](docs/esti/PODMAN-RUNTIME.md)
- [License and Notices](docs/esti/LICENSE-NOTICE.md)

## Repository Links

Use the ESTI repository for source, issues, updates, release notes, and public
documentation:

```text
https://github.com/HolagundiWorks/esti
```

Dolibarr references are kept only where required for license, copyright,
trademark attribution, upstream compatibility, or security patch review.

## License

ESTI is a modified fork of Dolibarr ERP & CRM.

Dolibarr is distributed under GPL-3.0-or-later. ESTI keeps the same license for
Dolibarr-derived code. Redistributed versions must preserve upstream notices,
include the GPL license text, provide corresponding source code, and avoid
implying that ESTI is the official Dolibarr distribution.

See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and
[docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).
