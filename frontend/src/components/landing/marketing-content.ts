import {
  Collaborate,
  Document,
  Finance,
} from "@carbon/icons-react";

export const PROBLEM_TILES = [
  {
    icon: Collaborate,
    title: "Context lost",
    body: "RFIs and revision notes detached from the drawing they refer to.",
  },
  {
    icon: Finance,
    title: "Money disconnected",
    body: "Proposals, invoices, and TDS reconciliation in separate files.",
  },
  {
    icon: Document,
    title: "Compliance as files",
    body: "Development-control calculations without versioned rule sources.",
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
    detail: "ESTI AORMS — projects, fees, issued documents, coordination, and commercial workflows.",
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
      "Client enquiry converted to a structured project brief",
      "Accommodation schedule and assumptions recorded on Project Info",
      "Fee proposal scoped to COA scale and deliverables",
    ],
    modules: ["Enquiries", "Project brief", "Fee proposal"],
  },
  {
    id: "concept",
    label: "Concept Design",
    outcomes: [
      "Design drivers and mood boards linked to the project",
      "Early compliance feasibility against published rule sets",
      "Decisions and critical notes visible to the team",
    ],
    modules: ["Mood boards", "Decisions", "Site assessment"],
  },
  {
    id: "dd",
    label: "Design Development",
    outcomes: [
      "Drawing register with revision control and issue sets",
      "Working drawings authored in ESTICAD — Open in ESTICAD from any project row",
      "Consultant engagements and scoped portal access",
    ],
    modules: ["Drawings", "Consultants", "Revision register"],
  },
  {
    id: "statutory",
    label: "Statutory Coordination",
    outcomes: [
      "Versioned compliance rules in Knowledge Bank",
      "Site feasibility calculation with immutable PDF snapshot",
      "Permit records as office evidence — not live authority polling",
    ],
    modules: ["Knowledge Bank", "Bylaw calc", "Document register"],
  },
  {
    id: "cd",
    label: "Construction Documentation",
    outcomes: [
      "Working drawings produced in ESTICAD with transmittals and approval log",
      "Specifications and procurement standards from catalogue",
      "Takeoff quantities synced from ESTICAD into BOQ and DSR estimates in AORMS",
    ],
    modules: ["ESTICAD", "Transmittals", "Spec catalogue", "BOQ / DSR"],
  },
  {
    id: "tender",
    label: "Tender & Appointment",
    outcomes: [
      "Tender packages, addenda, and sealed bid comparison",
      "Contractor register and award recommendation",
      "Architect-side BOQ and tender costing",
    ],
    modules: ["Tenders", "Contractors", "Estimation"],
  },
  {
    id: "ca",
    label: "Construction Administration",
    outcomes: [
      "RFIs, submittals, shop drawings, and site instructions in context",
      "Inspections, snags, and NCRs linked to the project",
      "Payment certificates and architect-side PO support",
    ],
    modules: ["Site coordination", "PMC schedule", "Invoices"],
  },
  {
    id: "handover",
    label: "Handover & Closeout",
    outcomes: [
      "Final issue sets and as-built document register",
      "Lessons learned captured for the office",
      "Project archive with retained financial and audit records",
    ],
    modules: ["Archive", "Lessons learned", "Reconciliation"],
  },
];

export const INDIA_DESK_TILES = [
  {
    tag: "Money",
    type: "blue" as const,
    metric: "₹1.23 Cr",
    detail: "Indian grouping, integer paise, financial year 1 Apr – 31 Mar.",
  },
  {
    tag: "GST",
    type: "teal" as const,
    metric: "3 systems",
    detail: "Not applicable · Composition 6% · Regular 18% with SAC 998321–998339.",
  },
  {
    tag: "Professional ID",
    type: "purple" as const,
    metric: "COA number",
    detail: "Mandatory firm Legal ID on proposals, invoices, and document footers.",
  },
  {
    tag: "Compliance",
    type: "gray" as const,
    metric: "Versioned rules",
    detail: "State and district rule sets; deterministic development-control calculations.",
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
