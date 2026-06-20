export * from "./jurisdiction/types.js";
export * from "./jurisdiction/resolve.js";
export * from "./bylawcalc.js";
export * from "./profiles/bbmp-2003/index.js";
export type { BbmpRuleCatalog as ComplianceRuleCatalog } from "./profiles/bbmp-2003/catalog.js";
import type { BbmpRuleCatalog } from "./profiles/bbmp-2003/catalog.js";
import type { BbmpComplianceInput, BbmpComplianceResult } from "./profiles/bbmp-2003/types.js";
/** Generic compliance entry — dispatches to authority profiles. */
export declare function computeCompliance(input: BbmpComplianceInput, catalog: BbmpRuleCatalog, profileId?: string): BbmpComplianceResult;
//# sourceMappingURL=index.d.ts.map