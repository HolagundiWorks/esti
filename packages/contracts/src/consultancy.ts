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
});
export type ConsEngagementUpdate = z.infer<typeof ConsEngagementUpdate>;

/** Add a custom phase to an engagement's scope (beyond the seeded template). */
export const ConsPhaseCreate = z.object({
  engagementId: z.string().uuid(),
  name: z.string().min(1).max(200),
  scope: z.array(z.string().min(1).max(300)).max(20).default([]),
});
export type ConsPhaseCreate = z.infer<typeof ConsPhaseCreate>;

export const ConsDeliverableCreate = z.object({
  engagementId: z.string().uuid(),
  /** Document number on the register, e.g. C-26-001-CAL-001. */
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  discipline: EngineeringDiscipline,
  /** Two-track convention (SOP §3): P01, P02… preliminary · C01, C02… contractual. */
  revision: z.string().min(1).max(12).default("P01"),
  issueClass: IssueClass.default("FOR_INFORMATION"),
  checkCategory: CheckCategory.default("CAT1"),
  notes: z.string().max(8000).optional(),
});
export type ConsDeliverableCreate = z.infer<typeof ConsDeliverableCreate>;

export const ConsDeliverableUpdate = ConsDeliverableCreate.omit({ engagementId: true })
  .partial()
  .extend({
    id: z.string().uuid(),
    status: DeliverableStatus.optional(),
  });
export type ConsDeliverableUpdate = z.infer<typeof ConsDeliverableUpdate>;

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
export const FeeStageStatus = z.enum(["PENDING", "BILLABLE", "INVOICED"]);
export type FeeStageStatus = z.infer<typeof FeeStageStatus>;

export const FEE_STAGE_STATUS_LABEL: Record<FeeStageStatus, string> = {
  PENDING: "Pending",
  BILLABLE: "Billable",
  INVOICED: "Invoiced",
};

export const CONS_FEE_STAGE_STATUS_TAG: Record<FeeStageStatus, TagColor> = {
  PENDING: "gray",
  BILLABLE: "red",
  INVOICED: "green",
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
export const ConsAnalyticsPeriod = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ConsAnalyticsPeriod = z.infer<typeof ConsAnalyticsPeriod>;

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

export const ConsRiskCreate = z.object({
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
export type ConsRiskCreate = z.infer<typeof ConsRiskCreate>;

export const ConsRiskUpdate = ConsRiskCreate.omit({ engagementId: true })
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
export const ConsRelianceLetterCreate = z.object({
  engagementId: z.string().uuid(),
  beneficiary: z.string().min(1).max(300),
  purpose: z.string().min(1).max(1000),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});
export type ConsRelianceLetterCreate = z.infer<typeof ConsRelianceLetterCreate>;

/**
 * EmOI input gate (architecture §1.3): external inputs are recorded and
 * validated before they become working assumptions. An unvalidated pack is a
 * HOLD POINT — deliverables on the engagement cannot be issued past it.
 * (Named manual validation now; EmOI-assisted validation rides with Phase 4.)
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
