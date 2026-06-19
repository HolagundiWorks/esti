/**
 * Idempotent PMC demo records — construction schedules, snags, progress reports,
 * site instructions, contractor submissions, and live phase stages.
 */
import { and, asc, eq } from "drizzle-orm";
import type { db } from "../db/index.js";
import {
  constructionActivities,
  contractors,
  contractorSubmissions,
  orgSettings,
  phaseProgress,
  phases,
  progressReports,
  projectOffices,
  siteInstructions,
  snags,
  users,
} from "../db/schema.js";
import { nextRef } from "../lib/numbering.js";
import {
  applyConstructionTemplate,
  loadActivities,
  recalculateAndPersist,
  resolveTemplateKeyForProject,
} from "../modules/construction-schedule/readModels.js";
import { ensureLiveStagesForPhase } from "../modules/pmc/phaseProgress.js";

type Db = typeof db;

function dayOffset(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const PMC_SHOWCASE_TITLES = [
  "Sharma Villa — Whitefield",
  "Verde Commercial Block",
  "GreenField Factory Shed — Hosur",
  "Rao House — Mysuru",
] as const;

type ShowcaseTier = "flagship" | "commercial" | "industrial" | "light";

const TIER_BY_TITLE: Record<(typeof PMC_SHOWCASE_TITLES)[number], ShowcaseTier> = {
  "Sharma Villa — Whitefield": "flagship",
  "Verde Commercial Block": "commercial",
  "GreenField Factory Shed — Hosur": "industrial",
  "Rao House — Mysuru": "light",
};

export type DemoPmcShowcaseStats = {
  projects: number;
  snagsAdded: number;
  reportsAdded: number;
  instructionsAdded: number;
  submissionsAdded: number;
};

const DEMO_CONTRACTORS = [
  {
    name: "Ravi Kumar",
    category: "Civil",
    companyName: "BuildRight Contractors",
    contactPerson: "Ravi Kumar",
    email: "demo-contractor-civil@aorms.in",
    phone: "+91 98450 88001",
    city: "Bengaluru",
    state: "Karnataka",
    qualityRating: 4,
    timelinessRating: 3,
    safetyRating: 4,
  },
  {
    name: "SparkLine MEP",
    category: "MEP",
    companyName: "SparkLine MEP Solutions",
    contactPerson: "Anita Desai",
    email: "demo-contractor-mep@aorms.in",
    phone: "+91 98450 88002",
    city: "Bengaluru",
    state: "Karnataka",
    qualityRating: 5,
    timelinessRating: 4,
    safetyRating: 4,
  },
] as const;

async function ensureDemoContractors(database: Db): Promise<{ civil: string; mep: string }> {
  const ids = { civil: "", mep: "" };
  for (const def of DEMO_CONTRACTORS) {
    const [existing] = await database
      .select({ id: contractors.id })
      .from(contractors)
      .where(eq(contractors.email, def.email))
      .limit(1);
    if (existing) {
      if (def.category === "Civil") ids.civil = existing.id;
      else ids.mep = existing.id;
      continue;
    }
    const [row] = await database
      .insert(contractors)
      .values({ ...def, active: true })
      .returning({ id: contractors.id });
    if (def.category === "Civil") ids.civil = row!.id;
    else ids.mep = row!.id;
  }
  return ids;
}

async function ensureConstructionSchedule(
  database: Db,
  projectId: string,
  tier: ShowcaseTier,
): Promise<void> {
  const existing = await loadActivities(database, projectId);
  if (existing.length === 0) {
    const templateKey = await resolveTemplateKeyForProject(database, projectId);
    const startOffset = tier === "flagship" ? -120 : tier === "industrial" ? -60 : -90;
    await applyConstructionTemplate(database, projectId, templateKey, dayOffset(startOffset));
  }

  const acts = await loadActivities(database, projectId);
  const parentIds = new Set(acts.map((a) => a.parentId).filter(Boolean));
  const leaves = acts.filter((a) => !parentIds.has(a.id));
  const progressProfile =
    tier === "flagship"
      ? [100, 85, 60, 30, 10]
      : tier === "commercial"
        ? [100, 70, 40]
        : tier === "industrial"
          ? [100, 55, 25]
          : [100, 45];

  for (let i = 0; i < Math.min(progressProfile.length, leaves.length); i++) {
    const pct = progressProfile[i]!;
    const act = leaves[i]!;
    await database
      .update(constructionActivities)
      .set({
        percentComplete: pct,
        actualStart: dayOffset(-80 + i * 12),
        actualEnd: pct === 100 ? dayOffset(-40 + i * 5) : null,
        updatedAt: new Date(),
      })
      .where(eq(constructionActivities.id, act.id));
  }
  await recalculateAndPersist(database, projectId);
}

const SNAG_SEEDS: Record<
  ShowcaseTier,
  {
    location: string;
    trade: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "VERIFIED";
    dueDays: number;
  }[]
> = {
  flagship: [
    {
      location: "Ground floor — living room",
      trade: "Civil",
      description: "Minor crack in plaster near window jamb",
      status: "OPEN",
      dueDays: 7,
    },
    {
      location: "First floor — master bath",
      trade: "Plumbing",
      description: "Tile lippage exceeds 2 mm at shower niche",
      status: "IN_PROGRESS",
      dueDays: 3,
    },
    {
      location: "External — west elevation",
      trade: "Facade",
      description: "Sealant gap at aluminium window frame",
      status: "VERIFIED",
      dueDays: -2,
    },
  ],
  commercial: [
    {
      location: "Lobby — GF",
      trade: "Finishes",
      description: "Granite flooring hollow sound at main entry",
      status: "OPEN",
      dueDays: 5,
    },
    {
      location: "Level 2 — corridor",
      trade: "MEP",
      description: "AC diffuser alignment off-centre to grid",
      status: "IN_PROGRESS",
      dueDays: 4,
    },
  ],
  industrial: [
    {
      location: "Bay A — north wall",
      trade: "Structural",
      description: "Anchor bolt torque records pending verification",
      status: "OPEN",
      dueDays: 6,
    },
    {
      location: "Yard — loading dock",
      trade: "Civil",
      description: "Ramp fall short of drainage sump by 15 mm",
      status: "IN_PROGRESS",
      dueDays: 2,
    },
  ],
  light: [
    {
      location: "Kitchen",
      trade: "Joinery",
      description: "Shutter gap inconsistent at countertop unit",
      status: "OPEN",
      dueDays: 10,
    },
  ],
};

async function ensureSnags(database: Db, projectId: string, tier: ShowcaseTier): Promise<number> {
  let added = 0;
  for (const seed of SNAG_SEEDS[tier]) {
    const [exists] = await database
      .select({ id: snags.id })
      .from(snags)
      .where(and(eq(snags.projectId, projectId), eq(snags.description, seed.description)))
      .limit(1);
    if (exists) continue;
    const { ref } = await nextRef(database, "snag", "SNG");
    await database.insert(snags).values({
      projectId,
      ref,
      location: seed.location,
      trade: seed.trade,
      description: seed.description,
      status: seed.status,
      dueDate: dayOffset(seed.dueDays),
      closedAt: seed.status === "VERIFIED" ? new Date() : null,
    });
    added++;
  }
  return added;
}

async function ensureProgressReports(
  database: Db,
  projectId: string,
  tier: ShowcaseTier,
  createdById: string,
): Promise<number> {
  let added = 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const periodStart = monthStart.toISOString().slice(0, 10);
  const periodEnd = monthEnd.toISOString().slice(0, 10);

  const narrativeDraft =
    tier === "flagship"
      ? "Construction progressing per programme. Three snags tracked — one verified, one in progress, one open. Slab works on schedule."
      : tier === "commercial"
        ? "Structural frame complete; façade mock-up under review. Two open site items."
        : tier === "industrial"
          ? "Steel erection 55% complete. Quality hold on anchor bolt records."
          : "Fit-out underway; one joinery snag open.";

  const [draftExists] = await database
    .select({ id: progressReports.id })
    .from(progressReports)
    .where(and(eq(progressReports.projectId, projectId), eq(progressReports.status, "DRAFT")))
    .limit(1);

  const openSnagCount = SNAG_SEEDS[tier].filter((s) => s.status !== "VERIFIED").length;
  const schedulePct =
    tier === "flagship" ? 42 : tier === "commercial" ? 38 : tier === "industrial" ? 28 : 22;

  if (!draftExists) {
    await database.insert(progressReports).values({
      projectId,
      periodStart,
      periodEnd,
      narrative: narrativeDraft,
      physicalProgressPct: schedulePct,
      scheduleProgressPct: schedulePct,
      openSnagCount,
      openRfiCount: tier === "flagship" ? 1 : tier === "commercial" ? 2 : 0,
      status: "DRAFT",
      createdById,
    });
    added++;
  }

  if (tier !== "light") {
    const prevStart = new Date(monthStart);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
    const prevPeriodStart = prevStart.toISOString().slice(0, 10);

    const [issuedExists] = await database
      .select({ id: progressReports.id })
      .from(progressReports)
      .where(and(eq(progressReports.projectId, projectId), eq(progressReports.status, "ISSUED")))
      .limit(1);

    if (!issuedExists) {
      await database.insert(progressReports).values({
        projectId,
        periodStart: prevPeriodStart,
        periodEnd: prevEnd.toISOString().slice(0, 10),
        narrative: "Previous month close-out: programme on track with minor snag backlog.",
        physicalProgressPct: schedulePct - 8,
        scheduleProgressPct: schedulePct - 8,
        openSnagCount: 2,
        openRfiCount: 0,
        status: "ISSUED",
        createdById,
      });
      added++;
    }
  }
  return added;
}

async function ensureSiteInstructions(
  database: Db,
  projectId: string,
  tier: ShowcaseTier,
  contractorIds: { civil: string; mep: string },
  createdById: string,
): Promise<number> {
  if (tier === "light") return 0;

  const seeds = [
    ...(tier === "industrial"
      ? [
          {
            subject: "Hold steel erection until anchor bolt sign-off",
            body: "Do not resume truss lifts in Bay A until torque records are accepted by the structural engineer.",
            contractorId: contractorIds.civil,
            issuedDays: -3,
          },
        ]
      : [
          {
            subject: "Hold plaster works in GF living area",
            body: "Complete crack investigation before further plaster application. Refer snag board on site.",
            contractorId: contractorIds.civil,
            issuedDays: -5,
          },
        ]),
    ...(tier === "commercial" || tier === "flagship"
      ? [
          {
            subject: "Re-align AC diffusers — Level 2 corridor",
            body: "Contractor to submit revised shop drawing per architect markup.",
            contractorId: contractorIds.mep,
            issuedDays: -2,
          },
        ]
      : []),
  ];

  let added = 0;
  for (const seed of seeds) {
    const [exists] = await database
      .select({ id: siteInstructions.id })
      .from(siteInstructions)
      .where(and(eq(siteInstructions.projectId, projectId), eq(siteInstructions.subject, seed.subject)))
      .limit(1);
    if (exists) continue;
    const { ref } = await nextRef(database, "siteinstruction", "SI");
    await database.insert(siteInstructions).values({
      ref,
      projectId,
      contractorId: seed.contractorId,
      subject: seed.subject,
      body: seed.body,
      issuedAt: dayOffset(seed.issuedDays),
      createdById,
    });
    added++;
  }
  return added;
}

async function ensureContractorSubmissions(
  database: Db,
  projectId: string,
  tier: ShowcaseTier,
  contractorIds: { civil: string; mep: string },
  submittedById: string,
): Promise<number> {
  if (tier === "light") return 0;

  const seeds: {
    kind: string;
    subject: string;
    body: string;
    status: string;
    contractorId: string;
    reviewCode?: string;
  }[] =
    tier === "flagship"
      ? [
          {
            kind: "RFI",
            subject: "Clarification on waterproofing upturn at terrace",
            body: "Contractor requests confirmation of upturn height at parapet.",
            status: "OPEN",
            contractorId: contractorIds.civil,
          },
          {
            kind: "NCR",
            subject: "Rebar spacing variance at GF column C4",
            body: "Site inspection found 25 mm deviation from GFC.",
            status: "ACKNOWLEDGED",
            contractorId: contractorIds.civil,
            reviewCode: "REVISE",
          },
          {
            kind: "MATERIAL_SUBMITTAL",
            subject: "Vitrified tile sample — living areas",
            body: "Sample board ref VT-2024-03 attached.",
            status: "OPEN",
            contractorId: contractorIds.civil,
          },
        ]
      : tier === "commercial"
        ? [
            {
              kind: "RFI",
              subject: "Facade glass colour mock-up approval",
              body: "Awaiting architect sign-off on spandrel panel tint.",
              status: "OPEN",
              contractorId: contractorIds.mep,
            },
            {
              kind: "SHOP_DRAWING",
              subject: "Lobby false ceiling layout — Rev B",
              body: "Revised per MEP coordination clash report.",
              status: "OPEN",
              contractorId: contractorIds.mep,
            },
          ]
        : [
            {
              kind: "RFI",
              subject: "Crane pad bearing capacity confirmation",
              body: "Erection contractor needs geotech confirmation for 80T crane.",
              status: "OPEN",
              contractorId: contractorIds.civil,
            },
            {
              kind: "NCR",
              subject: "Weld inspection — truss node T-14",
              body: "UT report flagged porosity; repair method requested.",
              status: "ACKNOWLEDGED",
              contractorId: contractorIds.civil,
            },
          ];

  let added = 0;
  for (const seed of seeds) {
    const [exists] = await database
      .select({ id: contractorSubmissions.id })
      .from(contractorSubmissions)
      .where(
        and(eq(contractorSubmissions.projectId, projectId), eq(contractorSubmissions.subject, seed.subject)),
      )
      .limit(1);
    if (exists) continue;
    await database.insert(contractorSubmissions).values({
      projectId,
      contractorId: seed.contractorId,
      kind: seed.kind,
      subject: seed.subject,
      body: seed.body,
      status: seed.status,
      reviewCode: seed.reviewCode ?? null,
      submittedById,
    });
    added++;
  }
  return added;
}

async function ensureLivePhaseStages(database: Db, projectId: string, tier: ShowcaseTier): Promise<void> {
  const [caPhase] = await database
    .select({ id: phases.id, code: phases.code })
    .from(phases)
    .where(and(eq(phases.projectId, projectId), eq(phases.code, "CONSTRUCTION_ADMINISTRATION")))
    .limit(1);
  if (!caPhase) return;

  await ensureLiveStagesForPhase(database, caPhase.id, caPhase.code);

  const statuses =
    tier === "flagship"
      ? ["COMPLETE", "IN_PROGRESS", "IN_PROGRESS", "NOT_STARTED", "NOT_STARTED"]
      : tier === "commercial"
        ? ["COMPLETE", "COMPLETE", "IN_PROGRESS", "NOT_STARTED", "NOT_STARTED"]
        : tier === "industrial"
          ? ["COMPLETE", "IN_PROGRESS", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED"]
          : ["COMPLETE", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED"];

  const stageRows = await database
    .select()
    .from(phaseProgress)
    .where(eq(phaseProgress.phaseId, caPhase.id))
    .orderBy(asc(phaseProgress.sortOrder));

  for (let i = 0; i < stageRows.length; i++) {
    const target = statuses[i] ?? "NOT_STARTED";
    const row = stageRows[i]!;
    if (row.status === target) continue;
    await database
      .update(phaseProgress)
      .set({
        status: target as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE",
        completedAt: target === "COMPLETE" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(phaseProgress.id, row.id));
  }

  if (tier === "flagship") {
    const [hoPhase] = await database
      .select({ id: phases.id, code: phases.code })
      .from(phases)
      .where(and(eq(phases.projectId, projectId), eq(phases.code, "HANDOVER_CLOSEOUT")))
      .limit(1);
    if (hoPhase) {
      await ensureLiveStagesForPhase(database, hoPhase.id, hoPhase.code);
    }
  }
}

/** Backfill PMC portfolio data for studio demo projects (idempotent). */
export async function ensureDemoPmcShowcase(
  database: Db,
  principalId: string,
): Promise<DemoPmcShowcaseStats> {
  const stats: DemoPmcShowcaseStats = {
    projects: 0,
    snagsAdded: 0,
    reportsAdded: 0,
    instructionsAdded: 0,
    submissionsAdded: 0,
  };

  const [settings] = await database.select({ id: orgSettings.id }).from(orgSettings).limit(1);
  if (settings) {
    await database
      .update(orgSettings)
      .set({ pmcEnabled: true, updatedAt: new Date() })
      .where(eq(orgSettings.id, settings.id));
  }

  const contractorIds = await ensureDemoContractors(database);

  for (const title of PMC_SHOWCASE_TITLES) {
    const [project] = await database
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .innerJoin(users, eq(users.id, projectOffices.createdById))
      .where(and(eq(projectOffices.title, title), eq(users.isDemo, true)))
      .limit(1);
    if (!project) continue;

    const tier = TIER_BY_TITLE[title];
    await database
      .update(projectOffices)
      .set({ pmcEnabled: true, updatedAt: new Date() })
      .where(eq(projectOffices.id, project.id));

    await ensureConstructionSchedule(database, project.id, tier);
    stats.snagsAdded += await ensureSnags(database, project.id, tier);
    stats.reportsAdded += await ensureProgressReports(database, project.id, tier, principalId);
    stats.instructionsAdded += await ensureSiteInstructions(
      database,
      project.id,
      tier,
      contractorIds,
      principalId,
    );
    stats.submissionsAdded += await ensureContractorSubmissions(
      database,
      project.id,
      tier,
      contractorIds,
      principalId,
    );
    await ensureLivePhaseStages(database, project.id, tier);
    stats.projects++;
  }

  return stats;
}
