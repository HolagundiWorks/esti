import {
  ProgramSpaceCreate,
  ProgramSpaceUpdate,
  summarizeProgram,
  type ProgramSpaceLike,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { preProjectAssessments, programSpaces, programs } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import type { DB } from "../../db/index.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer = capabilityProcedure("write");

/** Latest program (highest version) for a project, or null. */
async function latestProgram(db: DB, projectId: string) {
  const [row] = await db
    .select()
    .from(programs)
    .where(eq(programs.projectId, projectId))
    .orderBy(desc(programs.version))
    .limit(1);
  return row ?? null;
}

/** The feasibility envelope (max built area) for a project — the source of truth. */
async function feasibilityEnvelope(db: DB, projectId: string): Promise<number> {
  const [a] = await db
    .select({ superBuiltupArea: preProjectAssessments.superBuiltupArea })
    .from(preProjectAssessments)
    .where(eq(preProjectAssessments.projectId, projectId));
  return a?.superBuiltupArea ?? 0;
}

async function assertEditable(db: DB, programId: string) {
  const [p] = await db.select().from(programs).where(eq(programs.id, programId));
  if (!p) throw new TRPCError({ code: "NOT_FOUND" });
  if (p.status === "FROZEN")
    throw new TRPCError({ code: "FORBIDDEN", message: "A frozen program cannot be edited — create a new version." });
  return p;
}

export const programRouter = router({
  /** The latest program row (no spaces). */
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => latestProgram(ctx.db, input.projectId)),

  /**
   * Frozen program versions for a project (newest first) — the baselines a CRIF
   * revision can be measured against (`esti_decision.program_version_id`).
   */
  listVersions: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: programs.id,
          version: programs.version,
          status: programs.status,
          frozenAt: programs.frozenAt,
          maxBuiltAreaSqm: programs.maxBuiltAreaSqm,
        })
        .from(programs)
        .where(and(eq(programs.projectId, input.projectId), eq(programs.status, "FROZEN")))
        .orderBy(desc(programs.version));
    }),

  /**
   * The latest program + its spaces + the summary against the feasibility
   * envelope. While DRAFT the envelope is read live from the assessment (the
   * single source of truth); a FROZEN program uses its snapshot. Returns null
   * when no program exists yet.
   */
  summary: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const program = await latestProgram(ctx.db, input.projectId);
      if (!program) return null;
      const spaces = await ctx.db
        .select()
        .from(programSpaces)
        .where(eq(programSpaces.programId, program.id))
        .orderBy(programSpaces.floorLevel, programSpaces.sortOrder, programSpaces.createdAt);
      const envelope =
        program.status === "FROZEN"
          ? program.maxBuiltAreaSqm
          : await feasibilityEnvelope(ctx.db, input.projectId);
      const like: ProgramSpaceLike[] = spaces.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        floorLevel: s.floorLevel,
        unitAreaSqm: s.unitAreaSqm,
        count: s.count,
      }));
      return { program, ...summarizeProgram(like, envelope) };
    }),

  /**
   * The canonical upstream reference for site delivery — the feasibility envelope
   * (assessment figures) + the latest FROZEN program (spaces + summary). Read-only:
   * feasibility-to-site stays one source of truth. Returns nulls when not yet set.
   */
  siteReference: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [assessment] = await ctx.db
        .select({
          siteAreaSqm: preProjectAssessments.siteAreaSqm,
          permissibleFarArea: preProjectAssessments.permissibleFarArea,
          setbackBuildableArea: preProjectAssessments.setbackBuildableArea,
          actualGroundCoverage: preProjectAssessments.actualGroundCoverage,
          possibleFloors: preProjectAssessments.possibleFloors,
          superBuiltupArea: preProjectAssessments.superBuiltupArea,
          estimatedProjectCostPaise: preProjectAssessments.estimatedProjectCostPaise,
        })
        .from(preProjectAssessments)
        .where(eq(preProjectAssessments.projectId, input.projectId));

      const [frozen] = await ctx.db
        .select()
        .from(programs)
        .where(and(eq(programs.projectId, input.projectId), eq(programs.status, "FROZEN")))
        .orderBy(desc(programs.version))
        .limit(1);

      let program: (typeof frozen & ReturnType<typeof summarizeProgram>) | null = null;
      if (frozen) {
        const spaces = await ctx.db
          .select()
          .from(programSpaces)
          .where(eq(programSpaces.programId, frozen.id))
          .orderBy(programSpaces.floorLevel, programSpaces.sortOrder, programSpaces.createdAt);
        const like: ProgramSpaceLike[] = spaces.map((s) => ({
          id: s.id, name: s.name, category: s.category, floorLevel: s.floorLevel,
          unitAreaSqm: s.unitAreaSqm, count: s.count,
        }));
        program = { ...frozen, ...summarizeProgram(like, frozen.maxBuiltAreaSqm) };
      }

      return { assessment: assessment ?? null, program };
    }),

  /** Create the first DRAFT program (v1) if none exists; returns the latest. */
  getOrCreate: writer
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await latestProgram(ctx.db, input.projectId);
      if (existing) return existing;
      const envelope = await feasibilityEnvelope(ctx.db, input.projectId);
      const [row] = await ctx.db
        .insert(programs)
        .values({ projectId: input.projectId, version: 1, status: "DRAFT", maxBuiltAreaSqm: envelope, createdById: ctx.user.id })
        .returning();
      await writeAudit(ctx.db, { entity: "program", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
      return row!;
    }),

  addSpace: writer.input(ProgramSpaceCreate).mutation(async ({ ctx, input }) => {
    await assertEditable(ctx.db, input.programId);
    const [row] = await ctx.db
      .insert(programSpaces)
      .values({
        programId: input.programId,
        name: input.name,
        category: input.category,
        floorLevel: input.floorLevel,
        unitAreaSqm: input.unitAreaSqm,
        count: input.count,
        notes: input.notes ?? null,
      })
      .returning();
    return row!;
  }),

  updateSpace: writer.input(ProgramSpaceUpdate).mutation(async ({ ctx, input }) => {
    await assertEditable(ctx.db, input.programId);
    const [row] = await ctx.db
      .update(programSpaces)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.floorLevel !== undefined ? { floorLevel: input.floorLevel } : {}),
        ...(input.unitAreaSqm !== undefined ? { unitAreaSqm: input.unitAreaSqm } : {}),
        ...(input.count !== undefined ? { count: input.count } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(and(eq(programSpaces.id, input.id), eq(programSpaces.programId, input.programId)))
      .returning();
    return row!;
  }),

  removeSpace: writer
    .input(z.object({ id: z.string().uuid(), programId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertEditable(ctx.db, input.programId);
      await ctx.db.delete(programSpaces).where(and(eq(programSpaces.id, input.id), eq(programSpaces.programId, input.programId)));
      return { ok: true };
    }),

  /** Freeze the DRAFT program — snapshots the feasibility envelope as the baseline. */
  freeze: writer
    .input(z.object({ programId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(programs).where(eq(programs.id, input.programId));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (before.status === "FROZEN") throw new TRPCError({ code: "BAD_REQUEST", message: "Already frozen" });
      const [assessment] = await ctx.db
        .select({ id: preProjectAssessments.id, superBuiltupArea: preProjectAssessments.superBuiltupArea })
        .from(preProjectAssessments)
        .where(eq(preProjectAssessments.projectId, before.projectId));
      const [row] = await ctx.db
        .update(programs)
        .set({
          status: "FROZEN",
          maxBuiltAreaSqm: assessment?.superBuiltupArea ?? before.maxBuiltAreaSqm,
          assessmentId: assessment?.id ?? null,
          frozenAt: new Date(),
          frozenById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(programs.id, input.programId))
        .returning();
      await writeAudit(ctx.db, { entity: "program", entityId: input.programId, action: "FREEZE", actorId: ctx.user.id, after: row });
      return row!;
    }),

  /** Clone the latest FROZEN program into a new DRAFT version for the next round. */
  newVersion: writer
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const latest = await latestProgram(ctx.db, input.projectId);
      if (!latest) throw new TRPCError({ code: "NOT_FOUND", message: "No program to version." });
      if (latest.status !== "FROZEN")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Freeze the current draft before starting a new version." });
      const envelope = await feasibilityEnvelope(ctx.db, input.projectId);
      const created = await ctx.db.transaction(async (tx) => {
        const [next] = await tx
          .insert(programs)
          .values({
            projectId: input.projectId,
            version: latest.version + 1,
            status: "DRAFT",
            maxBuiltAreaSqm: envelope,
            notes: latest.notes,
            createdById: ctx.user.id,
          })
          .returning();
        const prevSpaces = await tx.select().from(programSpaces).where(eq(programSpaces.programId, latest.id));
        if (prevSpaces.length > 0) {
          await tx.insert(programSpaces).values(
            prevSpaces.map((s) => ({
              programId: next!.id,
              name: s.name,
              category: s.category,
              floorLevel: s.floorLevel,
              unitAreaSqm: s.unitAreaSqm,
              count: s.count,
              notes: s.notes,
              sortOrder: s.sortOrder,
            })),
          );
        }
        return next!;
      });
      await writeAudit(ctx.db, { entity: "program", entityId: created.id, action: "NEW_VERSION", actorId: ctx.user.id, after: created });
      return created;
    }),
});
