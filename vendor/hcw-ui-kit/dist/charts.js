import { TYPE_SCALE, chartColorAt, chartSeriesColors, colors, hexToRgba, } from "./tokens.js";
/** Marker shapes for multi-series lines/scatters — encode series without colour. */
export const CHART_MARKERS = [
    "circle",
    "square",
    "triangle",
    "diamond",
    "cross",
    "star",
];
/** Stable marker at series index (wraps). */
export function chartMarkerAt(index) {
    const i = ((index % CHART_MARKERS.length) + CHART_MARKERS.length) % CHART_MARKERS.length;
    return CHART_MARKERS[i];
}
/**
 * Scheme-aware chart chrome — axis, grid, legend, tooltip. Wire into MUI X via
 * `sx` / `slotProps` (e.g. axis tick label colour = `tickLabel`).
 */
export function chartChromeFor(scheme = colors) {
    return {
        background: "transparent",
        axisStroke: scheme.borderStrong,
        tickLabel: scheme.textSecondary,
        axisLabel: scheme.textHelper,
        gridStroke: scheme.borderSubtle,
        legendLabel: scheme.textPrimary,
        tooltipBg: scheme.ink,
        tooltipFg: scheme.textOnColor,
        empty: scheme.textHelper,
        fontSize: TYPE_SCALE.micro,
        /** Soft plot band / hover wash (not a series colour). */
        plotHover: scheme.hoverSoft,
    };
}
/** Light-scheme chart chrome singleton (most portals). */
export const CHART_CHROME = chartChromeFor(colors);
/**
 * Attach categorical colours (and optional markers) to a series list.
 * Existing `color` on an item is preserved.
 */
export function withChartSeriesColors(series, opts) {
    const cols = chartSeriesColors(series.length);
    return series.map((s, i) => {
        const color = typeof s.color === "string" && s.color ? s.color : cols[i];
        if (opts?.markers) {
            return { ...s, color, markerShape: chartMarkerAt(i) };
        }
        return { ...s, color };
    });
}
/**
 * Compact sx recipe for an MUI X Charts root — transparent plot, kit micro type,
 * hairline grid intent (consumers still set `grid` prop on the chart).
 */
export function chartRootSx(scheme = colors) {
    const c = chartChromeFor(scheme);
    return {
        backgroundColor: c.background,
        color: c.legendLabel,
        fontSize: c.fontSize,
        "& .MuiChartsAxis-line": { stroke: c.axisStroke },
        "& .MuiChartsAxis-tick": { stroke: c.axisStroke },
        "& .MuiChartsAxis-tickLabel": { fill: c.tickLabel, fontSize: c.fontSize },
        "& .MuiChartsAxis-label": { fill: c.axisLabel, fontSize: c.fontSize },
        "& .MuiChartsGrid-line": { stroke: c.gridStroke },
        "& .MuiChartsLegend-series text": { fill: c.legendLabel, fontSize: c.fontSize },
        "& .MuiChartsTooltip-root": {
            backgroundColor: c.tooltipBg,
            color: c.tooltipFg,
            border: `1px solid ${hexToRgba(scheme.ink, 0.2)}`,
            borderRadius: 0,
            fontSize: c.fontSize,
        },
    };
}
/** Re-export index colour for one-shot imports from `charts`. */
export { chartColorAt, chartSeriesColors };
//# sourceMappingURL=charts.js.map