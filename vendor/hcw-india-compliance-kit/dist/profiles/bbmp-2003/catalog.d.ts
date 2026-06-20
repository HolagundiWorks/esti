import type { FarRuleRow, HighriseSetbackRow, LowriseSetbackRow, ParkingRuleRow, RoadMarginRow, SecondaryRuleRow, SolarRuleRow } from "./rules.js";
/** Numeric engine thresholds loaded from `esti_bbmp_engine_constant`. */
export interface BbmpEngineConstants {
    lowriseHeightM: number;
    basementMinHeightM: number;
    basementMaxHeightM: number;
    basementMechParkingHeightM: number;
    basementMaxProjectionM: number;
    visitorParkingPct: number;
    sqmPerEcs: number;
}
/** Modular BBMP rule tables loaded from DB or code defaults. */
export interface BbmpRuleCatalog {
    ruleSetId?: string;
    label?: string;
    far: FarRuleRow[];
    lowriseSetbacks: LowriseSetbackRow[];
    highriseSetbacks: HighriseSetbackRow[];
    roadMargins: RoadMarginRow[];
    parkingRules: ParkingRuleRow[];
    solarRules: SolarRuleRow[];
    secondaryRules: SecondaryRuleRow[];
    engineConstants: BbmpEngineConstants;
}
export declare const DEFAULT_BBMP_RULE_CATALOG: BbmpRuleCatalog;
//# sourceMappingURL=catalog.d.ts.map