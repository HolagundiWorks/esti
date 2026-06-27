/**
 * Demo-seed v2 — full Construction Cost OS + Task OS workspace.
 *
 *   pnpm --filter @esti/backend seed:demo
 *   (or: podman exec esti-backend sh -c "cd /app/esti/backend && pnpm seed:demo")
 *
 * Idempotent — skips if principal@demo.aorms.in already exists.
 * Covers every major module: clients, projects, phases, fees, invoices, permits,
 * tasks (with priority score + intervention flags), decisions, critical notes,
 * consultants, engagements, spec sheets, POs, transmittals, approvals, inspections,
 * attendance, rewards, client logs — PLUS the full Construction Cost OS spine
 * (A–G) on two showcase projects: estimate → BOQ → tender → award → work package →
 * measurement → running bill → deviations → variations → BBS → steel recon →
 * final account → GRN + material reconciliation + cost dashboard.
 *
 * NOT for production use.
 */

import { DEFAULT_PHASE_PLAN, GstSystem, computeGst } from "@esti/contracts";
import { eq, inArray } from "drizzle-orm";
import { sql as rawSql } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  approvals,
  assignments,
  attendance,
  bbsItems,
  bbsSchedules,
  clientLogs,
  clients,
  comments,
  consultants,
  contractors,
  criticalNotes,
  decisions,
  deviations,
  engagements,
  estimateItems,
  estimates,
  feeProposals,
  finalAccounts,
  grnItems,
  grns,
  inspections,
  invoices,
  leaves,
  measurementRecords,
  orgSettings,
  permits,
  phases,
  poItems,
  projectOffices,
  purchaseOrders,
  rewardPoints,
  runningBillItems,
  runningBills,
  estimateVersions,
  specItems,
  specSheets,
  steelReconciliations,
  tasks,
  teamMembers,
  tenderBidItems,
  tenderBids,
  tenderInvitations,
  tenderItems,
  tenders,
  transmittalItems,
  transmittals,
  users,
  variationItems,
  variations,
  workPackageItems,
  workPackages,
} from "../db/schema.js";
import { firmGstSystem } from "../lib/firm.js";
import { getOrgSettings } from "../lib/settings.js";
import { nextRef } from "../lib/numbering.js";
import { ensureDefaultAccounts } from "../modules/expense/accounts.js";
import { ensureBuildingDsrCatalog, ensureAiStudioEnabled } from "./seedBuildingDsr.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

async function clearDemoWorkspace(principalId: string) {
  const demoEmails = [
    "principal@demo.aorms.in", "lead@demo.aorms.in", "site@demo.aorms.in",
    "junior@demo.aorms.in", "intern@demo.aorms.in", "accounts@demo.aorms.in", "client@demo.aorms.in",
  ];
  // Bypass FK trigger checks so we can delete in any order within the session.
  await db.execute(rawSql`SET session_replication_role = 'replica'`);
  try {
    await db.delete(projectOffices).where(eq(projectOffices.createdById, principalId));
    await db.delete(contractors).where(eq(contractors.createdById, principalId));
    await db.delete(teamMembers).where(inArray(teamMembers.email, demoEmails));
    await db.delete(users).where(inArray(users.email, demoEmails));
  } finally {
    await db.execute(rawSql`SET session_replication_role = 'origin'`);
  }
  console.log("  cleared old demo workspace");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const principalEmail = "principal@demo.aorms.in";

  // Seed the default chart of accounts up front (idempotent) so the office cash
  // book / expenses work out of the box — even on an already-seeded demo where
  // the rest of this script short-circuits below.
  await ensureDefaultAccounts(db);

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, principalEmail));
  if (exists) {
    if (!process.env.SEED_DEMO_FORCE) {
      console.log("✓ demo workspace already present — set SEED_DEMO_FORCE=1 to wipe and re-seed");
      return;
    }
    console.log("  SEED_DEMO_FORCE=1 — clearing old demo workspace first...");
    await clearDemoWorkspace(exists.id);
  }

  const gstType = await firmGstSystem(db);
  const pwHash = await hashPassword(DEMO_PASSWORD);
  const settings = await getOrgSettings(db);
  await db.update(orgSettings).set({ hrEnabled: true, orgMode: "STUDIO" }).where(eq(orgSettings.id, settings.id));
  await ensureBuildingDsrCatalog(db);
  await ensureAiStudioEnabled(db);

  // ── Users ─────────────────────────────────────────────────────────────────
  const [principalMaybe] = await db.insert(users).values({
    email: principalEmail, fullName: "Ar. Vihaan Sharma (Principal)", role: "OWNER",
    passwordHash: pwHash, isDemo: true,
  }).returning();
  if (!principalMaybe) throw new Error("principal insert failed");
  const principal = principalMaybe;

  const staffUsers = await db.insert(users).values([
    { email: "lead@demo.aorms.in",     fullName: "Ar. Aarav Mehta (Project Lead)", role: "PARTNER",         passwordHash: pwHash, isDemo: true },
    { email: "site@demo.aorms.in",     fullName: "Rahul Nair (Site Supervisor)",   role: "SITE_SUPERVISOR", passwordHash: pwHash, isDemo: true },
    { email: "junior@demo.aorms.in",   fullName: "Sneha Rao (Jr Architect)",       role: "VIEWER",          passwordHash: pwHash, isDemo: true },
    { email: "intern@demo.aorms.in",   fullName: "Kiran Patel (Intern)",           role: "VIEWER",          passwordHash: pwHash, isDemo: true },
    { email: "accounts@demo.aorms.in", fullName: "Priya Kumar (Accounts)",         role: "ACCOUNTANT",      passwordHash: pwHash, isDemo: true },
  ]).returning();

  const userByEmail = new Map<string, string>([
    [principalEmail, principal.id],
    ...staffUsers.map((u): [string, string] => [u.email, u.id]),
  ]);

  // ── Team members ─────────────────────────────────────────────────────────
  const staff = await db.insert(teamMembers).values([
    { name: "Vihaan Sharma",  role: "Principal Architect", employmentType: "FULL_TIME", email: principalEmail,          userId: userByEmail.get(principalEmail)!,          monthlySalaryPaise: 2_50_000_00, dateJoined: dayOffset(-1500), active: true },
    { name: "Aarav Mehta",    role: "Project Lead",        employmentType: "FULL_TIME", email: "lead@demo.aorms.in",    userId: userByEmail.get("lead@demo.aorms.in")!,    monthlySalaryPaise: 1_20_000_00, dateJoined: dayOffset(-900),  active: true },
    { name: "Rahul Nair",     role: "Site Supervisor",     employmentType: "FULL_TIME", email: "site@demo.aorms.in",    userId: userByEmail.get("site@demo.aorms.in")!,    monthlySalaryPaise:   70_000_00, dateJoined: dayOffset(-500),  active: true },
    { name: "Sneha Rao",      role: "Jr Architect",        employmentType: "FULL_TIME", email: "junior@demo.aorms.in",  userId: userByEmail.get("junior@demo.aorms.in")!,  monthlySalaryPaise:   45_000_00, dateJoined: dayOffset(-200),  active: true },
    { name: "Kiran Patel",    role: "Intern",              employmentType: "INTERN",    email: "intern@demo.aorms.in",  userId: userByEmail.get("intern@demo.aorms.in")!,  monthlySalaryPaise:   15_000_00, dateJoined: dayOffset(-60),   active: true },
  ]).returning();

  const mid = new Map(staff.map((m) => [m.name, m.id]));

  await db.insert(leaves).values([
    { teamMemberId: mid.get("Rahul Nair")!,  type: "CASUAL", fromDate: dayOffset(0),   toDate: dayOffset(1),   days: 2, reason: "Family function", status: "APPROVED" },
    { teamMemberId: mid.get("Sneha Rao")!,   type: "SICK",   fromDate: dayOffset(-10), toDate: dayOffset(-10), days: 1, reason: "Fever",          status: "APPROVED" },
    { teamMemberId: mid.get("Aarav Mehta")!, type: "EARNED", fromDate: dayOffset(15),  toDate: dayOffset(19),  days: 5, reason: "Annual vacation", status: "PENDING" },
  ]);

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

  const kapoor = clientRows[3]!;
  await db.insert(users).values({
    email: "client@demo.aorms.in", fullName: "Divya Kapoor (Client)", role: "CLIENT",
    passwordHash: pwHash, isDemo: true, clientId: kapoor.id,
  });

  // ── Consultants ───────────────────────────────────────────────────────────
  const consultantRows = await db.insert(consultants).values([
    { name: "Prakash Iyer",       discipline: "Structural",    firm: "Iyer Structural Studio",    email: "prakash@iyerstruct.in",  phone: "+91 98450 55501" },
    { name: "Meera Menon",        discipline: "MEP",           firm: "Circuit & Flow Engineers",  email: "meera@circuitflow.in",   phone: "+91 98450 55502" },
    { name: "Naveen Das",         discipline: "Landscape",     firm: "Canopy Works",              email: "naveen@canopyworks.in",  phone: "+91 98450 55503" },
    { name: "Suresh Venkataraman",discipline: "Geotechnical",  firm: "SV Geo Consultants",        email: "suresh@svgeo.in",        phone: "+91 98450 55504" },
    { name: "Kavitha Krishnan",   discipline: "Interior",      firm: "KK Design Studio",          email: "kavitha@kkdesign.in",    phone: "+91 98450 55505" },
  ]).returning();

  // ── Contractors ───────────────────────────────────────────────────────────
  const contractorRows = await db.insert(contractors).values([
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
    { client: kapoor,          title: "Kapoor Residence — Sarjapur",             projectType: "Residential Architecture",  value:  2_10_00_000,  status: "ACTIVE",    phaseProgress: 0 },
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
      { title: "Issue GFC drawings — ground floor",         assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "8.00" },
      { title: "Site visit — RCC slab reinforcement check", assignee: "Rahul Nair",   priority: "HIGH",   due: dayOffset(0),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "4.00", interventionRequired: true },
      { title: "Coordinate structural consultant: column schedule", assignee: "Aarav Mehta", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "6.00" },
      { title: "Finalise BOQ for Variation Order #2",       assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(-3), status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 4, hours: "12.00", interventionRequired: true },
      { title: "Prepare client progress presentation",      assignee: "Sneha Rao",    priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "5.00" },
      { title: "Update AORMS project timeline",             assignee: "Sneha Rao",    priority: "LOW",    due: dayOffset(3),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "2.00" },
    ],
    // 1 — Rao House
    [
      { title: "Schematic design options — A & B",          assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "16.00" },
      { title: "Client meeting — finalize scheme",          assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
      { title: "Submit permit drawings to MUDA",            assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(8),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "10.00" },
      { title: "Prepare GST invoice — Milestone 1",         assignee: "Vihaan Sharma",priority: "MEDIUM", due: dayOffset(0),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
    // 2 — Verde Commercial Block
    [
      { title: "GFC drawing set — typical floor",           assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 5, hours: "24.00" },
      { title: "Facade mock-up review on site",             assignee: "Rahul Nair",   priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 3, hours: "6.00" },
      { title: "MEP coordination meeting",                  assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(0),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "4.00" },
      { title: "Issue revised parking layout",              assignee: "Sneha Rao",    priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "6.00" },
      { title: "BBMP occupancy certificate follow-up",      assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "3.00" },
    ],
    // 3 — Kapoor Residence
    [
      { title: "Inception meeting — site visit",            assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(0),  status: "DONE",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "4.00" },
      { title: "Site measurement and survey notes",         assignee: "Rahul Nair",   priority: "HIGH",   due: dayOffset(-3), status: "DONE",        classification: "BILLABLE",     workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "6.00" },
      { title: "Brief & design programme document",         assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(2),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "4.00" },
      { title: "Fee proposal — architecture scope",         assignee: "Vihaan Sharma",priority: "MEDIUM", due: dayOffset(4),  status: "TODO",        classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
    ],
    // 4 — Patel Corp HQ
    [
      { title: "Concept design — board review presentation",assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(-1), status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 4, hours: "12.00" },
      { title: "Structural grid coordination",              assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "8.00" },
      { title: "Fire NOC documentation",                    assignee: "Sneha Rao",    priority: "MEDIUM", due: dayOffset(7),  status: "TODO",        classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "6.00" },
      { title: "Landscape design brief to Canopy Works",    assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 2, hours: "3.00" },
      { title: "Geotechnical report review",                assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "4.00" },
    ],
    // 5 — St. Francis School
    [
      { title: "Site context study — existing building survey", assignee: "Sneha Rao", priority: "HIGH",  due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "8.00" },
      { title: "Educational space programming brief",        assignee: "Aarav Mehta", priority: "HIGH",   due: dayOffset(4),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "6.00" },
      { title: "Classroom block schematic options",          assignee: "Sneha Rao",   priority: "MEDIUM", due: dayOffset(8),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "16.00" },
      { title: "Diocese board presentation",                 assignee: "Vihaan Sharma",priority: "HIGH",  due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "4.00" },
    ],
    // 6 — Reddy Beach Retreat
    [
      { title: "CRZ compliance assessment",                  assignee: "Aarav Mehta", priority: "HIGH",   due: dayOffset(-15), status: "DONE",       classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 5, hours: "10.00" },
      { title: "Schematic design — beach-facing elevation",  assignee: "Sneha Rao",   priority: "HIGH",   due: dayOffset(-5),  status: "DONE",       classification: "BILLABLE",     workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "14.00" },
      { title: "ON HOLD — resume after client confirms budget", assignee: "Vihaan Sharma", priority: "LOW", due: dayOffset(30), status: "TODO",      classification: "BILLABLE",     workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
    // 7 — Nexus Co-working (COMPLETE)
    [
      { title: "As-built drawings archive",                  assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(-10), status: "DONE",      classification: "BILLABLE",     workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "8.00" },
      { title: "Final invoice and project closure",          assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(-7),  status: "DONE",      classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "2.00" },
    ],
    // 8 — Sunrise Boutique Hotel
    [
      { title: "Guest-room module design study",             assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "14.00" },
      { title: "Lobby & F&B concept presentation",           assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 3, hours: "8.00" },
      { title: "Fire & life-safety strategy",                assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(6),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "6.00" },
      { title: "Site visit — basement excavation review",    assignee: "Rahul Nair",   priority: "HIGH",   due: dayOffset(-1), status: "TODO",        classification: "BILLABLE",    workType: "CONSTRUCTION_SUPPORT",  difficulty: 2, hours: "4.00" },
    ],
    // 9 — Nair Wellness Clinic
    [
      { title: "Functional brief — consulting & diagnostics",assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "5.00" },
      { title: "Schematic plan — ground floor",              assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "10.00" },
      { title: "Accessibility & ramp compliance check",      assignee: "Sneha Rao",    priority: "MEDIUM", due: dayOffset(7),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 2, hours: "4.00" },
    ],
    // 10 — GreenField Factory Shed (construction showcase project #2)
    [
      { title: "Pre-engineered building grid layout",        assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(-2), status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "12.00" },
      { title: "Crane gantry structural coordination",       assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(1),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 5, hours: "10.00" },
      { title: "GFC roofing & cladding details",             assignee: "Sneha Rao",    priority: "MEDIUM", due: dayOffset(3),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 4, hours: "16.00" },
      { title: "Procure reinforcement steel — Gr. Fe 500",   assignee: "Rahul Nair",   priority: "HIGH",   due: dayOffset(-4), status: "TODO",        classification: "BILLABLE",    workType: "CONSTRUCTION_SUPPORT",  difficulty: 3, hours: "4.00", interventionRequired: true },
      { title: "Steel BBS for primary columns",              assignee: "Kiran Patel",  priority: "LOW",    due: dayOffset(6),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "8.00" },
    ],
    // 11 — Lakeview Apartments (PROPOSAL)
    [
      { title: "Feasibility massing study — FAR check",     assignee: "Aarav Mehta",  priority: "HIGH",   due: dayOffset(2),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 4, hours: "8.00" },
      { title: "Fee proposal & COA benchmarking",           assignee: "Vihaan Sharma",priority: "HIGH",   due: dayOffset(1),  status: "IN_PROGRESS", classification: "NON_BILLABLE",workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "3.00" },
    ],
    // 12 — Meghana Community Centre
    [
      { title: "Multipurpose hall acoustic study",          assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(0),  status: "IN_PROGRESS", classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "8.00" },
      { title: "Community needs workshop with trust",       assignee: "Aarav Mehta",  priority: "MEDIUM", due: dayOffset(5),  status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 2, hours: "4.00" },
      { title: "Sustainable materials specification",       assignee: "Kiran Patel",  priority: "MEDIUM", due: dayOffset(9),  status: "TODO",        classification: "BILLABLE",    workType: "TECHNICAL_PRODUCTION",  difficulty: 3, hours: "6.00" },
    ],
    // 13 — Desai Villa (ON_HOLD)
    [
      { title: "Concept design — courtyard villa",          assignee: "Sneha Rao",    priority: "HIGH",   due: dayOffset(-8), status: "DONE",        classification: "BILLABLE",    workType: "DESIGN_DEVELOPMENT",    difficulty: 3, hours: "12.00" },
      { title: "ON HOLD — await site finalisation",         assignee: "Vihaan Sharma",priority: "LOW",    due: dayOffset(25), status: "TODO",        classification: "BILLABLE",    workType: "DESIGN_COMMUNICATION",  difficulty: 1, hours: "1.00" },
    ],
  ];

  const allProjectIds: string[] = [];
  const allProjectRefs: string[] = [];

  // Showcase projects: indices 0 (Sharma Villa) and 10 (GreenField Factory)
  const COST_OS_PROJECT_INDICES = new Set([0, 10]);

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
    await db.insert(feeProposals).values({
      ref: feeRef, projectId, workCategory: "ARCHITECTURE",
      costOfWorksPaise: def.value, feePaise: Math.round(def.value * 0.08),
      docCommPct: 10, coaMinimumPaise: 0, belowMinimum: false,
    });

    // Invoices
    const invoiceDefs = pi < 4
      ? [{ offset: -90, status: "PAID" }, { offset: -45, status: "PAID" }, { offset: -10, status: "ISSUED" }]
      : pi < 6
        ? [{ offset: -60, status: "PAID" }, { offset: -15, status: "ISSUED" }]
        : pi === 6
          ? [{ offset: -30, status: "ISSUED" }]
          : pi === 7
            ? [{ offset: -90, status: "PAID" }, { offset: -60, status: "PAID" }, { offset: -30, status: "PAID" }, { offset: -5, status: "PAID" }]
            : [{ offset: -45, status: "PAID" }, { offset: -10, status: "ISSUED" }];

    for (const inv of invoiceDefs) {
      const taxable = Math.round(def.value * 0.02);
      const g = computeGst(gstType, taxable, false);
      const { ref: invRef } = await nextRef(db, "invoice", "INV");
      await db.insert(invoices).values({
        ref: invRef, projectId, clientId: def.client.id, status: inv.status,
        gstSystem: gstType, documentKind: g.documentKind,
        sac: gstType === GstSystem.REGULAR ? "998322" : null,
        interState: def.client.state !== "Karnataka",
        tdsApplicable: false,
        taxablePaise: g.taxable,
        cgstPaise: def.client.state !== "Karnataka" ? 0 : g.cgst,
        sgstPaise: def.client.state !== "Karnataka" ? 0 : g.sgst,
        igstPaise: def.client.state !== "Karnataka" ? g.igst : 0,
        gstTotalPaise: g.gstTotal, compositionLevyPaise: g.compositionLevy,
        tdsPaise: 0, grandTotalPaise: g.grandTotal, netReceivablePaise: g.grandTotal,
        dateInvoice: dayOffset(inv.offset),
      });
    }

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
      { projectId, teamMemberId: mid.get("Aarav Mehta")!, role: "Project Lead" },
      { projectId, teamMemberId: mid.get("Rahul Nair")!,  role: "Site Supervisor" },
      { projectId, teamMemberId: mid.get("Sneha Rao")!,   role: "Design" },
      ...(pi >= 2 ? [{ projectId, teamMemberId: mid.get("Kiran Patel")!, role: "Intern" }] : []),
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

    await db.insert(approvals).values({ projectId, entityType: "DRAWING_SET", title: "Schematic design package", recipient: def.client.name, channel: "Client portal", status: pi % 2 === 0 ? "SENT" : "DRAFT", sentDate: pi % 2 === 0 ? dayOffset(-6 - pi) : null, responseDate: pi === 0 ? dayOffset(-2) : null, remarks: pi === 0 ? "Approved with facade comments." : null, createdById: principal.id });

    const { ref: insRef } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({ ref: insRef, projectId, dateVisit: dayOffset(-2 + pi), weather: "Clear", attendees: "Site supervisor, contractor, project lead", progress: "Masonry work in progress at ground floor.", observations: "Site housekeeping acceptable.", instructions: "Submit bar bending schedule before next slab pour.", nextVisit: dayOffset(5 + pi), inspectorName: "Rahul Nair" });

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
      { projectId, title: decisionTitles[pi % decisionTitles.length]!, rationale: "Client preference after presentation; engineering review in progress.", approval: "PENDING", impact: pi >= 4 ? "HIGH" : "MEDIUM", status: "OPEN", state: pi % 3 === 0 ? "CLIENT_REVIEW" : "OPEN", revisionCategory: pi < 2 ? "MAJOR" : "MINOR", revisionSource: pi % 2 === 0 ? "CLIENT_DRIVEN" : "TECHNICAL_QUERY", ownerName: "Aarav Mehta", actorName: "Vihaan Sharma", reviewDeadline: dayOffset(5 + pi) },
      { projectId, title: "MEP shaft coordination — revised drawing issued", rationale: "Coordination clash with lift lobby resolved by shifting shaft 600mm.", approval: pi % 2 === 0 ? "APPROVED" : "PENDING", impact: "LOW", status: pi % 2 === 0 ? "CLOSED" : "OPEN", state: pi % 2 === 0 ? "LOCKED" : "OPEN", revisionCategory: "MINOR", revisionSource: "INTERNAL_ERROR", ownerName: "Sneha Rao", actorName: "Aarav Mehta", reviewDeadline: dayOffset(10) },
    ]);

    await db.insert(criticalNotes).values([{
      projectId,
      title: pi === 0 ? "Facade approval pending structural NOC for ACM anchors" : pi === 1 ? "MUDA permit: resubmission required — site area discrepancy" : pi === 2 ? "Verde: fire NOC from local authority pending 6 weeks" : pi === 3 ? "Kapoor: client abroad until 25th, defer approvals" : pi === 4 ? "Patel HQ: geotechnical report recommends pile foundation" : pi === 5 ? "School: asbestos found in existing roof — disposal needed" : pi === 6 ? "Goa CRZ notification area under dispute" : pi === 10 ? "GreenField: soil test shows high water table — foundation redesign" : "Pending client approval on material selection",
      category: pi % 3 === 0 ? "PERMIT" : pi % 3 === 1 ? "DESIGN" : "CLIENT",
      priority: pi < 3 ? "HIGH" : pi < 6 ? "MEDIUM" : "LOW",
      status: pi === 7 ? "CLOSED" : "OPEN",
      visibility: "STAFF",
      owner: "Aarav Mehta",
      dueDate: dayOffset(7 + pi),
      body: "This issue requires immediate attention and coordination before the next billing milestone.",
    }]);

    await db.insert(clientLogs).values([
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-30 - pi), subject: "Project briefing", body: "Initial scope, budget and timeline discussed. Client signed LOA.", createdById: principal.id },
      { projectId, clientId: def.client.id, kind: "MEETING", occurredAt: dayOffset(-7),        subject: "Design review meeting", body: "Client walked through schematic options; preferred Option B.", createdById: principal.id },
      { projectId, clientId: def.client.id, kind: "EMAIL",   occurredAt: dayOffset(-3 - pi),   subject: "Revised drawings shared", body: "Sent revised floor plans incorporating client feedback.", createdById: principal.id },
    ]);

    // ── Construction Cost OS spine — for showcase projects ──────────────────
    if (COST_OS_PROJECT_INDICES.has(pi)) {
      await seedCostOsSpine(db, projectId, ref, principal.id, contractorRows, pi);
    }

    pi++;
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  const weekdays = recentWeekdays(20);
  const attendanceRows: (typeof attendance.$inferInsert)[] = [];
  for (let i = 0; i < weekdays.length; i++) {
    const d = dayOffset(weekdays[i]!);
    attendanceRows.push(
      { teamMemberId: mid.get("Vihaan Sharma")!, attendanceDate: d, status: "PRESENT",  markedById: principal.id },
      { teamMemberId: mid.get("Aarav Mehta")!,   attendanceDate: d, status: i % 7 === 0 ? "WFH" : "PRESENT", markedById: principal.id },
      { teamMemberId: mid.get("Rahul Nair")!,    attendanceDate: d, status: i % 9 === 0 ? "ABSENT" : "PRESENT", markedById: principal.id },
      { teamMemberId: mid.get("Sneha Rao")!,     attendanceDate: d, status: i % 11 === 0 ? "HALF_DAY" : "PRESENT", markedById: principal.id },
    );
    if (i < 15) attendanceRows.push({ teamMemberId: mid.get("Kiran Patel")!, attendanceDate: d, status: "PRESENT", markedById: principal.id });
  }
  for (let i = 0; i < attendanceRows.length; i += 50) {
    await db.insert(attendance).values(attendanceRows.slice(i, i + 50));
  }

  // ── Reward points ─────────────────────────────────────────────────────────
  await db.insert(rewardPoints).values([
    { teamMemberId: mid.get("Aarav Mehta")!,    points: 50, reason: "Excellent client presentation for Patel HQ — design approved first time.", awardType: "CLIENT_IMPACT",  createdById: principal.id },
    { teamMemberId: mid.get("Aarav Mehta")!,    points: 30, reason: "Resolved structural coordination clash at Verde without project delay.",    awardType: "QUALITY",        createdById: principal.id },
    { teamMemberId: mid.get("Sneha Rao")!,      points: 40, reason: "Delivered GFC drawing set for Verde one week ahead of schedule.",           awardType: "RELIABILITY",    createdById: principal.id },
    { teamMemberId: mid.get("Sneha Rao")!,      points: 25, reason: "Highest drawing accuracy this quarter — zero returned drawings.",           awardType: "QUALITY",        createdById: principal.id },
    { teamMemberId: mid.get("Rahul Nair")!,     points: 35, reason: "Proactive slab quality check averted a pour failure at Sharma Villa.",      awardType: "RELIABILITY",    createdById: principal.id },
    { teamMemberId: mid.get("Rahul Nair")!,     points: 20, reason: "Completed 30-day site diary without a single missed entry.",               awardType: "RELIABILITY",    createdById: principal.id },
    { teamMemberId: mid.get("Vihaan Sharma")!,  points: 60, reason: "Landed Patel Corp HQ — largest project by value in firm history.",         awardType: "CLIENT_IMPACT",  createdById: principal.id },
    { teamMemberId: mid.get("Kiran Patel")!,    points: 20, reason: "BOQ for Verde completed with zero quantity errors on first check.",         awardType: "QUALITY",        createdById: principal.id },
    { teamMemberId: mid.get("Aarav Mehta")!,    points: 15, reason: "Mentored Kiran on AORMS BOQ workflow.",                                    awardType: "COLLABORATION",  createdById: principal.id },
    { teamMemberId: mid.get("Sneha Rao")!,      points: 15, reason: "Took initiative on St. Francis site survey outside scheduled hours.",       awardType: "RELIABILITY",    createdById: principal.id },
  ]);

  // ── Comments ──────────────────────────────────────────────────────────────
  if (allProjectIds[0] && allProjectRefs[0]) {
    await db.insert(comments).values([
      { projectId: allProjectIds[0]!, objectType: "decision", objectId: allProjectRefs[0]!, body: "Structural team has reviewed ACM anchor loads — within slab capacity. Moving to contractor shortlist.", actorName: "Aarav Mehta", visibility: "STAFF" },
      { projectId: allProjectIds[2]!, objectType: "decision", objectId: allProjectRefs[2]!, body: "Verde client confirmed the +150mm floor height — cost impact accepted. Updating drawings.", actorName: "Sneha Rao", visibility: "STAFF" },
    ]);
  }

  console.log("✓ seeded demo workspace v2");
  console.log(`    principal: ${principalEmail} / ${DEMO_PASSWORD}`);
  console.log("    lead@ / site@ / junior@ / intern@ / accounts@ / client@demo.aorms.in (same password)");
  console.log(`    ${projectDefs.length} projects, ${attendanceRows.length} attendance rows`);
  console.log("    Cost OS spine seeded on: Sharma Villa + GreenField Factory Shed");
}

// ── Construction Cost OS spine helper ────────────────────────────────────────
async function seedCostOsSpine(
  dbConn: typeof db,
  projectId: string,
  projectRef: string,
  principalId: string,
  contractorRows: { id: string }[],
  pi: number,
) {
  const isSharma = pi === 0;
  const label = isSharma ? "Sharma Villa — Whitefield" : "GreenField Factory Shed — Hosur";
  const civContractor = contractorRows[0]!;
  const strContractor = contractorRows[1]!;

  // ── A: Estimate + BOQ ────────────────────────────────────────────────────
  const { ref: estRef } = await nextRef(dbConn, "estimate", "EST");
  const [estimate] = await dbConn.insert(estimates).values({
    ref: estRef, projectId, title: isSharma ? "Detailed construction estimate" : "Factory shed construction estimate",
    stage: "EXECUTION", status: "ACTIVE", confidence: "HIGH",
    subtotalPaise: isSharma ? 3_80_00_000_00 : 15_50_00_000_00,
    totalPaise:    isSharma ? 3_80_00_000_00 : 15_50_00_000_00,
  }).returning();
  const estimateId = estimate!.id;

  const boqRows = isSharma ? [
    { description: "Earthwork excavation", unit: "cum", qty: 450, ratePaise: 28_000, costHead: "Civil" },
    { description: "PCC M10 under footing", unit: "cum", qty: 42,  ratePaise: 4_800_00, costHead: "Civil" },
    { description: "RCC M25 — footing",     unit: "cum", qty: 65,  ratePaise: 7_200_00, costHead: "Civil" },
    { description: "RCC M25 — columns",     unit: "cum", qty: 38,  ratePaise: 8_500_00, costHead: "Structural" },
    { description: "RCC M25 — slab",        unit: "cum", qty: 72,  ratePaise: 7_800_00, costHead: "Structural" },
    { description: "Brick masonry 230mm",   unit: "cum", qty: 185, ratePaise: 4_200_00, costHead: "Civil" },
    { description: "Cement plaster 12mm",   unit: "sqm", qty: 920, ratePaise: 28_000,   costHead: "Finishes" },
    { description: "Vitrified tile flooring", unit: "sqm", qty: 320, ratePaise: 65_000, costHead: "Finishes" },
  ] : [
    { description: "Earthwork excavation & filling", unit: "cum", qty: 1800, ratePaise: 22_000,   costHead: "Civil" },
    { description: "PCC M10 flooring",               unit: "cum", qty: 220,  ratePaise: 4_500_00, costHead: "Civil" },
    { description: "RCC M25 — columns",              unit: "cum", qty: 180,  ratePaise: 8_200_00, costHead: "Structural" },
    { description: "Pre-engineered roofing sheeting", unit: "sqm", qty: 4500, ratePaise: 95_000,  costHead: "Structural" },
    { description: "Brick boundary wall",             unit: "cum", qty: 320,  ratePaise: 3_800_00, costHead: "Civil" },
    { description: "Cement screed flooring",          unit: "sqm", qty: 3800, ratePaise: 18_000,   costHead: "Finishes" },
  ];

  const totalPaise = isSharma ? 3_80_00_000_00 : 15_50_00_000_00;
  const estItemRows = await dbConn.insert(estimateItems).values(
    boqRows.map((r, idx) => ({
      estimateId,
      description: r.description,
      unit: r.unit,
      qty: r.qty,
      ratePaise: r.ratePaise,
      amountPaise: Math.round(r.qty * r.ratePaise),
      costHead: r.costHead,
      calculationType: "RATE_BOOK",
      sortOrder: (idx + 1) * 10,
    }))
  ).returning();

  // Freeze a version so tender can reference it (esti_estimate_version)
  const [estVersion] = await dbConn.insert(estimateVersions).values({
    estimateId,
    versionNo: 1,
    stage: "EXECUTION",
    status: "FROZEN",
    subtotalPaise: totalPaise,
    totalPaise,
    snapshot: {},
    frozenBy: principalId,
  }).returning();
  const estimateVersionId = estVersion!.id;

  // ── A: Tender ─────────────────────────────────────────────────────────────
  const [tender] = await dbConn.insert(tenders).values({
    projectId, title: isSharma ? "Civil & structural works package" : "Factory shed civil & structural",
    category: "Civil", status: "AWARDED",
    dueDate: dayOffset(-20),
    awardedContractorId: isSharma ? civContractor.id : strContractor.id,
    estimateVersionId,
    createdById: principalId,
  }).returning();
  const tenderId = tender!.id;

  const tItemRows = await dbConn.insert(tenderItems).values(
    boqRows.map((r, idx) => ({
      tenderId,
      description: r.description,
      unit: r.unit,
      qty: r.qty,
      estRatePaise: r.ratePaise,
      sortOrder: (idx + 1) * 10,
    }))
  ).returning();

  // Invitations + bids from two contractors
  const civToken = `token-${tenderId}-civil`;
  const strToken = `token-${tenderId}-str`;
  const [civInv] = await dbConn.insert(tenderInvitations).values({ tenderId, contractorId: civContractor.id, status: "SUBMITTED", accessToken: civToken }).returning();
  const [strInv] = await dbConn.insert(tenderInvitations).values({ tenderId, contractorId: strContractor.id, status: "SUBMITTED", accessToken: strToken }).returning();

  const civBidFactor = 1.08;
  const strBidFactor = 1.12;
  const civTotal = boqRows.reduce((s, r) => s + Math.round(r.qty * r.ratePaise * civBidFactor), 0);
  const strTotal = boqRows.reduce((s, r) => s + Math.round(r.qty * r.ratePaise * strBidFactor), 0);

  const [civBid] = await dbConn.insert(tenderBids).values({ invitationId: civInv!.id, amountPaise: civTotal, completionWeeks: isSharma ? 48 : 36, technicalScore: 82 }).returning();
  const [strBid] = await dbConn.insert(tenderBids).values({ invitationId: strInv!.id, amountPaise: strTotal, completionWeeks: isSharma ? 44 : 32, technicalScore: 75 }).returning();

  await dbConn.insert(tenderBidItems).values(
    tItemRows.map((ti, idx) => ({
      invitationId: civInv!.id,
      tenderItemId: ti.id,
      ratePaise: Math.round(boqRows[idx]!.ratePaise * civBidFactor),
      amountPaise: Math.round(boqRows[idx]!.qty * boqRows[idx]!.ratePaise * civBidFactor),
    }))
  );
  await dbConn.insert(tenderBidItems).values(
    tItemRows.map((ti, idx) => ({
      invitationId: strInv!.id,
      tenderItemId: ti.id,
      ratePaise: Math.round(boqRows[idx]!.ratePaise * strBidFactor),
      amountPaise: Math.round(boqRows[idx]!.qty * boqRows[idx]!.ratePaise * strBidFactor),
    }))
  );

  // ── B: Work package ────────────────────────────────────────────────────────
  const awardedRate = civBidFactor;
  const wpTotal = boqRows.reduce((s, r) => s + Math.round(r.qty * r.ratePaise * awardedRate), 0);
  const { ref: wpRef } = await nextRef(dbConn, "workpackage", "WP");
  const [wp] = await dbConn.insert(workPackages).values({
    ref: wpRef,
    projectId,
    estimateId,
    tenderId,
    contractorId: civContractor.id,
    name: isSharma ? "Civil & structural package — Phase 1" : "Factory shed civil package",
    packageType: "CIVIL",
    status: "ACTIVE",
    contractValuePaise: wpTotal,
    createdById: principalId,
  }).returning();
  const wpId = wp!.id;

  const wpItemRows = await dbConn.insert(workPackageItems).values(
    boqRows.map((r, idx) => ({
      workPackageId: wpId,
      boqItemId: estItemRows[idx]!.id,
      description: r.description,
      unit: r.unit,
      approvedQty: r.qty,
      variationQty: 0,
      ratePaise: Math.round(r.ratePaise * awardedRate),
      amountPaise: Math.round(r.qty * r.ratePaise * awardedRate),
      sortOrder: (idx + 1) * 10,
    }))
  ).returning();

  // ── C: Measurements + Running Bill ─────────────────────────────────────────
  // Measure first 3 items (representing work done so far)
  const measuredItems = wpItemRows.slice(0, 3);
  const measRefs: string[] = [];
  for (const wpi of measuredItems) {
    const { ref: mrRef } = await nextRef(dbConn, "measurement", "MR");
    measRefs.push(mrRef);
    await dbConn.insert(measurementRecords).values({
      ref: mrRef,
      projectId,
      workPackageId: wpId,
      workPackageItemId: wpi.id,
      boqItemId: wpi.boqItemId,
      description: wpi.description,
      unit: wpi.unit,
      qty: wpi.approvedQty * 0.6,  // 60% of contracted = billed so far
      location: "Ground floor",
      floor: "GF",
      measuredByName: "Rahul Nair",
      checkedByName: "Aarav Mehta",
      status: "APPROVED",
      approvedById: principalId,
      approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdById: principalId,
    });
  }

  const { ref: rbRef } = await nextRef(dbConn, "runningbill", "RB");
  const rbTotal = measuredItems.reduce((s, wpi) => s + Math.round(wpi.approvedQty * 0.6 * wpi.ratePaise), 0);
  const rbRetention = Math.round(rbTotal * 0.05);
  const rbTds = Math.round(rbTotal * 0.01);
  const [rb] = await dbConn.insert(runningBills).values({
    ref: rbRef,
    projectId,
    contractorId: civContractor.id,
    workPackageId: wpId,
    title: `RA Bill No. 1 — ${isSharma ? "Civil works" : "Factory shed civil"}`,
    billType: "RA",
    status: "ISSUED",
    measurementDate: dayOffset(-5),
    totalPaise: rbTotal,
    retentionPaise: rbRetention,
    advanceRecoveryPaise: 0,
    taxTdsPaise: rbTds,
    otherRecoveryPaise: 0,
    netPayablePaise: rbTotal - rbRetention - rbTds,
    createdById: principalId,
  }).returning();
  const rbId = rb!.id;

  await dbConn.insert(runningBillItems).values(
    measuredItems.map((wpi) => ({
      runningBillId: rbId,
      description: wpi.description,
      unit: wpi.unit,
      qty: wpi.approvedQty * 0.6,
      ratePaise: wpi.ratePaise,
      amountPaise: Math.round(wpi.approvedQty * 0.6 * wpi.ratePaise),
      workPackageItemId: wpi.id,
      boqItemId: wpi.boqItemId,
    }))
  );

  // ── D: Deviation + Variation ───────────────────────────────────────────────
  const deviItem = wpItemRows[3]!;  // columns item
  const { ref: devRef } = await nextRef(dbConn, "deviation", "DEV");
  const [dev] = await dbConn.insert(deviations).values({
    ref: devRef,
    projectId,
    workPackageId: wpId,
    workPackageItemId: deviItem.id,
    boqItemId: deviItem.boqItemId,
    deviationType: "QTY",
    description: deviItem.description,
    unit: deviItem.unit,
    boqQty: deviItem.approvedQty,
    executedQty: deviItem.approvedQty * 1.12,
    deviationQty: deviItem.approvedQty * 0.12,
    deviationPct: 12,
    costImpactPaise: Math.round(deviItem.approvedQty * 0.12 * deviItem.ratePaise),
    reason: isSharma ? "Revised column layout due to structural load increase from additional floor." : "PEB column footing size increased based on geotechnical report.",
    reasonSource: "OTHER",
    status: "APPROVED",
    approvedById: principalId,
    approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  }).returning();

  const varTotal = Math.round(deviItem.approvedQty * 0.12 * deviItem.ratePaise);
  const { ref: varRef } = await nextRef(dbConn, "variation", "VO");
  const [variation] = await dbConn.insert(variations).values({
    ref: varRef,
    projectId,
    workPackageId: wpId,
    title: isSharma ? "VO-1: Column qty increase due to structural revision" : "VO-1: Column footing size increase",
    status: "APPROVED",
    costImpactPaise: varTotal,
    internalApprovedById: principalId,
    internalApprovedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdById: principalId,
  }).returning();

  await dbConn.insert(variationItems).values({
    variationId: variation!.id,
    boqItemId: deviItem.boqItemId,
    description: dev!.description,
    unit: dev!.unit,
    qty: dev!.deviationQty,
    ratePaise: deviItem.ratePaise,
    amountPaise: varTotal,
    sortOrder: 10,
  });

  // Apply variation to WP item (update variationQty)
  await dbConn.update(workPackageItems)
    .set({ variationQty: deviItem.approvedQty * 0.12 })
    .where(eq(workPackageItems.id, deviItem.id));

  // ── E: BBS Schedule ────────────────────────────────────────────────────────
  const { ref: bbsRef } = await nextRef(dbConn, "bbs", "BBS");
  const [bbs] = await dbConn.insert(bbsSchedules).values({
    ref: bbsRef,
    projectId,
    title: isSharma ? "Ground floor columns — BBS" : "PEB column footings — BBS",
    workPackageId: wpId,
    boqItemId: deviItem.boqItemId,
  }).returning();
  const bbsId = bbs!.id;

  // cuttingLengthMm = per-bar cutting length in mm; weightKg = per-bar weight in kg
  await dbConn.insert(bbsItems).values([
    { bbsId, barMark: "C1",  member: "Column C1-C4", diaMm: 16, noOfMembers: 8, barsPerMember: 8,  cuttingLengthMm: 4200, weightKg: 6.63 },
    { bbsId, barMark: "C2",  member: "Column C5-C8", diaMm: 12, noOfMembers: 8, barsPerMember: 8,  cuttingLengthMm: 3800, weightKg: 3.37 },
    { bbsId, barMark: "ST1", member: "Stirrups all", diaMm:  8, noOfMembers: 8, barsPerMember: 28, cuttingLengthMm: 1250, weightKg: 0.49 },
  ]);

  // Steel reconciliation — header table; ref + title required
  const scheduledKg = Math.round((8 * 8 * 6.63) + (8 * 8 * 3.37) + (8 * 28 * 0.49));
  const issuedKg    = Math.round(scheduledKg * 0.80);
  const consumedKg  = Math.round(scheduledKg * 0.65);
  const { ref: srRef } = await nextRef(dbConn, "steelrecon", "SR");
  await dbConn.insert(steelReconciliations).values({
    ref: srRef,
    projectId,
    workPackageId: wpId,
    bbsId,
    title: isSharma ? "Column reinforcement reconciliation" : "Column footing reinforcement reconciliation",
    scheduledKg,
    issuedKg,
    consumedKg,
    wastageKg: issuedKg - consumedKg,
    status: "DRAFT",
    createdById: principalId,
  });

  // ── F: Final Account (GreenField only — more advanced) ─────────────────────
  if (!isSharma) {
    const { ref: faRef } = await nextRef(dbConn, "finalaccount", "FA");
    await dbConn.insert(finalAccounts).values({
      ref: faRef,
      projectId,
      workPackageId: wpId,
      title: "Final account — factory shed civil package",
      originalContractPaise: wpTotal,
      variationPaise: varTotal,
      grossBilledPaise: rbTotal,
      finalCertifiedPaise: rbTotal - rbRetention,
      retentionHeldPaise: rbRetention,
      netPaidPaise: rbTotal - rbRetention - rbTds,
      notes: "Final account snapshot — pending contractor no-claim certificate.",
      status: "DRAFT",
      createdById: principalId,
    });
  }

  // ── 3.17: GRN + material reconciliation ──────────────────────────────────
  // Two verified GRNs + one draft
  const grn1WpiId = wpItemRows[2]!.id;   // RCC slab / PEB roofing item
  const grn2WpiId = wpItemRows[3]!.id;   // columns item

  const [grn1] = await dbConn.insert(grns).values({
    projectId,
    workPackageId: wpId,
    deliveryDate: dayOffset(-15),
    vendorName: "Rajendra Steel & Cement",
    deliveryNoteRef: `DC/${isSharma ? "RSC" : "RSC"}/2026/0${pi + 41}`,
    status: "VERIFIED",
    notes: "First consignment — Reinforcement bars and OPC cement bags.",
    verifiedById: principalId,
    verifiedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    createdById: principalId,
  }).returning();

  await dbConn.insert(grnItems).values([
    { grnId: grn1!.id, workPackageItemId: grn2WpiId, description: "TMT Fe 500 — 16mm dia", unit: "kg",  qtyReceived: "1200", unitRatePaise: 7_500 },
    { grnId: grn1!.id, workPackageItemId: null,      description: "OPC 53 Grade cement",   unit: "bag", qtyReceived: "350",  unitRatePaise: 40_000 },
  ]);

  const [grn2] = await dbConn.insert(grns).values({
    projectId,
    workPackageId: wpId,
    deliveryDate: dayOffset(-7),
    vendorName: "Rajendra Steel & Cement",
    deliveryNoteRef: `DC/RSC/2026/0${pi + 42}`,
    status: "VERIFIED",
    notes: "Second consignment — 12mm bars and coarse aggregate.",
    verifiedById: principalId,
    verifiedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    createdById: principalId,
  }).returning();

  await dbConn.insert(grnItems).values([
    { grnId: grn2!.id, workPackageItemId: grn2WpiId, description: "TMT Fe 500 — 12mm dia", unit: "kg",  qtyReceived: "800", unitRatePaise: 7_200 },
    { grnId: grn2!.id, workPackageItemId: grn1WpiId, description: "Ready-mix concrete M25", unit: "cum", qtyReceived: "25",  unitRatePaise: 5_800_00 },
  ]);

  // Draft GRN (not yet verified — shows workflow in UI)
  await dbConn.insert(grns).values({
    projectId,
    workPackageId: wpId,
    deliveryDate: dayOffset(-1),
    vendorName: "BuildMart Bengaluru",
    deliveryNoteRef: null,
    status: "DRAFT",
    notes: "Pending quality check by site engineer before verification.",
    createdById: principalId,
  });

  console.log(`    ✓ Cost OS spine seeded: ${label} (${projectRef})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo seed failed:", err);
    process.exit(1);
  });
