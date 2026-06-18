/**
 * Demo-seed: a fully populated, multi-persona evaluation workspace.
 *
 *   pnpm --filter @esti/backend seed:demo
 *   (or: podman exec esti-backend sh -c "cd /app/backend && pnpm seed:demo")
 *
 * Idempotent — if the demo principal already exists it does nothing. Creates
 * read-mostly demo logins for several office roles plus clients, projects,
 * phases, fees, invoices, permits, tasks, attendance, ASPRF
 * reward events, decisions (CRIF), critical notes, bylaw calculations,
 * consultant engagements and client-log entries so each persona has something
 * real to explore. NOT for production use.
 */
import { DEFAULT_PHASE_PLAN, GstSystem, computeGst } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  approvals,
  assignments,
  attendance,
  clientLogs,
  clients,
  comments,
  consultants,
  criticalNotes,
  decisions,
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
  rewardPoints,
  specItems,
  specSheets,
  tasks,
  teamMembers,
  transmittalItems,
  transmittals,
  users,
} from "../db/schema.js";
import { getFirm } from "../lib/firm.js";
import { getOrgSettings } from "../lib/settings.js";
import { nextRef } from "../lib/numbering.js";
import { backfillDemoBylawCalcs, upsertDemoBylawCalc } from "./seedDemoBylaw.js";
import { catalogSnapshot, ensureDemoSpecCatalog } from "./seedSpecCatalog.js";
import { ensureDemoSteelFlowCatalog } from "./seedSteelFlowCatalog.js";
import { ensureBuildingDsrCatalog, ensureAiStudioEnabled } from "./seedBuildingDsr.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

/** yyyy-mm-dd offset from today by N days (local time). */
function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the N most-recent weekday offsets (negative numbers, Mon–Fri only). */
function recentWeekdays(count: number): number[] {
  const result: number[] = [];
  let offset = -1;
  while (result.length < count) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) result.push(offset);
    offset--;
  }
  return result;
}

// ── Consultants ──────────────────────────────────────────────────────────────

async function ensureDemoConsultants() {
  const defs = [
    { name: "Prakash Iyer", discipline: "Structural", firm: "Iyer Structural Studio", email: "prakash@iyerstruct.in", phone: "+91 98450 55501" },
    { name: "Meera Menon", discipline: "MEP", firm: "Circuit & Flow Engineers", email: "meera@circuitflow.in", phone: "+91 98450 55502" },
    { name: "Naveen Das", discipline: "Landscape", firm: "Canopy Works", email: "naveen@canopyworks.in", phone: "+91 98450 55503" },
    { name: "Suresh Venkataraman", discipline: "Geotechnical", firm: "SV Geo Consultants", email: "suresh@svgeo.in", phone: "+91 98450 55504" },
    { name: "Kavitha Krishnan", discipline: "Interior", firm: "KK Design Studio", email: "kavitha@kkdesign.in", phone: "+91 98450 55505" },
  ];
  const rows = [];
  for (const def of defs) {
    const [existing] = await db.select().from(consultants).where(eq(consultants.email, def.email)).limit(1);
    if (existing) { rows.push(existing); continue; }
    const [created] = await db.insert(consultants).values(def).returning();
    rows.push(created!);
  }
  return rows;
}

// ── Per-project back-fill (engagements, spec, PO, transmittal, approval, inspection) ─

async function backfillProjectDemoRecords(
  projectId: string, projectRef: string, projectTitle: string,
  principalId: string, pi: number,
  catalog: Awaited<ReturnType<typeof ensureDemoSpecCatalog>>,
) {
  const consultantRows = await ensureDemoConsultants();

  const [engaged] = await db.select({ id: engagements.id }).from(engagements).where(eq(engagements.projectId, projectId)).limit(1);
  if (!engaged) {
    await db.insert(engagements).values([
      { projectId, consultantId: consultantRows[0]!.id, scope: "RCC structural design, GFC review and site clarifications", agreedFeePaise: 3_60_000_00, paidPaise: pi % 2 === 0 ? 1_20_000_00 : 0, status: "ENGAGED" },
      { projectId, consultantId: consultantRows[1]!.id, scope: "Electrical, plumbing and fire-fighting coordination", agreedFeePaise: 2_40_000_00, paidPaise: 0, status: pi === 3 ? "PROPOSED" : "ENGAGED" },
    ]);
  }

  const [specExists] = await db.select({ id: specSheets.id }).from(specSheets).where(eq(specSheets.projectId, projectId)).limit(1);
  if (!specExists) {
    const { ref: specRef } = await nextRef(db, "specsheet", "SPEC");
    const [spec] = await db.insert(specSheets).values({ ref: specRef, projectId, title: "Interior material schedule" }).returning();
    const row1 = catalogSnapshot(catalog, pi === 7 ? "officeFlooring" : "flooring");
    const row2 = catalogSnapshot(catalog, "joinery");
    await db.insert(specItems).values([
      { specSheetId: spec!.id, ...row1, sortOrder: 10 },
      { specSheetId: spec!.id, ...row2, sortOrder: 20 },
    ]);
  }

  const [poExists] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.projectId, projectId)).limit(1);
  if (!poExists) {
    const { ref: poRef } = await nextRef(db, "purchaseorder", "PO");
    const [po] = await db.insert(purchaseOrders).values({ ref: poRef, projectId, vendor: pi % 2 === 0 ? "BuildMart Bengaluru" : "Studio Materials Co.", title: "Sample and site procurement", status: pi % 2 === 0 ? "ISSUED" : "DRAFT", datePo: dayOffset(-12 + pi), notes: "Demo PO for reviewing approval, procurement and cost tracking.", totalPaise: 2_85_000_00 }).returning();
    await db.insert(poItems).values([
      { poId: po!.id, description: "Vitrified tile sample batch", unit: "box", qty: 15, ratePaise: 12_000_00, amountPaise: 1_80_000_00, sortOrder: 1 },
      { poId: po!.id, description: "Laminate swatch boards", unit: "set", qty: 3, ratePaise: 35_000_00, amountPaise: 1_05_000_00, sortOrder: 2 },
    ]);
  }

  const [txExists] = await db.select({ id: transmittals.id }).from(transmittals).where(eq(transmittals.projectId, projectId)).limit(1);
  if (!txExists) {
    const { ref: txRef } = await nextRef(db, "transmittal", "TX");
    const [tx] = await db.insert(transmittals).values({ ref: txRef, projectId, recipient: projectTitle.includes("Kapoor") ? "Divya Kapoor" : "Demo client", purpose: "Issued for client review", channel: "Email", dateIssued: dayOffset(-5), notes: "Demo transmittal showing how drawing/document issue registers behave.", createdById: principalId }).returning();
    await db.insert(transmittalItems).values([
      { transmittalId: tx!.id, drawingRef: `${projectRef}-A-101`, title: "Ground floor plan", rev: "R1", copies: 1 },
      { transmittalId: tx!.id, drawingRef: `${projectRef}-A-201`, title: "Front elevation", rev: "R0", copies: 1 },
    ]);
  }

  const [approvalExists] = await db.select({ id: approvals.id }).from(approvals).where(eq(approvals.projectId, projectId)).limit(1);
  if (!approvalExists) {
    await db.insert(approvals).values({ projectId, entityType: "DRAWING_SET", title: "Schematic design package", recipient: projectTitle.includes("Kapoor") ? "Divya Kapoor" : "Demo client", channel: "Client portal", status: pi % 2 === 0 ? "SENT" : "DRAFT", sentDate: pi % 2 === 0 ? dayOffset(-6) : null, responseDate: pi === 0 ? dayOffset(-2) : null, remarks: pi === 0 ? "Approved with facade material comments." : "Awaiting client review.", createdById: principalId });
  }

  const [inspectionExists] = await db.select({ id: inspections.id }).from(inspections).where(eq(inspections.projectId, projectId)).limit(1);
  if (!inspectionExists) {
    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({ ref: insRef, projectId, dateVisit: dayOffset(-2 + pi), weather: "Clear", attendees: "Site supervisor, contractor, project lead", progress: pi % 2 === 0 ? "RCC slab reinforcement completed for review." : "Masonry and services chase marking in progress.", observations: "Site housekeeping acceptable; contractor to protect exposed starter bars.", instructions: "Submit bar bending schedule and pour card before next inspection.", nextVisit: dayOffset(5 + pi), inspectorName: "Rahul Nair" });
  }
}

async function linkDemoTeamAndTasks(): Promise<void> {
  const userRows = await db.select({ id: users.id, email: users.email }).from(users).where(
    eq(users.isDemo, true),
  );
  const userByEmail = new Map(userRows.map((u) => [u.email, u.id]));

  const members = await db.select().from(teamMembers);
  for (const m of members) {
    if (m.email && userByEmail.has(m.email) && m.userId !== userByEmail.get(m.email)) {
      await db.update(teamMembers).set({ userId: userByEmail.get(m.email)! }).where(eq(teamMembers.id, m.id));
    }
  }

  const memberByName = new Map(members.map((m) => [m.name, m.id]));
  const allTasks = await db.select({ id: tasks.id, assignee: tasks.assignee, assigneeId: tasks.assigneeId }).from(tasks);
  for (const t of allTasks) {
    if (!t.assignee || t.assigneeId) continue;
    const memberId = memberByName.get(t.assignee);
    if (memberId) {
      await db.update(tasks).set({ assigneeId: memberId }).where(eq(tasks.id, t.id));
    }
  }
}

async function backfillExistingDemo(principalId: string): Promise<void> {
  await linkDemoTeamAndTasks();
  await ensureDemoConsultants();
  const catalog = await ensureDemoSpecCatalog(db);
  await ensureDemoSteelFlowCatalog(db);
  await ensureBuildingDsrCatalog(db);
  await ensureAiStudioEnabled(db);
  const bylawCount = await backfillDemoBylawCalcs(db);
  const allTitles = [
    "Sharma Villa — Whitefield", "Rao House — Mysuru", "Verde Commercial Block",
    "Kapoor Residence — Sarjapur", "Patel Corp HQ — Pune", "St. Francis School Expansion",
    "Reddy Beach Retreat — Goa", "Nexus Co-working — Koramangala",
  ];
  for (const [pi, title] of allTitles.entries()) {
    const [project] = await db.select({ id: projectOffices.id, ref: projectOffices.ref, title: projectOffices.title }).from(projectOffices).where(eq(projectOffices.title, title)).limit(1);
    if (project) await backfillProjectDemoRecords(project.id, project.ref, project.title, principalId, pi, catalog);
  }
  console.log(`    refreshed ${bylawCount} bylaw compliance records (pre + post audit)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

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

  const settings = await getOrgSettings(db);
  await db.update(orgSettings).set({ hrEnabled: true, orgMode: "STUDIO" }).where(eq(orgSettings.id, settings.id));
  await ensureAiStudioEnabled(db);

  // ── Staff personas ────────────────────────────────────────────────────────
  const [principal] = await db
    .insert(users)
    .values({
      email: principalEmail,
      fullName: "Ar. Vihaan Sharma (Principal)",
      role: "OWNER",
      passwordHash: pwHash,
      isDemo: true,
    })
    .returning();
  const staffUsers = await db
    .insert(users)
    .values([
      {
        email: "lead@demo.aorms.in",
        fullName: "Ar. Aarav Mehta (Project Lead)",
        role: "PARTNER",
        passwordHash: pwHash,
        isDemo: true,
      },
      {
        email: "site@demo.aorms.in",
        fullName: "Rahul Nair (Site Supervisor)",
        role: "ASSOCIATE",
        passwordHash: pwHash,
        isDemo: true,
      },
      {
        email: "junior@demo.aorms.in",
        fullName: "Sneha Rao (Jr Architect)",
        role: "VIEWER",
        passwordHash: pwHash,
        isDemo: true,
      },
      {
        email: "intern@demo.aorms.in",
        fullName: "Kiran Patel (Intern)",
        role: "VIEWER",
        passwordHash: pwHash,
        isDemo: true,
      },
    ])
    .returning();
  const userByEmail = new Map([
    [principalEmail, principal!.id],
    ...staffUsers.map((u) => [u.email, u.id] as const),
  ]);

  const staff = await db
    .insert(teamMembers)
    .values([
      {
        name: "Aarav Mehta",
        role: "Project Lead",
        employmentType: "FULL_TIME",
        email: "lead@demo.aorms.in",
        userId: userByEmail.get("lead@demo.aorms.in"),
        monthlySalaryPaise: 1_20_000_00,
        dateJoined: dayOffset(-900),
        active: true,
      },
      {
        name: "Rahul Nair",
        role: "Site Supervisor",
        employmentType: "FULL_TIME",
        email: "site@demo.aorms.in",
        userId: userByEmail.get("site@demo.aorms.in"),
        monthlySalaryPaise: 70_000_00,
        dateJoined: dayOffset(-500),
        active: true,
      },
      {
        name: "Sneha Rao",
        role: "Jr Architect",
        employmentType: "FULL_TIME",
        email: "junior@demo.aorms.in",
        userId: userByEmail.get("junior@demo.aorms.in"),
        monthlySalaryPaise: 45_000_00,
        dateJoined: dayOffset(-200),
        active: true,
      },
      {
        name: "Vihaan Sharma",
        role: "Principal Architect",
        employmentType: "FULL_TIME",
        email: principalEmail,
        userId: userByEmail.get(principalEmail),
        monthlySalaryPaise: 2_50_000_00,
        dateJoined: dayOffset(-1500),
        active: true,
      },
      {
        name: "Kiran Patel",
        role: "Intern",
        employmentType: "INTERN",
        email: "intern@demo.aorms.in",
        userId: userByEmail.get("intern@demo.aorms.in"),
        monthlySalaryPaise: 15_000_00,
        dateJoined: dayOffset(-60),
        active: true,
      },
    ])
    .returning();
  const memberByName = new Map(staff.map((m) => [m.name, m.id]));

  await db.insert(leaves).values([
    { teamMemberId: memberByName.get("Rahul Nair")!, type: "CASUAL", fromDate: dayOffset(0), toDate: dayOffset(1), days: 2, reason: "Family function", status: "APPROVED" },
    { teamMemberId: memberByName.get("Sneha Rao")!, type: "SICK", fromDate: dayOffset(-10), toDate: dayOffset(-10), days: 1, reason: "Fever", status: "APPROVED" },
    { teamMemberId: memberByName.get("Aarav Mehta")!, type: "EARNED", fromDate: dayOffset(15), toDate: dayOffset(19), days: 5, reason: "Annual vacation", status: "PENDING" },
  ]);

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientRows = await db.insert(clients).values([
    { name: "Sharma Residences LLP", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "projects@sharmares.in", phone: "+91 98450 11111" },
    { name: "Anita Rao", kind: "INDIVIDUAL", city: "Mysuru", state: "Karnataka", email: "anita.rao@example.in", phone: "+91 98860 22222" },
    { name: "Verde Developers Pvt Ltd", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "build@verde.in", phone: "+91 80471 33333" },
    { name: "Kapoor Family", kind: "INDIVIDUAL", city: "Bengaluru", state: "Karnataka", email: "client@demo.aorms.in", phone: "+91 99000 44444" },
    { name: "Patel Enterprises Pvt Ltd", kind: "COMPANY", city: "Pune", state: "Maharashtra", email: "infra@pateletp.in", phone: "+91 98220 55555" },
    { name: "Diocese of Bengaluru Education Society", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "projects@dioceseedu.in", phone: "+91 80471 66666" },
    { name: "Priya Reddy", kind: "INDIVIDUAL", city: "Panaji", state: "Goa", email: "priya.reddy@example.in", phone: "+91 98230 77777" },
    { name: "Nexus Cowork Pvt Ltd", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "design@nexuscowork.in", phone: "+91 80471 88888" },
    { name: "Sunrise Hospitality Pvt Ltd", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "projects@sunrisehotels.in", phone: "+91 80471 99001" },
    { name: "Dr. Arvind Nair", kind: "INDIVIDUAL", city: "Mangaluru", state: "Karnataka", email: "arvind.nair@example.in", phone: "+91 98860 99002" },
    { name: "GreenField Industries Ltd", kind: "COMPANY", city: "Hosur", state: "Tamil Nadu", email: "works@greenfieldind.in", phone: "+91 90030 99003" },
    { name: "Lakeview Realty LLP", kind: "COMPANY", city: "Hyderabad", state: "Telangana", email: "build@lakeviewrealty.in", phone: "+91 90000 99004" },
    { name: "Meghana Foundation Trust", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "office@meghanatrust.in", phone: "+91 80471 99005" },
    { name: "Tanvi Desai", kind: "INDIVIDUAL", city: "Belagavi", state: "Karnataka", email: "tanvi.desai@example.in", phone: "+91 98450 99006" },
  ]).returning();

  const kapoor = clientRows[3]!;
  await db.insert(users).values({ email: "client@demo.aorms.in", fullName: "Divya Kapoor (Client)", role: "CLIENT", passwordHash: pwHash, isDemo: true, clientId: kapoor.id });

  // ── Consultants ───────────────────────────────────────────────────────────
  const consultantRows = await db.insert(consultants).values([
    { name: "Prakash Iyer", discipline: "Structural", firm: "Iyer Structural Studio", email: "prakash@iyerstruct.in", phone: "+91 98450 55501" },
    { name: "Meera Menon", discipline: "MEP", firm: "Circuit & Flow Engineers", email: "meera@circuitflow.in", phone: "+91 98450 55502" },
    { name: "Naveen Das", discipline: "Landscape", firm: "Canopy Works", email: "naveen@canopyworks.in", phone: "+91 98450 55503" },
    { name: "Suresh Venkataraman", discipline: "Geotechnical", firm: "SV Geo Consultants", email: "suresh@svgeo.in", phone: "+91 98450 55504" },
    { name: "Kavitha Krishnan", discipline: "Interior", firm: "KK Design Studio", email: "kavitha@kkdesign.in", phone: "+91 98450 55505" },
  ]).returning();

  // ── Projects ──────────────────────────────────────────────────────────────
  const projectDefs = [
    // Existing 4
    { client: clientRows[0]!, title: "Sharma Villa — Whitefield", projectType: "Residential Architecture", value: 45_00_00_000, status: "ACTIVE", phaseProgress: 3 },
    { client: clientRows[1]!, title: "Rao House — Mysuru", projectType: "Residential Architecture", value: 1_20_00_000, status: "ACTIVE", phaseProgress: 1 },
    { client: clientRows[2]!, title: "Verde Commercial Block", projectType: "Commercial Architecture", value: 8_50_00_000, status: "ACTIVE", phaseProgress: 2 },
    { client: kapoor, title: "Kapoor Residence — Sarjapur", projectType: "Residential Architecture", value: 2_10_00_000, status: "ACTIVE", phaseProgress: 0 },
    // New 4
    { client: clientRows[4]!, title: "Patel Corp HQ — Pune", projectType: "Commercial Architecture", value: 22_50_00_000, status: "ACTIVE", phaseProgress: 2 },
    { client: clientRows[5]!, title: "St. Francis School Expansion", projectType: "Institutional Architecture", value: 6_80_00_000, status: "ACTIVE", phaseProgress: 1 },
    { client: clientRows[6]!, title: "Reddy Beach Retreat — Goa", projectType: "Residential Architecture", value: 3_40_00_000, status: "ON_HOLD", phaseProgress: 1 },
    { client: clientRows[7]!, title: "Nexus Co-working — Koramangala", projectType: "Interior Design", value: 1_85_00_000, status: "COMPLETE", phaseProgress: 6 },
    // Additional demo projects (pi 8-13)
    { client: clientRows[8]!, title: "Sunrise Boutique Hotel — Indiranagar", projectType: "Commercial Architecture", value: 12_00_00_000, status: "ACTIVE", phaseProgress: 2 },
    { client: clientRows[9]!, title: "Nair Wellness Clinic — Mangaluru", projectType: "Institutional Architecture", value: 95_00_000, status: "ACTIVE", phaseProgress: 1 },
    { client: clientRows[10]!, title: "GreenField Factory Shed — Hosur", projectType: "Industrial Architecture", value: 18_00_00_000, status: "ACTIVE", phaseProgress: 3 },
    { client: clientRows[11]!, title: "Lakeview Apartments — Hyderabad", projectType: "Residential Architecture", value: 32_00_00_000, status: "PROPOSAL", phaseProgress: 0 },
    { client: clientRows[12]!, title: "Meghana Community Centre", projectType: "Institutional Architecture", value: 4_20_00_000, status: "ACTIVE", phaseProgress: 1 },
    { client: clientRows[13]!, title: "Desai Villa — Belagavi", projectType: "Residential Architecture", value: 1_60_00_000, status: "ON_HOLD", phaseProgress: 1 },
  ];

  // All task definitions with ASPRF dimensions per project
  const taskDefsByProject = [
    // Sharma Villa
    [
      { title: "Issue working drawings — ground floor", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "8.00" },
      { title: "Site visit & RCC slab check", assignee: "Rahul Nair", priority: "HIGH", due: dayOffset(0), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "4.00" },
      { title: "Coordinate structural consultant — column schedule", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "6.00" },
      { title: "Prepare client presentation deck", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(-1), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "5.00" },
      { title: "Finalise BOQ for tender", assignee: "Aarav Mehta", priority: "LOW", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 4, hours: "12.00" },
      { title: "Update project timeline in AORMS", assignee: "Sneha Rao", priority: "LOW", due: dayOffset(3), status: "TODO", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "2.00" },
    ],
    // Rao House
    [
      { title: "Schematic design options — Option A & B", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(1), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "16.00" },
      { title: "Client meeting — finalize scheme", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(3), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "3.00" },
      { title: "Submit permit drawings to MUDA", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(8), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "10.00" },
      { title: "Prepare GST invoice — milestone 1", assignee: "Vihaan Sharma", priority: "MEDIUM", due: dayOffset(0), status: "TODO", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
      { title: "Review structural consultant input", assignee: "Aarav Mehta", priority: "LOW", due: dayOffset(6), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "4.00" },
    ],
    // Verde Commercial Block
    [
      { title: "GFC drawing set — typical floor", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 5, hours: "24.00" },
      { title: "Facade mock-up review on site", assignee: "Rahul Nair", priority: "HIGH", due: dayOffset(1), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 3, hours: "6.00" },
      { title: "Coordination meeting — MEP consultant", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(0), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "4.00" },
      { title: "Issue revised parking layout to Verde", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(4), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 2, hours: "6.00" },
      { title: "BBMP occupancy certificate follow-up", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "3.00" },
      { title: "Update BOQ for steel scope change", assignee: "Kiran Patel", priority: "MEDIUM", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "8.00" },
      { title: "Training: Drizzle ORM patterns", assignee: "Kiran Patel", priority: "LOW", due: dayOffset(7), status: "TODO", classification: "TRAINING", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "4.00" },
    ],
    // Kapoor Residence
    [
      { title: "Inception meeting — site visit", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(0), status: "DONE", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "4.00" },
      { title: "Site measurement and survey notes", assignee: "Rahul Nair", priority: "HIGH", due: dayOffset(-3), status: "DONE", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "6.00" },
      { title: "Brief & design programme document", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(2), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "4.00" },
      { title: "Fee proposal — architecture scope", assignee: "Vihaan Sharma", priority: "MEDIUM", due: dayOffset(4), status: "TODO", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "3.00" },
    ],
    // Patel Corp HQ
    [
      { title: "Concept design presentation — board review", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(-1), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 4, hours: "12.00" },
      { title: "Structural grid coordination", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(3), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "8.00" },
      { title: "Fire NOC documentation", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(7), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "6.00" },
      { title: "Landscape design brief to Canopy Works", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 2, hours: "3.00" },
      { title: "Geotechnical report review", assignee: "Vihaan Sharma", priority: "HIGH", due: dayOffset(1), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "4.00" },
      { title: "Internal design review meeting", assignee: "Vihaan Sharma", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "COLLABORATION", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "2.00" },
    ],
    // St. Francis School
    [
      { title: "Site context study — existing building survey", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "8.00" },
      { title: "Educational space programming brief", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(4), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 3, hours: "6.00" },
      { title: "Classroom block schematic options", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(8), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "16.00" },
      { title: "Client meeting — Diocese board presentation", assignee: "Vihaan Sharma", priority: "HIGH", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 3, hours: "4.00" },
    ],
    // Reddy Beach Retreat
    [
      { title: "CRZ compliance assessment", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(-15), status: "DONE", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 5, hours: "10.00" },
      { title: "Schematic design — beach-facing elevation", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(-5), status: "DONE", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "14.00" },
      { title: "ON HOLD: Resume after client confirms budget", assignee: "Vihaan Sharma", priority: "LOW", due: dayOffset(30), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
    ],
    // Nexus Co-working
    [
      { title: "As-built drawings archive", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(-10), status: "DONE", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 2, hours: "8.00" },
      { title: "Final invoice and project closure", assignee: "Vihaan Sharma", priority: "HIGH", due: dayOffset(-7), status: "DONE", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "2.00" },
      { title: "Client satisfaction feedback collection", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(-5), status: "DONE", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
    ],
    // Sunrise Boutique Hotel (pi 8)
    [
      { title: "Guest-room module design study", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "14.00" },
      { title: "Lobby & F&B concept presentation", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 3, hours: "8.00" },
      { title: "Fire & life-safety strategy with consultant", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(6), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "6.00" },
      { title: "MEP shaft coordination on typical floor", assignee: "Kiran Patel", priority: "MEDIUM", due: dayOffset(4), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "10.00" },
      { title: "Site visit — basement excavation review", assignee: "Rahul Nair", priority: "HIGH", due: dayOffset(-1), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "4.00" },
    ],
    // Nair Wellness Clinic (pi 9)
    [
      { title: "Functional brief — consulting & diagnostics", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(1), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "5.00" },
      { title: "Schematic plan — ground floor", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "10.00" },
      { title: "Accessibility & ramp compliance check", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(7), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 2, hours: "4.00" },
      { title: "Mentoring: junior on healthcare norms", assignee: "Aarav Mehta", priority: "LOW", due: dayOffset(3), status: "TODO", classification: "COLLABORATION", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "2.00" },
    ],
    // GreenField Factory Shed (pi 10)
    [
      { title: "Pre-engineered building grid layout", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "12.00" },
      { title: "Crane gantry & structural coordination", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(1), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 5, hours: "10.00" },
      { title: "GFC roofing & cladding details", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(3), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 4, hours: "16.00" },
      { title: "Factory licence & pollution NOC follow-up", assignee: "Rahul Nair", priority: "MEDIUM", due: dayOffset(8), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "3.00" },
      { title: "Steel BBS for primary members", assignee: "Kiran Patel", priority: "LOW", due: dayOffset(6), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "8.00" },
    ],
    // Lakeview Apartments (pi 11, PROPOSAL)
    [
      { title: "Feasibility massing study — FAR check", assignee: "Aarav Mehta", priority: "HIGH", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "8.00" },
      { title: "Fee proposal & COA scale benchmarking", assignee: "Vihaan Sharma", priority: "HIGH", due: dayOffset(1), status: "IN_PROGRESS", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "3.00" },
      { title: "Pitch deck for client presentation", assignee: "Sneha Rao", priority: "MEDIUM", due: dayOffset(4), status: "TODO", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "6.00" },
    ],
    // Meghana Community Centre (pi 12)
    [
      { title: "Multipurpose hall acoustic study", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "8.00" },
      { title: "Community needs workshop with trust", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(5), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "4.00" },
      { title: "Sustainable materials specification", assignee: "Kiran Patel", priority: "MEDIUM", due: dayOffset(9), status: "TODO", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "6.00" },
      { title: "Training: passive cooling techniques", assignee: "Kiran Patel", priority: "LOW", due: dayOffset(7), status: "TODO", classification: "TRAINING", workType: "DESIGN_DEVELOPMENT", difficulty: 2, hours: "4.00" },
    ],
    // Desai Villa (pi 13, ON_HOLD)
    [
      { title: "Concept design — courtyard villa", assignee: "Sneha Rao", priority: "HIGH", due: dayOffset(-8), status: "DONE", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "12.00" },
      { title: "ON HOLD: await client site finalisation", assignee: "Vihaan Sharma", priority: "LOW", due: dayOffset(25), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
      { title: "Soil test coordination — geotechnical", assignee: "Rahul Nair", priority: "MEDIUM", due: dayOffset(-3), status: "DONE", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "3.00" },
    ],
  ];

  const allProjectIds: string[] = [];
  const allProjectRefs: string[] = [];

  const catalog = await ensureDemoSpecCatalog(db);
  await ensureDemoSteelFlowCatalog(db);
  await ensureBuildingDsrCatalog(db);
  await ensureAiStudioEnabled(db);

  let pi = 0;
  for (const def of projectDefs) {
    const { ref } = await nextRef(db, "projectoffice", "PRJ");
    const [project] = await db.insert(projectOffices).values({
      ref,
      title: def.title,
      projectType: def.projectType,
      jurisdiction: def.projectType === "Commercial Architecture" ? "BBMP" : "BBMP",
      status: def.status,
      clientId: def.client.id,
      state: def.client.state ?? "Karnataka",
      contractValuePaise: def.value,
      createdById: principal!.id,
    }).returning();
    const projectId = project!.id;
    allProjectIds.push(projectId);
    allProjectRefs.push(ref);

    const phaseProgress = def.phaseProgress;
    await db.insert(phases).values(
      DEFAULT_PHASE_PLAN.map((st, idx) => ({
        projectId,
        code: st.code,
        label: st.label,
        billingPct: st.billingPct,
        sortOrder: idx,
        status: idx < phaseProgress ? "COMPLETE" : idx === phaseProgress ? "IN_PROGRESS" : "NOT_STARTED",
      })),
    );

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

    // Multiple invoices for more realistic billing history
    const invoiceDefs: { offset: number; status: "PAID" | "ISSUED" | "DRAFT" }[] = pi < 4
      ? [
          { offset: -90, status: "PAID" },
          { offset: -45, status: "PAID" },
          { offset: -10, status: "ISSUED" },
        ]
      : pi < 6
        ? [
            { offset: -60, status: "PAID" },
            { offset: -15, status: "ISSUED" },
          ]
        : pi === 6
          ? [{ offset: -30, status: "ISSUED" }]
          : [
              { offset: -90, status: "PAID" },
              { offset: -60, status: "PAID" },
              { offset: -30, status: "PAID" },
              { offset: -5, status: "PAID" },
            ];

    for (const inv of invoiceDefs) {
      const taxable = Math.round(def.value * (pi < 4 ? 0.02 : 0.025));
      const g = computeGst(system, taxable, false);
      const { ref: invRef } = await nextRef(db, "invoice", "INV");
      await db.insert(invoices).values({
        ref: invRef,
        projectId,
        clientId: def.client.id,
        status: inv.status,
        gstSystem: system,
        documentKind: g.documentKind,
        sac: system === GstSystem.REGULAR ? "998322" : null,
        interState: def.client.state !== "Karnataka",
        tdsApplicable: firm.tdsApplicableDefault,
        taxablePaise: g.taxable,
        cgstPaise: def.client.state !== "Karnataka" ? 0 : g.cgst,
        sgstPaise: def.client.state !== "Karnataka" ? 0 : g.sgst,
        igstPaise: def.client.state !== "Karnataka" ? g.igst : 0,
        gstTotalPaise: g.gstTotal,
        compositionLevyPaise: g.compositionLevy,
        tdsPaise: 0,
        grandTotalPaise: g.grandTotal,
        netReceivablePaise: g.grandTotal,
        dateInvoice: dayOffset(inv.offset),
      });
    }

    const { ref: pmtRef } = await nextRef(db, "permit", "PMT");
    await db.insert(permits).values({
      ref: pmtRef,
      projectId,
      permitType: "Building plan sanction",
      authority: def.client.state === "Goa" ? "TCP Goa" : def.client.state === "Maharashtra" ? "PMRDA" : "BBMP",
      applicationNo: `${def.client.state === "Karnataka" ? "BBMP" : def.client.state === "Goa" ? "TCP" : "PMRDA"}/${2026}/${1000 + pi}`,
      status: pi < 3 ? "SUBMITTED" : pi === 3 ? "NOT_STARTED" : pi === 4 ? "SUBMITTED" : pi === 6 ? "SUBMITTED" : "NOT_STARTED",
      dateSubmitted: pi < 3 || pi === 4 || pi === 6 ? dayOffset(-30 - pi * 3) : null,
      dateDue: dayOffset(10 + pi * 3),
    });

    await db.insert(assignments).values([
      { projectId, teamMemberId: memberByName.get("Aarav Mehta")!, role: "Project Lead" },
      { projectId, teamMemberId: memberByName.get("Rahul Nair")!, role: "Site in-charge" },
      { projectId, teamMemberId: memberByName.get("Sneha Rao")!, role: "Design" },
      ...(pi >= 2 ? [{ projectId, teamMemberId: memberByName.get("Kiran Patel")!, role: "Intern" }] : []),
    ]);

    await db.insert(engagements).values([
      { projectId, consultantId: consultantRows[0]!.id, scope: "RCC structural design, GFC review and site clarifications", agreedFeePaise: Math.round(def.value * 0.006), paidPaise: pi % 2 === 0 ? Math.round(def.value * 0.002) : 0, status: "ENGAGED" },
      { projectId, consultantId: consultantRows[1]!.id, scope: "Electrical, plumbing and fire-fighting coordination", agreedFeePaise: Math.round(def.value * 0.004), paidPaise: 0, status: pi === 3 ? "PROPOSED" : "ENGAGED" },
      ...(pi === 4 ? [{ projectId, consultantId: consultantRows[3]!.id, scope: "Soil investigation, bearing capacity and foundation recommendation", agreedFeePaise: Math.round(def.value * 0.002), paidPaise: Math.round(def.value * 0.002), status: "ENGAGED" as const }] : []),
      ...(pi === 7 ? [{ projectId, consultantId: consultantRows[4]!.id, scope: "Interior design coordination and material specifications", agreedFeePaise: Math.round(def.value * 0.05), paidPaise: Math.round(def.value * 0.05), status: "CLOSED" as const }] : []),
    ]);

    // Spec sheets (from Knowledge Bank catalogue)
    const { ref: specRef } = await nextRef(db, "specsheet", "SPEC");
    const [spec] = await db.insert(specSheets).values({ ref: specRef, projectId, title: pi < 4 ? "Interior material schedule" : pi === 4 ? "Facade & structure material schedule" : "Building material schedule" }).returning();
    const row1 = catalogSnapshot(
      catalog,
      pi === 7 ? "officeFlooring" : "flooring",
    );
    const row2 = catalogSnapshot(catalog, pi === 4 ? "facade" : "joinery");
    await db.insert(specItems).values([
      { specSheetId: spec!.id, ...row1, sortOrder: 10 },
      { specSheetId: spec!.id, ...row2, sortOrder: 20 },
    ]);

    // Purchase order
    const { ref: poRef } = await nextRef(db, "purchaseorder", "PO");
    const [po] = await db.insert(purchaseOrders).values({ ref: poRef, projectId, vendor: pi % 3 === 0 ? "BuildMart Bengaluru" : pi % 3 === 1 ? "Studio Materials Co." : "Spectrum Hardware", title: pi === 7 ? "Partition & joinery procurement" : "Sample and site procurement", status: pi % 2 === 0 ? "ISSUED" : "DRAFT", datePo: dayOffset(-12 + pi), notes: "Demo PO for reviewing approval, procurement and cost tracking.", totalPaise: 2_85_000_00 + pi * 50_000_00 }).returning();
    await db.insert(poItems).values([
      { poId: po!.id, description: pi === 7 ? "Aluminium partition system" : "Vitrified tile sample batch", unit: pi === 7 ? "sqm" : "box", qty: pi === 7 ? 120 : 15, ratePaise: pi === 7 ? 18_000_00 : 12_000_00, amountPaise: pi === 7 ? 21_60_000_00 : 1_80_000_00, sortOrder: 1 },
      { poId: po!.id, description: pi === 7 ? "Acoustic ceiling tiles" : "Laminate swatch boards", unit: pi === 7 ? "sqm" : "set", qty: pi === 7 ? 80 : 3, ratePaise: pi === 7 ? 22_000_00 : 35_000_00, amountPaise: pi === 7 ? 17_60_000_00 : 1_05_000_00, sortOrder: 2 },
    ]);

    // Transmittals
    const { ref: txRef } = await nextRef(db, "transmittal", "TX");
    const [tx] = await db.insert(transmittals).values({ ref: txRef, projectId, recipient: pi === 3 ? "Divya Kapoor" : def.client.name, purpose: "Issued for client review", channel: "Email", dateIssued: dayOffset(-5 - pi), notes: "Demo transmittal showing how drawing/document issue registers behave.", createdById: principal!.id }).returning();
    await db.insert(transmittalItems).values([
      { transmittalId: tx!.id, drawingRef: `${ref}-A-101`, title: "Ground floor plan", rev: pi < 4 ? "R1" : "R0", copies: 1 },
      { transmittalId: tx!.id, drawingRef: `${ref}-A-201`, title: pi < 4 ? "Front elevation" : "Typical elevation", rev: "R0", copies: 1 },
    ]);

    // Approvals
    await db.insert(approvals).values({ projectId, entityType: "DRAWING_SET", title: "Schematic design package", recipient: pi === 3 ? "Divya Kapoor" : def.client.name, channel: "Client portal", status: pi % 2 === 0 ? "SENT" : "DRAFT", sentDate: pi % 2 === 0 ? dayOffset(-6 - pi) : null, responseDate: pi === 0 ? dayOffset(-2) : null, remarks: pi === 0 ? "Approved with facade material comments." : pi % 2 === 0 ? "Awaiting client review." : null, createdById: principal!.id });

    // Inspection
    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({ ref: insRef, projectId, dateVisit: dayOffset(-2 + pi), weather: pi % 3 === 0 ? "Clear" : pi % 3 === 1 ? "Partly cloudy" : "Overcast", attendees: "Site supervisor, contractor, project lead", progress: pi % 2 === 0 ? "RCC slab reinforcement completed for review." : "Masonry and services chase marking in progress.", observations: "Site housekeeping acceptable; contractor to protect exposed starter bars.", instructions: "Submit bar bending schedule and pour card before next inspection.", nextVisit: dayOffset(5 + pi), inspectorName: "Rahul Nair" });

    // Tasks with ASPRF dimensions
    const taskDefs = taskDefsByProject[pi] ?? [];
    await db.insert(tasks).values(
      taskDefs.map((t) => ({
        title: `${t.title} (${ref})`,
        projectId,
        assignee: t.assignee,
        assigneeId: memberByName.get(t.assignee) ?? null,
        priority: t.priority,
        status: t.status,
        dueDate: t.due,
        classification: t.classification,
        workType: t.workType,
        difficultyCoefficient: t.difficulty,
        estimatedHours: t.hours,
        createdById: principal!.id,
      })),
    );

    // Decisions (CRIF entries)
    await db.insert(decisions).values([
      {
        projectId,
        title: pi === 0 ? "Switch facade material from brick to ACM cladding" : pi === 1 ? "Adopt courtyard scheme over linear layout" : pi === 2 ? "Increase floor-to-floor height by 150mm" : pi === 3 ? "Add a home office pod on terrace" : pi === 4 ? "Adopt unitised facade system" : pi === 5 ? "Include covered badminton court in expansion" : pi === 6 ? "Reduce built-up area to meet CRZ norms" : "Open-plan vs cellular office decision",
        rationale: "Client preference confirmed after presentation; engineering clearance awaited.",
        approval: "PENDING",
        impact: pi >= 4 ? "HIGH" : "MEDIUM",
        status: "OPEN",
        state: pi % 3 === 0 ? "CLIENT_REVIEW" : pi % 3 === 1 ? "OPEN" : "ACCEPTED",
        revisionCategory: pi < 2 ? "MAJOR" : pi < 5 ? "MINOR" : "CRITICAL",
        revisionSource: pi % 4 === 0 ? "CLIENT_DRIVEN" : pi % 4 === 1 ? "TECHNICAL_QUERY" : pi % 4 === 2 ? "SCOPE_CHANGE" : "INTERNAL_ERROR",
        ownerName: "Aarav Mehta",
        actorName: "Vihaan Sharma",
        reviewDeadline: dayOffset(5 + pi),
      },
      {
        projectId,
        title: pi === 0 ? "Relocate main staircase to east core" : pi === 1 ? "Change roof to sloped tiled finish" : pi === 2 ? "Add basement level-2 parking" : pi === 3 ? "Use SBA system for first-floor structure" : pi === 4 ? "Centralise MEP shaft location" : pi === 5 ? "Double the library area" : pi === 6 ? "Use rammed earth for garden boundary wall" : "Raise raised floor for cable management",
        rationale: "Coordination review highlighted a clash with the lift lobby; revised layout resolves it.",
        approval: pi % 2 === 0 ? "APPROVED" : "PENDING",
        impact: "LOW",
        status: pi % 2 === 0 ? "CLOSED" : "OPEN",
        state: pi % 2 === 0 ? "LOCKED" : "OPEN",
        revisionCategory: "MINOR",
        revisionSource: "INTERNAL_ERROR",
        ownerName: "Sneha Rao",
        actorName: "Aarav Mehta",
        reviewDeadline: dayOffset(10),
      },
    ]);

    // Critical notes
    await db.insert(criticalNotes).values([
      {
        projectId,
        title: pi === 0 ? "Facade approval: awaiting structural NOC for ACM anchors" : pi === 1 ? "MUDA permit: resubmission required — site area discrepancy" : pi === 2 ? "Verde: fire NOC from local authority pending 6 weeks" : pi === 3 ? "Kapoor: client abroad until 25th, defer approvals" : pi === 4 ? "Patel HQ: geotechnical report recommends pile foundation" : pi === 5 ? "School: asbestos found in existing roof — specialist disposal needed" : pi === 6 ? "Goa: CRZ notification area measurement under dispute" : "Nexus: scope change request from client — interior area added",
        category: pi % 3 === 0 ? "PERMIT" : pi % 3 === 1 ? "DESIGN" : "CLIENT",
        priority: pi < 3 ? "HIGH" : pi < 6 ? "MEDIUM" : "LOW",
        status: pi === 7 ? "CLOSED" : "OPEN",
        visibility: "STAFF",
        owner: "Aarav Mehta",
        dueDate: dayOffset(7 + pi),
        body: "This issue requires immediate attention and coordination with the consultant team before the next billing milestone.",
      },
    ]);

    // Bylaw calc — shared BBMP engine (Compliance tab on project detail)
    const siteAreaSqm = 300 + pi * 80;
    await upsertDemoBylawCalc(db, projectId, pi, siteAreaSqm);

    // Client log entries
    await db.insert(clientLogs).values([
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-30 - pi), subject: "Project briefing", body: "Initial scope, budget and timeline discussed. Client signed off on Letter of Appointment.", createdById: principal!.id },
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-7), subject: "Design review meeting", body: "Walked the client through schematic options; client preferred Option B with a courtyard.", createdById: principal!.id },
      { projectId, clientId: def.client.id, kind: "EMAIL", occurredAt: dayOffset(-3 - pi), subject: "Revised drawings shared", body: "Sent revised floor plans incorporating client feedback from last meeting.", createdById: principal!.id },
    ]);

    pi++;
  }

  // ── Attendance: past 20 weekdays (office register) ────────────────────────
  const weekdays = recentWeekdays(20);
  const memberId = {
    vihaan: memberByName.get("Vihaan Sharma")!,
    aarav: memberByName.get("Aarav Mehta")!,
    rahul: memberByName.get("Rahul Nair")!,
    sneha: memberByName.get("Sneha Rao")!,
    kiran: memberByName.get("Kiran Patel")!,
  };

  const attendanceRows: {
    teamMemberId: string;
    attendanceDate: string;
    status: string;
    markedById: string;
  }[] = [];

  for (let i = 0; i < weekdays.length; i++) {
    const d = dayOffset(weekdays[i]!);
    attendanceRows.push(
      { teamMemberId: memberId.vihaan, attendanceDate: d, status: "PRESENT", markedById: principal!.id },
      { teamMemberId: memberId.aarav, attendanceDate: d, status: i % 7 === 0 ? "WFH" : "PRESENT", markedById: principal!.id },
      { teamMemberId: memberId.rahul, attendanceDate: d, status: i % 9 === 0 ? "ABSENT" : "PRESENT", markedById: principal!.id },
      { teamMemberId: memberId.sneha, attendanceDate: d, status: i % 11 === 0 ? "HALF_DAY" : "PRESENT", markedById: principal!.id },
    );
    if (i < 15) {
      attendanceRows.push({
        teamMemberId: memberId.kiran,
        attendanceDate: d,
        status: "PRESENT",
        markedById: principal!.id,
      });
    }
  }

  for (let i = 0; i < attendanceRows.length; i += 50) {
    await db.insert(attendance).values(attendanceRows.slice(i, i + 50));
  }

  // ── Reward points ─────────────────────────────────────────────────────────
  await db.insert(rewardPoints).values([
    { teamMemberId: memberId.aarav, points: 50, reason: "Excellent client presentation for Patel HQ board — design approved first time.", awardType: "CLIENT_IMPACT", createdById: principal!.id },
    { teamMemberId: memberId.aarav, points: 30, reason: "Resolved structural coordination clash in Verde Block without project delay.", awardType: "QUALITY", createdById: principal!.id },
    { teamMemberId: memberId.sneha, points: 40, reason: "Delivered full GFC drawing set for Verde one week ahead of schedule.", awardType: "RELIABILITY", createdById: principal!.id },
    { teamMemberId: memberId.sneha, points: 25, reason: "Highest drawing accuracy this quarter — zero returned drawings from consultant.", awardType: "QUALITY", createdById: principal!.id },
    { teamMemberId: memberId.rahul, points: 35, reason: "Proactive slab quality check averted a pour failure at Sharma Villa.", awardType: "RELIABILITY", createdById: principal!.id },
    { teamMemberId: memberId.rahul, points: 20, reason: "Completed 30-day site diary without a single missed entry.", awardType: "RELIABILITY", createdById: principal!.id },
    { teamMemberId: memberId.vihaan, points: 60, reason: "Landed Patel Corp HQ — largest project by value in firm history.", awardType: "CLIENT_IMPACT", createdById: principal!.id },
    { teamMemberId: memberId.kiran, points: 20, reason: "Completed BOQ for Verde with zero quantity errors on first check.", awardType: "QUALITY", createdById: principal!.id },
    { teamMemberId: memberId.aarav, points: 15, reason: "Mentored Kiran on AORMS BOQ workflow — knowledge sharing.", awardType: "COLLABORATION", createdById: principal!.id },
    { teamMemberId: memberId.sneha, points: 15, reason: "Took initiative on St. Francis site survey outside scheduled hours.", awardType: "RELIABILITY", createdById: principal!.id },
  ]);

  // ── Comments on project decisions ────────────────────────────────────────
  await db.insert(comments).values([
    { projectId: allProjectIds[0]!, objectType: "decision", objectId: allProjectRefs[0]!, body: "Structural team has reviewed the ACM anchor loads — within slab capacity. Proceeding to facade contractor shortlist.", actorName: "Aarav Mehta", visibility: "STAFF" },
    { projectId: allProjectIds[2]!, objectType: "decision", objectId: allProjectRefs[2]!, body: "Verde client confirmed the additional 150mm floor height — cost impact accepted. Updating drawings.", actorName: "Sneha Rao", visibility: "STAFF" },
    { projectId: allProjectIds[4]!, objectType: "decision", objectId: allProjectRefs[4]!, body: "Unitised facade supplier shortlisted to three vendors. Requesting mock-up proposals from all three.", actorName: "Aarav Mehta", visibility: "STAFF" },
  ]);

  console.log("✓ seeded demo workspace");
  console.log(`    principal: ${principalEmail} / ${DEMO_PASSWORD}`);
  console.log("    lead@ / site@ / junior@ / intern@ / client@demo.aorms.in (same password)");
  console.log("    Solo demo: solo@demo.aorms.in (pnpm seed:demo:solo)");
  console.log(`    ${projectDefs.length} projects, ${attendanceRows.length} attendance entries`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo seed failed:", err);
    process.exit(1);
  });
