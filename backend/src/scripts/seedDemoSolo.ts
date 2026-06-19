/**
 * Solo-practice demo workspace — separate from the studio demo (`seedDemo.ts`).
 *
 *   pnpm --filter @esti/backend seed:demo:solo
 *
 * Login: solo@demo.aorms.in / demo1234 (or SEED_DEMO_PASSWORD)
 * orgMode SOLO, hrEnabled false — no team module noise on dashboard or nav.
 */
import { DEFAULT_PHASE_PLAN } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import {
  clients,
  orgSettings,
  phases,
  projectOffices,
  tasks,
  teamMembers,
  users,
} from "../db/schema.js";
import { getFirm } from "../lib/firm.js";
import { getOrgSettings } from "../lib/settings.js";
import { syncDemoUploadPassword } from "../lib/uploadSecurity.js";
import { ensureDemoSchema } from "./seedBootstrap.js";
import { ensureSoloDemoShowcase } from "./seedDemoShowcase.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";
const SOLO_EMAIL = "solo@demo.aorms.in";

function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main(): Promise<void> {
  await ensureDemoSchema();
  console.log("✓ migrations applied");

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, SOLO_EMAIL));
  if (exists) {
    const settings = await getOrgSettings(db);
    await db
      .update(orgSettings)
      .set({ hrEnabled: false, orgMode: "SOLO" })
      .where(eq(orgSettings.id, settings.id));
    await ensureSoloDemoShowcase(db);
    await syncDemoUploadPassword(db, DEMO_PASSWORD);
    console.log("✓ solo demo workspace already present (org mode + showcase refreshed)");
    return;
  }

  await getFirm(db);
  const pwHash = await hashPassword(DEMO_PASSWORD);
  const settings = await getOrgSettings(db);
  await db
    .update(orgSettings)
    .set({ hrEnabled: false, orgMode: "SOLO" })
    .where(eq(orgSettings.id, settings.id));
  await syncDemoUploadPassword(db, DEMO_PASSWORD);

  const [owner] = await db
    .insert(users)
    .values({
      email: SOLO_EMAIL,
      fullName: "Ar. Meera Iyer (Solo Principal)",
      role: "OWNER",
      passwordHash: pwHash,
      isDemo: true,
    })
    .returning();

  const [principalMember] = await db
    .insert(teamMembers)
    .values({
      name: "Meera Iyer",
      role: "Principal Architect",
      employmentType: "FULL_TIME",
      email: SOLO_EMAIL,
      userId: owner!.id,
      monthlySalaryPaise: 0,
      dateJoined: dayOffset(-800),
      active: true,
    })
    .returning();

  const clientRows = await db
    .insert(clients)
    .values([
      {
        name: "Desai Residence",
        kind: "INDIVIDUAL",
        city: "Bengaluru",
        state: "Karnataka",
        email: "desai@example.in",
        phone: "+91 98450 20001",
      },
      {
        name: "Corner Cafe LLP",
        kind: "COMPANY",
        city: "Bengaluru",
        state: "Karnataka",
        email: "build@cornercafe.in",
        phone: "+91 80471 20002",
      },
      {
        name: "Ravi & Ananya Khanna",
        kind: "INDIVIDUAL",
        city: "Mysuru",
        state: "Karnataka",
        email: "khanna.home@example.in",
        phone: "+91 98860 20003",
      },
    ])
    .returning();

  const projectDefs = [
    { ref: "PRJ-S01", title: "Desai Residence — Indiranagar", clientId: clientRows[0]!.id, type: "Residential Architecture", value: 45_00_000_00 },
    { ref: "PRJ-S02", title: "Corner Cafe — Commercial fit-out", clientId: clientRows[1]!.id, type: "Commercial Architecture", value: 28_00_000_00 },
    { ref: "PRJ-S03", title: "Khanna House — Mysuru", clientId: clientRows[2]!.id, type: "Residential Architecture", value: 32_00_000_00 },
  ];

  for (const [pi, def] of projectDefs.entries()) {
    const [project] = await db
      .insert(projectOffices)
      .values({
        ref: def.ref,
        title: def.title,
        clientId: def.clientId,
        projectType: def.type,
        jurisdiction: "BBMP",
        status: "ACTIVE",
        state: pi === 2 ? "Karnataka" : "Karnataka",
        contractValuePaise: def.value,
        createdById: owner!.id,
      })
      .returning();

    const insertedPhases = await db
      .insert(phases)
      .values(
        DEFAULT_PHASE_PLAN.map((st, idx) => ({
          projectId: project!.id,
          code: st.code,
          label: st.label,
          billingPct: st.billingPct,
          sortOrder: idx,
          status: idx === 0 ? "IN_PROGRESS" : "NOT_STARTED",
        })),
      )
      .returning();
    await db
      .update(projectOffices)
      .set({ currentPhaseId: insertedPhases[0]!.id })
      .where(eq(projectOffices.id, project!.id));

    await db.insert(tasks).values([
      {
        projectId: project!.id,
        title: "Schematic layout review",
        assigneeId: principalMember!.id,
        assignee: principalMember!.name,
        status: pi === 0 ? "IN_PROGRESS" : "TODO",
        priority: "HIGH",
        dueDate: dayOffset(3 + pi),
        classification: "BILLABLE",
        workType: "DESIGN_DEVELOPMENT",
        createdById: owner!.id,
      },
      {
        projectId: project!.id,
        title: "Client meeting — design options",
        assigneeId: principalMember!.id,
        assignee: principalMember!.name,
        status: "TODO",
        priority: "MEDIUM",
        dueDate: dayOffset(7 + pi),
        classification: "BILLABLE",
        workType: "DESIGN_COMMUNICATION",
        createdById: owner!.id,
      },
    ]);
  }

  await ensureSoloDemoShowcase(db);

  console.log("✓ seeded solo demo workspace");
  console.log(`    login: ${SOLO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("    orgMode SOLO · hrEnabled false · 3 projects · principal-only tasks");
  console.log("    Studio demo: principal@demo.aorms.in (pnpm seed:demo)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("solo demo seed failed:", err);
    process.exit(1);
  });
