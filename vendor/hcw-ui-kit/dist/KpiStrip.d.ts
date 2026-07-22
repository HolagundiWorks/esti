import type { ReactNode } from "react";
export type KpiItem = {
    id: string;
    label: ReactNode;
    value: ReactNode;
    /** Optional click — keep rare; prefer dock for primary actions. */
    onClick?: () => void;
};
export type KpiStripProps = {
    items: KpiItem[];
    "aria-label"?: string;
};
export declare function KpiStrip({ items, "aria-label": ariaLabel, }: KpiStripProps): import("react").JSX.Element | null;
export default KpiStrip;
//# sourceMappingURL=KpiStrip.d.ts.map