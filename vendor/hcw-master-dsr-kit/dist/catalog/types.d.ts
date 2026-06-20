export type DsrSourceKind = "CPWD" | "STATE";
export type DsrCatalogRef = {
    source: DsrSourceKind;
    /** ISO 3166-2 state code when source === STATE (e.g. KA, MH) */
    stateCode?: string;
    /** Financial year label e.g. 2026-27 */
    fyLabel: string;
    /** Human label e.g. CPWD DAR 2026, Karnataka SSR Building */
    label: string;
};
export type DsrItemDef = {
    code: string;
    description: string;
    unit: string;
    ratePaise: number;
};
export type DsrVersionStatus = "DRAFT" | "PUBLISHED";
//# sourceMappingURL=types.d.ts.map