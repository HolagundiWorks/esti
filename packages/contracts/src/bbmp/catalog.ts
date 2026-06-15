import type {
  FarRuleRow,
  HighriseSetbackRow,
  LowriseSetbackRow,
  ParkingRuleRow,
  RoadMarginRow,
  SecondaryRuleRow,
  SolarRuleRow,
} from "./rules.js";
import {
  BBMP_ENGINE_CONSTANT_DEFAULTS,
  BBMP_FAR_RULES,
  BBMP_HIGHRISE_SETBACK_RULES,
  BBMP_LOWRISE_SETBACK_RULES,
  BBMP_PARKING_RULES,
  BBMP_ROAD_MARGINS,
  BBMP_SECONDARY_RULES,
  BBMP_SOLAR_RULES,
} from "./rules.js";

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

export const DEFAULT_BBMP_RULE_CATALOG: BbmpRuleCatalog = {
  label: "BBMP Building Bye-Laws 2003 (code default)",
  far: BBMP_FAR_RULES,
  lowriseSetbacks: BBMP_LOWRISE_SETBACK_RULES,
  highriseSetbacks: BBMP_HIGHRISE_SETBACK_RULES,
  roadMargins: BBMP_ROAD_MARGINS,
  parkingRules: BBMP_PARKING_RULES,
  solarRules: BBMP_SOLAR_RULES,
  secondaryRules: BBMP_SECONDARY_RULES,
  engineConstants: BBMP_ENGINE_CONSTANT_DEFAULTS,
};
