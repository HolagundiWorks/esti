import type { DsrCatalogRef, DsrItemDef } from "./types.js";
export declare const KA_BUILDING_DSR_REF: DsrCatalogRef;
/** @deprecated Use KA_BUILDING_DSR_REF.label */
export declare const BUILDING_DSR_VERSION_LABEL: string;
export declare const BUILDING_DSR_VERSION_DESCRIPTION = "Standard building construction schedule (masonry, RCC, footings) aligned with drawing takeoff codes. Indicative Karnataka market rates for estimation \u2014 verify against tender, CPWD, or state SSR before contractual use.";
export type BuildingDsrItemDef = DsrItemDef;
/** Indicative schedule rates (paise) keyed by DSR item code. */
export declare const BUILDING_DSR_TAKEOFF_RATES_PAISE: Record<string, number>;
export declare const SUPPLEMENTARY_BUILDING_DSR: BuildingDsrItemDef[];
/** Full building DSR item list: takeoff-linked + supplementary. */
export declare function buildingDsrCatalogItems(): BuildingDsrItemDef[];
/** Build catalog items for a ref (v0.1: KA building pack only). */
export declare function buildCatalogItems(ref: DsrCatalogRef): DsrItemDef[];
//# sourceMappingURL=ka-building.d.ts.map