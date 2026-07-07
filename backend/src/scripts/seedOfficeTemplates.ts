import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { officeTemplates } from "../db/schema.js";

/**
 * Standard office document templates for an Indian architecture practice —
 * letters, COA fee proposals and contracts/agreements. Seeded idempotently
 * (by kind + title) so they appear in the "Start from template" pickers and the
 * Documents template library. Placeholders in [square brackets] are filled in by
 * the author. Every letter/contract ends with a signature block.
 */

const SIGN_OFF = `Yours faithfully,\n\nFor [Firm Name]\n\n\n[Name]\n[Designation]\n[Firm Name] · [Address]\n[Phone] · [Email]`;

interface Tpl {
  title: string;
  tags: string;
  body: string;
}

// ── Letters ───────────────────────────────────────────────────────────────────
const LETTER_TEMPLATES: readonly Tpl[] = [
  {
    title: "Architect's Appointment — Acceptance",
    tags: "appointment,engagement",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Acceptance of appointment as Architect for "[Project Name]" ([Project Ref])\n\nDear [Salutation],\n\nWe thank you for appointing our firm as Architects for the above project. We are pleased to accept the appointment and confirm that our scope of services, fee and stage-wise deliverables are as set out in our fee proposal dated [Proposal Date], which forms part of this engagement.\n\nWe will commence work on receipt of the site details, survey and the advance as per the agreed schedule. All drawings and documents issued by us are for the referenced project only and remain our intellectual property until full settlement of fees.\n\nWe look forward to a productive association and to delivering a design that meets your requirements.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Fee Proposal — Covering Letter",
    tags: "fees,proposal,coa",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Professional fee proposal for "[Project Name]"\n\nDear [Salutation],\n\nFurther to our discussion, we are pleased to submit our proposal for architectural services for the above project. Our fee is [Fee Amount / Percentage] of the estimated cost of works, billed stage-wise in line with the Council of Architecture Conditions of Engagement and Scale of Charges.\n\nThe enclosed proposal sets out the scope of services, the stage-wise deliverables, the payment schedule and the exclusions. Statutory fees, consultant fees, printing and travel beyond [City] are reimbursable at actuals.\n\nThis proposal is valid for [Validity] days from the date above. We would be glad to clarify any point at your convenience.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Drawing / Document Transmittal",
    tags: "transmittal,drawings",
    body:
      `[Date]\n\nTo,\n[Recipient Name]\n[Recipient Address]\n\nSubject: Transmittal of drawings — "[Project Name]" ([Project Ref])\n\nDear [Salutation],\n\nPlease find transmitted herewith the following documents for your [action / record / approval]:\n\n  1. [Drawing No.] — [Title] — Rev. [Rev] — [Copies]\n  2. [Drawing No.] — [Title] — Rev. [Rev] — [Copies]\n  3. [Drawing No.] — [Title] — Rev. [Rev] — [Copies]\n\nKindly acknowledge receipt. Any discrepancy is to be intimated within [N] days, failing which the drawings will be taken as accepted for the stated purpose.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Request for Information (RFI) to Client",
    tags: "rfi,clarification",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Request for information / decision — "[Project Name]"\n\nDear [Salutation],\n\nTo proceed with the [stage] without delay, we require your decision / information on the following:\n\n  1. [Query 1]\n  2. [Query 2]\n  3. [Query 3]\n\nAs these items affect the design and the programme, we request your response by [Required-by Date]. Pending your decision, the affected work will be held, and any consequent delay or revision will be to your account.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Consultant Appointment (Structural / MEP)",
    tags: "consultant,appointment",
    body:
      `[Date]\n\nTo,\n[Consultant Name]\n[Consultant Address]\n\nSubject: Appointment as [Discipline] Consultant for "[Project Name]"\n\nDear [Salutation],\n\nWe are pleased to appoint your firm as [Discipline] Consultant for the above project. Your scope covers [scope summary], coordinated with our architectural drawings, with deliverables and a programme as discussed.\n\nYour fee is agreed at [Fee] payable stage-wise against certified deliverables. All designs must comply with the National Building Code, relevant IS codes and the local byelaws, and are to be issued good-for-construction only after our coordination check.\n\nKindly confirm your acceptance so that we may share the base information to commence.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Site Instruction to Contractor",
    tags: "site,instruction,contractor",
    body:
      `[Date]\n\nTo,\n[Contractor Name]\n[Contractor Address]\n\nSubject: Site Instruction No. [SI No.] — "[Project Name]"\n\nDear [Salutation],\n\nYou are hereby instructed to carry out the following at site with immediate effect:\n\n  [Instruction / description of work]\n\nThe work is to be executed as per the referenced drawings and the approved specification, to the satisfaction of the Architect. Any cost or time implication, if applicable, is to be intimated in writing within [N] days for the Client's decision before proceeding; otherwise the instruction is deemed to carry no extra.\n\nPlease acknowledge and confirm compliance.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Notice of Delay / Extension of Time",
    tags: "delay,eot",
    body:
      `[Date]\n\nTo,\n[Recipient Name]\n[Recipient Address]\n\nSubject: Delay and request for extension of time — "[Project Name]"\n\nDear [Salutation],\n\nWe wish to place on record that the progress of [work / approval / decision] has been affected by [cause of delay], which is beyond our control. As a consequence, the programme is impacted by approximately [duration].\n\nAccordingly, we request a corresponding extension of time to [revised date] and reserve our position on any cost consequence. We remain committed to mitigating the impact and request your support in resolving [dependency] at the earliest.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Payment Reminder — Outstanding Fees",
    tags: "fees,payment,reminder",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Outstanding professional fees — "[Project Name]"\n\nDear [Salutation],\n\nWe wish to bring to your kind notice that our invoice no. [Invoice No.] dated [Invoice Date] for [Amount] towards the [stage] remains outstanding, now overdue by [days] days.\n\nWe request you to kindly arrange settlement within [N] days. Continued services and issue of subsequent drawings are subject to fees being current, as per our terms of engagement. Please treat this as a gentle reminder and ignore if payment is already in process.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Practical Completion — Handover",
    tags: "completion,handover",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Practical completion and handover — "[Project Name]"\n\nDear [Salutation],\n\nWe are pleased to inform you that the works for the above project have reached practical completion as on [Completion Date]. We hereby hand over the project to you along with the following:\n\n  1. As-built drawings\n  2. Warranties and guarantees (as applicable)\n  3. Operation & maintenance information\n\nThe defects liability period, if any, shall run for [period] from the date above. It has been a pleasure working with you, and we remain available for any assistance going forward.\n\n` +
      SIGN_OFF,
  },
  {
    title: "No Objection Certificate (NOC)",
    tags: "noc,statutory",
    body:
      `[Date]\n\nTo,\n[Authority / Recipient Name]\n[Address]\n\nSubject: No Objection Certificate for "[Project Name]" ([Project Ref])\n\nDear Sir / Madam,\n\nThis is to certify that we, [Firm Name], the Architects for the above project situated at [Site Address], have no objection to [purpose of NOC — e.g. the sanction / connection / occupancy] in respect of the said project.\n\nThe drawings submitted are in accordance with the applicable byelaws and the sanctioned plan to the best of our knowledge. This certificate is issued for the specific purpose stated above.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Meeting Notice",
    tags: "meeting,notice",
    body:
      `[Date]\n\nTo,\n[Recipients]\n\nSubject: Notice of meeting — "[Project Name]"\n\nDear All,\n\nA [coordination / review / site] meeting for the above project is scheduled as below. Your presence is requested.\n\n  Date & time : [Date, Time]\n  Venue       : [Venue / Video link]\n  Agenda      : [Agenda points]\n\nKindly come prepared with the relevant drawings and status of your action items. Please confirm your attendance.\n\n` +
      SIGN_OFF,
  },
  {
    title: "Design Revision — Acknowledgement",
    tags: "revision,change",
    body:
      `[Date]\n\nTo,\n[Client Name]\n[Client Address]\n\nSubject: Acknowledgement of revision request — "[Project Name]"\n\nDear [Salutation],\n\nWe acknowledge your request dated [Request Date] for the following change: [description of revision].\n\nPlease note this is a client-driven change to the [approved] design. We will incorporate it and issue revised drawings by [date]. As it falls outside the current scope/stage, it will carry a revision fee of [amount] and a programme impact of [duration], for your confirmation before we proceed.\n\n` +
      SIGN_OFF,
  },
];

// ── COA fee proposals (Council of Architecture — Scale of Charges) ────────────
const COA_STAGES =
  `Stage-wise fee (as % of the total professional fee, per CoA Conditions of Engagement):\n` +
  `  I    Concept design & feasibility ............. 10%\n` +
  `  II   Preliminary / sketch design & estimate .... 20%\n` +
  `  III  Drawings for statutory approvals .......... 15%\n` +
  `  IV   Working drawings & tender documents ....... 25%\n` +
  `  V    Appointment of contractor / tender action .. 5%\n` +
  `  VI   Construction stage & completion ........... 25%\n` +
  `  Total ......................................... 100%\n\n` +
  `Payment: each stage is invoiced on submission of that stage's deliverables. An advance of\n` +
  `[Advance]% is payable on appointment and adjusted against the final stage.`;

const COA_TEMPLATES: readonly Tpl[] = [
  {
    title: "COA Fee Proposal — Comprehensive Architectural Services",
    tags: "coa,fees,comprehensive",
    body:
      `Fee proposal — comprehensive architectural services\nProject: [Project Name]  ·  Client: [Client Name]  ·  Date: [Date]\n\nScope of services (CoA comprehensive scope): taking the client's brief; site appraisal; concept and preliminary design; drawings for statutory approvals; working drawings, details and specifications; tender documents and evaluation; and periodic site visits during construction to interpret the design.\n\nFee: [Fee %] of the total cost of works (subject to the CoA minimum for the work category), exclusive of GST. Estimated cost of works: ₹[Cost]. Indicative fee: ₹[Fee Amount].\n\n${COA_STAGES}\n\nReimbursables (at actuals): statutory / sanction fees, structural & services consultants, surveys and soil investigation, printing, models and travel beyond [City]. Exclusions: [exclusions].\n\nValidity: [Validity] days. This proposal follows the Council of Architecture's Conditions of Engagement and Scale of Charges.\n\n` +
      SIGN_OFF,
  },
  {
    title: "COA Fee Proposal — Individual Residence",
    tags: "coa,fees,residential",
    body:
      `Fee proposal — architectural services for an individual residence\nProject: [Project Name]  ·  Client: [Client Name]  ·  Date: [Date]\n\nScope: brief and site study; concept & preliminary design; approval drawings; working drawings, joinery and services coordination; and site visits during construction. Interior/landscape design is a separate scope if required.\n\nFee: [Fee %] of the cost of works (not below the CoA minimum for individual residential work), exclusive of GST. Estimated cost of works: ₹[Cost]. Indicative fee: ₹[Fee Amount].\n\n${COA_STAGES}\n\nReimbursables at actuals; consultant fees (structural/MEP) billed separately. Validity: [Validity] days. Per the Council of Architecture Scale of Charges.\n\n` +
      SIGN_OFF,
  },
  {
    title: "COA Fee Proposal — Partial Services (up to Approvals)",
    tags: "coa,fees,partial",
    body:
      `Fee proposal — partial architectural services (up to statutory approvals)\nProject: [Project Name]  ·  Client: [Client Name]  ·  Date: [Date]\n\nScope (Stages I–III only): concept design; preliminary design & estimate; and drawings for statutory approvals. Working drawings, tendering and construction-stage services are NOT included and may be taken up under a separate engagement.\n\nFee for Stages I–III: [Fee %] of the cost of works × 45% (the CoA share of Stages I–III), exclusive of GST. Estimated cost of works: ₹[Cost]. Indicative fee: ₹[Fee Amount].\n\nPayment: Stage I on appointment, Stage II on preliminary design, Stage III on submission of approval drawings. Reimbursables and statutory fees at actuals. Validity: [Validity] days. Per the CoA Scale of Charges.\n\n` +
      SIGN_OFF,
  },
  {
    title: "COA Fee Proposal — Interior Design",
    tags: "coa,fees,interior",
    body:
      `Fee proposal — interior design services\nProject: [Project Name]  ·  Client: [Client Name]  ·  Date: [Date]\n\nScope: requirement study; concept & mood boards; layout, furniture and detailing; material, finish and services selection; drawings & BOQ; and periodic site visits for interior execution.\n\nFee: [Fee %] of the cost of interior works (or ₹[Rate]/sq.ft on [Area] sq.ft), exclusive of GST. Indicative fee: ₹[Fee Amount].\n\nPayment: [Advance]% advance on appointment; balance stage-wise on concept, detailed drawings and completion. Reimbursables (printing, samples, travel) at actuals. Validity: [Validity] days.\n\n` +
      SIGN_OFF,
  },
];

// ── Standard contracts / agreements ───────────────────────────────────────────
const CONTRACT_TEMPLATES: readonly Tpl[] = [
  {
    title: "Client–Architect Agreement",
    tags: "agreement,client,coa",
    body:
      `ARCHITECT'S AGREEMENT\n\nThis Agreement is made on [Date] between [Client Name], residing / registered at [Client Address] (the "Client"), and [Firm Name], Architects, of [Address] (the "Architect").\n\n1. PROJECT. The Architect is engaged for "[Project Name]" at [Site Address].\n\n2. SCOPE OF SERVICES. Comprehensive architectural services per the Council of Architecture Conditions of Engagement — Stages I to VI (concept, preliminary, approvals, working drawings & tender, tender action, and construction-stage services), as detailed in the fee proposal dated [Proposal Date], which forms part of this Agreement.\n\n3. FEE. [Fee %] of the cost of works (not below the CoA minimum), exclusive of GST, payable stage-wise as set out in the fee proposal. An advance of [Advance]% is payable on signing.\n\n4. REIMBURSABLES. Statutory fees, consultant fees, surveys, printing, models and travel beyond [City] are reimbursed at actuals.\n\n5. CONSULTANTS. Structural, MEP and other specialist consultants are appointed by the [Client / Architect] and their fees are [borne by the Client / included].\n\n6. CLIENT'S OBLIGATIONS. The Client shall furnish the brief, site documents, title and survey, obtain statutory sanctions, and make timely decisions and payments.\n\n7. INTELLECTUAL PROPERTY. Copyright in all drawings and designs vests with the Architect; the Client has a licence to use them for this Project only, subject to full payment of fees.\n\n8. TERMINATION. Either party may terminate on [Notice] days' written notice; fees for work done up to the date of termination, plus reimbursables, shall be payable.\n\n9. DISPUTES. Disputes shall be settled amicably, failing which by arbitration under the Arbitration and Conciliation Act, 1996, seated at [City]. This Agreement is governed by the laws of India.\n\nSigned:\n\n_____________________            _____________________\nClient                           For [Firm Name] (Architect)`,
  },
  {
    title: "Consultant Appointment Agreement",
    tags: "agreement,consultant",
    body:
      `CONSULTANT APPOINTMENT AGREEMENT\n\nThis Agreement is made on [Date] between [Firm Name], Architects (the "Architect"/"Principal"), and [Consultant Name] of [Consultant Address] (the "Consultant"), for "[Project Name]".\n\n1. SERVICES. The Consultant shall provide [Discipline] consultancy — [scope summary] — coordinated with the architectural design and delivered per the agreed programme.\n\n2. STANDARD. All work shall comply with the National Building Code, relevant IS codes and local byelaws, and be issued good-for-construction only after the Architect's coordination check.\n\n3. FEE. ₹[Fee] (or [Fee %] of [basis]), exclusive of GST, payable stage-wise against certified deliverables.\n\n4. DELIVERABLES & PROGRAMME. As per Annexure A. Delays attributable to the Consultant may attract adjustment as mutually agreed.\n\n5. LIABILITY & INSURANCE. The Consultant is responsible for the adequacy of its own designs and shall hold professional indemnity cover of ₹[Amount].\n\n6. CONFIDENTIALITY. Project information shall be kept confidential and used only for this Project.\n\n7. TERMINATION & DISPUTES. Either party may terminate on [Notice] days' notice; disputes resolved by arbitration at [City] under the Arbitration and Conciliation Act, 1996. Governed by the laws of India.\n\nSigned:\n\n_____________________            _____________________\nFor [Firm Name]                  [Consultant Name]`,
  },
  {
    title: "Letter of Engagement (Short-form)",
    tags: "agreement,engagement,shortform",
    body:
      `LETTER OF ENGAGEMENT\n\n[Date]\n\nTo, [Client Name], [Client Address]\n\nDear [Salutation],\n\nThis letter confirms your engagement of [Firm Name] as Architects for "[Project Name]" at [Site Address], on the following terms:\n\n  • Scope: [comprehensive / partial] architectural services per the CoA Conditions of Engagement.\n  • Fee: [Fee %] of the cost of works (min. CoA), plus GST, billed stage-wise; advance [Advance]% on signing.\n  • Reimbursables: statutory, consultant, printing and travel at actuals.\n  • Copyright in the drawings remains with the Architect; a project-use licence passes on full payment.\n  • Either party may terminate on [Notice] days' notice, fees for work done being payable.\n\nKindly countersign a copy in acceptance. We look forward to working with you.\n\n` +
      SIGN_OFF +
      `\n\nAccepted:  _____________________  ([Client Name], Date)`,
  },
];

async function seedKind(db: DB, kind: string, templates: readonly Tpl[]): Promise<number> {
  const titles = templates.map((t) => t.title);
  const existing = await db
    .select({ title: officeTemplates.title })
    .from(officeTemplates)
    .where(and(eq(officeTemplates.kind, kind), inArray(officeTemplates.title, titles)));
  const have = new Set(existing.map((r) => r.title));
  const toInsert = templates.filter((t) => !have.has(t.title));
  if (toInsert.length === 0) return 0;
  await db.insert(officeTemplates).values(
    toInsert.map((t) => ({ kind, title: t.title, body: t.body, tags: t.tags })),
  );
  return toInsert.length;
}

/** Seed the standard office templates — letters, COA fee proposals, contracts. */
export async function seedOfficeTemplates(db: DB): Promise<void> {
  const letters = await seedKind(db, "LETTER", LETTER_TEMPLATES);
  const coa = await seedKind(db, "COA", COA_TEMPLATES);
  const contracts = await seedKind(db, "CONTRACT", CONTRACT_TEMPLATES);
  const total = letters + coa + contracts;
  if (total === 0) {
    console.log("✓ office templates already present (no change)");
  } else {
    console.log(`✓ seeded office templates — ${letters} letter(s), ${coa} COA proposal(s), ${contracts} contract(s)`);
  }
}
