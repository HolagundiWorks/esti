import { z } from "zod";
import type { TagColor } from "./schemas.js";

/**
 * AORMS-Consultancy — Phase 0 "Living record" contracts (engagements + the
 * deliverable register). Grounded in docs/esti/AORMS-CONSULTANCY-CASE-STUDY.md;
 * system shape in docs/esti/AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md.
 *
 * Naming note: `engagements` / `esti_engagement` belong to AORMS-Studio's
 * architect↔consultant collaboration model — the engineering-consultancy spine
 * uses the `consultancy.*` tRPC namespace and `esti_cons_*` tables.
 */

/** How the engineering engagement is shaped (case study §4 / frameworks §4.2). */
export const EngagementModel = z.enum([
  "DESIGN_ASSIST",
  "PEER_REVIEW",
  "FULL_DESIGN",
  "SITE_SUPPORT",
]);
export type EngagementModel = z.infer<typeof EngagementModel>;

export const ENGAGEMENT_MODEL_LABEL: Record<EngagementModel, string> = {
  DESIGN_ASSIST: "Design assist",
  PEER_REVIEW: "Peer review",
  FULL_DESIGN: "Full design",
  SITE_SUPPORT: "Site support",
};

/** Engineering disciplines an engagement covers (case study §1). */
export const EngineeringDiscipline = z.enum([
  "STRUCTURAL",
  "MEP",
  "CIVIL",
  "GEOTECHNICAL",
  "FACADE",
  "OTHER",
]);
export type EngineeringDiscipline = z.infer<typeof EngineeringDiscipline>;

export const ENGINEERING_DISCIPLINE_LABEL: Record<EngineeringDiscipline, string> = {
  STRUCTURAL: "Structural",
  MEP: "MEP / building services",
  CIVIL: "Civil / infrastructure",
  GEOTECHNICAL: "Geotechnical",
  FACADE: "Façade / specialist",
  OTHER: "Other",
};

/** `EngagementStatus` is taken by the Studio consultant model — hence Cons*. */
export const ConsEngagementStatus = z.enum(["ACTIVE", "ON_HOLD", "CLOSED"]);
export type ConsEngagementStatus = z.infer<typeof ConsEngagementStatus>;

/** Purpose of issue on a deliverable (ISO 19650 plain-language classes; case study §3.4). */
export const IssueClass = z.enum([
  "FOR_INFORMATION",
  "FOR_APPROVAL",
  "FOR_CONSTRUCTION",
]);
export type IssueClass = z.infer<typeof IssueClass>;

export const ISSUE_CLASS_LABEL: Record<IssueClass, string> = {
  FOR_INFORMATION: "For information",
  FOR_APPROVAL: "For approval",
  FOR_CONSTRUCTION: "For construction",
};

/**
 * Required design-check rigour (BS 5975 / IStructE categories; case study §3.2).
 * Phase 0 records the requirement; Phase 1's sign-off chain enforces it.
 */
export const CheckCategory = z.enum(["CAT0", "CAT1", "CAT2", "CAT3"]);
export type CheckCategory = z.infer<typeof CheckCategory>;

export const CHECK_CATEGORY_LABEL: Record<CheckCategory, string> = {
  CAT0: "Cat 0 — standard solution",
  CAT1: "Cat 1 — same-team peer check",
  CAT2: "Cat 2 — independent check",
  CAT3: "Cat 3 — third-party proof check",
};

/**
 * Phase 0 register lifecycle. The originate→check→approve chain states arrive
 * with Phase 1 (reliance engine) — until then ISSUED is a recorded fact, not a
 * gated act.
 */
export const DeliverableStatus = z.enum(["DRAFT", "ISSUED", "SUPERSEDED", "WITHDRAWN"]);
export type DeliverableStatus = z.infer<typeof DeliverableStatus>;

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SUPERSEDED: "Superseded",
  WITHDRAWN: "Withdrawn",
};

/** Status-dot colour maps (StatusTag convention — colours live in contracts). */
export const CONS_ENGAGEMENT_STATUS_TAG: Record<ConsEngagementStatus, TagColor> = {
  ACTIVE: "green",
  ON_HOLD: "warm-gray",
  CLOSED: "gray",
};

export const CONS_DELIVERABLE_STATUS_TAG: Record<DeliverableStatus, TagColor> = {
  DRAFT: "gray",
  ISSUED: "green",
  SUPERSEDED: "warm-gray",
  WITHDRAWN: "red",
};

/**
 * Forward-only deliverable lifecycle. A revision does NOT flow ISSUED→DRAFT here
 * — that path is `startRevision`, which clears the sign-off chain so fresh checks
 * are re-required.
 */
export const DELIVERABLE_TRANSITIONS: Record<DeliverableStatus, readonly DeliverableStatus[]> = {
  DRAFT: ["ISSUED", "WITHDRAWN"],
  ISSUED: ["SUPERSEDED", "WITHDRAWN"],
  SUPERSEDED: [],
  WITHDRAWN: [],
};

export function canTransitionDeliverable(
  from: DeliverableStatus | string,
  to: DeliverableStatus | string,
): boolean {
  const allowed = DELIVERABLE_TRANSITIONS[from as DeliverableStatus];
  return !!allowed && allowed.includes(to as DeliverableStatus);
}

/**
 * Consultancy types — the Indian consultancy market's actual patterns. Unlike
 * architecture (one COA stage ladder for every practice), consultancy work is
 * TYPED: each type has its own scope-of-work shape and its own phases. The
 * type chosen at engagement creation seeds the engagement's phases from
 * {@link CONSULTANCY_SCOPE_TEMPLATES} (fully editable afterwards).
 */
export const ConsultancyType = z.enum([
  "STRUCTURAL",
  "PEB",
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "WATERPROOFING",
  "LANDSCAPING",
]);
export type ConsultancyType = z.infer<typeof ConsultancyType>;

export const CONSULTANCY_TYPE_LABEL: Record<ConsultancyType, string> = {
  STRUCTURAL: "Structural",
  PEB: "PEB (pre-engineered buildings)",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing (PHE)",
  HVAC: "HVAC",
  WATERPROOFING: "Waterproofing",
  LANDSCAPING: "Landscaping",
};

export type ConsultancyPhaseTemplate = {
  name: string;
  /** The scope-of-work items this phase covers — the consultancy's time is bounded by these. */
  scope: readonly string[];
};

/**
 * Per-type scope-of-work patterns (Indian practice). These bound what the
 * consultancy's time covers — the engagement's phases are seeded from here and
 * edited per appointment; anything beyond the recorded scope is a variation.
 */
export const CONSULTANCY_SCOPE_TEMPLATES: Record<
  ConsultancyType,
  readonly ConsultancyPhaseTemplate[]
> = {
  STRUCTURAL: [
    { name: "Concept & feasibility", scope: ["Structural scheme options on architect's concept", "Indicative member sizing + structural zones", "Design basis note (loads, codes, SBC assumptions)"] },
    { name: "Schematic design", scope: ["Framing plans on frozen grids", "Preliminary analysis & sizing", "Foundation scheme on geotech recommendations"] },
    { name: "Detailed design", scope: ["Final analysis & design (RC/steel)", "Reinforcement / connection details", "Slab, beam, column, footing schedules"] },
    { name: "GFC & coordination", scope: ["Good-for-construction drawing issue", "Coordination with architect & MEP penetrations", "Bar bending schedule readiness"] },
    { name: "Construction support", scope: ["Site clarifications & TQ responses", "Reinforcement checking at agreed stages", "Structural stability certificate on completion"] },
  ],
  PEB: [
    { name: "Design basis & geometry", scope: ["Building geometry, bay spacing, clear heights with client/vendor", "Load basis (wind, seismic, crane, collateral)", "Design basis report for the PEB vendor"] },
    { name: "Foundation interface", scope: ["Anchor bolt plans from vendor reaction reports", "Foundation design for column reactions", "Grouting & base plate interface details"] },
    { name: "Vendor drawing review", scope: ["Review of fabricator design calculations", "Approval of erection & shop drawings", "Compliance check against design basis"] },
    { name: "Erection support", scope: ["Site queries during erection", "Alignment / verticality check witness", "Completion review for handover"] },
  ],
  ELECTRICAL: [
    { name: "Load assessment & DBR", scope: ["Connected & demand load calculations", "Transformer / DG / UPS sizing", "Single-line diagram concept + design basis report"] },
    { name: "Schematic design", scope: ["Developed SLD & panel schedules", "Cable route & containment strategy", "Earthing & lightning protection concept"] },
    { name: "Detailed design", scope: ["Lighting, power & small-power layouts", "Cable schedules & voltage-drop calculations", "Panel GA drawings & earthing layouts"] },
    { name: "Liaison support", scope: ["CEIG / discom submission drawings", "Responses to authority scrutiny remarks"] },
    { name: "Construction support", scope: ["Shop drawing review", "Installation stage inspections", "Testing & commissioning witness"] },
  ],
  PLUMBING: [
    { name: "Demand assessment & DBR", scope: ["Water demand & storage calculations", "Source, treatment (WTP/STP) strategy", "Drainage & rainwater strategy + design basis report"] },
    { name: "Schematic design", scope: ["Water supply & drainage riser diagrams", "STP/WTP sizing & plant room layouts", "External drainage & storm concept"] },
    { name: "Detailed design", scope: ["Water supply & drainage layouts (floorwise)", "Rainwater harvesting details", "Fixture, pump & pipe schedules"] },
    { name: "Construction support", scope: ["Shop drawing review", "Pressure / flow test witness", "Commissioning support"] },
  ],
  HVAC: [
    { name: "Heat load & DBR", scope: ["Room-wise heat load calculations", "System selection (VRF/chilled water/split)", "Plant sizing + design basis report"] },
    { name: "Schematic design", scope: ["Duct & pipe routing concept", "Plant room & shaft sizing", "Ventilation & pressurisation strategy"] },
    { name: "Detailed design", scope: ["Duct & pipe layouts with sizing", "Equipment schedules & selections", "Stair pressurisation / basement ventilation calcs"] },
    { name: "Construction support", scope: ["Shop drawing review", "Installation inspections", "Testing, adjusting & balancing (TAB) witness"] },
  ],
  WATERPROOFING: [
    { name: "Risk assessment", scope: ["Wet-area, basement, terrace & joint risk mapping", "Substrate & movement assessment", "Failure-history review (retrofit jobs)"] },
    { name: "System specification", scope: ["System selection per area (membrane/coating/integral)", "Guarantee & applicator qualification criteria", "Specification sheets per system"] },
    { name: "Details & method statements", scope: ["Junction, drain, joint & termination details", "Method statements per application", "Interface details with structure & finishes"] },
    { name: "Application audit", scope: ["Surface preparation inspections", "Stage inspections during application", "Ponding test witness & guarantee protocol"] },
  ],
  LANDSCAPING: [
    { name: "Concept & theming", scope: ["Site analysis (sun, soil, drainage, views)", "Planting & hardscape concept + theming", "Zoning of soft/hard landscape areas"] },
    { name: "Schematic design", scope: ["Levels & grading strategy", "Softscape & hardscape palettes", "Irrigation & drainage strategy"] },
    { name: "Detailed design", scope: ["Planting plans with species schedules", "Irrigation & landscape drainage details", "Hardscape details & outdoor lighting coordination"] },
    { name: "Implementation support", scope: ["Nursery / material selection support", "Site supervision visits at agreed stages", "Maintenance schedule & handover"] },
  ],
};

// ── Typed project briefs ─────────────────────────────────────────────────────
// A consultancy's project brief is a TECHNICAL PARAMETER SET (the design-basis
// input data sheet), not architecture's client brief. Researched per type:
// structural fields mirror the statutory Structural Design Basis Report (SDBR)
// filed with Indian ULBs; HVAC mirrors real consultant DBRs; PEB mirrors the
// vendor RFQ data sheet; PHE/waterproofing/landscape from NBC/IS intake norms.

export type ConsBriefFieldKind = "number" | "text" | "choice" | "boolean";

export type ConsBriefField = {
  key: string;
  label: string;
  kind: ConsBriefFieldKind;
  unit?: string;
  options?: readonly string[];
  hint?: string;
};

export const CONSULTANCY_BRIEF_TEMPLATES: Record<ConsultancyType, readonly ConsBriefField[]> = {
  STRUCTURAL: [
    { key: "buildingUse", label: "Building use", kind: "choice", options: ["Residential", "Commercial", "Institutional", "Industrial", "Mixed"], hint: "Sets live loads (IS 875-2) + importance factor" },
    { key: "builtUpArea", label: "Built-up / slab area", kind: "number", unit: "m²" },
    { key: "floorsAbove", label: "Floors above ground", kind: "number", hint: "Declare future vertical expansion too (SDBR item)" },
    { key: "basements", label: "Basements", kind: "number" },
    { key: "floorHeight", label: "Floor-to-floor height", kind: "number", unit: "m" },
    { key: "structureType", label: "Type of construction", kind: "choice", options: ["RCC frame", "RCC frame + shear walls", "Steel frame", "Composite", "Load-bearing"] },
    { key: "slabSystem", label: "Slab system", kind: "choice", options: ["Beam-slab", "Flat slab", "Flat plate", "PT slab", "Waffle"] },
    { key: "seismicZone", label: "Seismic zone (IS 1893)", kind: "choice", options: ["II", "III", "IV", "V"] },
    { key: "windSpeed", label: "Basic wind speed (IS 875-3)", kind: "number", unit: "m/s" },
    { key: "sbc", label: "Soil bearing capacity", kind: "number", unit: "kN/m²", hint: "From geotech; note water table + sulphates" },
    { key: "foundationType", label: "Foundation expectation", kind: "choice", options: ["Isolated", "Combined", "Raft", "Piles", "TBD"] },
    { key: "specialLoads", label: "Special / heavy loads", kind: "text", hint: "Machinery, tanks, landscape fill, fire tender, solar" },
    { key: "materialGrades", label: "Concrete / steel grades", kind: "text", hint: "e.g. M30 / Fe550D" },
    { key: "designLife", label: "Design life", kind: "number", unit: "yrs", hint: "50 typical; 100 for important structures" },
  ],
  PEB: [
    { key: "width", label: "Building width (clear span)", kind: "number", unit: "m", hint: "The single biggest steel-weight driver" },
    { key: "length", label: "Building length", kind: "number", unit: "m" },
    { key: "eaveHeight", label: "Clear eave height", kind: "number", unit: "m" },
    { key: "roofSlope", label: "Roof slope", kind: "text", hint: "1:10 typical" },
    { key: "baySpacing", label: "Bay spacing", kind: "number", unit: "m", hint: "6–9 typical; fixed by crane/mezzanine grid" },
    { key: "craneData", label: "Cranes", kind: "text", hint: "Type, capacity (t), hook height (m), bays — or none" },
    { key: "collateralLoad", label: "Collateral load", kind: "number", unit: "kN/m²", hint: "Sprinklers, ducting, solar: 0.1–0.25 typical" },
    { key: "mezzanine", label: "Mezzanine", kind: "text", hint: "Area, live load, deck type — or none" },
    { key: "windSpeed", label: "Basic wind speed", kind: "number", unit: "m/s" },
    { key: "seismicZone", label: "Seismic zone", kind: "choice", options: ["II", "III", "IV", "V"] },
    { key: "cladding", label: "Roof / wall cladding", kind: "choice", options: ["Bare Galvalume", "Colour-coated", "Standing seam", "Sandwich PUF"] },
    { key: "skylights", label: "Ventilation / daylight", kind: "text", hint: "Ridge vents, turbo vents, skylight % of roof" },
    { key: "expandableEndwall", label: "Expandable end wall", kind: "boolean", hint: "Changes end-frame design" },
    { key: "sbc", label: "Soil bearing capacity", kind: "number", unit: "kN/m²", hint: "Vendor gives reactions; foundations are consultant scope" },
  ],
  ELECTRICAL: [
    { key: "builtUpArea", label: "Built-up area", kind: "number", unit: "m²" },
    { key: "buildingUse", label: "Building use", kind: "choice", options: ["Office", "Retail", "Residential", "Hospital", "Industrial", "Mixed"] },
    { key: "connectedLoad", label: "Connected load estimate", kind: "number", unit: "kW" },
    { key: "maxDemand", label: "Anticipated maximum demand", kind: "number", unit: "kVA", hint: "Decides HT vs LT connection" },
    { key: "supply", label: "Supply", kind: "choice", options: ["LT 415V", "HT 11kV", "HT 33kV"] },
    { key: "transformer", label: "Transformer / substation", kind: "text", hint: "kVA, count, dry/oil, N+1" },
    { key: "dgBackup", label: "DG backup extent", kind: "choice", options: ["Full building", "Essential only", "Life-safety only", "None"] },
    { key: "upsLoad", label: "UPS load", kind: "number", unit: "kVA" },
    { key: "solarPv", label: "Solar PV provision", kind: "number", unit: "kWp" },
    { key: "evCharging", label: "EV charging", kind: "text", hint: "Nos × kW; statutory % of parking in many states" },
    { key: "metering", label: "Metering strategy", kind: "choice", options: ["Single-point HT + submeters", "Multi-point discom"] },
    { key: "authority", label: "Discom / CEIG context", kind: "text" },
    { key: "spareMargin", label: "Future expansion margin", kind: "number", unit: "%", hint: "15–25% typical" },
  ],
  PLUMBING: [
    { key: "buildingUse", label: "Building use", kind: "choice", options: ["Residential", "Office", "Hotel", "Hospital", "School", "Mixed"] },
    { key: "population", label: "Population basis", kind: "number", unit: "persons", hint: "Everything downstream is population-driven" },
    { key: "lpcd", label: "Per-capita demand", kind: "number", unit: "lpcd", hint: "Res 135+45 flushing; office 45; hotel 320/bed (IS 1172)" },
    { key: "waterSource", label: "Water source", kind: "choice", options: ["Municipal", "Borewell", "Tanker", "Mixed"] },
    { key: "rawWaterTds", label: "Raw water TDS", kind: "number", unit: "ppm", hint: "Decides WTP / softener / RO" },
    { key: "storageBasis", label: "Storage basis", kind: "text", hint: "UG sump 1–1.5 day + fire static; OHT 1/3–1/2 day" },
    { key: "stpRequired", label: "STP required", kind: "boolean", hint: "PCB threshold; treated reuse for flushing + landscape" },
    { key: "sewerDisposal", label: "Sewage disposal", kind: "choice", options: ["Municipal sewer", "STP + reuse", "Septic"] },
    { key: "rwhMandate", label: "Rainwater harvesting mandated", kind: "boolean" },
    { key: "hotWaterSource", label: "Hot water source", kind: "choice", options: ["Solar", "Heat pump", "Electric", "Central boiler"] },
    { key: "floors", label: "Floors (pressure zoning)", kind: "number", hint: "~45 m static per zone; break tanks / PRVs" },
  ],
  HVAC: [
    { key: "conditionedArea", label: "Conditioned area", kind: "number", unit: "m²" },
    { key: "buildingUse", label: "Building use", kind: "choice", options: ["Office", "Retail", "Residential", "Hospital", "Hotel", "Industrial"] },
    { key: "occupancy", label: "Occupancy density", kind: "number", unit: "m²/person" },
    { key: "outsideDesign", label: "Outside design conditions", kind: "text", hint: "DB/WB °C per ISHRAE for the city; monsoon WBT governs coastal" },
    { key: "insideDesign", label: "Inside design conditions", kind: "text", hint: "23.3 ± 1.1°C, RH 55–60% typical" },
    { key: "freshAirStandard", label: "Fresh air standard", kind: "choice", options: ["ASHRAE 62.1", "ISHRAE", "NBC 2016"] },
    { key: "systemPreference", label: "System preference", kind: "choice", options: ["VRF", "Chilled water", "DX split", "Landlord CHW"] },
    { key: "redundancy", label: "Critical-area redundancy", kind: "choice", options: ["N", "N+1", "2N"], hint: "Server / UPS / OT rooms" },
    { key: "plantSpace", label: "Plant / shaft space", kind: "text", hint: "Freeze with architect at concept or never" },
    { key: "ventilation", label: "Mechanical ventilation areas", kind: "text", hint: "Basement CO-sensed, kitchen hood, toilets 15–20 ACPH" },
    { key: "pressurisation", label: "Stair / lift pressurisation", kind: "boolean", hint: "NBC 2016; buildings >15 m" },
    { key: "acousticLimit", label: "Acoustic limit", kind: "text", hint: "NC 35–40 offices; NC 25–30 boardrooms" },
    { key: "energyMandate", label: "Energy / green mandate", kind: "text", hint: "ECBC 2017, IGBC/LEED/GRIHA target" },
  ],
  WATERPROOFING: [
    { key: "areasToTreat", label: "Areas to treat", kind: "text", hint: "Basement, podium, terrace, wet areas, tanks, pools" },
    { key: "basementDepth", label: "Basement depth below GL", kind: "number", unit: "m" },
    { key: "waterTable", label: "Water table depth", kind: "number", unit: "m", hint: "Monsoon high from geotech — governs membrane class" },
    { key: "newOrRetrofit", label: "New or retrofit", kind: "choice", options: ["New construction", "Retrofit / repair"] },
    { key: "substrate", label: "Substrate type & condition", kind: "text", hint: "RCC grade, PT slab, cracks, honeycombing" },
    { key: "failureHistory", label: "Leakage / failure history", kind: "text", hint: "Locations, monsoon-only?, previous treatments" },
    { key: "joints", label: "Joints & penetrations", kind: "text", hint: "Expansion/construction joints, pipe penetrations — most failures start here" },
    { key: "exposure", label: "Exposure", kind: "choice", options: ["UV-exposed", "Protected", "Trafficked"] },
    { key: "finishesAbove", label: "Overburden / finishes above", kind: "text", hint: "Podium landscape, screed + tiles — can the system ever be reopened?" },
    { key: "slopeDrainage", label: "Slope & drainage", kind: "text", hint: "Terrace slope 1:100–1:120; rainwater outlet count" },
    { key: "guaranteePeriod", label: "Guarantee period expected", kind: "number", unit: "yrs", hint: "5 / 10 / 15" },
    { key: "siteConstraints", label: "Applicator / site constraints", kind: "text", hint: "Occupied building, ponding-test water, weather window" },
  ],
  LANDSCAPING: [
    { key: "siteArea", label: "Site area", kind: "number", unit: "m²" },
    { key: "landscapeArea", label: "Landscape area", kind: "number", unit: "m²", hint: "Bye-law green cover / tree count basis" },
    { key: "softHardRatio", label: "Softscape : hardscape intent", kind: "text", hint: "e.g. 60:40" },
    { key: "podiumShare", label: "On-structure share + loading", kind: "text", hint: "% on podium; permissible kN/m² from structural consultant" },
    { key: "soilDepthPodium", label: "Podium soil depth available", kind: "number", unit: "mm", hint: "450 lawn · 600 shrubs · 750+ trees" },
    { key: "soilType", label: "Soil type (on grade)", kind: "choice", options: ["Red", "Black cotton", "Sandy", "Construction fill"] },
    { key: "irrigationSource", label: "Irrigation water source", kind: "choice", options: ["Treated STP", "Borewell", "Municipal", "Rainwater"], hint: "STP reuse mandated in many states" },
    { key: "irrigationSystem", label: "Irrigation system", kind: "choice", options: ["Drip", "Pop-up sprinkler", "Manual"] },
    { key: "climateZone", label: "Climate zone", kind: "choice", options: ["Hot-dry", "Hot-humid", "Composite"] },
    { key: "existingTrees", label: "Existing trees", kind: "text", hint: "Species, girth; retain/transplant/fell needs Tree Act NOC" },
    { key: "theme", label: "Theme / style intent", kind: "text" },
    { key: "maintenance", label: "Maintenance capacity", kind: "choice", options: ["In-house gardeners", "Outsourced AMC", "Minimal"] },
    { key: "program", label: "User program", kind: "text", hint: "Kids' play, senior walkways, OAT, kitchen garden" },
  ],
};

/** Store the engagement's typed brief (values keyed by the template's field keys). */
export const ConsBriefSet = z.object({
  engagementId: z.string().uuid(),
  brief: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export type ConsBriefSet = z.infer<typeof ConsBriefSet>;

export const ConsPhaseStatus = z.enum(["PENDING", "ACTIVE", "DONE"]);
export type ConsPhaseStatus = z.infer<typeof ConsPhaseStatus>;

export const CONS_PHASE_STATUS_TAG: Record<ConsPhaseStatus, TagColor> = {
  PENDING: "gray",
  ACTIVE: "red",
  DONE: "green",
};

/** How the engagement fee is structured (case study §5.1). Hybrids = stages + time-charge lines (later slice). */
export const FeeModel = z.enum(["PERCENT_OF_COST", "LUMP_SUM", "TIME_CHARGE", "RETAINER"]);
export type FeeModel = z.infer<typeof FeeModel>;

export const FEE_MODEL_LABEL: Record<FeeModel, string> = {
  PERCENT_OF_COST: "% of construction cost",
  LUMP_SUM: "Lump sum",
  TIME_CHARGE: "Time charge",
  RETAINER: "Retainer",
};

export const ConsEngagementCreate = z.object({
  title: z.string().min(1).max(300),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  model: EngagementModel,
  /** The consultancy pattern — seeds the engagement's phases + scope of work. */
  consultancyType: ConsultancyType.optional(),
  leadDiscipline: EngineeringDiscipline,
  disciplines: z.array(EngineeringDiscipline).max(12).optional(),
  /** What downstream parties may rely on — explicit, per the case study §6.4. */
  relianceScope: z.string().max(4000).optional(),
  /** Current work stage — free text in Phase 0 (COA/RIBA vocab differs per firm). */
  stage: z.string().max(120).optional(),
  /** Fee structure (Phase 2) — optional until the commercial terms are agreed. */
  feeModel: FeeModel.optional(),
  /** Agreed total fee in integer paise. */
  feeTotalPaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(8000).optional(),
});
export type ConsEngagementCreate = z.infer<typeof ConsEngagementCreate>;

export const ConsEngagementUpdate = ConsEngagementCreate.partial().extend({
  id: z.string().uuid(),
  status: ConsEngagementStatus.optional(),
  litigationHold: z.boolean().optional(),
  retentionNote: z.string().max(4000).optional(),
});
export type ConsEngagementUpdate = z.infer<typeof ConsEngagementUpdate>;

// ── SOP §2 — enquiry register + go/no-go ─────────────────────────────────────

/**
 * Pre-engagement pipeline. Job number is allocated only on convert (WON).
 * GO = pursue / propose; convert after LOA stamps WON and creates the engagement.
 */
export const ConsEnquiryStatus = z.enum([
  "RECEIVED",
  "UNDER_REVIEW",
  "GO",
  "NO_GO",
  "WON",
  "LOST",
]);
export type ConsEnquiryStatus = z.infer<typeof ConsEnquiryStatus>;

export const CONS_ENQUIRY_STATUS_LABEL: Record<ConsEnquiryStatus, string> = {
  RECEIVED: "Received",
  UNDER_REVIEW: "Under review",
  GO: "Go",
  NO_GO: "No-go",
  WON: "Won (job opened)",
  LOST: "Lost",
};

export const CONS_ENQUIRY_STATUS_TAG: Record<ConsEnquiryStatus, TagColor> = {
  RECEIVED: "gray",
  UNDER_REVIEW: "teal",
  GO: "green",
  NO_GO: "red",
  WON: "green",
  LOST: "gray",
};

export const ENQUIRY_STATUS_TRANSITIONS: Record<
  ConsEnquiryStatus,
  readonly ConsEnquiryStatus[]
> = {
  RECEIVED: ["UNDER_REVIEW", "LOST"],
  UNDER_REVIEW: ["GO", "NO_GO", "LOST"],
  GO: ["WON", "LOST"],
  NO_GO: [],
  WON: [],
  LOST: [],
};

export function canAdvanceEnquiryStatus(
  from: ConsEnquiryStatus | string,
  to: ConsEnquiryStatus | string,
): boolean {
  const allowed = ENQUIRY_STATUS_TRANSITIONS[from as ConsEnquiryStatus];
  return !!allowed && allowed.includes(to as ConsEnquiryStatus);
}

const Score1to5 = z.number().int().min(1).max(5);

export const ConsGoNoGoScorecard = z.object({
  capacityFit: Score1to5,
  feeAttractiveness: Score1to5,
  /** Higher = more risk (inverse desirability). */
  risk: Score1to5,
  strategicFit: Score1to5,
  conflictCheckDone: z.boolean(),
  decisionNote: z.string().trim().max(4000).optional(),
});
export type ConsGoNoGoScorecard = z.infer<typeof ConsGoNoGoScorecard>;

/**
 * Soft recommendation from the scorecard (panel still decides).
 * Risk is inverted so high risk lowers the average.
 */
export function goNoGoRecommendation(score: ConsGoNoGoScorecard): "GO" | "NO_GO" {
  if (!score.conflictCheckDone) return "NO_GO";
  const avg =
    (score.capacityFit +
      score.feeAttractiveness +
      (6 - score.risk) +
      score.strategicFit) /
    4;
  return avg >= 3 ? "GO" : "NO_GO";
}

/** Scorecard must be complete + conflict checked before GO / NO_GO. */
export function canDecideGoNoGo(row: {
  capacityFit: number | null | undefined;
  feeAttractiveness: number | null | undefined;
  risk: number | null | undefined;
  strategicFit: number | null | undefined;
  conflictCheckDone: boolean | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (
    row.capacityFit == null ||
    row.feeAttractiveness == null ||
    row.risk == null ||
    row.strategicFit == null
  )
    return { ok: false, reason: "Complete the go/no-go scorecard before deciding." };
  if (!row.conflictCheckDone)
    return { ok: false, reason: "Conflict-of-interest check must be recorded before deciding." };
  return { ok: true };
}

export function canConvertEnquiry(row: {
  status: string;
  convertedEngagementId: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (row.convertedEngagementId)
    return { ok: false, reason: "This enquiry already opened a job." };
  if (row.status !== "GO")
    return {
      ok: false,
      reason: "Only a Go decision can convert to a job — complete go/no-go first.",
    };
  return { ok: true };
}

export const ConsEnquiryCreate = z.object({
  title: z.string().trim().min(1).max(300),
  clientName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  source: z.string().trim().max(80).optional(),
  siteLocation: z.string().trim().max(300).optional(),
  consultancyType: ConsultancyType.optional(),
  leadDiscipline: EngineeringDiscipline,
  model: EngagementModel.optional(),
  notes: z.string().trim().max(8000).optional(),
});
export type ConsEnquiryCreate = z.infer<typeof ConsEnquiryCreate>;

export const ConsEnquiryScore = ConsGoNoGoScorecard.extend({
  id: z.string().uuid(),
});
export type ConsEnquiryScore = z.infer<typeof ConsEnquiryScore>;

export const ConsEnquiryDecide = z.object({
  id: z.string().uuid(),
  decision: z.enum(["GO", "NO_GO"]),
  decisionNote: z.string().trim().max(4000).optional(),
});
export type ConsEnquiryDecide = z.infer<typeof ConsEnquiryDecide>;

export const ConsEnquiryConvert = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300).optional(),
  model: EngagementModel.optional(),
  consultancyType: ConsultancyType.optional(),
  leadDiscipline: EngineeringDiscipline.optional(),
  feeModel: FeeModel.optional(),
  feeTotalPaise: z.number().int().nonnegative().optional(),
  relianceScope: z.string().max(4000).optional(),
  stage: z.string().max(120).optional(),
  notes: z.string().max(8000).optional(),
});
export type ConsEnquiryConvert = z.infer<typeof ConsEnquiryConvert>;

// ── SOP §7 — site field reports (G711 anatomy) ──────────────────────────────

export const ConsFieldReportCreate = z.object({
  engagementId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weather: z.string().max(200).optional(),
  /** Trades / contacts present on site. */
  personnel: z.string().max(2000).optional(),
  workObserved: z.string().max(4000).optional(),
  /** Observations — facts with location + responsible party ("observe", never "inspect"). */
  observations: z.string().max(8000).optional(),
  nonconformances: z.string().max(4000).optional(),
  instructions: z.string().max(4000).optional(),
  nextVisit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ConsFieldReportCreate = z.infer<typeof ConsFieldReportCreate>;

// ── SOP §4 — comment resolution sheet (CRS) ─────────────────────────────────

export const CrsStatus = z.enum(["OPEN", "CLOSED"]);
export type CrsStatus = z.infer<typeof CrsStatus>;

export const CONS_CRS_STATUS_TAG: Record<CrsStatus, TagColor> = {
  OPEN: "red",
  CLOSED: "green",
};

export const ConsReviewCommentCreate = z.object({
  deliverableId: z.string().uuid(),
  /** Who commented — e.g. "Architect / Studio Arcline", "Client", "Checker". */
  reviewer: z.string().min(1).max(200),
  comment: z.string().min(1).max(4000),
});
export type ConsReviewCommentCreate = z.infer<typeof ConsReviewCommentCreate>;

export const ConsReviewCommentClose = z.object({
  id: z.string().uuid(),
  /** The designer's response — required to close the line. */
  response: z.string().min(1).max(4000),
});
export type ConsReviewCommentClose = z.infer<typeof ConsReviewCommentClose>;

/** Add a custom phase to an engagement's scope (beyond the seeded template). */
export const ConsPhaseCreate = z.object({
  engagementId: z.string().uuid(),
  name: z.string().min(1).max(200),
  scope: z.array(z.string().min(1).max(300)).max(20).default([]),
});
export type ConsPhaseCreate = z.infer<typeof ConsPhaseCreate>;

// ── MDR document numbering (SOP §3) ──────────────────────────────────────────
/**
 * Field-based register numbers hang off the engagement job root (`C-YY-NNN`).
 * Shape: `{jobRoot}-{DOC_TYPE}-{seq}` e.g. `C-26-001-CAL-001`.
 * Revision and issue status are metadata — never part of the number.
 */
export const MdrDocType = z.enum([
  "DRAWING",
  "CALCULATION",
  "REPORT",
  "SCHEDULE",
  "SPECIFICATION",
  "CERTIFICATE",
  "NOTE",
]);
export type MdrDocType = z.infer<typeof MdrDocType>;

export const MDR_DOC_TYPE_LABEL: Record<MdrDocType, string> = {
  DRAWING: "Drawing",
  CALCULATION: "Calculation",
  REPORT: "Report",
  SCHEDULE: "Schedule",
  SPECIFICATION: "Specification",
  CERTIFICATE: "Certificate",
  NOTE: "Note / memo",
};

/** Compact type token embedded in the register number. */
export const MDR_DOC_TYPE_CODE: Record<MdrDocType, string> = {
  DRAWING: "DRW",
  CALCULATION: "CAL",
  REPORT: "RPT",
  SCHEDULE: "SCH",
  SPECIFICATION: "SPC",
  CERTIFICATE: "CRT",
  NOTE: "NTE",
};

export const MDR_DOC_TYPE_FROM_CODE: Record<string, MdrDocType> = Object.fromEntries(
  (Object.entries(MDR_DOC_TYPE_CODE) as [MdrDocType, string][]).map(([k, v]) => [v, k]),
) as Record<string, MdrDocType>;

/** Engagement job number allocated at creation (SOP §2). */
export const ENGAGEMENT_JOB_CODE_RE = /^C-\d{2}-\d{3}$/;

/** Full MDR deliverable number: job root + type token + 3-digit sequence. */
export const MDR_DELIVERABLE_CODE_RE = /^(C-\d{2}-\d{3})-([A-Z]{2,4})-(\d{3})$/;

export type ParsedMdrDeliverableCode = {
  jobRoot: string;
  docTypeCode: string;
  docType: MdrDocType | null;
  sequence: number;
};

export function parseMdrDeliverableCode(code: string): ParsedMdrDeliverableCode | null {
  const m = MDR_DELIVERABLE_CODE_RE.exec(code.trim().toUpperCase());
  if (!m) return null;
  const jobRoot = m[1]!;
  const docTypeCode = m[2]!;
  const sequence = Number(m[3]);
  return {
    jobRoot,
    docTypeCode,
    docType: MDR_DOC_TYPE_FROM_CODE[docTypeCode] ?? null,
    sequence,
  };
}

export function buildMdrDeliverableCode(args: {
  jobRoot: string;
  docType: MdrDocType;
  sequence: number;
}): string {
  const root = args.jobRoot.trim().toUpperCase();
  if (!ENGAGEMENT_JOB_CODE_RE.test(root)) {
    throw new Error(`Invalid engagement job root "${args.jobRoot}" — expected C-YY-NNN.`);
  }
  if (!Number.isInteger(args.sequence) || args.sequence < 1 || args.sequence > 999) {
    throw new Error("MDR sequence must be an integer from 1 to 999.");
  }
  return `${root}-${MDR_DOC_TYPE_CODE[args.docType]}-${String(args.sequence).padStart(3, "0")}`;
}

/**
 * True when `code` is a well-formed MDR number for this job root and a known
 * document type. Rejects revision/status tokens (P01, C01, FI…) in the number.
 */
export function isValidMdrDeliverableCode(code: string, jobRoot: string): boolean {
  const parsed = parseMdrDeliverableCode(code);
  if (!parsed || !parsed.docType) return false;
  return parsed.jobRoot === jobRoot.trim().toUpperCase();
}

/** Next free sequence for a job root + document type among existing codes. */
export function nextMdrSequence(
  existingCodes: readonly string[],
  jobRoot: string,
  docType: MdrDocType,
): number {
  const typeCode = MDR_DOC_TYPE_CODE[docType];
  const root = jobRoot.trim().toUpperCase();
  let max = 0;
  for (const c of existingCodes) {
    const p = parseMdrDeliverableCode(c);
    if (!p || p.jobRoot !== root || p.docTypeCode !== typeCode) continue;
    if (p.sequence > max) max = p.sequence;
  }
  return max + 1;
}

const ConsDeliverableFields = z.object({
  engagementId: z.string().uuid(),
  /**
   * Preferred: MDR document type — server allocates `{job}-{TYPE}-{seq}`.
   * When omitted, `code` must be a valid MDR number for the engagement.
   */
  docType: MdrDocType.optional(),
  /** Manual / legacy register code — must match MDR convention when provided alone. */
  code: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(300),
  discipline: EngineeringDiscipline,
  /** Two-track convention (SOP §3): P01, P02… preliminary · C01, C02… contractual. */
  revision: z.string().min(1).max(12).default("P01"),
  issueClass: IssueClass.default("FOR_INFORMATION"),
  checkCategory: CheckCategory.default("CAT1"),
  notes: z.string().max(8000).optional(),
});

export const ConsDeliverableCreate = ConsDeliverableFields.refine(
  (d) => Boolean(d.docType || d.code),
  {
    message: "Provide a document type (preferred) or an MDR register code.",
    path: ["docType"],
  },
);
export type ConsDeliverableCreate = z.infer<typeof ConsDeliverableCreate>;

export const ConsDeliverableUpdate = ConsDeliverableFields.omit({ engagementId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: DeliverableStatus.optional(),
  });
export type ConsDeliverableUpdate = z.infer<typeof ConsDeliverableUpdate>;

/**
 * Record the Studio issue transmittal for an ISSUED deliverable (SOP §3 —
 * every issue carries a form; MDR back-references the transmittal).
 * Requires the engagement to be linked to a Studio project.
 */
export const ConsIssueTransmittalCreate = z.object({
  deliverableId: z.string().uuid(),
  recipient: z.string().trim().min(1).max(200).optional(),
  channel: z
    .enum(["EMAIL", "PRINT", "PORTAL", "COURIER", "HAND"])
    .default("PORTAL"),
  notes: z.string().trim().max(1000).optional(),
});
export type ConsIssueTransmittalCreate = z.infer<typeof ConsIssueTransmittalCreate>;

/** Map consultancy issue class → Studio transmittal purpose (shared vocabulary). */
export function issueClassToTransmittalPurpose(
  issueClass: IssueClass,
): "FOR_INFORMATION" | "FOR_APPROVAL" | "FOR_CONSTRUCTION" {
  return issueClass;
}

/**
 * Pure gate: may create + link a Studio issue transmittal for this deliverable.
 */
export function canRecordIssueTransmittal(args: {
  deliverableStatus: string;
  existingTransmittalId: string | null | undefined;
  engagementProjectId: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (args.deliverableStatus !== "ISSUED")
    return {
      ok: false,
      reason: "Only issued deliverables get an issue transmittal — issue first.",
    };
  if (args.existingTransmittalId)
    return {
      ok: false,
      reason: "This deliverable already has an issue transmittal on the MDR.",
    };
  if (!args.engagementProjectId)
    return {
      ok: false,
      reason:
        "Link this engagement to a Studio project before recording an issue transmittal.",
    };
  return { ok: true };
}

// ── Phase 1 — the reliance engine ────────────────────────────────────────────

/**
 * Sign-off chain steps (case study §3.1). ORIGINATE is implicit — the
 * deliverable's `originatedBy` — so the recordable steps are:
 * CHECK (independent check, never the author) → APPROVE (sign; the Engineer of
 * Record accepts professional responsibility) → VERIFY (external/proof check,
 * highest category only).
 */
export const ReviewStepKind = z.enum(["CHECK", "APPROVE", "VERIFY"]);
export type ReviewStepKind = z.infer<typeof ReviewStepKind>;

export const REVIEW_STEP_LABEL: Record<ReviewStepKind, string> = {
  CHECK: "Independent check",
  APPROVE: "Approve & sign (EoR)",
  VERIFY: "Proof check",
};

/**
 * The chain a deliverable must complete before it may be ISSUED, by check
 * category (BS 5975 / IStructE; case study §3.2). Cat 1 vs Cat 2 differ in the
 * *independence* of the checker (same team vs independent), which grades will
 * encode later — the recorded chain shape is the same.
 */
export const CHECK_CATEGORY_REQUIRED_STEPS: Record<CheckCategory, readonly ReviewStepKind[]> = {
  CAT0: ["APPROVE"],
  CAT1: ["CHECK", "APPROVE"],
  CAT2: ["CHECK", "APPROVE"],
  CAT3: ["CHECK", "APPROVE", "VERIFY"],
};

/**
 * Rigour ordering of the check categories (higher = more independent review).
 * Used to forbid *downgrading* a deliverable's category — lowering rigour after
 * work has been classified is a liability decision, not a routine edit.
 */
export const CHECK_CATEGORY_RANK: Record<CheckCategory, number> = {
  CAT0: 0,
  CAT1: 1,
  CAT2: 2,
  CAT3: 3,
};

/** Check category may be raised but never lowered (liability decision). */
export function canRaiseCheckCategory(
  from: CheckCategory | string,
  to: CheckCategory | string,
): boolean {
  const a = CHECK_CATEGORY_RANK[from as CheckCategory];
  const b = CHECK_CATEGORY_RANK[to as CheckCategory];
  if (a === undefined || b === undefined) return false;
  return b >= a;
}

/**
 * The review steps still outstanding before a deliverable of `checkCategory` may
 * be ISSUED, given the `recordedKinds` already on it. Unknown categories fall back
 * to the CAT1 chain (matching the DB default). Order follows the required chain.
 */
export function missingReviewSteps(
  checkCategory: string,
  recordedKinds: readonly string[],
): ReviewStepKind[] {
  const required =
    CHECK_CATEGORY_REQUIRED_STEPS[checkCategory as CheckCategory] ??
    CHECK_CATEGORY_REQUIRED_STEPS.CAT1;
  const have = new Set(recordedKinds);
  return required.filter((k) => !have.has(k));
}

/**
 * Independence rules for recording a sign-off step (case study §3.1).
 * Returns a human-readable refusal reason, or `null` when the act is allowed.
 *
 * - CHECK ≠ author; on CAT2/CAT3 also ≠ existing approver
 * - APPROVE ≠ author; on CAT2/CAT3 also ≠ checker
 * - VERIFY ≠ author and ≠ checker
 */
export function reviewStepIndependenceError(args: {
  kind: ReviewStepKind;
  checkCategory: string;
  actorUserId: string;
  originatedBy: string | null | undefined;
  recorded: readonly { kind: string; userId: string | null | undefined }[];
}): string | null {
  const { kind, checkCategory, actorUserId, originatedBy, recorded } = args;
  const checkApproveMustDiffer = checkCategory === "CAT2" || checkCategory === "CAT3";
  const checker = recorded.find((s) => s.kind === "CHECK");
  const approver = recorded.find((s) => s.kind === "APPROVE");

  if (kind === "CHECK") {
    if (originatedBy && originatedBy === actorUserId)
      return "The independent check cannot be recorded by the deliverable's author.";
    if (checkApproveMustDiffer && approver?.userId === actorUserId)
      return `On a ${checkCategory} deliverable the check must be independent of the approver.`;
  }
  if (kind === "VERIFY") {
    if ((originatedBy && originatedBy === actorUserId) || checker?.userId === actorUserId)
      return "The proof check must be independent of both the author and the checker.";
  }
  if (kind === "APPROVE") {
    if (originatedBy && originatedBy === actorUserId)
      return "The approval (EoR sign-off) cannot be recorded by the deliverable's author.";
    if (checkApproveMustDiffer && checker?.userId === actorUserId)
      return `On a ${checkCategory} deliverable the approval must be independent of the checker.`;
  }
  return null;
}

/**
 * Whether a deliverable may be ISSUED given its sign-off progress and hold points.
 * Pure gate — the router still runs this inside a transaction with the status flip.
 */
export function mayIssueDeliverable(args: {
  checkCategory: string;
  recordedKinds: readonly string[];
  openCrsCount: number;
  receivedInputPackCount: number;
}): { ok: true } | { ok: false; reason: string } {
  const missing = missingReviewSteps(args.checkCategory, args.recordedKinds);
  if (missing.length > 0)
    return {
      ok: false,
      reason: `Sign-off incomplete — still need: ${missing.join(", ")}.`,
    };
  if (args.openCrsCount > 0)
    return {
      ok: false,
      reason: `${args.openCrsCount} open comment-response sheet item(s) must be closed before issue.`,
    };
  if (args.receivedInputPackCount > 0)
    return {
      ok: false,
      reason: `${args.receivedInputPackCount} input pack(s) are still unvalidated hold points.`,
    };
  return { ok: true };
}

export const ConsReviewStepCreate = z.object({
  deliverableId: z.string().uuid(),
  kind: ReviewStepKind,
  note: z.string().max(2000).optional(),
});
export type ConsReviewStepCreate = z.infer<typeof ConsReviewStepCreate>;

/** Technical query (TQ/RFI) register — questions with closure evidence (case study §4.2). */
export const TqStatus = z.enum(["OPEN", "ANSWERED", "CLOSED"]);
export type TqStatus = z.infer<typeof TqStatus>;

export const TQ_STATUS_LABEL: Record<TqStatus, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export const CONS_TQ_STATUS_TAG: Record<TqStatus, TagColor> = {
  OPEN: "red",
  ANSWERED: "teal",
  CLOSED: "green",
};

export const ConsTqCreate = z.object({
  engagementId: z.string().uuid(),
  /** Register code, e.g. TQ-001. */
  code: z.string().min(1).max(40),
  question: z.string().min(1).max(4000),
  /** SLA due date (contractual turnaround typically 5–14 working days). */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** A TQ that expands the brief becomes a variation (billable) — flag it. */
  scopeImpact: z.boolean().default(false),
});
export type ConsTqCreate = z.infer<typeof ConsTqCreate>;

export const ConsTqAnswer = z.object({
  id: z.string().uuid(),
  answer: z.string().min(1).max(8000),
});
export type ConsTqAnswer = z.infer<typeof ConsTqAnswer>;

export const ConsTqClose = z.object({
  id: z.string().uuid(),
  /** Closure evidence is mandatory — the dated trail is the dispute record. */
  closureNote: z.string().min(1).max(4000),
});
export type ConsTqClose = z.infer<typeof ConsTqClose>;

// ── Phase 2 — the commercial engine (slice 1: fee stages) ───────────────────

/**
 * Stage lifecycle: PENDING → BILLABLE (fires automatically when the linked
 * deliverable is ISSUED — stage billing is tied to deliverable issue, case
 * study §5.4) → INVOICED (recorded when the invoice is raised).
 */
export const FeeStageStatus = z.enum(["PENDING", "BILLABLE", "INVOICED", "PAID"]);
export type FeeStageStatus = z.infer<typeof FeeStageStatus>;

export const FEE_STAGE_STATUS_LABEL: Record<FeeStageStatus, string> = {
  PENDING: "Pending",
  BILLABLE: "Billable",
  INVOICED: "Invoiced",
  PAID: "Paid",
};

export const CONS_FEE_STAGE_STATUS_TAG: Record<FeeStageStatus, TagColor> = {
  PENDING: "gray",
  BILLABLE: "red",
  INVOICED: "teal",
  PAID: "green",
};

/** Allowed single-step advances on the fee-stage lifecycle. */
export const FEE_STAGE_TRANSITIONS: Record<FeeStageStatus, readonly FeeStageStatus[]> = {
  PENDING: ["BILLABLE"],
  BILLABLE: ["INVOICED"],
  INVOICED: ["PAID"],
  PAID: [],
};

/** Once invoiced (or paid), amount / deliverable link must not change. */
export function feeStageFinancialsLocked(status: FeeStageStatus | string): boolean {
  return status === "INVOICED" || status === "PAID";
}

export function canAdvanceFeeStage(
  from: FeeStageStatus | string,
  to: FeeStageStatus | string,
): boolean {
  const allowed = FEE_STAGE_TRANSITIONS[from as FeeStageStatus];
  return !!allowed && allowed.includes(to as FeeStageStatus);
}

/**
 * Pure gate for raising a Studio tax invoice from a BILLABLE fee stage
 * (SOP §8 milestone invoicing). Requires a linked Studio project on the engagement.
 */
export function canRaiseFeeStageStudioInvoice(args: {
  stageStatus: string;
  engagementProjectId: string | null | undefined;
  existingInvoiceId: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (!canAdvanceFeeStage(args.stageStatus, "INVOICED"))
    return {
      ok: false,
      reason:
        args.stageStatus === "INVOICED" || args.stageStatus === "PAID"
          ? `This stage is already ${args.stageStatus.toLowerCase()}.`
          : "The stage is not billable yet — it turns billable when its linked deliverable is issued.",
    };
  if (args.existingInvoiceId)
    return { ok: false, reason: "This stage already has a Studio invoice." };
  if (!args.engagementProjectId)
    return {
      ok: false,
      reason:
        "Link this engagement to a Studio project before raising a Studio invoice.",
    };
  return { ok: true };
}

/** Chargeout at log time — rate × hours, rounded to integer paise. */
export function timesheetValuePaise(ratePaise: number, hours: number): number {
  return Math.round(ratePaise * hours);
}

export type FeeStageAmountRow = {
  amountPaise: number | null | undefined;
  status: FeeStageStatus | string;
};

export type TimesheetValueRow = {
  hours: number | null | undefined;
  valuePaise: number | null | undefined;
  status?: string | null;
};

export type FeePosition = {
  agreedPaise: number;
  stagedPaise: number;
  billablePaise: number;
  invoicedPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  hoursBooked: number;
  pendingApproval: number;
  timeValuePaise: number;
  wipPaise: number;
};

/**
 * Engagement fee position (case study §5.2).
 * - `invoicedPaise` = INVOICED ∪ PAID (invoiced-ever)
 * - `outstandingPaise` = INVOICED only (receivables)
 * - `wipPaise` = max(0, timeValue − invoiced-ever)
 */
export function computeFeePosition(args: {
  agreedPaise: number | null | undefined;
  stages: readonly FeeStageAmountRow[];
  timesheets: readonly TimesheetValueRow[];
}): FeePosition {
  const sum = (rows: readonly FeeStageAmountRow[]) =>
    rows.reduce((a, s) => a + (s.amountPaise ?? 0), 0);
  const invoicedPaise = sum(
    args.stages.filter((s) => s.status === "INVOICED" || s.status === "PAID"),
  );
  const timeValuePaise = args.timesheets.reduce((a, t) => a + (t.valuePaise ?? 0), 0);
  return {
    agreedPaise: args.agreedPaise ?? 0,
    stagedPaise: sum(args.stages),
    billablePaise: sum(args.stages.filter((s) => s.status === "BILLABLE")),
    invoicedPaise,
    paidPaise: sum(args.stages.filter((s) => s.status === "PAID")),
    outstandingPaise: sum(args.stages.filter((s) => s.status === "INVOICED")),
    hoursBooked: args.timesheets.reduce((a, t) => a + (t.hours ?? 0), 0),
    pendingApproval: args.timesheets.filter((t) => t.status === "SUBMITTED").length,
    timeValuePaise,
    wipPaise: Math.max(0, timeValuePaise - invoicedPaise),
  };
}

/**
 * Firm WIP: per-engagement floor-then-sum (not a firm-level floor).
 * Each engagement contributes max(0, its timeValue − its invoiced-ever).
 */
export function sumFirmWip(
  perEngagement: readonly { timeValuePaise: number; invoicedPaise: number }[],
): number {
  return perEngagement.reduce(
    (a, e) => a + Math.max(0, e.timeValuePaise - e.invoicedPaise),
    0,
  );
}

/** Realisation ratio; null when no time has been valued. */
export function realisationRatio(invoicedPaise: number, timeValuePaise: number): number | null {
  return timeValuePaise > 0 ? invoicedPaise / timeValuePaise : null;
}

/** SOP §8 — timesheet entries are approved weekly (named act). */
export const TimesheetStatus = z.enum(["SUBMITTED", "APPROVED"]);
export type TimesheetStatus = z.infer<typeof TimesheetStatus>;

export const CONS_TIMESHEET_STATUS_TAG: Record<TimesheetStatus, TagColor> = {
  SUBMITTED: "teal",
  APPROVED: "green",
};

export const ConsFeeStageCreate = z.object({
  engagementId: z.string().uuid(),
  label: z.string().min(1).max(200),
  /** Integer paise (house convention — format with formatINR). */
  amountPaise: z.number().int().nonnegative(),
  /** Billing trigger — the stage turns BILLABLE when this deliverable is ISSUED. */
  deliverableId: z.string().uuid().optional(),
});
export type ConsFeeStageCreate = z.infer<typeof ConsFeeStageCreate>;

export const ConsFeeStageUpdate = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200).optional(),
  amountPaise: z.number().int().nonnegative().optional(),
  deliverableId: z.string().uuid().nullable().optional(),
});
export type ConsFeeStageUpdate = z.infer<typeof ConsFeeStageUpdate>;

// ── Phase 2 slice 2 — time & health (timesheets, rate cards, WIP) ───────────

/** Delivery grades (case study §2.1) — the chargeout dimension of the rate card. */
export const ConsGrade = z.enum([
  "PRINCIPAL",
  "DIRECTOR",
  "ASSOCIATE",
  "SENIOR_ENGINEER",
  "ENGINEER",
  "GRADUATE",
]);
export type ConsGrade = z.infer<typeof ConsGrade>;

export const CONS_GRADE_LABEL: Record<ConsGrade, string> = {
  PRINCIPAL: "Principal / Partner",
  DIRECTOR: "Technical Director",
  ASSOCIATE: "Associate",
  SENIOR_ENGINEER: "Senior Engineer",
  ENGINEER: "Engineer",
  GRADUATE: "Graduate Engineer",
};

/** Firm rate card — chargeout per grade (paise/hour) + weekly capacity (hours). */
export const ConsRateCardSet = z.object({
  rates: z
    .array(
      z.object({
        grade: ConsGrade,
        ratePaise: z.number().int().nonnegative(),
        /** Firm capacity at this grade, hours/week — the utilisation denominator. */
        capacityHoursWeek: z.number().nonnegative().max(10000).optional(),
      }),
    )
    .min(1)
    .max(12),
});
export type ConsRateCardSet = z.infer<typeof ConsRateCardSet>;

/** Period input for firm analytics (ISO dates, inclusive). */
export const ConsAnalyticsPeriod = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((p) => p.from <= p.to, {
    message: "The period's start must be on or before its end.",
    path: ["to"],
  });
export type ConsAnalyticsPeriod = z.infer<typeof ConsAnalyticsPeriod>;

/** How many forward calendar months the capacity outlook covers (incl. current). */
export const ConsCapacityHorizonMonths = z.number().int().min(1).max(12).default(3);
export type ConsCapacityHorizonMonths = z.infer<typeof ConsCapacityHorizonMonths>;

/** Optional input for `consultancy.analytics.capacityOutlook`. */
export const ConsCapacityOutlookInput = z.object({
  /** Inclusive UTC "today" (YYYY-MM-DD). Defaults to server today when omitted. */
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  horizonMonths: z.number().int().min(1).max(12).optional(),
});
export type ConsCapacityOutlookInput = z.infer<typeof ConsCapacityOutlookInput>;

export type CapacityLoadStatus = "OK" | "TIGHT" | "OVER";

export type CapacityOutlookRow = {
  /** YYYY-MM */
  month: string;
  discipline: EngineeringDiscipline;
  /** Projected or recorded hours for the discipline in this month. */
  hours: number;
  /** Firm weekly capacity × weeks in month × discipline share of trailing load. */
  capacityHours: number;
  /** hours ÷ capacityHours (null when capacity is 0). */
  load: number | null;
  status: CapacityLoadStatus;
};

function yyyyMm(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weeksInMonth(yyyyMmKey: string): number {
  const [y, m] = yyyyMmKey.split("-").map(Number);
  const days = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return days / 7;
}

function monthKeysFrom(anchor: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(yyyyMm(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + i, 1))));
  }
  return keys;
}

function loadStatus(load: number | null): CapacityLoadStatus {
  if (load == null) return "OK";
  if (load >= 1.05) return "OVER";
  if (load >= 0.85) return "TIGHT";
  return "OK";
}

/**
 * P9.4 capacity analytics — deterministic "is structural over-committed in
 * September?" outlook. Uses trailing timesheet hours by engagement lead
 * discipline as a run-rate, allocated against firm weekly capacity (rate card)
 * weighted by each discipline's share of recent load.
 *
 * Pure; no LLM. Forward months without booked hours still get a projection
 * from the trailing average.
 */
export function buildCapacityOutlook(args: {
  /** Inclusive UTC "today" for the outlook anchor (YYYY-MM-DD). */
  asOf: string;
  horizonMonths?: number;
  firmCapacityHoursWeek: number;
  /** Trailing sheets used to build the weekly run-rate (and fill past months). */
  sheets: readonly {
    date: string;
    hours: number;
    engagementId: string;
  }[];
  engagements: readonly {
    id: string;
    leadDiscipline: string;
    status?: string;
  }[];
}): CapacityOutlookRow[] {
  const horizon = Math.min(12, Math.max(1, args.horizonMonths ?? 3));
  const asOf = new Date(`${args.asOf}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) return [];
  const months = monthKeysFrom(asOf, horizon);
  const engDisc = new Map(
    args.engagements.map((e) => [e.id, e.leadDiscipline as EngineeringDiscipline]),
  );

  // Hours by month × discipline (actuals).
  const actual = new Map<string, number>(); // `${month}|${discipline}`
  const trailingByDisc = new Map<EngineeringDiscipline, number>();
  const trailingFrom = new Date(asOf);
  trailingFrom.setUTCDate(trailingFrom.getUTCDate() - 28);

  for (const s of args.sheets) {
    const disc = engDisc.get(s.engagementId);
    if (!disc || !EngineeringDiscipline.safeParse(disc).success) continue;
    const month = s.date.slice(0, 7);
    const key = `${month}|${disc}`;
    actual.set(key, (actual.get(key) ?? 0) + (s.hours ?? 0));
    const sheetDay = new Date(`${s.date}T00:00:00Z`);
    if (sheetDay >= trailingFrom && sheetDay <= asOf) {
      trailingByDisc.set(disc, (trailingByDisc.get(disc) ?? 0) + (s.hours ?? 0));
    }
  }

  const trailingTotal = [...trailingByDisc.values()].reduce((a, b) => a + b, 0);
  const weeklyByDisc = new Map<EngineeringDiscipline, number>();
  for (const [d, h] of trailingByDisc) weeklyByDisc.set(d, h / 4);

  // Disciplines in play = those with trailing hours or active engagements.
  const activeDisc = new Set<EngineeringDiscipline>();
  for (const d of trailingByDisc.keys()) activeDisc.add(d);
  for (const e of args.engagements) {
    if (e.status && e.status !== "ACTIVE") continue;
    if (EngineeringDiscipline.safeParse(e.leadDiscipline).success) {
      activeDisc.add(e.leadDiscipline as EngineeringDiscipline);
    }
  }
  if (activeDisc.size === 0) return [];

  const firmWeek = Math.max(0, args.firmCapacityHoursWeek);
  const rows: CapacityOutlookRow[] = [];
  const currentMonth = yyyyMm(asOf);

  for (const month of months) {
    const weeks = weeksInMonth(month);
    const firmMonthCap = firmWeek * weeks;
    // Share: trailing hours; equal split when no trailing signal.
    const shares = new Map<EngineeringDiscipline, number>();
    if (trailingTotal > 0) {
      for (const d of activeDisc) {
        shares.set(d, (trailingByDisc.get(d) ?? 0) / trailingTotal);
      }
    } else {
      const eq = 1 / activeDisc.size;
      for (const d of activeDisc) shares.set(d, eq);
    }

    for (const disc of [...activeDisc].sort()) {
      const actualH = actual.get(`${month}|${disc}`) ?? 0;
      const projectedH = (weeklyByDisc.get(disc) ?? 0) * weeks;
      // Past/current month prefer actuals when present; future always projects.
      const hours = month < currentMonth || (month === currentMonth && actualH > 0)
        ? actualH
        : projectedH;
      const capacityHours = firmMonthCap * (shares.get(disc) ?? 0);
      const load = capacityHours > 0 ? hours / capacityHours : null;
      rows.push({
        month,
        discipline: disc,
        hours: Math.round(hours * 10) / 10,
        capacityHours: Math.round(capacityHours * 10) / 10,
        load: load == null ? null : Math.round(load * 1000) / 1000,
        status: loadStatus(load),
      });
    }
  }
  return rows;
}

/** Short plain-language alerts for OVER / TIGHT rows (intelligence digest). */
export function capacityOutlookAlerts(
  rows: readonly CapacityOutlookRow[],
  limit = 6,
): string[] {
  return rows
    .filter((r) => r.status === "OVER" || r.status === "TIGHT")
    .sort((a, b) => (b.load ?? 0) - (a.load ?? 0))
    .slice(0, limit)
    .map((r) => {
      const label = ENGINEERING_DISCIPLINE_LABEL[r.discipline] ?? r.discipline;
      const pct = r.load != null ? Math.round(r.load * 100) : "?";
      return r.status === "OVER"
        ? `${label} looks over-committed in ${r.month} (~${pct}% of allocated capacity)`
        : `${label} is tight in ${r.month} (~${pct}% of allocated capacity)`;
    });
}

// ── Phase 3 — the defensibility layer (risk, PI, input gate) ────────────────

/** Risk register (case study §6.5) — score inherent and residual separately. */
export const RiskStatus = z.enum(["OPEN", "MITIGATED", "CLOSED"]);
export type RiskStatus = z.infer<typeof RiskStatus>;

export const CONS_RISK_STATUS_TAG: Record<RiskStatus, TagColor> = {
  OPEN: "red",
  MITIGATED: "teal",
  CLOSED: "gray",
};

export const RiskResponse = z.enum(["AVOID", "REDUCE", "TRANSFER", "ACCEPT"]);
export type RiskResponse = z.infer<typeof RiskResponse>;

export const RISK_RESPONSE_LABEL: Record<RiskResponse, string> = {
  AVOID: "Avoid",
  REDUCE: "Reduce",
  TRANSFER: "Transfer",
  ACCEPT: "Accept",
};

const riskScore = z.number().int().min(1).max(5);

const ConsRiskFields = z.object({
  /** Omit for a practice-level risk. */
  engagementId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  /** Inherent — before controls. */
  likelihood: riskScore,
  impact: riskScore,
  owner: z.string().max(200).optional(),
  response: RiskResponse.default("REDUCE"),
  mitigation: z.string().max(2000).optional(),
  /** Residual — after controls (defaults to inherent until reassessed). */
  residualLikelihood: riskScore.optional(),
  residualImpact: riskScore.optional(),
});

// Controls reduce risk; residual above inherent is a data error. (Update
// enforces the same invariant server-side against the stored inherent scores,
// since a partial update may change only one side.)
export const ConsRiskCreate = ConsRiskFields.refine(
  (r) =>
    (r.residualLikelihood ?? r.likelihood) <= r.likelihood &&
    (r.residualImpact ?? r.impact) <= r.impact,
  {
    message: "Residual score cannot exceed the inherent score.",
    path: ["residualLikelihood"],
  },
);
export type ConsRiskCreate = z.infer<typeof ConsRiskCreate>;

export const ConsRiskUpdate = ConsRiskFields.omit({ engagementId: true })
  .partial()
  .extend({ id: z.string().uuid(), status: RiskStatus.optional() });
export type ConsRiskUpdate = z.infer<typeof ConsRiskUpdate>;

/** Firm PI policy (case study §6.1) — claims-made; track limit, period, run-off. */
export const ConsInsuranceSet = z.object({
  insurer: z.string().min(1).max(200),
  policyNo: z.string().min(1).max(120),
  /** Limit of indemnity, integer paise. */
  limitPaise: z.number().int().nonnegative(),
  periodFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Run-off cover end (post-cessation claims window). */
  runOffUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});
export type ConsInsuranceSet = z.infer<typeof ConsInsuranceSet>;

/** Reliance letter — a named third party allowed to rely (case study §6.4). */
export const ConsRelianceLetterCreate = z
  .object({
    engagementId: z.string().uuid(),
    beneficiary: z.string().min(1).max(300),
    purpose: z.string().min(1).max(1000),
    issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Required — every reliance letter is time-boxed and must end after it starts. */
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(2000).optional(),
  })
  .refine((r) => r.expiresOn > r.issuedOn, {
    message: "The expiry date must be after the issue date.",
    path: ["expiresOn"],
  });
export type ConsRelianceLetterCreate = z.infer<typeof ConsRelianceLetterCreate>;

/** Withdraw a live reliance letter — a dated, reasoned, one-way act. */
export const ConsRelianceLetterRevoke = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1).max(2000),
});
export type ConsRelianceLetterRevoke = z.infer<typeof ConsRelianceLetterRevoke>;

export const RelianceLetterStatus = z.enum(["LIVE", "EXPIRED", "REVOKED"]);
export type RelianceLetterStatus = z.infer<typeof RelianceLetterStatus>;

export const RELIANCE_STATUS_TAG: Record<RelianceLetterStatus, TagColor> = {
  LIVE: "green",
  EXPIRED: "gray",
  REVOKED: "red",
};

/**
 * Effective status of a reliance letter. Revocation is a hard fact; otherwise
 * an expiry in the past reads as EXPIRED, else LIVE. `today` is an IST YYYY-MM-DD.
 */
export function relianceLetterStatus(
  letter: { revokedAt?: Date | string | null; expiresOn?: string | null },
  today: string,
): RelianceLetterStatus {
  if (letter.revokedAt) return "REVOKED";
  if (letter.expiresOn && letter.expiresOn < today) return "EXPIRED";
  return "LIVE";
}

/**
 * EOMS input gate (architecture §1.3): external inputs are recorded and
 * validated before they become working assumptions. An unvalidated pack is a
 * HOLD POINT — deliverables on the engagement cannot be issued past it.
 * (Named manual validation now; EOMS-assisted validation rides with Phase 4.)
 */
export const InputPackKind = z.enum(["ARCHITECT_PACK", "GEOTECH", "CODE", "BRIEF", "OTHER"]);
export type InputPackKind = z.infer<typeof InputPackKind>;

export const INPUT_PACK_KIND_LABEL: Record<InputPackKind, string> = {
  ARCHITECT_PACK: "Architect pack",
  GEOTECH: "Geotech report",
  CODE: "Code / standard",
  BRIEF: "Client brief",
  OTHER: "Other",
};

export const InputPackStatus = z.enum(["RECEIVED", "VALIDATED", "REJECTED"]);
export type InputPackStatus = z.infer<typeof InputPackStatus>;

export const CONS_INPUT_PACK_STATUS_TAG: Record<InputPackStatus, TagColor> = {
  RECEIVED: "red",
  VALIDATED: "green",
  REJECTED: "gray",
};

export const ConsInputPackCreate = z.object({
  engagementId: z.string().uuid(),
  title: z.string().min(1).max(300),
  kind: InputPackKind.default("ARCHITECT_PACK"),
  /** Where it came from, e.g. "Architect issue rev C, 2026-07-10". */
  source: z.string().max(500).optional(),
});
export type ConsInputPackCreate = z.infer<typeof ConsInputPackCreate>;

// ── Phase 4 / P9.4 — CalculationPackage lineage (architecture D4) ─────────────

/**
 * Reproducible calc trail — inputs, assumptions, code refs, outputs. The firm's
 * tools compute; AORMS only governs what was computed and relied on.
 */
export const CalcPackageStatus = z.enum(["DRAFT", "CURRENT", "SUPERSEDED"]);
export type CalcPackageStatus = z.infer<typeof CalcPackageStatus>;

export const CALC_PACKAGE_STATUS_LABEL: Record<CalcPackageStatus, string> = {
  DRAFT: "Draft",
  CURRENT: "Current",
  SUPERSEDED: "Superseded",
};

export const CONS_CALC_PACKAGE_STATUS_TAG: Record<CalcPackageStatus, TagColor> = {
  DRAFT: "blue",
  CURRENT: "green",
  SUPERSEDED: "gray",
};

/** Allowed status advances for a calc package (no revive from SUPERSEDED). */
export function canAdvanceCalcPackage(
  from: CalcPackageStatus | string,
  to: CalcPackageStatus | string,
): boolean {
  if (from === to) return false;
  if (from === "DRAFT" && (to === "CURRENT" || to === "SUPERSEDED")) return true;
  if (from === "CURRENT" && to === "SUPERSEDED") return true;
  return false;
}

export const ConsCalcPackageCreate = z.object({
  engagementId: z.string().uuid(),
  /** Optional link to the issuable deliverable this calc supports. */
  deliverableId: z.string().uuid().optional(),
  /** Optional link to the validated InputPack whose assumptions feed this calc. */
  inputPackId: z.string().uuid().optional(),
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  revision: z.string().min(1).max(12).default("P01"),
  softwareTool: z.string().max(120).optional(),
  codeRefs: z.string().max(4000).optional(),
  assumptions: z.string().max(8000).optional(),
  inputsSummary: z.string().max(8000).optional(),
  outputsSummary: z.string().max(8000).optional(),
  note: z.string().max(2000).optional(),
});
export type ConsCalcPackageCreate = z.infer<typeof ConsCalcPackageCreate>;

export const ConsCalcPackageUpdate = ConsCalcPackageCreate.omit({ engagementId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
  });
export type ConsCalcPackageUpdate = z.infer<typeof ConsCalcPackageUpdate>;

/** A timesheet entry — hours booked to engagement (× deliverable) at a grade. */
export const ConsTimesheetCreate = z.object({
  engagementId: z.string().uuid(),
  deliverableId: z.string().uuid().optional(),
  /** ISO date (YYYY-MM-DD). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grade: ConsGrade,
  hours: z.number().positive().max(24),
  note: z.string().max(500).optional(),
});
export type ConsTimesheetCreate = z.infer<typeof ConsTimesheetCreate>;

// ── Phase 2 slice 3 — variations (additional services) ──────────────────────

/**
 * Out-of-scope work captured as a named variation with approval (case study
 * §5.4) — client scope changes and code updates are chargeable; design-team
 * errors are not. Approval appends a BILLABLE fee stage automatically.
 */
export const VariationStatus = z.enum(["PROPOSED", "APPROVED", "REJECTED"]);
export type VariationStatus = z.infer<typeof VariationStatus>;

export const VARIATION_STATUS_LABEL: Record<VariationStatus, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Only a proposed variation may be approved or rejected. */
export function canDecideVariation(status: VariationStatus | string): boolean {
  return status === "PROPOSED";
}

/** An approved variation owns a BILLABLE fee stage — delete is refused. */
export function variationDeletionBlocked(status: VariationStatus | string): boolean {
  return status === "APPROVED";
}

export const CONS_VARIATION_STATUS_TAG: Record<VariationStatus, TagColor> = {
  PROPOSED: "teal",
  APPROVED: "green",
  REJECTED: "gray",
};

export const ConsVariationCreate = z.object({
  engagementId: z.string().uuid(),
  /** Register code, e.g. VO-001. */
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(300),
  /** Proposed additional fee — integer paise. */
  amountPaise: z.number().int().nonnegative(),
  /** The scope-impact TQ this variation grew out of, when applicable. */
  sourceTqId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});
export type ConsVariationCreate = z.infer<typeof ConsVariationCreate>;

// ── Phase 4 — intelligence helpers (pure; router supplies the rows) ─────────

/** Tokenise a free-text query for precedent scoring (lowercase word stems ≥3 chars). */
export function tokenizePrecedentQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

export type PrecedentCandidate = {
  id: string;
  title: string;
  consultancyType?: string | null;
  model?: string | null;
  stage?: string | null;
  status?: string | null;
  brief?: Record<string, unknown> | null;
  deliverableTitles?: readonly string[];
};

export type PrecedentHit = {
  id: string;
  score: number;
  reasons: string[];
};

/**
 * Rank past engagements as precedents for a free-text query (type, model, title,
 * brief values, deliverable titles). Deterministic — no LLM. Higher score first.
 */
export function rankPrecedentEngagements(
  query: string,
  candidates: readonly PrecedentCandidate[],
  limit = 8,
): PrecedentHit[] {
  const tokens = tokenizePrecedentQuery(query);
  if (tokens.length === 0) return [];

  const hits: PrecedentHit[] = [];
  for (const c of candidates) {
    const reasons: string[] = [];
    let score = 0;
    const title = c.title.toLowerCase();
    const type = (c.consultancyType ?? "").toLowerCase();
    const model = (c.model ?? "").toLowerCase();
    const stage = (c.stage ?? "").toLowerCase();
    const briefBlob = c.brief
      ? Object.values(c.brief)
          .map((v) => String(v).toLowerCase())
          .join(" ")
      : "";
    const delivBlob = (c.deliverableTitles ?? []).join(" ").toLowerCase();

    for (const t of tokens) {
      if (type === t || type.includes(t)) {
        score += 5;
        reasons.push(`type:${c.consultancyType}`);
      }
      if (model === t || model.includes(t)) {
        score += 3;
        reasons.push(`model:${c.model}`);
      }
      if (title.includes(t)) {
        score += 2;
        reasons.push(`title`);
      }
      if (stage.includes(t)) {
        score += 1;
        reasons.push(`stage:${c.stage}`);
      }
      if (briefBlob.includes(t)) {
        score += 2;
        reasons.push(`brief`);
      }
      if (delivBlob.includes(t)) {
        score += 2;
        reasons.push(`deliverable`);
      }
    }
    if (score > 0) {
      hits.push({
        id: c.id,
        score,
        reasons: [...new Set(reasons)].slice(0, 6),
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

export type DeliverableLineageStep = {
  kind: string;
  userName: string | null | undefined;
  recordedAt?: string | Date | null;
};

export type DeliverableLineageFee = {
  label: string;
  status: string;
  amountPaise: number | null | undefined;
};

export type DeliverableLineageCalc = {
  code: string;
  title: string;
  status: string;
  revision: string | null | undefined;
};

/**
 * Deterministic sign-off / billing / calc lineage for one deliverable.
 * Pure; no LLM. Calc packages are the D4 trail (inputs → assumptions → outputs).
 */
export function buildDeliverableLineage(args: {
  code: string;
  title: string;
  status: string;
  checkCategory: string;
  revision: string | null | undefined;
  steps: readonly DeliverableLineageStep[];
  feeStages: readonly DeliverableLineageFee[];
  calcPackages?: readonly DeliverableLineageCalc[];
}): {
  summary: string;
  missingSteps: ReviewStepKind[];
  chainComplete: boolean;
} {
  const missing = missingReviewSteps(
    args.checkCategory,
    args.steps.map((s) => s.kind),
  );
  const chain =
    args.steps.length === 0
      ? "no steps recorded"
      : args.steps.map((s) => `${s.kind}:${s.userName ?? "?"}`).join(" → ");
  const fees =
    args.feeStages.length === 0
      ? "no linked fee stages"
      : args.feeStages
          .map((f) => `${f.label} [${f.status}]`)
          .join("; ");
  const calcs = args.calcPackages ?? [];
  const calcLine =
    calcs.length === 0
      ? "no calc packages"
      : calcs.map((c) => `${c.code} rev ${c.revision ?? "—"} [${c.status}]`).join("; ");
  const summary = [
    `${args.code} "${args.title}" rev ${args.revision ?? "—"} · ${args.checkCategory} · ${args.status}`,
    `Chain: ${chain}`,
    missing.length ? `Outstanding: ${missing.join(", ")}` : "Chain complete for issue",
    `Fees: ${fees}`,
    `Calcs: ${calcLine}`,
  ].join("\n");
  return { summary, missingSteps: missing, chainComplete: missing.length === 0 };
}


// ── SOP closeout registers (lessons · NC/CAPA · MoM · WIP · contract review) ─

export const ConsLessonStatus = z.enum(["DRAFT", "PUBLISHED"]);
export type ConsLessonStatus = z.infer<typeof ConsLessonStatus>;

export const ConsLessonCreate = z.object({
  engagementId: z.string().uuid(),
  category: z.string().trim().min(1).max(80).default("GENERAL"),
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(8000),
  recommendation: z.string().trim().max(4000).optional(),
});
export type ConsLessonCreate = z.infer<typeof ConsLessonCreate>;

export const ConsNcSeverity = z.enum(["MINOR", "MAJOR", "CRITICAL"]);
export type ConsNcSeverity = z.infer<typeof ConsNcSeverity>;

export const ConsNcStatus = z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]);
export type ConsNcStatus = z.infer<typeof ConsNcStatus>;

export const CONS_NC_STATUS_TAG: Record<ConsNcStatus, TagColor> = {
  OPEN: "red",
  IN_PROGRESS: "teal",
  CLOSED: "green",
};

export const ConsNcCreate = z.object({
  engagementId: z.string().uuid(),
  fieldReportId: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(8000).optional(),
  severity: ConsNcSeverity.default("MINOR"),
  responsibleParty: z.string().trim().max(200).optional(),
  correctiveAction: z.string().trim().max(4000).optional(),
  preventiveAction: z.string().trim().max(4000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ConsNcCreate = z.infer<typeof ConsNcCreate>;

export const ConsNcClose = z.object({
  id: z.string().uuid(),
  correctiveAction: z.string().trim().min(1).max(4000).optional(),
  preventiveAction: z.string().trim().max(4000).optional(),
});
export type ConsNcClose = z.infer<typeof ConsNcClose>;

export const ConsMomStatus = z.enum(["DRAFT", "ISSUED"]);
export type ConsMomStatus = z.infer<typeof ConsMomStatus>;

export const ConsMomCreate = z.object({
  engagementId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attendees: z.string().trim().max(2000).optional(),
  minutes: z.string().trim().max(16000).optional(),
});
export type ConsMomCreate = z.infer<typeof ConsMomCreate>;

export const ConsWipDecision = z.enum(["BILL", "HOLD", "WRITE_OFF"]);
export type ConsWipDecision = z.infer<typeof ConsWipDecision>;

export const ConsWipReviewCreate = z.object({
  engagementId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wipPaise: z.number().int().nonnegative().default(0),
  decision: ConsWipDecision.default("HOLD"),
  notes: z.string().trim().max(4000).optional(),
});
export type ConsWipReviewCreate = z.infer<typeof ConsWipReviewCreate>;

export const ConsContractReviewDecision = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ConsContractReviewDecision = z.infer<typeof ConsContractReviewDecision>;

export const ConsContractReviewCreate = z.object({
  engagementId: z.string().uuid(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requirementsDefined: z.boolean().default(false),
  capabilityConfirmed: z.boolean().default(false),
  conflictChecked: z.boolean().default(false),
  proposalVsContractOk: z.boolean().default(false),
  decision: ConsContractReviewDecision.default("PENDING"),
  notes: z.string().trim().max(4000).optional(),
});
export type ConsContractReviewCreate = z.infer<typeof ConsContractReviewCreate>;

/** ISO 9001 §8.2.3 gate — all checklist boxes before APPROVED. */
export function canApproveContractReview(row: {
  requirementsDefined: boolean;
  capabilityConfirmed: boolean;
  conflictChecked: boolean;
  proposalVsContractOk: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!row.requirementsDefined)
    return { ok: false, reason: "Requirements (incl. unstated + statutory) must be confirmed." };
  if (!row.capabilityConfirmed)
    return { ok: false, reason: "Capability to deliver must be confirmed." };
  if (!row.conflictChecked)
    return { ok: false, reason: "Conflict-of-interest check must be recorded." };
  if (!row.proposalVsContractOk)
    return { ok: false, reason: "Proposal-vs-contract differences must be resolved." };
  return { ok: true };
}
