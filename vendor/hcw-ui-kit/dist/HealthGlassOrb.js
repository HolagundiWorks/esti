import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const GLYPH = {
    stable: { shape: "circle", fill: "var(--cds-support-success, #198038)" },
    watch: { shape: "triangle", fill: "var(--cds-support-warning, #f1c21b)" },
    friction: {
        shape: "triangle",
        fill: "var(--cds-support-warning-minor, var(--cds-support-warning, #f1c21b))",
    },
    critical: { shape: "square", fill: "var(--cds-support-error, #da1e28)" },
    inactive: { shape: "circle", fill: "var(--cds-text-disabled, #a8a8a8)" },
};
function FlatShape({ shape, size, fill, }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", "aria-hidden": true, children: [shape === "circle" && _jsx("circle", { cx: "8", cy: "8", r: "6", fill: fill }), shape === "square" && _jsx("rect", { x: "2", y: "2", width: "12", height: "12", fill: fill }), shape === "triangle" && _jsx("polygon", { points: "8,2 14,14 2,14", fill: fill })] }));
}
export function HealthGlassOrb({ state, size = 14, title, variant = "glass", className, style, }) {
    const g = GLYPH[state];
    const label = title ?? `Health: ${state}`;
    if (variant !== "glass") {
        return (_jsx("span", { role: "img", "aria-label": label, title: title, className: className, style: style, children: _jsx(FlatShape, { shape: g.shape, size: size, fill: g.fill }) }));
    }
    return (_jsx("span", { className: [
            "hcw-health-glass-orb",
            `hcw-health-glass-orb--${state}`,
            // App alias until glass.scss migrates class names
            "esti-zone-glass-orb",
            `esti-zone-glass-orb--${state}`,
            className,
        ]
            .filter(Boolean)
            .join(" "), role: "img", "aria-label": label, title: title, style: { width: size, height: size, ...style } }));
}
