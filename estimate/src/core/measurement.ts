/**
 * Measurement templates — which of Nos·L·B·H the estimator punches vs baked.
 * CPWD rate items rarely ship templates; we infer sensible defaults from UOM.
 */
import type { MeasurementFactor, MeasurementTemplate } from "@esti/contracts";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const punched = (): MeasurementFactor => ({ mode: "PUNCHED" });
const off = (): MeasurementFactor => ({ mode: "OFF" });
const fixed = (value: number): MeasurementFactor => ({ mode: "FIXED", value });

/** Sensible default templates when the rate book omits one. */
export function defaultMeasurementTemplate(uom: string): MeasurementTemplate {
  const u = uom.toLowerCase().replace(/\s/g, "");
  // Area — thickness is spec-only; qty = Nos × L × H (wall face) or Nos × L × B (slab)
  if (u === "m²" || u === "sqm" || u === "sq.m") {
    return { nos: punched(), l: punched(), b: off(), h: punched() };
  }
  // Volume
  if (u === "m³" || u === "cum" || u === "cu.m" || u === "cm") {
    return { nos: punched(), l: punched(), b: punched(), h: punched() };
  }
  // Running length
  if (u === "m" || u === "rm" || u === "rmt" || u === "metre" || u === "meter") {
    return { nos: punched(), l: punched(), b: off(), h: off() };
  }
  // Count / time / weight — pure Nos
  return { nos: punched(), l: off(), b: off(), h: off() };
}

function factorValue(
  factor: MeasurementFactor,
  punched: number | null | undefined,
): number {
  if (factor.mode === "OFF") return 1;
  if (factor.mode === "FIXED") return factor.value ?? 1;
  if (punched == null) return 1;
  return punched;
}

/** qty = Nos × L × B × H with template substitution (OFF = 1, FIXED = baked). */
export function measureQtyFromTemplate(
  m: { nos?: number; l?: number | null; b?: number | null; h?: number | null },
  template: MeasurementTemplate,
): number {
  const nos = factorValue(template.nos, m.nos ?? 1);
  const l = factorValue(template.l, m.l);
  const b = factorValue(template.b, m.b);
  const h = factorValue(template.h, m.h);
  return round3(nos * l * b * h);
}

/** Human label for which dimensions the estimator should fill. */
export function templateHint(template: MeasurementTemplate): string {
  const parts: string[] = [];
  if (template.nos.mode === "PUNCHED") parts.push("Nos");
  if (template.l.mode === "PUNCHED") parts.push("L");
  if (template.b.mode === "PUNCHED") parts.push("B");
  if (template.h.mode === "PUNCHED") parts.push("H");
  const fixedParts: string[] = [];
  if (template.l.mode === "FIXED") fixedParts.push(`L=${template.l.value}`);
  if (template.b.mode === "FIXED") fixedParts.push(`B=${template.b.value}`);
  if (template.h.mode === "FIXED") fixedParts.push(`H=${template.h.value}`);
  const hint = parts.length ? `Enter ${parts.join(" × ")}` : "Enter Nos";
  return fixedParts.length ? `${hint} (fixed: ${fixedParts.join(", ")})` : hint;
}
