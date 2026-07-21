/**
 * Consultancy SOP closeout registers — lessons, NC/CAPA, MoM, WIP review,
 * contract review. Mounted under `consultancy.*`.
 */
import {
  ConsContractReviewCreate,
  ConsLessonCreate,
  ConsMomCreate,
  ConsNcClose,
  ConsNcCreate,
  ConsWipReviewCreate,
  canApproveContractReview,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  consContractReviews,
  consLessons,
  consMoms,
  consNcs,
  consWipReviews,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");
const feesManage = capabilityProcedure("fees:manage");

export const lessonsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consLessons)
        .where(eq(consLessons.engagementId, input.engagementId))
        .orderBy(desc(consLessons.createdAt)),
    ),

  create: manage.input(ConsLessonCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consLessons)
      .values({
        ...input,
        authorId: ctx.user.id,
        authorName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_lesson",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  publish: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(consLessons)
      .set({ status: "PUBLISHED", updatedAt: new Date() })
      .where(eq(consLessons.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await writeAudit(ctx.db, {
      entity: "cons_lesson",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(consLessons).where(eq(consLessons.id, input.id));
    await writeAudit(ctx.db, {
      entity: "cons_lesson",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
    });
    return { ok: true };
  }),
});

export const ncsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consNcs)
        .where(eq(consNcs.engagementId, input.engagementId))
        .orderBy(asc(consNcs.code)),
    ),

  create: manage.input(ConsNcCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(consNcs).values(input).returning();
    await writeAudit(ctx.db, {
      entity: "cons_nc",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  advance: manage
    .input(z.object({ id: z.string().uuid(), status: z.enum(["IN_PROGRESS", "OPEN"]) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(consNcs)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(consNcs.id, input.id), eq(consNcs.status, "OPEN")))
        .returning();
      if (!row && input.status === "IN_PROGRESS") {
        const [cur] = await ctx.db.select().from(consNcs).where(eq(consNcs.id, input.id));
        if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `NC is ${cur.status} — only OPEN items start CAPA.`,
        });
      }
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  close: manage.input(ConsNcClose).mutation(async ({ ctx, input }) => {
    const [cur] = await ctx.db.select().from(consNcs).where(eq(consNcs.id, input.id));
    if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
    if (cur.status === "CLOSED")
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This NC is already closed." });
    const [row] = await ctx.db
      .update(consNcs)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        correctiveAction: input.correctiveAction ?? cur.correctiveAction,
        preventiveAction: input.preventiveAction ?? cur.preventiveAction,
        updatedAt: new Date(),
      })
      .where(eq(consNcs.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_nc",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [cur] = await ctx.db.select().from(consNcs).where(eq(consNcs.id, input.id));
    if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
    if (cur.status === "CLOSED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Closed NCs stay on the register — they are the CAPA trail.",
      });
    await ctx.db.delete(consNcs).where(eq(consNcs.id, input.id));
    await writeAudit(ctx.db, {
      entity: "cons_nc",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
    });
    return { ok: true };
  }),
});

export const momsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consMoms)
        .where(eq(consMoms.engagementId, input.engagementId))
        .orderBy(desc(consMoms.meetingDate)),
    ),

  create: manage.input(ConsMomCreate).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select({ ref: consMoms.ref })
      .from(consMoms)
      .where(eq(consMoms.engagementId, input.engagementId));
    const serial =
      existing
        .map((r) => /^MOM-(\d+)$/.exec(r.ref)?.[1])
        .filter(Boolean)
        .map(Number)
        .reduce((m, n) => Math.max(m, n!), 0) + 1;
    const ref = `MOM-${String(serial).padStart(3, "0")}`;
    const [row] = await ctx.db
      .insert(consMoms)
      .values({
        ...input,
        ref,
        authorId: ctx.user.id,
        authorName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_mom",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  issue: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(consMoms)
      .set({ status: "ISSUED", updatedAt: new Date() })
      .where(eq(consMoms.id, input.id))
      .returning();
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [cur] = await ctx.db.select().from(consMoms).where(eq(consMoms.id, input.id));
    if (!cur) throw new TRPCError({ code: "NOT_FOUND" });
    if (cur.status === "ISSUED")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Issued MoMs cannot be deleted — they are the meeting record.",
      });
    await ctx.db.delete(consMoms).where(eq(consMoms.id, input.id));
    return { ok: true };
  }),
});

export const wipReviewsRouter = router({
  listByEngagement: feesManage
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consWipReviews)
        .where(eq(consWipReviews.engagementId, input.engagementId))
        .orderBy(desc(consWipReviews.reviewedAt)),
    ),

  create: feesManage.input(ConsWipReviewCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(consWipReviews)
      .values({
        ...input,
        reviewedBy: ctx.user.id,
        reviewedByName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_wip_review",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),
});

export const contractReviewsRouter = router({
  listByEngagement: protectedProcedure
    .input(z.object({ engagementId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(consContractReviews)
        .where(eq(consContractReviews.engagementId, input.engagementId))
        .orderBy(desc(consContractReviews.reviewDate)),
    ),

  create: manage.input(ConsContractReviewCreate).mutation(async ({ ctx, input }) => {
    if (input.decision === "APPROVED") {
      const gate = canApproveContractReview(input);
      if (!gate.ok)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: gate.reason });
    }
    const [row] = await ctx.db
      .insert(consContractReviews)
      .values({
        ...input,
        reviewerId: ctx.user.id,
        reviewerName: ctx.user.fullName,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "cons_contract_review",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),
});
