/** Minimal takeoff → DSR code mapping (no esti takeoff dependency). */
export const TAKEOFF_DSR_LINKS = [
    { takeoffId: "WALL_230", code: "BM-230", description: "Brick masonry 230 mm thick in cement mortar", unit: "rm" },
    { takeoffId: "WALL_200", code: "BM-200", description: "Brick masonry 200 mm thick in cement mortar", unit: "rm" },
    { takeoffId: "WALL_115", code: "BM-115", description: "Brick masonry 115 mm thick partition in cement mortar", unit: "rm" },
    { takeoffId: "WALL_110", code: "BM-110", description: "Brick masonry 110 mm thick partition in cement mortar", unit: "rm" },
    { takeoffId: "WALL_100", code: "BM-100", description: "Brick masonry 100 mm thick partition in cement mortar", unit: "rm" },
    { takeoffId: "WALL_150_BLOCK", code: "AAC-150", description: "AAC block masonry 150 mm thick in adhesive mortar", unit: "rm" },
    { takeoffId: "SLAB_100", code: "RCC-SLAB-100", description: "RCC slab 100 mm thick M25", unit: "sqm" },
    { takeoffId: "SLAB_125", code: "RCC-SLAB-125", description: "RCC slab 125 mm thick M25", unit: "sqm" },
    { takeoffId: "SLAB_150", code: "RCC-SLAB-150", description: "RCC slab 150 mm thick M25", unit: "sqm" },
    { takeoffId: "SLAB_200", code: "RCC-SLAB-200", description: "RCC slab 200 mm thick M25", unit: "sqm" },
    { takeoffId: "BEAM_230x450", code: "RCC-BEAM-230450", description: "RCC beam 230 × 450 mm M25", unit: "rm" },
    { takeoffId: "BEAM_230x600", code: "RCC-BEAM-230600", description: "RCC beam 230 × 600 mm M25", unit: "rm" },
    { takeoffId: "BEAM_300x600", code: "RCC-BEAM-300600", description: "RCC beam 300 × 600 mm M25", unit: "rm" },
    { takeoffId: "COL_230x230", code: "RCC-COL-230", description: "RCC column 230 × 230 mm M25", unit: "nos" },
    { takeoffId: "COL_300x300", code: "RCC-COL-300", description: "RCC column 300 × 300 mm M25", unit: "nos" },
    { takeoffId: "COL_450x450", code: "RCC-COL-450", description: "RCC column 450 × 450 mm M25", unit: "nos" },
    { takeoffId: "FTG_1000x1000x450", code: "RCC-FTG-1000", description: "Isolated RCC footing 1000 × 1000 × 450 mm M25", unit: "nos" },
    { takeoffId: "FTG_1200x1200x500", code: "RCC-FTG-1200", description: "Isolated RCC footing 1200 × 1200 × 500 mm M25", unit: "nos" },
    { takeoffId: "FTG_STRIP_600x450", code: "RCC-FTG-STRIP600", description: "Strip RCC footing 600 mm wide × 450 mm deep M25", unit: "rm" },
];
export const TAKEOFF_DSR_LINKS_BY_CODE = new Map(TAKEOFF_DSR_LINKS.map((l) => [l.code, l]));
