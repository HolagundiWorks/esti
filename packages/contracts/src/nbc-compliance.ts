import { z } from "zod";

/**
 * NBC-IND-2016 permissible-development engine — a pure TypeScript port of
 * crates/nbc-core (Rust) from the nbc_compliance repo. Given minimal site inputs
 * (area, width, depth, frontage, land-use zone) it derives the permissible
 * development envelope (FAR, coverage, setbacks, height/floors, parking, open
 * space) from per-zone authority limits. Deterministic, no I/O, no React.
 *
 * Authority limits are representative defaults of typical Indian municipal
 * bye-laws — override per jurisdiction before relying on a verdict for a real
 * submission. See docs/esti/COMPLIANCE-NBC.md.
 */
export const NBC_RULES_VERSION = "NBC-IND-2016";
export const FLOOR_TO_FLOOR_M = 3.0;

// ── Land-use zones + per-zone authority limits ──────────────────────────────
export type NbcZone = {
  code: string;
  category: string;
  subCategory: string;
  maxFar: number;
  maxGroundCoverage: number; // ratio 0..1
  maxHeightM: number;
  setbacks: { front: number; rear: number; side1: number; side2: number };
  minOpenSpace: number; // ratio 0..1
  parkingPerSqm: number; // 1 ECS per N m² built-up
};

export const NBC_ZONES: NbcZone[] = [
  { code: "R-1", category: "Residential", subCategory: "Primary Residential Zone", maxFar: 1.8, maxGroundCoverage: 0.5, maxHeightM: 15, setbacks: { front: 3, rear: 3, side1: 3, side2: 3 }, minOpenSpace: 0.3, parkingPerSqm: 100 },
  { code: "R-2", category: "Residential", subCategory: "Informal Residential Zone", maxFar: 1.5, maxGroundCoverage: 0.6, maxHeightM: 12, setbacks: { front: 2, rear: 2, side1: 1.5, side2: 1.5 }, minOpenSpace: 0.2, parkingPerSqm: 120 },
  { code: "C-1", category: "Commercial", subCategory: "Retail Shopping", maxFar: 2.5, maxGroundCoverage: 0.6, maxHeightM: 24, setbacks: { front: 4.5, rear: 3, side1: 3, side2: 3 }, minOpenSpace: 0.25, parkingPerSqm: 50 },
  { code: "C-2", category: "Commercial", subCategory: "General Business District", maxFar: 3.0, maxGroundCoverage: 0.5, maxHeightM: 45, setbacks: { front: 6, rear: 4.5, side1: 4.5, side2: 4.5 }, minOpenSpace: 0.3, parkingPerSqm: 50 },
  { code: "C-3", category: "Commercial", subCategory: "Warehousing", maxFar: 1.5, maxGroundCoverage: 0.6, maxHeightM: 18, setbacks: { front: 6, rear: 4.5, side1: 4.5, side2: 4.5 }, minOpenSpace: 0.25, parkingPerSqm: 80 },
  { code: "I-1", category: "Industrial", subCategory: "Light Industry", maxFar: 1.5, maxGroundCoverage: 0.5, maxHeightM: 18, setbacks: { front: 6, rear: 6, side1: 4.5, side2: 4.5 }, minOpenSpace: 0.35, parkingPerSqm: 100 },
  { code: "I-2", category: "Industrial", subCategory: "Heavy Industry", maxFar: 1.2, maxGroundCoverage: 0.45, maxHeightM: 24, setbacks: { front: 9, rear: 6, side1: 6, side2: 6 }, minOpenSpace: 0.4, parkingPerSqm: 100 },
  { code: "I-3", category: "Industrial", subCategory: "Hazardous Industry", maxFar: 1.0, maxGroundCoverage: 0.4, maxHeightM: 18, setbacks: { front: 12, rear: 9, side1: 9, side2: 9 }, minOpenSpace: 0.5, parkingPerSqm: 120 },
  { code: "PS-1", category: "Public Semi Public", subCategory: "Government Offices", maxFar: 2.0, maxGroundCoverage: 0.4, maxHeightM: 30, setbacks: { front: 6, rear: 4.5, side1: 4.5, side2: 4.5 }, minOpenSpace: 0.4, parkingPerSqm: 60 },
  { code: "PS-4", category: "Public Semi Public", subCategory: "Educational", maxFar: 2.0, maxGroundCoverage: 0.4, maxHeightM: 18, setbacks: { front: 6, rear: 6, side1: 4.5, side2: 4.5 }, minOpenSpace: 0.45, parkingPerSqm: 80 },
  { code: "PS-5", category: "Public Semi Public", subCategory: "Medical", maxFar: 2.5, maxGroundCoverage: 0.4, maxHeightM: 30, setbacks: { front: 6, rear: 6, side1: 6, side2: 6 }, minOpenSpace: 0.45, parkingPerSqm: 50 },
  { code: "P-1", category: "Recreational", subCategory: "Playground/Stadium", maxFar: 0.5, maxGroundCoverage: 0.15, maxHeightM: 15, setbacks: { front: 6, rear: 6, side1: 6, side2: 6 }, minOpenSpace: 0.7, parkingPerSqm: 40 },
  { code: "P-2", category: "Recreational", subCategory: "Parks", maxFar: 0.2, maxGroundCoverage: 0.05, maxHeightM: 9, setbacks: { front: 6, rear: 6, side1: 6, side2: 6 }, minOpenSpace: 0.9, parkingPerSqm: 200 },
];

export function nbcZone(code: string): NbcZone | undefined {
  return NBC_ZONES.find((z) => z.code === code);
}

// ── NBC rules catalog (Section 1) — for the Compliance Library ──────────────
export type NbcRuleCategory =
  | "PlotDevelopment"
  | "BuildingHeight"
  | "Parking"
  | "Accessibility"
  | "FireSeparation";
export type NbcValidationType = "Mandatory" | "Formula" | "Conditional";
export type NbcRule = {
  id: string;
  name: string;
  category: NbcRuleCategory;
  requirement: string;
  validationType: NbcValidationType;
};

export const NBC_RULES: NbcRule[] = [
  { id: "NBC-R001", name: "Access Requirement", category: "PlotDevelopment", requirement: "Every plot shall have clear approach access", validationType: "Mandatory" },
  { id: "NBC-R002", name: "Building Line", category: "PlotDevelopment", requirement: "Building shall not exceed prescribed building line", validationType: "Mandatory" },
  { id: "NBC-R003", name: "Setback Line", category: "PlotDevelopment", requirement: "Construction prohibited beyond setback line", validationType: "Mandatory" },
  { id: "NBC-R004", name: "Open Space", category: "PlotDevelopment", requirement: "Minimum open spaces around plot mandatory", validationType: "Mandatory" },
  { id: "NBC-R005", name: "FAR Control", category: "PlotDevelopment", requirement: "Floor Area Ratio to comply with authority limits", validationType: "Formula" },
  { id: "NBC-R006", name: "Ground Coverage", category: "PlotDevelopment", requirement: "Plot coverage limited by local authority", validationType: "Formula" },
  { id: "NBC-H001", name: "Building Height", category: "BuildingHeight", requirement: "Vertical distance ground to terrace", validationType: "Formula" },
  { id: "NBC-H002", name: "Tower Structures", category: "BuildingHeight", requirement: "Tower height >= 2x base width", validationType: "Formula" },
  { id: "NBC-H003", name: "Aerodrome Restriction", category: "BuildingHeight", requirement: "Must comply with aviation limits", validationType: "Mandatory" },
  { id: "NBC-P001", name: "Off Street Parking Mandatory", category: "Parking", requirement: "Off-street parking mandatory", validationType: "Mandatory" },
  { id: "NBC-P002", name: "Multi Level Parking Allowed", category: "Parking", requirement: "Multi-level parking allowed", validationType: "Conditional" },
  { id: "NBC-P003", name: "Mechanical Parking Permitted", category: "Parking", requirement: "Mechanical parking permitted", validationType: "Conditional" },
  { id: "NBC-A001", name: "Barrier Free Access", category: "Accessibility", requirement: "Barrier free access", validationType: "Mandatory" },
  { id: "NBC-A002", name: "Wheelchair Accessible Entry", category: "Accessibility", requirement: "Wheelchair accessible entry", validationType: "Mandatory" },
  { id: "NBC-A003", name: "Accessible Toilet Provision", category: "Accessibility", requirement: "Accessible toilet provision", validationType: "Mandatory" },
  { id: "NBC-A004", name: "Ramp Accessibility", category: "Accessibility", requirement: "Ramp accessibility", validationType: "Mandatory" },
  { id: "NBC-A005", name: "Elder Friendly Design", category: "Accessibility", requirement: "Elder friendly design", validationType: "Mandatory" },
  { id: "NBC-F001", name: "Minimum Fire Separation Distance", category: "FireSeparation", requirement: "Minimum fire separation distance", validationType: "Mandatory" },
  { id: "NBC-F002", name: "Means of Egress Required", category: "FireSeparation", requirement: "Means of egress required", validationType: "Mandatory" },
  { id: "NBC-F003", name: "Fire Tender Movement Access", category: "FireSeparation", requirement: "Fire tender movement access", validationType: "Mandatory" },
  { id: "NBC-F004", name: "Fire Safety Occupancy Compliance", category: "FireSeparation", requirement: "Fire safety occupancy compliance", validationType: "Mandatory" },
];

// ── Public contract (the stable seam) ────────────────────────────────────────
export const NbcSiteInput = z.object({
  landUseCode: z.string().min(1),
  siteAreaSqm: z.number().min(0),
  siteWidthM: z.number().min(0),
  siteDepthM: z.number().min(0),
  frontageM: z.number().min(0),
});
export type NbcSiteInput = z.infer<typeof NbcSiteInput>;

export type NbcPermissibleItem = {
  group: string;
  label: string;
  value: number;
  unit: string;
  basis: string;
  ruleRef: string;
};

export type NbcPermissibleReport = {
  ok: boolean;
  error?: string;
  zoneLabel: string;
  siteAreaSqm: number;
  setbacks: { front: number; rear: number; side1: number; side2: number };
  items: NbcPermissibleItem[];
  groups: Record<string, NbcPermissibleItem[]>;
  notes: string[];
  rulesVersion: string;
  generatedAt: string;
};

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
function it(group: string, label: string, value: number, unit: string, basis: string, ruleRef: string): NbcPermissibleItem {
  return { group, label, value: round(value), unit, basis, ruleRef };
}

/** Compute the permissible development envelope for a site. Pure. */
export function computeNbcPermissible(input: NbcSiteInput): NbcPermissibleReport {
  const zone = nbcZone(input.landUseCode);
  const generatedAt = new Date().toISOString();
  if (!zone) {
    return {
      ok: false,
      error: `Unknown land-use code "${input.landUseCode}" — no authority limits configured.`,
      zoneLabel: input.landUseCode,
      siteAreaSqm: round(input.siteAreaSqm),
      setbacks: { front: 0, rear: 0, side1: 0, side2: 0 },
      items: [],
      groups: {},
      notes: [],
      rulesVersion: NBC_RULES_VERSION,
      generatedAt,
    };
  }

  const area = input.siteAreaSqm;
  const sb = zone.setbacks;
  const items: NbcPermissibleItem[] = [];
  const notes: string[] = [];

  // FAR & Coverage
  const maxBuiltUp = area * zone.maxFar;
  items.push(it("FAR & Coverage", "Max permissible built-up area", maxBuiltUp, "m²", `Site area ${area} m² × FAR ${zone.maxFar}`, "NBC-R005"));
  const maxCoverageArea = area * zone.maxGroundCoverage;
  items.push(it("FAR & Coverage", "Max ground coverage (by ratio)", maxCoverageArea, "m²", `Site area ${area} m² × coverage ${round(zone.maxGroundCoverage * 100, 1)}%`, "NBC-R006"));
  const netWidth = Math.max(0, input.siteWidthM - sb.side1 - sb.side2);
  const netDepth = Math.max(0, input.siteDepthM - sb.front - sb.rear);
  const buildableFootprint = netWidth * netDepth;
  items.push(it("FAR & Coverage", "Buildable footprint within setbacks", buildableFootprint, "m²", `Net width ${round(netWidth)} m × net depth ${round(netDepth)} m (after setbacks)`, "NBC-R003"));
  const governingFootprint = Math.min(maxCoverageArea, buildableFootprint);
  const governs = buildableFootprint < maxCoverageArea ? "setback envelope governs" : "coverage ratio governs";
  items.push(it("FAR & Coverage", "Governing ground-floor footprint", governingFootprint, "m²", `min(coverage area, buildable footprint) — ${governs}`, "NBC-R006"));
  if (buildableFootprint <= 0) {
    notes.push("Site dimensions are too small for the required setbacks — no buildable footprint remains. Check width/depth against the setback requirements.");
  }

  // Setbacks
  items.push(it("Setbacks", "Front setback (min)", sb.front, "m", "Zone minimum", "NBC-R003"));
  items.push(it("Setbacks", "Rear setback (min)", sb.rear, "m", "Zone minimum", "NBC-R003"));
  items.push(it("Setbacks", "Side 1 setback (min)", sb.side1, "m", "Zone minimum", "NBC-R003"));
  items.push(it("Setbacks", "Side 2 setback (min)", sb.side2, "m", "Zone minimum", "NBC-R003"));
  const netFrontage = Math.max(0, input.frontageM - sb.side1 - sb.side2);
  items.push(it("Setbacks", "Net frontage after side setbacks", netFrontage, "m", `Frontage ${input.frontageM} m − side setbacks`, "NBC-R003"));

  // Height & Floors
  items.push(it("Height & Floors", "Max building height", zone.maxHeightM, "m", "Zone maximum (subject to aerodrome/aviation limits)", "NBC-H001"));
  const floorsByHeight = Math.floor(zone.maxHeightM / FLOOR_TO_FLOOR_M);
  items.push(it("Height & Floors", "Max floors (by height)", floorsByHeight, "floors", `Max height ${zone.maxHeightM} m ÷ ${FLOOR_TO_FLOOR_M} m floor-to-floor`, "NBC-H001"));
  const floorsByFar = governingFootprint > 0 ? Math.floor(maxBuiltUp / governingFootprint) : 0;
  items.push(it("Height & Floors", "Max floors (by FAR ÷ footprint)", floorsByFar, "floors", `Max built-up ${round(maxBuiltUp)} m² ÷ governing footprint ${round(governingFootprint)} m²`, "NBC-R005"));
  const governingFloors = Math.min(floorsByHeight, floorsByFar);
  items.push(it("Height & Floors", "Governing permissible floors", governingFloors, "floors", "min(floors by height, floors by FAR)", "NBC-H001"));

  // Parking & Open Space
  const requiredParking = zone.parkingPerSqm > 0 ? Math.ceil(maxBuiltUp / zone.parkingPerSqm) : 0;
  items.push(it("Parking & Open Space", "Min parking for max build", requiredParking, "ECS", `Max built-up ${round(maxBuiltUp)} m² ÷ 1 ECS per ${zone.parkingPerSqm} m²`, "NBC-P001"));
  const minOpenSpace = area * zone.minOpenSpace;
  items.push(it("Parking & Open Space", "Min open space", minOpenSpace, "m²", `Site area ${area} m² × ${round(zone.minOpenSpace * 100, 1)}%`, "NBC-R004"));

  notes.push(`Floor count assumes ${FLOOR_TO_FLOOR_M} m floor-to-floor height; adjust per actual design.`);
  notes.push("Authority limits are representative defaults — verify against the applicable municipal bye-laws before use.");

  const groups: Record<string, NbcPermissibleItem[]> = {};
  for (const i of items) (groups[i.group] ??= []).push(i);

  return {
    ok: true,
    zoneLabel: `${zone.code} — ${zone.subCategory}`,
    siteAreaSqm: round(area),
    setbacks: sb,
    items,
    groups,
    notes,
    rulesVersion: NBC_RULES_VERSION,
    generatedAt,
  };
}
