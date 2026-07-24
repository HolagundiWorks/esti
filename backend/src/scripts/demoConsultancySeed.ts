/**
 * AORMS-Consultancy demo spine — enquiry → engagement → BILLABLE fee stage.
 * Consumed by seedDemo.ts (full seed + backfill). Idempotent by engagement code.
 *
 * Inventory: docs/esti/DEMO-SEED-ITEMS.md § Consultancy
 */
import { eq, inArray, like, or } from "drizzle-orm";
import type { db as DbType } from "../db/index.js";
import {
  clients,
  consDeliverables,
  consEngagements,
  consEnquiries,
  consFeeStages,
  consRateCards,
} from "../db/schema.js";

type DB = typeof DbType;

const DEMO_ENGAGEMENT_CODE = "C-DEMO-001";
const DEMO_ENQUIRY_REF = "EQ-DEMO-001";
const DEMO_CLIENT_NAME = "Apex Precast Structures Pvt Ltd";

/** Wipe consultancy demo rows (force re-seed). Safe when none exist. */
export async function clearDemoConsultancyRows(db: DB): Promise<void> {
  const eng = await db
    .select({ id: consEngagements.id })
    .from(consEngagements)
    .where(
      or(
        eq(consEngagements.code, DEMO_ENGAGEMENT_CODE),
        like(consEngagements.notes, "%demo-seed:consultancy%"),
      ),
    );
  const engIds = eng.map((e) => e.id);
  if (engIds.length > 0) {
    // Children cascade from engagement; clear enquiry links first.
    await db
      .update(consEnquiries)
      .set({ convertedEngagementId: null, status: "RECEIVED", updatedAt: new Date() })
      .where(
        or(
          eq(consEnquiries.ref, DEMO_ENQUIRY_REF),
          inArray(consEnquiries.convertedEngagementId, engIds),
        ),
      );
    await db.delete(consEngagements).where(inArray(consEngagements.id, engIds));
  }
  await db.delete(consEnquiries).where(eq(consEnquiries.ref, DEMO_ENQUIRY_REF));
}

/**
 * Seed a short engagement→invoice demo path for consultancy.aorms.in walkthroughs.
 * Skips when C-DEMO-001 already exists (unless cleared first).
 */
export async function seedDemoConsultancy(db: DB, principalId: string): Promise<void> {
  const [existing] = await db
    .select({ id: consEngagements.id })
    .from(consEngagements)
    .where(eq(consEngagements.code, DEMO_ENGAGEMENT_CODE))
    .limit(1);
  if (existing) {
    console.log("  consultancy demo spine present — skipped");
    return;
  }

  // Rate card grades (idempotent upsert by grade unique index).
  for (const row of [
    { grade: "PRINCIPAL", ratePaise: 450_000, capacityHoursWeek: 20 },
    { grade: "SENIOR_ENGINEER", ratePaise: 280_000, capacityHoursWeek: 35 },
    { grade: "ENGINEER", ratePaise: 160_000, capacityHoursWeek: 40 },
  ] as const) {
    const [hit] = await db
      .select({ grade: consRateCards.grade })
      .from(consRateCards)
      .where(eq(consRateCards.grade, row.grade))
      .limit(1);
    if (!hit) {
      await db.insert(consRateCards).values(row);
    }
  }

  let [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.name, DEMO_CLIENT_NAME))
    .limit(1);
  if (!client) {
    [client] = await db
      .insert(clients)
      .values({
        name: DEMO_CLIENT_NAME,
        kind: "COMPANY",
        city: "Bengaluru",
        state: "Karnataka",
        email: "projects@apexprime.in",
        phone: "+91 80471 22001",
      })
      .returning();
  }
  if (!client) throw new Error("consultancy demo client insert failed");

  const [eng] = await db
    .insert(consEngagements)
    .values({
      code: DEMO_ENGAGEMENT_CODE,
      title: "Apex PEB warehouse — Whitefield structural",
      clientId: client.id,
      model: "FULL_DESIGN",
      consultancyType: "STRUCTURAL",
      leadDiscipline: "STRUCTURAL",
      disciplines: ["STRUCTURAL"],
      stage: "Schematic",
      status: "ACTIVE",
      feeModel: "LUMP_SUM",
      feeTotalPaise: 18_00_000_00, // ₹18,00,000
      relianceScope: "Structural design for PEB warehouse; architect IFC as working assumption.",
      notes: "demo-seed:consultancy\nConverted from enquiry EQ-DEMO-001 for P9.V walkthrough.",
    })
    .returning();
  if (!eng) throw new Error("consultancy demo engagement insert failed");

  const [enq] = await db
    .insert(consEnquiries)
    .values({
      ref: DEMO_ENQUIRY_REF,
      title: "Apex PEB warehouse — Whitefield",
      clientName: DEMO_CLIENT_NAME,
      contactName: "Ravi Shetty",
      phone: "+91 98450 22001",
      email: "ravi@apexprime.in",
      source: "Referral",
      siteLocation: "Whitefield, Bengaluru",
      consultancyType: "STRUCTURAL",
      leadDiscipline: "STRUCTURAL",
      model: "FULL_DESIGN",
      status: "WON",
      capacityFit: 4,
      feeAttractiveness: 5,
      risk: 2,
      strategicFit: 4,
      conflictCheckDone: true,
      decisionNote: "Go — capacity available; fee attractive; low conflict.",
      decidedBy: principalId,
      decidedByName: "Ar. Vihaan Sharma (Principal)",
      decidedAt: new Date(),
      convertedEngagementId: eng.id,
      notes: "demo-seed:consultancy",
      createdBy: principalId,
    })
    .returning();
  if (!enq) throw new Error("consultancy demo enquiry insert failed");

  const [deliv] = await db
    .insert(consDeliverables)
    .values({
      engagementId: eng.id,
      code: "STR-CAL-001",
      title: "Foundation & column schedule",
      discipline: "STRUCTURAL",
      revision: "A",
      issueClass: "FOR_CONSTRUCTION",
      checkCategory: "CAT1",
      status: "DRAFT",
      originatedBy: principalId,
      notes: "demo-seed:consultancy",
    })
    .returning();

  await db.insert(consFeeStages).values([
    {
      engagementId: eng.id,
      label: "Appointment / kickoff",
      amountPaise: 3_60_000_00, // 20%
      status: "INVOICED",
      billableAt: new Date(Date.now() - 14 * 86_400_000),
      invoicedAt: new Date(Date.now() - 12 * 86_400_000),
    },
    {
      engagementId: eng.id,
      label: "Schematic structural package",
      amountPaise: 7_20_000_00, // 40%
      deliverableId: deliv?.id ?? null,
      status: "BILLABLE",
      billableAt: new Date(),
    },
    {
      engagementId: eng.id,
      label: "GFC / construction issue",
      amountPaise: 7_20_000_00, // 40%
      status: "PENDING",
    },
  ]);

  console.log(
    `  consultancy demo: ${DEMO_ENQUIRY_REF} → ${DEMO_ENGAGEMENT_CODE} (BILLABLE fee stage ready)`,
  );
}
