/**
 * Demo-seed v3 — consultancy workspace tuned for Studio Intelligence.
 *
 *   pnpm --filter @esti/backend seed:demo
 *   (or: podman exec esti-backend sh -c "cd /app/esti/backend && pnpm seed:demo")
 *
 * Idempotent — skips full re-seed if principal@demo.aorms.in already exists
 * (still backfills studio glance / team / leads). Set SEED_DEMO_FORCE=1 to wipe
 * and rebuild. Item inventory: docs/esti/DEMO-SEED-ITEMS.md
 *
 * NOT for production use.
 */

import { DEFAULT_PHASE_PLAN } from "@esti/contracts";
import { eq, inArray } from "drizzle-orm";
import { sql as rawSql } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  approvals,
  assignments,
  clientLogs,
  clients,
  comments,
  consultants,
  contractors,
  criticalNotes,
  decisions,
  engagements,
  proposals,
  inspections,
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
  users,
} from "../db/schema.js";
import { getOrgSettings } from "../lib/settings.js";
import { nextRef } from "../lib/numbering.js";
import { firmGstSystem } from "../lib/firm.js";
import { ensureDefaultAccounts } from "../modules/expense/accounts.js";
import { ensureDemoPlatformAccount } from "../lib/demoPlatformSeed.js";
import { ensureAiStudioEnabled } from "./seedAiStudio.js";
import {
  clearStudioDemoRows,
  dayOffset,
  DEMO_LEADS,
  linkPhasesAndBilling,
  patchDemoApprovalSignals,
  rebalanceDemoTaskAssignees,
  seedDemoTeamRoster,
  seedDemoTakeoff,
  seedStudioGlanceAndLeads,
  upsertDemoFirm,
} from "./demoStudioSeed.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

const DEMO_EMAILS = [
  "principal@demo.aorms.in", "lead@demo.aorms.in", "site@demo.aorms.in",
  "junior@demo.aorms.in", "intern@demo.aorms.in", "accounts@demo.aorms.in", "client@demo.aorms.in",
  "contractor@demo.aorms.in",
];

async function clearDemoWorkspace(principalId: string) {
  await db.execute(rawSql`SET session_replication_role = 'replica'`);
  try {
    await clearStudioDemoRows(db, principalId);
    await db.delete(projectOffices).where(eq(projectOffices.createdById, principalId));
    await db.delete(contractors).where(eq(contractors.createdById, principalId));
    await db.delete(teamMembers).where(inArray(teamMembers.email, DEMO_EMAILS));
    await db.delete(users).where(inArray(users.email, DEMO_EMAILS));
  } finally {
    await db.execute(rawSql`SET session_replication_role = 'origin'`);
  }
  console.log("  cleared old demo workspace");
}

async function backfillStudioDemo(principalId: string, pwHash: string): Promise<void> {
  const memberIds = await seedDemoTeamRoster(db, principalId, pwHash);
  await upsertDemoFirm(db);
  await ensureDemoPlatformAccount(DEMO_PASSWORD);
  const projectRows = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.createdById, principalId));
  const projectIds = projectRows.map((p) => p.id);
  await seedStudioGlanceAndLeads(db, principalId, projectIds, memberIds);
  await patchDemoApprovalSignals(db, projectIds, principalId);
  await rebalanceDemoTaskAssignees(db);
  if (projectIds[0]) await seedDemoTakeoff(db, projectIds[0]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const principalEmail = "principal@demo.aorms.in";

  // Seed the default chart of accounts up front (idempotent) so the office cash
  // book / expenses work out of the box — even on an already-seeded demo where
  // the rest of this script short-circuits below.
  await ensureDefaultAccounts(db);

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, principalEmail));
  const pwHash = await hashPassword(DEMO_PASSWORD);
  if (exists && !process.env.SEED_DEMO_FORCE) {
    await backfillStudioDemo(exists.id, pwHash);
    console.log("✓ demo workspace present — studio backfill applied (SEED_DEMO_FORCE=1 to wipe and re-seed)");
    console.log(`    company account: ${principalEmail} / ${DEMO_PASSWORD}`);
    return;
  }
  if (exists && process.env.SEED_DEMO_FORCE) {
    console.log("  SEED_DEMO_FORCE=1 — clearing old demo workspace first...");
    await clearDemoWorkspace(exists.id);
  }

  const gstType = await firmGstSystem(db);
  const settings = await getOrgSettings(db);
  await db.update(orgSettings).set({ hrEnabled: true, orgMode: "STUDIO" }).where(eq(orgSettings.id, settings.id));
  await ensureAiStudioEnabled(db);
  await upsertDemoFirm(db);

  // ── Principal user ────────────────────────────────────────────────────────
  const [principalMaybe] = await db.insert(users).values({
    email: principalEmail, fullName: "Ar. Vihaan Sharma (Principal)", role: "OWNER",
    passwordHash: pwHash, isDemo: true,
  }).returning();
  if (!principalMaybe) throw new Error("principal insert failed");
  const principal = principalMaybe;

  await ensureDemoPlatformAccount(DEMO_PASSWORD);

  const memberIds = await seedDemoTeamRoster(db, principal.id, pwHash);
  const mid = memberIds;

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientRows = await db.insert(clients).values([
    { name: "Sharma Residences LLP",                    kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "projects@sharmares.in",     phone: "+91 98450 11111" },
    { name: "Anita Rao",                                 kind: "INDIVIDUAL", city: "Mysuru",    state: "Karnataka",     email: "anita.rao@example.in",       phone: "+91 98860 22222" },
    { name: "Verde Developers Pvt Ltd",                  kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "build@verde.in",             phone: "+91 80471 33333" },
    { name: "Kapoor Family",                             kind: "INDIVIDUAL", city: "Bengaluru", state: "Karnataka",     email: "client@demo.aorms.in",       phone: "+91 99000 44444" },
    { name: "Patel Enterprises Pvt Ltd",                 kind: "COMPANY",    city: "Pune",      state: "Maharashtra",   email: "infra@pateletp.in",          phone: "+91 98220 55555" },
    { name: "Diocese of Bengaluru Education Society",    kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "projects@dioceseedu.in",     phone: "+91 80471 66666" },
    { name: "Priya Reddy",                               kind: "INDIVIDUAL", city: "Panaji",    state: "Goa",           email: "priya.reddy@example.in",     phone: "+91 98230 77777" },
    { name: "Nexus Cowork Pvt Ltd",                      kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "design@nexuscowork.in",      phone: "+91 80471 88888" },
    { name: "Sunrise Hospitality Pvt Ltd",               kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "projects@sunrisehotels.in",  phone: "+91 80471 99001" },
    { name: "Dr. Arvind Nair",                           kind: "INDIVIDUAL", city: "Mangaluru", state: "Karnataka",     email: "arvind.nair@example.in",     phone: "+91 98860 99002" },
    { name: "GreenField Industries Ltd",                 kind: "COMPANY",    city: "Hosur",     state: "Tamil Nadu",    email: "works@greenfieldind.in",     phone: "+91 90030 99003" },
    { name: "Lakeview Realty LLP",                       kind: "COMPANY",    city: "Hyderabad", state: "Telangana",     email: "build@lakeviewrealty.in",    phone: "+91 90000 99004" },
    { name: "Meghana Foundation Trust",                  kind: "COMPANY",    city: "Bengaluru", state: "Karnataka",     email: "office@meghanatrust.in",     phone: "+91 80471 99005" },
    { name: "Tanvi Desai",                               kind: "INDIVIDUAL", city: "Belagavi",  state: "Karnataka",     email: "tanvi.desai@example.in",     phone: "+91 98450 99006" },
  ]).returning();

  // ── Consultants ───────────────────────────────────────────────────────────
  const consultantRows = await db.insert(consultants).values([
    { name: "Prakash Iyer",       discipline: "Structural",    firm: "Iyer Structural Studio",    email: "prakash@iyerstruct.in",  phone: "+91 98450 55501" },
    { name: "Meera Menon",        discipline: "MEP",           firm: "Circuit & Flow Engineers",  email: "meera@circuitflow.in",   phone: "+91 98450 55502" },
    { name: "Naveen Das",         discipline: "Landscape",     firm: "Canopy Works",              email: "naveen@canopyworks.in",  phone: "+91 98450 55503" },
    { name: "Suresh Venkataraman",discipline: "Geotechnical",  firm: "SV Geo Consultants",        email: "suresh@svgeo.in",        phone: "+91 98450 55504" },
    { name: "Kavitha Krishnan",   discipline: "Interior",      firm: "KK Design Studio",          email: "kavitha@kkdesign.in",    phone: "+91 98450 55505" },
  ]).returning();

  // ── Contractors ───────────────────────────────────────────────────────────
  await db.insert(contractors).values([
    { name: "Vinayaka Civil Works",      category: "Civil",     companyName: "Vinayaka Civil Works Pvt Ltd",    email: "contracts@vinayakacivil.in",  phone: "+91 98440 10001", city: "Bengaluru", state: "Karnataka", qualityRating: 4, timelinessRating: 4, safetyRating: 4, createdById: principal.id },
    { name: "Sairam Structural Systems", category: "Structural", companyName: "Sairam Structural Pvt Ltd",       email: "info@sairamstruct.in",        phone: "+91 98440 10002", city: "Bengaluru", state: "Karnataka", qualityRating: 5, timelinessRating: 4, safetyRating: 3, createdById: principal.id },
    { name: "Bright MEP Solutions",      category: "MEP",       companyName: "Bright Engineering Services",     email: "mep@brighteng.in",            phone: "+91 98440 10003", city: "Bengaluru", state: "Karnataka", qualityRating: 3, timelinessRating: 3, safetyRating: 4, createdById: principal.id },
    { name: "Sunil Roofing & Waterproof",category: "Finishes",  companyName: "Sunil Roofing Works",             email: "sunil@srwroofing.in",          phone: "+91 98440 10004", city: "Bengaluru", state: "Karnataka", qualityRating: 4, timelinessRating: 3, safetyRating: 3, createdById: principal.id },
    { name: "Apex Interior Fit-out",     category: "Interior",  companyName: "Apex Interiors Pvt Ltd",          email: "projects@apexinteriors.in",   phone: "+91 98440 10005", city: "Bengaluru", state: "Karnataka", qualityRating: 4, timelinessRating: 4, safetyRating: 4, createdById: principal.id },
  ]).returning();

  // ── Projects ──────────────────────────────────────────────────────────────
  type ProjDef = {
    client: typeof clientRows[0];
    title: string;
    projectType: string;
    value: number;
    status: string;
    phaseProgress: number;
  };

  const projectDefs: ProjDef[] = [
    { client: clientRows[0]!,  title: "Sharma Villa — Whitefield",              projectType: "Residential Architecture",  value: 45_00_00_000,  status: "ACTIVE",    phaseProgress: 3 },
    { client: clientRows[1]!,  title: "Rao House — Mysuru",                     projectType: "Residential Architecture",  value:  1_20_00_000,  status: "ACTIVE",    phaseProgress: 1 },
    { client: clientRows[2]!,  title: "Verde Commercial Block",                  projectType: "Commercial Architecture",   value:  8_50_00_000,  status: "ACTIVE",    phaseProgress: 2 },
    { client: clientRows[3]!,  title: "Kapoor Residence — Sarjapur",             projectType: "Residential Architecture",  value:  2_10_00_000,  status: "ACTIVE",    phaseProgress: 0 },
    { client: clientRows[4]!,  title: "Patel Corp HQ — Pune",                   projectType: "Commercial Architecture",   value: 22_50_00_000,  status: "ACTIVE",    phaseProgress: 2 },
    { client: clientRows[5]!,  title: "St. Francis School Expansion",            projectType: "Institutional Architecture",value:  6_80_00_000,  status: "ACTIVE",    phaseProgress: 1 },
    { client: clientRows[6]!,  title: "Reddy Beach Retreat — Goa",              projectType: "Residential Architecture",  value:  3_40_00_000,  status: "ON_HOLD",   phaseProgress: 1 },
    { client: clientRows[7]!,  title: "Nexus Co-working — Koramangala",         projectType: "Interior Design",           value:  1_85_00_000,  status: "COMPLETE",  phaseProgress: 6 },
    { client: clientRows[8]!,  title: "Sunrise Boutique Hotel — Indiranagar",   projectType: "Commercial Architecture",   value: 12_00_00_000,  status: "ACTIVE",    phaseProgress: 2 },
    { client: clientRows[9]!,  title: "Nair Wellness Clinic — Mangaluru",       projectType: "Institutional Architecture",value:    95_00_000,  status: "ACTIVE",    phaseProgress: 1 },
    { client: clientRows[10]!, title: "GreenField Factory Shed — Hosur",        projectType: "Industrial Architecture",   value: 18_00_00_000,  status: "ACTIVE",    phaseProgress: 3 },
    { client: clientRows[11]!, title: "Lakeview Apartments — Hyderabad",        projectType: "Residential Architecture",  value: 32_00_00_000,  status: "PROPOSAL",  phaseProgress: 0 },
    { client: clientRows[12]!, title: "Meghana Community Centre",               projectType: "Institutional Architecture",value:  4_20_00_000,  status: "ACTIVE",    phaseProgress: 1 },
    { client: clientRows[13]!, title: "Desai Villa — Belagavi",                 projectType: "Residential Architecture",  value:  1_60_00_000,  status: "ON_HOLD",   phaseProgress: 1 },
  ];

  const taskDefsByProject: Array<Array<{
    title: string; assignee: string; priority: string; due: string; status: string;
    classification: string; workType: string; difficulty: number; hours: string;
    interventionRequired?: boolean;
  }>> = [
    // 0 — Sharma Villa (construction active → intervention on some tasks)
    [
      { title: "Issue GFC drawings — ground floor",         assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "8.00" },
      { title: "Site visit — RCC slab reinforcement check", assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(0),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "4.00", interventionRequired: true },
      { title: "Coordinate structural consultant: column schedule", assignee: "Vihaan Sharma", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "6.00" },
      { title: "Finalise BOQ for Variation Order #2",       assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(-3), status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 4, hours: "12.00", interventionRequired: true },
      { title: "Prepare client progress presentation",      assignee: "Vihaan Sharma",    priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "5.00" },
      { title: "Update AORMS project timeline",             assignee: "Vihaan Sharma",    priority: "LOW",    due: dayOffset(3),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "2.00" },
    ],
    // 1 — Rao House
    [
      { title: "Schematic design options — A & B",          assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "16.00" },
      { title: "Client meeting — finalize scheme",          assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
      { title: "Submit permit drawings to MUDA",            assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(8),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "10.00" },
      { title: "Prepare GST invoice — Milestone 1",         assignee: "Vihaan Sharma",priority: "MEDIUM", due: dayOffset(0),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
    // 2 — Verde Commercial Block
    [
      { title: "GFC drawing set — typical floor",           assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 5, hours: "24.00" },
      { title: "Facade mock-up review on site",             assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 3, hours: "6.00" },
      { title: "MEP coordination meeting",                  assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(0),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "4.00" },
      { title: "Issue revised parking layout",              assignee: "Vihaan Sharma",    priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "6.00" },
      { title: "BBMP occupancy certificate follow-up",      assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "3.00" },
    ],
    // 3 — Kapoor Residence
    [
      { title: "Inception meeting — site visit",            assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(0),  status: "DONE",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "4.00" },
      { title: "Site measurement and survey notes",         assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(-3), status: "DONE",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "6.00" },
      { title: "Brief & design programme document",         assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(2),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "4.00" },
      { title: "Fee proposal — architecture scope",         assignee: "Vihaan Sharma",priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
    ],
    // 4 — Patel Corp HQ
    [
      { title: "Concept design — board review presentation",assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(-1), status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 4, hours: "12.00" },
      { title: "Structural grid coordination",              assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "8.00" },
      { title: "Fire NOC documentation",                    assignee: "Vihaan Sharma",    priority: "MEDIUM", due: dayOffset(7),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "6.00" },
      { title: "Landscape design brief to Canopy Works",    assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 2, hours: "3.00" },
      { title: "Geotechnical report review",                assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "4.00" },
    ],
    // 5 — St. Francis School
    [
      { title: "Site context study — existing building survey", assignee: "Vihaan Sharma", priority: "HIGH",  due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "8.00" },
      { title: "Educational space programming brief",        assignee: "Vihaan Sharma", priority: "HIGH",   due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "6.00" },
      { title: "Classroom block schematic options",          assignee: "Vihaan Sharma",   priority: "MEDIUM", due: dayOffset(8),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "16.00" },
      { title: "Diocese board presentation",                 assignee: "Vihaan Sharma",priority: "HIGH",  due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "4.00" },
    ],
    // 6 — Reddy Beach Retreat
    [
      { title: "CRZ compliance assessment",                  assignee: "Vihaan Sharma", priority: "HIGH",   due: dayOffset(-15), status: "DONE",       classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 5, hours: "10.00" },
      { title: "Schematic design — beach-facing elevation",  assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(-5),  status: "DONE",       classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "14.00" },
      { title: "ON HOLD — resume after client confirms budget", assignee: "Vihaan Sharma", priority: "LOW", due: dayOffset(30), status: "TODO",      classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
    // 7 — Nexus Co-working (COMPLETE)
    [
      { title: "As-built drawings archive",                  assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(-10), status: "DONE",      classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "8.00" },
      { title: "Final invoice and project closure",          assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(-7),  status: "DONE",      classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "2.00" },
    ],
    // 8 — Sunrise Boutique Hotel
    [
      { title: "Guest-room module design study",             assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "14.00" },
      { title: "Lobby & F&B concept presentation",           assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "8.00" },
      { title: "Fire & life-safety strategy",                assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(6),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "6.00" },
      { title: "Site visit — basement excavation review",    assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(-1), status: "TODO",        classification: "BILLABLE",    workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "4.00" },
    ],
    // 9 — Nair Wellness Clinic
    [
      { title: "Functional brief — consulting & diagnostics",assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "5.00" },
      { title: "Schematic plan — ground floor",              assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "10.00" },
      { title: "Accessibility & ramp compliance check",      assignee: "Vihaan Sharma",    priority: "MEDIUM", due: dayOffset(7),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "4.00" },
    ],
    // 10 — GreenField Factory Shed (construction showcase project #2)
    [
      { title: "Pre-engineered building grid layout",        assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "12.00" },
      { title: "Crane gantry structural coordination",       assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 5, hours: "10.00" },
      { title: "GFC roofing & cladding details",             assignee: "Vihaan Sharma",    priority: "MEDIUM", due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 4, hours: "16.00" },
      { title: "Procure reinforcement steel — Gr. Fe 500",   assignee: "Vihaan Sharma",   priority: "HIGH",   due: dayOffset(-4), status: "TODO",        classification: "BILLABLE",    workType: "CONSTRUCTION_SUPPORT",  difficulty: 3, hours: "4.00", interventionRequired: true },
      { title: "Steel BBS for primary columns",              assignee: "Vihaan Sharma",  priority: "LOW",    due: dayOffset(6),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "8.00" },
    ],
    // 11 — Lakeview Apartments (PROPOSAL)
    [
      { title: "Feasibility massing study — FAR check",     assignee: "Vihaan Sharma",  priority: "HIGH",   due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "8.00" },
      { title: "Fee proposal & COA benchmarking",           assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "NON_BILLABLE",workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
    ],
    // 12 — Meghana Community Centre
    [
      { title: "Multipurpose hall acoustic study",          assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "8.00" },
      { title: "Community needs workshop with trust",       assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "4.00" },
      { title: "Sustainable materials specification",       assignee: "Vihaan Sharma",  priority: "MEDIUM", due: dayOffset(9),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "6.00" },
    ],
    // 13 — Desai Villa (ON_HOLD)
    [
      { title: "Concept design — courtyard villa",          assignee: "Vihaan Sharma",    priority: "HIGH",   due: dayOffset(-8), status: "DONE",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "12.00" },
      { title: "ON HOLD — await site finalisation",         assignee: "Vihaan Sharma",priority: "LOW",    due: dayOffset(25), status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
  ];

  const allProjectIds: string[] = [];
  const allProjectRefs: string[] = [];


  let pi = 0;
  for (const def of projectDefs) {
    const { ref } = await nextRef(db, "projectoffice", "PRJ");
    const [project] = await db.insert(projectOffices).values({
      ref,
      title: def.title,
      projectType: def.projectType,
      jurisdiction: "BBMP",
      status: def.status,
      clientId: def.client.id,
      state: def.client.state ?? "Karnataka",
      contractValuePaise: def.value,
      createdById: principal.id,
    }).returning();
    const projectId = project!.id;
    allProjectIds.push(projectId);
    allProjectRefs.push(ref);

    await db.insert(phases).values(DEFAULT_PHASE_PLAN.map((st, idx) => ({
      projectId,
      code: st.code,
      label: st.label,
      billingPct: st.billingPct,
      sortOrder: idx,
      status: idx < def.phaseProgress ? "COMPLETE" : idx === def.phaseProgress ? "IN_PROGRESS" : "NOT_STARTED",
    })));

    const { ref: feeRef } = await nextRef(db, "feeproposal", "FEE");
    await db.insert(proposals).values({
      ref: feeRef, projectId, workCategory: "ARCHITECTURE",
      costOfWorksPaise: def.value, feePaise: Math.round(def.value * 0.08),
      docCommPct: 10, coaMinimumPaise: 0, belowMinimum: false,
    });

    await linkPhasesAndBilling(
      db,
      projectId,
      def.client.id,
      def.value,
      def.phaseProgress,
      pi,
      gstType,
      def.client.state !== "Karnataka",
    );

    const { ref: pmtRef } = await nextRef(db, "permit", "PMT");
    await db.insert(permits).values({
      ref: pmtRef, projectId, permitType: "Building plan sanction",
      authority: def.client.state === "Goa" ? "TCP Goa" : def.client.state === "Maharashtra" ? "PMRDA" : "BBMP",
      applicationNo: `BBMP/${2026}/${1000 + pi}`,
      status: pi < 3 ? "SUBMITTED" : pi === 4 ? "SUBMITTED" : "NOT_STARTED",
      dateSubmitted: pi < 3 || pi === 4 ? dayOffset(-30 - pi * 3) : null,
      dateDue: dayOffset(10 + pi * 3),
    });

    await db.insert(assignments).values([
      { projectId, teamMemberId: mid.get("Vihaan Sharma")!, role: "Principal Architect" },
      { projectId, teamMemberId: mid.get("Ananya Iyer")!, role: "Design Lead" },
      ...(pi < 4 ? [{ projectId, teamMemberId: mid.get("Rahul Menon")!, role: "Site Architect" }] : []),
    ]);

    await db.insert(engagements).values([
      { projectId, consultantId: consultantRows[0]!.id, scope: "RCC structural design, GFC review and site clarifications", agreedFeePaise: Math.round(def.value * 0.006), paidPaise: pi % 2 === 0 ? Math.round(def.value * 0.002) : 0, status: "ENGAGED" },
      { projectId, consultantId: consultantRows[1]!.id, scope: "Electrical, plumbing and fire-fighting coordination",       agreedFeePaise: Math.round(def.value * 0.004), paidPaise: 0,                                                  status: pi === 3 ? "PROPOSED" : "ENGAGED" },
    ]);

    const { ref: specRef } = await nextRef(db, "specsheet", "SPEC");
    const [spec] = await db.insert(specSheets).values({ ref: specRef, projectId, title: "Interior material schedule" }).returning();
    await db.insert(specItems).values([
      { specSheetId: spec!.id, item: "Vitrified tile 600×600 glossy", category: "Flooring", specification: "Grade A / 8mm thickness", sortOrder: 10 },
      { specSheetId: spec!.id, item: "Pre-laminated flush door shutters", category: "Joinery", specification: "18mm BWR ply core, pre-lam both faces", sortOrder: 20 },
    ]);

    const { ref: poRef } = await nextRef(db, "purchaseorder", "PO");
    const [po] = await db.insert(purchaseOrders).values({ ref: poRef, projectId, vendor: pi % 2 === 0 ? "BuildMart Bengaluru" : "Studio Materials Co.", title: "Sample and site procurement", status: pi % 2 === 0 ? "ISSUED" : "DRAFT", datePo: dayOffset(-12 + pi), notes: "Sample procurement for review.", totalPaise: 2_85_000_00 }).returning();
    await db.insert(poItems).values([
      { poId: po!.id, description: "Vitrified tile sample batch", unit: "box", qty: 15, ratePaise: 12_000_00, amountPaise: 1_80_000_00, sortOrder: 1 },
      { poId: po!.id, description: "Laminate swatch boards",       unit: "set", qty:  3, ratePaise: 35_000_00, amountPaise: 1_05_000_00, sortOrder: 2 },
    ]);

    const { ref: txRef } = await nextRef(db, "transmittal", "TX");
    const [tx] = await db.insert(transmittals).values({ ref: txRef, projectId, recipient: def.client.name, purpose: "Issued for client review", channel: "Email", dateIssued: dayOffset(-5 - pi), notes: "Demo transmittal.", createdById: principal.id }).returning();
    await db.insert(transmittalItems).values([
      { transmittalId: tx!.id, drawingRef: `${ref}-A-101`, title: "Ground floor plan", rev: "R1", copies: 1 },
      { transmittalId: tx!.id, drawingRef: `${ref}-A-201`, title: "Front elevation",   rev: "R0", copies: 1 },
    ]);

    const approvalStale = [0, 2, 4].includes(pi);
    await db.insert(approvals).values({
      projectId,
      entityType: "DRAWING_SET",
      title: "Schematic design package",
      recipient: def.client.name,
      channel: "Client portal",
      status: pi % 2 === 0 ? "SENT" : "DRAFT",
      sentDate: pi % 2 === 0 ? dayOffset(approvalStale ? -18 : -5) : null,
      responseDate: pi === 0 ? dayOffset(-2) : null,
      remarks: pi === 0 ? "Approved with facade comments." : null,
      createdById: principal.id,
    });
    if (pi === 0 || pi === 2) {
      await db.insert(approvals).values({
        projectId,
        entityType: "DRAWING_SET",
        title: "Facade revision — client comments",
        recipient: def.client.name,
        channel: "Client portal",
        status: "REVISIONS",
        sentDate: dayOffset(-9),
        remarks: "ACM panel colour and joint width to be revised.",
        createdById: principal.id,
      });
    }

    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({ ref: insRef, projectId, dateVisit: dayOffset(-2 + pi), weather: "Clear", attendees: "Site supervisor, contractor, project lead", progress: "Masonry work in progress at ground floor.", observations: "Site housekeeping acceptable.", instructions: "Submit bar bending schedule before next slab pour.", nextVisit: dayOffset(5 + pi), inspectorName: "Vihaan Sharma" });

    // Tasks
    const taskDefs = taskDefsByProject[pi] ?? [];
    await db.insert(tasks).values(taskDefs.map((t) => ({
      title: `${t.title} (${ref})`,
      projectId,
      assignee: t.assignee,
      assigneeId: mid.get(t.assignee) ?? null,
      priority: t.priority,
      status: t.status,
      dueDate: t.due,
      classification: t.classification,
      workType: t.workType,
      difficultyCoefficient: t.difficulty,
      estimatedHours: t.hours,
      interventionRequired: t.interventionRequired ?? false,
      createdById: principal.id,
    })));

    // Decisions
    const decisionTitles = ["Switch facade material to ACM cladding", "Relocate staircase to east core", "Increase floor-to-floor height", "Add basement level-2 parking", "Adopt unitised facade system", "Include covered sports court", "Reduce built-up area (CRZ)", "Open-plan vs cellular layout", "Guest room module reconfiguration", "Ramp vs lift for accessibility", "PEB grid vs conventional RCC", "Revise FAR calc after survey", "Hall partition system change", "Courtyard pool addition request"];
    await db.insert(decisions).values([
      { projectId, title: decisionTitles[pi % decisionTitles.length]!, rationale: "Client preference after presentation; engineering review in progress.", approval: "PENDING", impact: pi >= 4 ? "HIGH" : "MEDIUM", status: "OPEN", state: pi % 3 === 0 ? "CLIENT_REVIEW" : "OPEN", revisionCategory: pi < 2 ? "MAJOR" : "MINOR", revisionSource: pi % 2 === 0 ? "CLIENT_DRIVEN" : "TECHNICAL_QUERY", ownerName: "Vihaan Sharma", actorName: "Vihaan Sharma", reviewDeadline: dayOffset(5 + pi) },
      { projectId, title: "MEP shaft coordination — revised drawing issued", rationale: "Coordination clash with lift lobby resolved by shifting shaft 600mm.", approval: pi % 2 === 0 ? "APPROVED" : "PENDING", impact: "LOW", status: pi % 2 === 0 ? "CLOSED" : "OPEN", state: pi % 2 === 0 ? "LOCKED" : "OPEN", revisionCategory: "MINOR", revisionSource: "INTERNAL_ERROR", ownerName: "Vihaan Sharma", actorName: "Vihaan Sharma", reviewDeadline: dayOffset(10) },
    ]);

    await db.insert(criticalNotes).values([{
      projectId,
      title: pi === 0 ? "Facade approval pending structural NOC for ACM anchors" : pi === 1 ? "MUDA permit: resubmission required — site area discrepancy" : pi === 2 ? "Verde: fire NOC from local authority pending 6 weeks" : pi === 3 ? "Kapoor: client abroad until 25th, defer approvals" : pi === 4 ? "Patel HQ: geotechnical report recommends pile foundation" : pi === 5 ? "School: asbestos found in existing roof — disposal needed" : pi === 6 ? "Goa CRZ notification area under dispute" : pi === 10 ? "GreenField: soil test shows high water table — foundation redesign" : "Pending client approval on material selection",
      category: pi % 3 === 0 ? "PERMIT" : pi % 3 === 1 ? "DESIGN" : "CLIENT",
      priority: pi < 3 ? "HIGH" : pi < 6 ? "MEDIUM" : "LOW",
      status: pi === 7 ? "CLOSED" : "OPEN",
      visibility: "STAFF",
      owner: "Vihaan Sharma",
      dueDate: dayOffset(7 + pi),
      body: "This issue requires immediate attention and coordination before the next billing milestone.",
    }]);

    await db.insert(clientLogs).values([
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-30 - pi), subject: "Project briefing", body: "Initial scope, budget and timeline discussed. Client signed LOA.", createdById: principal.id },
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-7),        subject: "Design review meeting", body: "Client walked through schematic options; preferred Option B.", createdById: principal.id },
      { projectId, clientId: def.client.id, kind: "EMAIL",   occurredAt: dayOffset(-3 - pi),   subject: "Revised drawings shared", body: "Sent revised floor plans incorporating client feedback.", createdById: principal.id },
    ]);

    pi++;
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  if (allProjectIds[0] && allProjectRefs[0]) {
    await db.insert(comments).values([
      { projectId: allProjectIds[0]!, objectType: "decision", objectId: allProjectRefs[0]!, body: "Structural team has reviewed ACM anchor loads — within slab capacity. Moving to contractor shortlist.", actorName: "Vihaan Sharma", visibility: "STAFF" },
      { projectId: allProjectIds[2]!, objectType: "decision", objectId: allProjectRefs[2]!, body: "Verde client confirmed the +150mm floor height — cost impact accepted. Updating drawings.", actorName: "Vihaan Sharma", visibility: "STAFF" },
    ]);
  }

  await seedStudioGlanceAndLeads(db, principal.id, allProjectIds, memberIds);
  await rebalanceDemoTaskAssignees(db);
  if (allProjectIds[0]) await seedDemoTakeoff(db, allProjectIds[0]);

  console.log("✓ seeded demo workspace (Studio Intelligence tuned)");
  console.log(`    principal: ${principalEmail} / ${DEMO_PASSWORD}`);
  console.log(`    team logins: lead@ · site@ · junior@ · accounts@demo.aorms.in (same password)`);
  console.log(`    ${projectDefs.length} projects · ${clientRows.length} clients · ${DEMO_LEADS.length} leads`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo seed failed:", err);
    process.exit(1);
  });
