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
 *            useScreenActions, Surface, BrandMark } from "@hcw/ui-kit";
 *
 * Full spec: docs/esti/HCW-UI-KIT.md.
 */
export * from "./tokens.js";
export { createAormsTheme, aormsTheme } from "./theme.js";
export { MuiRoot } from "./MuiRoot.js";
export { BrandMark } from "./BrandMark.js";
export { Surface } from "./Surface.js";
export {
  ActionDock,
  ActionDockProvider,
  useScreenActions,
  useDockActions,
} from "./ActionDock.js";
export type { DockAction, DockZone, DockTone } from "./ActionDock.js";
export { TaskbarFooter, TaskbarButton, TASKBAR_HEIGHT } from "./TaskbarFooter.js";
