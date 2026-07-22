/**
 * Token export — DTCG-ish JSON + CSS custom properties for Figma Variables /
 * Tokens Studio import. Source of truth remains `tokens.ts`; this is a bridge.
 *
 *   import { buildTokenExport } from "@hcw/ui-kit/token-export";
 *   // or consume dist/tokens.json · dist/tokens.css after `pnpm build`
 */
import { SCHEMES, RADIUS, BUTTON_RADIUS, DOCK_PILL_RADIUS, DIALOG_RADIUS, FONT_FAMILY, SPACING, SPACING_UNIT, LAYOUT, DENSITY, TYPE_SCALE, MOTION, CAPACITY, INTERRUPTION, COGA, DATA_VIZ, DATA_VIZ_CATEGORICAL, DATA_VIZ_SEQUENTIAL, DATA_VIZ_DIVERGING, DATA_VIZ_SEMANTIC, STATUS_COLORS, STATUS_SHAPE, BREAKPOINTS, Z_INDEX, OPACITY, } from "./tokens.js";
function colorGroup(scheme) {
    const c = SCHEMES[scheme];
    const out = {};
    for (const [role, value] of Object.entries(c)) {
        out[role] = { $type: "color", $value: value };
    }
    return out;
}
/** Build the Figma Variables / Tokens Studio JSON payload. */
export function buildTokensJson(kitVersion = "1.4.0") {
    return {
        $description: "HCW UI Kit design tokens — import into Figma Variables / Tokens Studio. Component library is separate DesignOps work.",
        $extensions: {
            "com.hcw.ui-kit": { version: kitVersion, source: "src/tokens.ts" },
        },
        color: {
            light: colorGroup("light"),
            dark: colorGroup("dark"),
            highContrast: colorGroup("highContrast"),
            status: Object.fromEntries(Object.entries(STATUS_COLORS).map(([k, v]) => [k, { $type: "color", $value: v }])),
            dataViz: Object.fromEntries(Object.entries(DATA_VIZ).map(([k, v]) => [k, { $type: "color", $value: v }])),
        },
        size: {
            spacingUnit: { $type: "dimension", $value: `${SPACING_UNIT}px` },
            ...Object.fromEntries(Object.entries(SPACING).map(([k, v]) => [`spacing.${k}`, { $type: "dimension", $value: `${v}px` }])),
            radius: { $type: "dimension", $value: `${RADIUS}px` },
            buttonRadius: { $type: "dimension", $value: `${BUTTON_RADIUS}px` },
            dialogRadius: { $type: "dimension", $value: `${DIALOG_RADIUS}px` },
            dockPillRadius: { $type: "dimension", $value: `${DOCK_PILL_RADIUS}px` },
            touchTarget: { $type: "dimension", $value: `${DENSITY.touchTarget}px` },
            control: { $type: "dimension", $value: `${DENSITY.control}px` },
            controlCompact: { $type: "dimension", $value: `${DENSITY.controlCompact}px` },
            railWidth: { $type: "dimension", $value: `${LAYOUT.railWidth}px` },
            taskbarHeight: { $type: "dimension", $value: `${LAYOUT.taskbarHeight}px` },
            margin: { $type: "dimension", $value: `${LAYOUT.margin}px` },
            columns: { $type: "number", $value: LAYOUT.columns },
        },
        typography: {
            fontFamily: { $type: "fontFamily", $value: FONT_FAMILY },
            ...Object.fromEntries(Object.entries(TYPE_SCALE).map(([k, v]) => [k, { $type: "dimension", $value: v }])),
        },
        motion: {
            durationInstant: { $type: "duration", $value: `${MOTION.duration.instant}ms` },
            durationFast: { $type: "duration", $value: `${MOTION.duration.fast}ms` },
            durationBase: { $type: "duration", $value: `${MOTION.duration.base}ms` },
            durationSlow: { $type: "duration", $value: `${MOTION.duration.slow}ms` },
        },
        capacity: Object.fromEntries(Object.entries({ ...CAPACITY, ...INTERRUPTION, ...COGA }).map(([k, v]) => [
            k,
            { $type: "number", $value: typeof v === "number" ? v : Number(v) },
        ])),
        dataViz: {
            categorical: DATA_VIZ_CATEGORICAL,
            sequential: DATA_VIZ_SEQUENTIAL,
            diverging: DATA_VIZ_DIVERGING,
            semantic: DATA_VIZ_SEMANTIC,
            statusShape: STATUS_SHAPE,
            breakpoints: BREAKPOINTS,
            zIndex: Z_INDEX,
            opacity: OPACITY,
        },
    };
}
/** CSS custom properties for every scheme (Figma → code parity check). */
export function buildTokensCss() {
    const lines = [
        "/* Generated from src/tokens.ts — do not edit by hand. */",
        "/* Import: @hcw/ui-kit/tokens.css · switch scheme via data-hcw-scheme */",
        "",
    ];
    for (const scheme of Object.keys(SCHEMES)) {
        const sel = scheme === "light" ? ':root, [data-hcw-scheme="light"]' : `[data-hcw-scheme="${scheme}"]`;
        lines.push(`${sel} {`);
        const c = SCHEMES[scheme];
        for (const [role, value] of Object.entries(c)) {
            lines.push(`  --hcw-color-${role}: ${value};`);
        }
        if (scheme === "light") {
            lines.push(`  --hcw-radius: ${RADIUS}px;`);
            lines.push(`  --hcw-button-radius: ${BUTTON_RADIUS}px;`);
            lines.push(`  --hcw-dialog-radius: ${DIALOG_RADIUS}px;`);
            lines.push(`  --hcw-dock-pill-radius: ${DOCK_PILL_RADIUS}px;`);
            lines.push(`  --hcw-spacing-unit: ${SPACING_UNIT}px;`);
            lines.push(`  --hcw-touch-target: ${DENSITY.touchTarget}px;`);
            lines.push(`  --hcw-rail-width: ${LAYOUT.railWidth}px;`);
            lines.push(`  --hcw-font-family: ${FONT_FAMILY};`);
            for (const [k, v] of Object.entries(TYPE_SCALE)) {
                lines.push(`  --hcw-type-${k}: ${v};`);
            }
            lines.push(`  --hcw-accent: ${c.accent};`);
            lines.push(`  --hcw-accent-glow: ${c.accentSoft};`);
        }
        lines.push(`}`);
        lines.push("");
    }
    return lines.join("\n");
}
/** One-shot export for build scripts. */
export function buildTokenExport(kitVersion) {
    return { json: buildTokensJson(kitVersion), css: buildTokensCss() };
}
//# sourceMappingURL=token-export.js.map