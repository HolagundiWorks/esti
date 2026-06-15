/**
 * Solo-firm demo seed — a single-architect practice with HR and teams OFF.
 *
 *   pnpm --filter @esti/backend seed:demo:solo
 *   (or in a container: cd /app/backend && pnpm seed:demo:solo)
 *
 * Intended for a SEPARATE instance (e.g. a "solo" demo site) — it sets the firm
 * to a solo practice, disables the HR/teams feature, and seeds one OWNER login
 * with a handful of projects, fees, GST invoices, permits, tasks, decisions, a
 * client portal login and one consultant engagement. No team members, payroll,
 * timesheets or stand-ups. Idempotent on the solo owner email. NOT for production.
 */
import { DEFAULT_PHASE_PLAN, GstSystem, computeGst } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  clients,
  consultants,
  decisions,
  engagements,
  feeProposals,
  firm,
  invoices,
  orgSettings,
  permits,
  phases,
  projectOffices,
  tasks,
  users,
} from "../db/schema.js";
import { getFirm } from "../lib/firm.js";
import { getOrgSettings } from "../lib/settings.js";
import { nextRef } from "../lib/numbering.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";
const ARCHITECT = "Aanya Sharma";

function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main(): Promise<void> {
  const ownerEmail = "solo@demo.aorms.in";
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, ownerEmail));
  if (exists) {
    console.log("✓ solo demo workspace already present — nothing to do");
    return;
  }

  const pwHash = await hashPassword(DEMO_PASSWORD);

  // ── Firm + settings: a solo practice, HR/teams off ─────────────────────────
  const f = await getFirm(db);
  await db.update(firm).set({ companyName: "Studio Aanya — Architecture", firmType: "SOLO" }).where(eq(firm.id, f.id));
  const fresh = await getFirm(db);
  const system = (fresh.gstType as GstSystem) ?? GstSystem.REGULAR;

  const settings = await getOrgSettings(db);
  await db.update(orgSettings).set({ hrEnabled: false }).where(eq(orgSettings.id, settings.id));

  // ── The solo architect (sole login) ────────────────────────────────────────
  const [owner] = await db
    .insert(users)
    .values({ email: ownerEmail, fullName: `Ar. ${ARCHITECT}`, role: "OWNER", passwordHash: pwHash, isDemo: true })
    .returning();
  const ownerId = owner!.id;

  // ── Clients ────────────────────────────────────────────────────────────────
  const clientRows = await db.insert(clients).values([
    { name: "Iyer Family", kind: "INDIVIDUAL", city: "Bengaluru", state: "Karnataka", email: "client@demo.aorms.in", phone: "+91 99000 10001" },
    { name: "Desai & Co.", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "hello@desaico.in", phone: "+91 99000 10002" },
    { name: "Hegde Family", kind: "INDIVIDUAL", city: "Bengaluru", state: "Karnataka", email: "hegde@example.in", phone: "+91 99000 10003" },
    { name: "Rao Hospitality LLP", kind: "COMPANY", city: "Bengaluru", state: "Karnataka", email: "build@raohospitality.in", phone: "+91 99000 10004" },
  ]).returning();

  // One client portal login (attached to the first client).
  await db.insert(users).values({ email: "client@demo.aorms.in", fullName: "Lakshmi Iyer (Client)", role: "CLIENT", passwordHash: pwHash, isDemo: true, clientId: clientRows[0]!.id });

  // ── One external consultant (consultants are not "team") ───────────────────
  const [structural] = await db.insert(consultants).values(
    { name: "Prakash Iyer", discipline: "Structural", firm: "Iyer Structural Studio", email: "prakash@iyerstruct.in", phone: "+91 98450 55501" },
  ).returning();

  // ── Projects ───────────────────────────────────────────────────────────────
  const projectDefs = [
    { client: clientRows[0]!, title: "Iyer Residence — Jayanagar", projectType: "Residential Architecture", value: 1_40_00_000, status: "ACTIVE", progress: 2 },
    { client: clientRows[1]!, title: "Desai Studio Apartment — Indiranagar", projectType: "Interior Design", value: 65_00_000, status: "ACTIVE", progress: 1 },
    { client: clientRows[2]!, title: "Hegde Weekend Home — Nandi Hills", projectType: "Residential Architecture", value: 2_30_00_000, status: "ACTIVE", progress: 0 },
    { client: clientRows[3]!, title: "Rao Boutique Café — Koramangala", projectType: "Commercial Architecture", value: 85_00_000, status: "COMPLETE", progress: 6 },
  ];

  const taskDefsByProject: { title: string; priority: string; due: string; status: string; classification: string; workType: string; difficulty: number; hours: string }[][] = [
    [
      { title: "Issue working drawings — ground floor", priority: "HIGH", due: dayOffset(0), status: "IN_PROGRESS", classification: "BILLABLE", workType: "TECHNICAL_PRODUCTION", difficulty: 3, hours: "8.00" },
      { title: "Coordinate structural consultant — column schedule", priority: "MEDIUM", due: dayOffset(2), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 3, hours: "6.00" },
      { title: "Prepare GST invoice — milestone 2", priority: "LOW", due: dayOffset(1), status: "TODO", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
    ],
    [
      { title: "Material & finishes board", priority: "HIGH", due: dayOffset(1), status: "IN_PROGRESS", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 2, hours: "6.00" },
      { title: "Client walkthrough of 3D views", priority: "MEDIUM", due: dayOffset(4), status: "TODO", classification: "BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 2, hours: "3.00" },
    ],
    [
      { title: "Concept design — split-level scheme", priority: "HIGH", due: dayOffset(3), status: "TODO", classification: "BILLABLE", workType: "DESIGN_DEVELOPMENT", difficulty: 4, hours: "14.00" },
      { title: "Site contour study", priority: "MEDIUM", due: dayOffset(6), status: "TODO", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "4.00" },
    ],
    [
      { title: "Snag list & handover", priority: "MEDIUM", due: dayOffset(-5), status: "DONE", classification: "BILLABLE", workType: "CONSTRUCTION_SUPPORT", difficulty: 2, hours: "5.00" },
      { title: "Final GST invoice & closure", priority: "LOW", due: dayOffset(-2), status: "DONE", classification: "NON_BILLABLE", workType: "DESIGN_COMMUNICATION", difficulty: 1, hours: "1.00" },
    ],
  ];

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
      createdById: ownerId,
    }).returning();
    const projectId = project!.id;

    await db.insert(phases).values(
      DEFAULT_PHASE_PLAN.map((st, idx) => ({
        projectId,
        code: st.code,
        label: st.label,
        billingPct: st.billingPct,
        sortOrder: idx,
        status: idx < def.progress ? "COMPLETE" : idx === def.progress ? "IN_PROGRESS" : "NOT_STARTED",
      })),
    );

    const { ref: feeRef } = await nextRef(db, "feeproposal", "FEE");
    await db.insert(feeProposals).values({
      ref: feeRef, projectId, workCategory: "ARCHITECTURE",
      costOfWorksPaise: def.value, feePaise: Math.round(def.value * 0.08),
      docCommPct: 10, coaMinimumPaise: 0, belowMinimum: false,
    });

    const invoiceDefs: { offset: number; status: "PAID" | "ISSUED" }[] =
      def.status === "COMPLETE"
        ? [{ offset: -120, status: "PAID" }, { offset: -60, status: "PAID" }, { offset: -20, status: "PAID" }]
        : pi === 2
          ? [{ offset: -15, status: "ISSUED" }]
          : [{ offset: -60, status: "PAID" }, { offset: -10, status: "ISSUED" }];

    for (const inv of invoiceDefs) {
      const taxable = Math.round(def.value * 0.02);
      const g = computeGst(system, taxable, false);
      const { ref: invRef } = await nextRef(db, "invoice", "INV");
      await db.insert(invoices).values({
        ref: invRef, projectId, clientId: def.client.id, status: inv.status,
        gstSystem: system, documentKind: g.documentKind,
        sac: system === GstSystem.REGULAR ? "998322" : null,
        interState: false, tdsApplicable: fresh.tdsApplicableDefault,
        taxablePaise: g.taxable, cgstPaise: g.cgst, sgstPaise: g.sgst, igstPaise: 0,
        gstTotalPaise: g.gstTotal, compositionLevyPaise: g.compositionLevy, tdsPaise: 0,
        grandTotalPaise: g.grandTotal, netReceivablePaise: g.grandTotal,
        dateInvoice: dayOffset(inv.offset),
      });
    }

    const { ref: pmtRef } = await nextRef(db, "permit", "PMT");
    await db.insert(permits).values({
      ref: pmtRef, projectId, permitType: "Building plan sanction", authority: "BBMP",
      applicationNo: `BBMP/2026/${2000 + pi}`,
      status: pi === 0 ? "SUBMITTED" : pi === 3 ? "APPROVED" : "NOT_STARTED",
      dateSubmitted: pi === 0 || pi === 3 ? dayOffset(-40 - pi * 5) : null,
      dateDue: dayOffset(15 + pi * 4),
    });

    await db.insert(tasks).values(
      (taskDefsByProject[pi] ?? []).map((t) => ({
        title: `${t.title} (${ref})`, projectId, assignee: ARCHITECT,
        priority: t.priority, status: t.status, dueDate: t.due,
        classification: t.classification, workType: t.workType,
        difficultyCoefficient: t.difficulty, estimatedHours: t.hours, createdById: ownerId,
      })),
    );

    await db.insert(decisions).values({
      projectId,
      title: pi === 0 ? "Switch facade to textured plaster over stone" : pi === 1 ? "Open-plan studio vs partitioned" : pi === 2 ? "Split-level vs single-level on the slope" : "Café seating layout — banquette vs loose",
      rationale: "Confirmed with client after presentation; awaiting final sign-off.",
      approval: pi === 3 ? "APPROVED" : "PENDING",
      impact: pi === 2 ? "HIGH" : "MEDIUM",
      status: pi === 3 ? "CLOSED" : "OPEN",
      state: pi === 3 ? "LOCKED" : "CLIENT_REVIEW",
      revisionCategory: pi < 2 ? "MINOR" : "MAJOR",
      revisionSource: pi % 2 === 0 ? "CLIENT_DRIVEN" : "SCOPE_CHANGE",
      ownerName: ARCHITECT,
      actorName: ARCHITECT,
      reviewDeadline: dayOffset(5 + pi),
    });

    // One consultant engagement on the first project (collaborator-portal demo).
    if (pi === 0) {
      await db.insert(engagements).values({
        projectId, consultantId: structural!.id,
        scope: "RCC structural design, GFC review and site clarifications",
        agreedFeePaise: Math.round(def.value * 0.01), paidPaise: 0, status: "ENGAGED",
      });
    }

    pi += 1;
  }

  console.log("✓ solo demo workspace seeded");
  console.log("  Owner login:  solo@demo.aorms.in / " + DEMO_PASSWORD);
  console.log("  Client login: client@demo.aorms.in / " + DEMO_PASSWORD);
  console.log("  HR/teams: OFF · firm: Studio Aanya — Architecture (SOLO)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
