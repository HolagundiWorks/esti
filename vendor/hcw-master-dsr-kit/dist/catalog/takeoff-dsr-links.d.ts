export type TakeoffDsrLink = {
    takeoffId: string;
    code: string;
    description: string;
    unit: string;
};
/** Minimal takeoff → DSR code mapping (no esti takeoff dependency). */
export declare const TAKEOFF_DSR_LINKS: TakeoffDsrLink[];
export declare const TAKEOFF_DSR_LINKS_BY_CODE: Map<string, TakeoffDsrLink>;
//# sourceMappingURL=takeoff-dsr-links.d.ts.map