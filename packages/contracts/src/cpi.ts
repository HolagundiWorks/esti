import { z } from "zod";

/**
 * Client–Project Intelligence (CPI) — the residential project onboarding &
 * program-formulation questionnaire. 21 sections build a psychological and
 * functional client profile; the deliverable is a synthesized Client
 * Intelligence Report (Section 21) that becomes the design brief foundation.
 *
 * Responses are free-shaped per section (`Record<string, unknown>` JSONB) —
 * the question set is presentational and lives with the UI; this contract
 * fixes the section ids, ordering, and the report structure.
 */

export const CpiSectionId = z.enum([
  "aboutYou",
  "currentHome",
  "dailyLife",
  "lifestyleProfile",
  "emotionalGoals",
  "designPersonality",
  "aestheticIntelligence",
  "colourIntelligence",
  "lightIntelligence",
  "furnitureBehaviour",
  "textureIntelligence",
  "scaleIntelligence",
  "storageIntelligence",
  "kitchenIntelligence",
  "bathroomIntelligence",
  "technologyIntelligence",
  "sustainabilityIntelligence",
  "budgetIntelligence",
  "projectPriorities",
  "imageIntelligence",
]);
export type CpiSectionId = z.infer<typeof CpiSectionId>;

/** Canonical section order + titles (Section 21 is the report, not a form). */
export const CPI_SECTIONS: ReadonlyArray<{ id: CpiSectionId; no: number; title: string }> = [
  { id: "aboutYou", no: 1, title: "About You" },
  { id: "currentHome", no: 2, title: "Your Current Home" },
  { id: "dailyLife", no: 3, title: "Your Daily Life" },
  { id: "lifestyleProfile", no: 4, title: "Lifestyle Profile" },
  { id: "emotionalGoals", no: 5, title: "Emotional Goals" },
  { id: "designPersonality", no: 6, title: "Design Personality" },
  { id: "aestheticIntelligence", no: 7, title: "Aesthetic Intelligence" },
  { id: "colourIntelligence", no: 8, title: "Colour Intelligence" },
  { id: "lightIntelligence", no: 9, title: "Light Intelligence" },
  { id: "furnitureBehaviour", no: 10, title: "Furniture Behaviour" },
  { id: "textureIntelligence", no: 11, title: "Texture Intelligence" },
  { id: "scaleIntelligence", no: 12, title: "Scale Intelligence" },
  { id: "storageIntelligence", no: 13, title: "Storage Intelligence" },
  { id: "kitchenIntelligence", no: 14, title: "Kitchen Intelligence" },
  { id: "bathroomIntelligence", no: 15, title: "Bathroom Intelligence" },
  { id: "technologyIntelligence", no: 16, title: "Technology Intelligence" },
  { id: "sustainabilityIntelligence", no: 17, title: "Sustainability Intelligence" },
  { id: "budgetIntelligence", no: 18, title: "Budget Intelligence" },
  { id: "projectPriorities", no: 19, title: "Project Priorities" },
  { id: "imageIntelligence", no: 20, title: "Image Intelligence (Visual Calibration)" },
];

/** Section payloads are free-shaped but bounded (JSONB, ~32 KB per section). */
export const CPI_SECTION_MAX_BYTES = 32_000;

export const CpiUpsertSection = z
  .object({
    projectId: z.string().uuid(),
    section: CpiSectionId,
    data: z.record(z.string(), z.unknown()),
  })
  .refine((v) => JSON.stringify(v.data).length <= CPI_SECTION_MAX_BYTES, {
    message: "Section payload too large",
  });
export type CpiUpsertSection = z.infer<typeof CpiUpsertSection>;

/** Section 21 — the Designer's Intelligence Report (the CPI deliverable). */
export const CpiReport = z.object({
  designDna: z.string().trim().max(400),
  colourPalette: z.string().trim().max(600),
  materialPreferences: z.string().trim().max(600),
  spatialPreferences: z.string().trim().max(600),
  lightingPreferences: z.string().trim().max(600),
  lifestyleDrivers: z.string().trim().max(800),
  luxuryPriorities: z.string().trim().max(600),
  avoidances: z.string().trim().max(600),
  summary: z.string().trim().max(4000),
});
export type CpiReport = z.infer<typeof CpiReport>;

export const CPI_REPORT_FIELDS: ReadonlyArray<{ key: keyof CpiReport; label: string }> = [
  { key: "designDna", label: "Design DNA" },
  { key: "colourPalette", label: "Colour Palette" },
  { key: "materialPreferences", label: "Material Preferences" },
  { key: "spatialPreferences", label: "Spatial Preferences" },
  { key: "lightingPreferences", label: "Lighting Preferences" },
  { key: "lifestyleDrivers", label: "Lifestyle Drivers" },
  { key: "luxuryPriorities", label: "Luxury Priorities" },
  { key: "avoidances", label: "Avoidances" },
  { key: "summary", label: "Brief Summary" },
];

/**
 * Parse the model's CPI_REPORT output into a validated report. Accepts a bare
 * JSON object, optionally wrapped in prose / ```json fences. Missing fields
 * default to empty strings; returns null when nothing parseable is found.
 */
export function parseCpiReport(text: string): CpiReport | null {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const pick = (k: string) => (typeof obj[k] === "string" ? (obj[k] as string) : "");
  const parsed = CpiReport.safeParse({
    designDna: pick("designDna").slice(0, 400),
    colourPalette: pick("colourPalette").slice(0, 600),
    materialPreferences: pick("materialPreferences").slice(0, 600),
    spatialPreferences: pick("spatialPreferences").slice(0, 600),
    lightingPreferences: pick("lightingPreferences").slice(0, 600),
    lifestyleDrivers: pick("lifestyleDrivers").slice(0, 800),
    luxuryPriorities: pick("luxuryPriorities").slice(0, 600),
    avoidances: pick("avoidances").slice(0, 600),
    summary: pick("summary").slice(0, 4000),
  });
  return parsed.success ? parsed.data : null;
}
