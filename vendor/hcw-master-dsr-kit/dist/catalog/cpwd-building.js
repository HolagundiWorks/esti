export const CPWD_BUILDING_DSR_REF = {
    source: "CPWD",
    fyLabel: "2026-27",
    label: "CPWD DAR Building 2026-27",
};
/** CPWD stub seed — structure + sample items for v0.1. */
export const CPWD_BUILDING_DSR_STUB = [
    {
        code: "CPWD-BM-230",
        description: "Brick masonry in cement mortar 1:6, 230 mm thick",
        unit: "cum",
        ratePaise: 6_850_000,
    },
    {
        code: "CPWD-RCC-SLAB",
        description: "RCC slab M25 grade, 150 mm thick including shuttering",
        unit: "sqm",
        ratePaise: 620_000,
    },
    {
        code: "CPWD-STEEL",
        description: "Reinforcement steel TMT Fe500D — supply and placing",
        unit: "kg",
        ratePaise: 9_200,
    },
];
export function cpwdBuildingDsrItems() {
    return [...CPWD_BUILDING_DSR_STUB];
}
