/**
 * Data visualisation helpers — chart chrome, markers, and series wiring for
 * MUI X Charts / canvas. Palettes live in `tokens.ts` (`DATA_VIZ_*`); this
 * module owns the **grammar** (axis/grid/legend, shape encoding, series map).
 *
 * The kit does **not** depend on `@mui/x-charts` — consumers pass these values
 * into chart `series` / `slotProps` / `sx`. Never use brand accent as a default
 * series hue; never rely on colour alone (pair markers — WCAG 1.4.1).
 */
import type { ColorScheme } from "./tokens.js";
import { chartColorAt, chartSeriesColors } from "./tokens.js";
/** Marker shapes for multi-series lines/scatters — encode series without colour. */
export declare const CHART_MARKERS: readonly ["circle", "square", "triangle", "diamond", "cross", "star"];
export type ChartMarker = (typeof CHART_MARKERS)[number];
/** Stable marker at series index (wraps). */
export declare function chartMarkerAt(index: number): ChartMarker;
/**
 * Scheme-aware chart chrome — axis, grid, legend, tooltip. Wire into MUI X via
 * `sx` / `slotProps` (e.g. axis tick label colour = `tickLabel`).
 */
export declare function chartChromeFor(scheme?: ColorScheme): {
    readonly background: "transparent";
    readonly axisStroke: string;
    readonly tickLabel: string;
    readonly axisLabel: string;
    readonly gridStroke: string;
    readonly legendLabel: string;
    readonly tooltipBg: string;
    readonly tooltipFg: string;
    readonly empty: string;
    readonly fontSize: "0.65rem";
    /** Soft plot band / hover wash (not a series colour). */
    readonly plotHover: string;
};
/** Light-scheme chart chrome singleton (most portals). */
export declare const CHART_CHROME: {
    readonly background: "transparent";
    readonly axisStroke: string;
    readonly tickLabel: string;
    readonly axisLabel: string;
    readonly gridStroke: string;
    readonly legendLabel: string;
    readonly tooltipBg: string;
    readonly tooltipFg: string;
    readonly empty: string;
    readonly fontSize: "0.65rem";
    /** Soft plot band / hover wash (not a series colour). */
    readonly plotHover: string;
};
export type ChartSeriesInput = {
    color?: string;
    id?: string | number;
    label?: string;
    [key: string]: unknown;
};
/**
 * Attach categorical colours (and optional markers) to a series list.
 * Existing `color` on an item is preserved.
 */
export declare function withChartSeriesColors<T extends ChartSeriesInput>(series: T[], opts?: {
    markers?: boolean;
}): (T & {
    color: string;
    markerShape?: ChartMarker;
})[];
/**
 * Compact sx recipe for an MUI X Charts root — transparent plot, kit micro type,
 * hairline grid intent (consumers still set `grid` prop on the chart).
 */
export declare function chartRootSx(scheme?: ColorScheme): {
    readonly backgroundColor: "transparent";
    readonly color: string;
    readonly fontSize: "0.65rem";
    readonly "& .MuiChartsAxis-line": {
        readonly stroke: string;
    };
    readonly "& .MuiChartsAxis-tick": {
        readonly stroke: string;
    };
    readonly "& .MuiChartsAxis-tickLabel": {
        readonly fill: string;
        readonly fontSize: "0.65rem";
    };
    readonly "& .MuiChartsAxis-label": {
        readonly fill: string;
        readonly fontSize: "0.65rem";
    };
    readonly "& .MuiChartsGrid-line": {
        readonly stroke: string;
    };
    readonly "& .MuiChartsLegend-series text": {
        readonly fill: string;
        readonly fontSize: "0.65rem";
    };
    readonly "& .MuiChartsTooltip-root": {
        readonly backgroundColor: string;
        readonly color: string;
        readonly border: `1px solid ${string}`;
        readonly borderRadius: 0;
        readonly fontSize: "0.65rem";
    };
};
/** Re-export index colour for one-shot imports from `charts`. */
export { chartColorAt, chartSeriesColors };
//# sourceMappingURL=charts.d.ts.map