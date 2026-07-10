import { HealthGlassOrb } from "@hcw/ui-kit";
import type { ZoneState } from "../dashboard/zoneState.js";

/**
 * Office-health indicator — thin app wrapper over kit `HealthGlassOrb`.
 * Keeps ZoneState typing and “Office health” aria copy for the workspace shell.
 */
export function OfficeHealthGlyph({
  state,
  size = 14,
  title,
  variant = "flat",
}: {
  state: ZoneState;
  size?: number;
  title?: string;
  /** `glass` — glowing liquid-glass orb (canonical zone/office health indicator). */
  variant?: "flat" | "glass";
}) {
  return (
    <HealthGlassOrb
      state={state}
      size={size}
      title={title ?? `Office health: ${state}`}
      variant={variant}
    />
  );
}
