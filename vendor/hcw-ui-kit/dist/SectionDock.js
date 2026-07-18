import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SectionDock — marketing / long-page section carousel. Replaces ActionDock on
 * public landing surfaces: scroll-spy highlights the active section, equal-width
 * clear liquid-glass chips in a rounded glass tray (MARKETING_DOCK_RADIUS).
 */
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { sectionDockChipSx } from "./chrome-sx.js";
import { CLEAR_GLASS_SURFACE, colors, MARKETING_DOCK_RADIUS } from "./tokens.js";
function sectionIdFromHref(href) {
    const hash = new URL(href, "https://aorms.local").hash;
    return hash ? hash.replace(/^#/, "") : null;
}
function hrefMatchesLocation(href, pathname, hash) {
    const url = new URL(href, "https://aorms.local");
    const targetPath = url.pathname || "/";
    const targetHash = url.hash;
    if (targetPath !== pathname)
        return false;
    if (targetHash)
        return hash === targetHash;
    return hash === "" || hash === "#top";
}
export function SectionDock({ links, pathname, hash = "", className, "aria-label": ariaLabel = "Page sections", }) {
    const [spyId, setSpyId] = useState(null);
    const activeHref = links.find((l) => hrefMatchesLocation(l.href, pathname, hash))?.href ??
        (spyId ? links.find((l) => sectionIdFromHref(l.href) === spyId)?.href : undefined);
    const activeLink = links.find((l) => l.href === activeHref) ?? links[0];
    useEffect(() => {
        const ids = links
            .map((l) => sectionIdFromHref(l.href))
            .filter((id) => Boolean(id));
        if (ids.length === 0)
            return;
        const visible = new Map();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const id = entry.target.id;
                if (!id)
                    continue;
                if (entry.isIntersecting)
                    visible.set(id, entry.intersectionRatio);
                else
                    visible.delete(id);
            }
            if (visible.size === 0)
                return;
            let bestId = "";
            let bestRatio = 0;
            for (const [id, ratio] of visible) {
                if (ratio >= bestRatio) {
                    bestRatio = ratio;
                    bestId = id;
                }
            }
            if (bestId)
                setSpyId(bestId);
        }, { root: null, rootMargin: "-42% 0px -48% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] });
        for (const id of ids) {
            const node = document.getElementById(id);
            if (node)
                observer.observe(node);
        }
        return () => observer.disconnect();
    }, [links, pathname]);
    if (links.length === 0)
        return null;
    const traySx = {
        ...CLEAR_GLASS_SURFACE,
        borderRadius: `${MARKETING_DOCK_RADIUS}px`,
        border: "1px solid rgba(255, 255, 255, 0.42)",
        borderTopColor: "rgba(255, 255, 255, 0.62)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.48), 0 10px 28px rgba(20, 21, 23, 0.1)",
    };
    return (_jsxs(Box, { component: "nav", className: className, "aria-label": ariaLabel, sx: {
            position: "fixed",
            left: "50%",
            bottom: "var(--hcw-section-dock-bottom, 24px)",
            transform: "translateX(-50%)",
            zIndex: 1240,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 0.35,
            width: "min(40rem, calc(100vw - 1.5rem))",
            maxWidth: "calc(100vw - 1.5rem)",
            px: 0.5,
            py: 0.45,
            ...traySx,
        }, children: [activeLink ? (_jsx(Typography, { component: "p", "aria-live": "polite", sx: {
                    m: 0,
                    px: 1,
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    textAlign: "center",
                    color: colors.textHelper,
                }, children: activeLink.label })) : null, _jsx(Box, { sx: {
                    display: "flex",
                    alignItems: "stretch",
                    gap: 0.35,
                    width: "100%",
                    minWidth: 0,
                    px: 0.2,
                    pb: 0.15,
                }, children: links.map((l) => {
                    const active = l.href === activeHref;
                    return (_jsx(Box, { component: "a", href: l.href, "data-section-href": l.href, className: "hcw-section-dock-chip", "aria-current": active ? "location" : undefined, title: l.label, sx: {
                            flex: "1 1 0",
                            minWidth: 0,
                            minHeight: 32,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            px: 0.45,
                            py: 0.35,
                            fontSize: "0.6875rem",
                            letterSpacing: "0.01em",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign: "center",
                            ...sectionDockChipSx(active),
                        }, children: l.label }, l.href));
                }) })] }));
}
export default SectionDock;
