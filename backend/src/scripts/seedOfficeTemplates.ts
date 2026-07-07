import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { officeTemplates } from "../db/schema.js";

/**
 * Standard office letter templates for an Indian architecture practice. Seeded
 * idempotently (by title, kind=LETTER) so they appear in the "Start from
 * template" picker on the Letters screen. Placeholders in [square brackets] are
 * filled in by the author. Signature block ends every letter.
 */

const SIGN_OFF = `Yours faithfully,\n\nFor [Firm Name]\n\n\n[Name]\n[Designation]\n[Firm Name] · [Address]\n[Phone] · [Email]`;

interface LetterTemplate {
  title: string;
  tags: string;
  body: string;
}

export const LETTER_TEMPLATES: readonly LetterTemplate[] = [
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
] as const;

/** Insert any standard LETTER templates that aren't already present (by title). */
export async function seedLetterTemplates(db: DB): Promise<void> {
  const titles = LETTER_TEMPLATES.map((t) => t.title);
  const existing = await db
    .select({ title: officeTemplates.title })
    .from(officeTemplates)
    .where(and(eq(officeTemplates.kind, "LETTER"), inArray(officeTemplates.title, titles)));
  const have = new Set(existing.map((r) => r.title));
  const toInsert = LETTER_TEMPLATES.filter((t) => !have.has(t.title));
  if (toInsert.length === 0) {
    console.log("✓ letter templates already present (no change)");
    return;
  }
  await db.insert(officeTemplates).values(
    toInsert.map((t) => ({ kind: "LETTER", title: t.title, body: t.body, tags: t.tags })),
  );
  console.log(`✓ seeded ${toInsert.length} letter template(s)`);
}
