/** Higher score = more specific jurisdiction match. */
export function jurisdictionSpecificityScore(j) {
    let score = 0;
    if (j.district)
        score += 1;
    if (j.taluka)
        score += 2;
    if (j.planningZone)
        score += 4;
    if (j.authorityId)
        score += 8;
    return score;
}
/** Rule jurisdiction must match query; unset rule fields are wildcards. */
export function matchesJurisdiction(ruleJurisdiction, query) {
    if (ruleJurisdiction.stateCode !== query.stateCode)
        return false;
    for (const key of ["district", "taluka", "planningZone", "authorityId"]) {
        const ruleValue = ruleJurisdiction[key];
        if (ruleValue !== undefined && ruleValue !== query[key])
            return false;
    }
    return true;
}
/** Pick the most specific published rule set for a jurisdiction. */
export function resolveRuleSetRef(candidates, jurisdiction) {
    const matching = candidates.filter((c) => c.status === "PUBLISHED" && matchesJurisdiction(c.jurisdiction, jurisdiction));
    if (matching.length === 0)
        return undefined;
    matching.sort((a, b) => {
        const spec = jurisdictionSpecificityScore(b.jurisdiction) -
            jurisdictionSpecificityScore(a.jurisdiction);
        if (spec !== 0)
            return spec;
        return b.effectiveDate.localeCompare(a.effectiveDate);
    });
    return matching[0];
}
