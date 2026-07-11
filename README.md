# AORMS — Accelerated Operational Resources Management System

**AORMS** is the **platform** for consulting-firm operations (workflow
consolidation, collaboration, audit-first AI). The **shipped workspace** in this
repo is **AORMS-Studio** (`aorms-studio`) — software to run an Indian architecture office.
**ESTI** (Embedded Studio Intelligence) is the intelligence/agent layer embedded
in each workspace. Developed by **Holagundi Consulting Works (HCW)**.
*(The repo, `@esti/*` packages and `esti_*` tables keep the `esti` codename.)*

Nomenclature: [docs/esti/AORMS-PLATFORM-NOMENCLATURE.md](docs/esti/AORMS-PLATFORM-NOMENCLATURE.md).
Platform north-star: [docs/esti/AORMS-DEVELOPMENT-SPEC.md](docs/esti/AORMS-DEVELOPMENT-SPEC.md).

Stack: a **TypeScript** backend (Fastify + tRPC + PostgreSQL), a **React** SPA on
**Material UI** styled by the shared [HCW-UI-Kit](docs/esti/HCW-UI-KIT.md)
(`@hcw/ui-kit`, including the landing page), and a **Python** worker for
drawings/PDF/reconciliation. See
[docs/esti/ARCHITECTURE.md](docs/esti/ARCHITECTURE.md) and
[INSTALL.md](INSTALL.md).

## Product focus

- Client enquiries, contacts, meetings, decisions, and approval history.
- Architecture projects with phase plans, jurisdiction, status, dates, and
  billing percentages.
- COA-aware fee proposals with scope, deliverables, exclusions, revisions, and
  client approval.
- Phase-linked invoicing under the firm's GST system (Not applicable /
  Composition 6% / Regular 18%), SAC 998321–998339, TDS u/s 194J, and exports.
- Reconciliation of payments, TDS against 26AS/AIS, and GST output vs returns.
- Statutory permit tracking (BPAS, RERA, Fire/Aviation/Env NOC, OC, CC).
- Drawing and document vault: register, revision control, issue sets,
  watermarks, and approval logs.
- Project-scoped client and consultant collaboration, with audited approvals and
  requests expanding through the roadmap.
- Architect-side site supervision: site instructions, inspections, snags, and
  progress reports.
- Drawing register: DXF upload, revision control, issue PDFs, and transmittals.
- Project-scoped client and consultant collaboration, with audited approvals and
  requests expanding through the roadmap.
- Architect-side site supervision: site instructions, inspections, snags, and
  progress reports.

The **Cost Management System** (measurement book, plan markup, item library) is
being rebuilt on the Construction Knowledge Bank foundation — see
[docs/esti/COST-MANAGEMENT-SYSTEM.md](docs/esti/COST-MANAGEMENT-SYSTEM.md).
General-purpose ERP, commerce, warehouse, labour,
subcontractor-accounting, and contractor execution systems are out of scope.

**User guide:** [aorms.in/wiki](https://aorms.in/wiki) · **Licence:** one standard
cloud workspace ([PLANS-AND-TIERS](docs/esti/PLANS-AND-TIERS.md)) — no desktop
app installs for the main product.

## Fixed India profile

India · INR only · FY 1 Apr–31 Mar · COA registration number as the firm Legal ID
· Indian lakh/crore number format · GST (the three systems above) · light-only
HCW-UI-Kit theme. These are hardcoded — see [docs/esti/INDIA-PROFILE.md](docs/esti/INDIA-PROFILE.md).

## Run it (everything in containers)

```sh
podman compose up -d --build
# SPA      → http://localhost:5173
# Backend  → http://localhost:4000/health
```

No `.env` needed for local dev — `compose.yaml` ships safe defaults. See [INSTALL.md](INSTALL.md) for configuration and production setup.

Full instructions: [INSTALL.md](INSTALL.md).

## Documentation

Canonical product and engineering docs: **[docs/esti/README.md](docs/esti/README.md)**.

## License

AORMS is original software owned by Holagundi Consulting Works. HCW chooses the
license — see [docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).

## Repository

Source, issues, releases, and docs: `https://github.com/HolagundiWorks/esti`.
