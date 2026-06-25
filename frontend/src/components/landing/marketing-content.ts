import {
  Building,
  Document,
  Finance,
} from "@carbon/icons-react";

export const PROBLEM_TILES = [
  {
    icon: Document,
    title: "The approval you can't find",
    body: "A client disputes a scope change. You have a WhatsApp thread and a fading memory. The revision was never formally documented.",
  },
  {
    icon: Finance,
    title: "Money scattered across files",
    body: "Fee proposal in Word, invoice in Excel, TDS in a third file. Quarter-end reconciliation is a scramble every time.",
  },
  {
    icon: Building,
    title: "The instruction nobody wrote down",
    body: "The site team did it differently — someone called, someone approved it verbally. You find out at the inspection visit.",
  },
] as const;

export const PRACTICE_LAYERS = [
  {
    tag: "2D CAD",
    type: "blue" as const,
    detail:
      "ESTICAD — full 2D drafting, details, takeoff, and drawing production; intended to replace AutoCAD and similar for architectural work.",
  },
  {
    tag: "BIM / 3D",
    type: "gray" as const,
    detail: "Revit, SketchUp, Rhino — where your practice uses 3D or BIM alongside ESTICAD.",
  },
  {
    tag: "Office record",
    type: "teal" as const,
    detail: "ESTI — projects, fees, issued documents, coordination, and commercial workflows.",
  },
] as const;

export type LifecycleStage = {
  id: string;
  label: string;
  outcomes: string[];
  modules: string[];
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: "initiation",
    label: "Initiation & Brief",
    outcomes: [
      "Client enquiry converted to a documented project brief with scope and assumptions",
      "Accommodation schedule and programme pinned to Project Info — not a separate spreadsheet",
      "Fee proposal structured to COA service stages, deliverables, and payment schedule",
    ],
    modules: ["Enquiries", "Project brief", "Fee proposal"],
  },
  {
    id: "concept",
    label: "Concept Design",
    outcomes: [
      "Design intent and mood boards captured and linked to the project record",
      "Early site feasibility checked against the published development-control rules",
      "Decisions and critical notes visible to the whole team — nothing lost in email",
    ],
    modules: ["Mood boards", "Decisions", "Site assessment"],
  },
  {
    id: "dd",
    label: "Design Development",
    outcomes: [
      "Drawing register with issued sets, revision history, and every approval documented",
      "Working drawings linked to ESTICAD — open in the desktop app from any drawing row",
      "Consultant scope and portal access assigned from within the project",
    ],
    modules: ["Drawings", "Consultants", "Revision register"],
  },
  {
    id: "statutory",
    label: "Statutory Coordination",
    outcomes: [
      "Development-control rules saved to the project — calculation and rule version together",
      "Site feasibility computation with a branded PDF snapshot for authority submission",
      "Permit records as office evidence — date, reference number, and issuing authority",
    ],
    modules: ["Knowledge Bank", "Bylaw calc", "Compliance PDF"],
  },
  {
    id: "cd",
    label: "Construction Documentation",
    outcomes: [
      "Working drawings issued in ESTICAD with transmittals and an approval log",
      "Specifications and procurement standards from the office catalogue",
      "Quantities from drawings feed directly into cost estimates and DSR rates",
    ],
    modules: ["ESTICAD", "Transmittals", "Specifications", "Cost estimates"],
  },
  {
    id: "tender",
    label: "Tender & Appointment",
    outcomes: [
      "Tender packages, addenda, and sealed bid comparison in one place",
      "Contractor register, award recommendation, and appointment record",
      "Architect-side cost estimate and rate analysis",
    ],
    modules: ["Tenders", "Contractors", "Estimation"],
  },
  {
    id: "ca",
    label: "Construction Administration",
    outcomes: [
      "Site instructions, RFIs, submittals, and shop drawings attached to the project",
      "Inspection reports, snag lists, and NCRs linked to drawings and contractor records",
      "Payment certificates and progress claims tracked against the appointment",
    ],
    modules: ["Site instructions", "Site schedule", "Invoices"],
  },
  {
    id: "handover",
    label: "Handover & Closeout",
    outcomes: [
      "Final drawing sets and as-built register — archived and retrievable years later",
      "Lessons learned captured for the office, not lost with the project",
      "Project archive with complete financial and audit records",
    ],
    modules: ["Archive", "Lessons learned", "Reconciliation"],
  },
];

export const INDIA_DESK_TILES = [
  {
    tag: "Money",
    type: "blue" as const,
    metric: "₹1.23 Cr",
    detail: "Lakh and crore formatting, integer-paise billing, financial year 1 Apr–31 Mar — built in, not a configuration setting.",
  },
  {
    tag: "GST",
    type: "teal" as const,
    metric: "3 schemes",
    detail: "Not applicable, Composition 6%, or Regular 18% — the right scheme and SAC code on every invoice, automatically.",
  },
  {
    tag: "COA number",
    type: "purple" as const,
    metric: "Mandatory",
    detail: "Your Council of Architecture registration appears on every fee proposal and invoice footer, as the CoA requires.",
  },
  {
    tag: "Standards",
    type: "gray" as const,
    metric: "Office library",
    detail: "DSR references, specification catalogues, and project standards stay versioned with a citable snapshot for every office decision.",
  },
] as const;

export const TRACEABILITY_PRINCIPLES = [
  "Context-based communication attached to project objects",
  "Complete audit trail with actor, timestamp, and before/after data",
  "Visibility of change on dashboards and activity feeds",
  "Human-controlled AI — drafts remain editable; nothing auto-issued",
] as const;

export const PORTAL_TILES = [
  {
    tag: "Client",
    type: "blue" as const,
    who: "Client organisation",
    detail: "Own projects, issued drawings, approvals, and change requests.",
  },
  {
    tag: "Consultant",
    type: "teal" as const,
    who: "MEP, structural, landscape",
    detail: "Assigned deliverables, drawings, RFIs, and scoped responses.",
  },
  {
    tag: "Contractor",
    type: "gray" as const,
    who: "Tender and site parties",
    detail: "Invited tenders, RFIs, submittals, inspections, and snags.",
  },
] as const;

export const CHARTER_REJECTS = [
  "Contractor inventory, labour attendance, GRN, and RA billing",
  "Web-based drawing markup or quantity takeoff",
  "Live statutory approval tracking or BPAS polling",
  "AI that auto-issues invoices, drawings, or portal messages",
] as const;

export const CHARTER_BUILDS = [
  "Production-grade record-keeping with exports and universal search",
  "ESTICAD as full 2D CAD with cloud sync, takeoff, and office Ollama AI gateway",
  "Incremental office workflows — additive schema, frozen information architecture",
] as const;
