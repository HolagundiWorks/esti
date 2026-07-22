import { jsx as _jsx } from "react/jsx-runtime";
/**
 * PageBreadcrumb — wayfinding trail for deep screens (Miller / Nielsen #3).
 * Last crumb is the current page (non-link, semibold). Keep labels short.
 *
 * Router-agnostic by injection: the kit takes any `linkComponent` (react-router's
 * `Link`, Next's `Link`, plain `a`) plus the prop name it expects for the target —
 * so the kit carries no router dependency.
 *
 *   // plain anchors (default)
 *   <PageBreadcrumb items={[{ label: "Library", to: "/library" }, { label: "Standards" }]} />
 *   // react-router
 *   <PageBreadcrumb items={…} linkComponent={RouterLink} linkPropName="to" />
 */
import { Box, Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
export function PageBreadcrumb({ items, linkComponent = "a", linkPropName = "href", "aria-label": ariaLabel = "Breadcrumb", }) {
    if (items.length === 0)
        return null;
    return (_jsx(Breadcrumbs, { "aria-label": ariaLabel, separator: 
        // Glyph separator — the kit stays icon-library-free (no icons peer dep).
        _jsx(Box, { component: "span", "aria-hidden": true, sx: { color: "text.disabled", lineHeight: 1 }, children: "\u203A" }), sx: { mb: 1, "& .MuiBreadcrumbs-ol": { flexWrap: "wrap" } }, children: items.map((c, i) => {
            const last = i === items.length - 1;
            if (!last && c.to) {
                const linkProps = { [linkPropName]: c.to };
                return (_jsx(MuiLink, { component: linkComponent, ...linkProps, underline: "hover", color: "text.secondary", variant: "caption", children: c.label }, `${c.label}-${i}`));
            }
            return (_jsx(Typography, { variant: "caption", color: "text.primary", sx: { fontWeight: last ? 600 : 400 }, children: c.label }, `${c.label}-${i}`));
        }) }));
}
export default PageBreadcrumb;
//# sourceMappingURL=PageBreadcrumb.js.map