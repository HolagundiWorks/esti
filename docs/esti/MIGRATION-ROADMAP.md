# ESTI Migration Roadmap

## Phase 0: Repository Baseline

- Record the exact upstream Dolibarr version and commit used as the fork base.
- Create an ESTI branch strategy that never commits directly to `main`,
  `master`, or `develop`.
- Keep a clean upstream remote so Dolibarr security fixes can be merged.
- Add ESTI documentation, license notices, and contribution rules.
- Route public source, issue, release, update, and support links to
  `https://github.com/HolagundiWorks/esti`.
- Keep Dolibarr links only for legal attribution, upstream merge research, and
  compatibility references.
- Disable the remote module marketplace and upstream module feeds as the first
  backend strip-down step.
- Remove non-construction module descriptors from backend discovery and block
  their legacy routes after confirming the app still installs, boots, and opens
  module administration.
- Run the upstream installer in a local Podman environment before functional
  changes begin.

## Phase 1: Product Identity

- Replace visible product name with `ESTI ERP` through configuration or theme
  extension points first.
- Replace logos, favicon, login branding, document headers, and email footers.
- Keep upstream legal attribution in About, docs, and distribution metadata.
- Create an ESTI default configuration profile for Indian construction users.

## Phase 2: India-First Baseline

- Default country to India, currency to INR, timezone to Asia/Kolkata, and
  fiscal defaults to Indian business expectations.
- Keep Indian language folders initially: `en_IN`, `hi_IN`, `bn_IN`, `kn_IN`,
  and any future Indian locales chosen for launch.
- Disable non-Indian country, currency, and tax choices by configuration first.
- Avoid deleting upstream language and dictionary data until upgrade impact is
  tested.

## Phase 3: GST and Accounting Direction

- Replace VAT-facing user journeys with GST terminology and India-specific tax
  setup where possible.
- Treat Dolibarr `tva_*` storage as legacy compatibility fields; ESTI UI and
  documents must call the tax system GST.
- Enable CGST, SGST, and IGST in the ESTI default profile using India tax
  dictionary rows.
- Model GST rates, HSN/SAC codes, place of supply, CGST, SGST, IGST, cess, RCM,
  TDS/TCS, and e-invoice/e-way-bill integration readiness.
- Disable unsupported VAT and multi-currency modules for the ESTI default
  profile. The multi-currency descriptor is removed from ESTI module discovery;
  retained accounting storage must still be audited before deeper code removal.
- Preserve upstream accounting compatibility until GST workflows are fully
  tested with invoices, supplier bills, credit notes, and exports.

## Phase 4: Backend Profile And Construction Modules

- Keep the construction-only backend profile documented in
  `docs/esti/BACKEND-PROFILE.md`.
- Remove stale menus, permissions, search surfaces, dictionaries, and templates
  for modules removed from ESTI discovery.
- Keep generic products, services, projects, ECM, barcodes, multi-currency, and
  subtotals unavailable in module administration. Replace them with ESTI
  construction modules instead of re-enabling upstream descriptors.
- Build ESTI construction modules under `htdocs/esti_*` or a consistent module
  namespace, following Dolibarr modulebuilder structure.
- Start with project/site metadata, estimation, BOQ, and rate analysis because
  they define the core construction data model.
- Add billing, labour, site-store, and purchase workflows after BOQ links are
  stable.
- Use Dolibarr hooks and CommonObject patterns before changing core classes.

## Phase 5: UI Redesign

- Introduce an ESTI Carbon-inspired theme with IBM blue, light mode, and dark
  mode only.
- Keep Dolibarr form and table semantics intact while redesigning CSS and
  reusable UI templates.
- Disable theme customization modules for the ESTI distribution profile.
- Verify screens with real ERP workflows, not only dashboards.

## Phase 6: Containers and Install

- Add Podman Compose runtime for app, database, and optional admin tools.
- Provide one-command development startup.
- Add initialization scripts for default ESTI configuration after Dolibarr
  install completes.
- Include upgrade and backup documentation before public test releases.

## Phase 7: Release Hardening

- Run creation, edit, delete, permissions, and multi-entity validation for all
  ESTI modules.
- Add PHPUnit coverage for construction object classes and GST calculations.
- Document upgrade path from upstream Dolibarr and from earlier ESTI versions.
- Publish GPL source, container image metadata, changelog, and security policy.
- Publish ESTI releases and changelogs from the ESTI GitHub repository, not from
  upstream Dolibarr release feeds.

## Non-Goals For The First Release

- Physical deletion of retained upstream compatibility directories before hard
  includes, upgrade scripts, menus, permissions, and APIs are audited.
- Remote marketplace installation in the ESTI distribution profile.
- Proprietary relicensing of Dolibarr-derived code.
- Global ERP support for all countries.
- Complex theme marketplace or user-defined theme customization.
