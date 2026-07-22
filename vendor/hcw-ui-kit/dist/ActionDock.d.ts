/**
 * ActionDock — the single, global, context-aware action bar. Every screen's CTAs
 * live here, not inline. A screen publishes its actions with `useScreenActions`;
 * the dock renders them in three fixed zones for muscle memory:
 *
 *   LEFT   = exit / destroy   (Delete · Discard · Cancel)      — red tone
 *   CENTER = generate         (Add · Create · New)             — orange (primary)
 *   RIGHT  = commit           (Save · Edit · Save changes)     — orange (primary)
 *
 * Buttons are flat pill at rest and lift to liquid-glass capsule on hover (Layer 3) — only
 * text-entry wells use neumorphic inset depth. The dock tray itself is ACTION_DOCK_TRAY
 * (NEU_RAISED capsule, Layer 2).
 * The dock floats bottom-centre, above the taskbar footer, and hides when no screen
 * has published actions.
 *
 * Capacity: visible actions capped at {@link CAPACITY.dockVisibleActions} (trim + warn).
 * Telemetry: optional `track` / `outcome` on {@link DockAction} (see KPI instrument).
 * Zones are **semantic roles** (destroy · create · commit), not physical sides — not remapped under RTL.
 *
 * **Modal exception:** while a create/edit `Dialog` is open, publish `[]` so the
 * dock does not compete with `DialogActions` (commit stays in the dialog). Re-publish
 * screen actions when the dialog closes.
 *
 * **Marketing exception:** public `MarketingShell` mounts its own `ActionDockProvider`.
 * Create-account / Sign-in live **only** in the dock — never duplicate them in the
 * marketing rail (Hick / Fitts / single CTA locus).
 */
import { type ReactNode } from "react";
import { type OutcomeStatus } from "./ActionOutcome.js";
export type DockZone = "left" | "center" | "right";
export type DockTone = "default" | "primary" | "danger";
export interface DockAction {
    id: string;
    label: string;
    zone: DockZone;
    onClick: () => void;
    icon?: ReactNode;
    tone?: DockTone;
    disabled?: boolean;
    /** Show only the icon (label still used as the tooltip / aria-label). */
    iconOnly?: boolean;
    /**
     * When set, `publishOutcome` runs after `onClick` (sync success path).
     * Async flows should call `publishOutcome` themselves.
     */
    outcome?: {
        status: OutcomeStatus;
        label: string;
        detail?: string;
    };
    /**
     * Emit `ux.dock` (and `ux.outcome` when `outcome` is set). Defaults to true
     * when `outcome` is present; otherwise false.
     */
    track?: boolean;
}
/** Prefer primary/danger, then zone order left→center→right, then original order. */
export declare function prioritizeDockActions(actions: readonly DockAction[]): DockAction[];
/** Cap + warn; keeps highest-priority actions when over {@link CAPACITY.dockVisibleActions}. */
export declare function trimDockActions(actions: readonly DockAction[]): DockAction[];
export declare function ActionDockProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
/**
 * Publish the current screen's actions to the global dock. Pass a `deps` array
 * (like useEffect) so the dock re-syncs when the actions' handlers/state change.
 * Actions clear automatically when the screen unmounts.
 */
export declare function useScreenActions(actions: DockAction[], deps?: unknown[]): void;
export declare function useDockActions(): DockAction[];
export declare function ActionDock(): import("react").JSX.Element | null;
export default ActionDock;
//# sourceMappingURL=ActionDock.d.ts.map