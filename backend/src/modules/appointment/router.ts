import { AppointmentUpsert } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { appointments } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { writeActivity } from "../../lib/activity.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const appointmentRouter = router({
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.projectId, input.projectId));
      return row ?? null;
    }),

  upsert: protectedProcedure.input(AppointmentUpsert).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.projectId, input.projectId));
    if (existing) {
      const [after] = await ctx.db
        .update(appointments)
        .set({
          siteVisitDate: input.siteVisitDate ?? null,
          scopeSummary: input.scopeSummary ?? null,
          letterId: input.letterId ?? null,
          feeProposalId: input.feeProposalId ?? null,
        })
        .where(eq(appointments.id, existing.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "appointment",
        entityId: existing.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: existing,
        after,
      });
      return after!;
    }
    const [row] = await ctx.db
      .insert(appointments)
      .values({
        projectId: input.projectId,
        siteVisitDate: input.siteVisitDate ?? null,
        scopeSummary: input.scopeSummary ?? null,
        letterId: input.letterId ?? null,
        feeProposalId: input.feeProposalId ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "appointment",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  complete: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.projectId, input.projectId));
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No appointment record" });
      const [after] = await ctx.db
        .update(appointments)
        .set({ status: "COMPLETE", completedAt: new Date() })
        .where(eq(appointments.id, row.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "appointment",
        entityId: row.id,
        action: "COMPLETE",
        actorId: ctx.user.id,
        before: { status: row.status },
        after: { status: after!.status },
      });
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "APPOINTMENT",
        objectId: row.id,
        eventType: "APPOINTMENT_COMPLETE",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName ?? ctx.user.email,
        summary: "Pre-engagement appointment phase marked complete",
      });
      return after!;
    }),
});
