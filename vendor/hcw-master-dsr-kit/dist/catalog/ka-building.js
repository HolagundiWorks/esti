import { TAKEOFF_DSR_LINKS } from "./takeoff-dsr-links.js";
export const KA_BUILDING_DSR_REF = {
    source: "STATE",
    stateCode: "KA",
    fyLabel: "2026-27",
    label: "2026-27 Building",
};
/** @deprecated Use KA_BUILDING_DSR_REF.label */
export const BUILDING_DSR_VERSION_LABEL = KA_BUILDING_DSR_REF.label;
export const BUILDING_DSR_VERSION_DESCRIPTION = "Standard building construction schedule (masonry, RCC, footings) aligned with drawing takeoff codes. Indicative Karnataka market rates for estimation — verify against tender, CPWD, or state SSR before contractual use.";
/** Indicative schedule rates (paise) keyed by DSR item code. */
export const BUILDING_DSR_TAKEOFF_RATES_PAISE = {
    "BM-230": 850_000,
    "BM-200": 780_000,
    "BM-115": 560_000,
    "BM-110": 540_000,
    "BM-100": 500_000,
    "AAC-150": 680_000,
    "RCC-SLAB-100": 485_000,
    "RCC-SLAB-125": 545_000,
    "RCC-SLAB-150": 610_000,
    "RCC-SLAB-200": 760_000,
    "RCC-BEAM-230450": 1_280_000,
    "RCC-BEAM-230600": 1_520_000,
    "RCC-BEAM-300600": 1_720_000,
    "RCC-COL-230": 9_500_000,
    "RCC-COL-300": 13_500_000,
    "RCC-COL-450": 24_000_000,
    "RCC-FTG-1000": 18_500_000,
    "RCC-FTG-1200": 24_500_000,
    "RCC-FTG-STRIP600": 980_000,
};
export const SUPPLEMENTARY_BUILDING_DSR = [
    {
        code: "EXC-SITE",
        description: "Earthwork excavation in ordinary soil for foundation (manual/mechanical)",
        unit: "cum",
        ratePaise: 48_000,
    },
    {
        code: "PCC-100",
        description: "Plain cement concrete 1:4:8, 100 mm thick under footing or floor",
        unit: "sqm",
        ratePaise: 540_000,
    },
    {
        code: "DPC-40",
        description: "Damp proof course 40 mm thick with waterproof cement mortar",
        unit: "rm",
        ratePaise: 880_000,
    },
    {
        code: "PLASTER-INT",
        description: "Internal cement plaster 12 mm thick in cement mortar (1:4)",
        unit: "sqm",
        ratePaise: 290_000,
    },
    {
        code: "PLASTER-EXT",
        description: "External cement plaster 18 mm thick in cement mortar (1:4)",
        unit: "sqm",
        ratePaise: 360_000,
    },
    {
        code: "PAINT-INT",
        description: "Interior emulsion paint — two coats on plastered surface",
        unit: "sqm",
        ratePaise: 125_000,
    },
    {
        code: "PAINT-EXT",
        description: "Exterior acrylic weather-coat — two coats on plastered surface",
        unit: "sqm",
        ratePaise: 185_000,
    },
    {
        code: "FLOOR-VIT",
        description: "Vitrified tile flooring 8–10 mm laid in cement mortar with grouting",
        unit: "sqm",
        ratePaise: 980_000,
    },
    {
        code: "WATERPROOF-WET",
        description: "Wet-area waterproofing (toilet/balcony) with brickbat coba treatment",
        unit: "sqm",
        ratePaise: 680_000,
    },
    {
        code: "RC-1240",
        description: "Reinforcement steel TMT Fe500D — supply, cutting, bending and placing",
        unit: "kg",
        ratePaise: 8_500,
    },
    {
        code: "SHUTTER-FORM",
        description: "Centering and shuttering for RCC columns, beams and slabs",
        unit: "sqm",
        ratePaise: 420_000,
    },
    {
        code: "DOOR-TEAK",
        description: "Teak wood door frame and shutter with fittings (standard size)",
        unit: "nos",
        ratePaise: 28_000_000,
    },
    {
        code: "WINDOW-ALU",
        description: "Powder-coated aluminium window with 4 mm clear glass",
        unit: "sqm",
        ratePaise: 4_200_000,
    },
];
/** Full building DSR item list: takeoff-linked + supplementary. */
export function buildingDsrCatalogItems() {
    const fromTakeoff = TAKEOFF_DSR_LINKS.map((link) => ({
        code: link.code,
        description: link.description,
        unit: link.unit,
        ratePaise: BUILDING_DSR_TAKEOFF_RATES_PAISE[link.code] ?? 0,
    }));
    const codes = new Set(fromTakeoff.map((i) => i.code));
    const extra = SUPPLEMENTARY_BUILDING_DSR.filter((i) => !codes.has(i.code));
    return [...fromTakeoff, ...extra];
}
/** Build catalog items for a ref (v0.1: KA building pack only). */
export function buildCatalogItems(ref) {
    if (ref.source === "STATE" && ref.stateCode === "KA" && ref.fyLabel === "2026-27") {
        return buildingDsrCatalogItems();
    }
    throw new Error(`No seed catalog for ${ref.source} ${ref.stateCode ?? ""} ${ref.fyLabel}`);
}
