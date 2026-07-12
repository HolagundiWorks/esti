/**
 * @hcw/ui-kit — HCW-UI-Kit (Human Centric Works). The centralised, LAYERED design
 * system deployed against every portal.
 *
 * Thesis: **depth encodes importance.** Three material languages stack by z-depth:
 *   1. Hyperminimalist (FLAT)   — information at rest: tables, text, inputs.
 *   2. Neumorphic      (SOFT)   — objects you work within: widgets, cards, dialogs.
 *   3. Glassmorphism   (GLASS)  — the live layer: hover, CTAs, the dock, alerts.
 *
 * Spatial model: Rail · Stage · TaskbarFooter · ActionDock.
 *
 *   import { MuiRoot, ActionDockProvider, ActionDock, TaskbarFooter,
 *            useScreenActions, Surface, GlassRail, HealthGlassOrb,
 *            BrandMark } from "@hcw/ui-kit";
 *
 * Full spec: docs/esti/HCW-UI-KIT.md.
 */
export * from "./tokens.js";
export { DIALOG_RADIUS, DOCK_PILL_RADIUS, ACTION_DOCK_TRAY, NEU_GROOVE_VERTICAL, NEU_GROOVE_HORIZONTAL, LIQUID_GLASS_BUTTON, DOCK_BUTTON_LIFT, SECTION_DOCK_CHIP_GLASS, } from "./tokens.js";
export { actionDockButtonSx, sectionDockChipSx, liquidGlassSpecimenSx, } from "./chrome-sx.js";
export { createAormsTheme, aormsTheme } from "./theme.js";
export { MuiRoot } from "./MuiRoot.js";
export { BrandMark } from "./BrandMark.js";
export { Surface } from "./Surface.js";
export { GlassRail } from "./GlassRail.js";
export { HealthGlassOrb } from "./HealthGlassOrb.js";
export { ActionDock, ActionDockProvider, useScreenActions, useDockActions, } from "./ActionDock.js";
export { StatusDot } from "./StatusDot.js";
export { DataState } from "./DataState.js";
export { ConfirmModal } from "./ConfirmModal.js";
export { PageBreadcrumb } from "./PageBreadcrumb.js";
export { ToastHost, pushToast, dismissToast, useToasts, resetToasts } from "./Toast.js";
export { Avatar, getInitials } from "./Avatar.js";
export { SectionDock } from "./SectionDock.js";
export { TaskbarFooter, TaskbarButton, TASKBAR_HEIGHT } from "./TaskbarFooter.js";
