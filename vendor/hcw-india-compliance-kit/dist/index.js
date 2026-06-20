export * from "./jurisdiction/types.js";
export * from "./jurisdiction/resolve.js";
export * from "./bylawcalc.js";
export * from "./profiles/bbmp-2003/index.js";
import { computeBbmpCompliance } from "./profiles/bbmp-2003/engine.js";
/** Generic compliance entry — dispatches to authority profiles. */
export function computeCompliance(input, catalog, profileId = "bbmp-2003") {
    if (profileId === "bbmp-2003")
        return computeBbmpCompliance(input, catalog);
    throw new Error(`Unsupported compliance profile: ${profileId}`);
}
