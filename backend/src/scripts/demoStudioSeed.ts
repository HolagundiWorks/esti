/**
 * Studio Intelligence demo payloads — team roster, leads, today glance,
 * phase-linked billing, and office activity. Consumed by seedDemo.ts.
 */
import { GstSystem, computeGst } from "@esti/contracts";
import { count, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  activities,
  approvals,
  attendance,
  estimateItems,
  estimates,
  firm,
  invoices,
  leads,
  measurementBooks,
  measurementRows,
  moms,
  phases,
  projectOffices,
  rateBooks,
  rewardPoints,
  siteVisits,
  tasks,
  teamMembers,
  users,
} from "../db/schema.js";
import { nextRef } from "../lib/numbering.js";

export const DEMO_STUDIO_FIRM = {
  companyName: "Studio Sharma & Associates",
  architectName: "Ar. Vihaan Sharma",
  city: "Bengaluru",
  state: "Karnataka",
  gstin: "29AABCS1234A1Z5",
  pan: "AABCS1234A",
  email: "studio@demo.aorms.in",
  phone1: "+91 80 4710 2200",
  addressLine1: "14, 100 Feet Road, Indiranagar",
  pincode: "560038",
  coaRegNo: "CA/2018/88421",
} as const;

export const DEMO_TEAM = [
  { email: "principal@demo.aorms.in", name: "Vihaan Sharma", role: "Principal Architect", salary: 2_50_000_00, joined: -1500 },
  { email: "lead@demo.aorms.in", name: "Ananya Iyer", role: "Design Lead", salary: 1_35_000_00, joined: -820 },
  { email: "site@demo.aorms.in", name: "Rahul Menon", role: "Site Architect", salary: 1_10_000_00, joined: -540 },
  { email: "junior@demo.aorms.in", name: "Kavya Nair", role: "Junior Architect", salary: 65_000_00, joined: -210 },
  { email: "accounts@demo.aorms.in", name: "Deepa Krishnan", role: "Studio Manager", salary: 85_000_00, joined: -400 },
] as const;

export const DEMO_LEADS = [
  { clientName: "Rohit & Meera Kapoor", leadSource: "Referral", projectType: "Residential Architecture", siteLocation: "Sarjapur Road", city: "Bengaluru", status: "NEW", notes: "4BHK villa enquiry — referred by Sharma Residences." },
  { clientName: "Orchid Heights Developers", leadSource: "Website", projectType: "Commercial Architecture", siteLocation: "Whitefield", city: "Bengaluru", status: "CONTACTED", notes: "12-floor commercial podium + retail — wants fee benchmark." },
  { clientName: "Dr. Lakshmi Prasad", leadSource: "Walk-in", projectType: "Institutional Architecture", siteLocation: "Jayanagar", city: "Bengaluru", status: "QUALIFIED", notes: "Dental clinic fit-out; budget ₹85L; decision in 2 weeks." },
  { clientName: "Coastal Living LLP", leadSource: "Instagram", projectType: "Residential Architecture", siteLocation: "Mangaluru beachfront", city: "Mangaluru", status: "PROPOSAL_SENT", notes: "Weekend home — CRZ sensitivity flagged early." },
  { clientName: "TechPark Interiors", leadSource: "LinkedIn", projectType: "Interior Design", siteLocation: "Electronic City", city: "Bengaluru", status: "NEGOTIATION", notes: "3-floor HQ interior — competing with two firms." },
  { clientName: "Heritage Trust Mysuru", leadSource: "Referral", projectType: "Institutional Architecture", siteLocation: "Mysuru Palace vicinity", city: "Mysuru", status: "QUALIFIED", notes: "Adaptive reuse of colonial warehouse — ASI coordination likely." },
  { clientName: "Aarav Builders", leadSource: "Tender", projectType: "Residential Architecture", siteLocation: "Hebbal", city: "Bengaluru", status: "CONTACTED", notes: "Developer seeking design partner for 48-unit apartment." },
  { clientName: "Sunita & Vikram Desai", leadSource: "Referral", projectType: "Residential Architecture", siteLocation: "Belagavi", city: "Belagavi", status: "WON", notes: "Converted — see Desai Villa project." },
  { clientName: "Metro Retail Group", leadSource: "Cold call", projectType: "Commercial Architecture", siteLocation: "MG Road", city: "Bengaluru", status: "LOST", notes: "Lost on fee — went with larger firm." },
  { clientName: "Green Campus Initiative", leadSource: "Website", projectType: "Institutional Architecture", siteLocation: "Devanahalli", city: "Bengaluru", status: "NEW", notes: "Net-zero school campus — RFP expected Q3." },
] as const;

export function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function upsertDemoFirm(db: DB): Promise<void> {
  const [row] = await db.select({ id: firm.id }).from(firm).limit(1);
  if (row) {
    await db.update(firm).set({ ...DEMO_STUDIO_FIRM }).where(eq(firm.id, row.id));
  } else {
    await db.insert(firm).values({ ...DEMO_STUDIO_FIRM });
  }
}

/** Extra team logins beyond the principal (idempotent). */
export async function seedDemoTeamRoster(
  db: DB,
  principalId: string,
  pwHash: string,
): Promise<Map<string, string>> {
  const nameToMemberId = new Map<string, string>();

  for (const person of DEMO_TEAM) {
    let userId = principalId;
    if (person.email !== "principal@demo.aorms.in") {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, person.email));
      if (existing) {
        await db.update(users).set({ passwordHash: pwHash, isDemo: true, fullName: person.name }).where(eq(users.id, existing.id));
        userId = existing.id;
      } else {
        const role = person.email === "accounts@demo.aorms.in" ? "HR_MANAGER" : "ASSOCIATE";
        const [created] = await db.insert(users).values({
          email: person.email,
          fullName: person.name,
          role,
          passwordHash: pwHash,
          isDemo: true,
        }).returning();
        userId = created!.id;
      }
    }

    const [member] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.email, person.email));
    if (member) {
      await db.update(teamMembers).set({
        name: person.name,
        role: person.role,
        userId,
        monthlySalaryPaise: person.salary,
        dateJoined: dayOffset(person.joined),
        active: true,
      }).where(eq(teamMembers.id, member.id));
      nameToMemberId.set(person.name, member.id);
    } else {
      const [inserted] = await db.insert(teamMembers).values({
        name: person.name,
        role: person.role,
        employmentType: "FULL_TIME",
        email: person.email,
        userId,
        monthlySalaryPaise: person.salary,
        dateJoined: dayOffset(person.joined),
        active: true,
      }).returning();
      nameToMemberId.set(person.name, inserted!.id);
    }
  }

  return nameToMemberId;
}

export async function linkPhasesAndBilling(
  db: DB,
  projectId: string,
  clientId: string,
  contractValuePaise: number,
  phaseProgress: number,
  projectIndex: number,
  gstType: GstSystem,
  interState: boolean,
): Promise<string | null> {
  const phaseRows = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(phases.sortOrder);

  const current = phaseRows[phaseProgress] ?? phaseRows.at(-1);
  if (current) {
    await db.update(projectOffices).set({ currentPhaseId: current.id }).where(eq(projectOffices.id, projectId));
  }

  // Bill completed phases (PAID, phase-linked).
  for (let si = 0; si < phaseProgress && si < phaseRows.length; si++) {
    const ph = phaseRows[si]!;
    const taxable = Math.round((contractValuePaise * ph.billingPct) / 100);
    if (taxable <= 0) continue;
    const g = computeGst(gstType, taxable, false);
    const { ref: invRef } = await nextRef(db, "invoice", "INV");
    await db.insert(invoices).values({
      ref: invRef,
      projectId,
      phaseId: ph.id,
      clientId,
      status: "PAID",
      gstSystem: gstType,
      documentKind: g.documentKind,
      sac: gstType === GstSystem.REGULAR ? "998322" : null,
      interState,
      tdsApplicable: false,
      taxablePaise: g.taxable,
      cgstPaise: interState ? 0 : g.cgst,
      sgstPaise: interState ? 0 : g.sgst,
      igstPaise: interState ? g.igst : 0,
      gstTotalPaise: g.gstTotal,
      compositionLevyPaise: g.compositionLevy,
      tdsPaise: 0,
      grandTotalPaise: g.grandTotal,
      netReceivablePaise: g.grandTotal,
      dateInvoice: dayOffset(-120 + si * 25),
    });
  }

  // Current phase is ready-to-bill (no invoice) — drives Studio KPIs.

  // Overdue receivables on showcase projects (Sharma, Verde, Patel).
  if ([0, 2, 4].includes(projectIndex)) {
    const taxable = Math.round(contractValuePaise * 0.025);
    const g = computeGst(gstType, taxable, false);
    const { ref: invRef } = await nextRef(db, "invoice", "INV");
    await db.insert(invoices).values({
      ref: invRef,
      projectId,
      clientId,
      status: "ISSUED",
      gstSystem: gstType,
      documentKind: g.documentKind,
      sac: gstType === GstSystem.REGULAR ? "998322" : null,
      interState,
      tdsApplicable: false,
      taxablePaise: g.taxable,
      cgstPaise: interState ? 0 : g.cgst,
      sgstPaise: interState ? 0 : g.sgst,
      igstPaise: interState ? g.igst : 0,
      gstTotalPaise: g.gstTotal,
      compositionLevyPaise: g.compositionLevy,
      tdsPaise: 0,
      grandTotalPaise: g.grandTotal,
      netReceivablePaise: g.grandTotal,
      dateInvoice: dayOffset(-42 - projectIndex * 3),
    });
  } else if (projectIndex < 8 && projectIndex !== 7) {
    const taxable = Math.round(contractValuePaise * 0.02);
    const g = computeGst(gstType, taxable, false);
    const { ref: invRef } = await nextRef(db, "invoice", "INV");
    await db.insert(invoices).values({
      ref: invRef,
      projectId,
      clientId,
      status: "ISSUED",
      gstSystem: gstType,
      documentKind: g.documentKind,
      sac: gstType === GstSystem.REGULAR ? "998322" : null,
      interState,
      tdsApplicable: false,
      taxablePaise: g.taxable,
      cgstPaise: interState ? 0 : g.cgst,
      sgstPaise: interState ? 0 : g.sgst,
      igstPaise: interState ? g.igst : 0,
      gstTotalPaise: g.gstTotal,
      compositionLevyPaise: g.compositionLevy,
      tdsPaise: 0,
      grandTotalPaise: g.grandTotal,
      netReceivablePaise: g.grandTotal,
      dateInvoice: dayOffset(-12),
    });
  }

  return current?.id ?? null;
}

export async function seedStudioGlanceAndLeads(
  db: DB,
  principalId: string,
  projectIds: string[],
  memberIds: Map<string, string>,
): Promise<void> {
  const sharmaId = projectIds[0];
  const verdeId = projectIds[2];

  if (sharmaId) {
    const momCount = (await db.select({ n: count() }).from(moms).where(eq(moms.projectId, sharmaId)))[0]?.n ?? 0;
    if (momCount === 0) {
      const { ref: momRef } = await nextRef(db, "mom", "MOM");
      await db.insert(moms).values({
        ref: momRef,
        projectId: sharmaId,
        title: "Weekly site coordination — Sharma Villa",
        meetingDate: dayOffset(0),
        venue: "Site office, Whitefield",
        attendees: "Vihaan Sharma, Rahul Menon, Vinayaka Civil site engineer",
        minutes: "RCC slab pour scheduled Thursday. Client requested sample board for external stone.",
        status: "FINAL",
      });
      const { ref: momRef2 } = await nextRef(db, "mom", "MOM");
      await db.insert(moms).values({
        ref: momRef2,
        projectId: sharmaId,
        title: "Structural coordination — column schedule",
        meetingDate: dayOffset(2),
        venue: "Studio — Teams",
        attendees: "Ananya Iyer, Prakash Iyer (structural)",
        minutes: "Column schedule R2 issued. Pending client sign-off on grid shift.",
        status: "DRAFT",
      });
    }

    const visitCount = (await db.select({ n: count() }).from(siteVisits).where(eq(siteVisits.projectId, sharmaId)))[0]?.n ?? 0;
    if (visitCount === 0) {
      await db.insert(siteVisits).values([
        { projectId: sharmaId, plannedDate: dayOffset(0), status: "CONFIRMED", notes: "Slab reinforcement inspection", createdById: principalId },
        { projectId: sharmaId, plannedDate: dayOffset(3), status: "PLANNED", notes: "Facade mock-up review", createdById: principalId },
      ]);
    }
  }

  if (verdeId) {
    const verdeVisits = (await db.select({ n: count() }).from(siteVisits).where(eq(siteVisits.projectId, verdeId)))[0]?.n ?? 0;
    if (verdeVisits === 0) {
      await db.insert(siteVisits).values({
        projectId: verdeId,
        plannedDate: dayOffset(0),
        status: "PLANNED",
        notes: "MEP coordination walk-through",
        createdById: principalId,
      });
    }
  }

  const leadCount = (await db.select({ n: count() }).from(leads))[0]?.n ?? 0;
  if (leadCount === 0) {
    for (const lead of DEMO_LEADS) {
      const { ref } = await nextRef(db, "lead", "LD");
      await db.insert(leads).values({
        ref,
        clientName: lead.clientName,
        leadSource: lead.leadSource,
        projectType: lead.projectType,
        siteLocation: lead.siteLocation,
        city: lead.city,
        status: lead.status,
        notes: lead.notes,
        assignedToId: principalId,
        createdById: principalId,
      });
    }
  }

  const today = dayOffset(0);
  for (const [, memberId] of memberIds) {
    await db
      .insert(attendance)
      .values({
        teamMemberId: memberId,
        attendanceDate: today,
        status: "PRESENT",
        markedById: principalId,
      })
      .onConflictDoNothing({
        target: [attendance.teamMemberId, attendance.attendanceDate],
      });
  }

  const principalMemberId = memberIds.get("Vihaan Sharma");
  const ananyaId = memberIds.get("Ananya Iyer");
  const rahulId = memberIds.get("Rahul Menon");
  if (principalMemberId) {
    const rewardCount = (
      await db
        .select({ n: count() })
        .from(rewardPoints)
        .where(eq(rewardPoints.teamMemberId, principalMemberId))
    )[0]?.n ?? 0;
    if (rewardCount === 0) {
      const rewards = [
        { teamMemberId: principalMemberId, points: 15, reason: "Client presentation — Verde facade approval", awardType: "CLIENT_IMPACT" },
      ];
      if (ananyaId) rewards.push({ teamMemberId: ananyaId, points: 10, reason: "GFC set delivered ahead of milestone", awardType: "RELIABILITY" });
      if (rahulId) rewards.push({ teamMemberId: rahulId, points: 8, reason: "Site snag closure within 48h", awardType: "QUALITY" });
      await db.insert(rewardPoints).values(
        rewards.map((r) => ({ ...r, createdById: principalId })),
      );
    }
  }

  const activityCount = (await db.select({ n: count() }).from(activities))[0]?.n ?? 0;
  if (activityCount < 4 && sharmaId) {
    await db.insert(activities).values([
      { projectId: sharmaId, objectType: "invoice", eventType: "issued", actorId: principalId, actorName: "Vihaan Sharma", visibility: "STAFF", summary: "Invoice INV issued — Sharma Villa milestone 3" },
      { projectId: sharmaId, objectType: "approval", eventType: "sent", actorId: principalId, actorName: "Vihaan Sharma", visibility: "STAFF", summary: "Schematic package sent to Sharma Residences for approval" },
      { projectId: verdeId ?? sharmaId, objectType: "task", eventType: "completed", actorName: "Ananya Iyer", visibility: "STAFF", summary: "GFC typical floor issued for Verde Commercial Block" },
      { projectId: sharmaId, objectType: "site_visit", eventType: "planned", actorName: "Rahul Menon", visibility: "STAFF", summary: "Site visit scheduled — slab reinforcement check (today)" },
      { projectId: projectIds[4] ?? sharmaId, objectType: "decision", eventType: "opened", actorName: "Vihaan Sharma", visibility: "STAFF", summary: "Critical decision opened — Patel HQ geotechnical pile foundation" },
    ]);
  }
}

/** Patch approvals on existing demo projects for stale / revision signals. */
export async function patchDemoApprovalSignals(db: DB, projectIds: string[], principalId: string): Promise<void> {
  if (projectIds.length < 3) return;
  const staleTargets = [projectIds[0]!, projectIds[2]!, projectIds[4]!];
  for (const [i, projectId] of staleTargets.entries()) {
    const existing = await db
      .select({ id: approvals.id, status: approvals.status })
      .from(approvals)
      .where(eq(approvals.projectId, projectId));
    const sent = existing[0];
    if (sent) {
      await db.update(approvals).set({
        status: "SENT",
        sentDate: dayOffset(-18 - i * 2),
        responseDate: null,
        remarks: null,
      }).where(eq(approvals.id, sent.id));
    }
    const hasRevisions = existing.some((a) => a.status === "REVISIONS");
    if (!hasRevisions) {
      await db.insert(approvals).values({
        projectId,
        entityType: "DRAWING_SET",
        title: "Facade revision — client comments",
        recipient: "Client",
        channel: "Client portal",
        status: "REVISIONS",
        sentDate: dayOffset(-9),
        remarks: "ACM panel colour and joint width to be revised.",
        createdById: principalId,
      });
    }
  }
}

/** Distribute open tasks across the team roster for Team Intelligence. */
export async function rebalanceDemoTaskAssignees(db: DB): Promise<void> {
  const roster = ["Vihaan Sharma", "Ananya Iyer", "Rahul Menon", "Kavya Nair", "Deepa Krishnan"];
  const openTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(ne(tasks.status, "DONE"))
    .limit(60);

  let i = 0;
  for (const t of openTasks) {
    const assignee = roster[i % roster.length]!;
    const memberRow = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.name, assignee))
      .limit(1);
    await db.update(tasks).set({
      assignee,
      assigneeId: memberRow[0]?.id ?? null,
      dueDate: i % 5 === 0 ? dayOffset(-2 - (i % 3)) : dayOffset(i % 7),
      interventionRequired: i % 11 === 0,
    }).where(eq(tasks.id, t.id));
    i++;
  }
}

/**
 * Browser-takeoff demo payload (P8): a calibrated-sheet measurement book with
 * brickwork rows, plus an estimate whose items use matching units, so the
 * "Send to estimate" flow is demoable end to end without hand-built fixtures.
 */
export async function seedDemoTakeoff(db: DB, projectId: string): Promise<void> {
  const [existing] = await db
    .select({ id: measurementBooks.id })
    .from(measurementBooks)
    .where(eq(measurementBooks.projectId, projectId))
    .limit(1);
  if (existing) return;

  const [book] = await db
    .insert(measurementBooks)
    .values({ projectId, title: "Ground floor — brickwork takeoff" })
    .returning();

  // Quantities as PlanReaderPanel would derive them from a calibrated sheet.
  const rows = [
    { particulars: "External wall — north", lengthMm: 8400, breadthMm: 3000, quantity: 25.2 },
    { particulars: "External wall — east", lengthMm: 6200, breadthMm: 3000, quantity: 18.6 },
    { particulars: "Internal partition — hall/kitchen", lengthMm: 4100, breadthMm: 3000, quantity: 12.3 },
  ];
  await db.insert(measurementRows).values(
    rows.map((r, i) => ({
      bookId: book!.id,
      particulars: r.particulars,
      lengthMm: r.lengthMm,
      breadthMm: r.breadthMm,
      quantity: r.quantity,
      uom: "SQM",
      derivation: "AUTO",
      sortOrder: (i + 1) * 10,
    })),
  );

  const [rateBook] = await db
    .insert(rateBooks)
    .values({ name: "Demo rate book (CPWD-style)", versionLabel: "2026-27" })
    .returning();
  const { ref } = await nextRef(db, "estimate", "EST");
  const [estimate] = await db
    .insert(estimates)
    .values({
      projectId,
      rateBookId: rateBook!.id,
      ref,
      title: "Ground floor — civil works",
    })
    .returning();

  // sqm item matches the book's SQM rows; the cum item is deliberately a
  // different measure so the unit guard is visible in the demo.
  await db.insert(estimateItems).values([
    {
      estimateId: estimate!.id,
      description: "Brickwork in CM 1:6 with 230mm thick wall",
      unit: "sqm",
      ratePaise: 1_850_00,
      sortOrder: 10,
    },
    {
      estimateId: estimate!.id,
      description: "RCC M25 for columns and beams",
      unit: "cum",
      ratePaise: 7_400_00,
      sortOrder: 20,
    },
  ]);
}

// ── Referential-integrity repair after a replica-mode wipe ──────────────────

type ForeignKey = {
  child_table: string;
  child_col: string;
  parent_table: string;
  parent_col: string;
  ondelete: string;
};

/** Every single-column FK in `public`, read from the catalog. */
async function foreignKeys(db: DB): Promise<ForeignKey[]> {
  const rows = await db.execute<ForeignKey>(sql`
    SELECT c.relname::text            AS child_table,
           ca.attname::text           AS child_col,
           p.relname::text            AS parent_table,
           pa.attname::text           AS parent_col,
           con.confdeltype::text      AS ondelete
      FROM pg_constraint con
      JOIN pg_class     c  ON c.oid = con.conrelid
      JOIN pg_class     p  ON p.oid = con.confrelid
      JOIN pg_namespace n  ON n.oid = c.relnamespace
      JOIN pg_attribute ca ON ca.attrelid = con.conrelid  AND ca.attnum = con.conkey[1]
      JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
     WHERE con.contype = 'f'
       AND n.nspname = 'public'
       AND array_length(con.conkey, 1) = 1   -- composite FKs: none in this schema
  `);
  return rows as unknown as ForeignKey[];
}

/** SQL predicate matching child rows whose parent no longer exists. */
function danglingPredicate(fk: ForeignKey): string {
  // Identifiers come from the catalog, never user input, and are quoted.
  const child = `"${fk.child_table}"."${fk.child_col}"`;
  return `${child} IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "${fk.parent_table}" WHERE "${fk.parent_table}"."${fk.parent_col}" = ${child}
  )`;
}

/**
 * Emulate the ON DELETE behaviour that a replica-mode wipe skipped.
 *
 * For each FK, find child rows whose parent is gone and apply what the database
 * would have done:
 *   - CASCADE / NO ACTION / RESTRICT -> delete the child. The parent was
 *     removed deliberately, so the child is unreachable data.
 *   - SET NULL / SET DEFAULT         -> null the reference, keeping the row.
 *
 * Repeats until a pass changes nothing, because deleting a child strands its
 * own children in turn (project -> transmittal -> transmittal item). Reading
 * the graph from the catalog instead of hard-coding ~50 tables means new tables
 * and changed FK actions are handled without editing this function.
 *
 * MUST run while `session_replication_role = 'replica'`: with triggers on, the
 * first delete of a stranded parent is blocked by its own not-yet-stranded
 * children, so the sweep could never begin.
 *
 * Demo-seed only — a repair for a deliberate wipe, not something to point at
 * production data.
 */
export async function sweepDanglingReferences(db: DB): Promise<{ total: number; tables: number }> {
  const fks = await foreignKeys(db);
  const touched = new Set<string>();
  let total = 0;
  // Ample for this schema's depth; exits as soon as a pass is clean, and the
  // bound stops a pathological cycle spinning forever.
  for (let pass = 0; pass < 20; pass += 1) {
    let changedThisPass = 0;
    for (const fk of fks) {
      const statement =
        fk.ondelete === "n" || fk.ondelete === "d"
          ? `UPDATE "${fk.child_table}" SET "${fk.child_col}" = NULL WHERE ${danglingPredicate(fk)}`
          : `DELETE FROM "${fk.child_table}" WHERE ${danglingPredicate(fk)}`;
      const result = await db.execute(sql.raw(statement));
      const n = Number((result as unknown as { count?: number }).count ?? 0);
      if (n > 0) {
        changedThisPass += n;
        touched.add(fk.child_table);
      }
    }
    total += changedThisPass;
    if (changedThisPass === 0) break;
  }
  return { total, tables: touched.size };
}

/** Rows still pointing at a missing parent. Read-only; asserts the sweep held. */
export async function countDanglingReferences(db: DB): Promise<number> {
  const fks = await foreignKeys(db);
  let total = 0;
  for (const fk of fks) {
    const res = await db.execute<{ n: number }>(
      sql.raw(`SELECT count(*)::int AS n FROM "${fk.child_table}" WHERE ${danglingPredicate(fk)}`),
    );
    total += Number((res as unknown as { n: number }[])[0]?.n ?? 0);
  }
  return total;
}

export async function clearStudioDemoRows(db: DB, principalId: string): Promise<void> {
  const projectRows = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.createdById, principalId));
  const projectIds = projectRows.map((p) => p.id);
  if (projectIds.length > 0) {
    await db.delete(siteVisits).where(inArray(siteVisits.projectId, projectIds));
    await db.delete(moms).where(inArray(moms.projectId, projectIds));
    await db.delete(activities).where(inArray(activities.projectId, projectIds));
  }
  await db.delete(leads);
}
