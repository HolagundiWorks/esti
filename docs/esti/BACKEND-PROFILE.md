# ESTI Backend Profile

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for which
> Dolibarr surfaces are removed vs retained. The architect module registry lives
> in the [Module Map](ARCHITECT-PROFILE.md)._

ESTI is no longer a general-purpose Dolibarr distribution. The backend profile is
being reduced to the modules needed for Indian freelance architects and small
architecture offices, with new ESTI architect-office modules replacing broad
CRM, commerce, HR, inventory, and contractor-operation features.

## Removed From Module Discovery

The following upstream module descriptors have been removed from
`htdocs/core/modules`, so they are not available for activation in ESTI:

- CRM/prospecting: members, proposals, opportunities/prospect flows.
- Sales operations: orders and subscriptions/contracts.
- Product management: generic products, services, product variants, product
  batches, and barcodes.
- Projects and collaboration: generic projects and shared resources.
- Logistics and stock: stock, warehouse, stock transfer, shipping, receptions,
  supplier price requests, and supplier purchase orders.
- Retail and online commerce: POS/TakePOS, ecommerce/website.
- Non-construction operations: donations, events, interventions, surveys,
  helpdesk/tickets, knowledge base, email campaigns, and generic ECM.
- HR operations: HRM, recruitment, holidays, salaries, and expenses.
- Manufacturing: BOM, MRP, and workstations.
- Global finance helpers outside the India-first profile: multi-currency and
  generic subtotals.

The matching trigger files for removed event and ticket behaviour are also
removed.

## Runtime Enforcement

`containers/apply-esti-defaults.php` disables the removed module constants for
new and existing development databases. This includes legacy aliases such as
`MAIN_MODULE_PROPAL`, `MAIN_MODULE_ORDER`, `MAIN_MODULE_MEMBER`,
`MAIN_MODULE_PRODUIT`, `MAIN_MODULE_PROJECT`, `MAIN_MODULE_PROJET`,
`MAIN_MODULE_MULTICURRENCY`, and `MAIN_MODULE_SUBTOTALS` where they may exist
in older data.

The web root `.htaccess` returns `410 Gone` for legacy module routes such as:

- `/commande`
- `/comm/propal`
- `/product`
- `/projet`
- `/ecm`
- `/resource`
- `/variants`
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

Removed generic modules are replaced by architect-office modules. The canonical
list — module names, Dolibarr bases, and tables — is the **Module Map** in
[ARCHITECT-PROFILE](ARCHITECT-PROFILE.md). Do not maintain a second copy here.

For this document the relevant facts are:

- `esti_dsrsor` is retained as a supporting reference/costing engine for tender,
  quantity, and takeoff workflows.
- Future architect BOQ/takeoff support is rebuilt against `esti_projectoffice`,
  `esti_feeproposal`, `esti_drawing`, and `esti_takeoff` — not the removed
  contractor BOQ module.

Do not re-enable generic upstream projects, products, ECM UI, stock, purchase,
or CRM modules as the primary user workflow. Where Dolibarr base tables are
useful, expose them through ESTI-specific APIs and Carbon screens.

Contractor modules such as labour, site stock, purchase orders, RA billing, and
measurement book are outside the first architect release.

## Next Cleanup Tasks

- Remove stale menus and permissions for removed modules.
- Remove module labels from admin/search/navigation surfaces.
- Audit dictionaries, setup pages, document templates, and APIs for removed
  feature references.
- Audit product, project, ECM, barcode, multi-currency, and subtotals hard
  includes before deleting retained compatibility source directories.
- Add tests or smoke scripts that assert removed routes stay unavailable and
  removed constants remain disabled.
