# ESTI Backend Profile

ESTI is no longer a general-purpose Dolibarr distribution. The backend profile is
being reduced to the modules needed for Indian construction contractors, with
new ESTI construction modules replacing broad CRM, commerce, HR, and inventory
features.

## Removed From Module Discovery

The following upstream module descriptors have been removed from
`htdocs/core/modules`, so they are not available for activation in ESTI:

- CRM/prospecting: members, proposals, opportunities/prospect flows.
- Sales operations: orders and subscriptions/contracts.
- Logistics and stock: stock, warehouse, stock transfer, product batches, and
  shipping.
- Retail and online commerce: POS/TakePOS, ecommerce/website.
- Non-construction operations: donations, events, interventions, surveys,
  helpdesk/tickets, knowledge base, email campaigns.
- HR operations: HRM, recruitment, holidays, salaries, and expenses.
- Manufacturing: BOM, MRP, and workstations.

The matching trigger files for removed event and ticket behaviour are also
removed.

## Runtime Enforcement

`containers/apply-esti-defaults.php` disables the removed module constants for
new and existing development databases. This includes legacy aliases such as
`MAIN_MODULE_PROPAL`, `MAIN_MODULE_ORDER`, and `MAIN_MODULE_MEMBER` where they
may exist in older data.

The web root `.htaccess` returns `410 Gone` for legacy module routes such as:

- `/commande`
- `/comm/propal`
- `/product/stock`
- `/ticket`
- `/takepos`

This prevents users from reaching removed feature surfaces even if an old menu,
bookmark, or stale database row still points to them.

## Compatibility Boundary

Only activation descriptors and selected triggers were deleted in this phase.
Some source directories are retained where the upstream core still has shared
classes, hard includes, database upgrade references, or compatibility APIs.

Do not delete retained directories casually. A full source deletion pass must
first remove hard includes, API references, upgrade assumptions, menus,
permissions, search entries, dictionary rows, and document templates.

## Replacement Direction

ESTI should replace removed generic modules with construction-specific modules:

- `esti_rateanalysis`
- `esti_estimation`
- `esti_boq`
- `esti_billing`
- `esti_labour`
- `esti_purchase`
- `esti_sitestock`

`esti_sitestock` should model site stores, issue, return, transfer, wastage, and
BOQ-linked consumption without re-enabling the generic upstream warehouse module.

## Next Cleanup Tasks

- Remove stale menus and permissions for removed modules.
- Remove module labels from admin/search/navigation surfaces.
- Audit dictionaries, setup pages, document templates, and APIs for removed
  feature references.
- Add tests or smoke scripts that assert removed routes stay unavailable and
  removed constants remain disabled.
