/**
 * TaskbarFooter — full-width bottom bar (HCW spatial model).
 * Parity with workspace `AppFooterBar` launcher layout:
 *
 *   LEFT   — utilities (calculator, health, …)
 *   CENTER — primary launchers (home, search, Ask ESTI, …)
 *   RIGHT  — tray (clock, alerts, identity, sign-out)
 *
 * Default surface is flat white; pass `sx` / glass tokens for frosted chrome.
 * Workspace keeps `AppFooterBar` as the product composition; this is the kit shell.
 *
 *   <TaskbarFooter left={…} center={…} right={…} />
 */
import { type BoxProps } from "@mui/material";
import { type ReactNode } from "react";
export declare const TASKBAR_HEIGHT = 56;
/** A neumorphic launcher chip for the footer's left cluster. */
export declare function TaskbarButton({ icon, label, onClick, active, }: {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    active?: boolean;
}): import("react").JSX.Element;
export declare function TaskbarFooter({ left, center, right, showClock, sx, ...rest }: {
    left?: ReactNode;
    center?: ReactNode;
    /** Tray cluster (alerts, ID, sign-out). Clock prepends when `showClock`. */
    right?: ReactNode;
    showClock?: boolean;
} & BoxProps): import("react").JSX.Element;
export default TaskbarFooter;
//# sourceMappingURL=TaskbarFooter.d.ts.map