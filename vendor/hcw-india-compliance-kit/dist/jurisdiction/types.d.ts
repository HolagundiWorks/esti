/** Pan-India jurisdiction key — rules resolve at the most specific level available. */
export type ComplianceJurisdiction = {
    /** ISO 3166-2:IN state code, e.g. IN-KA */
    stateCode: string;
    district?: string;
    taluka?: string;
    planningZone?: string;
    /** Authority profile id, e.g. bbmp-2003 */
    authorityId?: string;
};
export type ComplianceRuleSetStatus = "DRAFT" | "PUBLISHED";
export type ComplianceRuleSetRef = {
    jurisdiction: ComplianceJurisdiction;
    effectiveDate: string;
    versionLabel: string;
    status: ComplianceRuleSetStatus;
};
//# sourceMappingURL=types.d.ts.map