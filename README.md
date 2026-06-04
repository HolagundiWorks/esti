# ESTI ERP

ESTI ERP is an Indian construction ERP fork based on Dolibarr ERP & CRM.

The project keeps Dolibarr's modular PHP ERP foundation and focuses the product
for contractors, builders, quantity surveyors, civil engineers, purchase teams,
site stores, and billing teams working in the Indian construction industry.

## Planned Construction Focus

- Rate analysis for material, labour, machinery, overheads, and margin.
- Estimation and costing for construction projects.
- BOQ preparation, revision, approval, and comparison.
- RA bills, final bills, advances, retention, deductions, and GST-ready billing.
- Labour team, subcontractor, attendance, and wage management.
- Site stock, material issue, return, transfer, wastage, and reconciliation.
- Purchase requisitions, supplier comparison, purchase orders, GRN, and supplier
  bills.
- Project cost control by site, work package, BOQ item, and contractor.

## India-First Direction

ESTI is intended to default to:

- India as the operating country.
- INR as the operating currency.
- Asia/Kolkata as the timezone.
- Indian language support, starting with existing Indian locales in the fork.
- GST-oriented tax workflows instead of global VAT-first setup.
- IBM blue inspired light/dark UI direction.

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

- [License and Notices](docs/esti/LICENSE-NOTICE.md)
- [Product Roadmap](docs/esti/ROADMAP.md)
- [Migration Roadmap](docs/esti/MIGRATION-ROADMAP.md)
- [Podman Runtime Plan](docs/esti/PODMAN-RUNTIME.md)
- [India Localization and GST](docs/esti/INDIA-LOCALIZATION-GST.md)
- [Construction Modules](docs/esti/CONSTRUCTION-MODULES.md)
- [Carbon UI Direction](docs/esti/CARBON-UI-DIRECTION.md)

## Repository Links

Use the ESTI repository for source, issues, updates, release notes, and public
documentation:

```text
https://github.com/HolagundiWorks/esti
```

Dolibarr references are kept only where they are required for license,
copyright, trademark attribution, upstream compatibility, or security patch
review.

## License

ESTI ERP is a modified fork of Dolibarr ERP & CRM.

Dolibarr is distributed under GPL-3.0-or-later. ESTI keeps the same license for
Dolibarr-derived code. Redistributed versions must preserve upstream notices,
include the GPL license text, provide corresponding source code, and avoid
implying that ESTI is the official Dolibarr distribution.

See [COPYING](COPYING), [COPYRIGHT](COPYRIGHT), and
[docs/esti/LICENSE-NOTICE.md](docs/esti/LICENSE-NOTICE.md).
