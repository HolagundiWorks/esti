# ESTI ERP

ESTI ERP is a planned Indian construction ERP fork based on Dolibarr ERP & CRM.
The goal is to keep Dolibarr's reliable modular core while shaping the product
for contractors, builders, civil engineers, quantity surveyors, and construction
procurement teams in India.

## Product Focus

ESTI will prioritize construction workflows:

- Rate analysis for materials, labour, machinery, overheads, and contractor margin.
- Estimation and costing for residential, commercial, infrastructure, and interior projects.
- BOQ preparation, revisions, versioning, and approval workflows.
- Running bills, RA bills, final bills, retention, advances, deductions, and GST-ready invoices.
- Labour team management, attendance, subcontractor work orders, and wage tracking.
- Stock, site stores, material issue, returns, wastage, and reconciliation.
- Purchase requisitions, supplier comparison, purchase orders, GRN, and supplier bills.
- Project cost control by site, work package, BOQ item, and contractor.

## Forking Principles

- Preserve Dolibarr compatibility where possible so upstream updates can be merged.
- Prefer extension modules over direct core modification.
- Keep India-specific behaviour configurable through ESTI modules and constants first.
- Remove or disable global functionality only after a migration and compatibility review.
- Keep all redistributed source code under GPL-compatible terms.

## Documentation

The ESTI planning documents are in [docs/esti](docs/esti):

- [License and Notices](docs/esti/LICENSE-NOTICE.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Podman Runtime Plan](docs/esti/PODMAN-RUNTIME.md)
- [India Localization and GST](docs/esti/INDIA-LOCALIZATION-GST.md)
- [Construction Modules](docs/esti/CONSTRUCTION-MODULES.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)

## Legal Note

Dolibarr is distributed under GPL-3.0-or-later. ESTI can be rebranded and
modified, but redistributed modified versions must preserve the GPL freedoms,
include source code, keep upstream copyright notices, and avoid misuse of the
Dolibarr trademark. See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and the
ESTI license notice for the working policy.
