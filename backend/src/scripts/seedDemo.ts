/**
 * Demo-seed: a fully populated, multi-persona evaluation workspace.
 *
 *   pnpm --filter @esti/backend seed:demo
 *   (or: podman exec esti-backend sh -c "cd /app/backend && pnpm seed:demo")
 *
 * Idempotent — if the demo principal already exists it does nothing. Creates
 * read-mostly demo logins (uploads + credential changes blocked) for several
 * office roles, plus clients, projects, phases, fees, invoices, permits,
 * staff, assignments, tasks and client-log entries so each persona has
 * something real to explore. NOT for production use.
 */
import { GstSystem, coaStagePlan, computeGst } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  assignments,
  clientLogs,
  clients,
  consultants,
  engagements,
  feeProposals,
  inspections,
  invoices,
  leaves,
  orgSettings,
  permits,
  phases,
  poItems,
  projectOffices,
  purchaseOrders,
  specItems,
  specSheets,
  tasks,
  teamMembers,
  transmittalItems,
  transmittals,
  approvals,
  users,
} from "../db/schema.js";
import { getFirm } from "../lib/firm.js";
import { getOrgSettings } from "../lib/settings.js";
import { nextRef } from "../lib/numbering.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

/** yyyy-mm-dd offset from today by N days (local). */
function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const demoProjectTitles = [
  "Sharma Villa — Whitefield",
  "Rao House — Mysuru",
  "Verde Commercial Block",
  "Kapoor Residence — Sarjapur",
];

async function ensureDemoConsultants() {
  const defs = [
    {
      name: "Prakash Iyer",
      discipline: "Structural",
      firm: "Iyer Structural Studio",
      email: "prakash@iyerstruct.in",
      phone: "+91 98450 55501",
    },
    {
      name: "Meera Menon",
      discipline: "MEP",
      firm: "Circuit & Flow Engineers",
      email: "meera@circuitflow.in",
      phone: "+91 98450 55502",
    },
    {
      name: "Naveen Das",
      discipline: "Landscape",
      firm: "Canopy Works",
      email: "naveen@canopyworks.in",
      phone: "+91 98450 55503",
    },
  ];
  const rows = [];
  for (const def of defs) {
    const [existing] = await db.select().from(consultants).where(eq(consultants.email, def.email)).limit(1);
    if (existing) {
      rows.push(existing);
      continue;
    }
    const [created] = await db.insert(consultants).values(def).returning();
    rows.push(created!);
  }
  return rows;
}

async function backfillProjectDemoRecords(projectId: string, projectRef: string, projectTitle: string, principalId: string, pi: number) {
  const consultantRows = await ensureDemoConsultants();

  const [engaged] = await db.select({ id: engagements.id }).from(engagements).where(eq(engagements.projectId, projectId)).limit(1);
  if (!engaged) {
    await db.insert(engagements).values([
      {
        projectId,
        consultantId: consultantRows[0]!.id,
        scope: "RCC structural design, GFC review and site clarifications",
        agreedFeePaise: 3_60_000_00,
        paidPaise: pi % 2 === 0 ? 1_20_000_00 : 0,
        status: "ENGAGED",
      },
      {
        projectId,
        consultantId: consultantRows[1]!.id,
        scope: "Electrical, plumbing and fire-fighting coordination",
        agreedFeePaise: 2_40_000_00,
        paidPaise: 0,
        status: pi === 3 ? "PROPOSED" : "ENGAGED",
      },
    ]);
  }

  const [specExists] = await db.select({ id: specSheets.id }).from(specSheets).where(eq(specSheets.projectId, projectId)).limit(1);
  if (!specExists) {
    const { ref: specRef } = await nextRef(db, "specsheet", "SPEC");
    const [spec] = await db
      .insert(specSheets)
      .values({ ref: specRef, projectId, title: "Interior material schedule" })
      .returning();
    await db.insert(specItems).values([
      {
        specSheetId: spec!.id,
        category: "Flooring",
        item: "Living / dining flooring",
        make: "Kajaria / equivalent",
        specification: "1200 x 600 vitrified tile, rectified edges",
        finish: "Warm grey matte",
        remarks: "Confirm final shade with client sample board",
        sortOrder: 1,
      },
      {
        specSheetId: spec!.id,
        category: "Joinery",
        item: "Wardrobe shutters",
        make: "Greenlam / Merino",
        specification: "BWR ply carcass with laminate finish",
        finish: "Oak texture with black recessed handle",
        remarks: "Mock-up in master bedroom before bulk execution",
        sortOrder: 2,
      },
    ]);
  }

  const [poExists] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.projectId, projectId)).limit(1);
  if (!poExists) {
    const { ref: poRef } = await nextRef(db, "purchaseorder", "PO");
    const [po] = await db
      .insert(purchaseOrders)
      .values({
        ref: poRef,
        projectId,
        vendor: pi % 2 === 0 ? "BuildMart Bengaluru" : "Studio Materials Co.",
        title: "Sample and site procurement",
        status: pi % 2 === 0 ? "ISSUED" : "DRAFT",
        datePo: dayOffset(-12 + pi),
        notes: "Demo PO for reviewing approval, procurement and cost tracking.",
        totalPaise: 2_85_000_00,
      })
      .returning();
    await db.insert(poItems).values([
      { poId: po!.id, description: "Vitrified tile sample batch", unit: "box", qty: 15, ratePaise: 12_000_00, amountPaise: 1_80_000_00, sortOrder: 1 },
      { poId: po!.id, description: "Laminate swatch boards", unit: "set", qty: 3, ratePaise: 35_000_00, amountPaise: 1_05_000_00, sortOrder: 2 },
    ]);
  }

  const [txExists] = await db.select({ id: transmittals.id }).from(transmittals).where(eq(transmittals.projectId, projectId)).limit(1);
  if (!txExists) {
    const { ref: txRef } = await nextRef(db, "transmittal", "TX");
    const [tx] = await db
      .insert(transmittals)
      .values({
        ref: txRef,
        projectId,
        recipient: projectTitle.includes("Kapoor") ? "Divya Kapoor" : "Demo client",
        purpose: "Issued for client review",
        channel: "Email",
        dateIssued: dayOffset(-5),
        notes: "Demo transmittal showing how drawing/document issue registers behave.",
        createdById: principalId,
      })
      .returning();
    await db.insert(transmittalItems).values([
      { transmittalId: tx!.id, drawingRef: `${projectRef}-A-101`, title: "Ground floor plan", rev: "R1", copies: 1 },
      { transmittalId: tx!.id, drawingRef: `${projectRef}-A-201`, title: "Front elevation", rev: "R0", copies: 1 },
    ]);
  }

  const [approvalExists] = await db.select({ id: approvals.id }).from(approvals).where(eq(approvals.projectId, projectId)).limit(1);
  if (!approvalExists) {
    await db.insert(approvals).values({
      projectId,
      entityType: "DRAWING_SET",
      title: "Schematic design package",
      recipient: projectTitle.includes("Kapoor") ? "Divya Kapoor" : "Demo client",
      channel: "Client portal",
      status: pi % 2 === 0 ? "SENT" : "DRAFT",
      sentDate: pi % 2 === 0 ? dayOffset(-6) : null,
      responseDate: pi === 0 ? dayOffset(-2) : null,
      remarks: pi === 0 ? "Approved with facade material comments." : "Awaiting client review.",
      createdById: principalId,
    });
  }

  const [inspectionExists] = await db.select({ id: inspections.id }).from(inspections).where(eq(inspections.projectId, projectId)).limit(1);
  if (!inspectionExists) {
    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({
      ref: insRef,
      projectId,
      dateVisit: dayOffset(-2 + pi),
      weather: "Clear",
      attendees: "Site supervisor, contractor, project lead",
      progress: pi % 2 === 0 ? "RCC slab reinforcement completed for review." : "Masonry and services chase marking in progress.",
      observations: "Site housekeeping acceptable; contractor to protect exposed starter bars.",
      instructions: "Submit bar bending schedule and pour card before next inspection.",
      nextVisit: dayOffset(5 + pi),
      inspectorName: "Rahul Nair",
    });
  }
}

async function backfillExistingDemo(principalId: string): Promise<void> {
  await ensureDemoConsultants();
  for (const [pi, title] of demoProjectTitles.entries()) {
    const [project] = await db
      .select({ id: projectOffices.id, ref: projectOffices.ref, title: projectOffices.title })
      .from(projectOffices)
      .where(eq(projectOffices.title, title))
      .limit(1);
    if (project) await backfillProjectDemoRecords(project.id, project.ref, project.title, principalId, pi);
  }
}

async function main(): Promise<void> {
  const principalEmail = "principal@demo.aorms.in";
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, principalEmail));
  if (exists) {
    await backfillExistingDemo(exists.id);
    console.log("✓ demo workspace already present (backfilled missing records)");
    return;
  }

  const firm = await getFirm(db);
  const system = (firm.gstType as GstSystem) ?? GstSystem.REGULAR;
  const pwHash = await hashPassword(DEMO_PASSWORD);

  // Enable the HR module so the staff/assignment/workload areas are populated.
  const settings = await getOrgSettings(db);
  await db.update(orgSettings).set({ hrEnabled: true }).where(eq(orgSettings.id, settings.id));

  // ── Staff personas ───────────────────────────────────────────────────────
  const [principal] = await db
    .insert(users)
    .values({ email: principalEmail, fullName: "Ar. Vihaan Sharma (Principal)", role: "OWNER", passwordHash: pwHash, isDemo: true })
    .returning();
  await db.insert(users).values([
    { email: "lead@demo.aorms.in", fullName: "Ar. Aarav Mehta (Project Lead)", role: "PARTNER", passwordHash: pwHash, isDemo: true },
    { email: "site@demo.aorms.in", fullName: "Rahul Nair (Site Supervisor)", role: "ASSOCIATE", passwordHash: pwHash, isDemo: true },
    { email: "junior@demo.aorms.in", fullName: "Sneha Rao (Jr Architect)", role: "VIEWER", passwordHash: pwHash, isDemo: true },
  ]);

  // Team-member register (HR) — names used as task assignees.
  const staff = await db
    .insert(teamMembers)
    .values([
      { name: "Aarav Mehta", role: "Project Lead", employmentType: "FULL_TIME", email: "lead@demo.aorms.in", monthlySalaryPaise: 1_20_000_00, dateJoined: dayOffset(-900), active: true },
      { name: "Rahul Nair", role: "Site Supervisor", employmentType: "FULL_TIME", email: "site@demo.aorms.in", monthlySalaryPaise: 70_000_00, dateJoined: dayOffset(-500), active: true },
      { name: "Sneha Rao", role: "Jr Architect", employmentType: "FULL_TIME", email: "junior@demo.aorms.in", monthlySalaryPaise: 45_000_00, dateJoined: dayOffset(-200), active: true },
      { name: "Vihaan Sharma", role: "Principal Architect", employmentType: "FULL_TIME", email: principalEmail, monthlySalaryPaise: 2_50_000_00, dateJoined: dayOffset(-1500), active: true },
    ])
    .returning();
  const memberByName = new Map(staff.map((m) => [m.name, m.id]));

  // An approved leave for the site supervisor covering today.
  await db.insert(leaves).values({
    teamMemberId: memberByName.get("Rahul Nair")!,
    type: "CASUAL",
    fromDate: dayOffset(0),
    toDate: dayOffset(1),
    days: 2,
    reason: "Family function",
    status: "APPROVED",
  });

  // ── Clients + the client portal persona ──────────────────────────────────
  const clientRows = await db
    .insert(clients)
    .values([
      { name: "Sharma Residences LLP", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "projects@sharmares.in", phone: "+91 98450 11111" },
      { name: "Anita Rao", kind: "INDIVIDUAL", city: "Mysuru", state: "Karnataka", email: "anita.rao@example.in", phone: "+91 98860 22222" },
      { name: "Verde Developers Pvt Ltd", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "build@verde.in", phone: "+91 80471 33333" },
      { name: "Kapoor Family", kind: "INDIVIDUAL", city: "Bengaluru", state: "Karnataka", email: "client@demo.aorms.in", phone: "+91 99000 44444" },
    ])
    .returning();
  const kapoor = clientRows[3]!;

  await db.insert(users).values({
    email: "client@demo.aorms.in",
    fullName: "Divya Kapoor (Client)",
    role: "CLIENT",
    passwordHash: pwHash,
    isDemo: true,
    clientId: kapoor.id,
  });

  // Consultants and collaborators visible from the people and engagement areas.
  const consultantRows = await db
    .insert(consultants)
    .values([
      {
        name: "Prakash Iyer",
        discipline: "Structural",
        firm: "Iyer Structural Studio",
        email: "prakash@iyerstruct.in",
        phone: "+91 98450 55501",
      },
      {
        name: "Meera Menon",
        discipline: "MEP",
        firm: "Circuit & Flow Engineers",
        email: "meera@circuitflow.in",
        phone: "+91 98450 55502",
      },
      {
        name: "Naveen Das",
        discipline: "Landscape",
        firm: "Canopy Works",
        email: "naveen@canopyworks.in",
        phone: "+91 98450 55503",
      },
    ])
    .returning();

  // ── Projects with phases, fees, invoices, permits, tasks ─────────────────
  const projectDefs = [
    { client: clientRows[0]!, title: "Sharma Villa — Whitefield", projectType: "RESIDENTIAL", value: 45_00_00_000 },
    { client: clientRows[1]!, title: "Rao House — Mysuru", projectType: "RESIDENTIAL", value: 1_20_00_000 },
    { client: clientRows[2]!, title: "Verde Commercial Block", projectType: "COMMERCIAL", value: 8_50_00_000 },
    { client: kapoor, title: "Kapoor Residence — Sarjapur", projectType: "RESIDENTIAL", value: 2_10_00_000 },
  ];

  let pi = 0;
  for (const def of projectDefs) {
    const { ref } = await nextRef(db, "projectoffice", "PRJ");
    const [project] = await db
      .insert(projectOffices)
      .values({
        ref,
        title: def.title,
        projectType: def.projectType,
        jurisdiction: "BBMP",
        status: "ACTIVE",
        clientId: def.client.id,
        state: "Karnataka",
        contractValuePaise: def.value,
        createdById: principal!.id,
      })
      .returning();
    const projectId = project!.id;

    // COA phases — progress varies per project.
    await db.insert(phases).values(
      coaStagePlan().map((st, idx) => ({
        projectId,
        code: st.code,
        label: st.label,
        billingPct: st.stagePct,
        sortOrder: idx,
        status: idx < pi + 1 ? "COMPLETE" : idx === pi + 1 ? "IN_PROGRESS" : "NOT_STARTED",
      })),
    );

    // Fee proposal.
    const { ref: feeRef } = await nextRef(db, "feeproposal", "FEE");
    await db.insert(feeProposals).values({
      ref: feeRef,
      projectId,
      workCategory: "ARCHITECTURE",
      costOfWorksPaise: def.value,
      feePaise: Math.round(def.value * 0.08),
      docCommPct: 10,
      coaMinimumPaise: 0,
      belowMinimum: false,
    });

    // Invoices: one paid + one issued on the larger projects.
    const billStages: ("PAID" | "ISSUED")[] = pi < 3 ? ["PAID", "ISSUED"] : ["ISSUED"];
    for (let k = 0; k < billStages.length; k++) {
      const taxable = Math.round(def.value * 0.02);
      const g = computeGst(system, taxable, false);
      const { ref: invRef } = await nextRef(db, "invoice", "INV");
      await db.insert(invoices).values({
        ref: invRef,
        projectId,
        clientId: def.client.id,
        status: billStages[k]!,
        gstSystem: system,
        documentKind: g.documentKind,
        sac: system === GstSystem.REGULAR ? "998322" : null,
        interState: false,
        tdsApplicable: firm.tdsApplicableDefault,
        taxablePaise: g.taxable,
        cgstPaise: g.cgst,
        sgstPaise: g.sgst,
        igstPaise: g.igst,
        gstTotalPaise: g.gstTotal,
        compositionLevyPaise: g.compositionLevy,
        tdsPaise: 0,
        grandTotalPaise: g.grandTotal,
        netReceivablePaise: g.grandTotal,
        dateInvoice: dayOffset(-40 + k * 25),
      });
    }

    // Permit.
    const { ref: pmtRef } = await nextRef(db, "permit", "PMT");
    await db.insert(permits).values({
      ref: pmtRef,
      projectId,
      permitType: "Building plan sanction",
      authority: "BBMP",
      applicationNo: `BBMP/${2026}/${1000 + pi}`,
      status: pi % 2 === 0 ? "SUBMITTED" : "NOT_STARTED",
      dateSubmitted: pi % 2 === 0 ? dayOffset(-30) : null,
      dateDue: dayOffset(10 + pi * 3),
    });

    // Staff assignments to this project.
    await db.insert(assignments).values([
      { projectId, teamMemberId: memberByName.get("Aarav Mehta")!, role: "Project Lead" },
      { projectId, teamMemberId: memberByName.get("Rahul Nair")!, role: "Site in-charge" },
      { projectId, teamMemberId: memberByName.get("Sneha Rao")!, role: "Design" },
    ]);

    // Consultant engagements keep the collaborator/procurement side alive.
    await db.insert(engagements).values([
      {
        projectId,
        consultantId: consultantRows[0]!.id,
        scope: "RCC structural design, GFC review and site clarifications",
        agreedFeePaise: Math.round(def.value * 0.006),
        paidPaise: pi % 2 === 0 ? Math.round(def.value * 0.002) : 0,
        status: "ENGAGED",
      },
      {
        projectId,
        consultantId: consultantRows[1]!.id,
        scope: "Electrical, plumbing and fire-fighting coordination",
        agreedFeePaise: Math.round(def.value * 0.004),
        paidPaise: 0,
        status: pi === 3 ? "PROPOSED" : "ENGAGED",
      },
    ]);

    // Specification, procurement and issue records show the document workflow
    // without requiring demo users to upload any files.
    const { ref: specRef } = await nextRef(db, "specsheet", "SPEC");
    const [spec] = await db
      .insert(specSheets)
      .values({ ref: specRef, projectId, title: "Interior material schedule" })
      .returning();
    await db.insert(specItems).values([
      {
        specSheetId: spec!.id,
        category: "Flooring",
        item: "Living / dining flooring",
        make: "Kajaria / equivalent",
        specification: "1200 x 600 vitrified tile, rectified edges",
        finish: "Warm grey matte",
        remarks: "Confirm final shade with client sample board",
        sortOrder: 1,
      },
      {
        specSheetId: spec!.id,
        category: "Joinery",
        item: "Wardrobe shutters",
        make: "Greenlam / Merino",
        specification: "BWR ply carcass with laminate finish",
        finish: "Oak texture with black recessed handle",
        remarks: "Mock-up in master bedroom before bulk execution",
        sortOrder: 2,
      },
    ]);

    const { ref: poRef } = await nextRef(db, "purchaseorder", "PO");
    const [po] = await db
      .insert(purchaseOrders)
      .values({
        ref: poRef,
        projectId,
        vendor: pi % 2 === 0 ? "BuildMart Bengaluru" : "Studio Materials Co.",
        title: "Sample and site procurement",
        status: pi % 2 === 0 ? "ISSUED" : "DRAFT",
        datePo: dayOffset(-12 + pi),
        notes: "Demo PO for reviewing approval, procurement and cost tracking.",
        totalPaise: 2_85_000_00,
      })
      .returning();
    await db.insert(poItems).values([
      {
        poId: po!.id,
        description: "Vitrified tile sample batch",
        unit: "box",
        qty: 15,
        ratePaise: 12_000_00,
        amountPaise: 1_80_000_00,
        sortOrder: 1,
      },
      {
        poId: po!.id,
        description: "Laminate swatch boards",
        unit: "set",
        qty: 3,
        ratePaise: 35_000_00,
        amountPaise: 1_05_000_00,
        sortOrder: 2,
      },
    ]);

    const { ref: txRef } = await nextRef(db, "transmittal", "TX");
    const [tx] = await db
      .insert(transmittals)
      .values({
        ref: txRef,
        projectId,
        recipient: pi === 3 ? "Divya Kapoor" : def.client.name,
        purpose: "Issued for client review",
        channel: "Email",
        dateIssued: dayOffset(-5),
        notes: "Demo transmittal showing how drawing/document issue registers behave.",
        createdById: principal!.id,
      })
      .returning();
    await db.insert(transmittalItems).values([
      {
        transmittalId: tx!.id,
        drawingRef: `${ref}-A-101`,
        title: "Ground floor plan",
        rev: "R1",
        copies: 1,
      },
      {
        transmittalId: tx!.id,
        drawingRef: `${ref}-A-201`,
        title: "Front elevation",
        rev: "R0",
        copies: 1,
      },
    ]);

    await db.insert(approvals).values({
      projectId,
      entityType: "DRAWING_SET",
      title: "Schematic design package",
      recipient: pi === 3 ? "Divya Kapoor" : def.client.name,
      channel: "Client portal",
      status: pi % 2 === 0 ? "SENT" : "DRAFT",
      sentDate: pi % 2 === 0 ? dayOffset(-6) : null,
      responseDate: pi === 0 ? dayOffset(-2) : null,
      remarks: pi === 0 ? "Approved with facade material comments." : "Awaiting client review.",
      createdById: principal!.id,
    });

    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({
      ref: insRef,
      projectId,
      dateVisit: dayOffset(-2 + pi),
      weather: "Clear",
      attendees: "Site supervisor, contractor, project lead",
      progress: pi % 2 === 0 ? "RCC slab reinforcement completed for review." : "Masonry and services chase marking in progress.",
      observations: "Site housekeeping acceptable; contractor to protect exposed starter bars.",
      instructions: "Submit bar bending schedule and pour card before next inspection.",
      nextVisit: dayOffset(5 + pi),
      inspectorName: "Rahul Nair",
    });

    // Tasks spread across personas and around today (drive workload boards).
    const taskDefs = [
      { title: "Issue working drawings — ground floor", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS" },
      { title: "Site visit & RCC slab check", assignee: "Rahul Nair", priority: "HIGH", due: dayOffset(0), status: "TODO" },
      { title: "Coordinate MEP consultant drawings", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(2), status: "TODO" },
      { title: "Prepare client presentation deck", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(-1), status: "TODO" },
      { title: "Finalise BOQ for tender", assignee: "Aarav Mehta", priority: "LOW", due: dayOffset(5), status: "TODO" },
    ];
    await db.insert(tasks).values(
      taskDefs.map((t) => ({
        title: `${t.title} (${ref})`,
        projectId,
        assignee: t.assignee,
        priority: t.priority,
        status: t.status,
        dueDate: t.due,
        createdById: principal!.id,
      })),
    );

    // A client-log entry.
    await db.insert(clientLogs).values({
      projectId,
      clientId: def.client.id,
      kind: "MEETING",
      occurredAt: dayOffset(-7),
      subject: "Design review meeting",
      body: "Walked the client through schematic options; client preferred Option B with a courtyard.",
      createdById: principal!.id,
    });

    pi++;
  }

  console.log("✓ seeded demo workspace");
  console.log(`    principal: ${principalEmail} / ${DEMO_PASSWORD}`);
  console.log("    lead@ / site@ / junior@ / client@demo.aorms.in (same password)");
  console.log(`    ${projectDefs.length} projects with phases, fees, invoices, permits, tasks`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo seed failed:", err);
    process.exit(1);
  });
