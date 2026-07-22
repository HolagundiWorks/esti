/**
 * GlassRail — rail · stage spatial shell for portals / auth / account surfaces.
 * App chrome (ribbon workspace) keeps its own RailLayout; this is the kit
 * primitive for layouts that share the same spatial model.
 *
 *   glass="frost"  — default Layer 3 frosted glass (portals, auth)
 *   glass="clear"  — clear glass so atmosphere/canvas shows through (marketing-like)
 *
 * Widths/paddings come from {@link LAYOUT} — do not hardcode shell geometry.
 */
import { type BoxProps } from "@mui/material";
import type { ReactNode } from "react";
export declare function GlassRail({ rail, children, railAriaLabel, mainId, glass, sx, ...rest }: {
    rail: ReactNode;
    children: ReactNode;
    railAriaLabel?: string;
    /** Landmark id for skip links. */
    mainId?: string;
    /** `frost` = GLASS_SURFACE · `clear` = CLEAR_GLASS_SURFACE (see HCW-UI-KIT.md). */
    glass?: "frost" | "clear";
} & Omit<BoxProps, "children">): import("react").JSX.Element;
//# sourceMappingURL=GlassRail.d.ts.map