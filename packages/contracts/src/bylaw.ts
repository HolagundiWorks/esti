import { z } from "zod";

/**
 * Development-control (zoning / building-bylaw) compliance parameters tracked
 * per project, paired with the statutory permit tracker. Each parameter has a
 * permitted limit (from the local DCR / bylaw) and a proposed design value;
 * compliance depends on the parameter's direction.
 *
 * direction "max" → proposed must be <= permitted (FAR, coverage, height)
 * direction "min" → proposed must be >= permitted (setbacks, parking)
 */
export const BYLAW_PARAMETERS = {
  FAR: { label: "Floor Area Ratio (FAR/FSI)", unit: "ratio", direction: "max" },
  GROUND_COVERAGE: { label: "Ground coverage", unit: "%", direction: "max" },
  MAX_HEIGHT: { label: "Maximum height", unit: "m", direction: "max" },
  FRONT_SETBACK: { label: "Front setback", unit: "m", direction: "min" },
  REAR_SETBACK: { label: "Rear setback", unit: "m", direction: "min" },
  SIDE_SETBACK: { label: "Side setback", unit: "m", direction: "min" },
  PARKING: { label: "Parking provision", unit: "ECS", direction: "min" },
} as const;

export type BylawParameterCode = keyof typeof BYLAW_PARAMETERS;
export const BylawParameter = z.enum(
  Object.keys(BYLAW_PARAMETERS) as [BylawParameterCode, ...BylawParameterCode[]],
);

export type BylawCompliance = "compliant" | "violation" | "pending";

/** Compliance verdict given a parameter's direction and the two values. */
export function bylawCompliance(
  direction: "max" | "min",
  permitted: number | null | undefined,
  proposed: number | null | undefined,
): BylawCompliance {
  if (permitted == null || proposed == null) return "pending";
  return direction === "max"
    ? proposed <= permitted
      ? "compliant"
      : "violation"
    : proposed >= permitted
      ? "compliant"
      : "violation";
}

export const BylawCreate = z.object({
  projectId: z.string().uuid(),
  parameter: BylawParameter,
  permittedValue: z.number().nonnegative(),
  proposedValue: z.number().nonnegative().nullable().optional(),
  clause: z.string().max(120).optional(),
  remarks: z.string().max(500).optional(),
});
export type BylawCreate = z.infer<typeof BylawCreate>;

export const BylawUpdate = z.object({
  id: z.string().uuid(),
  permittedValue: z.number().nonnegative().optional(),
  proposedValue: z.number().nonnegative().nullable().optional(),
  clause: z.string().max(120).optional(),
  remarks: z.string().max(500).optional(),
});
export type BylawUpdate = z.infer<typeof BylawUpdate>;
