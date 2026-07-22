import type { ReactNode } from "react";
import { STATUS_SHAPE } from "./tokens.js";
export type StatusShape = "circle" | "triangle" | "square";
export declare function StatusDot({ color, label, size, shape, }: {
    color?: string;
    label: ReactNode;
    size?: "sm" | "md";
    /** Preattentive channel — pair with severity (see STATUS_SHAPE). */
    shape?: StatusShape;
}): import("react").JSX.Element;
/** Map a severity keyword to the sanctioned preattentive shape. */
export declare function statusShapeFor(severity: keyof typeof STATUS_SHAPE): (typeof STATUS_SHAPE)[keyof typeof STATUS_SHAPE];
export default StatusDot;
//# sourceMappingURL=StatusDot.d.ts.map