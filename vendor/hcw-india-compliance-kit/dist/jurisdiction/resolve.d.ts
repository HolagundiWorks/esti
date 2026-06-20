import type { ComplianceJurisdiction, ComplianceRuleSetRef } from "./types.js";
/** Higher score = more specific jurisdiction match. */
export declare function jurisdictionSpecificityScore(j: ComplianceJurisdiction): number;
/** Rule jurisdiction must match query; unset rule fields are wildcards. */
export declare function matchesJurisdiction(ruleJurisdiction: ComplianceJurisdiction, query: ComplianceJurisdiction): boolean;
/** Pick the most specific published rule set for a jurisdiction. */
export declare function resolveRuleSetRef(candidates: ComplianceRuleSetRef[], jurisdiction: ComplianceJurisdiction): ComplianceRuleSetRef | undefined;
//# sourceMappingURL=resolve.d.ts.map