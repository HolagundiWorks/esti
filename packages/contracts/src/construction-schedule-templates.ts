import type { ConstructionDependencyType, ConstructionScheduleTemplateKey } from "./construction-schedule.js";

export type ConstructionTemplateActivity = {
  wbsCode: string;
  title: string;
  trade: string;
  location?: string;
  durationDays: number;
  parentWbsCode?: string;
};

export type ConstructionTemplateDependency = {
  predecessorWbs: string;
  successorWbs: string;
  type: ConstructionDependencyType;
  lagDays?: number;
};

export type ConstructionScheduleTemplate = {
  key: ConstructionScheduleTemplateKey;
  label: string;
  activities: ConstructionTemplateActivity[];
  dependencies: ConstructionTemplateDependency[];
};

const RESIDENTIAL_ACTIVITIES: ConstructionTemplateActivity[] = [
  { wbsCode: "1", title: "Mobilisation & site setup", trade: "General", durationDays: 5 },
  { wbsCode: "1.1", title: "Site office & hoarding", trade: "General", durationDays: 3, parentWbsCode: "1" },
  { wbsCode: "2", title: "Excavation & PCC", trade: "Civil", durationDays: 10 },
  { wbsCode: "2.1", title: "Earthwork & footing excavation", trade: "Civil", durationDays: 7, parentWbsCode: "2" },
  { wbsCode: "2.2", title: "PCC & blinding", trade: "Civil", durationDays: 3, parentWbsCode: "2" },
  { wbsCode: "3", title: "Foundation & plinth", trade: "Civil", durationDays: 14 },
  { wbsCode: "3.1", title: "Footing RCC", trade: "Civil", durationDays: 8, parentWbsCode: "3" },
  { wbsCode: "3.2", title: "Plinth beam & backfill", trade: "Civil", durationDays: 6, parentWbsCode: "3" },
  { wbsCode: "4", title: "Superstructure", trade: "Civil", durationDays: 45 },
  { wbsCode: "4.1", title: "Columns & beams", trade: "Civil", durationDays: 20, parentWbsCode: "4" },
  { wbsCode: "4.2", title: "Slab casting", trade: "Civil", durationDays: 15, parentWbsCode: "4" },
  { wbsCode: "4.3", title: "Masonry walls", trade: "Masonry", durationDays: 10, parentWbsCode: "4" },
  { wbsCode: "5", title: "MEP rough-in", trade: "MEP", durationDays: 21 },
  { wbsCode: "5.1", title: "Electrical conduits", trade: "Electrical", durationDays: 10, parentWbsCode: "5" },
  { wbsCode: "5.2", title: "Plumbing & drainage", trade: "Plumbing", durationDays: 11, parentWbsCode: "5" },
  { wbsCode: "6", title: "Finishes", trade: "Finishes", durationDays: 30 },
  { wbsCode: "6.1", title: "Plaster & flooring", trade: "Finishes", durationDays: 18, parentWbsCode: "6" },
  { wbsCode: "6.2", title: "Painting & joinery", trade: "Finishes", durationDays: 12, parentWbsCode: "6" },
  { wbsCode: "7", title: "External works", trade: "External", durationDays: 14 },
  { wbsCode: "8", title: "Testing & commissioning", trade: "MEP", durationDays: 7 },
  { wbsCode: "9", title: "Handover & snag closure", trade: "PMC", durationDays: 10 },
];

const RESIDENTIAL_DEPS: ConstructionTemplateDependency[] = [
  { predecessorWbs: "1", successorWbs: "2", type: "FS" },
  { predecessorWbs: "2", successorWbs: "3", type: "FS" },
  { predecessorWbs: "3", successorWbs: "4", type: "FS" },
  { predecessorWbs: "4", successorWbs: "5", type: "FS" },
  { predecessorWbs: "5", successorWbs: "6", type: "FS" },
  { predecessorWbs: "4", successorWbs: "7", type: "FS", lagDays: 7 },
  { predecessorWbs: "6", successorWbs: "8", type: "FS" },
  { predecessorWbs: "7", successorWbs: "8", type: "FS" },
  { predecessorWbs: "8", successorWbs: "9", type: "FS" },
];

const COMMERCIAL_ACTIVITIES: ConstructionTemplateActivity[] = [
  { wbsCode: "1", title: "Mobilisation", trade: "General", durationDays: 7 },
  { wbsCode: "2", title: "Excavation & shoring", trade: "Civil", durationDays: 18 },
  { wbsCode: "3", title: "Pile foundation", trade: "Civil", durationDays: 21 },
  { wbsCode: "4", title: "Basement & retaining", trade: "Civil", durationDays: 28 },
  { wbsCode: "5", title: "Superstructure frame", trade: "Civil", durationDays: 60 },
  { wbsCode: "6", title: "Façade & glazing", trade: "Façade", durationDays: 35 },
  { wbsCode: "7", title: "MEP vertical risers", trade: "MEP", durationDays: 25 },
  { wbsCode: "8", title: "Floor fit-out typical", trade: "Finishes", durationDays: 40 },
  { wbsCode: "9", title: "STP & external infra", trade: "External", durationDays: 20 },
  { wbsCode: "10", title: "Testing & T&C", trade: "MEP", durationDays: 14 },
  { wbsCode: "11", title: "Occupancy & handover", trade: "PMC", durationDays: 14 },
];

const COMMERCIAL_DEPS: ConstructionTemplateDependency[] = [
  { predecessorWbs: "1", successorWbs: "2", type: "FS" },
  { predecessorWbs: "2", successorWbs: "3", type: "FS" },
  { predecessorWbs: "3", successorWbs: "4", type: "FS" },
  { predecessorWbs: "4", successorWbs: "5", type: "FS" },
  { predecessorWbs: "5", successorWbs: "6", type: "FS", lagDays: 14 },
  { predecessorWbs: "5", successorWbs: "7", type: "FS", lagDays: 21 },
  { predecessorWbs: "7", successorWbs: "8", type: "FS" },
  { predecessorWbs: "5", successorWbs: "9", type: "FS", lagDays: 30 },
  { predecessorWbs: "8", successorWbs: "10", type: "FS" },
  { predecessorWbs: "9", successorWbs: "10", type: "FS" },
  { predecessorWbs: "10", successorWbs: "11", type: "FS" },
];

const INSTITUTIONAL_ACTIVITIES: ConstructionTemplateActivity[] = [
  { wbsCode: "1", title: "Site mobilisation", trade: "General", durationDays: 5 },
  { wbsCode: "2", title: "Earthwork & foundations", trade: "Civil", durationDays: 20 },
  { wbsCode: "3", title: "Structural frame", trade: "Civil", durationDays: 50 },
  { wbsCode: "4", title: "Roofing & waterproofing", trade: "Civil", durationDays: 18 },
  { wbsCode: "5", title: "MEP installation", trade: "MEP", durationDays: 30 },
  { wbsCode: "6", title: "Internal finishes", trade: "Finishes", durationDays: 35 },
  { wbsCode: "7", title: "Landscape & external", trade: "External", durationDays: 15 },
  { wbsCode: "8", title: "Commissioning", trade: "MEP", durationDays: 10 },
  { wbsCode: "9", title: "Handover", trade: "PMC", durationDays: 7 },
];

const INSTITUTIONAL_DEPS: ConstructionTemplateDependency[] = [
  { predecessorWbs: "1", successorWbs: "2", type: "FS" },
  { predecessorWbs: "2", successorWbs: "3", type: "FS" },
  { predecessorWbs: "3", successorWbs: "4", type: "FS" },
  { predecessorWbs: "4", successorWbs: "5", type: "FS" },
  { predecessorWbs: "5", successorWbs: "6", type: "FS" },
  { predecessorWbs: "3", successorWbs: "7", type: "FS", lagDays: 14 },
  { predecessorWbs: "6", successorWbs: "8", type: "FS" },
  { predecessorWbs: "7", successorWbs: "8", type: "FS" },
  { predecessorWbs: "8", successorWbs: "9", type: "FS" },
];

const INDUSTRIAL_ACTIVITIES: ConstructionTemplateActivity[] = [
  { wbsCode: "1", title: "Mobilisation", trade: "General", durationDays: 5 },
  { wbsCode: "2", title: "Site grading & roads", trade: "Civil", durationDays: 12 },
  { wbsCode: "3", title: "Pile & pile cap", trade: "Civil", durationDays: 16 },
  { wbsCode: "4", title: "PEB erection", trade: "Steel", durationDays: 25 },
  { wbsCode: "5", title: "Roofing & cladding", trade: "Steel", durationDays: 18 },
  { wbsCode: "6", title: "Industrial flooring", trade: "Civil", durationDays: 14 },
  { wbsCode: "7", title: "MEP & firefighting", trade: "MEP", durationDays: 20 },
  { wbsCode: "8", title: "Testing", trade: "MEP", durationDays: 7 },
  { wbsCode: "9", title: "Handover", trade: "PMC", durationDays: 5 },
];

const INDUSTRIAL_DEPS: ConstructionTemplateDependency[] = [
  { predecessorWbs: "1", successorWbs: "2", type: "FS" },
  { predecessorWbs: "2", successorWbs: "3", type: "FS" },
  { predecessorWbs: "3", successorWbs: "4", type: "FS" },
  { predecessorWbs: "4", successorWbs: "5", type: "FS" },
  { predecessorWbs: "4", successorWbs: "6", type: "FS", lagDays: 7 },
  { predecessorWbs: "5", successorWbs: "7", type: "FS" },
  { predecessorWbs: "6", successorWbs: "7", type: "FS" },
  { predecessorWbs: "7", successorWbs: "8", type: "FS" },
  { predecessorWbs: "8", successorWbs: "9", type: "FS" },
];

const INTERIOR_ACTIVITIES: ConstructionTemplateActivity[] = [
  { wbsCode: "1", title: "Mobilisation & protection", trade: "General", durationDays: 3 },
  { wbsCode: "2", title: "Demolition & clearing", trade: "Civil", durationDays: 7 },
  { wbsCode: "3", title: "MEP rough-in", trade: "MEP", durationDays: 14 },
  { wbsCode: "4", title: "Ceiling & partitions", trade: "Finishes", durationDays: 12 },
  { wbsCode: "5", title: "Flooring & wall finishes", trade: "Finishes", durationDays: 14 },
  { wbsCode: "6", title: "Joinery & fixtures", trade: "Joinery", durationDays: 10 },
  { wbsCode: "7", title: "Painting & snagging", trade: "Finishes", durationDays: 8 },
  { wbsCode: "8", title: "Handover", trade: "PMC", durationDays: 3 },
];

const INTERIOR_DEPS: ConstructionTemplateDependency[] = [
  { predecessorWbs: "1", successorWbs: "2", type: "FS" },
  { predecessorWbs: "2", successorWbs: "3", type: "FS" },
  { predecessorWbs: "3", successorWbs: "4", type: "FS" },
  { predecessorWbs: "4", successorWbs: "5", type: "FS" },
  { predecessorWbs: "5", successorWbs: "6", type: "FS" },
  { predecessorWbs: "6", successorWbs: "7", type: "FS" },
  { predecessorWbs: "7", successorWbs: "8", type: "FS" },
];

export const CONSTRUCTION_SCHEDULE_TEMPLATES: Record<
  ConstructionScheduleTemplateKey,
  ConstructionScheduleTemplate
> = {
  residential_villa: {
    key: "residential_villa",
    label: "Residential villa",
    activities: RESIDENTIAL_ACTIVITIES,
    dependencies: RESIDENTIAL_DEPS,
  },
  commercial_block: {
    key: "commercial_block",
    label: "Commercial block",
    activities: COMMERCIAL_ACTIVITIES,
    dependencies: COMMERCIAL_DEPS,
  },
  institutional: {
    key: "institutional",
    label: "Institutional building",
    activities: INSTITUTIONAL_ACTIVITIES,
    dependencies: INSTITUTIONAL_DEPS,
  },
  industrial_shed: {
    key: "industrial_shed",
    label: "Industrial shed / factory",
    activities: INDUSTRIAL_ACTIVITIES,
    dependencies: INDUSTRIAL_DEPS,
  },
  interior_fitout: {
    key: "interior_fitout",
    label: "Interior fit-out",
    activities: INTERIOR_ACTIVITIES,
    dependencies: INTERIOR_DEPS,
  },
};

export function getConstructionTemplate(
  key: ConstructionScheduleTemplateKey,
): ConstructionScheduleTemplate {
  return CONSTRUCTION_SCHEDULE_TEMPLATES[key];
}
