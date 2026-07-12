/**
 * Shared MUI `sx` recipes — single source for chrome that must match across portals.
 * Redesign a look here (or in `tokens.ts`), then use the kit component or import
 * these helpers; do not duplicate rgba/blur recipes in `landing.scss` / `glass.scss`.
 */
import type { SxProps, Theme } from "@mui/material/styles";
/** ActionDock button — flat pill at rest, liquid-glass capsule on hover/focus. */
export declare function actionDockButtonSx(ink: string, opts?: {
    iconOnly?: boolean;
    fontWeight?: number;
}): SxProps<Theme>;
/** SectionDock chip — clear liquid glass (marketing section carousel). */
export declare function sectionDockChipSx(active: boolean): SxProps<Theme>;
/** Static specimen / label chip — liquid glass at rest (e.g. design-system legend). */
export declare function liquidGlassSpecimenSx(ink?: "#FF4F18"): SxProps<Theme>;
