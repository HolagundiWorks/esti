import { z } from "zod";

/**
 * LXOS Academy — SOP-as-theory, app-as-practical. The curriculum is
 * `docs/holagundi/SOP.md` condensed into teachable modules, one per SOP.
 * A module completes once both theory (read) and practical (done for real,
 * in this workspace) are satisfied. `signal: "AUTO"` means the backend can
 * detect the practical from an existing audit-logged action (see
 * `backend/src/modules/academy/router.ts` for the detection rule); `"SELF"`
 * means the person (or their lead) marks it done themselves — either because
 * nothing in the workflow is audit-logged, or the SOP describes a habit/
 * judgement call rather than a single recordable event.
 */

export const ACADEMY_PARTS = [
  { id: "A", title: "Business development & engagement" },
  { id: "B", title: "Design delivery" },
  { id: "C", title: "Site delivery (consultancy supervision)" },
  { id: "D", title: "Client & external collaboration" },
  { id: "E", title: "Finance & statutory compliance" },
  { id: "F", title: "People & knowledge" },
  { id: "G", title: "Governance & records" },
] as const;
export type AcademyPartId = (typeof ACADEMY_PARTS)[number]["id"];

export interface AcademyModule {
  code: string;
  part: AcademyPartId;
  title: string;
  theory: string;
  practical: string;
  signal: "AUTO" | "SELF";
}

export const ACADEMY_CURRICULUM: AcademyModule[] = [
  // Part A — Business development & engagement
  {
    code: "SOP-01",
    part: "A",
    title: "Lead capture and qualification",
    theory:
      "Every enquiry is captured within 24 hours and moved through New → Contacted → Assessment started → Awaiting review before it's Qualified or Dropped/Lost — never left informal.",
    practical: "Capture a real lead in the register with its source, contact details, and site.",
    signal: "AUTO",
  },
  {
    code: "SOP-02",
    part: "A",
    title: "Pre-project due diligence",
    theory:
      "Before quoting, capture Project DNA (budget mode, decision-makers, timeline criticality, revision tolerance) and run the feasibility check so the fee reflects a sanity-checked buildable area, not a guess.",
    practical: "Complete a project's DNA capture and run its feasibility computation.",
    signal: "SELF",
  },
  {
    code: "SOP-03",
    part: "A",
    title: "Fee proposal and engagement letter",
    theory:
      "Quote on the COA scale, per-sq.m rate, or lump sum; a below-minimum fee needs a recorded override reason. Move the proposal Draft → Internal review → Approved (principal sign-off) before it ever reaches the client, then Sent to client.",
    practical: "Move a real proposal to Sent to client.",
    signal: "AUTO",
  },
  {
    code: "SOP-04",
    part: "A",
    title: "Client approval and project activation",
    theory:
      "Record the client's Approved/Rejected/On hold decision, complete onboarding (billing details, signed agreement, ID proof), collect the advance, then activate once every gate check is green.",
    practical: "Activate a project through the Pipeline → Activation gate.",
    signal: "SELF",
  },
  // Part B — Design delivery
  {
    code: "SOP-05",
    part: "B",
    title: "Phase planning and project brief",
    theory:
      "Confirm the nine-phase delivery plan and its fee allocation, then complete the Project Info brief so the whole team works from one shared brief instead of tribal knowledge.",
    practical: "Complete a project's brief questionnaire.",
    signal: "SELF",
  },
  {
    code: "SOP-06",
    part: "B",
    title: "Task allocation and time attribution",
    theory:
      "Every task carries a Classification (billable/non-billable/...) and a Work type (design communication/development/technical production/construction support) — two separate dimensions that feed billing and ASPRF respectively.",
    practical: "Create a task with both classification and work type set.",
    signal: "AUTO",
  },
  {
    code: "SOP-07",
    part: "B",
    title: "Drawing register, numbering and transmittal control",
    theory:
      "Register every sheet before it leaves the office, increment revisions on the same row, mark it Reviewed before issue, then issue a numbered transmittal — never a loose email attachment.",
    practical: "Mark a drawing Reviewed before issuing it.",
    signal: "AUTO",
  },
  {
    code: "SOP-08",
    part: "B",
    title: "Client decision and revision management (CRIF)",
    theory:
      "Every change gets a category (Minor/Major/Critical) and a source (Client-driven/Internal error/Technical query/Scope change) — this is what lets you show a client why fees moved, months later.",
    practical: "Record a decision/revision with category and source.",
    signal: "AUTO",
  },
  {
    code: "SOP-09",
    part: "B",
    title: "Statutory approvals and permit tracking",
    theory:
      "Track every permit application (plan sanction, NOC, occupancy certificate) with submission date, authority and status — usually the longest-lead item on the timeline.",
    practical: "Register a permit application for a project.",
    signal: "AUTO",
  },
  {
    code: "SOP-10",
    part: "B",
    title: "Consultant coordination",
    theory:
      "Add specialist consultants to the directory with a scoped portal login so their RFIs, deliverables, and fee balance live with the project, not a side WhatsApp group.",
    practical: "Create a consultant engagement.",
    signal: "AUTO",
  },
  // Part C — Site delivery (consultancy supervision)
  {
    code: "SOP-11",
    part: "C",
    title: "Site visit cadence and inspections",
    theory:
      "Visit per the agreed cadence, log findings, and raise snags/site instructions with a clear date and recipient so there's never a dispute about what was instructed and when.",
    practical: "Log a site visit or inspection for a project.",
    signal: "SELF",
  },
  {
    code: "SOP-12",
    part: "C",
    title: "Contractor coordination and rating",
    theory:
      "Rate every contractor (quality/timeliness/safety) at milestones or completion — this becomes the firm's institutional memory for future recommendations.",
    practical: "Rate a contractor after a milestone.",
    signal: "AUTO",
  },
  // Part D — Client & external collaboration
  {
    code: "SOP-13",
    part: "D",
    title: "Client portal governance",
    theory:
      "Grant the client a scoped portal login; route everything they raise (change requests, feedback, meetings) into the revision ledger rather than answering informally outside the system.",
    practical: "Grant a client a portal login.",
    signal: "SELF",
  },
  {
    code: "SOP-14",
    part: "D",
    title: "Meeting minutes and action tracking",
    theory:
      "Record minutes against the project; where a minute implies a design change, cross-link it into the revision ledger — minutes are evidence, the ledger is the tracked commitment.",
    practical: "Record meeting minutes for a project.",
    signal: "SELF",
  },
  // Part E — Finance & statutory compliance
  {
    code: "SOP-15",
    part: "E",
    title: "GST invoicing",
    theory:
      "Confirm the milestone is actually complete before invoicing; the firm's GST system drives the tax automatically. Move Draft → Issue → Paid, and Cancel rather than delete an issued invoice.",
    practical: "Issue a real GST invoice.",
    signal: "AUTO",
  },
  {
    code: "SOP-16",
    part: "E",
    title: "TDS tracking",
    theory:
      "TDS (10% u/s 194J) is computed automatically per invoice; reconcile it against Form 26AS/AIS at year-end so nothing is missed at ITR filing time.",
    practical: "Review the TDS abstract for a filing period.",
    signal: "SELF",
  },
  {
    code: "SOP-17",
    part: "E",
    title: "Bank reconciliation",
    theory:
      "Upload the bank statement, review matched lines by reference and amount, then settle matched invoices — chase unmatched entries rather than letting them sit.",
    practical: "Settle a matched reconciliation batch.",
    signal: "SELF",
  },
  {
    code: "SOP-18",
    part: "E",
    title: "Periodic statutory filing abstracts",
    theory:
      "Pull the GST and TDS abstracts each cycle and hand them to the firm's CA — track the fixed due dates (TDS 7th, GSTR-1 11th, GSTR-3B 20th).",
    practical: "Export a GST or TDS filing abstract.",
    signal: "SELF",
  },
  {
    code: "SOP-19",
    part: "E",
    title: "Office expense and cash-book control",
    theory:
      "Every spend moves Draft → Submitted → Audited (or Rejected) → Closed; client revenue and expense rows never mix in the same ledger.",
    practical: "Submit an office expense or cash voucher.",
    signal: "AUTO",
  },
  {
    code: "SOP-20",
    part: "E",
    title: "Vendor and material rate tracking",
    theory:
      "Record every price point into a vendor's pricing history so rate trends are visible over time; raise a formal purchase order rather than a verbal understanding.",
    practical: "Raise a purchase order for a project.",
    signal: "AUTO",
  },
  // Part F — People and knowledge
  {
    code: "SOP-21",
    part: "F",
    title: "Attendance, leave and payroll",
    theory:
      "Leave moves Requested → Approved/Rejected; payslips generate against attendance and salary structure, with salary amounts visible only to roles with salary-view access.",
    practical: "Approve a leave request.",
    signal: "AUTO",
  },
  {
    code: "SOP-22",
    part: "F",
    title: "ASPRF performance review and recognition",
    theory:
      "Scores build automatically from six weighted components (Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%, opt-in Wellbeing 5%) — use the score, not gut feel, when granting recognition.",
    practical: "Review a team member's ASPRF score and grant recognition where earned.",
    signal: "SELF",
  },
  {
    code: "SOP-23",
    part: "F",
    title: "Lessons learned and specification reuse",
    theory:
      "Publish a lesson so it surfaces office-wide instead of staying buried in one project; maintain the specification catalogue as versioned sets so every project starts from proven choices.",
    practical: "Publish a lesson, or add a specification catalogue item.",
    signal: "SELF",
  },
  // Part G — Governance and records
  {
    code: "SOP-24",
    part: "G",
    title: "Role-based access control",
    theory:
      "Assign the internal staff level at hire (Owner/Partner/Senior/Associate/Viewer) or portal-only access to external parties, and revoke immediately on offboarding — don't wait for a cleanup pass.",
    practical: "Set a team member's role/access level.",
    signal: "SELF",
  },
  {
    code: "SOP-25",
    part: "G",
    title: "Document retention and project archival",
    theory:
      "Confirm the drawing register, approvals and final account are closed out before archiving — this keeps active views clean without deleting the record.",
    practical: "Move a completed project to archived.",
    signal: "SELF",
  },
  {
    code: "SOP-26",
    part: "G",
    title: "Professional conduct and conflict-of-interest checks",
    theory:
      "Confirm no other architect already holds a commission without written release (COA Regulations, 1989) before it becomes a project — do this at lead qualification, not after signing.",
    practical: "Convert a lead with the conflict-of-interest check confirmed.",
    signal: "AUTO",
  },
  {
    code: "SOP-27",
    part: "G",
    title: "Alerts and daily escalation",
    theory:
      "Start the day on Studio Intelligence; treat a critical glyph as same-day, a watch/friction glyph as this-week — don't let items sit in the digest unactioned past a week.",
    practical: "Clear an item from the alerts digest.",
    signal: "SELF",
  },
];

export const AcademyMarkTheoryRead = z.object({ sopCode: z.string().min(1) });
export type AcademyMarkTheoryRead = z.infer<typeof AcademyMarkTheoryRead>;

export const AcademyAttestPractical = z.object({
  sopCode: z.string().min(1),
  note: z.string().max(1000).optional(),
});
export type AcademyAttestPractical = z.infer<typeof AcademyAttestPractical>;

export interface AcademyModuleProgress {
  sopCode: string;
  theoryReadAt: string | null;
  practicalSource: "AUTO" | "SELF" | null;
  practicalAt: string | null;
  practicalNote: string | null;
  completedAt: string | null;
}
