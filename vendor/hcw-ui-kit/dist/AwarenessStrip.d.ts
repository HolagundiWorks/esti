import type { ReactNode } from "react";
export type OpenLoop = {
    id: string;
    label: string;
    /** Optional control rendered inline (link/button). */
    action?: ReactNode;
};
export type AwarenessStripProps = {
    state?: ReactNode;
    meaning?: ReactNode;
    next?: ReactNode;
    loops?: OpenLoop[];
    /** Marks `next` as needs-judgment (Lee & See trust — interrupt-worthy). */
    judgment?: boolean;
};
export declare function AwarenessStrip({ state, meaning, next, loops, judgment, }: AwarenessStripProps): import("react").JSX.Element | null;
export default AwarenessStrip;
//# sourceMappingURL=AwarenessStrip.d.ts.map