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
 * Cognitive contracts: CAPACITY · INTERRUPTION · AwarenessStrip · ActionOutcome ·
 * Mission/Decision/Phase orchestration · KpiStrip · logUxEvent.
 *
 *   import { KitRoot, ActionDockProvider, ActionDock, TaskbarFooter,
 *            useScreenActions, Surface, GlassRail, HealthGlassOrb,
 *            BrandMark, MissionHeader, DecisionQueue, KpiStrip,
 *            setUxEventSink } from "@hcw/ui-kit";
 *
 * Full catalog (attributes): docs/hcw-kit/14-HCW-CATALOG.md.
 * UX laws: docs/esti/HCW-UI-UX-PRINCIPLES.md.
 */
export * from "./tokens.js";
export { DIALOG_RADIUS, DOCK_PILL_RADIUS, ACTION_DOCK_TRAY, NEU_GROOVE_VERTICAL, NEU_GROOVE_HORIZONTAL, LIQUID_GLASS_BUTTON, DOCK_BUTTON_LIFT, SECTION_DOCK_CHIP_GLASS, liquidGlassButtonFor, } from "./tokens.js";
export { actionDockButtonSx, sectionDockChipSx, liquidGlassSpecimenSx, layoutSx, chromeIconSx, chromeIconSxFor, typeScaleSx, searchFieldSx, } from "./chrome-sx.js";
export { CHART_MARKERS, CHART_CHROME, chartChromeFor, chartMarkerAt, chartRootSx, withChartSeriesColors, } from "./charts.js";
export { ICON, ICON_SLOTS, ICON_SIZE, PICTOGRAM, HEALTH_PICTOGRAM, STATUS_PICTOGRAM, BRAND_ACCENT_SHAPES, } from "./pictograms.js";
export { createAormsTheme, createHcwTheme, aormsTheme, hcwTheme } from "./theme.js";
export { MuiRoot, KitRoot, HcwLocaleContext, useHcwLocale } from "./MuiRoot.js";
export { createHcwRtlCacheOptions, DEFAULT_LOCALE } from "./rtl.js";
export { buildTokenExport, buildTokensJson, buildTokensCss } from "./token-export.js";
export { BrandMark } from "./BrandMark.js";
export { Surface } from "./Surface.js";
export { GlassRail } from "./GlassRail.js";
export { HealthGlassOrb } from "./HealthGlassOrb.js";
export { ActionDock, ActionDockProvider, useScreenActions, useDockActions, } from "./ActionDock.js";
export { StatusDot, statusShapeFor } from "./StatusDot.js";
export { DataState } from "./DataState.js";
export { ConfirmModal } from "./ConfirmModal.js";
export { PageBreadcrumb } from "./PageBreadcrumb.js";
export { ToastHost, pushToast, dismissToast, useToasts, resetToasts } from "./Toast.js";
export { Avatar, getInitials } from "./Avatar.js";
export { SectionDock } from "./SectionDock.js";
export { TaskbarFooter, TaskbarButton, TASKBAR_HEIGHT } from "./TaskbarFooter.js";
export { AwarenessStrip } from "./AwarenessStrip.js";
export { publishOutcome, clearOutcome, resetOutcomes, useActionOutcome, useActionOutcomes, usePublishOutcome, } from "./ActionOutcome.js";
export { ActionOutcomeBanner } from "./ActionOutcomeBanner.js";
export { KpiStrip } from "./KpiStrip.js";
export { MissionHeader, ObjectiveList, PhaseStrip, ConfidenceBand, DecisionCard, DecisionQueue, FrozenDecisionRow, FreezeTable, } from "./orchestration.js";
export { assertCapacity, enforceCapacity, capacityCap, } from "./capacity.js";
export { logUxEvent, setUxEventSink, resetUxEventSink, logOrient, logDecision, logMission, logInterrupt, } from "./uxEvents.js";
export { trimDockActions, prioritizeDockActions } from "./ActionDock.js";
//# sourceMappingURL=index.js.map