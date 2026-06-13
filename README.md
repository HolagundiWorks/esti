# ESTI — Architectural Office Resource Management System (AORMS)

ESTI is an **AORMS — Architectural Office Resource Management System**: greenfield
software to run an Indian architecture office, **not** a general ERP. Developed
by **Holagundi Consulting Works (HCW)** for Indian freelance architects and small
architecture practices.

Stack: a **TypeScript** backend (Fastify + tRPC + PostgreSQL), a **Carbon React**
SPA, and a **Python** worker for drawings/PDF/reconciliation. See
[docs/esti/ARCHITECTURE.md](docs/esti/ARCHITECTURE.md) and
[DEVELOPMENT.md](DEVELOPMENT.md).

## Product focus

- Client enquiries, contacts, meetings, decisions, and approval history.
- Architecture projects with phase plans, jurisdiction, status, dates, and
  billing percentages.
- COA-aware fee proposals with scope, deliverables, exclusions, revisions, and
  client approval.
- Phase-linked invoicing under the firm's GST system (Not applicable /
  Composition 6% / Regular 18%), SAC 998321–998339, TDS u/s 194J, and exports.
- Reconciliation of payments, TDS against 26AS/AIS, and GST output vs returns.
- Permit and compliance tracking (BPAS, RERA, Fire/Aviation/Env NOC, OC, CC).
- Drawing and document vault: register, revision control, issue sets,
  watermarks, and approval logs.
- Project-scoped client and consultant collaboration, with audited approvals and
  requests expanding through the roadmap.
- Architect-side contractor/tender coordination: invitations, bids, RFIs,
  submittals, inspections, snags, and awards.
- DXF/PDF drawing viewer and measurement takeoff feeding BOQ / fee quantities.

DSR/SOR rate reference and BOQ/quantity structures exist to support architect
workflows such as tender costing and drawing takeoff. General-purpose ERP,
commerce, warehouse, labour, subcontractor-accounting, and contractor execution
systems are out of scope.

## Fixed India profile

India · INR only · FY 1 Apr–31 Mar · COA registration number as the firm Legal ID
· Indian lakh/crore number format · GST (the three systems above) · Carbon UI in
light/dark. These are hardcoded — see [docs/esti/INDIA-PROFILE.md](docs/esti/INDIA-PROFILE.md).

## Run it (everything in containers)

```sh
cp .env.example .env
podman compose -f compose.yaml up -d --build
# SPA      → http://localhost:5173
# Backend  → http://localhost:4000/health
```

Full instructions, including local (non-container) dev, are in
[DEVELOPMENT.md](DEVELOPMENT.md).

## Documentation

The documentation set is in [docs/esti](docs/esti):

- [Product Vision](docs/esti/PRODUCT-VISION.md)
- [Product Requirements](docs/esti/PRD.md)
- [Architect Practice Profile](docs/esti/ARCHITECT-PROFILE.md)
- [System Architecture](docs/esti/ARCHITECTURE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [India Profile](docs/esti/INDIA-PROFILE.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)
- [License and Notices](docs/esti/LICENSE-NOTICE.md)

## License

ESTI is original software owned by Holagundi Consulting Works. HCW chooses the
license — see [docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).

## Repository

Source, issues, releases, and docs: `https://github.com/HolagundiWorks/esti`.
