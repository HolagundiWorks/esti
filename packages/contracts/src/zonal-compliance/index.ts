import { zonalCity } from "./cities.js";
import { computeHosapeteZonal } from "./hospete.js";
import type { ZonalComplianceReport, ZonalSiteInput } from "./types.js";

export function computeZonalCompliance(input: ZonalSiteInput): ZonalComplianceReport {
  const city = zonalCity(input.cityId);
  if (!city) {
    return { ok: false, error: "Unknown city / planning authority" };
  }
  if (!city.calculatorReady) {
    return {
      ok: false,
      error: `${city.label} calculator is not yet wired in AORMS — reference data is in docs/reference/zonal-compliance/.`,
    };
  }

  try {
    if (input.cityId === "hosapete") {
      return computeHosapeteZonal(input);
    }
    return { ok: false, error: "Calculator not implemented for this authority" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation failed";
    return { ok: false, error: message };
  }
}

export {
  ZONAL_CITIES,
  zonalCity,
} from "./cities.js";
export {
  HOSAPETE_BAND_LABELS,
  HOSAPETE_BUILDING_LINE,
  HOSAPETE_BUILDING_LINE_KEYS,
  HOSAPETE_BUILDING_TYPES,
  HOSAPETE_BUILDING_TYPE_KEYS,
  computeHosapeteZonal,
} from "./hospete.js";
export * from "./types.js";
